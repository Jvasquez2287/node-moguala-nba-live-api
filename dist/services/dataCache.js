"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataCache = exports.DataCache = void 0;
const scoreboard_1 = require("./scoreboard");
const websocketManager_1 = require("./websocketManager");
const database_1 = require("../config/database");
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
            await (0, database_1.executeQuery)(`MERGE cache AS target
         USING (SELECT @key as [key]) AS source
         ON target.[key] = source.[key]
         WHEN MATCHED THEN
           UPDATE SET [value] = @value, expiration = @expiration
         WHEN NOT MATCHED THEN
           INSERT ([key], [value], expiration) VALUES (@key, @value, @expiration);`, {
                key: cacheKey,
                value: serializedValue,
                expiration: expiration
            });
        }
        catch (error) {
            console.error(`[DatabaseCache] Database error setting cache entry for key ${key}, using fallback:`, error);
            // Use fallback cache
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
        // Callbacks for WebSocket broadcasts
        this.scoreChangeCallbacks = [];
        this.SCOREBOARD_POLL_INTERVAL = 8000; // 8 seconds
        this.PLAYBYPLAY_POLL_INTERVAL = 5000; // 5 seconds
        this.CLEANUP_INTERVAL = 300000; // 5 minutes
        this.CACHE_TTL_24H = 24 * 60 * 60 * 1000; // 24 hours
        this.CACHE_TTL_10M = 10 * 60 * 1000; // 10 minutes
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
        return await this.dbCache.get(`playbyplay_${gameId}`);
    }
    //////////////////////////////////////////////
    setGamesForDate(date, data) {
        this.dbCache.set(`schedule_${date}`, data, this.CACHE_TTL_24H);
    }
    async getGamesForDate(date) {
        return await this.dbCache.get(`schedule_${date}`);
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
                const exists = await this.dbCache.get(`playbyplay_${gameId}`);
                if (exists) {
                    await this.dbCache.delete(`playbyplay_${gameId}`);
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
                            await this.dbCache.delete(`playbyplay_${gameId}`);
                        }
                        console.log(`[PlayByPlay] Immediately cleaned up ${finishedGames.length} finished games from play-by-play cache`);
                    }
                }
                // Update scoreboard cache
                await this.dbCache.set('scoreboard', scoreboardData, this.CACHE_TTL_10M);
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
                        await this.dbCache.delete(`playbyplay_${gameId}`);
                        this.activeGameIds.delete(gameId);
                        continue;
                    }
                    try {
                        const playbyplayData = await (0, scoreboard_1.getPlayByPlay)(gameId);
                        // Check again if game is still active before caching
                        const currentScoreboard = await this.getScoreboard();
                        const currentGame = currentScoreboard?.scoreboard?.games?.find((g) => g.gameId === gameId);
                        if (currentGame && currentGame.gameStatus === 2) {
                            await this.dbCache.set(`playbyplay_${gameId}`, playbyplayData, this.CACHE_TTL_24H);
                            console.log(`[PlayByPlay] Play-by-play cache updated for game ${gameId}`);
                            // Broadcast custom data to all connected clients
                            await websocketManager_1.playbyplayWebSocketManager.broadcastToAllClients({ playbyplayData, gameId });
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