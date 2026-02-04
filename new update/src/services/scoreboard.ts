/**
 * Scoreboard service for NBA data operations.
 * Handles fetching and processing NBA game data, player stats, and box scores.
 */

import * as winston from 'winston';
import axios from 'axios';
import {
    BoxScoreResponse,
    PlayByPlayResponse,
    ScoreboardResponse,
    Team,
    GameLeaders,
    PlayerStats,
    PlayerBoxScoreStats,
    TeamBoxScoreStats,
    PlayByPlayEvent
} from '../schemas/scoreboard';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

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

// Cache for player season averages
interface PlayerStatsCacheEntry {
    stats: {
        PTS: number;
        REB: number;
        AST: number;
        JERSEY_NUMBER?: string;
        POSITION?: string;
    };
    timestamp: number;
}

const playerStatsCache = new Map<number, PlayerStatsCacheEntry>();
const PLAYER_STATS_CACHE_TTL = 60 * 60 * 1000; // 1 hour
const PLAYER_STATS_CACHE_MAX_SIZE = 500;

/**
 * Clean up expired entries from player stats cache
 */
function cleanupPlayerStatsCache(): void {
    const now = Date.now();
    const expiredKeys: number[] = [];

    for (const [playerId, entry] of playerStatsCache.entries()) {
        if (now - entry.timestamp > PLAYER_STATS_CACHE_TTL) {
            expiredKeys.push(playerId);
        }
    }

    expiredKeys.forEach(key => playerStatsCache.delete(key));

    // Enforce size limit with LRU eviction
    if (playerStatsCache.size > PLAYER_STATS_CACHE_MAX_SIZE) {
        const entries = Array.from(playerStatsCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        const keysToRemove = entries.slice(0, playerStatsCache.size - PLAYER_STATS_CACHE_MAX_SIZE);
        keysToRemove.forEach(([key]) => playerStatsCache.delete(key));

       console.log(`LRU eviction: removed ${keysToRemove.length} old entries from player stats cache`);
    }
}

/**
 * Get season averages for a player
 */
export async function getPlayerSeasonAverages(playerId: number): Promise<{
    PTS: number;
    REB: number;
    AST: number;
    JERSEY_NUMBER?: string;
    POSITION?: string;
}> {
    // Clean up cache if needed
    if (playerStatsCache.size > PLAYER_STATS_CACHE_MAX_SIZE * 0.9) {
        cleanupPlayerStatsCache();
    }

    const now = Date.now();
    const cached = playerStatsCache.get(playerId);

    if (cached && (now - cached.timestamp) < PLAYER_STATS_CACHE_TTL) {
        return cached.stats;
    }

    // Remove expired entry
    if (cached) {
        playerStatsCache.delete(playerId);
    }

    try {
        // Get current season
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const season = currentMonth >= 10 ? `${currentYear}-${(currentYear + 1).toString().slice(-2)}` : `${currentYear - 1}-${currentYear.toString().slice(-2)}`;

        // Get player stats from NBA API
        const response = await axios.get('https://stats.nba.com/stats/leaguedashplayerstats', {

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
                PlayerID: playerId,
                PerMode: 'PerGame'
            },
            timeout: 30000
        });

        if (response.data?.resultSets?.[0]?.rowSet && response.data.resultSets[0].rowSet.length > 0) {
            const headers = response.data.resultSets[0].headers;
            const playerData = response.data.resultSets[0].rowSet[0];

            // Helper function to safely get values
            const getValue = (row: any[], headerName: string) => {
                const index = headers.indexOf(headerName);
                return index !== -1 ? row[index] : null;
            };

            const stats = {
                PTS: getValue(playerData, 'PTS') || 0,
                REB: getValue(playerData, 'REB') || 0,
                AST: getValue(playerData, 'AST') || 0,
                JERSEY_NUMBER: undefined, // Not available in NBA API
                POSITION: undefined // Not available in NBA API
            };

            playerStatsCache.set(playerId, {
                stats,
                timestamp: now
            });

            return stats;
        }
    } catch (error) {
       console.log(`Error fetching season averages for player ${playerId}:`, error);
    }

    return { PTS: 0, REB: 0, AST: 0 };
}

