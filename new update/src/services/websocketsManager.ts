/**
 * WebSocket managers for broadcasting cached NBA data to clients.
 *
 * These classes manage WebSocket connections and send cached data to clients.
 * They do not make NBA API calls - all data comes from the data_cache service.
 */

import * as WebSocket from 'ws';
import { dataCache } from './dataCache';
import { generateBatchedInsights } from './batchedInsights';
import { processLiveGames, getKeyMomentsForGame } from './keyMoments';
import { getWinProbabilityForMultipleGames } from './winProbability';
import axios, { Axios } from 'axios';

export class ScoreboardWebSocketManager {
    private activeConnections = new Set<WebSocket>();
    private currentGames: any[] = [];
    private lastUpdateTimestamp: Map<string, number> = new Map();
    private lastWinProbUpdate = 0;
    private cleanupTimer: NodeJS.Timeout | null = null;
    private broadcastTimer: NodeJS.Timeout | null = null;
    private scoreChangeCallbacks: ((games: any[]) => void)[] = [];
    private initialized = false;
    private isTestEnvironment = false;

    constructor(isTestEnvironment: boolean = false) {
        this.isTestEnvironment = isTestEnvironment;
        // Register callback with dataCache for immediate score change broadcasts
        if (!this.initialized) {
            if (!this.isTestEnvironment) {
                dataCache.onScoreChange(async () => {
                    await this.broadcastUpdates();
                });
            }
            this.initialized = true;
            // Start periodic broadcast task
            this.startBroadcastTask();
        }
    }

    connect(websocket: WebSocket): void {
        websocket.on('error', (error: any) => {
            const errorMsg = error?.message || String(error);
            const errorCode = error?.code || 'UNKNOWN';
            console.error(`[Scoreboard WebSocket] Client error [${errorCode}]: ${errorMsg}`);
            this.activeConnections.delete(websocket);
        });

        websocket.on('close', (code, reason) => {
            this.activeConnections.delete(websocket);
            if (this.activeConnections.size === 0) {
                this.lastUpdateTimestamp.clear();
            }
            if (code !== 1000) {
                console.warn(`[Scoreboard WebSocket] Client closed with code ${code}: ${reason || 'no reason'}. Active: ${this.activeConnections.size}`);
            } else {
                console.log(`[Scoreboard WebSocket] Client disconnected gracefully. Active connections: ${this.activeConnections.size}`);
            }
        });

        this.activeConnections.add(websocket);
       console.log(`[Scoreboard WebSocket] New client connected. Active connections: ${this.activeConnections.size}`);

        // Send initial data
        this.sendInitialScoreboard(websocket);
    }

    private periodicCleanup(): void {
       console.log('Scoreboard WebSocket cleanup task started');

        const cleanup = () => {
            try {
                const currentTime = Date.now();
                const staleThreshold = 60 * 60 * 1000; // 1 hour

                const staleKeys: string[] = [];
                for (const [gameId, timestamp] of this.lastUpdateTimestamp.entries()) {
                    if (currentTime - timestamp > staleThreshold) {
                        staleKeys.push(gameId);
                    }
                }

                staleKeys.forEach(key => this.lastUpdateTimestamp.delete(key));

                if (staleKeys.length > 0) {
                   console.log(`Cleaned up ${staleKeys.length} stale timestamps from scoreboard WebSocket manager`);
                }

            } catch (error) {
               console.log('Error in scoreboard WebSocket cleanup:', error);
            }
        };

        this.cleanupTimer = setInterval(cleanup, 10 * 60 * 1000); // 10 minutes
    }

    startCleanupTask(): void {
        if (!this.cleanupTimer) {
            this.periodicCleanup();
           console.log('Started scoreboard WebSocket cleanup task');
        }
    }

