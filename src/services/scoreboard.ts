import axios, { AxiosProxyConfig } from 'axios';
import { config } from '../utils/config';
import {
  ScoreboardResponse,
  PlayByPlayResponse,
  LiveGame,
  Team,
  GameLeaders,
  PlayByPlayEvent,
  Scoreboard,
  GameLeaderStats
} from '../types';
import { FiveMinuteMarkCalculator } from './fiveMinuteMarkCalculator';
import mockData from './mockData';

interface RawScoreboardData {
  gameDate?: string;
  games?: any[];
}

interface RawPlayByPlayData {
  game?: {
    actions?: any[];
  };
}

// Cache for player season averages to avoid repeated API calls
// Structure: {player_id: {"stats": dict, "timestamp": number}}
const playerStatsCache: Map<number, { stats: any; timestamp: number }> = new Map();
const PLAYER_STATS_CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds
const PLAYER_STATS_CACHE_MAX_SIZE = 500;

function cleanupPlayerStatsCache(): void {
  const currentTime = Date.now();
  const expiredKeys: number[] = [];

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

async function fetchNBAScoreboard(): Promise<RawScoreboardData> {
  try {
    const proxyConfig = config.getApiProxyConfig();
    const axiosConfig: any = {
      timeout: 10000
    };
    if (proxyConfig) {
      axiosConfig.proxy = proxyConfig;
    }
    const response = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json', axiosConfig);
    return response.data.scoreboard || {};
  } catch (error) {
    console.warn('Timeout or error fetching scoreboard from NBA API:', error instanceof Error ? error.message : String(error));
    return {};
  }
}

function extractTeamData(teamData: any): Team {
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

async function extractGameLeaders(
  gameLeadersData: any,
  homeTeamId?: number,
  awayTeamId?: number,
  gameStatusText?: string
): Promise<GameLeaders | null> {
  if (!gameLeadersData) {
    return null;
  }

  const isLiveGame = gameStatusText && gameStatusText.toLowerCase().includes('live');

  const homeLeaders = gameLeadersData.homeLeaders || {};
  const awayLeaders = gameLeadersData.awayLeaders || {};

  const processLeader = async (leaderData: any, teamId?: number): Promise<GameLeaderStats | null> => {
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
    } else {
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

export async function getScoreboard(): Promise<ScoreboardResponse> {
  try {
    // Clean up cache periodically
    cleanupPlayerStatsCache();

    // Get raw data from NBA API
    const rawScoreboardData = await fetchNBAScoreboard();
    if (!rawScoreboardData) {
      throw new Error('Received empty scoreboard data from NBA API');
    }

    // Get the date and list of games
    let gameDate = rawScoreboardData.gameDate || 'Unknown Date';
    let rawGames = rawScoreboardData.games || [];

    const games: LiveGame[] = [];
    if (process.env.USE_MOCK_DATA === 'true') {
      rawGames = mockData.createMockScoreboard().games;
      gameDate = mockData.createMockScoreboard().gameDate;
    } 
     

      const transformedData: ScoreboardResponse = {
          scoreboard: {
            gameDate:  gameDate || new Date().toISOString().split('T')[0],
            games: (rawGames || []).map((game: LiveGame) => ({
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
              ...(  game.gameLeaders && (game?.gameLeaders?.awayLeaders?.personId !== 0 ||  game?.gameLeaders?.homeLeaders?.personId !== 0) ? {
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
              } : { gameLeaders: null }),
              BetPrediction: FiveMinuteMarkCalculator.calculateBetStatus(game)
            }))
          }
        };
   
    return transformedData;
  } catch (error) {
    console.error('Error fetching live scoreboard:', error);
    throw new Error(`Error fetching live scores: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getPlayByPlay(gameId: string): Promise<PlayByPlayResponse> {
  try {
    const proxyConfig = config.getApiProxyConfig();
    const axiosConfig: any = {
      timeout: 10000
    };
    if (proxyConfig) {
      axiosConfig.proxy = proxyConfig;
    }
    const response = await axios.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`, axiosConfig);

    const playByPlayData: RawPlayByPlayData = response.data;

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

    // Helper function to format clock time - "PT11M16.00S" to "11:16"
    const formatClock = (clock: string): string => {
      const match = clock.match(/PT(\d+)M(\d{2})\.\d{2}S/);
      if (match) {
        const minutes = match[1].padStart(2, '0');
        const seconds = match[2];
        return `${minutes}:${seconds}`;
      }
      return clock; // Return original if format is unexpected
    };

    //const lastAction = actions[actions.length - 1];
    //console.log(`Last play action number for game ${gameId}: ${lastAction.actionNumber}`);

    // Convert each action into our PlayByPlayEvent format
    const plays: PlayByPlayEvent[] = actions.map((action: any) => ({
      action_number: action.actionNumber,
      clock: formatClock(action.clock),
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

    const last50Plays = plays.slice(-50);

    // Return all the plays
    return {
      game_id: gameId,
       plays: last50Plays,
    };
  } catch (error) {
    // If play-by-play API fails (e.g., game hasn't started), return empty response
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('Expecting value') ||
        errorMessage.includes('JSONDecodeError') ||
        (error instanceof Error && 'code' in error && error.code === 'ENOTFOUND') ||
        (axios.isAxiosError(error) && error.response?.status === 404)) {
      console.warn(
        `Play-by-play data not available for game ${gameId} (game may not have started): ${errorMessage}`
      );
      return {
        game_id: gameId,
        plays: [],
      };
    }

    console.error(`Error retrieving play-by-play for game ${gameId}:`, error);
    throw new Error(`Error retrieving play-by-play: ${errorMessage}`);
  }
}