/**
 * Get scoreboard data
 */
export async function getScoreboard(): Promise<ScoreboardResponse | null> {
    try {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        const dateParts = dateStr.split('-');
        const nbaDateFormat = `${dateParts[1]}/${dateParts[2]}/${dateParts[0]}`;

        // Get games for today using NBA API
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
            timeout: 30000
        });

        if (!response.data?.resultSets || response.data.resultSets.length === 0) {
            return {
                scoreboard: {
                    gameDate: dateStr,
                    games: []
                }
            };
        }

       console.log(`\n ++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n Old Date: ${dateStr} \n New Date: ${nbaDateFormat} \n ++++++++++++++++++++++++++++++++++++++++++++++++++++++++\n`);

        // Process the game data similar to how schedule service does it
        const gameHeaderData = response.data.resultSets.find((r: any) => r.name === 'GameHeader');
        if (!gameHeaderData || !gameHeaderData.rowSet) {
            return {
                scoreboard: {
                    gameDate: dateStr,
                    games: []
                }
            };
        }

        const gameHeaders = gameHeaderData.headers;
        const gamesList = gameHeaderData.rowSet;

        // Helper function to safely get values
        const getValue = (row: any[], headerName: string) => {
            const index = gameHeaders.indexOf(headerName);
            return index !== -1 ? row[index] : null;
        };

        const games = gamesList.map((game: any[]) => ({
            gameId: getValue(game, 'GAME_ID')?.toString() || '',
            gameStatus: getValue(game, 'GAME_STATUS') || 1,
            gameStatusText: getValue(game, 'GAME_STATUS_TEXT') || '',
            period: getValue(game, 'PERIOD') || 0,
            gameClock: getValue(game, 'GAME_CLOCK') || undefined,
            gameTimeUTC: getValue(game, 'GAME_DATE_EST') || '',
            homeTeam: {
                teamId: getValue(game, 'HOME_TEAM_ID') || 0,
                teamName: getValue(game, 'HOME_TEAM_NAME') || '',
                teamCity: getValue(game, 'HOME_TEAM_CITY') || '',
                teamTricode: getValue(game, 'HOME_TEAM_ABBREVIATION') || '',
                score: getValue(game, 'HOME_TEAM_SCORE') || undefined
            },
            awayTeam: {
                teamId: getValue(game, 'VISITOR_TEAM_ID') || 0,
                teamName: getValue(game, 'VISITOR_TEAM_NAME') || '',
                teamCity: getValue(game, 'VISITOR_TEAM_CITY') || '',
                teamTricode: getValue(game, 'VISITOR_TEAM_ABBREVIATION') || '',
                score: getValue(game, 'VISITOR_TEAM_SCORE') || undefined
            }
        }));

        const scoreboardData: ScoreboardResponse = {
            scoreboard: {
                gameDate: dateStr,
                games: games
            }
        };

        return scoreboardData;
    } catch (error) {
       console.log('Error fetching scoreboard:', error);
        return null;
    }
}

/**
 * Get play-by-play data for a game
 */
export async function getPlayByPlay(gameId: string): Promise<PlayByPlayResponse | null> {
    try {
        // Note: NBA API doesn't provide play-by-play data in the free tier
        // This would need to be implemented with a different API or service
        // For now, return a placeholder structure
        const playbyplayData: PlayByPlayResponse = {
            game_id: gameId,
            plays: []
        };

        return playbyplayData;
    } catch (error) {
       console.log(`Error fetching play-by-play for game ${gameId}:`, error);
        return null;
    }
}

/**
 * Get box score for a game
 */
