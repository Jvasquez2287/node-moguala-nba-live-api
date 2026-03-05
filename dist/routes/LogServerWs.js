"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleLogServerConnection = handleLogServerConnection;
exports.sendDebugLog = sendDebugLog;
exports.getLogServerStats = getLogServerStats;
const LogServer_1 = require("../services/LogServer");
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
function handleLogServerConnection(ws, req) {
    try {
        console.log('[LogServerWs] New connection attempt for log server');
        LogServer_1.logServer.handleConnection(ws);
    }
    catch (error) {
        console.error('[LogServerWs] Error handling log server connection:', error);
        try {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Internal server error'
            }));
        }
        catch (sendError) {
            console.error('[LogServerWs] Failed to send error message:', sendError);
        }
        ws.close();
    }
}
/**
 * Send a debug message through the log server
 * Can be called from anywhere in the application
 */
function sendDebugLog(category, message, data) {
    LogServer_1.logServer.sendDebugMessage(category, message, data);
}
/**
 * Get stats about log server connections
 */
function getLogServerStats() {
    return LogServer_1.logServer.getStats();
}
//# sourceMappingURL=LogServerWs.js.map