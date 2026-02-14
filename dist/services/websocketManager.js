"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbyplayWebSocketManager = exports.scoreboardWebSocketManager = exports.PlaybyplayWebSocketManager = exports.ScoreboardWebSocketManager = void 0;
const ws_1 = __importDefault(require("ws"));
const dataCache_1 = require("./dataCache");
const expoNotificationSystem_1 = __importDefault(require("./expoNotificationSystem"));
class ScoreboardWebSocketManager {
    constructor() {
        this.activeConnections = new Set();
        this.checkInterval = null;
        this.cleanupInterval = null;
        this.currentGames = [];
        this.lastUpdateTimestamp = new Map();
        this.lastFullBroadcast = 0;
        this.initialized = false;
        this.CHECK_INTERVAL = 2000; // 2 seconds - check for changes frequently
        this.PERIODIC_BROADCAST_INTERVAL = 60000; // 1 minute - send data periodically to all clients
        this.CLEANUP_INTERVAL = 600000; // 10 minutes - clean up stale timestamps
        this.MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates per game
        this.CLEANUP_THRESHOLD = 3600000; // 1 hour - remove stale timestamps older than this
        if (!this.initialized) {
            this.initialized = true;
            // Defer broadcast task start to allow modules to fully load
            setImmediate(() => this.initializeBroadcasting());
        }
    }
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
                    this.activeConnections.add(websocket);
                    console.log(`[Scoreboard WebSocket] New client connected. Active connections: ${this.activeConnections.size}`);
                    // Send initial data
                    this.sendInitialData(websocket);
                }
            }
            catch (error) {
                console.error('[Scoreboard WebSocket] Error logging message:', error);
            }
        });
    }
    disconnect(websocket) {
        this.activeConnections.delete(websocket);
        console.log(`[Scoreboard WebSocket] Client disconnected (remaining: ${this.activeConnections.size})`);
        // Clear timestamps if no more connections
        if (this.activeConnections.size === 0) {
            this.lastUpdateTimestamp.clear();
        }
    }
    async sendInitialData(websocket) {
        try {
            if (!this.activeConnections.has(websocket)) {
                console.warn('[Scoreboard WebSocket] Websocket not in active connections, skipping initial send');
                return;
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
    async sendNotificationOngameStatusChange(game, eventType) {
        const gameId = game.gameId || 'unknown';
        const awayTeam = game.awayTeam?.teamName || 'Away Team';
        const homeTeam = game.homeTeam?.teamName || 'Home Team';
        const score = `${game.awayTeam?.score || 0}-${game.homeTeam?.score || 0}`;
        const notificationStatus = await expoNotificationSystem_1.default.sendGameUpdateNotification(gameId, awayTeam, homeTeam, score, eventType);
        if (notificationStatus !== 0) {
            console.log(`[Scoreboard WebSocket] Notification sent for game ${gameId} - Status: ${notificationStatus}`);
        }
        else {
            console.warn(`[Scoreboard WebSocket] Failed to send notification for game ${gameId}`);
        }
    }
    async sendNotificationOnGameIDChange(game) {
        const gameId = game.gameId || 'unknown';
        const awayTeam = game.awayTeam?.teamName || 'Away Team';
        const homeTeam = game.homeTeam?.teamName || 'Home Team';
        const score = `${game.awayTeam?.score || 0}-${game.homeTeam?.score || 0}`;
        const percentage = "null"; // Placeholder for confidence percentage if available
        const notificationStatus = await expoNotificationSystem_1.default.sendGameUpdateNotification(gameId, awayTeam, homeTeam, score, 'new_prediction', percentage);
        if (notificationStatus !== 0) {
            console.log(`[Scoreboard WebSocket] New game notification sent for game ${gameId} - Status: ${notificationStatus}`);
        }
        else {
            console.warn(`[Scoreboard WebSocket] Failed to send new game notification for game ${gameId}`);
        }
    }
    handleConnection(websocket) {
        this.connect(websocket);
    }
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
                timeoutsRemaining: game.homeTeam?.timeoutsRemaining || 0
            },
            away_Team: {
                teamId: game.awayTeam?.teamId,
                teamName: game.awayTeam?.teamName || '',
                teamCity: game.awayTeam?.teamCity || '',
                teamTricode: game.awayTeam?.teamTricode || '',
                wins: game.awayTeam?.wins || 0,
                losses: game.awayTeam?.losses || 0,
                score: game.awayTeam?.score || 0,
                timeoutsRemaining: game.awayTeam?.timeoutsRemaining || 0
            },
            gameLeaders: game.gameLeaders || null
        }));
    }
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
    startCleanupTask() {
        if (this.cleanupInterval)
            return;
        console.log('[Scoreboard WebSocket] Cleanup task started');
        const cleanup = () => {
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
            if (deadConnections.length > 0 || staleKeys.length > 0) {
                console.log(`[Scoreboard WebSocket] Cleanup: removed ${deadConnections.length} dead connections, ${staleKeys.length} stale timestamps`);
            }
        };
        this.cleanupInterval = setInterval(cleanup, this.CLEANUP_INTERVAL);
    }
    stopCleanupTask() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('[Scoreboard WebSocket] Cleanup task stopped');
        }
        this.stopBroadcasting();
    }
    getConnectionCount() {
        return this.activeConnections.size;
    }
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
        console.log('[Scoreboard WebSocket] Broadcasting started (on change or every 1 minute)');
    }
    startBroadcasting() {
        if (!this.checkInterval) {
            this.initializeBroadcasting();
        }
    }
    stopBroadcasting() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('[Scoreboard WebSocket] Broadcasting stopped');
        }
    }
}
exports.ScoreboardWebSocketManager = ScoreboardWebSocketManager;
class PlaybyplayWebSocketManager {
    constructor() {
        this.activeConnections = new Map();
        this.broadcastIntervals = new Map();
        this.cleanupInterval = null;
        this.currentPlaybyplay = new Map();
        this.lastUpdateTimestamp = new Map();
        this.lastFullBroadcast = new Map();
        this.BROADCAST_INTERVAL = 30000; // 30 seconds - check for new plays frequently
        this.MAX_BROADCAST_INTERVAL = 120000; // 2 minutes (120 seconds) - maximum time between broadcasts
        this.CLEANUP_INTERVAL = 600000; // 10 minutes - clean up stale data
        this.MIN_UPDATE_INTERVAL = 2000; // Minimum 2 seconds between updates per game
        this.CLEANUP_THRESHOLD = 3600000; // 1 hour - remove stale timestamps older than this
    }
    connect(gameId, websocket) {
        if (!this.activeConnections.has(gameId)) {
            this.activeConnections.set(gameId, new Set());
            console.log(`[PlayByPlay WS] New game tracked: ${gameId}`);
            this.startGameBroadcasting(gameId);
        }
        const gameConnections = this.activeConnections.get(gameId);
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
        websocket.on('message', (data) => {
            try {
                const message = typeof data === 'string' ? data : data.toString();
                console.log(`[PlayByPlay WS] Message received for game ${gameId}: ${message}`);
            }
            catch (error) {
                console.error(`[PlayByPlay WS] Error logging message for game ${gameId}:`, error);
            }
        });
    }
    async sendInitialData(gameId, websocket) {
        try {
            if (websocket.readyState !== ws_1.default.OPEN) {
                return;
            }
            const playbyplayData = await dataCache_1.dataCache.getPlaybyplay(gameId);
            if (playbyplayData) {
                // Send the full play-by-play data
                websocket.send(JSON.stringify(playbyplayData));
            }
            else {
                // Send empty structure if no data available yet
                websocket.send(JSON.stringify({
                    game_id: gameId,
                    plays: []
                }));
            }
        }
        catch (error) {
            console.error(`[PlayByPlay WS] Error sending initial data for game ${gameId}:`, error);
        }
    }
    disconnect(gameId, websocket) {
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
    handleConnection(websocket, gameId) {
        this.connect(gameId, websocket);
    }
    hasPlaybyplayChanged(newPlays, oldPlays) {
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
    async broadcastPlaybyplayUpdates(gameId) {
        try {
            const gameConnections = this.activeConnections.get(gameId);
            if (!gameConnections || gameConnections.size === 0) {
                return;
            }
            const playbyplayData = await dataCache_1.dataCache.getPlaybyplay(gameId);
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
            const disconnectedClients = [];
            for (const client of gameConnections) {
                try {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify(playbyplayData));
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
        }
        catch (error) {
            console.error(`[PlayByPlay WS] Error in broadcast for game ${gameId}:`, error);
        }
    }
    startGameBroadcasting(gameId) {
        if (this.broadcastIntervals.has(gameId))
            return;
        const broadcast = async () => {
            await this.broadcastPlaybyplayUpdates(gameId);
        };
        // Set up periodic check for new plays
        const interval = setInterval(broadcast, this.BROADCAST_INTERVAL);
        this.broadcastIntervals.set(gameId, interval);
    }
    startBroadcasting() {
        console.log('[PlayByPlay WS] Broadcasting manager initialized (games start broadcasting on client connection)');
    }
    startCleanupTask() {
        if (this.cleanupInterval)
            return;
        console.log('[PlayByPlay WS] Cleanup task started');
        const cleanup = () => {
            let deadConnectionsCount = 0;
            const gamesToRemove = [];
            for (const [gameId, connections] of this.activeConnections.entries()) {
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
            const staleKeys = [];
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
    stopCleanupTask() {
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
                if (client.readyState === ws_1.default.OPEN) {
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
    getConnectionCount(gameId) {
        if (gameId) {
            return this.activeConnections.get(gameId)?.size || 0;
        }
        let total = 0;
        for (const connections of this.activeConnections.values()) {
            total += connections.size;
        }
        return total;
    }
    getGameCount() {
        return this.activeConnections.size;
    }
    async broadcastToAllClients(data) {
        try {
            let clientCount = 0;
            const disconnectedClients = [];
            // Iterate through all games and their connected clients
            for (const [gameId, connections] of this.activeConnections.entries()) {
                for (const client of connections) {
                    try {
                        if (client.readyState === ws_1.default.OPEN) {
                            client.send(JSON.stringify(data));
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
                const connections = this.activeConnections.get(gameId);
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
}
exports.PlaybyplayWebSocketManager = PlaybyplayWebSocketManager;
exports.scoreboardWebSocketManager = new ScoreboardWebSocketManager();
exports.playbyplayWebSocketManager = new PlaybyplayWebSocketManager();
//# sourceMappingURL=websocketManager.js.map