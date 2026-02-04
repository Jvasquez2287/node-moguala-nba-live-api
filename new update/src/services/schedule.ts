/**
 * Schedule service for NBA data operations.
 * Handles fetching and processing NBA game schedules and game details.
 */
 
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {
    GamesResponse,
    GameSummary,
    TeamSummary,
    TopScorer,
    GameLeaders,
    GameLeader
} from '../schemas/schedule';
import { dataCache } from './dataCache';
 

// Type definition for cache entries
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 3600000;

// Cache for games by date
const gamesCache = new Map<string, CacheEntry<GamesResponse>>();

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

// Create a map of team IDs to abbreviations for quick lookup
// This helps us convert team IDs to abbreviations like "LAL" or "BOS"
const NBA_TEAMS: { [key: number]: string } = {
    1610612737: "ATL",
    1610612738: "BOS",
    1610612739: "CLE",
    1610612740: "NOP",
    1610612741: "CHI",
    1610612742: "DAL",
    1610612743: "DEN",
    1610612744: "GSW",
    1610612745: "HOU",
    1610612746: "LAC",
    1610612747: "LAL",
    1610612748: "MIA",
    1610612749: "MIL",
    1610612750: "MIN",
    1610612751: "BKN",
    1610612752: "NYK",
    1610612753: "ORL",
    1610612754: "IND",
    1610612755: "PHI",
    1610612756: "PHX",
    1610612757: "POR",
    1610612758: "SAC",
    1610612759: "SAS",
    1610612760: "OKC",
    1610612761: "TOR",
    1610612762: "UTA",
    1610612763: "MEM",
    1610612764: "WAS",
    1610612765: "DET",
    1610612766: "CHA"
};

/**
 * Parse game time from game_status string (e.g., "7:00 pm ET") and convert to UTC ISO format.
 */
function parseGameTimeFromStatus(gameStatus: string, gameDate: string): string | null {
    if (!gameStatus || !gameDate) {
        return null;
    }

    // Pattern to match time formats like "7:00 pm ET", "7:30 pm ET", "12:00 pm ET"
    // Also handles "7 pm ET" (without minutes)
    const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*ET/i;
    const match = gameStatus.match(timePattern);

    if (!match) {
        return null;
    }

    try {
        let hour = parseInt(match[1], 10);
        const minute = match[2] ? parseInt(match[2], 10) : 0;
        const amPm = match[3].toLowerCase();

        // Convert to 24-hour format
        if (amPm === 'pm' && hour !== 12) {
            hour += 12;
        } else if (amPm === 'am' && hour === 12) {
            hour = 0;
        }

        // Parse the game date
        const dateObj = new Date(gameDate);

        // Create datetime in ET timezone (UTC-5, or UTC-4 during DST)
        // For simplicity, we'll assume standard time (ET = UTC-5)
        const etTime = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), hour, minute);
        const etOffset = -5 * 60; // ET is UTC-5 (in minutes)
        const utcTime = new Date(etTime.getTime() - (etOffset * 60 * 1000));

        // Format as ISO 8601 UTC string
        return utcTime.toISOString();

    } catch (error) {
       console.log(`Error parsing game time from status '${gameStatus}':`, error);
        return null;
    }
}

function extractGameLeaders(
    teamLeadersList: any[],
    teamLeadersHeaders: string[],
    gameId: string,
    homeTeamId: number,
    awayTeamId: number
): GameLeaders | undefined {
    if (!teamLeadersList || !teamLeadersHeaders) {
        return undefined;
    }

    let homeLeader: GameLeader | undefined;
    let awayLeader: GameLeader | undefined;

    // Find leaders for this game
    for (const leaderRow of teamLeadersList) {
        if (teamLeadersHeaders.length !== leaderRow.length) {
            continue;
        }

        const leaderDict: { [key: string]: any } = {};
        for (let i = 0; i < teamLeadersHeaders.length; i++) {
            leaderDict[teamLeadersHeaders[i]] = leaderRow[i];
        }

        if (String(leaderDict.GAME_ID || '') !== gameId) {
            continue;
        }

        const teamId = leaderDict.TEAM_ID;
        const playerId = leaderDict.PTS_PLAYER_ID || 0;
        const playerName = leaderDict.PTS_PLAYER_NAME || 'Unknown';

        if (!playerId || playerId === 0) {
            continue;
        }

        // Use game stats directly from TeamLeaders
        const leaderData = {
            personId: playerId,
            name: playerName,
            jerseyNum: leaderDict.PTS_PLAYER_JERSEY_NUM ? String(leaderDict.PTS_PLAYER_JERSEY_NUM) : undefined,
            position: leaderDict.PTS_PLAYER_POSITION,
            teamTricode: NBA_TEAMS[teamId] || '',
            points: parseFloat(leaderDict.PTS || 0),
            rebounds: parseFloat(leaderDict.REB || 0),
            assists: parseFloat(leaderDict.AST || 0),
        };

        if (teamId === homeTeamId) {
            homeLeader = leaderData as GameLeader;
        } else if (teamId === awayTeamId) {
            awayLeader = leaderData as GameLeader;
        }
    }

    if (homeLeader || awayLeader) {
        return {
            homeLeaders: homeLeader,
            awayLeaders: awayLeader
        };
    }

    return undefined;
}

