import WebSocket from 'ws';
export declare class ScoreboardWebSocketManager {
    private activeConnections;
    private checkInterval;
    private cleanupInterval;
    private currentGames;
    private lastUpdateTimestamp;
    private lastFullBroadcast;
    private initialized;
    private readonly CHECK_INTERVAL;
    private readonly PERIODIC_BROADCAST_INTERVAL;
    private readonly CLEANUP_INTERVAL;
    private readonly MIN_UPDATE_INTERVAL;
    private readonly CLEANUP_THRESHOLD;
    constructor();
    connect(websocket: WebSocket): void;
    private sendInitialData;
    disconnect(websocket: WebSocket): void;
    handleConnection(websocket: WebSocket): void;
    private formatGameResponse;
    private hasGameDataChanged;
    private checkAndBroadcast;
    startCleanupTask(): void;
    stopCleanupTask(): void;
    getConnectionCount(): number;
    private initializeBroadcasting;
    startBroadcasting(): void;
    stopBroadcasting(): void;
}
export declare class PlaybyplayWebSocketManager {
    private activeConnections;
    private broadcastIntervals;
    private cleanupInterval;
    private currentPlaybyplay;
    private lastUpdateTimestamp;
    private lastFullBroadcast;
    private readonly BROADCAST_INTERVAL;
    private readonly MAX_BROADCAST_INTERVAL;
    private readonly CLEANUP_INTERVAL;
    private readonly MIN_UPDATE_INTERVAL;
    private readonly CLEANUP_THRESHOLD;
    connect(gameId: string, websocket: WebSocket): void;
    private sendInitialData;
    disconnect(gameId: string, websocket: WebSocket): void;
    handleConnection(websocket: WebSocket, gameId: string): void;
    private hasPlaybyplayChanged;
    private broadcastPlaybyplayUpdates;
    private startGameBroadcasting;
    startBroadcasting(): void;
    startCleanupTask(): void;
    stopCleanupTask(): void;
    getConnectionCount(gameId?: string): number;
    getGameCount(): number;
    broadcastToAllClients(data: any): Promise<number>;
}
export declare const scoreboardWebSocketManager: ScoreboardWebSocketManager;
export declare const playbyplayWebSocketManager: PlaybyplayWebSocketManager;
//# sourceMappingURL=websocketManager.d.ts.map