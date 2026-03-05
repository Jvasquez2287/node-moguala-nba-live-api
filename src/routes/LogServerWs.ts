import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { logServer } from '../services/LogServer';

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
export function handleLogServerConnection(ws: WebSocket, req: IncomingMessage): void {
  try {
    console.log('[LogServerWs] New connection attempt for log server');
    logServer.handleConnection(ws);
  } catch (error) {
    console.error('[LogServerWs] Error handling log server connection:', error);
    try {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Internal server error'
      }));
    } catch (sendError) {
      console.error('[LogServerWs] Failed to send error message:', sendError);
    }
    ws.close();
  }
}

/**
 * Send a debug message through the log server
 * Can be called from anywhere in the application
 */
export function sendDebugLog(category: string, message: string, data?: any): void {
  logServer.sendDebugMessage(category, message, data);
}

/**
 * Get stats about log server connections
 */
export function getLogServerStats() {
  return logServer.getStats();
}
