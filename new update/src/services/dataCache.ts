/**
 * Data cache service for NBA API data.
 *
 * Polls the NBA API in the background and caches the latest data.
 * WebSocket handlers read from this cache instead of making API calls directly.
 */

import axios from 'axios';
import { ScoreboardResponse, PlayByPlayResponse } from '../schemas/scoreboard';
import { LeagueLeadersResponse } from '../schemas/league';
import { PlayerSummary } from '../schemas/player';
import { SeasonLeadersResponse } from '../schemas/seasonleaders';
import { GamesResponse } from '../schemas/schedule';
import { TeamDetailsResponse, TeamRoster } from '../schemas/team';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);
      return entry.data;
    }
    return null;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now()
    });

    if (this.cache.size > this.maxSize) {
      // Remove oldest (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
     console.log(`LRU eviction: removed game ${firstKey} from play-by-play cache`);
    }
  }

  remove(key: string): void {
    this.cache.delete(key);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  getTimestamp(key: string): number | null {
    const entry = this.cache.get(key);
    return entry ? entry.timestamp : null;
  }

  clearOldEntries(maxAgeMs: number): number {
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < cutoff) {
        this.cache.delete(key);
        removed++;
      }
    }

    return removed;
  }

  get size(): number {
    return this.cache.size;
  }
}

export class DataCache {
  // Real-time caches (existing)
  private scoreboardCache: ScoreboardResponse | null = null;
  private playbyplayCache = new LRUCache<PlayByPlayResponse>(20); // Limit to 20 active games
  private activeGameIds = new Set<string>();

  // Callbacks for WebSocket broadcasts
  private scoreChangeCallbacks: (() => Promise<void>)[] = [];

  // 10-minute refresh caches (new)
  private leagueLeadersCache: Map<string, CacheEntry<LeagueLeadersResponse>> = new Map();
  private playerCache: Map<string, CacheEntry<PlayerSummary>> = new Map();
  private playerSearchCache: Map<string, CacheEntry<PlayerSummary[]>> = new Map();
  private seasonLeadersCache: Map<string, CacheEntry<SeasonLeadersResponse>> = new Map();
  private leagueRosterCache: CacheEntry<PlayerSummary[]> | null = null;
  private scheduleCache: Map<string, CacheEntry<GamesResponse>> = new Map();
  private teamCache: Map<number, CacheEntry<TeamDetailsResponse>> = new Map();
  private teamRosterCache: Map<string, CacheEntry<TeamRoster>> = new Map();
  private allTeamsCache: CacheEntry<TeamDetailsResponse[]> | null = null;
  private boxScoreCache = new LRUCache<any>(50); // Box scores for recent games

  // Polling intervals
  private readonly SCOREBOARD_POLL_INTERVAL = 8000; // 8 seconds (real-time)
  private readonly PLAYBYPLAY_POLL_INTERVAL = 5000; // 5 seconds (real-time)
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes

