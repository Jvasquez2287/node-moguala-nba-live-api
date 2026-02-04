import { getScoreboard, getPlayByPlay } from './scoreboard';
import { ScoreboardResponse, PlayByPlayResponse } from '../types';
import { playbyplayWebSocketManager } from './websocketManager';
import { GamesResponse } from '../schemas/schedule';
import { LeagueLeadersResponse } from '../schemas/league';
import { PlayerSummary } from '../schemas/player';
import { SeasonLeadersResponse } from '../schemas/seasonleaders';
import { TeamDetailsResponse, TeamRoster } from '../schemas/team';


interface CacheEntry<T> {
  data: T;
  timestamp: number;
}


class LRUCache {
  private cache = new Map<string, PlayByPlayResponse>();
  private timestamps = new Map<string, number>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): PlayByPlayResponse | null {
    if (this.cache.has(key)) {
      // Move to end (most recently used)
      const value = this.cache.get(key)!;
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key: string, value: PlayByPlayResponse): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now());

    if (this.cache.size > this.maxSize) {
      // Remove oldest (first item)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.timestamps.delete(oldestKey);
        console.log(`LRU eviction: removed game ${oldestKey} from play-by-play cache`);
      }
    }
  }

  remove(key: string): void {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  getTimestamp(key: string): number | null {
    return this.timestamps.get(key) || null;
  }

  clearOldEntries(maxAgeMs: number): number {
    const currentTime = Date.now();
    const keysToRemove: string[] = [];

    for (const [key, timestamp] of this.timestamps.entries()) {
      if (currentTime - timestamp > maxAgeMs) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => this.remove(key));
    return keysToRemove.length;
  }
}

export class DataCache {
  private scoreboardCache: ScoreboardResponse | null = null;
  private playbyplayCache = new LRUCache(20); // Limit to 20 active games
  private lock = false; // Simple lock for async operations
  private activeGameIds = new Set<string>();

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


  private readonly SCOREBOARD_POLL_INTERVAL = 8000; // 8 seconds
  private readonly PLAYBYPLAY_POLL_INTERVAL = 5000; // 5 seconds
  private readonly CLEANUP_INTERVAL = 300000; // 5 minutes

  private scoreboardTask: NodeJS.Timeout | null = null;
  private playbyplayTask: NodeJS.Timeout | null = null;
  private cleanupTask: NodeJS.Timeout | null = null;

  async getScoreboard(): Promise<ScoreboardResponse | null> {
    // Simple async lock
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return this.scoreboardCache;
  }

