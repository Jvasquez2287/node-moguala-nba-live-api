/**
 * Teams service for NBA team operations.
 * Handles fetching team details, rosters, and team information.
 */
 
import axios from 'axios';
import { TeamDetailsResponse, TeamRoster } from '../schemas/team';
import { Player, Coach } from '../schemas/player';
import { dataCache } from './dataCache';

 

// Type definition for cache entries
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Cache duration in milliseconds (1 hour for memory cache)
// Database cache stores permanently with no TTL
const CACHE_DURATION = 3600000;

// Cache for team rosters (memory cache: 1 hour; DB cache: permanent)
const teamRosterCache = new Map<string, CacheEntry<TeamRoster>>();

// Cache for team player stats (memory cache: 1 hour; DB cache: permanent)
const teamPlayerStatsCache = new Map<string, CacheEntry<any>>();

/**
 * Retry utility for NBA API calls with exponential backoff
 */
async function retryAxiosRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await requestFn();
        } catch (error: any) {
            lastError = error;

            // Don't retry on the last attempt
            if (attempt === maxRetries) {
                break;
            }

            // Don't retry certain types of errors
            if (error.response?.status === 400 || error.response?.status === 401 || error.response?.status === 403) {
                throw error;
            }

            // Calculate delay with exponential backoff
            const delay = baseDelay * Math.pow(2, attempt);
           console.log(`NBA API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`, error.message);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError!;
}

/**
 * Get detailed information about a specific NBA team
 */
