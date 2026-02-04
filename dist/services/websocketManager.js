"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbyplayWebSocketManager = exports.scoreboardWebSocketManager = exports.PlaybyplayWebSocketManager = exports.ScoreboardWebSocketManager = void 0;
const ws_1 = __importDefault(require("ws"));
const dataCache_1 = require("./dataCache");
const schedule_1 = require("./schedule");
class ScoreboardWebSocketManager {
    constructor() {
        this.activeConnections = new Set();
        this.broadcastInterval = null;
        this.cleanupInterval = null;
        this.currentGames = [];
        this.lastUpdateTimestamp = new Map();
        this.lastWinProbUpdate = 0;
        this.BROADCAST_INTERVAL = 2000; // 2 seconds - check for changes frequently
        this.CLEANUP_INTERVAL = 600000; // 10 minutes - clean up stale timestamps
        this.MIN_UPDATE_INTERVAL = 5000; // Minimum 5 seconds between updates per game
        this.CLEANUP_THRESHOLD = 3600000; // 1 hour - remove stale timestamps older than this
    }
    connect(websocket) {
        this.activeConnections.add(websocket);
        console.log(`[Scoreboard WS] New client connected (total: ${this.activeConnections.size})`);
        // Send initial data to new client (don't await, fire and forget)
        this.sendInitialData(websocket).catch(err => {
            console.error('[Scoreboard WS] Error in sendInitialData:', err);
        });
        // Handle client disconnect
        websocket.on('close', () => {
            this.disconnect(websocket);
        });
        websocket.on('error', (error) => {
            console.error('[Scoreboard WS] Client error:', error);
            this.disconnect(websocket);
        });
    }
    async sendInitialData(websocket) {
        try {
            if (websocket.readyState !== ws_1.default.OPEN) {
                console.log('[Scoreboard WS] WebSocket not in OPEN state, skipping initial data');
                return;
            }
            console.log('[Scoreboard WS] Fetching scoreboard data for initial send');
            const scoreboardData = await dataCache_1.dataCache.getScoreboard();
            if (scoreboardData) {
                // Filter for live games first (gameStatus === 2)
                const allGames = scoreboardData.scoreboard?.games || [];
                const liveGames = allGames.filter((g) => g.gameStatus === 2);
                console.log(`\n=========================================================`);
                console.log(`[Scoreboard WS] Total games available: ${allGames.length}`);
                console.log(`=========================================================\n`);
                // If no live games, use upcoming games (gameStatus === 1)
                let gamesToSend = liveGames.length > 0 ? liveGames : allGames.filter((g) => {
                    console.log(`\n=========================================================`);
                    console.log(`[Scoreboard WS] ${g.gameId} status: ${g.gameStatus}`);
                    console.log(`=========================================================\n`);
                    return g.gameStatus === 1;
                });
                console.log(`[Scoreboard WS] Preparing to send initial data: ${gamesToSend.length} games (${liveGames.length > 0 ? 'live' : 'upcoming'})`);
                // Format games to match response schema
                const formattedGames = this.formatGameResponse(gamesToSend) || [];
                // Send the filtered scoreboard data
                const responseData = formattedGames.length === 0 ?
                    {
                        scoreboard: await schedule_1.scheduleService.getTodaysSchedule() || { gameDate: '', games: [] }
                    }
                    :
                        {
                            scoreboard: {
                                gameDate: scoreboardData.scoreboard?.gameDate || '',
                                games: formattedGames
                            }
                        };
                console.log(`[Scoreboard WS] Sending initial data: ${formattedGames.length} games`);
                websocket.send(JSON.stringify(responseData));
                console.log('[Scoreboard WS] ✅ Initial data sent successfully');
            }
            else {
                console.log('[Scoreboard WS] No scoreboard data available, sending empty response');
                // Send empty structure if no data available yet
                websocket.send(JSON.stringify({
                    scoreboard: {
                        gameDate: '',
                        games: []
                    }
                }));
            }
        }
        catch (error) {
            console.error('[Scoreboard WS] ❌ Error in sendInitialData:', error);
            throw error;
        }
    }
    disconnect(websocket) {
        this.activeConnections.delete(websocket);
        console.log(`[Scoreboard WS] Client disconnected (remaining: ${this.activeConnections.size})`);
        // Clear timestamps if no more connections
        if (this.activeConnections.size === 0) {
            this.lastUpdateTimestamp.clear();
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
                return true;
            }
            const oldGame = oldMap.get(gameId);
            const lastUpdate = this.lastUpdateTimestamp.get(gameId) || 0;
            // Check if scores, status, or period changed
            const homeScoreChanged = newGame.homeTeam?.score !== oldGame.homeTeam?.score;
            const awayScoreChanged = newGame.awayTeam?.score !== oldGame.awayTeam?.score;
            const statusChanged = newGame.gameStatus !== oldGame.gameStatus;
            const periodChanged = newGame.period !== oldGame.period;
            if (homeScoreChanged || awayScoreChanged || statusChanged || periodChanged) {
                // Only update if minimum interval has passed
                if (currentTime - lastUpdate >= this.MIN_UPDATE_INTERVAL) {
                    this.lastUpdateTimestamp.set(gameId, currentTime);
                    return true;
                }
            }
        }
        return false;
    }
    async broadcastUpdates() {
        if (this.activeConnections.size === 0)
            return;
        try {
            const scoreboardData = await dataCache_1.dataCache.getScoreboard();
            if (!scoreboardData)
                return;
            const allGames = scoreboardData.scoreboard?.games || [];
            // Filter for live games first (gameStatus === 2)
            const liveGames = allGames.filter((g) => g.gameStatus === 2);
            // If no live games, use upcoming games (gameStatus === 1)
            const gamesToSend = liveGames.length > 0 ? liveGames : allGames.filter((g) => g.gameStatus === 1);
            // Check if games have changed
            if (!this.hasGameDataChanged(gamesToSend, this.currentGames)) {
                return;
            }
            this.currentGames = gamesToSend;
            console.log(`[Scoreboard WS] Broadcasting updates for ${gamesToSend.length} games (${liveGames.length > 0 ? 'live' : 'upcoming'})`);
            // Format games to match response schema
            const formattedGames = this.formatGameResponse(gamesToSend);
            const broadcastData = {
                scoreboard: {
                    gameDate: scoreboardData.scoreboard?.gameDate || '',
                    games: formattedGames
                }
            };
            const disconnectedClients = [];
            for (const client of this.activeConnections) {
                try {
                    if (client.readyState === ws_1.default.OPEN) {
                        client.send(JSON.stringify(broadcastData));
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
        }
        catch (error) {
            console.error('[Scoreboard WS] Error in broadcast:', error);
        }
    }
    startBroadcasting() {
        if (this.broadcastInterval)
            return;
        console.log('[Scoreboard WS] Broadcasting started');
        const broadcast = async () => {
            await this.broadcastUpdates();
        };
        // Set up periodic check for changes
        this.broadcastInterval = setInterval(broadcast, this.BROADCAST_INTERVAL);
    }
    startCleanupTask() {
        if (this.cleanupInterval)
            return;
        console.log('[Scoreboard WS] Cleanup task started');
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
                console.log(`[Scoreboard WS] Cleanup: removed ${deadConnections.length} dead connections, ${staleKeys.length} stale timestamps`);
            }
        };
        this.cleanupInterval = setInterval(cleanup, this.CLEANUP_INTERVAL);
    }
    stopCleanupTask() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('[Scoreboard WS] Cleanup task stopped');
        }
        if (this.broadcastInterval) {
            clearInterval(this.broadcastInterval);
            this.broadcastInterval = null;
            console.log('[Scoreboard WS] Broadcasting stopped');
        }
    }
    getConnectionCount() {
        return this.activeConnections.size;
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
        this.BROADCAST_INTERVAL = 2000; // 2 seconds - check for new plays frequently
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
            // Check if plays have changed
            if (!this.hasPlaybyplayChanged(newPlays, oldPlays)) {
                return;
            }
            this.currentPlaybyplay.set(gameId, newPlays);
            console.log(`[PlayByPlay WS] Broadcasting ${newPlays.length} plays for game ${gameId}`);
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
    async sendAllPlaybyplayData(websocket) {
        try {
            if (websocket.readyState !== ws_1.default.OPEN) {
                return;
            }
            const allPlaybyplay = [];
            const allGames = Array.from(this.activeConnections.keys());
            for (const gameId of allGames) {
                try {
                    const playbyplayData = await dataCache_1.dataCache.getPlaybyplay(gameId);
                    if (playbyplayData && playbyplayData.plays) {
                        allPlaybyplay.push({
                            gameId,
                            plays: playbyplayData.plays
                        });
                    }
                }
                catch (error) {
                    console.error(`[PlayByPlay WS] Error fetching data for game ${gameId}:`, error);
                }
            }
            // Send all playbyplay data as a single message
            websocket.send(JSON.stringify({
                allPlaybyplay,
                gameCount: allGames.length,
                timestamp: new Date().toISOString()
            }));
            console.log(`[PlayByPlay WS] Sent playbyplay data for ${allGames.length} games to client`);
        }
        catch (error) {
            console.error('[PlayByPlay WS] Error sending all playbyplay data:', error);
        }
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