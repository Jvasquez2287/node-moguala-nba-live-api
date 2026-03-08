import WebSocket from 'ws';
import { dataCache } from './dataCache';
import { schedule } from 'node-cron';
import { scheduleService } from './schedule';
import expoNotificationSystem from './expoNotificationSystem';
import { connectToDatabase } from '../config/database';
import sql from 'mssql';

// Debug Server
import { sendDebugLog } from "../routes/LogServerWs";

export class ScoreboardWebSocketManager {
  private activeConnections: Set<WebSocket> = new Set();
  private activeConnectionsPBP: Map<string, Set<WebSocket>> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private currentGames: any[] = [];
  private lastUpdateTimestamp: Map<string, number> = new Map();
  private lastFullBroadcast: number = 0;
  private initialized = false;

  // Notification tracking to prevent duplicates (now stored in database)
  private seenGameIds: Set<string> = new Set();
  private readonly NOTIFICATION_COOLDOWN = 5000; // 5 seconds - minimum time between same notification type for same game
  private readonly NOTIFICATION_INTERVAL = 20000; // 20 seconds - check for notifications to send


  // Scoreboard update intervals and thresholds
  private readonly CHECK_INTERVAL = 2000; // 2 seconds - check for changes frequently
  private readonly PERIODIC_BROADCAST_INTERVAL = 60000; // 1 minute - send data periodically to all clients
  private readonly CLEANUP_INTERVAL = 600000; // 10 minutes - clean up stale timestamps
  private readonly MIN_UPDATE_INTERVAL = 1000; // Minimum 1 second between updates per game
  private readonly CLEANUP_THRESHOLD = 3600000; // 1 hour - remove stale timestamps older than this


  // Play-by-play tracking
  private broadcastIntervalsPBP: Map<string, NodeJS.Timeout> = new Map();
  private cleanupIntervalPBP: NodeJS.Timeout | null = null;
  private currentPBP: Map<string, any[]> = new Map();
  private lastUpdateTimestampPBP: Map<string, number> = new Map();
  private lastFullBroadcastPBP: Map<string, number> = new Map();
  private readonly BROADCAST_INTERVAL_PBP = 30000; // 30 seconds - check for new plays frequently
  private readonly MAX_BROADCAST_INTERVAL_PBP = 120000; // 2 minutes (120 seconds) - maximum time between broadcasts
  private readonly CLEANUP_INTERVAL_PBP = 600000; // 10 minutes - clean up stale data
  private readonly MIN_UPDATE_INTERVAL_PBP = 2000; // Minimum 2 seconds between updates per game
  private readonly CLEANUP_THRESHOLD_PBP = 3600000; // 1 hour - remove stale timestamps older than this

  // Key moments broadcasting
  private keyMomentsInterval: NodeJS.Timeout | null = null;
  private readonly KEY_MOMENTS_BROADCAST_INTERVAL = 20000; // 20 seconds

  constructor() {
    if (!this.initialized) {
      this.initialized = true;
      // Defer broadcast task start to allow modules to fully load
      setImmediate(() => this.initializeBroadcasting());
    }
  }

