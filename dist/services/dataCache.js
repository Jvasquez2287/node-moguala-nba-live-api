"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataCache = exports.DataCache = void 0;
const scoreboard_1 = require("./scoreboard");
const websocketManager_1 = require("./websocketManager");
class LRUCache {
    constructor(maxSize) {
        this.cache = new Map();
        this.timestamps = new Map();
        this.maxSize = maxSize;
    }
    get(key) {
        if (this.cache.has(key)) {
            // Move to end (most recently used)
            const value = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, value);
            return value;
        }
        return null;
    }
    set(key, value) {
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
    remove(key) {
        this.cache.delete(key);
        this.timestamps.delete(key);
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    getTimestamp(key) {
        return this.timestamps.get(key) || null;
    }
    clearOldEntries(maxAgeMs) {
        const currentTime = Date.now();
        const keysToRemove = [];
        for (const [key, timestamp] of this.timestamps.entries()) {
            if (currentTime - timestamp > maxAgeMs) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => this.remove(key));
        return keysToRemove.length;
    }
}
class DataCache {
    constructor() {
        this.scoreboardCache = null;
        this.playbyplayCache = new LRUCache(20); // Limit to 20 active games
        this.lock = false; // Simple lock for async operations
        this.activeGameIds = new Set();
        // 10-minute refresh caches (new)
        this.leagueLeadersCache = new Map();
        this.playerCache = new Map();
        this.playerSearchCache = new Map();
        this.seasonLeadersCache = new Map();
        this.leagueRosterCache = null;
        this.scheduleCache = new Map();
        this.teamCache = new Map();
        this.teamRosterCache = new Map();
        this.allTeamsCache = null;
        this.SCOREBOARD_POLL_INTERVAL = 8000; // 8 seconds
        this.PLAYBYPLAY_POLL_INTERVAL = 5000; // 5 seconds
        this.CLEANUP_INTERVAL = 300000; // 5 minutes
        this.scoreboardTask = null;
        this.playbyplayTask = null;
        this.cleanupTask = null;
    }
    async getScoreboard() {
        // Simple async lock
        while (this.lock) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return this.scoreboardCache;
    }
    async refreshScoreboard() {
        // Force a fresh fetch from NBA API
        try {
            const scoreboardData = await (0, scoreboard_1.getScoreboard)();
            this.lock = true;
            try {
                this.scoreboardCache = scoreboardData;
                console.log(`Scoreboard refreshed: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
            }
            finally {
                this.lock = false;
            }
            return scoreboardData;
        }
        catch (error) {
            console.error('Error refreshing scoreboard:', error);
            return this.scoreboardCache;
        }
    }
    async getPlaybyplay(gameId) {
        while (this.lock) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        return this.playbyplayCache.get(gameId);
    }
    //////////////////////////////////////////////
    setGamesForDate(date, data) {
        this.scheduleCache.set(date, { data, timestamp: Date.now() });
    }
    async getGamesForDate(date) {
        const entry = this.scheduleCache.get(date);
        if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
            return entry.data;
        }
        return null;
    }
    /////////////////////////////////////////
    setAllTeams(data) {
        this.allTeamsCache = { data, timestamp: Date.now() };
    }
    async getAllTeams() {
        if (this.allTeamsCache && (Date.now() - this.allTeamsCache.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
            return this.allTeamsCache.data;
        }
        return null;
    }
    ///////////////////////////////////////////
    setTeam(teamId, data) {
        this.teamCache.set(teamId, { data, timestamp: Date.now() });
    }
    async getTeam(teamId) {
        const entry = this.teamCache.get(teamId);
        if (entry && (Date.now() - entry.timestamp) < (24 * 60 * 60 * 1000)) { // 24 hours
            return entry.data;
        }
        return null;
    }
    ///////////////////////////////////////////
    async cleanupFinishedGames() {
        this.lock = true;
        try {
            const scoreboardData = this.scoreboardCache;
            if (!scoreboardData?.scoreboard?.games)
                return;
            const finishedGameIds = scoreboardData.scoreboard.games
                .filter((game) => game.gameStatus === 3) // Final
                .map((game) => game.gameId);
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
        finally {
            this.lock = false;
        }
    }
    async periodicCleanup() {
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
                }
                finally {
                    this.lock = false;
                }
            }
            catch (error) {
                console.error('Error in periodic cache cleanup:', error);
            }
        };
        // Initial cleanup
        await cleanup();
        // Set up periodic cleanup
        this.cleanupTask = setInterval(cleanup, this.CLEANUP_INTERVAL);
    }
    async pollScoreboard() {
        console.log('Scoreboard polling started');
        const poll = async () => {
            try {
                const scoreboardData = await (0, scoreboard_1.getScoreboard)();
                this.lock = true;
                try {
                    const oldActiveGames = new Set(this.activeGameIds);
                    this.scoreboardCache = scoreboardData;
                    // Track active games
                    if (scoreboardData?.scoreboard?.games) {
                        const activeGames = scoreboardData.scoreboard.games
                            .filter((game) => game.gameStatus === 2) // In Progress
                            .map((game) => game.gameId);
                        this.activeGameIds = new Set(activeGames);
                        // Check for finished games
                        const finishedGames = Array.from(oldActiveGames).filter(id => !this.activeGameIds.has(id));
                        if (finishedGames.length > 0) {
                            finishedGames.forEach(gameId => this.playbyplayCache.remove(gameId));
                            console.log(`Immediately cleaned up ${finishedGames.length} finished games from play-by-play cache`);
                        }
                    }
                    console.log(`Scoreboard cache updated: ${scoreboardData?.scoreboard?.games?.length || 0} games`);
                }
                finally {
                    this.lock = false;
                }
            }
            catch (error) {
                console.warn('Error fetching scoreboard:', error);
            }
        };
        // Initial poll
        await poll();
        // Set up polling interval
        this.scoreboardTask = setInterval(poll, this.SCOREBOARD_POLL_INTERVAL);
    }
    async pollPlaybyplay() {
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
                    const game = scoreboardData?.scoreboard?.games?.find((g) => g.gameId === gameId);
                    this.lock = false;
                    if (!game || game.gameStatus !== 2) {
                        this.playbyplayCache.remove(gameId);
                        this.activeGameIds.delete(gameId);
                        continue;
                    }
                    try {
                        const playbyplayData = await (0, scoreboard_1.getPlayByPlay)(gameId);
                        this.lock = true;
                        try {
                            const currentScoreboard = this.scoreboardCache;
                            const currentGame = currentScoreboard?.scoreboard?.games?.find((g) => g.gameId === gameId);
                            if (currentGame && currentGame.gameStatus === 2) {
                                this.playbyplayCache.set(gameId, playbyplayData);
                                console.log(`Play-by-play cache updated for game ${gameId}`);
                                // Broadcast custom data to all connected clients
                                await websocketManager_1.playbyplayWebSocketManager.broadcastToAllClients({ playbyplayData, gameId });
                            }
                        }
                        finally {
                            this.lock = false;
                        }
                    }
                    catch (error) {
                        console.debug(`Error fetching play-by-play for game ${gameId}:`, error);
                    }
                    // Small delay between games
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
            catch (error) {
                console.error('Unexpected error in play-by-play polling:', error);
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
    async stopPolling() {
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
exports.DataCache = DataCache;
// Single global instance
exports.dataCache = new DataCache();
//# sourceMappingURL=dataCache.js.map