    stopCleanupTask(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
           console.log('Stopped scoreboard WebSocket cleanup task');
        }
    }

    private periodicBroadcast(): void {
       console.log('Scoreboard WebSocket periodic broadcast task started');

        const broadcast = async () => {
            try {
                await this.periodicBroadcastUpdates();
            } catch (error) {
               console.log('Error in periodic scoreboard broadcast:', error);
            }
        };

        // Run broadcast immediately, then set interval
        broadcast().catch(err =>console.log('Initial broadcast failed:', err));
        this.broadcastTimer = setInterval(() => broadcast().catch(err =>console.log('Interval broadcast failed:', err)), 5 * 60 * 1000); // 5 minutes
       console.log('Scoreboard WebSocket periodic broadcast task initialized');
    }

    startBroadcastTask(): void {
        if (!this.broadcastTimer) {
            this.periodicBroadcast();
           console.log('Started scoreboard WebSocket periodic broadcast task');
        } else {
           console.log('Scoreboard broadcast task is already running');
        }
    }

    stopBroadcastTask(): void {
        if (this.broadcastTimer) {
            clearInterval(this.broadcastTimer);
            this.broadcastTimer = null;
           console.log('Stopped scoreboard WebSocket periodic broadcast task');
        }
    }

    private async sendInitialScoreboard(websocket: WebSocket): Promise<void> {
        try {
            if (!this.activeConnections.has(websocket)) {
                console.warn('[Scoreboard WebSocket] Websocket not in active connections, skipping initial send');
                return;
            }

            const scoreboardData = await dataCache.getScoreboard();

            if (scoreboardData && scoreboardData.scoreboard && scoreboardData.scoreboard.games && scoreboardData.scoreboard.games.length > 0) {
                const message = JSON.stringify({ scoreboard: scoreboardData.scoreboard });
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send(message);
                    console.log(`[Scoreboard WebSocket] Sent initial data: ${scoreboardData.scoreboard.games.length} games`);
                } else {
                    console.warn(`[Scoreboard WebSocket] Cannot send - websocket not open (readyState: ${websocket.readyState})`);
                }
            } else {
                const emptyMessage = JSON.stringify({
                    scoreboard: {
                        gameDate: new Date().toISOString().split('T')[0],
                        games: []
                    }
                });
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send(emptyMessage);
                    console.log('[Scoreboard WebSocket] Sent empty initial data (no games available)');
                }
            }
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            console.error(`[Scoreboard WebSocket] Error sending initial data: ${errorMsg}`);
            this.activeConnections.delete(websocket);
        }
    }

    private hasGameDataChanged(newData: any[], oldData: any[]): boolean {
        const newMap = new Map(newData.map(game => [game.gameId, game]));
        const oldMap = new Map(oldData.map(game => [game.gameId, game]));

        // Check for score changes
        for (const [gameId, newGame] of newMap.entries()) {
            if (!oldMap.has(gameId)) {
                return true;
            }

            const oldGame = oldMap.get(gameId)!;

            try {
                const newHomeScore = newGame.homeTeam?.score || 0;
                const newAwayScore = newGame.awayTeam?.score || 0;
                const oldHomeScore = oldGame.homeTeam?.score || 0;
                const oldAwayScore = oldGame.awayTeam?.score || 0;

                // Immediate broadcast on score change
                if (newHomeScore !== oldHomeScore || newAwayScore !== oldAwayScore) {
                    return true;
                }

                // Also check for status and period changes
                if (newGame.gameStatus !== oldGame.gameStatus || newGame.period !== oldGame.period) {
                    return true;
                }
            } catch (error) {
               console.log(`Error comparing game data for ${gameId}:`, error);
            }
        }

        return false;
    }

    async broadcastUpdates(): Promise<void> {
        try {
            const scoreboardData = await dataCache.getScoreboard();

            if (!scoreboardData?.scoreboard) {
                return;
            }

            const newGames = scoreboardData.scoreboard.games;

            // Check if data has changed
            if (!this.hasGameDataChanged(newGames, this.currentGames)) {
                return;
            }

            this.currentGames = [...newGames];

            // Send updates to all connected clients
            const message = JSON.stringify({ scoreboard: scoreboardData.scoreboard });
            const deadConnections = new Set<WebSocket>();

            for (const connection of this.activeConnections) {
                try {
                    if (connection.readyState === WebSocket.OPEN) {
                        connection.send(message);
                    } else {
                        deadConnections.add(connection);
                    }
                } catch (error) {
                   console.log('Error sending to scoreboard client:', error);
                    deadConnections.add(connection);
                }
            }

            // Clean up dead connections
            deadConnections.forEach(conn => this.activeConnections.delete(conn));

            if (deadConnections.size === 0 && this.activeConnections.size > 0) {
               console.log(`Broadcasted scoreboard update to ${this.activeConnections.size} clients`);
            }

        } catch (error) {
           console.log('Error in scoreboard broadcast:', error);
        }
    }


    async periodicBroadcastUpdates(): Promise<void> {
        try {
            const scoreboardData = await dataCache.getScoreboard();

            if (!scoreboardData?.scoreboard) {
               console.log('No scoreboard data available for periodic broadcast');
                return;
            }

            // Send updates to all connected clients
            const message = JSON.stringify({ scoreboard: scoreboardData.scoreboard });
            const deadConnections = new Set<WebSocket>();

           console.log(`Sending periodic scoreboard broadcast to ${this.activeConnections.size} clients`);

            for (const connection of this.activeConnections) {
                try {
                    if (connection.readyState === WebSocket.OPEN) {
                        connection.send(message);
                    } else {
                        deadConnections.add(connection);
                    }
                } catch (error) {
                   console.log('Error sending to scoreboard client:', error);
                    deadConnections.add(connection);
                }
            }

            // Clean up dead connections
            deadConnections.forEach(conn => this.activeConnections.delete(conn));

            if (this.activeConnections.size > 0) {
               console.log(`Broadcasted periodic scoreboard update to ${this.activeConnections.size} clients`);
            } else {
               console.log('No active connections to broadcast to');
            }

        } catch (error) {
           console.log('Error in scoreboard broadcast:', error);
        }
    }


    // Method to manually trigger broadcasts when changes are detected
    async notifyScoreChange(): Promise<void> {
        await this.broadcastUpdates();
    }
}