/**
 * Get all NBA games for a specific date
 */
export async function getGamesForDate(date: string): Promise<GamesResponse> {
    try {
        // Check cache first
        const cachedData = await dataCache.getGamesForDate(date);
        if (cachedData) {
           console.log(`Returning cached games for date ${date}`);
            return cachedData;
        }

       console.log(`Cache miss for games on ${date}, fetching from API`);

        // Convert date from YYYY-MM-DD to MM/DD/YYYY format for NBA API
        const dateParts = date.split('-');
        const nbaDateFormat = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;

        // Get game data from NBA API for the specified date
        const data = await retryAxiosRequest(async () => {
            const response = await axios.get('https://stats.nba.com/stats/scoreboardv2', {
                headers: {
                    "Host": "stats.nba.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                    "Accept": "application/json, text/plain, */*",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://www.nba.com/",
                    "Origin": "https://www.nba.com",
                    "Connection": "keep-alive"
                }, params: {
                    DayOffset: 0,
                    GameDate: nbaDateFormat,
                    LeagueID: '00'
                },
                timeout: 60000 // Increased timeout to 60 seconds
            });
            return response.data;
        });
 
        
        // TODO: Create a json backup of the raw data as cached files. 
        // The request will check if the file exists first before making the API call.
        // If it exists and is recent enough, use that instead of making the API call.
        // Structure the files by js_res_bk -> ${date} folder and inside have schedule_${date}.json

        /*
        // Save the received data to a JSON file
        const logsDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const filename = path.join(logsDir, `schedule_data_${date.replace(/-/g, '_')}.json`);
        fs.writeFileSync(filename, JSON.stringify(data, null, 2));
       console.log(`Data saved to ${filename}`);
        */

        // Check if we got valid data
        if (!data.resultSets || !data.resultSets.length) {
            throw new Error(`No game data found for ${date}`);
        }

        // Extract different parts of the game data
        const gameHeaderData = data.resultSets.find((r: any) => r.name === 'GameHeader');
        const teamLeadersData = data.resultSets.find((r: any) => r.name === 'TeamLeaders');
        const lineScoreData = data.resultSets.find((r: any) => r.name === 'LineScore');

        // If no game header data, return empty response
        if (!gameHeaderData || !gameHeaderData.rowSet) {
           console.log(`No game header data found for date ${date}`);
            return { date, games: [] };
        }

        // Get the column names and game data
        const gameHeaders = gameHeaderData.headers;
        const gamesList = gameHeaderData.rowSet;

        // Log number of games found
        if (gamesList && gamesList.length > 0) {
            console.log(`Found ${gamesList.length} games for date ${date}`);
        }

        // Get headers and data for team leaders and scores (if available)
        const teamLeadersHeaders = teamLeadersData?.headers || [];
        const teamLeadersList = teamLeadersData?.rowSet || [];

        const lineScoreHeaders = lineScoreData?.headers || [];
        const lineScoreList = lineScoreData?.rowSet || [];

        const games: GameSummary[] = [];
        const processedGameIds = new Set<string>();

        // Process each game
        for (const game of gamesList) {
            try {
                // Validate that headers and game row have the same length
                if (gameHeaders.length !== game.length) {
                   console.log(`Game row length (${game.length}) doesn't match headers length (${gameHeaders.length}), skipping`);
                    continue;
                }

                // Convert the game data to a dictionary
                const gameDict: { [key: string]: any } = {};
                for (let i = 0; i < gameHeaders.length; i++) {
                    if (i < game.length) {
                        gameDict[gameHeaders[i]] = game[i];
                    }
                }

                // Skip if game ID is missing
                if (!gameDict.GAME_ID) {
                    continue;
                }

                const gameId = String(gameDict.GAME_ID);

                // Skip if we've already processed this game (avoid duplicates)
                if (processedGameIds.has(gameId)) {
                    continue;
                }

                processedGameIds.add(gameId);

                let homeTeamId = gameDict.HOME_TEAM_ID;
                let awayTeamId = gameDict.VISITOR_TEAM_ID;

                // Skip if either team ID is missing
                if (homeTeamId === null || homeTeamId === undefined ||
                    awayTeamId === null || awayTeamId === undefined) {
                    continue;
                }

                // Make sure both IDs are numbers
                try {
                    homeTeamId = Number(homeTeamId);
                    awayTeamId = Number(awayTeamId);
                } catch (error) {
                    continue;
                }

                // Find the home team's score from the line score data
                const homeScore = lineScoreList.find((s: any) => {
                    if (lineScoreHeaders.length !== s.length) return false;
                    const scoreDict: { [key: string]: any } = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = s[i];
                    }
                    return String(scoreDict.GAME_ID || '') === gameId && scoreDict.TEAM_ID === homeTeamId;
                });

                // Find the away team's score
                const awayScore = lineScoreList.find((s: any) => {
                    if (lineScoreHeaders.length !== s.length) return false;
                    const scoreDict: { [key: string]: any } = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = s[i];
                    }
                    return String(scoreDict.GAME_ID || '') === gameId && scoreDict.TEAM_ID === awayTeamId;
                });

                const homePoints = homeScore ? (() => {
                    const scoreDict: { [key: string]: any } = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = homeScore[i];
                    }
                    return scoreDict.PTS || 0;
                })() : 0;

                const awayPoints = awayScore ? (() => {
                    const scoreDict: { [key: string]: any } = {};
                    for (let i = 0; i < lineScoreHeaders.length; i++) {
                        scoreDict[lineScoreHeaders[i]] = awayScore[i];
                    }
                    return scoreDict.PTS || 0;
                })() : 0;

                // Create TeamSummary objects for both teams
                const homeTeam: TeamSummary = {
                    team_id: homeTeamId,
                    team_abbreviation: NBA_TEAMS[homeTeamId] || 'N/A',
                    points: homePoints
                };

                const awayTeam: TeamSummary = {
                    team_id: awayTeamId,
                    team_abbreviation: NBA_TEAMS[awayTeamId] || 'N/A',
                    points: awayPoints
                };

                // Try to find the top scorer for this game
                let topScorer: TopScorer | undefined;
                try {
                    for (const leaderRow of teamLeadersList) {
                        if (teamLeadersHeaders.length !== leaderRow.length) continue;

                        const leaderDict: { [key: string]: any } = {};
                        for (let i = 0; i < teamLeadersHeaders.length; i++) {
                            leaderDict[teamLeadersHeaders[i]] = leaderRow[i];
                        }

                        if (String(leaderDict.GAME_ID || '') !== gameId) continue;

                        topScorer = {
                            player_id: leaderDict.PTS_PLAYER_ID || 0,
                            player_name: leaderDict.PTS_PLAYER_NAME || 'Unknown',
                            team_id: leaderDict.TEAM_ID || 0,
                            points: leaderDict.PTS || 0,
                            rebounds: leaderDict.REB || 0,
                            assists: leaderDict.AST || 0
                        };
                        break; // Found the top scorer, no need to continue
                    }
                } catch (error) {
                   console.log(`Error extracting top scorer for game ${gameId}:`, error);
                    topScorer = undefined;
                }

                // Extract game leaders
                let gameLeaders: GameLeaders | undefined;
                const gameStatusText = gameDict.GAME_STATUS_TEXT || 'Unknown';
                const isUpcoming = !gameStatusText.toLowerCase().includes('final') &&
                    !gameStatusText.toLowerCase().includes('live') &&
                    homePoints === 0 && awayPoints === 0;

                // For completed/live games, get leaders from TeamLeaders data
                if (!isUpcoming) {
                    try {
                        gameLeaders = extractGameLeaders(teamLeadersList, teamLeadersHeaders, gameId, homeTeamId, awayTeamId);
                    } catch (error) {
                       console.log(`Error extracting game leaders for game ${gameId}:`, error);
                        gameLeaders = undefined;
                    }
                }

                // Extract game time
                let gameTimeUtc = gameDict.GAME_TIME_UTC ||
                    gameDict.START_TIME_UTC ||
                    gameDict.GAME_DATE_TIME_UTC ||
                    gameDict.GAME_ET ||
                    null;

                // If game_time_utc is still null, try parsing from game_status
                if (!gameTimeUtc) {
                    gameTimeUtc = parseGameTimeFromStatus(gameStatusText, date);
                }

                // Create a GameSummary with all the game information
                games.push({
                    game_id: gameId,
                    game_date: date, // Use the requested date
                    game_time_utc: gameTimeUtc,
                    matchup: `${homeTeam.team_abbreviation} vs ${awayTeam.team_abbreviation}`,
                    game_status: gameStatusText,
                    arena: gameDict.ARENA_NAME,
                    home_team: homeTeam,
                    away_team: awayTeam,
                    top_scorer: topScorer,
                    gameLeaders: gameLeaders
                });

            } catch (error) {
                // If a key is missing, log and skip this game
               console.log(`Error processing game: ${error}, skipping. Game data keys: ${Object.keys(game).slice(0, 10)}`);
                continue;
            }
        }

        const result = { date, games };

        // Cache the result
        dataCache.setGamesForDate(date, result);

        return result;

    } catch (error: any) {
        let errorMessage = `Failed to fetch games for date ${date}`;

        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            errorMessage = `NBA API timeout - the service may be temporarily unavailable. Please try again later.`;
        } else if (error.response) {
            // API returned an error response
            const status = error.response.status;
            if (status === 429) {
                errorMessage = `NBA API rate limit exceeded. Please try again later.`;
            } else if (status >= 500) {
                errorMessage = `NBA API server error (${status}). Please try again later.`;
            } else {
                errorMessage = `NBA API error (${status}): ${error.response.data?.message || error.message}`;
            }
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = `Network error - unable to connect to NBA API. Please check your internet connection.`;
        }

        console.log(`Error retrieving games for date ${date}:`, {
            error: error.message,
            code: error.code,
            status: error.response?.status,
            url: error.config?.url
        });

        throw new Error(errorMessage);
    }
}