export async function getBoxScore(gameId: string): Promise<BoxScoreResponse | null> {
    try {
        // Get box score data from NBA API
        const response = await axios.get('https://stats.nba.com/stats/boxscoretraditionalv2', {

            headers: {
                "Host": "stats.nba.com",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": "https://www.nba.com/",
                "Origin": "https://www.nba.com",
                "Connection": "keep-alive"

            }, params: {
                GameID: gameId,
                StartPeriod: 1,
                EndPeriod: 10,
                StartRange: 0,
                EndRange: 28800,
                RangeType: 0
            },
            timeout: 30000
        });

        if (!response.data?.resultSets || response.data.resultSets.length === 0) {
            return null;
        }

        // Find the player stats data
        const playerStatsData = response.data.resultSets.find((r: any) => r.name === 'PlayerStats');
        if (!playerStatsData || !playerStatsData.rowSet) {
            return null;
        }

        const headers = playerStatsData.headers;
        const playerStats = playerStatsData.rowSet;

        // Helper function to safely get values
        const getValue = (row: any[], headerName: string) => {
            const index = headers.indexOf(headerName);
            return index !== -1 ? row[index] : null;
        };

        // Group players by team
        const homePlayers: PlayerBoxScoreStats[] = [];
        const awayPlayers: PlayerBoxScoreStats[] = [];

        playerStats.forEach((stat: any[]) => {
            const playerStats: PlayerBoxScoreStats = {
                player_id: getValue(stat, 'PLAYER_ID') || 0,
                name: getValue(stat, 'PLAYER_NAME') || '',
                position: getValue(stat, 'START_POSITION') || 'N/A',
                minutes: getValue(stat, 'MIN') || undefined,
                points: getValue(stat, 'PTS') || 0,
                rebounds: getValue(stat, 'REB') || 0,
                assists: getValue(stat, 'AST') || 0,
                steals: getValue(stat, 'STL') || 0,
                blocks: getValue(stat, 'BLK') || 0,
                turnovers: getValue(stat, 'TO') || 0
            };

            const teamId = getValue(stat, 'TEAM_ID');
            // We'll need to determine home/away from the game data
            // For now, collect all and we'll sort later
            if (homePlayers.length <= awayPlayers.length) {
                homePlayers.push(playerStats);
            } else {
                awayPlayers.push(playerStats);
            }
        });

        // Get team stats from another result set if available
        const teamStatsData = response.data.resultSets.find((r: any) => r.name === 'TeamStats');
        let homeTeamStats: TeamBoxScoreStats;
        let awayTeamStats: TeamBoxScoreStats;

        if (teamStatsData && teamStatsData.rowSet && teamStatsData.rowSet.length >= 2) {
            const teamHeaders = teamStatsData.headers;
            const teamStats = teamStatsData.rowSet;

            const getTeamValue = (row: any[], headerName: string) => {
                const index = teamHeaders.indexOf(headerName);
                return index !== -1 ? row[index] : null;
            };

            homeTeamStats = {
                team_id: getTeamValue(teamStats[0], 'TEAM_ID') || 0,
                team_name: getTeamValue(teamStats[0], 'TEAM_NAME') || '',
                score: getTeamValue(teamStats[0], 'PTS') || 0,
                field_goal_pct: getTeamValue(teamStats[0], 'FG_PCT') || 0,
                three_point_pct: getTeamValue(teamStats[0], 'FG3_PCT') || 0,
                free_throw_pct: getTeamValue(teamStats[0], 'FT_PCT') || 0,
                rebounds_total: getTeamValue(teamStats[0], 'REB') || 0,
                assists: getTeamValue(teamStats[0], 'AST') || 0,
                steals: getTeamValue(teamStats[0], 'STL') || 0,
                blocks: getTeamValue(teamStats[0], 'BLK') || 0,
                turnovers: getTeamValue(teamStats[0], 'TOV') || 0,
                players: homePlayers
            };

            awayTeamStats = {
                team_id: getTeamValue(teamStats[1], 'TEAM_ID') || 0,
                team_name: getTeamValue(teamStats[1], 'TEAM_NAME') || '',
                score: getTeamValue(teamStats[1], 'PTS') || 0,
                field_goal_pct: getTeamValue(teamStats[1], 'FG_PCT') || 0,
                three_point_pct: getTeamValue(teamStats[1], 'FG3_PCT') || 0,
                free_throw_pct: getTeamValue(teamStats[1], 'FT_PCT') || 0,
                rebounds_total: getTeamValue(teamStats[1], 'REB') || 0,
                assists: getTeamValue(teamStats[1], 'AST') || 0,
                steals: getTeamValue(teamStats[1], 'STL') || 0,
                blocks: getTeamValue(teamStats[1], 'BLK') || 0,
                turnovers: getTeamValue(teamStats[1], 'TOV') || 0,
                players: awayPlayers
            };
        } else {
            // Fallback if team stats not available
            homeTeamStats = {
                team_id: 0,
                team_name: 'Home Team',
                score: homePlayers.reduce((sum, p) => sum + p.points, 0),
                field_goal_pct: 0,
                three_point_pct: 0,
                free_throw_pct: 0,
                rebounds_total: homePlayers.reduce((sum, p) => sum + p.rebounds, 0),
                assists: homePlayers.reduce((sum, p) => sum + p.assists, 0),
                steals: homePlayers.reduce((sum, p) => sum + p.steals, 0),
                blocks: homePlayers.reduce((sum, p) => sum + p.blocks, 0),
                turnovers: homePlayers.reduce((sum, p) => sum + p.turnovers, 0),
                players: homePlayers
            };

            awayTeamStats = {
                team_id: 0,
                team_name: 'Away Team',
                score: awayPlayers.reduce((sum, p) => sum + p.points, 0),
                field_goal_pct: 0,
                three_point_pct: 0,
                free_throw_pct: 0,
                rebounds_total: awayPlayers.reduce((sum, p) => sum + p.rebounds, 0),
                assists: awayPlayers.reduce((sum, p) => sum + p.assists, 0),
                steals: awayPlayers.reduce((sum, p) => sum + p.steals, 0),
                blocks: awayPlayers.reduce((sum, p) => sum + p.blocks, 0),
                turnovers: awayPlayers.reduce((sum, p) => sum + p.turnovers, 0),
                players: awayPlayers
            };
        }

        const boxScoreResponse: BoxScoreResponse = {
            game_id: gameId,
            status: 'Final', // Assume final for now
            home_team: homeTeamStats,
            away_team: awayTeamStats
        };

        return boxScoreResponse;
    } catch (error) {
       console.log(`Error fetching box score for game ${gameId}:`, error);
        return null;
    }
}

