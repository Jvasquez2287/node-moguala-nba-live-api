"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const promises_1 = __importDefault(require("fs/promises"));
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
// Middleware - JSON will be applied after webhooks to preserve raw body for Stripe
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cors_1.default)({ origin: "*", credentials: true }));
// Import services needed by early routes
const dataCache_1 = require("./services/dataCache");
// Health check
app.get("/", (req, res) => {
    return res.json({
        message: "NBA Live API is running",
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || "development",
        iisnode: isIISNode,
        SQLServer: {
            Configured: (!!process.env.DB_SERVER ? 'Yes' : 'No'),
            Connected: (!!process.env.DB_SERVER ? 'Yes' : 'No'),
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
        return res.status(200).json({
            success: true,
            message: "Cache refreshed successfully",
            games: scoreboardData?.scoreboard?.games?.length || 0,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error refreshing cache:', error);
        return res.json({
            success: false,
            error: 'Failed to refresh cache',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Cache refresh endpoint
app.get("/api/v1/test", async (req, res) => {
    try {
        const result = await fiveMinuteMarkCalculator_1.FiveMinuteMarkCalculator.getCurrentGamesFromAPI();
        return res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error refreshing cache:', error);
        return res.json({
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
        return res.status(200).json({
            cacheStatus: games.length > 0 ? 'populated' : 'empty',
            games: games.length,
            timestamp: new Date().toISOString(),
            lastUpdate: scoreboardData?.scoreboard?.gameDate || 'unknown'
        });
    }
    catch (error) {
        console.error('Error getting cache status:', error);
        return res.json({
            cacheStatus: 'error',
            error: 'Failed to get cache status'
        });
    }
});
// API Endpoints interceptor for security and logging
app.use('/api/v1', async (req, res, next) => {
    /*
    console.log(`[API Request] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
    const validationResult = await tokenCheckService.validateTokenAndCheckSubscription(req);
    if (!validationResult.valid) {
      return res.json({ success: false, error: 'Invalid or missing security parameters' });
    }
  
    if(validationResult.valid && validationResult.subscription?.subscription_status !== 'active' &&
      validationResult.subscription?.subscription_end_date &&
      new Date(validationResult.subscription.subscription_end_date) < new Date()) {
        
      return res.json({ success: false, error: 'Active subscription required to access this endpoint' });
    }*/
    // Add any authentication or rate limiting logic here if needed
    next();
});
// Routes
const webhooks_1 = __importDefault(require("./routes/webhooks"));
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
const subscriptions_1 = __importDefault(require("./routes/subscriptions"));
const users_1 = __importDefault(require("./routes/users"));
const notifications_1 = __importDefault(require("./routes/notifications"));
// Mount webhook routes BEFORE JSON middleware so raw body is preserved for Stripe signature verification
app.use('/api/v1/webhooks', webhooks_1.default);
// Apply JSON middleware after webhooks
app.use(express_1.default.json());
app.use("/api/v1", schedule_http_1.default);
app.use("/api/v1", schedule_1.default);
app.use("/api/v1/standings", standings_1.default);
app.use("/api/v1", teams_1.default);
app.use("/api/v1", search_1.default);
app.use("/api/v1", predictions_1.default);
app.use("/api/v1", league_1.default);
app.use("/api/v1", players_1.default);
app.use("/api/v1/scoreboard", scoreboard_1.default);
app.use('/api/v1/logo', logo_1.default);
// Subscription management routes
app.use('/api/v1/subscriptions', subscriptions_1.default);
// User management routes
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/user', users_1.default);
// Notification management routes
app.use('/api/v1/notifications', notifications_1.default);
// Subscription success redirect handlers (from Stripe checkout)
// Both /subscription/success and /subscriptions/success for flexibility
const handleSubscriptionSuccess = async (req, res) => {
    try {
        const { session_id } = req.query;
        const templatesDir = path_1.default.join(__dirname, 'templates');
        if (!session_id) {
            const invalidTemplate = await promises_1.default.readFile(path_1.default.join(templatesDir, 'invalid.html'), 'utf-8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(400).send(invalidTemplate);
        }
        const subscriptionsService = await Promise.resolve().then(() => __importStar(require('./services/subscriptions'))).then(m => m.default);
        const result = await subscriptionsService.handleCheckoutSuccess(session_id);
        // Load success template and replace placeholders
        let successTemplate = await promises_1.default.readFile(path_1.default.join(templatesDir, 'success.html'), 'utf-8');
        const userName = `${result.data.user.first_name || ''} ${result.data.user.last_name || ''}`.trim();
        const statusClass = result.data.subscription.status === 'active' ? 'status-active' : 'status-trialing';
        const periodStart = result.data.subscription.currentPeriodStart ? new Date(result.data.subscription.currentPeriodStart).toLocaleDateString() : 'N/A';
        const periodEnd = result.data.subscription.currentPeriodEnd ? new Date(result.data.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A';
        const subscriptionId = result.data.subscription.id.substring(0, 20) + '...';
        console.log(`[SubscriptionsRouter] Parsed dates - Start: ${periodStart}, End: ${periodEnd}`);
        successTemplate = successTemplate
            .replace('{{USER_NAME}}', userName)
            .replace('{{USER_EMAIL}}', result.data.user.email)
            .replace('{{USER_CLERK_ID}}', result.data.user.clerk_id)
            .replace('{{SUBSCRIPTION_STATUS}}', result.data.subscription.status)
            .replace('{{STATUS_CLASS}}', statusClass)
            .replace('{{SUBSCRIPTION_ID}}', subscriptionId)
            .replace('{{PERIOD_START}}', periodStart)
            .replace('{{PERIOD_END}}', periodEnd);
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(successTemplate);
    }
    catch (error) {
        console.error('[SubscriptionsRouter] Error processing checkout success:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const templatesDir = path_1.default.join(__dirname, 'templates');
        try {
            let errorTemplate = await promises_1.default.readFile(path_1.default.join(templatesDir, 'error.html'), 'utf-8');
            errorTemplate = errorTemplate.replace('{{ERROR_MESSAGE}}', errorMessage);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(500).send(errorTemplate);
        }
        catch (templateError) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            return res.status(500).send(`
        <html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Error</h1>
          <p>${errorMessage}</p>
        </body></html>
      `);
        }
    }
};
app.get('/subscription/success', handleSubscriptionSuccess);
app.get('/subscriptions/success', handleSubscriptionSuccess);
// Subscription cancel redirect handler
app.get('/subscription/cancel', async (req, res) => {
    try {
        const templatesDir = path_1.default.join(__dirname, 'templates');
        const cancelTemplate = await promises_1.default.readFile(path_1.default.join(templatesDir, 'cancel.html'), 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(cancelTemplate);
    }
    catch (error) {
        console.error('[SubscriptionsRouter] Error loading cancel page:', error);
        return res.status(500).send('<html><body><h1>Error loading cancel page</h1></body></html>');
    }
});
app.get('/subscriptions/cancel', async (req, res) => {
    try {
        const templatesDir = path_1.default.join(__dirname, 'templates');
        const cancelTemplate = await promises_1.default.readFile(path_1.default.join(templatesDir, 'cancel.html'), 'utf-8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(cancelTemplate);
    }
    catch (error) {
        console.error('[SubscriptionsRouter] Error loading cancel page:', error);
        return res.status(500).send('<html><body><h1>Error loading cancel page</h1></body></html>');
    }
});
// Import WebSocket managers and services
const websocketManager_1 = require("./services/websocketManager");
const keyMoments_1 = require("./services/keyMoments");
const database_1 = require("./config/database");
const migrations_1 = require("./services/migrations");
const clerk_1 = __importDefault(require("./services/clerk"));
const fiveMinuteMarkCalculator_1 = require("./services/fiveMinuteMarkCalculator");
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
        else if (url?.startsWith("/api/v1/ws/play-by-play/")) {
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
    console.log('[Cleanup] Task started');
}
catch (error) {
    console.error('[Cleanup] Error starting cleanup task:', error);
}
try {
    websocketManager_1.scoreboardWebSocketManager.startBroadcasting();
    websocketManager_1.playbyplayWebSocketManager.startBroadcasting();
    console.log('[WebSocket] Broadcasting started');
}
catch (error) {
    console.error('[WebSocket] Error starting broadcasting:', error);
}
try {
    websocketManager_1.scoreboardWebSocketManager.startCleanupTask();
    websocketManager_1.playbyplayWebSocketManager.startCleanupTask();
    console.log('[WebSocket] Cleanup tasks started');
}
catch (error) {
    console.error('[WebSocket] Error starting cleanup tasks:', error);
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
        // Start Clerk auto sync AFTER database is ready
        try {
            clerk_1.default.startAutoSync();
            console.log('[Clerk] Auto sync started');
        }
        catch (error) {
            console.error('[Clerk] Error starting auto sync:', error);
        }
    }
    catch (error) {
        console.error('[Database] Failed to initialize connection:', error);
        console.log('[Database] Continuing without database connection - operation is non-critical');
    }
})();
if (isIISNode) {
    // IISNode provides PORT as a named pipe
    server.listen(process.env.PORT || 8000, () => {
        console.log('[Server] Running under IISNode on pipe:', process.env.PORT);
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
            console.error(`[Server] Port ${PORT} is already in use`);
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
    clerk_1.default.stopAutoSync();
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
    clerk_1.default.stopAutoSync();
    await (0, database_1.closeDatabase)();
    server.close();
    process.exit(0);
});
// Export server for IISNode
exports.default = server;
//# sourceMappingURL=index.js.map