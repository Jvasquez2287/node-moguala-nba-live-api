import { WebSocket } from 'ws';
declare class LogServerManager {
    private connections;
    private pendingConnections;
    private readonly MAX_CONNECTIONS;
    private readonly DEBUG_USERNAME;
    private readonly DEBUG_PASSWORD;
    /**
     * Authenticate a client with username and password
     */
    private authenticateClient;
    /**
     * Handle a new WebSocket connection
     */
    handleConnection(ws: WebSocket): void;
    /**
     * Send a debug message to all connected clients
     */
    sendDebugMessage(category: string, message: string, data?: any): void;
    /**
     * Broadcast a system message to all connected clients
     */
    private broadcastSystemMessage;
    /**
     * Broadcast raw message to all connected clients
     */
    private broadcastToClients;
    /**
     * Get connection statistics
     */
    getStats(): {
        activeConnections: number;
        maxConnections: number;
        pendingConnections: number;
        clients: Array<{
            id: string;
            username: string;
            connectedAt: number;
            uptime: string;
        }>;
    };
    /**
     * Format milliseconds to readable uptime string
     */
    private formatUptime;
    /**
     * Close all connections and reset
     */
    reset(): void;
}
export declare const logServer: LogServerManager;
export {};
//# sourceMappingURL=LogServer.d.ts.map