/**
 * Extract team data from API response
 */
export function extractTeamData(teamData: any): Team {
    return {
        teamId: teamData.teamId || teamData.id,
        teamName: teamData.teamName || teamData.full_name,
        teamCity: teamData.teamCity || teamData.city,
        teamTricode: teamData.teamTricode || teamData.abbreviation,
        wins: teamData.wins,
        losses: teamData.losses,
        score: teamData.score,
        timeoutsRemaining: teamData.timeoutsRemaining
    };
}

/**
 * Extract game leaders from game data
 */
export async function extractGameLeaders(
    gameData: any,
    homeTeamId?: number,
    awayTeamId?: number,
    gameStatusText?: string
): Promise<GameLeaders | null> {
    if (!gameData) {
        return null;
    }

    // Check if game is live
    const isLive = !!(gameStatusText && (
        gameStatusText.toLowerCase().includes('live') ||
        /\b[1-4]q\b/i.test(gameStatusText) ||
        (gameStatusText.toLowerCase().includes('ot') && !gameStatusText.toLowerCase().includes('final'))
    ));

    async function extractPlayer(leaderData: any, useGameStats: boolean = false): Promise<PlayerStats | null> {
        if (!leaderData) return null;

        const playerId = leaderData.personId || leaderData.id;
        if (!playerId) return null;

        const seasonAverages = await getPlayerSeasonAverages(playerId);

        return {
            personId: playerId,
            name: leaderData.name || `${leaderData.first_name} ${leaderData.last_name}`,
            jerseyNum: seasonAverages.JERSEY_NUMBER || '',
            position: seasonAverages.POSITION || '',
            teamTricode: leaderData.teamTricode || '',
            points: useGameStats ? (leaderData.points || 0) : seasonAverages.PTS,
            rebounds: useGameStats ? (leaderData.rebounds || 0) : seasonAverages.REB,
            assists: useGameStats ? (leaderData.assists || 0) : seasonAverages.AST
        };
    }

    const homeLeaders = await extractPlayer(gameData.homeLeaders, isLive);
    const awayLeaders = await extractPlayer(gameData.awayLeaders, isLive);

    if (!homeLeaders && !awayLeaders) {
        return null;
    }

    return {
        homeLeaders: homeLeaders || undefined,
        awayLeaders: awayLeaders || undefined
    };
}