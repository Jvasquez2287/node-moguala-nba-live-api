"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScoreboard = getScoreboard;
exports.getPlayByPlay = getPlayByPlay;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../utils/config");
// Cache for player season averages to avoid repeated API calls
// Structure: {player_id: {"stats": dict, "timestamp": number}}
const playerStatsCache = new Map();
const PLAYER_STATS_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
const PLAYER_STATS_CACHE_MAX_SIZE = 500;
function cleanupPlayerStatsCache() {
    const currentTime = Date.now();
    const expiredKeys = [];
    for (const [playerId, entry] of playerStatsCache.entries()) {
        if (currentTime - entry.timestamp > PLAYER_STATS_CACHE_TTL) {
            expiredKeys.push(playerId);
        }
    }
    expiredKeys.forEach(key => playerStatsCache.delete(key));
    // Enforce size limit with LRU eviction
    if (playerStatsCache.size > PLAYER_STATS_CACHE_MAX_SIZE) {
        const keysToDelete = Array.from(playerStatsCache.keys()).slice(0, playerStatsCache.size - PLAYER_STATS_CACHE_MAX_SIZE);
        keysToDelete.forEach(key => playerStatsCache.delete(key));
    }
}
async function fetchNBAScoreboard() {
    try {
        const proxyConfig = config_1.config.getApiProxyConfig();
        const axiosConfig = {
            timeout: 10000
        };
        if (proxyConfig) {
            axiosConfig.proxy = proxyConfig;
        }
        const response = await axios_1.default.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json', axiosConfig);
        return response.data.scoreboard || {};
    }
    catch (error) {
        console.warn('Timeout or error fetching scoreboard from NBA API:', error instanceof Error ? error.message : String(error));
        return {};
    }
}
function extractTeamData(teamData) {
    return {
        teamId: teamData.teamId,
        teamName: teamData.teamName,
        teamCity: teamData.teamCity,
        teamTricode: teamData.teamTricode,
        wins: teamData.wins || 0,
        losses: teamData.losses || 0,
        score: teamData.score || 0,
        timeoutsRemaining: teamData.timeoutsRemaining || 0,
    };
}
async function extractGameLeaders(gameLeadersData, homeTeamId, awayTeamId, gameStatusText) {
    if (!gameLeadersData) {
        return null;
    }
    const isLiveGame = gameStatusText && gameStatusText.toLowerCase().includes('live');
    const homeLeaders = gameLeadersData.homeLeaders || {};
    const awayLeaders = gameLeadersData.awayLeaders || {};
    const processLeader = async (leaderData, teamId) => {
        if (!leaderData || !leaderData.personId) {
            return null;
        }
        const playerId = leaderData.personId;
        // For live games, use current game stats; for upcoming games, use season averages
        if (isLiveGame) {
            return {
                playerId,
                name: leaderData.name,
                points: leaderData.points || 0,
                rebounds: leaderData.rebounds || 0,
                assists: leaderData.assists || 0,
                teamId: teamId || 0,
            };
        }
        else {
            // Try to get from cache first
            const cached = playerStatsCache.get(playerId);
            if (cached && (Date.now() - cached.timestamp) < PLAYER_STATS_CACHE_TTL) {
                const stats = cached.stats;
                return {
                    playerId,
                    name: leaderData.name,
                    points: stats.points || 0,
                    rebounds: stats.rebounds || 0,
                    assists: stats.assists || 0,
                    teamId: teamId || 0,
                };
            }
            // TODO: Implement season averages fetching
            // For now, return basic info
            return {
                playerId,
                name: leaderData.name,
                points: 0,
                rebounds: 0,
                assists: 0,
                teamId: teamId || 0,
            };
        }
    };
    const homeLeader = await processLeader(homeLeaders, homeTeamId);
    const awayLeader = await processLeader(awayLeaders, awayTeamId);
    return {
        homeLeaders: homeLeader,
        awayLeaders: awayLeader,
    };
}
async function getScoreboard() {
    try {
        // Clean up cache periodically
        cleanupPlayerStatsCache();
        // Get raw data from NBA API
        const rawScoreboardData = await fetchNBAScoreboard();
        if (!rawScoreboardData) {
            throw new Error('Received empty scoreboard data from NBA API');
        }
        // Get the date and list of games
        const gameDate = rawScoreboardData.gameDate || 'Unknown Date';
        const rawGames = rawScoreboardData.games || [];
        const games = [];
        const transformedData = {
            scoreboard: {
                gameDate: gameDate || new Date().toISOString().split('T')[0],
                games: (rawGames || []).map((game) => ({
                    gameId: game.gameId,
                    gameStatus: game.gameStatus,
                    gameStatusText: game.gameStatusText,
                    period: game.period,
                    gameClock: game.gameClock || undefined,
                    gameTimeUTC: game.gameTimeUTC,
                    homeTeam: {
                        teamId: game.homeTeam.teamId,
                        teamName: game.homeTeam.teamName,
                        teamCity: game.homeTeam.teamCity,
                        teamTricode: game.homeTeam.teamTricode,
                        wins: game.homeTeam.wins,
                        losses: game.homeTeam.losses,
                        score: game.homeTeam.score,
                        timeoutsRemaining: game.homeTeam.timeoutsRemaining
                    },
                    awayTeam: {
                        teamId: game.awayTeam.teamId,
                        teamName: game.awayTeam.teamName,
                        teamCity: game.awayTeam.teamCity,
                        teamTricode: game.awayTeam.teamTricode,
                        wins: game.awayTeam.wins,
                        losses: game.awayTeam.losses,
                        score: game.awayTeam.score,
                        timeoutsRemaining: game.awayTeam.timeoutsRemaining
                    },
                    ...(game.gameLeaders && (game?.gameLeaders?.awayLeaders?.personId !== 0 || game?.gameLeaders?.homeLeaders?.personId !== 0) ? {
                        gameLeaders: {
                            homeLeaders: game.gameLeaders.homeLeaders ? {
                                personId: game.gameLeaders.homeLeaders.personId,
                                name: game.gameLeaders.homeLeaders.name,
                                jerseyNum: game.gameLeaders.homeLeaders.jerseyNum,
                                position: game.gameLeaders.homeLeaders.position,
                                teamTricode: game.gameLeaders.homeLeaders.teamTricode,
                                points: game.gameLeaders.homeLeaders.points,
                                rebounds: game.gameLeaders.homeLeaders.rebounds,
                                assists: game.gameLeaders.homeLeaders.assists
                            } : null,
                            awayLeaders: game.gameLeaders.awayLeaders ? {
                                personId: game.gameLeaders.awayLeaders.personId,
                                name: game.gameLeaders.awayLeaders.name,
                                jerseyNum: game.gameLeaders.awayLeaders.jerseyNum,
                                position: game.gameLeaders.awayLeaders.position,
                                teamTricode: game.gameLeaders.awayLeaders.teamTricode,
                                points: game.gameLeaders.awayLeaders.points,
                                rebounds: game.gameLeaders.awayLeaders.rebounds,
                                assists: game.gameLeaders.awayLeaders.assists
                            } : null
                        }
                    } : { gameLeaders: null })
                }))
            }
        };
        // Process each game
        /* for (const game of rawGames) {
           try {
             // Extract team data for home and away teams
             const homeTeam = extractTeamData(game.homeTeam);
             const awayTeam = extractTeamData(game.awayTeam);
     
             // Get the top players for this game
             const gameLeaders = await extractGameLeaders(
               game.gameLeaders || {},
               homeTeam.teamId,
               awayTeam.teamId,
               game.gameStatusText
             );
     
             // Create a LiveGame object with all the game info
             const liveGame: LiveGame = {
               gameId: game.gameId,
               gameStatus: game.gameStatus,
               gameStatusText: game.gameStatusText?.trim() || '',
               period: game.period,
               gameClock: game.gameClock || '',
               gameTimeUTC: game.gameTimeUTC,
               homeTeam,
               awayTeam,
               gameLeaders,
             };
     
             games.push(liveGame);
           } catch (error) {
             console.warn('Missing required data in game, skipping:', error instanceof Error ? error.message : String(error));
           }
         }
     */
        return transformedData;
    }
    catch (error) {
        console.error('Error fetching live scoreboard:', error);
        throw new Error(`Error fetching live scores: ${error instanceof Error ? error.message : String(error)}`);
    }
}
async function getPlayByPlay(gameId) {
    try {
        const proxyConfig = config_1.config.getApiProxyConfig();
        const axiosConfig = {
            timeout: 10000
        };
        if (proxyConfig) {
            axiosConfig.proxy = proxyConfig;
        }
        const response = await axios_1.default.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`, axiosConfig);
        const playByPlayData = response.data;
        if (!playByPlayData.game || !playByPlayData.game.actions) {
            // Game hasn't started yet - return empty play-by-play
            console.warn(`Play-by-play data not available for game ${gameId} (game may not have started)`);
            return {
                game_id: gameId,
                plays: [],
            };
        }
        // Get all the game actions (shots, fouls, timeouts, etc.)
        const actions = playByPlayData.game.actions;
        // Convert each action into our PlayByPlayEvent format
        const plays = actions.map((action) => ({
            action_number: action.actionNumber,
            clock: action.clock,
            period: action.period,
            team_id: action.teamId,
            team_tricode: action.teamTricode,
            action_type: action.actionType,
            description: action.description,
            player_id: action.personId,
            player_name: action.playerName,
            score_home: action.scoreHome,
            score_away: action.scoreAway,
        }));
        // Return all the plays
        return {
            game_id: gameId,
            plays,
        };
    }
    catch (error) {
        // If play-by-play API fails (e.g., game hasn't started), return empty response
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Expecting value') ||
            errorMessage.includes('JSONDecodeError') ||
            (error instanceof Error && 'code' in error && error.code === 'ENOTFOUND') ||
            (axios_1.default.isAxiosError(error) && error.response?.status === 404)) {
            console.warn(`Play-by-play data not available for game ${gameId} (game may not have started): ${errorMessage}`);
            return {
                game_id: gameId,
                plays: [],
            };
        }
        console.error(`Error retrieving play-by-play for game ${gameId}:`, error);
        throw new Error(`Error retrieving play-by-play: ${errorMessage}`);
    }
}
//# sourceMappingURL=scoreboard.js.map