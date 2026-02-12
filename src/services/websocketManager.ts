import WebSocket from 'ws';
import { dataCache } from './dataCache';
import { schedule } from 'node-cron';
import { scheduleService } from './schedule';

export class ScoreboardWebSocketManager {
  private activeConnections: Set<WebSocket> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private currentGames: any[] = [];
  private lastUpdateTimestamp: Map<string, number> = new Map();
  private lastFullBroadcast: number = 0;
  private initialized = false;

  private readonly CHECK_INTERVAL = 2000; // 2 seconds - check for changes frequently
  private readonly PERIODIC_BROADCAST_INTERVAL = 60000; // 1 minute - send data periodically to all clients
  private readonly CLEANUP_INTERVAL = 600000; // 10 minutes - clean up stale timestamps
  private readonly MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates per game
  private readonly CLEANUP_THRESHOLD = 3600000; // 1 hour - remove stale timestamps older than this

  constructor() {
    if (!this.initialized) {
      this.initialized = true;
      // Defer broadcast task start to allow modules to fully load
      setImmediate(() => this.initializeBroadcasting());
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
      console.log(`[Scoreboard WebSocket] Close event fired - Code: ${code}, Reason: ${reason || 'none'}, Active before removal: ${this.activeConnections.size}`);
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

    websocket.on('message', (data: WebSocket.Data) => {
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
      } catch (error) {
        console.error('[Scoreboard WebSocket] Error logging message:', error);
      }
    });

  }


  private async sendInitialData(websocket: WebSocket): Promise<void> {

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

  disconnect(websocket: WebSocket): void {
    this.activeConnections.delete(websocket);
    console.log(`[Scoreboard WebSocket] Client disconnected (remaining: ${this.activeConnections.size})`);

    // Clear timestamps if no more connections
    if (this.activeConnections.size === 0) {
      this.lastUpdateTimestamp.clear();
    }
  }

  handleConnection(websocket: WebSocket): void {
    this.connect(websocket);
  }

  private formatGameResponse(games: any[]): any[] {
    return games.map((game: any) => ({
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

  private hasGameDataChanged(newGames: any[], oldGames: any[]): boolean {
    const currentTime = Date.now();
    const newMap = new Map(newGames.map(g => [g.gameId, g]));
    const oldMap = new Map(oldGames.map(g => [g.gameId, g]));

    for (const [gameId, newGame] of newMap) {
      if (!oldMap.has(gameId)) {
        return true;
      }

      const oldGame = oldMap.get(gameId)!;
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

  private async checkAndBroadcast(): Promise<void> {
    if (this.activeConnections.size === 0) return;

    try {
      const scoreboardData = await dataCache.getScoreboard();

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
      const deadConnections = new Set<WebSocket>();
      let successCount = 0;
      let failureCount = 0;
      const timestamp = new Date().toISOString();

      if (dataChanged) {
        console.log(`[${timestamp}] [Scoreboard WS] Scoreboard CHANGED - Broadcasting to ${this.activeConnections.size} clients`);
      } else {
        console.log(`[${timestamp}] [Scoreboard WS] PERIODIC broadcast (1 min) to ${this.activeConnections.size} clients`);
      }

      for (const connection of this.activeConnections) {
        try {
          if (connection.readyState === WebSocket.OPEN) {
            connection.send(message);
            successCount++;
          } else {
            console.warn(`[Scoreboard WS] Connection not OPEN (readyState: ${connection.readyState}), marking as dead`);
            deadConnections.add(connection);
            failureCount++;
          }
        } catch (error) {
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
    } catch (error) {
      console.error('[Scoreboard WebSocket] Error in broadcast:', error);
    }
  }

  startCleanupTask(): void {
    if (this.cleanupInterval) return;

    console.log('[Scoreboard WebSocket] Cleanup task started');

    const cleanup = () => {
      // Remove dead connections
      const deadConnections: WebSocket[] = [];

      for (const client of this.activeConnections) {
        if (client.readyState !== WebSocket.OPEN) {
          deadConnections.push(client);
        }
      }

      deadConnections.forEach(client => {
        this.activeConnections.delete(client);
      });

      // Clean up stale timestamps
      const currentTime = Date.now();
      const staleKeys: string[] = [];

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

  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Scoreboard WebSocket] Cleanup task stopped');
    }

    this.stopBroadcasting();
  }

  getConnectionCount(): number {
    return this.activeConnections.size;
  }

  private initializeBroadcasting(): void {
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

  startBroadcasting(): void {
    if (!this.checkInterval) {
      this.initializeBroadcasting();
    }
  }

  stopBroadcasting(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('[Scoreboard WebSocket] Broadcasting stopped');
    }
  }
}

export class PlaybyplayWebSocketManager {
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

export const scoreboardWebSocketManager = new ScoreboardWebSocketManager();
export const playbyplayWebSocketManager = new PlaybyplayWebSocketManager();