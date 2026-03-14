import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";

// Load environment variables
dotenv.config({ path: path.join(".env") });

// Fivicon and static files will be served from the "public" directory
const publicDir = path.join(__dirname, '..', '..', 'public');
if (!existsSync(publicDir)) {
  mkdirSync(publicDir);
}

// Detect IISNode environment - use multiple detection methods
const isIISNode = !!(
  process.env.IISNODE_VERSION ||
  process.env.APP_POOL_ID ||
  process.env.PLESK_BIN ||
  (process.cwd() && process.cwd().includes('vhosts')) ||
  require.main !== module
);

console.log('######################################');
console.log('IISNode detection:', isIISNode);
console.log('IISNODE_VERSION:', process.env.IISNODE_VERSION);
console.log('PLESK_BIN:', process.env.PLESK_BIN);
console.log('CWD:', process.cwd());
console.log('require.main !== module:', require.main !== module);
console.log('#######################################\n');

const app = express();

// Serve static files from the "public" directory
app.use(express.static(publicDir));

// Middleware - JSON will be applied after webhooks to preserve raw body for Stripe
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true })); // Allow CORS for all origins - adjust in production for security
// NOTE: express.json() is applied AFTER webhook routes to preserve raw body for Stripe signature verification

// Import services needed by early routes
import { dataCache } from "./services/dataCache";