  // WebSocket connection handling
  connect(websocket: WebSocket): void {
    websocket.on('error', (error: any) => {
      const errorMsg = error?.message || String(error);
      const errorCode = error?.code || 'UNKNOWN';
      console.error(`[Scoreboard WebSocket] Client error [${errorCode}]: ${errorMsg}`);
      this.activeConnections.delete(websocket);
    });

    websocket.on('close', (code, reason) => {
      console.log(`[Scoreboard WebSocket] Close event fired - Code: ${code}, Reason: ${reason || 'none'}, Active before removal: ${this.activeConnections.size}`);
      sendDebugLog('ScoreboardWebSocketManager', `Client disconnected - Code: ${code}, Reason: ${reason || 'none'}`);
      this.activeConnections.delete(websocket);
      if (this.activeConnections.size === 0) {
        this.lastUpdateTimestamp.clear();
      }
      if (code !== 1000) {
        sendDebugLog('ScoreboardWebSocketManager', `Client closed with code ${code}: ${reason || 'no reason'}. Active connections: ${this.activeConnections.size}`);
        console.warn(`[Scoreboard WebSocket] Client closed with code ${code}: ${reason || 'no reason'}. Active: ${this.activeConnections.size}`);
      } else {
        sendDebugLog('ScoreboardWebSocketManager', `Client disconnected gracefully. Active connections: ${this.activeConnections.size}`);
        console.log(`[Scoreboard WebSocket] Client disconnected gracefully. Active connections: ${this.activeConnections.size}`);
      }
    });

    websocket.on('message', (data: WebSocket.Data) => {
      try {
        const messageStr = typeof data === 'string' ? data : data.toString();
        const message = JSON.parse(messageStr);
        sendDebugLog('ScoreboardWebSocketManager', `Message received: ${message.type || 'unknown type'}`);
        console.log(`[Scoreboard WebSocket] Message received: ${message.type || 'unknown type'}`);
        if (message.type === 'subscribe_scoreboard') {

          if (this.activeConnections.has(websocket)) {
            sendDebugLog('ScoreboardWebSocketManager', `Client already subscribed, ignoring duplicate subscribe request`);
            console.warn(`[Scoreboard WebSocket] Client already subscribed, ignoring duplicate subscribe request`);
          } else {
            this.activeConnections.add(websocket);
          }
        }
        else if (message.type === 'unsubscribe_scoreboard') {
          this.activeConnections.delete(websocket);
          sendDebugLog('ScoreboardWebSocketManager', `Client unsubscribed. Active connections: ${this.activeConnections.size}`);
          console.log(`[Scoreboard WebSocket] Client unsubscribed. Active connections: ${this.activeConnections.size}`);
        }
        else if (message.type === 'subscribe_display_bagged') {
          sendDebugLog('ScoreboardWebSocketManager', `Client subscribed to display_bagged messages`);
          console.log(`[Scoreboard WebSocket] Client subscribed to display_bagged messages`);
        }
        else if (message.type === 'subscribe_playbyplay') {
          sendDebugLog('ScoreboardWebSocketManager', `Client subscribed to PBP messages`);
          console.log(`[Scoreboard WebSocket] Client subscribed to PBP messages`);
          const gameId = message.data.gameId;
          if (!this.activeConnectionsPBP.has(gameId)) {
            this.activeConnectionsPBP.set(gameId, new Set());
          }
          this.activeConnectionsPBP.get(gameId)!.add(websocket);
          this.sendInitialPBPData(gameId, websocket);
          sendDebugLog('ScoreboardWebSocketManager', `Client subscribed to PBP for game ${gameId}. Total subscribers for this game: ${this.activeConnectionsPBP.get(gameId)?.size || 0}`);
          console.log(`[Scoreboard WebSocket] Client subscribed to PBP for game ${gameId}. Total subscribers for this game: ${this.activeConnectionsPBP.get(gameId)?.size || 0}`, message);
        }
        else if (message.type === 'unsubscribe_playbyplay') {
          console.log(`[Scoreboard WebSocket] Client unsubscribed from PBP messages`);
          sendDebugLog('ScoreboardWebSocketManager', `Client unsubscribed from PBP messages`);
          const gameId = message.data.gameId;
          this.activeConnectionsPBP.get(gameId)?.delete(websocket);
        }

        else if (message.type === 'ping') {
          if (websocket.readyState === WebSocket.OPEN) {
            websocket.send(JSON.stringify({ type: 'pong', data: {}, timestamp: new Date().toISOString() }));
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[Scoreboard WebSocket] Error logging message:', error);
        sendDebugLog('ScoreboardWebSocketManager', `Error logging message: ${errorMsg}`);
      }
    });


    this.activeConnections.add(websocket);
    sendDebugLog('ScoreboardWebSocketManager', `New client connected. Active connections: ${this.activeConnections.size}`);
    console.log(`[Scoreboard WebSocket] New client connected. Active connections: ${this.activeConnections.size}`);

    // Send initial data
    this.sendInitialData(websocket);
  }
  // END WebSocket connection handling

  // Play-by-play initial data send
  disconnect(websocket: WebSocket): void {
    this.activeConnections.delete(websocket);
    for (const [gameId, connections] of this.activeConnectionsPBP.entries()) {
      connections.delete(websocket);
      if (connections.size === 0) {
        this.activeConnectionsPBP.delete(gameId);
      }
    }
    sendDebugLog('ScoreboardWebSocketManager', `Client disconnected (remaining: ${this.activeConnections.size})`);
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
  private async sendInitialData(websocket: WebSocket): Promise<void> {

    try {
      if (!this.activeConnections.has(websocket)) {
        sendDebugLog('ScoreboardWebSocketManager', `Websocket not in active connections, skipping initial send`);
        console.warn('[Scoreboard WebSocket] Websocket not in active connections, skipping initial send');
        return;
      }

      if (process.env.USE_MOCK_DATA === 'true') {
        dataCache.refreshScoreboard();
      }

      const scoreboardData = await dataCache.getScoreboard();

      if (scoreboardData && scoreboardData.scoreboard && scoreboardData.scoreboard.games && scoreboardData.scoreboard.games.length > 0) {
        const message = JSON.stringify({ scoreboard: scoreboardData.scoreboard });
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(message);
          sendDebugLog('ScoreboardWebSocketManager', `Sent initial data: ${scoreboardData.scoreboard.games.length} games`);
          console.log(`[Scoreboard WebSocket] Sent initial data: ${scoreboardData.scoreboard.games.length} games`);
        } else {
          sendDebugLog('ScoreboardWebSocketManager', `Cannot send - websocket not open (readyState: ${websocket.readyState})`);
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
          sendDebugLog('ScoreboardWebSocketManager', `Sent empty initial data (no games available)`);
          console.log('[Scoreboard WebSocket] Sent empty initial data (no games available)');
        }
      }
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      sendDebugLog('ScoreboardWebSocketManager', `Error sending initial data: ${errorMsg}`);
      console.error(`[Scoreboard WebSocket] Error sending initial data: ${errorMsg}`);
      this.activeConnections.delete(websocket);
    }
  }
  // END Scoreboard Testing Method

   
  /**
   * Get the last time a notification was sent for a game and event type
   * @returns Date of last notification or null if never sent
   */
  private async getLastNotificationTime(gameId: string, eventType: string): Promise<Date | null> {
    try {
      const pool = await connectToDatabase();
      if (!pool) return null;

      const result = await pool
        .request()
        .input('gameId', sql.VarChar(255), gameId)
        .input('eventType', sql.VarChar(100), eventType)
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      sendDebugLog('ScoreboardWebSocketManager', `Error getting last notification time for game ${gameId} and event ${eventType}: ${errorMsg}`);
      console.error(`[Scoreboard WebSocket] Error getting last notification time: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
 
   
  // Rate limiting logic for GenAI API requests
  handleConnection(websocket: WebSocket): void {
    this.connect(websocket);
  }
  // END Rate limiting logic for GenAI API requests

  // Play-by-play initial data send
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
        timeoutsRemaining: game.homeTeam?.timeoutsRemaining || 0,
        periods: (Array.isArray(game.homeTeam?.periods) && game.homeTeam.periods.length > 0) ? game.homeTeam.periods.map((p: any) => ({
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
        periods: (Array.isArray(game.awayTeam?.periods) && game.awayTeam.periods.length > 0) ? game.awayTeam.periods.map((p: any) => ({
          period: p.period,
          score: p.score
        })) : []
      },
      gameLeaders: game.gameLeaders || null
    }));
  }
  // END Play-by-play initial data send

  // Play-by-play initial data send
  private hasGameDataChanged(newGames: any[], oldGames: any[]): boolean {
    const currentTime = Date.now();
    const newMap = new Map(newGames.map(g => [g.gameId, g]));
    const oldMap = new Map(oldGames.map(g => [g.gameId, g]));

    // Debug logging
    const debugId = `${new Date().toISOString()}`;
    let changedGames: any[] = [];
    let throttledGames: any[] = [];
    let newGameDetected = false;
    for (const [gameId, newGame] of newMap) {
      if (!oldMap.has(gameId)) {
        console.log(`[${debugId}] [Game Data Change] NEW GAME detected: ${gameId}`);
        sendDebugLog('ScoreboardWebSocketManager', `NEW GAME detected: ${gameId}`);
        changedGames.push(gameId);
        newGameDetected = true; 
      }
    }

    if (newGameDetected) {
       expoNotificationSystem.sendGameUpdateNotification(`new_prediction${new Date().toLocaleString()}`, '', '', '', 'new_prediction');
      return true; // If there's a new game, we consider data changed immediately to trigger notifications and updates
    }

    for (const [gameId, newGame] of newMap) {

      // Game Status codes: 1=Pre-Game, 2=In Progress, 3=Final, 4=OT, 5=Suspended
      // Check for game status change and send notification if changed
      const oldGameStatus = oldGames.find((g: any) => g.gameId === gameId)?.gameStatus;
      if (newGame.gameStatus !== oldGameStatus) {
        if (newGame.gameStatus === 2 && oldGameStatus !== 2) { // Game just started
          console.log(`[${debugId}] [Game Data Change] Game STARTED: ${gameId}`);
          sendDebugLog('ScoreboardWebSocketManager', `Game STARTED: ${gameId}`);
          expoNotificationSystem.addToNotificationQueue(gameId, newGame, 'game_started');
        }
        else if (newGame.gameStatus === 3 && oldGameStatus !== 3) { // Game just ended
          console.log(`[${debugId}] [Game Data Change] Game ENDED: ${gameId}`);
          sendDebugLog('ScoreboardWebSocketManager', `Game ENDED: ${gameId}`);
          expoNotificationSystem.addToNotificationQueue(gameId, newGame, 'game_ended');
          dataCache.removeFiveMinutesMarkCache(gameId); // Clear 5-minute mark cache when game ends
        }
      }

      const oldGame = oldMap.get(gameId)!;
      const lastUpdate = this.lastUpdateTimestamp.get(gameId) || 0;
      const timeSinceLastUpdate = currentTime - lastUpdate;
      const meetsThrottle = timeSinceLastUpdate >= this.MIN_UPDATE_INTERVAL;

      // Check if scores, status, or period changed
      const homeScoreChanged = newGame.homeTeam?.score !== oldGame.homeTeam?.score;
      const awayScoreChanged = newGame.awayTeam?.score !== oldGame.awayTeam?.score;
      const statusChanged = newGame.gameStatus !== oldGame.gameStatus;
      const periodChanged = newGame.period !== oldGame.period;

      const hasAnyChange = homeScoreChanged || awayScoreChanged || statusChanged || periodChanged;

      if (hasAnyChange) {
        if (meetsThrottle) {
          changedGames.push(gameId);
          console.log(`[${debugId}] [Game Data Change] ${gameId} CHANGED: ` +
            `homeScore=${homeScoreChanged}, awayScore=${awayScoreChanged}, status=${statusChanged}, period=${periodChanged} `);
          sendDebugLog('ScoreboardWebSocketManager', `${gameId} CHANGED: homeScore=${homeScoreChanged}, awayScore=${awayScoreChanged}, status=${statusChanged}, period=${periodChanged}`);
          this.lastUpdateTimestamp.set(gameId, currentTime);
          return true;
        } else {
          throttledGames.push(gameId);
          console.log(`[${debugId}] [Game Data Change] ${gameId} has changes but THROTTLED (${timeSinceLastUpdate}ms < ${this.MIN_UPDATE_INTERVAL}ms)`);
          sendDebugLog('ScoreboardWebSocketManager', `${gameId} has changes but THROTTLED (${timeSinceLastUpdate}ms < ${this.MIN_UPDATE_INTERVAL}ms)`);
        }
      }
    }

    // Log summary if any games were processed
    if (changedGames.length > 0 || throttledGames.length > 0) {
      console.log(`[${debugId}] [Game Data Change] Summary - Changed: ${changedGames.length}, Throttled: ${throttledGames.length}`);
      sendDebugLog('ScoreboardWebSocketManager', `Summary - Changed: ${changedGames.length}, Throttled: ${throttledGames.length}`);
    }

    return false;
  }
  // END Play-by-play initial data send

  // Scoreboard Testing Method - can be called from other modules to trigger a broadcast with current data (for testing purposes)
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
        sendDebugLog('ScoreboardWebSocketManager', `Scoreboard CHANGED - Broadcasting to ${this.activeConnections.size} clients`);
      } else {
        console.log(`[${timestamp}] [Scoreboard WS] PERIODIC broadcast (1 min) to ${this.activeConnections.size} clients`);
        sendDebugLog('ScoreboardWebSocketManager', `PERIODIC broadcast (1 min) to ${this.activeConnections.size} clients`);
      }

      for (const connection of this.activeConnections) {
        try {
          if (connection.readyState === WebSocket.OPEN) {
            connection.send(message);
            successCount++;
          } else {
            console.warn(`[Scoreboard WS] Connection not OPEN (readyState: ${connection.readyState}), marking as dead`);
            sendDebugLog('ScoreboardWebSocketManager', `Connection not OPEN (readyState: ${connection.readyState}), marking as dead`);
            deadConnections.add(connection);
            failureCount++;
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[Scoreboard WS] Error sending to client:', errorMsg);
          sendDebugLog('ScoreboardWebSocketManager', `Error sending to client: ${errorMsg}`);
          deadConnections.add(connection);
          failureCount++;
        }
      }

      // Clean up disconnected clients (before logging summary)
      const deadCount = deadConnections.size;
      if (deadCount > 0) {
        console.log(`[Scoreboard WS] Removing ${deadCount} dead connections (readyState not OPEN or send error)`);
        sendDebugLog('ScoreboardWebSocketManager', `Removing ${deadCount} dead connections (readyState not OPEN or send error)`);
        deadConnections.forEach(client => this.activeConnections.delete(client));
      }

      console.log(`[Scoreboard WS] Broadcast completed - Sent: ${successCount}, Failed: ${failureCount}, Remaining: ${this.activeConnections.size}`);
      sendDebugLog('ScoreboardWebSocketManager', `Broadcast completed - Sent: ${successCount}, Failed: ${failureCount}, Remaining: ${this.activeConnections.size}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Scoreboard WebSocket] Error in broadcast:', errorMsg);
      sendDebugLog('ScoreboardWebSocketManager', `Error in broadcast: ${errorMsg}`);
    }
  }
  // END Scoreboard Testing Method

  // Cleanup task to remove dead connections and stale timestamps
  startCleanupTask(): void {
    if (this.cleanupInterval) return;

    console.log('[Scoreboard WebSocket] Cleanup task started');

    const cleanup = async () => {
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
  private async cleanupOldNotificationsFromDatabase(): Promise<void> {
    try {
      const pool = await connectToDatabase();
      if (!pool) return;

      const result = await pool
        .request()
        .query(`
          DELETE FROM game_notification_tracker
          WHERE last_sent_at < DATEADD(HOUR, -1, GETDATE())
        `);

      if (result.rowsAffected[0] > 0) {

        console.log(`[Scoreboard WebSocket] Cleaned up ${result.rowsAffected[0]} old notification records from database`);
        sendDebugLog('ScoreboardWebSocketManager', `Cleaned up ${result.rowsAffected[0]} old notification records from database`);
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Scoreboard WebSocket] Error cleaning up old notifications from database: ${errorMsg}`);
      sendDebugLog('ScoreboardWebSocketManager', `Error cleaning up old notifications from database: ${errorMsg}`);
    }
  }

  // Stop cleanup task and broadcasting (called when shutting down server)
  stopCleanupTask(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[Scoreboard WebSocket] Cleanup task stopped');
    }

    this.stopBroadcasting();
  }
  // END Cleanup task to remove dead connections and stale timestamps

  // Method to get current number of active connections (for monitoring purposes)
  getConnectionCount(): number {
    return this.activeConnections.size;
  }
  // END Method to get current number of active connections (for monitoring purposes)

  // Scoreboard Testing Method - can be called from other modules to trigger a broadcast with current data (for testing purposes)
  private initializeBroadcasting(): void {
    console.log('[Scoreboard WebSocket] Broadcasting initialized');
    sendDebugLog('ScoreboardWebSocketManager', 'Broadcasting initialized');

    // Set up periodic check for changes and broadcasts
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        this.checkAndBroadcast().catch(errorMsg => {
          const errorMessage = errorMsg instanceof Error ? errorMsg.message : String(errorMsg);
          console.error('[Scoreboard WebSocket] Broadcast check error:', errorMessage);
          sendDebugLog('ScoreboardWebSocketManager', `Broadcast check error: ${errorMessage}`);
        });
      }, this.CHECK_INTERVAL);
    }

    // Initialize cleanup task
    this.startCleanupTask();

    // Initialize key moments broadcasting if NODE_ENV is 'true'  
    this.startKeyMomentsBroadcasting();

    console.log('[Scoreboard WebSocket] Broadcasting started (on change or every 1 minute)');
    sendDebugLog('ScoreboardWebSocketManager', 'Broadcasting started (on change or every 1 minute)');
  }
  // END Scoreboard Testing Method

  // Scoreboard Testing Method - Broadcast custom data to all clients
  async broadcastToAllClientsScoreBoard(): Promise<number> {

    try {
      if (process.env.USE_MOCK_DATA === 'false') {
        return 0; // Only allow manual broadcasts when using mock data to prevent interference with live data
      }

      this.checkAndBroadcast(); // Update currentGames with latest data before broadcasting
      let clientCount = 0;
      return clientCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Scoreboard WS] Error in broadcastToAllClients:', errorMsg);
      sendDebugLog('ScoreboardWebSocketManager', `Error in broadcastToAllClients: ${errorMsg}`);
      return 0;
    }
  }
  // END Scoreboard Testing Method - Broadcast custom data to all clients

  // Key moments broadcasting methods
  startBroadcasting(): void {
    if (!this.checkInterval) {
      this.initializeBroadcasting();
    }
  }
  // END Key moments broadcasting methods

  // Key moments broadcasting methods
  stopBroadcasting(): void {
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
  private startKeyMomentsBroadcasting(): void {
    if (this.keyMomentsInterval) return;

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
            if (!gameId) continue;

            try {
              // Fetch key moments for this game
              const keyMomentsData = await this.fetchKeyMomentsForGame(gameId);
              if (keyMomentsData && keyMomentsData.moments && keyMomentsData.moments.length > 0) {
                // Broadcast to all connected clients
                await this.broadcastKeyMomentsToAllClientsScoreBoard(keyMomentsData);
              }
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              console.error(`[Scoreboard WebSocket] Error fetching key moments for game ${gameId}:`, errorMsg);
              sendDebugLog('ScoreboardWebSocketManager', `Error fetching key moments for game ${gameId}: ${errorMsg}`);
            }
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[Scoreboard WebSocket] Error in key moments broadcasting:', errorMsg);
        sendDebugLog('ScoreboardWebSocketManager', `Error in key moments broadcasting: ${errorMsg}`);
      }
    }, this.KEY_MOMENTS_BROADCAST_INTERVAL);
  }

  /**
   * Stop broadcasting key moments
   */
  private stopKeyMomentsBroadcasting(): void {
    if (this.keyMomentsInterval) {
      clearInterval(this.keyMomentsInterval);
      this.keyMomentsInterval = null;
      console.log('[Scoreboard WebSocket] Key moments broadcasting stopped');
      sendDebugLog('ScoreboardWebSocketManager', 'Key moments broadcasting stopped');
    }
  }

  /**
   * Fetch key moments for a specific game
   */
  private async fetchKeyMomentsForGame(gameId: string): Promise<any> {
    try {
      // Check cache first (dataCache.get is async)
      const cachedKeyMoments = await dataCache.get(`keyMoments_${gameId}`);
      if (cachedKeyMoments) {
        return cachedKeyMoments;
      }

      // If not cached, try to import and use keyMomentsService
      try {
        const { keyMomentsService } = await import('./keyMoments');
        const moments = await keyMomentsService.getKeyMomentsForGame(gameId);
        if (moments) {
          // Cache for 5 minutes (300000 milliseconds)
          await dataCache.set(`keyMoments_${gameId}`, { game_id: gameId, moments }, 300000);
          return { game_id: gameId, moments };
        }
      } catch (importError) {
        const errorMsg = importError instanceof Error ? importError.message : String(importError);
        console.warn(`[Scoreboard WebSocket] Could not import keyMomentsService: ${errorMsg}`);
        sendDebugLog('ScoreboardWebSocketManager', `Could not import keyMomentsService: ${errorMsg}`);
        return null;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[Scoreboard WebSocket] Error fetching key moments for game ${gameId}:`, errorMsg);
      sendDebugLog('ScoreboardWebSocketManager', `Error fetching key moments for game ${gameId}: ${errorMsg}`);
      return null;
    }
  }

  // Broadcast key moments to all clients
  private async sendInitialPBPData(gameId: string, websocket: WebSocket): Promise<void> {
    try {
      if (websocket.readyState !== WebSocket.OPEN) {
        return;
      }

      const playbyplayData = await dataCache.getPlaybyplay(gameId);

      if (playbyplayData) {
        websocket.send(JSON.stringify({
          [`playbyplay_${gameId}`]: playbyplayData
        }));
      } else {
        // Send empty structure if no data available yet
        websocket.send(JSON.stringify({
          [`playbyplay_${gameId}`]: {
            game_id: gameId,
            plays: []
          }
        }));
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[PlayByPlay WS] Error sending initial data for game ${gameId}:`, errorMsg);
      sendDebugLog('ScoreboardWebSocketManager', `Error sending initial data for game ${gameId}: ${errorMsg}`);
    }
  }
  // END Broadcast key moments to all clients

  // Broadcast play-by-play updates to all clients subscribed to the specific game
  async broadcastPBPToAllClients(data: any): Promise<number> {
    try {
      let clientCount = 0;
      const disconnectedClients: Array<{ gameId: string, client: WebSocket }> = [];

      if (this.activeConnectionsPBP.size === 0) {
        console.log('[PlayByPlay WS] No active connections for play-by-play updates, skipping broadcast');
        return 0; // No clients subscribed to any game
      }
      // Iterate through all games and their connected clients
      for (const [gameId, connections] of this.activeConnectionsPBP.entries()) {
        for (const client of connections) {
          try {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                [`playbyplay_${gameId}`]: data
              }));
              clientCount++;
            } else {
              disconnectedClients.push({ gameId, client });
            }
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            console.error(`[PlayByPlay WS] Error sending to client in game ${gameId}:`, errorMsg);
            sendDebugLog('ScoreboardWebSocketManager', `Error sending to client in game ${gameId}: ${errorMsg}`);
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
      sendDebugLog('ScoreboardWebSocketManager', `Broadcast sent to ${clientCount} clients`);
      return clientCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[PlayByPlay WS] Error in broadcastToAllClients:', errorMsg);
      sendDebugLog('ScoreboardWebSocketManager', `Error in broadcastToAllClients: ${errorMsg}`);
      return 0;
    }
  }
  // END Broadcast play-by-play updates to all clients subscribed to the specific game

  // Broadcast play-by-play updates to all clients subscribed to the specific game with change detection and rate limiting
  private async broadcastPBPUpdates(gameId: string): Promise<void> {
    try {
      const gameConnections = this.activeConnectionsPBP.get(gameId);
      if (!gameConnections || gameConnections.size === 0) {
        return;
      }

      const playbyplayData = await dataCache.getPlaybyplay(gameId);

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
      sendDebugLog('ScoreboardWebSocketManager', `Broadcasting ${newPlays.length} plays for game ${gameId} (changed: ${playsChanged}, timeSinceLastBroadcast: ${timeSinceLastBroadcast}ms)`);

      const disconnectedClients: WebSocket[] = [];

      for (const client of gameConnections) {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              [`playbyplay_${gameId}`]: playbyplayData,
            }));
          } else {
            disconnectedClients.push(client);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[PlayByPlay WS] Error sending to client for game ${gameId}:`, errorMsg);
          sendDebugLog('ScoreboardWebSocketManager', `Error sending to client for game ${gameId}: ${errorMsg}`);
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[PlayByPlay WS] Error in broadcast for game ${gameId}:`, errorMsg);
      sendDebugLog('ScoreboardWebSocketManager', `Error in broadcast for game ${gameId}: ${errorMsg}`);
    }
  }
  // END Broadcast play-by-play updates to all clients subscribed to the specific game with change detection and rate limiting

  // Check if play-by-play data has changed based on action numbers and rate limit updates
  private hasPBPChanged(newPlays: any[], oldPlays: any[]): boolean {
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
  private startGameBroadcasting(gameId: string): void {
    if (this.broadcastIntervalsPBP.has(gameId)) return;

    const broadcast = async () => {
      await this.broadcastPBPUpdates(gameId);
    };

    // Set up periodic check for new plays
    const interval = setInterval(broadcast, this.BROADCAST_INTERVAL_PBP);
    this.broadcastIntervalsPBP.set(gameId, interval);
  }
  // END Start broadcasting play-by-play updates for a specific game at regular intervals

  // Broadcast key moments to all clients
  async broadcastKeyMomentsToAllClientsScoreBoard(data: any): Promise<number> {
    try {
      let clientCount = 0;
      const disconnectedClients: WebSocket[] = [];

      console.log(`[Scoreboard WS] Broadcasting key moments to all clients (active connections: ${this.activeConnections.size})`);
      sendDebugLog('ScoreboardWebSocketManager', `Broadcasting key moments to all clients (active connections: ${this.activeConnections.size})`);

      for (const client of this.activeConnections) {
        try {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              keyMoments: data
            }));
            clientCount++;
          } else {
            disconnectedClients.push(client);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error('[Scoreboard WS] Error sending to client:', errorMsg);
          sendDebugLog('ScoreboardWebSocketManager', `Error sending to client: ${errorMsg}`);
          disconnectedClients.push(client);
        }
      }

      // Clean up disconnected clients
      disconnectedClients.forEach(client => this.activeConnections.delete(client));

      console.log(`[Scoreboard WS] Key moments broadcast sent to ${clientCount} clients`);
      sendDebugLog('ScoreboardWebSocketManager', `Key moments broadcast sent to ${clientCount} clients`);
      return clientCount;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[Scoreboard WS] Error in broadcastToAllClients:', errorMsg);
      sendDebugLog('ScoreboardWebSocketManager', `Error in broadcastToAllClients: ${errorMsg}`);
      return 0;
    }
  }
  // END Broadcast key moments to all clients

  // Start play-by-play broadcasting manager
  startPBPBroadcasting(): void {
    console.log('[PlayByPlay WS] Broadcasting manager initialized (games start broadcasting on client connection)');
    sendDebugLog('ScoreboardWebSocketManager', 'Broadcasting manager initialized (games start broadcasting on client connection)');
  }
  // END Start play-by-play broadcasting manager

  // Cleanup task to remove dead connections and stale timestamps for play-by-play manager
  startPBPCleanupTask(): void {
    if (this.cleanupInterval) return;

    console.log('[PlayByPlay WS] Cleanup task started');
    sendDebugLog('ScoreboardWebSocketManager', 'Cleanup task started');

    const cleanup = () => {
      let deadConnectionsCount = 0;
      const gamesToRemove: string[] = [];

      for (const [gameId, connections] of this.activeConnectionsPBP.entries()) {
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
      const staleKeys: string[] = [];

      for (const [key, timestamp] of this.lastUpdateTimestampPBP) {
        if (currentTime - timestamp > this.CLEANUP_THRESHOLD_PBP) {
          staleKeys.push(key);
        }
      }

      staleKeys.forEach(key => this.lastUpdateTimestampPBP.delete(key));

      if (deadConnectionsCount > 0 || gamesToRemove.length > 0 || staleKeys.length > 0) {
        console.log(`[PlayByPlay WS] Cleanup: removed ${deadConnectionsCount} dead connections, ${gamesToRemove.length} inactive games, ${staleKeys.length} stale timestamps`);
        sendDebugLog('ScoreboardWebSocketManager', `Cleanup: removed ${deadConnectionsCount} dead connections, ${gamesToRemove.length} inactive games, ${staleKeys.length} stale timestamps`);
      }
    };

    this.cleanupIntervalPBP = setInterval(cleanup, this.CLEANUP_INTERVAL_PBP);
  }
  // END Cleanup task to remove dead connections and stale timestamps for play-by-play manager

  // Stop cleanup task and broadcasting for play-by-play manager (called when shutting down server)
  stopPBPCleanupTask(): void {
    if (this.cleanupIntervalPBP) {
      clearInterval(this.cleanupIntervalPBP);
      this.cleanupIntervalPBP = null;
      console.log('[PlayByPlay WS] Cleanup task stopped');
      sendDebugLog('ScoreboardWebSocketManager', 'Cleanup task stopped');
    }

    // Stop all game broadcasting
    for (const [gameId, interval] of this.broadcastIntervalsPBP.entries()) {
      clearInterval(interval);
    }
    this.broadcastIntervalsPBP.clear();

    // Close all connections
    for (const connections of this.activeConnectionsPBP.values()) {
      for (const client of connections) {
        if (client.readyState === WebSocket.OPEN) {
          client.close();
        }
      }
    }
    this.activeConnectionsPBP.clear();
    this.currentPBP.clear();
    this.lastUpdateTimestampPBP.clear();
    this.lastFullBroadcastPBP.clear();

    console.log('[PlayByPlay WS] All connections closed');
    sendDebugLog('ScoreboardWebSocketManager', 'All connections closed');
  }
  // END Stop cleanup task and broadcasting for play-by-play manager (called when shutting down server)

  // Method to get current number of active connections for play-by-play manager (for monitoring purposes)
  getConnectionCountPBP(gameId?: string): number {
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
  getGameCountPBP(): number {
    return this.activeConnectionsPBP.size;
  }
  // END Method to get current number of active games being tracked for play-by-play manager (for monitoring purposes)

}



export const webSocketManager = new ScoreboardWebSocketManager();