  async refreshScoreboard(): Promise<ScoreboardResponse | null> {
    // Force a fresh fetch from NBA API
    try {
      const scoreboardData = await getScoreboard();

      this.lock = true;
      try {
        this.scoreboardCache = scoreboardData;
        console.log(`Scoreboard refreshed: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
      } finally {
        this.lock = false;
      }

      return scoreboardData;
    } catch (error) {
      console.error('Error refreshing scoreboard:', error);
      return this.scoreboardCache;
    }
  }

  async getPlaybyplay(gameId: string): Promise<PlayByPlayResponse | null> {
    while (this.lock) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return this.playbyplayCache.get(gameId);
  }


  //////////////////////////////////////////////

  setGamesForDate(date: string, data: GamesResponse): void {
    this.scheduleCache.set(date, { data, timestamp: Date.now() });
  }

  async getGamesForDate(date: string): Promise<GamesResponse | null> {
    const entry = this.scheduleCache.get(date);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  /////////////////////////////////////////

  setAllTeams(data: TeamDetailsResponse[]): void {
    this.allTeamsCache = { data, timestamp: Date.now() };
  }


  async getAllTeams(): Promise<TeamDetailsResponse[] | null> {
    if (this.allTeamsCache && (Date.now() - this.allTeamsCache.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return this.allTeamsCache.data;
    }
    return null;
  }

  ///////////////////////////////////////////

  setTeam(teamId: number, data: TeamDetailsResponse): void {
    this.teamCache.set(teamId, { data, timestamp: Date.now() });
  }

  async getTeam(teamId: number): Promise<TeamDetailsResponse | null> {
    const entry = this.teamCache.get(teamId);
    if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
      return entry.data;
    }
    return null;
  }

  ///////////////////////////////////////////


  private async cleanupFinishedGames(): Promise<void> {
    this.lock = true;
    try {
      const scoreboardData = this.scoreboardCache;
      if (!scoreboardData?.scoreboard?.games) return;

      const finishedGameIds = scoreboardData.scoreboard.games
        .filter((game: any) => game.gameStatus === 3) // Final
        .map((game: any) => game.gameId);

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
    } finally {
      this.lock = false;
    }
  }

  private async periodicCleanup(): Promise<void> {
    console.log('Periodic cache cleanup started');

    const cleanup = async () => {
      try {
        await this.cleanupFinishedGames();

        this.lock = true;
        try {
          const removed = this.playbyplayCache.clearOldEntries(24 * 60 * 60 * 1000); // 24 hours
          if (removed > 0) {
            console.log(`Removed ${removed} old games (older than 24 hours) from play-by-play cache`);
          }
        } finally {
          this.lock = false;
        }
      } catch (error) {
        console.error('Error in periodic cache cleanup:', error);
      }
    };

    // Initial cleanup
    await cleanup();

    // Set up periodic cleanup
    this.cleanupTask = setInterval(cleanup, this.CLEANUP_INTERVAL);
  }

  private async pollScoreboard(): Promise<void> {
    console.log('Scoreboard polling started');

    const poll = async () => {
      try {
        const scoreboardData = await getScoreboard();

        this.lock = true;
        try {
          const oldActiveGames = new Set(this.activeGameIds);
          this.scoreboardCache = scoreboardData;

          // Track active games
          if (scoreboardData?.scoreboard?.games) {
            const activeGames = scoreboardData.scoreboard.games
              .filter((game: any) => game.gameStatus === 2) // In Progress
              .map((game: any) => game.gameId);

            this.activeGameIds = new Set(activeGames);

            // Check for finished games
            const finishedGames = Array.from(oldActiveGames).filter(id => !this.activeGameIds.has(id));
            if (finishedGames.length > 0) {
              finishedGames.forEach(gameId => this.playbyplayCache.remove(gameId));
              console.log(`Immediately cleaned up ${finishedGames.length} finished games from play-by-play cache`);
            }
          }

          console.log(`Scoreboard cache updated: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
        } finally {
          this.lock = false;
        }
      } catch (error) {
        console.warn('Error fetching scoreboard:', error);
      }
    };

    // Initial poll
    await poll();

    // Set up polling interval
    this.scoreboardTask = setInterval(poll, this.SCOREBOARD_POLL_INTERVAL);
  }



  private async pollPlaybyplay(): Promise<void> {
    console.log('Play-by-play polling started');

    const poll = async () => {
      try {
        await this.cleanupFinishedGames();

        this.lock = true;
        const gamesToPoll = Array.from(this.activeGameIds);
        this.lock = false;

        for (const gameId of gamesToPoll) {
          // Double-check game is still active
          this.lock = true;
          const scoreboardData = this.scoreboardCache;
          const game = scoreboardData?.scoreboard?.games?.find((g: any) => g.gameId === gameId);
          this.lock = false;

          if (!game || game.gameStatus !== 2) {
            this.playbyplayCache.remove(gameId);
            this.activeGameIds.delete(gameId);
            continue;
          }

          try {
            const playbyplayData = await getPlayByPlay(gameId);

            this.lock = true;
            try {
              const currentScoreboard = this.scoreboardCache;
              const currentGame = currentScoreboard?.scoreboard?.games?.find((g: any) => g.gameId === gameId);

              if (currentGame && currentGame.gameStatus === 2) {
                this.playbyplayCache.set(gameId, playbyplayData);
                console.log(`Play-by-play cache updated for game ${gameId}`);
                // Broadcast custom data to all connected clients
                await playbyplayWebSocketManager.broadcastToAllClients({ playbyplayData, gameId });
              }
            } finally {
              this.lock = false;
            }
          } catch (error) {
            console.debug(`Error fetching play-by-play for game ${gameId}:`, error);
          }

          // Small delay between games
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        console.error('Unexpected error in play-by-play polling:', error);
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
      console.log('Started scoreboard polling');
    }

    if (!this.playbyplayTask) {
      this.pollPlaybyplay();
      console.log('Started play-by-play polling');
    }

    if (!this.cleanupTask) {
      this.periodicCleanup();
      console.log('Started periodic cache cleanup');
    }
  }

  async stopPolling(): Promise<void> {
    console.log('Stopping data cache polling...');

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

    console.log('Data cache polling stopped');
  }
}

// Single global instance
export const dataCache = new DataCache();