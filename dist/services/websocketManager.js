"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketManager = exports.ScoreboardWebSocketManager = void 0;
const ws_1 = __importDefault(require("ws"));
const dataCache_1 = require("./dataCache");
const expoNotificationSystem_1 = __importDefault(require("./expoNotificationSystem"));
const database_1 = require("../config/database");
const mssql_1 = __importDefault(require("mssql"));
class ScoreboardWebSocketManager {
    constructor() {
        this.activeConnections = new Set();
        this.activeConnectionsPBP = new Map();
        this.checkInterval = null;
        this.cleanupInterval = null;
        this.currentGames = [];
        this.lastUpdateTimestamp = new Map();
        this.lastFullBroadcast = 0;
        this.initialized = false;
        // Notification tracking to prevent duplicates (now stored in database)
        this.seenGameIds = new Set();
        this.NOTIFICATION_COOLDOWN = 5000; // 5 seconds - minimum time between same notification type for same game
        // Scoreboard update intervals and thresholds
        this.CHECK_INTERVAL = 2000; // 2 seconds - check for changes frequently
        this.PERIODIC_BROADCAST_INTERVAL = 60000; // 1 minute - send data periodically to all clients
        this.CLEANUP_INTERVAL = 600000; // 10 minutes - clean up stale timestamps
        this.MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates per game
        this.CLEANUP_THRESHOLD = 3600000; // 1 hour - remove stale timestamps older than this
        // Play-by-play tracking
        this.broadcastIntervalsPBP = new Map();
        this.cleanupIntervalPBP = null;
        this.currentPBP = new Map();
        this.lastUpdateTimestampPBP = new Map();
        this.lastFullBroadcastPBP = new Map();
        this.BROADCAST_INTERVAL_PBP = 30000; // 30 seconds - check for new plays frequently
        this.MAX_BROADCAST_INTERVAL_PBP = 120000; // 2 minutes (120 seconds) - maximum time between broadcasts
        this.CLEANUP_INTERVAL_PBP = 600000; // 10 minutes - clean up stale data
        this.MIN_UPDATE_INTERVAL_PBP = 2000; // Minimum 2 seconds between updates per game
        this.CLEANUP_THRESHOLD_PBP = 3600000; // 1 hour - remove stale timestamps older than this
        // Key moments broadcasting
        this.keyMomentsInterval = null;
        this.KEY_MOMENTS_BROADCAST_INTERVAL = 20000; // 20 seconds
        if (!this.initialized) {
            this.initialized = true;
            // Defer broadcast task start to allow modules to fully load
            setImmediate(() => this.initializeBroadcasting());
        }
    }
    // WebSocket connection handling
    connect(websocket) {
        websocket.on('error', (error) => {
            const errorMsg = error?.message || String(error);
            const errorCode = error?.code || 'UNKNOWN';
            console.error(`[Scoreboard WebSocket] Client error [${errorCode}]: ${errorMsg}`);
            this.activeConnections.delete(websocket);
        });
        websocket.on('close', (code, reason) => {
            console.log(`[Scoreboard WebSocket] Close event fired - Code: ${code}, Reason: ${reason || 'none'}, Active before removal: ${this.activeConnections.size}`);
            this.activeConnections.delete(websocket);
            if (this.activeConnections.size === 0) {
                this.lastUpdateTimestamp.clear();
            }
            if (code !== 1000) {
                console.warn(`[Scoreboard WebSocket] Client closed with code ${code}: ${reason || 'no reason'}. Active: ${this.activeConnections.size}`);
            }
            else {
                console.log(`[Scoreboard WebSocket] Client disconnected gracefully. Active connections: ${this.activeConnections.size}`);
            }
        });
        websocket.on('message', (data) => {
            try {
                const messageStr = typeof data === 'string' ? data : data.toString();
                const message = JSON.parse(messageStr);
                console.log(`[Scoreboard WebSocket] Message received: ${message.type || 'unknown type'}`);
                if (message.type === 'subscribe_scoreboard') {
                    if (this.activeConnections.has(websocket)) {
                        console.warn(`[Scoreboard WebSocket] Client already subscribed, ignoring duplicate subscribe request`);
                    }
                    else {
                        this.activeConnections.add(websocket);
                    }
                }
                else if (message.type === 'unsubscribe_scoreboard') {
                    this.activeConnections.delete(websocket);
                    console.log(`[Scoreboard WebSocket] Client unsubscribed. Active connections: ${this.activeConnections.size}`);
                }
                else if (message.type === 'subscribe_display_bagged') {
                    console.log(`[Scoreboard WebSocket] Client subscribed to display_bagged messages`);
                }
                else if (message.type === 'subscribe_playbyplay') {
                    console.log(`[Scoreboard WebSocket] Client subscribed to PBP messages`);
                    const gameId = message.data.gameId;
                    if (!this.activeConnectionsPBP.has(gameId)) {
                        this.activeConnectionsPBP.set(gameId, new Set());
                    }
                    this.activeConnectionsPBP.get(gameId).add(websocket);
                    this.sendInitialPBPData(gameId, websocket);
                    console.log(`[Scoreboard WebSocket] Client subscribed to PBP for game ${gameId}. Total subscribers for this game: ${this.activeConnectionsPBP.get(gameId)?.size || 0}`, message);
                }
                else if (message.type === 'unsubscribe_playbyplay') {
                    console.log(`[Scoreboard WebSocket] Client unsubscribed from PBP messages`);
                    const gameId = message.data.gameId;
                    this.activeConnectionsPBP.get(gameId)?.delete(websocket);
                }
                else if (message.type === 'ping') {
                    if (websocket.readyState === ws_1.default.OPEN) {
                        websocket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
                    }
                }
            }
            catch (error) {
                console.error('[Scoreboard WebSocket] Error logging message:', error);
            }
        });
        this.activeConnections.add(websocket);
        console.log(`[Scoreboard WebSocket] New client connected. Active connections: ${this.activeConnections.size}`);
        // Send initial data
        this.sendInitialData(websocket);
    }
    // END WebSocket connection handling
    // Play-by-play initial data send
    disconnect(websocket) {
        this.activeConnections.delete(websocket);
        for (const [gameId, connections] of this.activeConnectionsPBP.entries()) {
            connections.delete(websocket);
            if (connections.size === 0) {
                this.activeConnectionsPBP.delete(gameId);
            }
        }
        console.log(`[Scoreboard WebSocket] Client disconnected (remaining: ${this.activeConnections.size})`);
        // Clear timestamps if no more connections
        if (this.activeConnections.size === 0) {
            this.lastUpdateTimestamp.clear();
        }
    }
    // END Play-by-play initial data send
    // key moments to send notifications on: game start, score updates, 5-minute mark of Q4, game end
    // END key moments
    // Scoreboard Testing Method - can be called from other modules to trigger a broadcast with current data (for testing purposes)
    async sendInitialData(websocket) {
        try {
            if (!this.activeConnections.has(websocket)) {
                console.warn('\n\n[Scoreboard WebSocket] Websocket not in active connections, skipping initial send\n\n');
                return;
            }
            if (process.env.USE_MOCK_DATA === 'true') {
                dataCache_1.dataCache.refreshScoreboard();
            }
            const scoreboardData = await dataCache_1.dataCache.getScoreboard();
            if (scoreboardData && scoreboardData.scoreboard && scoreboardData.scoreboard.games && scoreboardData.scoreboard.games.length > 0) {
                const message = JSON.stringify({ scoreboard: scoreboardData.scoreboard });
                if (websocket.readyState === ws_1.default.OPEN) {
                    websocket.send(message);
                    console.log(`[Scoreboard WebSocket] Sent initial data: ${scoreboardData.scoreboard.games.length} games`);
                }
                else {
                    console.warn(`[Scoreboard WebSocket] Cannot send - websocket not open (readyState: ${websocket.readyState})`);
                }
            }
            else {
                const emptyMessage = JSON.stringify({
                    scoreboard: {
                        gameDate: new Date().toISOString().split('T')[0],
                        games: []
                    }
                });
                if (websocket.readyState === ws_1.default.OPEN) {
                    websocket.send(emptyMessage);
                    console.log('[Scoreboard WebSocket] Sent empty initial data (no games available)');
                }
            }
        }
        catch (error) {
            const errorMsg = error?.message || String(error);
            console.error(`[Scoreboard WebSocket] Error sending initial data: ${errorMsg}`);
            this.activeConnections.delete(websocket);
        }
    }
    // END Scoreboard Testing Method
    // Play-by-play initial data send
    async sendNotificationOngameStatusChange(game, eventType) {
        const gameId = game.gameId || 'unknown';
        const currentTime = Date.now();
        try {
            // Check if notification has already been sent recently from database
            const lastNotification = await this.getLastNotificationTime(gameId, eventType);
            if (lastNotification) {
                const timeSinceLastNotification = currentTime - lastNotification.getTime();
                if (timeSinceLastNotification < this.NOTIFICATION_COOLDOWN) {
                    console.log(`[Scoreboard WebSocket] Skipping duplicate notification for game ${gameId} - event: ${eventType} (sent ${timeSinceLastNotification}ms ago)`);
                    return; // Skip duplicate notification
                }
            }
            const awayTeam = game.awayTeam?.teamName || 'Away Team';
            const homeTeam = game.homeTeam?.teamName || 'Home Team';
            const score = `${game.awayTeam?.score || 0}-${game.homeTeam?.score || 0}`;
            const notificationStatus = await expoNotificationSystem_1.default.sendGameUpdateNotification(gameId, awayTeam, homeTeam, score, eventType);
            if (notificationStatus !== 0) {
                // Track successful notification in database
                await this.recordNotificationInDatabase(gameId, eventType);
                console.log(`[Scoreboard WebSocket] Notification sent for game ${gameId} - Status: ${notificationStatus}`);
            }
            else {
                console.warn(`[Scoreboard WebSocket] Failed to send notification for game ${gameId}`);
            }
        }
        catch (error) {
            console.error(`[Scoreboard WebSocket] Error in sendNotificationOngameStatusChange for game ${gameId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // END Play-by-play initial data send
    // Rate limiting logic for GenAI API requests
    async sendFiveMinutesMarkNotification(game, eventType) {
        const gameId = game.gameId || 'unknown';
        const currentTime = Date.now();
        try {
            // Check if notification has already been sent recently from database
            const lastNotification = await this.getLastNotificationTime(gameId, eventType);
            if (lastNotification) {
                const timeSinceLastNotification = currentTime - lastNotification.getTime();
                if (timeSinceLastNotification < this.NOTIFICATION_COOLDOWN) {
                    console.log(`[Scoreboard WebSocket] Skipping duplicate notification for game ${gameId} - event: ${eventType} (sent ${timeSinceLastNotification}ms ago)`);
                    return; // Skip duplicate notification
                }
            }
            const awayTeam = game.awayTeam?.teamName || 'Away Team';
            const homeTeam = game.homeTeam?.teamName || 'Home Team';
            const score = `${game.awayTeam?.score || 0}-${game.homeTeam?.score || 0}`;
            const notificationStatus = await expoNotificationSystem_1.default.sendGameUpdateNotification(gameId, awayTeam, homeTeam, score, eventType);
            if (notificationStatus !== 0) {
                // Track successful notification in database
                await this.recordNotificationInDatabase(gameId, eventType);
                console.log(`[Scoreboard WebSocket] Notification sent for game ${gameId} - Status: ${notificationStatus}`);
            }
            else {
                console.warn(`[Scoreboard WebSocket] Failed to send notification for game ${gameId}`);
            }
        }
        catch (error) {
            console.error(`[Scoreboard WebSocket] Error in sendFiveMinutesMarkNotification for game ${gameId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // END Rate limiting logic for GenAI API requests
    /**
     * Get the last time a notification was sent for a game and event type
     * @returns Date of last notification or null if never sent
     */
    async getLastNotificationTime(gameId, eventType) {
        try {
            const pool = await (0, database_1.connectToDatabase)();
            if (!pool)
                return null;
            const result = await pool
                .request()
                .input('gameId', mssql_1.default.VarChar(255), gameId)
                .input('eventType', mssql_1.default.VarChar(100), eventType)
                .query(`
          SELECT TOP 1 last_sent_at 
          FROM game_notification_tracker 
          WHERE game_id = @gameId AND event_type = @eventType
          ORDER BY last_sent_at DESC
        `);
            if (result.recordset && result.recordset.length > 0) {
                return result.recordset[0].last_sent_at;
            }
            return null;
        }
        catch (error) {
            console.error(`[Scoreboard WebSocket] Error getting last notification time: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    /**
     * Record a notification in the database
     */
    async recordNotificationInDatabase(gameId, eventType) {
        try {
            const pool = await (0, database_1.connectToDatabase)();
            if (!pool)
                return;
            await pool
                .request()
                .input('gameId', mssql_1.default.VarChar(255), gameId)
                .input('eventType', mssql_1.default.VarChar(100), eventType)
                .query(`
          MERGE game_notification_tracker AS target
          USING (SELECT @gameId as game_id, @eventType as event_type) AS source
          ON target.game_id = source.game_id AND target.event_type = source.event_type
          WHEN MATCHED THEN
            UPDATE SET last_sent_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (game_id, event_type, last_sent_at)
            VALUES (@gameId, @eventType, GETDATE());
        `);
            console.log(`[Scoreboard WebSocket] Recorded notification in database for game ${gameId} - event: ${eventType}`);
        }
        catch (error) {
            console.error(`[Scoreboard WebSocket] Error recording notification in database: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Notification for new game ID (used when a new game appears that wasn't previously tracked)
    async sendNotificationOnGameIDChange(game) {
        const gameId = game.gameId || 'unknown';
        // Check if we've already sent a new game notification for this game ID
        if (this.seenGameIds.has(gameId)) {
            console.log(`[Scoreboard WebSocket] New game notification already sent for game ${gameId}, skipping duplicate`);
            return; // Skip if already notified about this game
        }
        // Mark this game as seen
        this.seenGameIds.add(gameId);
        const awayTeam = game.awayTeam?.teamName || 'Away Team';
        const homeTeam = game.homeTeam?.teamName || 'Home Team';
        const score = `${game.awayTeam?.score || 0}-${game.homeTeam?.score || 0}`;
        const percentage = "null"; // Placeholder for confidence percentage if available
        const notificationStatus = await expoNotificationSystem_1.default.sendGameUpdateNotification(gameId, awayTeam, homeTeam, score, 'new_prediction', percentage);
        if (notificationStatus !== 0) {
            // Track successful notification in database
            await this.recordNotificationInDatabase(gameId, 'new_game');
            console.log(`[Scoreboard WebSocket] New game notification sent for game ${gameId} - Status: ${notificationStatus}`);
        }
        else {
            console.warn(`[Scoreboard WebSocket] Failed to send new game notification for game ${gameId}`);
        }
    }
    // END Notification for new game ID (used when a new game appears that wasn't previously tracked)
    // Rate limiting logic for GenAI API requests
    handleConnection(websocket) {
        this.connect(websocket);
    }
    // END Rate limiting logic for GenAI API requests
    // Play-by-play initial data send
    formatGameResponse(games) {
        return games.map((game) => ({
            gameId: game.gameId,
            gameStatus: game.gameStatus || 0,
            gameStatusText: game.gameStatusText || '',
            period: game.period || 0,
            gameClock: game.gameClock || null,
            gameTimeUTC: game.gameTimeUTC || '',
            home_Team: {
                teamId: game.homeTeam?.teamId,
                teamName: game.homeTeam?.teamName || '',
                teamCity: game.homeTeam?.teamCity || '',
                teamTricode: game.homeTeam?.teamTricode || '',
                wins: game.homeTeam?.wins || 0,
                losses: game.homeTeam?.losses || 0,
                score: game.homeTeam?.score || 0,
                timeoutsRemaining: game.homeTeam?.timeoutsRemaining || 0,
                periods: (Array.isArray(game.homeTeam?.periods) && game.homeTeam.periods.length > 0) ? game.homeTeam.periods.map((p) => ({
                    period: p.period,
                    score: p.score
                })) : []
            },
            away_Team: {
                teamId: game.awayTeam?.teamId,
                teamName: game.awayTeam?.teamName || '',
                teamCity: game.awayTeam?.teamCity || '',
                teamTricode: game.awayTeam?.teamTricode || '',
                wins: game.awayTeam?.wins || 0,
                losses: game.awayTeam?.losses || 0,
                score: game.awayTeam?.score || 0,
                timeoutsRemaining: game.awayTeam?.timeoutsRemaining || 0,
                periods: (Array.isArray(game.awayTeam?.periods) && game.awayTeam.periods.length > 0) ? game.awayTeam.periods.map((p) => ({
                    period: p.period,
                    score: p.score
                })) : []
            },
            gameLeaders: game.gameLeaders || null
        }));
    }
    // END Play-by-play initial data send
    // Play-by-play initial data send
    hasGameDataChanged(newGames, oldGames) {
        const currentTime = Date.now();
        const newMap = new Map(newGames.map(g => [g.gameId, g]));
        const oldMap = new Map(oldGames.map(g => [g.gameId, g]));
        for (const [gameId, newGame] of newMap) {
            if (!oldMap.has(gameId)) {
                this.sendNotificationOnGameIDChange(newGame);
                return true;
            }
            // Check for game status change and send notification if changed
            if (newGame.gameStatus !== oldGames.find((g) => g.gameId === gameId)?.gameStatus) {
                if (newGame.gameStatus === 1 && oldGames.find((g) => g.gameId === gameId)?.gameStatus !== 1) // Game just started
                    this.sendNotificationOngameStatusChange(newGame, 'game_started');
                else if (newGame.gameStatus === 3 && oldGames.find((g) => g.gameId === gameId)?.gameStatus !== 3) // Game just ended
                    this.sendNotificationOngameStatusChange(newGame, 'game_ended');
            }
            const oldGame = oldMap.get(gameId);
            const lastUpdate = this.lastUpdateTimestamp.get(gameId) || 0;
            // Check if scores, status, or period changed
            const homeScoreChanged = newGame.homeTeam?.score !== oldGame.homeTeam?.score;
            const awayScoreChanged = newGame.awayTeam?.score !== oldGame.awayTeam?.score;
            const statusChanged = newGame.gameStatus !== oldGame.gameStatus;
            const periodChanged = newGame.period !== oldGame.period;
            const clockChanged = newGame.gameClock !== oldGame.gameClock;
            if (homeScoreChanged || awayScoreChanged || statusChanged || periodChanged || clockChanged) {
                // Only update if minimum interval has passed
                if (currentTime - lastUpdate >= this.MIN_UPDATE_INTERVAL) {
                    this.lastUpdateTimestamp.set(gameId, currentTime);
                    return true;
                }
            }
        }
        return false;
    }
    // END Play-by-play initial data send
    // Scoreboard Testing Method - can be called from other modules to trigger a broadcast with current data (for testing purposes)
    async checkAndBroadcast() {
        if (this.activeConnections.size === 0)
            return;
        try {
            const scoreboardData = await dataCache_1.dataCache.getScoreboard();
            if (!scoreboardData?.scoreboard) {
                return;
            }
            const newGames = scoreboardData.scoreboard.games || [];
            const currentTime = Date.now();
            const timeSinceLastBroadcast = currentTime - this.lastFullBroadcast;
            // Check if data changed or if periodic broadcast interval has passed (1 minute)
            const dataChanged = this.hasGameDataChanged(newGames, this.currentGames);
            const shouldBroadcast = dataChanged || timeSinceLastBroadcast >= this.PERIODIC_BROADCAST_INTERVAL;
            if (!shouldBroadcast) {
                return; // No changes and periodic interval not reached
            }
            // Update tracking
            this.currentGames = newGames;
            this.lastFullBroadcast = currentTime;
            // Send updates to all connected clients
            const message = JSON.stringify({ scoreboard: scoreboardData.scoreboard });
            const deadConnections = new Set();
            let successCount = 0;
            let failureCount = 0;
            const timestamp = new Date().toISOString();
            if (dataChanged) {
                console.log(`[${timestamp}] [Scoreboard WS] Scoreboard CHANGED - Broadcasting to ${this.activeConnections.size} clients`);
            }
            else {
                console.log(`[${timestamp}] [Scoreboard WS] PERIODIC broadcast (1 min) to ${this.activeConnections.size} clients`);
            }
            for (const connection of this.activeConnections) {
                try {
                    if (connection.readyState === ws_1.default.OPEN) {
                        connection.send(message);
                        successCount++;
                    }
                    else {
                        console.warn(`[Scoreboard WS] Connection not OPEN (readyState: ${connection.readyState}), marking as dead`);
                        deadConnections.add(connection);
                        failureCount++;
                    }
                }
                catch (error) {
                    console.error('[Scoreboard WS] Error sending to client:', error);
                    deadConnections.add(connection);
                    failureCount++;
                }
            }
            // Clean up disconnected clients (before logging summary)
            const deadCount = deadConnections.size;
            if (deadCount > 0) {
                console.log(`[Scoreboard WS] Removing ${deadCount} dead connections (readyState not OPEN or send error)`);
                deadConnections.forEach(client => this.activeConnections.delete(client));
            }
            console.log(`[Scoreboard WS] Broadcast completed - Sent: ${successCount}, Failed: ${failureCount}, Remaining: ${this.activeConnections.size}`);
        }
        catch (error) {
            console.error('[Scoreboard WebSocket] Error in broadcast:', error);
        }
    }
    // END Scoreboard Testing Method
    // Cleanup task to remove dead connections and stale timestamps
    startCleanupTask() {
        if (this.cleanupInterval)
            return;
        console.log('[Scoreboard WebSocket] Cleanup task started');
        const cleanup = async () => {
            // Remove dead connections
            const deadConnections = [];
            for (const client of this.activeConnections) {
                if (client.readyState !== ws_1.default.OPEN) {
                    deadConnections.push(client);
                }
            }
            deadConnections.forEach(client => {
                this.activeConnections.delete(client);
            });
            // Clean up stale timestamps
            const currentTime = Date.now();
            const staleKeys = [];
            for (const [gameId, timestamp] of this.lastUpdateTimestamp) {
                if (currentTime - timestamp > this.CLEANUP_THRESHOLD) {
                    staleKeys.push(gameId);
                }
            }
            staleKeys.forEach(key => this.lastUpdateTimestamp.delete(key));
            // Clean up old notification entries from database (older than 1 hour)
            await this.cleanupOldNotificationsFromDatabase();
            if (deadConnections.length > 0 || staleKeys.length > 0) {
                console.log(`[Scoreboard WebSocket] Cleanup: removed ${deadConnections.length} dead connections, ${staleKeys.length} stale timestamps`);
            }
        };
        this.cleanupInterval = setInterval(cleanup, this.CLEANUP_INTERVAL);
    }
    /**
     * Clean up old notification tracking records from database (older than 1 hour)
     */
    async cleanupOldNotificationsFromDatabase() {
        try {
            const pool = await (0, database_1.connectToDatabase)();
            if (!pool)
                return;
            const result = await pool
                .request()
                .query(`
          DELETE FROM game_notification_tracker
          WHERE last_sent_at < DATEADD(HOUR, -1, GETDATE())
        `);
            if (result.rowsAffected[0] > 0) {
                console.log(`[Scoreboard WebSocket] Cleaned up ${result.rowsAffected[0]} old notification records from database`);
            }
        }
        catch (error) {
            console.error(`[Scoreboard WebSocket] Error cleaning up old notifications from database: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    // Stop cleanup task and broadcasting (called when shutting down server)
    stopCleanupTask() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('[Scoreboard WebSocket] Cleanup task stopped');
        }
        this.stopBroadcasting();
    }
    // END Cleanup task to remove dead connections and stale timestamps
    // Method to get current number of active connections (for monitoring purposes)
    getConnectionCount() {
        return this.activeConnections.size;
    }
    // END Method to get current number of active connections (for monitoring purposes)
    // Scoreboard Testing Method - can be called from other modules to trigger a broadcast with current data (for testing purposes)
    initializeBroadcasting() {
        console.log('[Scoreboard WebSocket] Broadcasting initialized');
        // Set up periodic check for changes and broadcasts
        if (!this.checkInterval) {
            this.checkInterval = setInterval(() => {
                this.checkAndBroadcast().catch(err => console.error('[Scoreboard WebSocket] Broadcast check error:', err));
            }, this.CHECK_INTERVAL);
        }
        // Initialize cleanup task
        this.startCleanupTask();
        // Initialize key moments broadcasting if NODE_ENV is 'true'
        if (process.env.NODE_ENV === 'true') {
            this.startKeyMomentsBroadcasting();
        }
        console.log('[Scoreboard WebSocket] Broadcasting started (on change or every 1 minute)');
    }
    // END Scoreboard Testing Method
    // Scoreboard Testing Method - Broadcast custom data to all clients
    async broadcastToAllClientsScoreBoard(data) {
        try {
            if (process.env.USE_MOCK_DATA === 'false') {
                return 0; // Only allow manual broadcasts when using mock data to prevent interference with live data
            }
            let clientCount = 0;
            const disconnectedClients = [];
            console.log(`[Scoreboard WS] Broadcasting custom data to all clients (active connections: ${this.activeConnections.size})`);
            for (const client of this.activeConnections) {
                try {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify(data));
                        clientCount++;
                    }
                    else {
                        disconnectedClients.push(client);
                    }
                }
                catch (error) {
                    console.error('[Scoreboard WS] Error sending to client:', error);
                    disconnectedClients.push(client);
                }
            }
            // Clean up disconnected clients
            disconnectedClients.forEach(client => this.activeConnections.delete(client));
            console.log(`[Scoreboard WS] Broadcast sent to ${clientCount} clients`);
            return clientCount;
        }
        catch (error) {
            console.error('[Scoreboard WS] Error in broadcastToAllClients:', error);
            return 0;
        }
    }
    // END Scoreboard Testing Method - Broadcast custom data to all clients
    // Key moments broadcasting methods
    startBroadcasting() {
        if (!this.checkInterval) {
            this.initializeBroadcasting();
        }
    }
    // END Key moments broadcasting methods
    // Key moments broadcasting methods
    stopBroadcasting() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('[Scoreboard WebSocket] Broadcasting stopped');
        }
        // Stop key moments broadcasting
        this.stopKeyMomentsBroadcasting();
    }
    /**
     * Start broadcasting key moments every 20 seconds
     * Only active when NODE_ENV is 'true'
     */
    startKeyMomentsBroadcasting() {
        if (this.keyMomentsInterval)
            return;
        console.log('[Scoreboard WebSocket] Key moments broadcasting started (every 20 seconds)');
        this.keyMomentsInterval = setInterval(async () => {
            try {
                // Only broadcast if there are active connections
                if (this.activeConnections.size === 0) {
                    return;
                }
                // Fetch key moments for all current games
                if (this.currentGames && this.currentGames.length > 0) {
                    for (const game of this.currentGames) {
                        const gameId = game.gameId;
                        if (!gameId)
                            continue;
                        try {
                            // Fetch key moments for this game
                            const keyMomentsData = await this.fetchKeyMomentsForGame(gameId);
                            if (keyMomentsData && keyMomentsData.moments && keyMomentsData.moments.length > 0) {
                                // Broadcast to all connected clients
                                await this.broadcastKeyMomentsToAllClientsScoreBoard(keyMomentsData);
                            }
                        }
                        catch (error) {
                            console.error(`[Scoreboard WebSocket] Error fetching key moments for game ${gameId}:`, error instanceof Error ? error.message : String(error));
                        }
                    }
                }
            }
            catch (error) {
                console.error('[Scoreboard WebSocket] Error in key moments broadcasting:', error instanceof Error ? error.message : String(error));
            }
        }, this.KEY_MOMENTS_BROADCAST_INTERVAL);
    }
    /**
     * Stop broadcasting key moments
     */
    stopKeyMomentsBroadcasting() {
        if (this.keyMomentsInterval) {
            clearInterval(this.keyMomentsInterval);
            this.keyMomentsInterval = null;
            console.log('[Scoreboard WebSocket] Key moments broadcasting stopped');
        }
    }
    /**
     * Fetch key moments for a specific game
     */
    async fetchKeyMomentsForGame(gameId) {
        try {
            // Check cache first (dataCache.get is async)
            const cachedKeyMoments = await dataCache_1.dataCache.get(`keyMoments_${gameId}`);
            if (cachedKeyMoments) {
                return cachedKeyMoments;
            }
            // If not cached, try to import and use keyMomentsService
            try {
                const { keyMomentsService } = await Promise.resolve().then(() => __importStar(require('./keyMoments')));
                const moments = await keyMomentsService.getKeyMomentsForGame(gameId);
                if (moments) {
                    // Cache for 5 minutes (300000 milliseconds)
                    await dataCache_1.dataCache.set(`keyMoments_${gameId}`, { game_id: gameId, moments }, 300000);
                    return { game_id: gameId, moments };
                }
            }
            catch (importError) {
                console.warn(`[Scoreboard WebSocket] Could not import keyMomentsService: ${importError instanceof Error ? importError.message : String(importError)}`);
                return null;
            }
        }
        catch (error) {
            console.error(`[Scoreboard WebSocket] Error fetching key moments for game ${gameId}:`, error instanceof Error ? error.message : String(error));
            return null;
        }
    }
    // Broadcast key moments to all clients
    async sendInitialPBPData(gameId, websocket) {
        try {
            if (websocket.readyState !== ws_1.default.OPEN) {
                return;
            }
            const playbyplayData = await dataCache_1.dataCache.getPlaybyplay(gameId);
            if (playbyplayData) {
                websocket.send(JSON.stringify({
                    [`playbyplay_${gameId}`]: playbyplayData
                }));
            }
            else {
                // Send empty structure if no data available yet
                websocket.send(JSON.stringify({
                    [`playbyplay_${gameId}`]: {
                        game_id: gameId,
                        plays: []
                    }
                }));
            }
        }
        catch (error) {
            console.error(`[PlayByPlay WS] Error sending initial data for game ${gameId}:`, error);
        }
    }
    // END Broadcast key moments to all clients
    // Broadcast play-by-play updates to all clients subscribed to the specific game
    async broadcastPBPToAllClients(data) {
        try {
            let clientCount = 0;
            const disconnectedClients = [];
            // Iterate through all games and their connected clients
            for (const [gameId, connections] of this.activeConnectionsPBP.entries()) {
                for (const client of connections) {
                    try {
                        if (client.readyState === ws_1.default.OPEN) {
                            client.send(JSON.stringify({
                                [`playbyplay_${gameId}`]: data
                            }));
                            clientCount++;
                        }
                        else {
                            disconnectedClients.push({ gameId, client });
                        }
                    }
                    catch (error) {
                        console.error(`[PlayByPlay WS] Error sending to client in game ${gameId}:`, error);
                        disconnectedClients.push({ gameId, client });
                    }
                }
            }
            // Clean up disconnected clients
            disconnectedClients.forEach(({ gameId, client }) => {
                const connections = this.activeConnectionsPBP.get(gameId);
                if (connections) {
                    connections.delete(client);
                }
            });
            console.log(`[PlayByPlay WS] Broadcast sent to ${clientCount} clients`);
            return clientCount;
        }
        catch (error) {
            console.error('[PlayByPlay WS] Error in broadcastToAllClients:', error);
            return 0;
        }
    }
    // END Broadcast play-by-play updates to all clients subscribed to the specific game
    // Broadcast play-by-play updates to all clients subscribed to the specific game with change detection and rate limiting
    async broadcastPBPUpdates(gameId) {
        try {
            const gameConnections = this.activeConnectionsPBP.get(gameId);
            if (!gameConnections || gameConnections.size === 0) {
                return;
            }
            const playbyplayData = await dataCache_1.dataCache.getPlaybyplay(gameId);
            if (!playbyplayData) {
                return;
            }
            const newPlays = playbyplayData.plays || [];
            const oldPlays = this.currentPBP.get(gameId) || [];
            const currentTime = Date.now();
            const lastBroadcast = this.lastFullBroadcastPBP.get(gameId) || 0;
            const timeSinceLastBroadcast = currentTime - lastBroadcast;
            // Check if plays changed or if max broadcast interval has passed
            const playsChanged = this.hasPBPChanged(newPlays, oldPlays);
            const shouldBroadcast = playsChanged || timeSinceLastBroadcast >= this.MAX_BROADCAST_INTERVAL_PBP;
            if (!shouldBroadcast) {
                return; // No changes and broadcast interval not reached
            }
            // Update tracking
            this.currentPBP.set(gameId, newPlays);
            this.lastFullBroadcastPBP.set(gameId, currentTime);
            console.log(`[PlayByPlay WS] Broadcasting ${newPlays.length} plays for game ${gameId} (changed: ${playsChanged}, timeSinceLastBroadcast: ${timeSinceLastBroadcast}ms)`);
            const disconnectedClients = [];
            for (const client of gameConnections) {
                try {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify({
                            [`playbyplay_${gameId}`]: playbyplayData,
                        }));
                    }
                    else {
                        disconnectedClients.push(client);
                    }
                }
                catch (error) {
                    console.error(`[PlayByPlay WS] Error sending to client for game ${gameId}:`, error);
                    disconnectedClients.push(client);
                }
            }
            // Clean up disconnected clients
            disconnectedClients.forEach(client => {
                gameConnections.delete(client);
            });
            if (gameConnections.size === 0) {
                this.activeConnectionsPBP.delete(gameId);
                const interval = this.broadcastIntervalsPBP.get(gameId);
                if (interval) {
                    clearInterval(interval);
                    this.broadcastIntervalsPBP.delete(gameId);
                }
                this.currentPBP.delete(gameId);
                this.lastUpdateTimestampPBP.delete(gameId);
                this.lastFullBroadcastPBP.delete(gameId);
            }
        }
        catch (error) {
            console.error(`[PlayByPlay WS] Error in broadcast for game ${gameId}:`, error);
        }
    }
    // END Broadcast play-by-play updates to all clients subscribed to the specific game with change detection and rate limiting
    // Check if play-by-play data has changed based on action numbers and rate limit updates
    hasPBPChanged(newPlays, oldPlays) {
        const currentTime = Date.now();
        const lastUpdate = this.lastUpdateTimestampPBP.get('playbyplay') || 0;
        // Check if action numbers match (indicates new plays)
        const newActionNumbers = new Set(newPlays.map(p => p.actionNumber));
        const oldActionNumbers = new Set(oldPlays.map(p => p.actionNumber));
        if (newActionNumbers.size !== oldActionNumbers.size) {
            // New plays detected - check rate limit
            if (currentTime - lastUpdate >= this.MIN_UPDATE_INTERVAL_PBP) {
                this.lastUpdateTimestampPBP.set('playbyplay', currentTime);
                return true;
            }
        }
        return false;
    }
    // END Check if play-by-play data has changed based on action numbers and rate limit updates
    // Start broadcasting play-by-play updates for a specific game at regular intervals
    startGameBroadcasting(gameId) {
        if (this.broadcastIntervalsPBP.has(gameId))
            return;
        const broadcast = async () => {
            await this.broadcastPBPUpdates(gameId);
        };
        // Set up periodic check for new plays
        const interval = setInterval(broadcast, this.BROADCAST_INTERVAL_PBP);
        this.broadcastIntervalsPBP.set(gameId, interval);
    }
    // END Start broadcasting play-by-play updates for a specific game at regular intervals
    // Broadcast key moments to all clients
    async broadcastKeyMomentsToAllClientsScoreBoard(data) {
        try {
            let clientCount = 0;
            const disconnectedClients = [];
            console.log(`[Scoreboard WS] Broadcasting key moments to all clients (active connections: ${this.activeConnections.size})`);
            for (const client of this.activeConnections) {
                try {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify({
                            keyMoments: data
                        }));
                        clientCount++;
                    }
                    else {
                        disconnectedClients.push(client);
                    }
                }
                catch (error) {
                    console.error('[Scoreboard WS] Error sending to client:', error);
                    disconnectedClients.push(client);
                }
            }
            // Clean up disconnected clients
            disconnectedClients.forEach(client => this.activeConnections.delete(client));
            console.log(`[Scoreboard WS] Key moments broadcast sent to ${clientCount} clients`);
            return clientCount;
        }
        catch (error) {
            console.error('[Scoreboard WS] Error in broadcastToAllClients:', error);
            return 0;
        }
    }
    // END Broadcast key moments to all clients
    // Start play-by-play broadcasting manager
    startPBPBroadcasting() {
        console.log('[PlayByPlay WS] Broadcasting manager initialized (games start broadcasting on client connection)');
    }
    // END Start play-by-play broadcasting manager
    // Cleanup task to remove dead connections and stale timestamps for play-by-play manager
    startPBPCleanupTask() {
        if (this.cleanupInterval)
            return;
        console.log('[PlayByPlay WS] Cleanup task started');
        const cleanup = () => {
            let deadConnectionsCount = 0;
            const gamesToRemove = [];
            for (const [gameId, connections] of this.activeConnectionsPBP.entries()) {
                const deadConnections = [];
                for (const client of connections) {
                    if (client.readyState !== ws_1.default.OPEN) {
                        deadConnections.push(client);
                    }
                }
                deadConnections.forEach(client => {
                    connections.delete(client);
                    deadConnectionsCount++;
                });
                // Remove game if no more connections
                if (connections.size === 0) {
                    gamesToRemove.push(gameId);
                }
            }
            // Clean up games with no connections
            gamesToRemove.forEach(gameId => {
                this.activeConnectionsPBP.delete(gameId);
                const interval = this.broadcastIntervalsPBP.get(gameId);
                if (interval) {
                    clearInterval(interval);
                    this.broadcastIntervalsPBP.delete(gameId);
                }
                this.currentPBP.delete(gameId);
                this.lastUpdateTimestampPBP.delete(gameId);
                this.lastFullBroadcastPBP.delete(gameId);
            });
            // Clean up stale timestamps
            const currentTime = Date.now();
            const staleKeys = [];
            for (const [key, timestamp] of this.lastUpdateTimestampPBP) {
                if (currentTime - timestamp > this.CLEANUP_THRESHOLD_PBP) {
                    staleKeys.push(key);
                }
            }
            staleKeys.forEach(key => this.lastUpdateTimestampPBP.delete(key));
            if (deadConnectionsCount > 0 || gamesToRemove.length > 0 || staleKeys.length > 0) {
                console.log(`[PlayByPlay WS] Cleanup: removed ${deadConnectionsCount} dead connections, ${gamesToRemove.length} inactive games, ${staleKeys.length} stale timestamps`);
            }
        };
        this.cleanupIntervalPBP = setInterval(cleanup, this.CLEANUP_INTERVAL_PBP);
    }
    // END Cleanup task to remove dead connections and stale timestamps for play-by-play manager
    // Stop cleanup task and broadcasting for play-by-play manager (called when shutting down server)
    stopPBPCleanupTask() {
        if (this.cleanupIntervalPBP) {
            clearInterval(this.cleanupIntervalPBP);
            this.cleanupIntervalPBP = null;
            console.log('[PlayByPlay WS] Cleanup task stopped');
        }
        // Stop all game broadcasting
        for (const [gameId, interval] of this.broadcastIntervalsPBP.entries()) {
            clearInterval(interval);
        }
        this.broadcastIntervalsPBP.clear();
        // Close all connections
        for (const connections of this.activeConnectionsPBP.values()) {
            for (const client of connections) {
                if (client.readyState === ws_1.default.OPEN) {
                    client.close();
                }
            }
        }
        this.activeConnectionsPBP.clear();
        this.currentPBP.clear();
        this.lastUpdateTimestampPBP.clear();
        this.lastFullBroadcastPBP.clear();
        console.log('[PlayByPlay WS] All connections closed');
    }
    // END Stop cleanup task and broadcasting for play-by-play manager (called when shutting down server)
    // Method to get current number of active connections for play-by-play manager (for monitoring purposes)
    getConnectionCountPBP(gameId) {
        if (gameId) {
            return this.activeConnectionsPBP.get(gameId)?.size || 0;
        }
        let total = 0;
        for (const connections of this.activeConnectionsPBP.values()) {
            total += connections.size;
        }
        return total;
    }
    // END Method to get current number of active connections for play-by-play manager (for monitoring purposes)
    // Method to get current number of active games being tracked for play-by-play manager (for monitoring purposes)
    getGameCountPBP() {
        return this.activeConnectionsPBP.size;
    }
}
exports.ScoreboardWebSocketManager = ScoreboardWebSocketManager;
/*export class PlaybyplayWebSocketManager {
  private activeConnections: Map<string, Set<WebSocket>> = new Map();
  private broadcastIntervals: Map<string, NodeJS.Timeout> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private currentPlaybyplay: Map<string, any[]> = new Map();
  private lastUpdateTimestamp: Map<string, number> = new Map();
  private lastFullBroadcast: Map<string, number> = new Map();
  private readonly BROADCAST_INTERVAL = 30000; // 30 seconds - check for new plays frequently
  private readonly MAX_BROADCAST_INTERVAL = 120000; // 2 minutes (120 seconds) - maximum time between broadcasts
  private readonly CLEANUP_INTERVAL = 600000; // 10 minutes - clean up stale data
  private readonly MIN_UPDATE_INTERVAL = 2000; // Minimum 2 seconds between updates per game
  private readonly CLEANUP_THRESHOLD = 3600000; // 1 hour - remove stale timestamps older than this

  connect(gameId: string, websocket: WebSocket): void {
    if (!this.activeConnections.has(gameId)) {
      this.activeConnections.set(gameId, new Set());
      console.log(`[PlayByPlay WS] New game tracked: ${gameId}`);
      this.startGameBroadcasting(gameId);
    }

    const gameConnections = this.activeConnections.get(gameId)!;
    gameConnections.add(websocket);
    console.log(`[PlayByPlay WS] New client for game ${gameId} (total: ${gameConnections.size})`);

    // Send initial data to new client
    this.sendInitialData(gameId, websocket);

    // Handle client disconnect
    websocket.on('close', () => {
      this.disconnect(gameId, websocket);
    });

    websocket.on('error', (error) => {
      console.error(`[PlayByPlay WS] Client error for game ${gameId}:`, error);
      this.disconnect(gameId, websocket);
    });

    websocket.on('message', (data: WebSocket.Data) => {
      try {
        const message = typeof data === 'string' ? data : data.toString();
        console.log(`[PlayByPlay WS] Message received for game ${gameId}: ${message}`);
      } catch (error) {
        console.error(`[PlayByPlay WS] Error logging message for game ${gameId}:`, error);
      }
    });
  }

  private async sendInitialData(gameId: string, websocket: WebSocket): Promise<void> {
    try {
      if (websocket.readyState !== WebSocket.OPEN) {
        return;
      }

      const playbyplayData = await dataCache.getPlaybyplay(gameId);

      if (playbyplayData) {
        // Send the full play-by-play data
        websocket.send(JSON.stringify(playbyplayData));
      } else {
        // Send empty structure if no data available yet
        websocket.send(JSON.stringify({
          game_id: gameId,
          plays: []
        }));
      }
    } catch (error) {
      console.error(`[PlayByPlay WS] Error sending initial data for game ${gameId}:`, error);
    }
  }

  disconnect(gameId: string, websocket: WebSocket): void {
    const gameConnections = this.activeConnections.get(gameId);
    if (gameConnections) {
      gameConnections.delete(websocket);
      console.log(`[PlayByPlay WS] Client disconnected from game ${gameId} (remaining: ${gameConnections.size})`);

      // Remove game if no more connections
      if (gameConnections.size === 0) {
        this.activeConnections.delete(gameId);
        const interval = this.broadcastIntervals.get(gameId);
        if (interval) {
          clearInterval(interval);
          this.broadcastIntervals.delete(gameId);
          console.log(`[PlayByPlay WS] Stopped broadcasting for game ${gameId}`);
        }
        // Clean up data for this game
        this.currentPlaybyplay.delete(gameId);
        this.lastUpdateTimestamp.delete(gameId);
      }
    }
  }

  handleConnection(websocket: WebSocket, gameId: string): void {
    this.connect(gameId, websocket);
  }

  private hasPlaybyplayChanged(newPlays: any[], oldPlays: any[]): boolean {
    const currentTime = Date.now();
    const lastUpdate = this.lastUpdateTimestamp.get('playbyplay') || 0;

    // Check if action numbers match (indicates new plays)
    const newActionNumbers = new Set(newPlays.map(p => p.actionNumber));
    const oldActionNumbers = new Set(oldPlays.map(p => p.actionNumber));

    if (newActionNumbers.size !== oldActionNumbers.size) {
      // New plays detected - check rate limit
      if (currentTime - lastUpdate >= this.MIN_UPDATE_INTERVAL) {
        this.lastUpdateTimestamp.set('playbyplay', currentTime);
        return true;
      }
    }

    return false;
  }

  private async broadcastPlaybyplayUpdates(gameId: string): Promise<void> {
    try {
      const gameConnections = this.activeConnections.get(gameId);
      if (!gameConnections || gameConnections.size === 0) {
        return;
      }

      const playbyplayData = await dataCache.getPlaybyplay(gameId);

      if (!playbyplayData) {
        return;
      }

      const newPlays = playbyplayData.plays || [];
      const oldPlays = this.currentPlaybyplay.get(gameId) || [];
      const currentTime = Date.now();
      const lastBroadcast = this.lastFullBroadcast.get(gameId) || 0;
      const timeSinceLastBroadcast = currentTime - lastBroadcast;

      // Check if plays changed or if max broadcast interval has passed
      const playsChanged = this.hasPlaybyplayChanged(newPlays, oldPlays);
      const shouldBroadcast = playsChanged || timeSinceLastBroadcast >= this.MAX_BROADCAST_INTERVAL;

      if (!shouldBroadcast) {
        return; // No changes and broadcast interval not reached
      }

      // Update tracking
      this.currentPlaybyplay.set(gameId, newPlays);
      this.lastFullBroadcast.set(gameId, currentTime);

      console.log(`[PlayByPlay WS] Broadcasting ${newPlays.length} plays for game ${gameId} (changed: ${playsChanged}, timeSinceLastBroadcast: ${timeSinceLastBroadcast}ms)`);

      const disconnectedClients: WebSocket[] = [];

      for (const client of gameConnections) {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(playbyplayData));
          } else {
            disconnectedClients.push(client);
          }
        } catch (error) {
          console.error(`[PlayByPlay WS] Error sending to client for game ${gameId}:`, error);
          disconnectedClients.push(client);
        }
      }

      // Clean up disconnected clients
      disconnectedClients.forEach(client => {
        gameConnections.delete(client);
      });

      if (gameConnections.size === 0) {
        this.activeConnections.delete(gameId);
        const interval = this.broadcastIntervals.get(gameId);
        if (interval) {
          clearInterval(interval);
          this.broadcastIntervals.delete(gameId);
        }
        this.currentPlaybyplay.delete(gameId);
        this.lastUpdateTimestamp.delete(gameId);
        this.lastFullBroadcast.delete(gameId);
      }
    } catch (error) {
      console.error(`[PlayByPlay WS] Error in broadcast for game ${gameId}:`, error);
    }
  }

  private startGameBroadcasting(gameId: string): void {
    if (this.broadcastIntervals.has(gameId)) return;

    const broadcast = async () => {
      await this.broadcastPlaybyplayUpdates(gameId);
    };

    // Set up periodic check for new plays
    const interval = setInterval(broadcast, this.BROADCAST_INTERVAL);
    this.broadcastIntervals.set(gameId, interval);
  }

  startBroadcasting(): void {
    console.log('[PlayByPlay WS] Broadcasting manager initialized (games start broadcasting on client connection)');
  }

  startCleanupTask(): void {
    if (this.cleanupInterval) return;

    console.log('[PlayByPlay WS] Cleanup task started');

    const cleanup = () => {
      let deadConnectionsCount = 0;
      const gamesToRemove: string[] = [];

      for (const [gameId, connections] of this.activeConnections.entries()) {
        const deadConnections: WebSocket[] = [];

        for (const client of connections) {
          if (client.readyState !== WebSocket.OPEN) {
            deadConnections.push(client);
          }
        }

        deadConnections.forEach(client => {
          connections.delete(client);
          deadConnectionsCount++;
        });

        // Remove game if no more connections
        if (connections.size === 0) {
          gamesToRemove.push(gameId);
        }
      }

      // Clean up games with no connections
      gamesToRemove.forEach(gameId => {
        this.activeConnections.delete(gameId);
        const interval = this.broadcastIntervals.get(gameId);
        if (interval) {
          clearInterval(interval);
          this.broadcastIntervals.delete(gameId);
        }
        this.currentPlaybyplay.delete(gameId);
        this.lastUpdateTimestamp.delete(gameId);
        this.lastFullBroadcast.delete(gameId);
      });

      // Clean up stale timestamps
      const currentTime = Date.now();
      const staleKeys: string[] = [];

      for (const [key, timestamp] of this.lastUpdateTimestamp) {
        if (currentTime - timestamp > this.CLEANUP_THRESHOLD) {
          staleKeys.push(key);
        }
      }

      staleKeys.forEach(key => this.lastUpdateTimestamp.delete(key));

      if (deadConnectionsCount > 0 || gamesToRemove.length > 0 || staleKeys.length > 0) {
        console.log(`[PlayByPlay WS] Cleanup: removed ${deadConnectionsCount} dead connections, ${gamesToRemove.length} inactive games, ${staleKeys.length} stale timestamps`);
      }
    };

    this.cleanupInterval = setInterval(cleanup, this.CLEANUP_INTERVAL);
  }

  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[PlayByPlay WS] Cleanup task stopped');
    }

    // Stop all game broadcasting
    for (const [gameId, interval] of this.broadcastIntervals.entries()) {
      clearInterval(interval);
    }
    this.broadcastIntervals.clear();

    // Close all connections
    for (const connections of this.activeConnections.values()) {
      for (const client of connections) {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }
    this.activeConnections.clear();
    this.currentPlaybyplay.clear();
    this.lastUpdateTimestamp.clear();
    this.lastFullBroadcast.clear();

    console.log('[PlayByPlay WS] All connections closed');
  }

  getConnectionCount(gameId?: string): number {
    if (gameId) {
      return this.activeConnections.get(gameId)?.size || 0;
    }
    let total = 0;
    for (const connections of this.activeConnections.values()) {
      total += connections.size;
    }
    return total;
  }

  getGameCount(): number {
    return this.activeConnections.size;
  }


  async broadcastToAllClients(data: any): Promise<number> {
    try {
      let clientCount = 0;
      const disconnectedClients: Array<{ gameId: string, client: WebSocket }> = [];

      // Iterate through all games and their connected clients
      for (const [gameId, connections] of this.activeConnections.entries()) {
        for (const client of connections) {
          try {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(data));
              clientCount++;
            } else {
              disconnectedClients.push({ gameId, client });
            }
          } catch (error) {
            console.error(`[PlayByPlay WS] Error sending to client in game ${gameId}:`, error);
            disconnectedClients.push({ gameId, client });
          }
        }
      }

      // Clean up disconnected clients
      disconnectedClients.forEach(({ gameId, client }) => {
        const connections = this.activeConnections.get(gameId);
        if (connections) {
          connections.delete(client);
        }
      });

      console.log(`[PlayByPlay WS] Broadcast sent to ${clientCount} clients`);
      return clientCount;
    } catch (error) {
      console.error('[PlayByPlay WS] Error in broadcastToAllClients:', error);
      return 0;
    }
  }
}
*/
exports.webSocketManager = new ScoreboardWebSocketManager();
//export const playbyplayWebSocketManager = new PlaybyplayWebSocketManager();
//# sourceMappingURL=websocketManager.js.map