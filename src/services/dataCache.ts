import { getScoreboard, getPlayByPlay } from './scoreboard';
import { ScoreboardResponse, PlayByPlayResponse } from '../types';
import { playbyplayWebSocketManager } from './websocketManager';
import { GamesResponse } from '../schemas/schedule';
import { LeagueLeadersResponse } from '../schemas/league';
import { PlayerSummary } from '../schemas/player';
import { SeasonLeadersResponse } from '../schemas/seasonleaders';
import { TeamDetailsResponse, TeamRoster } from '../schemas/team';
import { executeQuery } from '../config/database';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class DatabaseCache {
  private readonly CACHE_PREFIX = 'datacache_';
  private fallbackCache = new Map<string, any>(); // Fallback in-memory cache

  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const result = await executeQuery(
        'SELECT [value], expiration FROM cache WHERE [key] = @key',
        { key: cacheKey }
      );

      if (!result.recordset || result.recordset.length === 0) {
        // Try fallback cache
        return this.fallbackCache.get(key) || null;
      }

      const record = result.recordset[0];
      const expiration = record.expiration;

      // Check if expired
      if (expiration && Date.now() > expiration) {
        // Clean up expired entry
        await this.delete(key);
        return null;
      }

      try {
        return JSON.parse(record.value);
      } catch (error) {
        console.error(`[DatabaseCache] Error parsing cached value for key ${key}:`, error);
        return null;
      }
    } catch (error) {
      console.error(`[DatabaseCache] Database error getting cache entry for key ${key}, using fallback:`, error);
      // Use fallback cache
      return this.fallbackCache.get(key) || null;
    }
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      const serializedValue = JSON.stringify(value);
      const expiration = ttlMs ? Date.now() + ttlMs : null;

      await executeQuery(
        `MERGE cache AS target
         USING (SELECT @key as [key]) AS source
         ON target.[key] = source.[key]
         WHEN MATCHED THEN
           UPDATE SET [value] = @value, expiration = @expiration
         WHEN NOT MATCHED THEN
           INSERT ([key], [value], expiration) VALUES (@key, @value, @expiration);`,
        {
          key: cacheKey,
          value: serializedValue,
          expiration: expiration
        }
      );
    } catch (error) {
      console.error(`[DatabaseCache] Database error setting cache entry for key ${key}, using fallback:`, error);
      // Use fallback cache
      this.fallbackCache.set(key, value);
      if (ttlMs) {
        setTimeout(() => this.fallbackCache.delete(key), ttlMs);
      }
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      await executeQuery('DELETE FROM cache WHERE [key] = @key', { key: cacheKey });
    } catch (error) {
      console.error(`[DatabaseCache] Database error deleting cache entry for key ${key}:`, error);
    }
    // Always clean up fallback cache
    this.fallbackCache.delete(key);
  }

  async clearExpired(): Promise<number> {
    try {
      const result = await executeQuery(
        'DELETE FROM cache WHERE expiration IS NOT NULL AND expiration < @currentTime',
        { currentTime: Date.now() }
      );
      return result.rowsAffected?.[0] || 0;
    } catch (error) {
      console.error('[DatabaseCache] Error clearing expired entries:', error);
      return 0;
    }
  }

  async clearAll(): Promise<void> {
    try {
      await executeQuery(`DELETE FROM cache WHERE [key] LIKE '${this.CACHE_PREFIX}%'`);
    } catch (error) {
      console.error('[DatabaseCache] Error clearing all cache entries:', error);
    }
    // Clear fallback cache
    this.fallbackCache.clear();
  }
}

export class DataCache {
  private dbCache = new DatabaseCache();
  private lock = false; // Simple lock for async operations
  private activeGameIds = new Set<string>();

  // Callbacks for WebSocket broadcasts
  private scoreChangeCallbacks: (() => Promise<void>)[] = [];

  private readonly SCOREBOARD_POLL_INTERVAL = 8000; // 8 seconds
  private readonly PLAYBYPLAY_POLL_INTERVAL = 5000; // 5 seconds
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes
  private readonly CACHE_TTL_24H = 24 * 60 * 60 * 1000; // 24 hours
  private readonly CACHE_TTL_10M = 10 * 60 * 1000; // 10 minutes