  // Timers
  private scoreboardTimer: NodeJS.Timeout | null = null;
  private playbyplayTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // No initialization needed for direct HTTP calls
  }

  // Register callback for score changes
  onScoreChange(callback: () => Promise<void>): void {
    this.scoreChangeCallbacks.push(callback);
  }

  // Trigger score change callbacks
  private async triggerScoreChangeCallbacks(): Promise<void> {
    for (const callback of this.scoreChangeCallbacks) {
      try {
        await callback();
      } catch (error: any) {
       console.error('[DataCache] Error in score change callback:', error?.message || error);
      }
    }
  }

  async getScoreboard(): Promise<ScoreboardResponse | null> {
    return this.scoreboardCache;
  }

  async getPlaybyplay(gameId: string): Promise<PlayByPlayResponse | null> {
    return this.playbyplayCache.get(gameId);
  }

  // 24-hour TTL caches (on-demand)
  async getLeagueLeaders(category: string, season?: string): Promise<LeagueLeadersResponse | null> {
    const key = `${category}_${season || 'current'}`;
    const entry = this.leagueLeadersCache.get(key);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  async getPlayer(playerId: string): Promise<PlayerSummary | null> {
    const entry = this.playerCache.get(playerId);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  async searchPlayers(query: string): Promise<PlayerSummary[] | null> {
    const entry = this.playerSearchCache.get(query.toLowerCase());
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  async getSeasonLeaders(season: string): Promise<SeasonLeadersResponse | null> {
    const entry = this.seasonLeadersCache.get(season);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  async getLeagueRoster(): Promise<PlayerSummary[] | null> {
    if (this.leagueRosterCache && (Date.now() - this.leagueRosterCache.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return this.leagueRosterCache.data;
    }
    return null;
  }

  async getGamesForDate(date: string): Promise<GamesResponse | null> {
    const entry = this.scheduleCache.get(date);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  async getTeam(teamId: number): Promise<TeamDetailsResponse | null> {
    const entry = this.teamCache.get(teamId);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  async getTeamRoster(teamId: number, season: string): Promise<TeamRoster | null> {
    const key = `${teamId}_${season}`;
    const entry = this.teamRosterCache.get(key);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  async getAllTeams(): Promise<TeamDetailsResponse[] | null> {
    if (this.allTeamsCache && (Date.now() - this.allTeamsCache.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return this.allTeamsCache.data;
    }
    return null;
  }

  async getBoxScore(gameId: string): Promise<any | null> {
    return this.boxScoreCache.get(gameId);
  }

  // Cache setters
  setLeagueLeaders(category: string, season: string | undefined, data: LeagueLeadersResponse): void {
    const key = `${category}_${season || 'current'}`;
    this.leagueLeadersCache.set(key, { data, timestamp: Date.now() });
  }

  setPlayer(playerId: string, data: PlayerSummary): void {
    this.playerCache.set(playerId, { data, timestamp: Date.now() });
  }

  setPlayerSearch(query: string, data: PlayerSummary[]): void {
    this.playerSearchCache.set(query.toLowerCase(), { data, timestamp: Date.now() });
  }

  setSeasonLeaders(season: string, data: SeasonLeadersResponse): void {
    this.seasonLeadersCache.set(season, { data, timestamp: Date.now() });
  }

  setLeagueRoster(data: PlayerSummary[]): void {
    this.leagueRosterCache = { data, timestamp: Date.now() };
  }

  setGamesForDate(date: string, data: GamesResponse): void {
    this.scheduleCache.set(date, { data, timestamp: Date.now() });
  }

  setTeam(teamId: number, data: TeamDetailsResponse): void {
    this.teamCache.set(teamId, { data, timestamp: Date.now() });
  }

  setTeamRoster(teamId: number, season: string, data: TeamRoster): void {
    const key = `${teamId}_${season}`;
    this.teamRosterCache.set(key, { data, timestamp: Date.now() });
  }

  setAllTeams(data: TeamDetailsResponse[]): void {
    this.allTeamsCache = { data, timestamp: Date.now() };
  }

  setBoxScore(gameId: string, data: any): void {
    this.boxScoreCache.set(gameId, data);
  }

  private async cleanupFinishedGames(): Promise<void> {
    if (!this.scoreboardCache?.scoreboard) {
      return;
    }

    const finishedGameIds = this.scoreboardCache.scoreboard.games
      .filter(game => game.gameStatus === 3) // Final
      .map(game => game.gameId);

    let removedCount = 0;
    for (const gameId of finishedGameIds) {
      if (this.playbyplayCache.get(gameId)) {
        this.playbyplayCache.remove(gameId);
        removedCount++;
      }
      this.activeGameIds.delete(gameId);
    }

    if (removedCount > 0) {
     console.log(`Cleaned up ${removedCount} finished games from play-by-play cache`);
    }
  }

  private async periodicCleanup(): Promise<void> {
   console.log('Periodic cache cleanup started');

    const cleanup = async () => {
      try {
        // Clean up finished games
        await this.cleanupFinishedGames();

        // Remove games older than 24 hours
        const removed = this.playbyplayCache.clearOldEntries(24 * 60 * 60 * 1000); // 24 hours
        if (removed > 0) {
         console.log(`Removed ${removed} old games (older than 24 hours) from play-by-play cache`);
        }
      } catch (error: any) {
       console.error('[DataCache] Error in periodic cache cleanup:', error?.message || error);
      }
    };

    // Run cleanup immediately, then schedule
    await cleanup();
    this.cleanupTimer = setInterval(cleanup, this.CLEANUP_INTERVAL);
  }

  private async pollScoreboard(): Promise<void> {
   console.log('Scoreboard polling started');

    const poll = async () => {
     console.log('Scoreboard poll function called');
      try {
        // Get live scoreboard from NBA API
        const response = await axios.get('https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json', {
          timeout: 30000, // 30 second timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const scoreboardData = response.data;

        // Transform to our schema format
        const transformedData: ScoreboardResponse = {
          scoreboard: {
            gameDate: scoreboardData.scoreboard?.gameDate || new Date().toISOString().split('T')[0],
            games: (scoreboardData.scoreboard?.games || []).map((game: any) => ({
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
              gameLeaders: game.gameLeaders ? {
                homeLeaders: {
                  personId: game.gameLeaders.homeLeaders.personId,
                  name: game.gameLeaders.homeLeaders.name,
                  jerseyNum: game.gameLeaders.homeLeaders.jerseyNum,
                  position: game.gameLeaders.homeLeaders.position,
                  teamTricode: game.gameLeaders.homeLeaders.teamTricode,
                  points: game.gameLeaders.homeLeaders.points,
                  rebounds: game.gameLeaders.homeLeaders.rebounds,
                  assists: game.gameLeaders.homeLeaders.assists
                },
                awayLeaders: {
                  personId: game.gameLeaders.awayLeaders.personId,
                  name: game.gameLeaders.awayLeaders.name,
                  jerseyNum: game.gameLeaders.awayLeaders.jerseyNum,
                  position: game.gameLeaders.awayLeaders.position,
                  teamTricode: game.gameLeaders.awayLeaders.teamTricode,
                  points: game.gameLeaders.awayLeaders.points,
                  rebounds: game.gameLeaders.awayLeaders.rebounds,
                  assists: game.gameLeaders.awayLeaders.assists
                }
              } : undefined
            }))
          }
        };

        // Update cache and detect changes
        const oldActiveGames = new Set(this.activeGameIds);
        const oldScoreboard = this.scoreboardCache;
        this.scoreboardCache = transformedData;

        // Detect score changes
        let hasScoreChanges = false;
        if (oldScoreboard?.scoreboard) {
          const oldGamesMap = new Map(oldScoreboard.scoreboard.games.map(g => [g.gameId, g]));

          for (const newGame of transformedData.scoreboard.games) {
            const oldGame = oldGamesMap.get(newGame.gameId);
            if (oldGame) {
              // Check if scores or status changed
              if (newGame.homeTeam.score !== oldGame.homeTeam.score ||
                newGame.awayTeam.score !== oldGame.awayTeam.score ||
                newGame.gameStatus !== oldGame.gameStatus ||
                newGame.period !== oldGame.period) {
                hasScoreChanges = true;
               console.log(`Score change detected for game ${newGame.gameId}: ${newGame.homeTeam.teamTricode} ${newGame.homeTeam.score} vs ${newGame.awayTeam.teamTricode} ${newGame.awayTeam.score}`);
                break;
              }
            } else if (newGame.gameStatus === 2) {
              // New game started
              hasScoreChanges = true;
             console.log(`New game detected: ${newGame.homeTeam.teamTricode} vs ${newGame.awayTeam.teamTricode}`);
              break;
            }
          }
        } else {
          // First load or after long inactivity
          hasScoreChanges = transformedData.scoreboard.games.length > 0;
        }

        // Trigger WebSocket broadcasts if scores changed
        if (hasScoreChanges) {
          await this.triggerScoreChangeCallbacks();
        }

        // Track active games
        const activeGames = transformedData.scoreboard.games
          .filter(game => game.gameStatus === 2)
          .map(game => game.gameId);
        this.activeGameIds = new Set(activeGames);

        // Clean up finished games
        const finishedGames = Array.from(oldActiveGames).filter(id => !this.activeGameIds.has(id));
        if (finishedGames.length > 0) {
          finishedGames.forEach(gameId => this.playbyplayCache.remove(gameId));
         console.log(`Immediately cleaned up ${finishedGames.length} finished games from play-by-play cache`);
        }

       console.log(`Scoreboard cache updated: ${transformedData.scoreboard.games.length} games`);

      } catch (error: any) {
       console.error('[DataCache] Error fetching scoreboard:', error?.message || error?.code || error);
      }
    };

    // Poll immediately, then schedule
    await poll();
    this.scoreboardTimer = setInterval(poll, this.SCOREBOARD_POLL_INTERVAL);
  }

  private async pollPlaybyplay(): Promise<void> {
   console.log('Play-by-play polling started');

    const poll = async () => {
      try {
        await this.cleanupFinishedGames();

        const gamesToPoll = Array.from(this.activeGameIds);

        for (const gameId of gamesToPoll) {
          // Check if game is still active
          if (this.scoreboardCache?.scoreboard) {
            const game = this.scoreboardCache.scoreboard.games.find(g => g.gameId === gameId);
            if (!game || game.gameStatus !== 2) {
              this.playbyplayCache.remove(gameId);
              this.activeGameIds.delete(gameId);
              continue;
            }
          }

          try {
            // Get live play-by-play data from NBA API https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_{gameId}.json
            const response = await axios.get(`https://cdn.nba.com/static/json/liveData/playbyplay/playbyplay_${gameId}.json`, {
              timeout: 30000, // 30 second timeout
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://www.nba.com/',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            });

            const playbyplayData = response.data;

            // Transform to our schema format
            const transformedData: PlayByPlayResponse = {
              game_id: playbyplayData.game?.gameId || gameId,
              plays: (playbyplayData.game?.actions || []).map((action: any) => ({
                action_number: action.actionNumber,
                clock: action.clock,
                period: action.period,
                period_Type: action.periodType,
                team_id: action.teamId || undefined,
                team_tricode: action.teamTricode || undefined,
                action_type: action.actionType,
                sub_Type: action.subType || undefined,
                description: action.description,
                player_id: action.personId || undefined,
                score_home: action.scoreHome,
                score_away: action.scoreAway, 
                player_Name: action.playerName,
                player_NameI: action.playerNameI,
                person_Ids_Filter: action.personIdsFilter || [],
                time_Actual: action.timeActual || undefined,   
                person_Id: action.personId || undefined,    
                is_Target_Score_Last_Period: action.isTargetScoreLastPeriod || undefined,
                shot_Distance: action.shotDistance || undefined, 
                shot_Result: action.shotResult || undefined, 
              }))
            };

            // Only cache if game is still active
            if (this.scoreboardCache?.scoreboard) {
              const game = this.scoreboardCache.scoreboard.games.find(g => g.gameId === gameId);
              if (game && game.gameStatus === 2) {
                const oldPlaybyplay = this.playbyplayCache.get(gameId);
                this.playbyplayCache.set(gameId, transformedData); 
                // Check if play count changed (new play happened)
                if (!oldPlaybyplay || oldPlaybyplay.plays.length !== transformedData.plays.length) {
                 console.log(`New play detected for game ${gameId}: ${transformedData.plays.length} plays total`);
                  await this.triggerScoreChangeCallbacks();
                } else {
                 console.log(`Play-by-play cache updated for game ${gameId}`);
                }
              }
            }

          } catch (error: any) {
           console.error(`[DataCache] Error fetching play-by-play for game ${gameId}:`, error?.message || error?.code || error);
          }

          // Small delay between games
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error: any) {
       console.error('[DataCache] Unexpected error in play-by-play polling:', error?.message || error);
      }
    };

    // Poll immediately, then schedule
    await poll();
    this.playbyplayTimer = setInterval(poll, this.PLAYBYPLAY_POLL_INTERVAL);
  }



  async startPolling(): Promise<void> {
   console.log('Data cache startPolling called');
    await this.periodicCleanup();
    await this.pollScoreboard();
    await this.pollPlaybyplay();

   console.log('Data cache polling started (real-time only)');
  }

  async stopPolling(): Promise<void> {
   console.log('Stopping data cache polling...');

    if (this.scoreboardTimer) {
      clearInterval(this.scoreboardTimer);
      this.scoreboardTimer = null;
    }

    if (this.playbyplayTimer) {
      clearInterval(this.playbyplayTimer);
      this.playbyplayTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

   console.log('Data cache polling stopped');
  }

  isPolling(): boolean {
    return !!(this.scoreboardTimer || this.playbyplayTimer);
  }
}

// Single global instance
export const dataCache = new DataCache();
