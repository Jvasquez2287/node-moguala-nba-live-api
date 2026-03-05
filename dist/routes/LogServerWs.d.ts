import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
/**
 * Handle WebSocket connection for the log server
 * Route: /logserver/ws
 *
 * Authentication required:
 * 1. Client sends: { type: "auth", username: "debug", password: "password" }
 * 2. Server responds with success or failure
 *
 * Once authenticated, client can receive debug messages
 */
export declare function handleLogServerConnection(ws: WebSocket, req: IncomingMessage): void;
/**
 * Send a debug message through the log server
 * Can be called from anywhere in the application
 */
export declare function sendDebugLog(category: string, message: string, data?: any): void;
/**
 * Get stats about log server connections
 */
export declare function getLogServerStats(): {
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
//# sourceMappingURL=LogServerWs.d.ts.map