export async function getTeam(teamId: number): Promise<TeamDetailsResponse> {
    try {
        // Check cache first
        const cachedData = await dataCache.getTeam(teamId);
        if (cachedData) {
           console.log(`Returning cached team data for team ${teamId}`);
            return cachedData;
        }

       console.log(`Cache miss for team ${teamId}, fetching from API`);

        // Get current season
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;

        // Get team details from NBA API
        const apiResponse = await retryAxiosRequest(async () => {
            const response = await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {

                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                }, params: {
                    LeagueID: '00',
                    Season: season,
                    SeasonType: 'Regular Season',
                    SeasonYear: ""
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response.data;
        });

        if (!apiResponse?.resultSets?.[0]?.rowSet) {
            throw new Error(`No team data found for season ${season}`);
        }

        const headers = apiResponse.resultSets[0].headers;
        const teamsData = apiResponse.resultSets[0].rowSet;

        // Helper function to safely get values
        const getValue = (row: any[], headerName: string) => {
            const index = headers.indexOf(headerName);
            return index !== -1 ? row[index] : null;
        };

        // Find the specific team
        const teamData = teamsData.find((row: any[]) => getValue(row, 'TeamID') === teamId);
        if (!teamData) {
            throw new Error(`Team with ID ${teamId} not found`);
        }

        const teamDetails: TeamDetailsResponse = {
            team_id: getValue(teamData, 'TeamID') || teamId,
            team_name: getValue(teamData, 'TeamName') || '',
            team_city: getValue(teamData, 'TeamCity') || '',
            abbreviation: getValue(teamData, 'TeamName') || '', // NBA API doesn't provide abbreviation in standings
            year_founded: undefined, // Not available in NBA API
            arena: undefined, // Not available in NBA API
            arena_capacity: undefined, // Not available in NBA API
            owner: undefined, // Not available in NBA API
            general_manager: undefined, // Not available in NBA API
            head_coach: undefined // Not available in NBA API
        };

        // Cache the result
        dataCache.setTeam(teamId, teamDetails);

        return teamDetails;
    } catch (error: any) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
           console.log(`NBA API timeout error for team ${teamId}: Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        } else if (error.response?.status === 429) {
           console.log(`NBA API rate limit exceeded for team ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        } else if (error.response?.status >= 500) {
           console.log(`NBA API server error for team ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        } else if (error.response?.status >= 400) {
           console.log(`NBA API client error for team ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
           console.log(`NBA API network error for team ${teamId}: ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        } else {
           console.log(`Unexpected error fetching team ${teamId}:`, error.message || error);
            throw new Error(`Failed to fetch team details: ${error.message || error}`);
        }
    }
}

/**
 * Get team roster with players and coaches
 */
export async function getTeamRoster(teamId: number, season: string): Promise<TeamRoster> {
    try {
        const seasonParam = season.includes('-') ? season : `${season}-${(parseInt(season) + 1).toString().slice(-2)}`;
        const cacheKey = `team_roster_${teamId}_${seasonParam}`;

        // 1. Check memory cache first (1 hour TTL)
        const cached = teamRosterCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
           console.log(`Returning cached team roster for team ${teamId} season ${seasonParam} from memory`);
            return cached.data;
        }

        // 2. Check database cache (permanent storage - no TTL)
        try {
            const dbCached = await dataCache.get<TeamRoster>(`roster_${cacheKey}`);
            if (dbCached) {
                console.log(`Returning cached team roster for team ${teamId} season ${seasonParam} from database`);
                // Update memory cache for performance
                teamRosterCache.set(cacheKey, {
                    data: dbCached,
                    timestamp: Date.now()
                });
                return dbCached;
            }
        } catch (dbError) {
            console.warn(`Database cache lookup failed for roster ${cacheKey}, will fetch from API`);
        }

       console.log(`Cache miss for team roster ${teamId}, fetching from API`);

        // Get players for the team using NBA API
        const playersData = await retryAxiosRequest(async () => {
            const response = await axios.get('https://stats.nba.com/stats/playerindex', {

                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                }, params: {
                    College: "",
                    Country: "",
                    DraftPick: "",
                    DraftRound: "",
                    DraftYear: "",
                    Height: "",
                    Historical: "0",       // 1 = all players, 0 = active only
                    LeagueID: "00",
                    Season: seasonParam,
                    SeasonType: "Regular Season",
                    TeamID: teamId,
                    Weight: ""

                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
          
            return response.data;
        });

        const players: Player[] = [];
        if (playersData?.resultSets?.[0]?.rowSet) {
            const headers = playersData.resultSets[0].headers;
            const playersDataRows = playersData.resultSets[0].rowSet;

            // Helper function to safely get values
            const getValue = (row: any[], headerName: string) => { 
                const index = headers.indexOf(headerName);
                return index !== -1 ? row[index] : null;
            };
           
            for (const playerData of playersDataRows) {
                players.push({
                    player_id: getValue(playerData, 'PERSON_ID') || 0,
                    name: `${getValue(playerData, 'PLAYER_FIRST_NAME') || ''} ${getValue(playerData, 'PLAYER_LAST_NAME') || ''}`.trim(),
                    jersey_number: getValue(playerData, 'JERSEY_NUMBER') || '',
                    position: getValue(playerData, 'POSITION') || '',
                    height: getValue(playerData, 'HEIGHT') || undefined,
                    weight: getValue(playerData, 'WEIGHT') || undefined,
                    birth_date:  getValue(playerData, 'BIRTHDATE') || '',
                    age:  getValue(playerData, 'AGE') || 0,
                    experience:  getValue(playerData, 'SEASON_EXP') || undefined,
                    school:  getValue(playerData, 'SCHOOL') ? getValue(playerData, 'SCHOOL') : getValue(playerData, 'COLLEGE') || undefined,
                    team_id: getValue(playerData, 'TEAM_ID') || undefined

                });
            }
        }

        // Get team details for name
        const teamDetails = await getTeam(teamId);

        const roster: TeamRoster = {
            team_id: teamId,
            team_name: `${teamDetails.team_city} ${teamDetails.team_name}`,
            season: seasonParam,
            players: players,
            coaches: [] // Coaches not available in NBA API
        };

        // Cache the result - both memory and database
        teamRosterCache.set(cacheKey, {
            data: roster,
            timestamp: Date.now()
        });
        
        // Store in database cache for permanent storage
        try {
            await dataCache.set(`roster_${cacheKey}`, roster);
            console.log(`Stored team roster for team ${teamId} season ${seasonParam} in database cache (permanent)`);
        } catch (cacheError) {
            console.warn(`Failed to store roster in database cache:`, cacheError);
        }

        return roster;
    } catch (error: any) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
           console.log(`NBA API timeout error for team roster ${teamId}: Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        } else if (error.response?.status === 429) {
           console.log(`NBA API rate limit exceeded for team roster ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        } else if (error.response?.status >= 500) {
           console.log(`NBA API server error for team roster ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        } else if (error.response?.status >= 400) {
           console.log(`NBA API client error for team roster ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
           console.log(`NBA API network error for team roster ${teamId}: ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        } else {
           console.log(`Unexpected error fetching roster for team ${teamId}:`, error.message || error);
            throw new Error(`Failed to fetch team roster: ${error.message || error}`);
        }
    }
}

/**
 * Get all NBA teams
 */
export async function getAllTeams(): Promise<TeamDetailsResponse[]> {
    try {
        // Check cache first
        const cachedData = await dataCache.getAllTeams();
        if (cachedData) {
           console.log(`Returning cached all teams data`);
            return cachedData;
        }

       console.log(`Cache miss for all teams, fetching from API`);

        // Get current season
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;

        // Get all teams from NBA API
        const teamsData = await retryAxiosRequest(async () => {
            const response = await axios.get('https://stats.nba.com/stats/leaguestandingsv3', {

                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                }, params: {
                    LeagueID: '00',
                    Season: season,
                    SeasonType: 'Regular Season'
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response.data;
        });

        if (!teamsData?.resultSets?.[0]?.rowSet) {
            throw new Error(`No team data found for season ${season}`);
        }

        const headers = teamsData.resultSets[0].headers;
        const teamsDataRows = teamsData.resultSets[0].rowSet;

        // Helper function to safely get values
        const getValue = (row: any[], headerName: string) => {
            const index = headers.indexOf(headerName);
            return index !== -1 ? row[index] : null;
        };

        const teams: TeamDetailsResponse[] = teamsDataRows.map((teamData: any[]) => ({
            team_id: getValue(teamData, 'TeamID') || 0,
            team_name: getValue(teamData, 'TeamName') || '',
            team_city: getValue(teamData, 'TeamCity') || '',
            abbreviation: getValue(teamData, 'TeamName') || '', // NBA API doesn't provide abbreviation in standings
            year_founded: undefined,
            arena: undefined,
            arena_capacity: undefined,
            owner: undefined,
            general_manager: undefined,
            head_coach: undefined
        }));

        // Cache the result
        dataCache.setAllTeams(teams);

        return teams;
    } catch (error: any) {
        // Enhanced error handling with specific error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
           console.log(`NBA API timeout error for all teams: Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        } else if (error.response?.status === 429) {
           console.log(`NBA API rate limit exceeded for all teams: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        } else if (error.response?.status >= 500) {
           console.log(`NBA API server error for all teams: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        } else if (error.response?.status >= 400) {
           console.log(`NBA API client error for all teams: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
           console.log(`NBA API network error for all teams: ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        } else {
           console.log('Unexpected error fetching all teams:', error.message || error);
            throw new Error(`Failed to fetch teams: ${error.message || error}`);
        }
    }
}

/**
 * Get team player statistics for a specific season
 */
export async function getTeamPlayerStats(teamId: number, season: string) {
    try {
        const seasonParam = season.includes('-') ? season : `${season}-${(parseInt(season) + 1).toString().slice(-2)}`;
        const cacheKey = `team_player_stats_${teamId}_${seasonParam}`;

        // 1. Check memory cache first (1 hour TTL)
        const cached = teamPlayerStatsCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
           console.log(`Returning cached team player stats for team ${teamId} season ${seasonParam} from memory`);
            return cached.data;
        }

        // 2. Check database cache (permanent storage - no TTL)
        try {
            const dbCached = await dataCache.get(`stats_${cacheKey}`);
            if (dbCached) {
                console.log(`Returning cached team player stats for team ${teamId} season ${seasonParam} from database`);
                // Update memory cache for performance
                teamPlayerStatsCache.set(cacheKey, {
                    data: dbCached,
                    timestamp: Date.now()
                });
                return dbCached;
            }
        } catch (dbError) {
            console.warn(`Database cache lookup failed for stats ${cacheKey}, will fetch from API`);
        }

       console.log(`Cache miss for team player stats ${teamId}, fetching from API`);

        // Get team roster which contains player information
        const rosterResponse = await retryAxiosRequest(async () => {
            return await axios.get('https://stats.nba.com/stats/commonteamroster', {
                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                },
                params: {
                    Season: seasonParam,
                    TeamID: teamId
                },
                timeout: 60000
            });
        });

        if (!rosterResponse.data?.resultSets?.[0]) {
            throw new Error(`No roster found for team ${teamId} in season ${seasonParam}`);
        }

        const rosterHeaders = rosterResponse.data.resultSets[0].headers;
        const rosterData = rosterResponse.data.resultSets[0].rowSet;

        const getRosterValue = (row: any[], headerName: string) => {
            const index = rosterHeaders.indexOf(headerName);
            return index !== -1 ? row[index] : null;
        };

        // Build players array from roster
        const players = rosterData.map((playerData: any[]) => ({
            player_id: getRosterValue(playerData, 'PERSON_ID') || 0,
            player_name: getRosterValue(playerData, 'PLAYER_NAME') || '',
            position: getRosterValue(playerData, 'POSITION') || null,
            jersey_number: getRosterValue(playerData, 'NUM') || null,
            games_played: 0,
            games_started: 0,
            minutes: 0,
            points: 0,
            offensive_rebounds: 0,
            defensive_rebounds: 0,
            rebounds: 0,
            assists: 0,
            steals: 0,
            blocks: 0,
            turnovers: 0,
            personal_fouls: 0,
            assist_to_turnover: 0
        }));

        // Try to get stats from playerestimatedmetrics endpoint as fallback
        try {
            const statsResponse = await retryAxiosRequest(async () => {
                return await axios.get('https://stats.nba.com/stats/playercareerstats', {
                    headers: {
                        "Host": "stats.nba.com",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Referer": "https://www.nba.com/",
                        "Origin": "https://www.nba.com",
                        "Connection": "keep-alive"
                    },
                    params: {
                        LeagueID: '00',
                        PerMode: 'PerGame'
                    },
                    timeout: 60000
                });
            });

            if (statsResponse.data?.resultSets?.[0]) {
                const statsHeaders = statsResponse.data.resultSets[0].headers;
                const statsData = statsResponse.data.resultSets[0].rowSet;

                const getStatsValue = (row: any[], headerName: string) => {
                    const index = statsHeaders.indexOf(headerName);
                    return index !== -1 ? row[index] : null;
                };

                // Match and update player stats
                for (let i = 0; i < players.length; i++) {
                    const playerStat = statsData.find((stat: any[]) => getStatsValue(stat, 'PLAYER_ID') === players[i].player_id);
                    if (playerStat) {
                        // Only update if this is the current season's stats
                        const statSeason = getStatsValue(playerStat, 'SEASON_ID');
                        if (statSeason && statSeason.toString().includes(seasonParam.split('-')[0])) {
                            players[i] = {
                                ...players[i],
                                games_played: getStatsValue(playerStat, 'GP') || 0,
                                games_started: getStatsValue(playerStat, 'GS') || 0,
                                minutes: getStatsValue(playerStat, 'MIN') || 0,
                                points: getStatsValue(playerStat, 'PTS') || 0,
                                offensive_rebounds: getStatsValue(playerStat, 'OREB') || 0,
                                defensive_rebounds: getStatsValue(playerStat, 'DREB') || 0,
                                rebounds: getStatsValue(playerStat, 'REB') || 0,
                                assists: getStatsValue(playerStat, 'AST') || 0,
                                steals: getStatsValue(playerStat, 'STL') || 0,
                                blocks: getStatsValue(playerStat, 'BLK') || 0,
                                turnovers: getStatsValue(playerStat, 'TOV') || 0,
                                personal_fouls: getStatsValue(playerStat, 'PF') || 0,
                                assist_to_turnover: getStatsValue(playerStat, 'AST_TOV') || 0
                            };
                        }
                    }
                }
            }
        } catch (statsError) {
           console.log(`Could not fetch detailed stats, returning roster with default values:`, statsError);
        }

        // Get team details for name
        const teamDetails = await getTeam(teamId);

        const result = {
            team_id: teamId,
            team_name: `${teamDetails.team_city} ${teamDetails.team_name}`,
            season: seasonParam,
            players: players
        };

        // Cache the result - both memory and database
        teamPlayerStatsCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });
        
        // Store in database cache for permanent storage
        try {
            await dataCache.set(`stats_${cacheKey}`, result);
            console.log(`Stored team player stats for team ${teamId} season ${seasonParam} in database cache (permanent)`);
        } catch (cacheError) {
            console.warn(`Failed to store stats in database cache:`, cacheError);
        }

        return result;
    } catch (error: any) {
        // Enhanced error handling
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
           console.log(`NBA API timeout error for team player stats ${teamId}: Request took longer than 60 seconds`);
            throw new Error(`NBA API timeout: Request took longer than 60 seconds`);
        } else if (error.response?.status === 429) {
           console.log(`NBA API rate limit exceeded for team player stats ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API rate limit exceeded`);
        } else if (error.response?.status >= 500) {
           console.log(`NBA API server error for team player stats ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API server error: ${error.response?.status}`);
        } else if (error.response?.status >= 400) {
           console.log(`NBA API client error for team player stats ${teamId}: ${error.response?.status} ${error.response?.statusText}`);
            throw new Error(`NBA API client error: ${error.response?.status}`);
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
           console.log(`NBA API network error for team player stats ${teamId}: ${error.message}`);
            throw new Error(`NBA API network error: ${error.message}`);
        } else {
           console.log(`Unexpected error fetching player stats for team ${teamId}:`, error.message || error);
            throw new Error(`Failed to fetch team player stats: ${error.message || error}`);
        }
    }
}
