import WebSocket from 'ws';
export declare class ScoreboardWebSocketManager {
    private activeConnections;
    private activeConnectionsPBP;
    private checkInterval;
    private cleanupInterval;
    private currentGames;
    private lastUpdateTimestamp;
    private lastFullBroadcast;
    private initialized;
    private seenGameIds;
    private readonly NOTIFICATION_COOLDOWN;
    private readonly CHECK_INTERVAL;
    private readonly PERIODIC_BROADCAST_INTERVAL;
    private readonly CLEANUP_INTERVAL;
    private readonly MIN_UPDATE_INTERVAL;
    private readonly CLEANUP_THRESHOLD;
    private broadcastIntervalsPBP;
    private cleanupIntervalPBP;
    private currentPBP;
    private lastUpdateTimestampPBP;
    private lastFullBroadcastPBP;
    private readonly BROADCAST_INTERVAL_PBP;
    private readonly MAX_BROADCAST_INTERVAL_PBP;
    private readonly CLEANUP_INTERVAL_PBP;
    private readonly MIN_UPDATE_INTERVAL_PBP;
    private readonly CLEANUP_THRESHOLD_PBP;
    private keyMomentsInterval;
    private readonly KEY_MOMENTS_BROADCAST_INTERVAL;
    constructor();
    connect(websocket: WebSocket): void;
    disconnect(websocket: WebSocket): void;
    private sendInitialData;
    private sendNotificationOngameStatusChange;
    sendFiveMinutesMarkNotification(game: any, eventType: 'game_started' | 'score_update' | 'game_ended' | 'game_five_minutes_mark'): Promise<void>;
    /**
     * Get the last time a notification was sent for a game and event type
     * @returns Date of last notification or null if never sent
     */
    private getLastNotificationTime;
    /**
     * Record a notification in the database
     */
    private recordNotificationInDatabase;
    private sendNotificationOnGameIDChange;
    handleConnection(websocket: WebSocket): void;
    private formatGameResponse;
    private hasGameDataChanged;
    private checkAndBroadcast;
    startCleanupTask(): void;
    /**
     * Clean up old notification tracking records from database (older than 1 hour)
     */
    private cleanupOldNotificationsFromDatabase;
    stopCleanupTask(): void;
    getConnectionCount(): number;
    private initializeBroadcasting;
    broadcastToAllClientsScoreBoard(data: any): Promise<number>;
    startBroadcasting(): void;
    stopBroadcasting(): void;
    /**
     * Start broadcasting key moments every 20 seconds
     * Only active when NODE_ENV is 'true'
     */
    private startKeyMomentsBroadcasting;
    /**
     * Stop broadcasting key moments
     */
    private stopKeyMomentsBroadcasting;
    /**
     * Fetch key moments for a specific game
     */
    private fetchKeyMomentsForGame;
    private sendInitialPBPData;
    broadcastPBPToAllClients(data: any): Promise<number>;
    private broadcastPBPUpdates;
    private hasPBPChanged;
    private startGameBroadcasting;
    broadcastKeyMomentsToAllClientsScoreBoard(data: any): Promise<number>;
    startPBPBroadcasting(): void;
    startPBPCleanupTask(): void;
    stopPBPCleanupTask(): void;
    getConnectionCountPBP(gameId?: string): number;
    getGameCountPBP(): number;
}
export declare const webSocketManager: ScoreboardWebSocketManager;
//# sourceMappingURL=websocketManager.d.ts.map