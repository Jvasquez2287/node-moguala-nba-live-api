"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataCache = exports.DataCache = void 0;
const scoreboard_1 = require("./scoreboard");
const database_1 = require("../config/database");
const websocketManager_1 = require("./websocketManager");
class DatabaseCache {
    constructor() {
        this.CACHE_PREFIX = 'datacache_';
        this.fallbackCache = new Map(); // Fallback in-memory cache
    }
    getCacheKey(key) {
        return `${this.CACHE_PREFIX}${key}`;
    }
    async get(key) {
        try {
            const cacheKey = this.getCacheKey(key);
            const result = await (0, database_1.executeQuery)('SELECT [value], expiration FROM cache WHERE [key] = @key', { key: cacheKey });
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
            }
            catch (error) {
                console.error(`[DatabaseCache] Error parsing cached value for key ${key}:`, error);
                return null;
            }
        }
        catch (error) {
            console.error(`[DatabaseCache] Database error getting cache entry for key ${key}, using fallback:`, error);
            // Use fallback cache
            return this.fallbackCache.get(key) || null;
        }
    }
    async set(key, value, ttlMs) {
        try {
            const cacheKey = this.getCacheKey(key);
            const serializedValue = JSON.stringify(value);
            const expiration = ttlMs ? Date.now() + ttlMs : null;
            // Use a robust MERGE statement that handles concurrent inserts/updates
            // The WITH (SERIALIZABLE) hint ensures we don't get phantom reads during the merge
            await (0, database_1.executeQuery)(`BEGIN TRY
           MERGE INTO cache AS target
           USING (SELECT @key as [key]) AS source
           ON target.[key] = source.[key]
           WHEN MATCHED THEN
             UPDATE SET [value] = @value, expiration = @expiration
           WHEN NOT MATCHED THEN
             INSERT ([key], [value], expiration) VALUES (@key, @value, @expiration);
         END TRY
         BEGIN CATCH
           -- If MERGE fails due to constraint (which can happen under high concurrency),
           -- retry with direct UPDATE + INSERT pattern
           IF ERROR_NUMBER() = 2627 -- PRIMARY KEY violation
           BEGIN
             UPDATE cache SET [value] = @value, expiration = @expiration WHERE [key] = @key;
             IF @@ROWCOUNT = 0
               INSERT INTO cache ([key], [value], expiration) VALUES (@key, @value, @expiration);
           END
           ELSE
             THROW;
         END CATCH`, {
                key: cacheKey,
                value: serializedValue,
                expiration: expiration
            });
        }
        catch (error) {
            console.error(`[DatabaseCache] Database error setting cache entry for key ${key}, using fallback:`, error?.message || error);
            // Use fallback cache - silently fail for cache operations
            this.fallbackCache.set(key, value);
            if (ttlMs) {
                setTimeout(() => this.fallbackCache.delete(key), ttlMs);
            }
        }
    }
    async delete(key) {
        try {
            const cacheKey = this.getCacheKey(key);
            await (0, database_1.executeQuery)('DELETE FROM cache WHERE [key] = @key', { key: cacheKey });
        }
        catch (error) {
            console.error(`[DatabaseCache] Database error deleting cache entry for key ${key}:`, error);
        }
        // Always clean up fallback cache
        this.fallbackCache.delete(key);
    }
    async clearExpired() {
        try {
            const result = await (0, database_1.executeQuery)('DELETE FROM cache WHERE expiration IS NOT NULL AND expiration < @currentTime', { currentTime: Date.now() });
            return result.rowsAffected?.[0] || 0;
        }
        catch (error) {
            // Log the error but don't crash - this is a non-critical operation
            const errorCode = error?.code;
            if (errorCode === 'ECONNCLOSED' || error?.message?.includes('Connection')) {
                console.warn('[DatabaseCache] Connection unavailable during cleanup, will retry later');
            }
            else {
                console.error('[DatabaseCache] Error clearing expired entries:', error);
            }
            return 0;
        }
    }
    async clearAll() {
        try {
            await (0, database_1.executeQuery)(`DELETE FROM cache WHERE [key] LIKE '${this.CACHE_PREFIX}%'`);
        }
        catch (error) {
            console.error('[DatabaseCache] Error clearing all cache entries:', error);
        }
        // Clear fallback cache
        this.fallbackCache.clear();
    }
}
class DataCache {
    constructor() {
        this.dbCache = new DatabaseCache();
        this.lock = false; // Simple lock for async operations
        this.activeGameIds = new Set();
        // In-memory stores for play-by-play data (no DB persistence)
        this.playByPlayCache = new Map();
        this.teamPlayByPlayCache = new Map();
        // Callbacks for WebSocket broadcasts
        this.scoreChangeCallbacks = [];
        this.SCOREBOARD_POLL_INTERVAL = 8000; // 8 seconds
        this.PLAYBYPLAY_POLL_INTERVAL = 5000; // 5 seconds
        this.CLEANUP_INTERVAL = 300000; // 5 minutes
        this.CACHE_TTL_24H = 24 * 60 * 60 * 1000; // 24 hours
        this.CACHE_TTL_10M = 10 * 60 * 1000; // 10 minutes
        this.CACHE_TTL_1MONTH = 30 * 24 * 60 * 60 * 1000; // 30 days (1 month)
        this.scoreboardTask = null;
        this.playbyplayTask = null;
        this.cleanupTask = null;
    }
    // Register callback for score changes
    onScoreChange(callback) {
        this.scoreChangeCallbacks.push(callback);
    }
    // Trigger score change callbacks
    async triggerScoreChangeCallbacks() {
        for (const callback of this.scoreChangeCallbacks) {
            try {
                await callback();
            }
            catch (error) {
                console.error('[DataCache] Error in score change callback:', error?.message || error);
            }
        }
    }
    /**
     * Generic cache get method
     * @param key Cache key
     * @returns Cached value or null if not found/expired
     */
    async get(key) {
        return await this.dbCache.get(key);
    }
    /**
     * Generic cache set method
     * @param key Cache key
     * @param value Value to cache
     * @param ttlMs Time to live in milliseconds
     */
    async set(key, value, ttlMs) {
        return await this.dbCache.set(key, value, ttlMs);
    }
    async getScoreboard() {
        return await this.dbCache.get('scoreboard');
    }
    async refreshScoreboard() {
        // Force a fresh fetch from NBA API
        try {
            const scoreboardData = await (0, scoreboard_1.getScoreboard)();
            await this.dbCache.set('scoreboard', scoreboardData, this.CACHE_TTL_10M);
            console.log(`[ScoreBoard] Scoreboard refreshed: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
            return scoreboardData;
        }
        catch (error) {
            console.error('[ScoreBoard] Error refreshing scoreboard:', error);
            return await this.getScoreboard();
        }
    }
    async getPlaybyplay(gameId) {
        // Always return from in-memory cache; we intentionally avoid DB storage for play-by-play
        return this.playByPlayCache.get(gameId) || null;
    }
    //////////////////////////////////////////////
    setGamesForDate(date, data) {
        this.dbCache.set(`schedule_${date}`, data, this.CACHE_TTL_24H);
    }
    async getGamesForDate(date) {
        return await this.dbCache.get(`schedule_${date}`);
    }
    // Store/retrieve full schedule data (24h TTL)
    setScheduleData(data) {
        this.dbCache.set('nba_schedule_full', data, this.CACHE_TTL_24H);
    }
    async getScheduleData() {
        return await this.dbCache.get('nba_schedule_full');
    }
    // Store/retrieve standings data by season (24h TTL)
    setStandingsData(season, data) {
        this.dbCache.set(`standings_${season}`, data, this.CACHE_TTL_24H);
    }
    async getStandingsData(season) {
        return await this.dbCache.get(`standings_${season}`);
    }
    /////////////////////////////////////////
    setAllTeams(data) {
        this.dbCache.set('all_teams', data, this.CACHE_TTL_24H);
    }
    async getAllTeams() {
        return await this.dbCache.get('all_teams');
    }
    ///////////////////////////////////////////
    setTeam(teamId, data) {
        this.dbCache.set(`team_${teamId}`, data, this.CACHE_TTL_24H);
    }
    async getTeam(teamId) {
        return await this.dbCache.get(`team_${teamId}`);
    }
    ///////////////////////////////////////////
    setLastPlayByPlay(gameId, data) {
        this.dbCache.set(`lastPlayActionNumber_${gameId}`, data, this.CACHE_TTL_24H);
    }
    async getLastPlayByPlay(gameId) {
        return await this.dbCache.get(`lastPlayActionNumber_${gameId}`);
    }
    setTeamPlayByPlay(teamId, data) {
        // cache team-level play-by-play in memory only
        this.teamPlayByPlayCache.set(teamId, data);
    }
    async getTeamPlayByPlay(teamId) {
        return this.teamPlayByPlayCache.get(teamId) || null;
    }
    ///////////////////////////////////////////
    // Cache setters
    setLeagueLeaders(category, season, data) {
        const key = `league_leaders_${category}_${season || 'current'}`;
        this.dbCache.set(key, data, this.CACHE_TTL_24H);
    }
    setPlayer(playerId, data) {
        this.dbCache.set(`player_${playerId}`, data, this.CACHE_TTL_24H);
    }
    setPlayerSearch(query, data) {
        this.dbCache.set(`player_search_${query.toLowerCase()}`, data, this.CACHE_TTL_24H);
    }
    setSeasonLeaders(season, data) {
        this.dbCache.set(`season_leaders_${season}`, data, this.CACHE_TTL_24H);
    }
    setLeagueRoster(data) {
        this.dbCache.set('league_roster', data, this.CACHE_TTL_24H);
    }
    // 24-hour TTL caches (on-demand)
    async getLeagueLeaders(category, season) {
        const key = `league_leaders_${category}_${season || 'current'}`;
        return await this.dbCache.get(key);
    }
    async getPlayer(playerId) {
        return await this.dbCache.get(`player_${playerId}`);
    }
    async searchPlayers(query) {
        return await this.dbCache.get(`player_search_${query.toLowerCase()}`);
    }
    async getSeasonLeaders(season) {
        return await this.dbCache.get(`season_leaders_${season}`);
    }
    async getLeagueRoster() {
        return await this.dbCache.get('league_roster');
    }
    async cleanupFinishedGames() {
        try {
            const scoreboardData = await this.getScoreboard();
            if (!scoreboardData?.scoreboard?.games)
                return;
            const finishedGameIds = scoreboardData.scoreboard.games
                .filter((game) => game.gameStatus === 3) // Final
                .map((game) => game.gameId);
            let removedCount = 0;
            for (const gameId of finishedGameIds) {
                // remove from in-memory cache
                if (this.playByPlayCache.delete(gameId)) {
                    removedCount++;
                }
                this.activeGameIds.delete(gameId);
            }
            if (removedCount > 0) {
                console.log(`[PlayByPlay] Cleaned up ${removedCount} finished games from play-by-play cache`);
            }
        }
        catch (error) {
            console.error('[DataCache] Error in cleanupFinishedGames:', error);
        }
    }
    async periodicCleanup() {
        console.log('[Cleanup] Periodic cache cleanup started');
        const cleanup = async () => {
            try {
                await this.cleanupFinishedGames();
                // Clear expired entries from database
                const removed = await this.dbCache.clearExpired();
                if (removed > 0) {
                    console.log(`[DataCache] Removed ${removed} expired entries from database cache`);
                }
            }
            catch (error) {
                console.error('[Cleanup] Error in periodic cache cleanup:', error);
            }
        };
        // Initial cleanup
        await cleanup();
        // Set up periodic cleanup
        this.cleanupTask = setInterval(cleanup, this.CLEANUP_INTERVAL);
    }
    async pollScoreboard() {
        console.log('[ScoreBoard] Polling started');
        const poll = async () => {
            try {
                const scoreboardData = await (0, scoreboard_1.getScoreboard)();
                // Track active games
                if (scoreboardData?.scoreboard?.games) {
                    const oldActiveGames = new Set(this.activeGameIds);
                    const activeGames = scoreboardData.scoreboard.games
                        .filter((game) => game.gameStatus === 2) // In Progress
                        .map((game) => game.gameId);
                    this.activeGameIds = new Set(activeGames);
                    // Check for finished games and clean them up immediately
                    const finishedGames = Array.from(oldActiveGames).filter(id => !this.activeGameIds.has(id));
                    if (finishedGames.length > 0) {
                        for (const gameId of finishedGames) {
                            this.playByPlayCache.delete(gameId);
                        }
                        console.log(`[PlayByPlay] Immediately cleaned up ${finishedGames.length} finished games from play-by-play cache`);
                    }
                }
                // Update scoreboard cache
                await this.dbCache.set('scoreboard', scoreboardData, this.CACHE_TTL_10M);
                await websocketManager_1.webSocketManager.broadcastToAllClientsScoreBoard();
                await this.checkGamesStatusAndGameClock(scoreboardData);
                console.log(`[ScoreBoard] Scoreboard cache updated: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
            }
            catch (error) {
                console.warn('[ScoreBoard] Error fetching scoreboard:', error);
            }
        };
        // Initial poll
        await poll();
        // Set up polling interval
        this.scoreboardTask = setInterval(poll, this.SCOREBOARD_POLL_INTERVAL);
    }
    async checkGamesStatusAndGameClock(data) {
        try {
            const scoreboardData = data.scoreboard;
            if (!scoreboardData || !scoreboardData.games)
                return 0;
            let notifiedGames = 0;
            for (const game of scoreboardData.games) {
                if (game.gameStatus === 2) { // In Progress
                    const clock = game.gameClock || '00:00';
                    const [minutes, seconds] = clock.split(':').map(Number);
                    const gamePeriod = game.period;
                    if (!isNaN(minutes) && !isNaN(seconds)) {
                        return 0; // Game clock is running, return 0 to indicate we should poll more frequently
                    }
                    if (gamePeriod == 4 && minutes === 7) {
                        console.log(`[FiveMinuteMark] Detected 7-minute mark in 4th quarter for game ${game.gameId}`);
                        // At 7-minute mark: send notification and validation
                        if (process.env.USE_MOCK_DATA === 'false') {
                            //  await webSocketManager.sendFiveMinutesMarkNotification(game, 'game_five_minutes_mark');
                            ++notifiedGames; // Add 1 to notifiedGames to indicate we should poll more frequently around this time
                        }
                    }
                }
            }
            return notifiedGames;
        }
        catch (error) {
            console.error('[DataCache] Error in checkGamesStatusAndGameClock:', error);
            return 0;
        }
    }
    async pollPlaybyplay() {
        console.log('[PlayByPlay] Polling started');
        const poll = async () => {
            try {
                await this.cleanupFinishedGames();
                const gamesToPoll = Array.from(this.activeGameIds);
                for (const gameId of gamesToPoll) {
                    // Double-check game is still active
                    const scoreboardData = await this.getScoreboard();
                    const game = scoreboardData?.scoreboard?.games?.find((g) => g.gameId === gameId);
                    if (!game || game.gameStatus !== 2) {
                        // clean up in-memory cache when game is no longer active
                        this.playByPlayCache.delete(gameId);
                        this.activeGameIds.delete(gameId);
                        continue;
                    }
                    try {
                        const playbyplayData = await (0, scoreboard_1.getPlayByPlay)(gameId);
                        // Check again if game is still active before caching
                        const currentScoreboard = await this.getScoreboard();
                        const currentGame = currentScoreboard?.scoreboard?.games?.find((g) => g.gameId === gameId);
                        if (currentGame && currentGame.gameStatus === 2) {
                            // store in-memory only
                            this.playByPlayCache.set(gameId, playbyplayData);
                            console.log(`[PlayByPlay] Play-by-play cache (memory) updated for game ${gameId}`);
                            // Broadcast custom data to all connected clients
                            await websocketManager_1.webSocketManager.broadcastPBPToAllClients({ playbyplayData, gameId });
                        }
                    }
                    catch (error) {
                        console.debug(`[PlayByPlay] Error fetching play-by-play for game ${gameId}:`, error);
                    }
                    // Small delay between games
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            catch (error) {
                console.error('[PlayByPlay] Unexpected error in play-by-play polling:', error);
            }
        };
        // Initial poll
        await poll();
        // Set up polling interval
        this.playbyplayTask = setInterval(poll, this.PLAYBYPLAY_POLL_INTERVAL);
    }
    startPolling() {
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
    /**
     * Get cached predictions for a specific date
     * @param date Date in YYYY-MM-DD format
     * @returns Cached predictions response or null if not found/expired
     */
    async getPredictionsForDate(date) {
        return await this.dbCache.get(`predictions_${date}`);
    }
    /**
     * Cache predictions for a specific date
     * @param date Date in YYYY-MM-DD format
     * @param data Predictions response data to cache
     * @param ttl TTL in milliseconds (defaults to 1 month)
     */
    setPredictionsForDate(date, data, ttl = this.CACHE_TTL_1MONTH) {
        this.dbCache.set(`predictions_${date}`, data, ttl);
    }
    async stopPolling() {
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
exports.DataCache = DataCache;
// Single global instance
exports.dataCache = new DataCache();
//# sourceMappingURL=dataCache.js.map