export class PlaybyplayWebSocketManager {
    private activeConnections = new Map<string, Set<WebSocket>>();
    private currentPlaybyplay = new Map<string, any[]>();
    private lastUpdateTimestamp = new Map<string, number>();
    private cleanupTimer: NodeJS.Timeout | null = null;
    private isTestEnvironment = false;

    constructor(isTestEnvironment: boolean = false) {
        this.isTestEnvironment = isTestEnvironment;
    }

    connect(websocket: WebSocket, gameId: string): void {
        websocket.on('error', (error: any) => {
            const errorMsg = error?.message || String(error);
            const errorCode = error?.code || 'UNKNOWN';
            console.error(`[Play-by-Play WebSocket] Error for game ${gameId} [${errorCode}]: ${errorMsg}`);
            this.disconnect(websocket, gameId);
        });

        websocket.on('close', (code, reason) => {
            if (code !== 1000) {
                console.warn(`[Play-by-Play WebSocket] Client closed for game ${gameId} with code ${code}: ${reason || 'no reason'}`);
            } else {
                console.log(`[Play-by-Play WebSocket] Client disconnected gracefully for game ${gameId}`);
            }
            this.disconnect(websocket, gameId);
        });

        // Add to active connections for this game
        if (!this.activeConnections.has(gameId)) {
            this.activeConnections.set(gameId, new Set());
        }
        this.activeConnections.get(gameId)!.add(websocket);
        const activeCount = this.activeConnections.get(gameId)?.size || 0;
       console.log(`[Play-by-Play WebSocket] New client connected for game ${gameId}. Active connections: ${activeCount}`);

        // Send initial data
        this.sendInitialPlaybyplay(websocket, gameId);
         this.testPlayByPlayDataFetch(gameId).catch(err => {
           console.log(`[Play-by-Play WebSocket] Error fetching test data for game ${gameId}:`, err);
        });
    }

    private disconnect(websocket: WebSocket, gameId: string): void {
        if (this.activeConnections.has(gameId)) {
            this.activeConnections.get(gameId)!.delete(websocket);

            if (this.activeConnections.get(gameId)!.size === 0) {
                this.activeConnections.delete(gameId);
                this.currentPlaybyplay.delete(gameId);
                this.lastUpdateTimestamp.delete(gameId);
            }
        }
       console.log(`Client disconnected from play-by-play for game ${gameId}`);
    }


    private async testPlayByPlayDataFetch(gameId: string): Promise<any> {
        // Use mock data in test environment
        if (this.isTestEnvironment) {
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
             console.log('Play-by-play response data:', response.data.game. actions[1]); // Debug log
             console.log('Play-by-play response data:', response.data.game. actions[2]); // Debug log
             console.log('Play-by-play response data:', response.data.game. actions[3]); // Debug log
             console.log('Play-by-play response data:', response.data.game. actions[4]); // Debug log
        }
    }