// Health check
app.get("/", async (req, res) => {

  // Log incoming API requests with method, URL, and IP address
  console.log(`[API Request] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  sendDebugLog('API', `[API Request] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  const validationResult = await tokenCheckService.validateTokenAndCheckSubscription(req);
  if (!validationResult.valid) {
    sendDebugLog('API', `[API Request] Invalid or missing security parameters - IP: ${req.ip}`);
    return res.json({ success: false, error: 'Invalid or missing security parameters' });
  }

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
    sendDebugLog('API', 'Manual cache refresh requested');
    const scoreboardData = await dataCache.refreshScoreboard();

    return res.json({
      success: true,
      message: "Cache refreshed successfully",
      games: scoreboardData?.scoreboard?.games?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error refreshing cache:', error);
    sendDebugLog('API', `Error refreshing cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const scoreboardData = await dataCache.getScoreboard();
    const games = scoreboardData?.scoreboard?.games || [];

    return res.json({
      cacheStatus: games.length > 0 ? 'populated' : 'empty',
      games: games.length,
      timestamp: new Date().toISOString(),
      lastUpdate: scoreboardData?.scoreboard?.gameDate || 'unknown'
    });
  } catch (error) {
    console.error('Error getting cache status:', error);

    return res.json({
      cacheStatus: 'error',
      error: 'Failed to get cache status'
    });
  }
});

// Log server stats endpoint - Check active log server connections
app.get("/api/v1/logserver/stats", async (req, res) => {
  try {
    const stats = getLogServerStats();
    sendDebugLog('API', `Log server stats requested: ${JSON.stringify(stats)}`);
    return res.json({
      success: true,
      logserver: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting log server stats:', error);
    return res.json({
      success: false,
      error: 'Failed to get log server stats'
    });
  }
});

// API Endpoints interceptor for security and logging
app.use('/api/v1', async (req, res, next) => {

  if (app.use('/api/v1/webhooks', webhooksRouter)) {
    // Skip token validation for webhook routes to allow external services like Stripe to send data without needing a token
    return next();
  }
  //app.use('/api/v1/logo', logoRouter); 
  if (req.url.includes('logo') || req.url.includes('logos') || req.url.includes('/scoreboard') || req.url.includes('/schedule') || req.url.includes('/standings') || req.url.includes('/teams') || req.url.includes('/search') || req.url.includes('/league') || req.url.includes('/players')) {
    // Skip token validation for public data endpoints to allow free access to essential data without requiring a subscription, while still protecting user-specific and premium endpoints
    return next();
  }
  // Log incoming API requests with method, URL, and IP address
  console.log(`[API Request] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  sendDebugLog('API', `[API Request] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  const validationResult = await tokenCheckService.validateTokenAndCheckSubscription(req);
  if (!validationResult.valid) {
    return res.json({ success: false, error: 'Invalid or missing security parameters' });
  }

  if (validationResult.valid && validationResult.subscription?.subscription_status !== 'active' &&
    validationResult.subscription?.subscription_end_date &&
    new Date(validationResult.subscription.subscription_end_date) < new Date()) {

    return res.json({ success: false, error: 'Active subscription required to access this endpoint' });
  }

  // Add any authentication or rate limiting logic here if needed
  next();
});

// Routes
import webhooksRouter from "./routes/webhooks";
import schedulev1Routes from "./routes/schedule_http";
import scheduleRoutes from "./routes/schedule";
import standingsRoutes from "./routes/standings";
import playerRoutes from "./routes/players";
import teamRoutes from "./routes/teams";
import searchRoutes from "./routes/search";
import predictionsRoutes from "./routes/predictions";
import leagueRoutes from "./routes/league";
import scoreboardRoutes from "./routes/scoreboard";
import keyMomentsRouter from "./routes/keyMoments";
import logoRouter from "./routes/logo";
import subscriptionsRouter from "./routes/subscriptions";
import usersRouter from "./routes/users";
import notificationsRouter from "./routes/notifications";
import testRoutes from "./routes/testRoutes";

// Mount webhook routes (with raw body handling in the router itself)
app.use('/api/v1/webhooks', webhooksRouter);

// Apply JSON middleware after webhooks
app.use(express.json());

/** Routes **/
app.use("/api/v1", schedulev1Routes); // Keep old schedule routes for backward compatibility, but new ones should use /schedule
app.use("/api/v1", scheduleRoutes); // New schedule routes with improved performance and features
app.use("/api/v1/standings", standingsRoutes); // Standings routes mounted on /standings for clarity
app.use("/api/v1", teamRoutes); // Team routes mounted after schedule and standings to ensure they are accessible without subscription checks, as they are used in multiple places including the homepage and search
app.use("/api/v1", searchRoutes); // Search routes mounted after teams to ensure team search is accessible without subscription checks, as it's used in the homepage and other non-subscription areas
app.use("/api/v1", predictionsRoutes); // Predictions routes mounted after search and teams to ensure they are accessible without subscription checks, as they are used in the homepage and other non-subscription areas
app.use("/api/v1", leagueRoutes); // League routes mounted after teams to ensure they are accessible without subscription checks, as they are used in the homepage and other non-subscription areas
app.use("/api/v1", playerRoutes); // Player routes mounted after teams to ensure they are accessible without subscription checks, as they are used in the homepage and other non-subscription areas
app.use("/api/v1/scoreboard", scoreboardRoutes); // Scoreboard routes mounted on /scoreboard to avoid conflicts with schedule and ensure they are accessible without subscription checks, as they are used in the homepage and other non-subscription areas
app.use('/api/v1/key-moments', keyMomentsRouter); // Key moments routes - game-tying shots, lead changes, scoring runs, clutch plays, big shots
app.use('/api/v1/logo', logoRouter); // Logo routes mounted before subscriptions and users to ensure they are accessible without subscription checks
app.use('/api/v1/subscriptions', subscriptionsRouter); // Subscription management routes
app.use('/api/v1/users', usersRouter); // User management routes - moved after subscriptions to ensure any subscription checks in user routes have access to subscription data
app.use('/api/v1/user', usersRouter); // Alias for /users
app.use('/api/v1/notifications', notificationsRouter); // Notification management routes
app.use('/api/v1/test', testRoutes); // Test routes

// Subscription success redirect handlers (from Stripe checkout)
// Both /subscription/success and /subscriptions/success for flexibility
const handleSubscriptionSuccess = async (req: express.Request, res: express.Response) => {
  try {
    const { session_id } = req.query; 

    if (!session_id) {
      
      return res.json({ error: 'Invalid session ID' });
    }

    const subscriptionsService = await import('./services/subscriptions').then(m => m.default);
    const result = await subscriptionsService.handleCheckoutSuccess(session_id as string);

    if (!result.success || !result.data) {
      throw new Error(result.message || 'Failed to process checkout success');
    }
 
    const userName = `${result.data.user.first_name || ''} ${result.data.user.last_name || ''}`.trim();
    const statusClass = result.data.subscription.status === 'active' ? 'status-active' : 'status-trialing';
    const periodStart = result.data.subscription.currentPeriodStart ? new Date(result.data.subscription.currentPeriodStart).toLocaleDateString() : 'N/A';
    const periodEnd = result.data.subscription.currentPeriodEnd ? new Date(result.data.subscription.currentPeriodEnd).toLocaleDateString() : 'N/A';
    const subscriptionId = result.data.subscription.id.substring(0, 20) + '...';
    const invoicePdfUrl = result.data.subscription?.subscription_invoice_pdf_url || '';

    console.log(`[SubscriptionsRouter] Parsed dates - Start: ${periodStart}, End: ${periodEnd}`);

    return res.json({
      userName:  userName,
      email: result.data.user.email,
      subscriptionStatus: result.data.subscription.status,
      subscriptionId: subscriptionId,
      periodStart: periodStart,
      periodEnd: periodEnd,
      invoicePdfUrl: invoicePdfUrl ? invoicePdfUrl : 'N/A',
      statusClass: statusClass
    }).end(); // End response early to avoid potential issues with large template rendering in some environments

    
  } catch (error) {
    console.error('[SubscriptionsRouter] Error processing checkout success:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const templatesDir = path.join(__dirname, 'templates');

    try {
      let errorTemplate = await fs.readFile(path.join(templatesDir, 'error.html'), 'utf-8');
      errorTemplate = errorTemplate.replace('{{ERROR_MESSAGE}}', errorMessage);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(errorTemplate);
    } catch (templateError) {
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
app.get('/subscription/cancel', async (req: express.Request, res: express.Response) => {
  try {
    const templatesDir = path.join(__dirname, 'templates');
    const cancelTemplate = await fs.readFile(path.join(templatesDir, 'cancel.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    sendDebugLog('SubscriptionsRouter', 'Cancel page loaded successfully');
    return res.send(cancelTemplate);
  } catch (error) {
    console.error('[SubscriptionsRouter] Error loading cancel page:', error);
    sendDebugLog('SubscriptionsRouter', `Error loading cancel page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).send('<html><body><h1>Error loading cancel page</h1></body></html>');
  }
});

app.get('/subscriptions/cancel', async (req: express.Request, res: express.Response) => {
  try {
    const templatesDir = path.join(__dirname, 'templates');
    const cancelTemplate = await fs.readFile(path.join(templatesDir, 'cancel.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    sendDebugLog('SubscriptionsRouter', 'Cancel page loaded successfully');
    return res.send(cancelTemplate);
  } catch (error) {
    console.error('[SubscriptionsRouter] Error loading cancel page:', error);
    sendDebugLog('SubscriptionsRouter', `Error loading cancel page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return res.status(500).send('<html><body><h1>Error loading cancel page</h1></body></html>');
  }
});




// Import WebSocket managers and services
import {
  webSocketManager
} from "./services/websocketManager";
import { handleLogServerConnection, getLogServerStats, sendDebugLog } from "./routes/LogServerWs";
import { logServer } from "./services/LogServer";
import keyMomentsService, { startCleanupTask, stopCleanupTask, startProcessingTask, stopProcessingTask } from "./services/keyMoments";
import { connectToDatabase, closeDatabase } from "./config/database";
import { migrationService } from "./services/migrations";
import clerkService from "./services/clerk";
import { tokenCheckService } from "./services/tokenCheck";
import { FiveMinuteMarkCalculator } from "./services/fiveMinuteMarkCalculator";
import expoNotificationSystem from "./services/expoNotificationSystem";

// Create HTTP server and WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

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
  } catch (error) {
    console.error('[WebSocket] ❌ Error during upgrade:', error);
    socket.destroy();
  }
});
console.log('[Server Setup] Upgrade handler registered');

// WebSocket connection handling
wss.on("connection", (ws, req: any) => {
  const url = req.url;

  console.log(`[WebSocket] New connection - URL: "${url}"`);

  // Send immediate acknowledgement to all WebSocket connections
  try {
    // ws.send(JSON.stringify({ status: 'connected', message: 'WebSocket connection established' }));
    console.log('[WebSocket] ✅ Acknowledgement sent');
  } catch (error) {
    console.error('[WebSocket] ❌ Error sending acknowledgement:', error);
  }

  try {
    if (url === "/api/v1/ws" || url?.includes("api/v1/ws")) {
      sendDebugLog('WebSocket', `New connection - URL: "${url}"`);
      console.log('[WebSocket] ✅ Routing to scoreboard WebSocket manager');
      webSocketManager.handleConnection(ws);
    } else if (url === "/logserver/ws" || url?.includes("logserver/ws")) {
      console.log('[WebSocket] ✅ Routing to log server');
      sendDebugLog('WebSocket', `New connection - URL: "${url}"`);
      handleLogServerConnection(ws, req);
    } else {
      sendDebugLog('WebSocket', `Unknown URL: "${url}"`);
      console.log(`[WebSocket] ⚠️ Unknown URL: "${url}"`);
      // Don't close for unknown URLs, just log them
    }
  } catch (error) {
    console.error(`[WebSocket] ❌ Error handling connection:`, error);
  }
});

// Start background tasks only in development

try {
  dataCache.startPolling();
  sendDebugLog('DataCache', 'Data cache polling started');
  console.log('Data cache polling started');
} catch (error) {
  console.error('Error starting data cache:', error);
  sendDebugLog('DataCache', `Error starting data cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
}


try {
  webSocketManager.startBroadcasting();
  webSocketManager.startPBPBroadcasting();
  console.log('[WebSocket] Broadcasting started');
} catch (error) {
  console.error('[WebSocket] Error starting broadcasting:', error);
}

try {
  webSocketManager.startCleanupTask();
  webSocketManager.startPBPCleanupTask();
  console.log('[WebSocket] Cleanup tasks started');
} catch (error) {
  console.error('[WebSocket] Error starting cleanup tasks:', error);
}

try {
  expoNotificationSystem.startQueueCheck();
  console.log('[Expo] Notification system started');
} catch (error) {
  console.error('[Expo] Error starting notification system:', error);
  sendDebugLog('Expo', `Error starting notification system: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

// Key moments service - detects game-tying shots, lead changes, scoring runs, clutch plays, and big shots
try {
  startCleanupTask();
  console.log('[KeyMoments] Cleanup task started');
  sendDebugLog('KeyMoments', 'Cleanup task started');
} catch (error) {
  console.error('[KeyMoments] Error starting cleanup task:', error);
  sendDebugLog('KeyMoments', `Error starting cleanup task: ${error instanceof Error ? error.message : 'Unknown error'}`);
}

try {
  startProcessingTask();
  console.log('[KeyMoments] Moment detection task started');
  sendDebugLog('KeyMoments', 'Moment detection task started');
} catch (error) {
  sendDebugLog('KeyMoments', `Error starting processing task: ${error instanceof Error ? error.message : 'Unknown error'}`);
  console.error('[KeyMoments] Error starting processing task:', error);
}



// Start server
const PORT = isIISNode ? (process.env.PORT || 'nba-api.local') : parseInt(process.env.PORT || '8000');

// Initialize database connection
(async () => {
  try {
    await connectToDatabase();
    console.log('[Database] SQL Server connection initialized');
    sendDebugLog('Database', 'SQL Server connection initialized');

    // Run pending migrations
    await migrationService.runPendingMigrations();

    // Start Clerk auto sync AFTER database is ready
    try {
      clerkService.startAutoSync();
      console.log('[Clerk] Auto sync started');
      sendDebugLog('Clerk', 'Auto sync started');
    } catch (error) {
      console.error('[Clerk] Error starting auto sync:', error);
      sendDebugLog('Clerk', `Error starting auto sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    sendDebugLog('Database', `Failed to initialize connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('[Database] Failed to initialize connection:', error);
    console.log('[Database] Continuing without database connection - operation is non-critical');
  }
})();

if (isIISNode) {
  // IISNode provides PORT as a named pipe string - listen directly on it
  server.listen(PORT as string | number, () => {
    console.log('[Server] Running under IISNode on pipe:', PORT);
  });
} else {
  // Development mode
  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection]:', reason);
    sendDebugLog('Server', `Unhandled Rejection: ${reason instanceof Error ? reason.message : 'Unknown error'}`);
  });

  server.on('error', (err: any) => {
    console.error('[Server Error Event]:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server] Port ${PORT} is already in use`);
      process.exit(1);
    }
  });

  server.on('clientError', (err: any, socket: any) => {
    // Silently ignore protocol-related errors (e.g., TLS handshake on HTTP port)
    if (err.code === 'HPE_INVALID_METHOD' || err.code === 'HPE_HEADER_OVERFLOW') {
      // These are typically HTTPS traffic on HTTP port - just close connection quietly
      socket.end();
      return;
    }
    console.error('[Client Error]:', err.code, err.message);
    sendDebugLog('Server', `Client Error: ${err.code} - ${err.message}`);
    socket.end();
  });


  try {
    if (typeof PORT === 'string') {
      console.log(`[Server] Attempting to listen on named pipe ${PORT}...`);
      server.listen(PORT, () => {
        console.log(`[Server] ✅ Successfully listening on pipe: ${PORT}`);
        console.log(`[WebSocket] Ready to accept WebSocket connections`);

      });
    } else {
      console.log(`[Server] Attempting to listen on 0.0.0.0:${PORT}...`);
      server.listen(PORT, '0.0.0.0', () => {
        const addr = server.address() as any;
        console.log(`[Server] ✅ Successfully listening on ${addr?.address}:${addr?.port}`);
        console.log(`[WebSocket] Ready to accept WebSocket connections`);
      });
    }
  } catch (err) {
    console.error(`[Server] Error calling listen():`, err);
    sendDebugLog('Server', `Error calling listen(): ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Verify server is actually listening
  setInterval(() => {
    const addr = server.address() as any;
    console.log(`[Server Check] Listening: ${server.listening}, Address: ${addr?.address}:${addr?.port}`);
  }, 30000);
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log('[Shutdown] SIGTERM received - closing gracefully');
  await dataCache.stopPolling();
  await stopCleanupTask();
  await stopProcessingTask();
  await webSocketManager.stopCleanupTask();
  await webSocketManager.stopPBPCleanupTask();
  await expoNotificationSystem.stopQueueCheck();
  clerkService.stopAutoSync();
  await closeDatabase();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log('[Shutdown] SIGINT received - closing gracefully');
  await dataCache.stopPolling();
  await stopCleanupTask();
  await stopProcessingTask();
  await webSocketManager.stopCleanupTask();
  await webSocketManager.stopPBPCleanupTask();
  await expoNotificationSystem.stopQueueCheck();
  clerkService.stopAutoSync();
  await closeDatabase();
  server.close();
  process.exit(0);
});

// Export server for IISNode
export default server;