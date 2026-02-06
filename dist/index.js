"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const ws_1 = require("ws");
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(".env") });
// Detect IISNode environment - use multiple detection methods
const isIISNode = !!(process.env.IISNODE_VERSION ||
    process.env.APP_POOL_ID ||
    process.env.PLESK_BIN ||
    (process.cwd() && process.cwd().includes('vhosts')) ||
    require.main !== module);
console.log('######################################');
console.log('IISNode detection:', isIISNode);
console.log('IISNODE_VERSION:', process.env.IISNODE_VERSION);
console.log('PLESK_BIN:', process.env.PLESK_BIN);
console.log('CWD:', process.cwd());
console.log('require.main !== module:', require.main !== module);
console.log('#######################################\n');
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({ origin: "*", credentials: true }));
// Health check
app.get("/", (req, res) => {
    res.json({
        message: "NBA Live API is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        iisnode: isIISNode,
        SQLServer: {
            Configured: (!!process.env.DB_SERVER ? 'Yes' : 'No') + ' - ' + 'Connected: ' + (process.env.DB_SERVER ? 'yes' : 'no'),
            Configuration: {
                DB_SERVER: !!process.env.DB_SERVER,
                DB_USER: !!process.env.DB_USER,
                DB_PASSWORD: !!process.env.DB_PASSWORD,
                DB_NAME: !!process.env.DB_NAME
            }
        }
    });
});
// Cache refresh endpoint
app.post("/api/v1/cache/refresh", async (req, res) => {
    try {
        console.log('Manual cache refresh requested');
        const scoreboardData = await dataCache_1.dataCache.refreshScoreboard();
        res.json({
            success: true,
            message: "Cache refreshed successfully",
            games: scoreboardData?.scoreboard?.games?.length || 0,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error refreshing cache:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to refresh cache',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Cache status endpoint
app.get("/api/v1/cache/status", async (req, res) => {
    try {
        const scoreboardData = await dataCache_1.dataCache.getScoreboard();
        const games = scoreboardData?.scoreboard?.games || [];
        res.json({
            cacheStatus: games.length > 0 ? 'populated' : 'empty',
            games: games.length,
            timestamp: new Date().toISOString(),
            lastUpdate: scoreboardData?.scoreboard?.gameDate || 'unknown'
        });
    }
    catch (error) {
        console.error('Error getting cache status:', error);
        res.status(500).json({
            cacheStatus: 'error',
            error: 'Failed to get cache status'
        });
    }
});
// Routes
const schedule_http_1 = __importDefault(require("./routes/schedule_http"));
const schedule_1 = __importDefault(require("./routes/schedule"));
const standings_1 = __importDefault(require("./routes/standings"));
const players_1 = __importDefault(require("./routes/players"));
const teams_1 = __importDefault(require("./routes/teams"));
const search_1 = __importDefault(require("./routes/search"));
const predictions_1 = __importDefault(require("./routes/predictions"));
const league_1 = __importDefault(require("./routes/league"));
const scoreboard_1 = __importDefault(require("./routes/scoreboard"));
const logo_1 = __importDefault(require("./routes/logo"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const users_1 = __importDefault(require("./routes/users"));
app.use("/api/v1", schedule_http_1.default);
app.use("/api/v1", schedule_1.default);
app.use("/api/v1/standings", standings_1.default);
app.use("/api/v1", teams_1.default);
app.use("/api/v1", search_1.default);
app.use("/api/v1", predictions_1.default);
app.use("/api/v1", league_1.default);
app.use("/api/v1", players_1.default);
app.use("/api/v1/scoreboard", scoreboard_1.default);
app.use('/api/v1/logos', logo_1.default);
// Webhook routes
app.use('/api/v1/webhooks', webhooks_1.default);
// Subscription management routes
app.use('/api/v1/subscriptions', subscriptions_1.default);
// User management routes
app.use('/api/v1/users', users_1.default);
// Serve team logos as static files
const logosPath = path_1.default.join(__dirname, '..', 'assets', 'logos');
app.use('/api/v1/team-logo', express_1.default.static(logosPath));
// Import WebSocket managers and services
const websocketManager_1 = require("./services/websocketManager");
const dataCache_1 = require("./services/dataCache");
const keyMoments_1 = require("./services/keyMoments");
const database_1 = require("./config/database");
const migrations_1 = require("./services/migrations");
// Create HTTP server and WebSocket server
const server = http_1.default.createServer(app);
const wss = new ws_1.WebSocketServer({ noServer: true });
console.log('[WebSocket] Server initialized');
// Handle WebSocket upgrade requests
console.log('[Server Setup] Registering upgrade handler');
server.on('upgrade', (req, socket, head) => {
    console.log(`[WebSocket] ✅ Upgrade request received for: ${req.url}`);
    try {
        wss.handleUpgrade(req, socket, head, (ws) => {
            console.log(`[WebSocket] ✅ Upgrade successful for: ${req.url}`);
            wss.emit('connection', ws, req);
        });
    }
    catch (error) {
        console.error('[WebSocket] ❌ Error during upgrade:', error);
        socket.destroy();
    }
});
console.log('[Server Setup] Upgrade handler registered');
// WebSocket connection handling
wss.on("connection", (ws, req) => {
    const url = req.url;
    console.log(`[WebSocket] New connection - URL: "${url}"`);
    // Send immediate acknowledgement to all WebSocket connections
    try {
        // ws.send(JSON.stringify({ status: 'connected', message: 'WebSocket connection established' }));
        console.log('[WebSocket] ✅ Acknowledgement sent');
    }
    catch (error) {
        console.error('[WebSocket] ❌ Error sending acknowledgement:', error);
    }
    try {
        if (url === "/api/v1/ws" || url?.includes("api/v1/ws")) {
            console.log('[WebSocket] ✅ Routing to scoreboard WebSocket manager');
            websocketManager_1.scoreboardWebSocketManager.handleConnection(ws);
        }
        else if (url?.startsWith("/api/v1/playbyplay/ws/")) {
            const gameId = url.split("/").pop();
            if (gameId) {
                console.log(`[WebSocket] ✅ Routing to playbyplay for game ${gameId}`);
                websocketManager_1.playbyplayWebSocketManager.handleConnection(ws, gameId);
            }
            else {
                console.log(`[WebSocket] ❌ No game ID found in URL: ${url}`);
                ws.close();
            }
        }
        else {
            console.log(`[WebSocket] ⚠️ Unknown URL: "${url}"`);
            // Don't close for unknown URLs, just log them
        }
    }
    catch (error) {
        console.error(`[WebSocket] ❌ Error handling connection:`, error);
    }
});
// Start background tasks only in development
try {
    dataCache_1.dataCache.startPolling();
    console.log('Data cache polling started');
}
catch (error) {
    console.error('Error starting data cache:', error);
}
try {
    (0, keyMoments_1.startCleanupTask)();
    console.log('Cleanup task started');
}
catch (error) {
    console.error('Error starting cleanup task:', error);
}
try {
    websocketManager_1.scoreboardWebSocketManager.startBroadcasting();
    websocketManager_1.playbyplayWebSocketManager.startBroadcasting();
    console.log('WebSocket broadcasting started');
}
catch (error) {
    console.error('Error starting WebSocket broadcasting:', error);
}
try {
    websocketManager_1.scoreboardWebSocketManager.startCleanupTask();
    websocketManager_1.playbyplayWebSocketManager.startCleanupTask();
    console.log('WebSocket cleanup tasks started');
}
catch (error) {
    console.error('Error starting cleanup tasks:', error);
}
// Start server
const PORT = parseInt(process.env.PORT || '8000');
// Initialize database connection
(async () => {
    try {
        await (0, database_1.connectToDatabase)();
        console.log('[Database] SQL Server connection initialized');
        // Run pending migrations
        await migrations_1.migrationService.runPendingMigrations();
    }
    catch (error) {
        console.error('[Database] Failed to initialize connection:', error);
        console.log('[Database] Continuing without database connection - operation is non-critical');
    }
})();
if (isIISNode) {
    // IISNode provides PORT as a named pipe
    server.listen(process.env.PORT || 8000, () => {
        console.log('Server running under IISNode on pipe:', process.env.PORT);
    });
}
else {
    // Development mode
    process.on('uncaughtException', (err) => {
        console.error('[Uncaught Exception]:', err);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('[Unhandled Rejection]:', reason);
    });
    server.on('error', (err) => {
        console.error('[Server Error Event]:', err.message);
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${PORT} is already in use`);
            process.exit(1);
        }
    });
    server.on('clientError', (err, socket) => {
        console.error('[Client Error]:', err);
        socket.end();
    });
    try {
        console.log(`[Server] Attempting to listen on 0.0.0.0:${PORT}...`);
        server.listen(PORT, '0.0.0.0', () => {
            const addr = server.address();
            console.log(`[Server] ✅ Successfully listening on ${addr?.address}:${addr?.port}`);
            console.log(`[WebSocket] Ready to accept WebSocket connections`);
        });
    }
    catch (err) {
        console.error(`[Server] Error calling listen():`, err);
    }
    // Verify server is actually listening
    setInterval(() => {
        const addr = server.address();
        console.log(`[Server Check] Listening: ${server.listening}, Address: ${addr?.address}:${addr?.port}`);
    }, 30000);
}
// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log('[Shutdown] SIGTERM received - closing gracefully');
    await dataCache_1.dataCache.stopPolling();
    await (0, keyMoments_1.stopCleanupTask)();
    await websocketManager_1.scoreboardWebSocketManager.stopCleanupTask();
    await websocketManager_1.playbyplayWebSocketManager.stopCleanupTask();
    await (0, database_1.closeDatabase)();
    server.close();
    process.exit(0);
});
process.on("SIGINT", async () => {
    console.log('[Shutdown] SIGINT received - closing gracefully');
    await dataCache_1.dataCache.stopPolling();
    await (0, keyMoments_1.stopCleanupTask)();
    await websocketManager_1.scoreboardWebSocketManager.stopCleanupTask();
    await websocketManager_1.playbyplayWebSocketManager.stopCleanupTask();
    await (0, database_1.closeDatabase)();
    server.close();
    process.exit(0);
});
// Export server for IISNode
exports.default = server;
//# sourceMappingURL=index.js.map