    private async sendInitialPlaybyplay(websocket: WebSocket, gameId: string): Promise<void> {
        try {
            if (!this.activeConnections.has(gameId) || !this.activeConnections.get(gameId)!.has(websocket)) {
                console.warn(`[Play-by-Play WebSocket] Websocket not in active connections for game ${gameId}`);
                return;
            }

            const playbyplayData = await dataCache.getPlaybyplay(gameId);

            if (playbyplayData && playbyplayData.plays && playbyplayData.plays.length > 0) {
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify(playbyplayData));
                    console.log(`[Play-by-Play WebSocket] Sent initial data for game ${gameId}: ${playbyplayData.plays.length} plays`);
                } else {
                    console.warn(`[Play-by-Play WebSocket] Cannot send - websocket not open for game ${gameId} (readyState: ${websocket.readyState})`);
                }
            } else {
                if (websocket.readyState === WebSocket.OPEN) {
                    websocket.send(JSON.stringify({ game_id: gameId, plays: [] }));
                    console.log(`[Play-by-Play WebSocket] Sent empty initial data for game ${gameId} (no plays available)`);
                }
            }
        } catch (error: any) {
            const errorMsg = error?.message || String(error);
            console.error(`[Play-by-Play WebSocket] Error sending initial data for game ${gameId}: ${errorMsg}`);
            this.disconnect(websocket, gameId);
        }
    }

    private hasPlaybyplayChanged(newData: any[], oldData: any[]): boolean {
        // Compare play counts
        if (newData.length !== oldData.length) {
            return true;
        }

        // Compare action numbers to detect if plays changed
        const newActionNumbers = new Set(newData.map(play => play.action_number));
        const oldActionNumbers = new Set(oldData.map(play => play.action_number));

        // If the sets are different, data has changed
        if (newActionNumbers.size !== oldActionNumbers.size) {
            return true;
        }

        // Check if any action numbers are different
        for (const actionNum of newActionNumbers) {
            if (!oldActionNumbers.has(actionNum)) {
                return true;
            }
        }

        return false;
    }

    private periodicCleanup(): void {
       console.log('Play-by-play WebSocket cleanup task started');

        const cleanup = () => {
            try {
                // Clean up any dead connections
                for (const [gameId, connections] of this.activeConnections.entries()) {
                    const deadConnections = new Set<WebSocket>();
                    for (const connection of connections) {
                        if (connection.readyState !== WebSocket.OPEN) {
                            deadConnections.add(connection);
                        }
                    }

                    deadConnections.forEach(conn => connections.delete(conn));

                    if (connections.size === 0) {
                        this.activeConnections.delete(gameId);
                        this.currentPlaybyplay.delete(gameId);
                        this.lastUpdateTimestamp.delete(gameId);
                    }
                }

               console.log(`Cleaned up dead play-by-play connections`);

            } catch (error) {
               console.log('Error in play-by-play WebSocket cleanup:', error);
            }
        };

        this.cleanupTimer = setInterval(cleanup, 5 * 60 * 1000); // 5 minutes
    }

    startCleanupTask(): void {
        if (!this.cleanupTimer) {
            this.periodicCleanup();
           console.log('Started play-by-play WebSocket cleanup task');
        }
    }

    stopCleanupTask(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
           console.log('Stopped play-by-play WebSocket cleanup task');
        }
    }

    async broadcastPlaybyplayUpdates(): Promise<void> {
        try {
            if (this.activeConnections.size === 0) {
                return;
            }

            for (const [gameId, connections] of this.activeConnections.entries()) {
                if (connections.size === 0) {
                    continue;
                }

                try {
                    const playbyplayData = await dataCache.getPlaybyplay(gameId);

                    if (!playbyplayData) {
                        continue;
                    }

                    const previousPlaybyplay = this.currentPlaybyplay.get(gameId) || [];
                    this.currentPlaybyplay.set(gameId, playbyplayData.plays || []);

                    if (!this.hasPlaybyplayChanged(this.currentPlaybyplay.get(gameId)!, previousPlaybyplay)) {
                        continue;
                    }

                   console.log(`Broadcasting ${this.currentPlaybyplay.get(gameId)!.length} plays for game ${gameId}`);

                    const deadConnections = new Set<WebSocket>();
                    for (const connection of connections) {
                        try {
                            if (connection.readyState === WebSocket.OPEN) {
                                connection.send(JSON.stringify(playbyplayData));
                            } else {
                                deadConnections.add(connection);
                            }
                        } catch (error) {
                           console.log(`Error sending play-by-play data to client for game ${gameId}:`, error);
                            deadConnections.add(connection);
                        }
                    }

                    // Clean up dead connections
                    deadConnections.forEach(conn => connections.delete(conn));
                    if (connections.size === 0) {
                        this.activeConnections.delete(gameId);
                        this.currentPlaybyplay.delete(gameId);
                        this.lastUpdateTimestamp.delete(gameId);
                    }

                } catch (error) {
                   console.log(`Error broadcasting play-by-play for game ${gameId}:`, error);
                }
            }

        } catch (error) {
           console.log('Error in play-by-play broadcast:', error);
        }
    }
}

// Global instances
const isTestEnvironment = process.env.NODE_ENV === 'development';
export const scoreboardWebsocketManager = new ScoreboardWebSocketManager(isTestEnvironment);
export const playbyplayWebsocketManager = new PlaybyplayWebSocketManager(isTestEnvironment);