  private scoreboardTask: NodeJS.Timeout | null = null;
  private playbyplayTask: NodeJS.Timeout | null = null;
  private cleanupTask: NodeJS.Timeout | null = null;


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
    return await this.dbCache.get<ScoreboardResponse>('scoreboard');
  }

  async refreshScoreboard(): Promise<ScoreboardResponse | null> {
    // Force a fresh fetch from NBA API
    try {
      const scoreboardData = await getScoreboard();
      await this.dbCache.set('scoreboard', scoreboardData, this.CACHE_TTL_10M);
      console.log(`[ScoreBoard] Scoreboard refreshed: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
      return scoreboardData;
    } catch (error) {
      console.error('[ScoreBoard] Error refreshing scoreboard:', error);
      return await this.getScoreboard();
    }
  }

  async getPlaybyplay(gameId: string): Promise<PlayByPlayResponse | null> {
    return await this.dbCache.get<PlayByPlayResponse>(`playbyplay_${gameId}`);
  }


  //////////////////////////////////////////////

  setGamesForDate(date: string, data: GamesResponse): void {
    this.dbCache.set(`schedule_${date}`, data, this.CACHE_TTL_24H);
  }

  async getGamesForDate(date: string): Promise<GamesResponse | null> {
    return await this.dbCache.get<GamesResponse>(`schedule_${date}`);
  }

  /////////////////////////////////////////

  setAllTeams(data: TeamDetailsResponse[]): void {
    this.dbCache.set('all_teams', data, this.CACHE_TTL_24H);
  }

  async getAllTeams(): Promise<TeamDetailsResponse[] | null> {
    return await this.dbCache.get<TeamDetailsResponse[]>('all_teams');
  }

  ///////////////////////////////////////////

  setTeam(teamId: number, data: TeamDetailsResponse): void {
    this.dbCache.set(`team_${teamId}`, data, this.CACHE_TTL_24H);
  }

  async getTeam(teamId: number): Promise<TeamDetailsResponse | null> {
    return await this.dbCache.get<TeamDetailsResponse>(`team_${teamId}`);
  }

  ///////////////////////////////////////////

  // Cache setters
  setLeagueLeaders(category: string, season: string | undefined, data: LeagueLeadersResponse): void {
    const key = `league_leaders_${category}_${season || 'current'}`;
    this.dbCache.set(key, data, this.CACHE_TTL_24H);
  }

  setPlayer(playerId: string, data: PlayerSummary): void {
    this.dbCache.set(`player_${playerId}`, data, this.CACHE_TTL_24H);
  }

  setPlayerSearch(query: string, data: PlayerSummary[]): void {
    this.dbCache.set(`player_search_${query.toLowerCase()}`, data, this.CACHE_TTL_24H);
  }

  setSeasonLeaders(season: string, data: SeasonLeadersResponse): void {
    this.dbCache.set(`season_leaders_${season}`, data, this.CACHE_TTL_24H);
  }

  setLeagueRoster(data: PlayerSummary[]): void {
    this.dbCache.set('league_roster', data, this.CACHE_TTL_24H);
  }

  // 24-hour TTL caches (on-demand)
  async getLeagueLeaders(category: string, season?: string): Promise<LeagueLeadersResponse | null> {
    const key = `league_leaders_${category}_${season || 'current'}`;
    return await this.dbCache.get<LeagueLeadersResponse>(key);
  }

  async getPlayer(playerId: string): Promise<PlayerSummary | null> {
    return await this.dbCache.get<PlayerSummary>(`player_${playerId}`);
  }

  async searchPlayers(query: string): Promise<PlayerSummary[] | null> {
    return await this.dbCache.get<PlayerSummary[]>(`player_search_${query.toLowerCase()}`);
  }

  async getSeasonLeaders(season: string): Promise<SeasonLeadersResponse | null> {
    return await this.dbCache.get<SeasonLeadersResponse>(`season_leaders_${season}`);
  }

  async getLeagueRoster(): Promise<PlayerSummary[] | null> {
    return await this.dbCache.get<PlayerSummary[]>('league_roster');
  }

 


  private async cleanupFinishedGames(): Promise<void> {
    try {
      const scoreboardData = await this.getScoreboard();
      if (!scoreboardData?.scoreboard?.games) return;

      const finishedGameIds = scoreboardData.scoreboard.games
        .filter((game: any) => game.gameStatus === 3) // Final
        .map((game: any) => game.gameId);

      let removedCount = 0;
      for (const gameId of finishedGameIds) {
        const exists = await this.dbCache.get<PlayByPlayResponse>(`playbyplay_${gameId}`);
        if (exists) {
          await this.dbCache.delete(`playbyplay_${gameId}`);
          removedCount++;
        }
        this.activeGameIds.delete(gameId);
      }

      if (removedCount > 0) {
        console.log(`[PlayByPlay] Cleaned up ${removedCount} finished games from play-by-play cache`);
      }
    } catch (error) {
      console.error('[DataCache] Error in cleanupFinishedGames:', error);
    }
  }

  private async periodicCleanup(): Promise<void> {
    console.log('[Cleanup] Periodic cache cleanup started');

    const cleanup = async () => {
      try {
        await this.cleanupFinishedGames();

        // Clear expired entries from database
        const removed = await this.dbCache.clearExpired();
        if (removed > 0) {
          console.log(`[DataCache] Removed ${removed} expired entries from database cache`);
        }
      } catch (error) {
        console.error('[Cleanup] Error in periodic cache cleanup:', error);
      }
    };

    // Initial cleanup
    await cleanup();

    // Set up periodic cleanup
    this.cleanupTask = setInterval(cleanup, this.CLEANUP_INTERVAL);
  }

  private async pollScoreboard(): Promise<void> {
    console.log('[ScoreBoard] Polling started');

    const poll = async () => {
      try {
        const scoreboardData = await getScoreboard();

        // Track active games
        if (scoreboardData?.scoreboard?.games) {
          const oldActiveGames = new Set(this.activeGameIds);
          const activeGames = scoreboardData.scoreboard.games
            .filter((game: any) => game.gameStatus === 2) // In Progress
            .map((game: any) => game.gameId);

          this.activeGameIds = new Set(activeGames);

          // Check for finished games and clean them up immediately
          const finishedGames = Array.from(oldActiveGames).filter(id => !this.activeGameIds.has(id));
          if (finishedGames.length > 0) {
            for (const gameId of finishedGames) {
              await this.dbCache.delete(`playbyplay_${gameId}`);
            }
            console.log(`[PlayByPlay] Immediately cleaned up ${finishedGames.length} finished games from play-by-play cache`);
          }
        }

        // Update scoreboard cache
        await this.dbCache.set('scoreboard', scoreboardData, this.CACHE_TTL_10M);
        console.log(`[ScoreBoard] Scoreboard cache updated: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
      } catch (error) {
        console.warn('[ScoreBoard] Error fetching scoreboard:', error);
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval
    this.scoreboardTask = setInterval(poll, this.SCOREBOARD_POLL_INTERVAL);
  }



  private async pollPlaybyplay(): Promise<void> {
    console.log('[PlayByPlay] Polling started');

    const poll = async () => {
      try {
        await this.cleanupFinishedGames();

        const gamesToPoll = Array.from(this.activeGameIds);

        for (const gameId of gamesToPoll) {
          // Double-check game is still active
          const scoreboardData = await this.getScoreboard();
          const game = scoreboardData?.scoreboard?.games?.find((g: any) => g.gameId === gameId);

          if (!game || game.gameStatus !== 2) {
            await this.dbCache.delete(`playbyplay_${gameId}`);
            this.activeGameIds.delete(gameId);
            continue;
          }

          try {
            const playbyplayData = await getPlayByPlay(gameId);

            // Check again if game is still active before caching
            const currentScoreboard = await this.getScoreboard();
            const currentGame = currentScoreboard?.scoreboard?.games?.find((g: any) => g.gameId === gameId);

            if (currentGame && currentGame.gameStatus === 2) {
              await this.dbCache.set(`playbyplay_${gameId}`, playbyplayData, this.CACHE_TTL_24H);
              console.log(`[PlayByPlay] Play-by-play cache updated for game ${gameId}`);
              // Broadcast custom data to all connected clients
              await playbyplayWebSocketManager.broadcastToAllClients({ playbyplayData, gameId });
            }
          } catch (error) {
            console.debug(`[PlayByPlay] Error fetching play-by-play for game ${gameId}:`, error);
          }

          // Small delay between games
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('[PlayByPlay] Unexpected error in play-by-play polling:', error);
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval
    this.playbyplayTask = setInterval(poll, this.PLAYBYPLAY_POLL_INTERVAL);
  }

  startPolling(): void {
    if (!this.scoreboardTask) {
      this.pollScoreboard(); 
    }

    if (!this.playbyplayTask) {
      this.pollPlaybyplay(); 
    }

    if (!this.cleanupTask) {
      this.periodicCleanup(); 
    }
  }

  async stopPolling(): Promise<void> { 
    if (this.scoreboardTask) {
      clearInterval(this.scoreboardTask);
      this.scoreboardTask = null;
    }

    if (this.playbyplayTask) {
      clearInterval(this.playbyplayTask);
      this.playbyplayTask = null;
    }

    if (this.cleanupTask) {
      clearInterval(this.cleanupTask);
      this.cleanupTask = null;
    }

    console.log('[DataCache] Data cache polling stopped');
  }
}

// Single global instance
export const dataCache = new DataCache();