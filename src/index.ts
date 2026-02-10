import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import http from "http";
import { WebSocketServer } from "ws";
import fs from "fs/promises";

// Load environment variables
dotenv.config({ path: path.join( ".env") });

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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true }));

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
    }}
  });
});

// Cache refresh endpoint
app.post("/api/v1/cache/refresh", async (req, res) => {
  try {
    console.log('Manual cache refresh requested');
    const scoreboardData = await dataCache.refreshScoreboard();

    res.json({
      success: true,
      message: "Cache refreshed successfully",
      games: scoreboardData?.scoreboard?.games?.length || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
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
    const scoreboardData = await dataCache.getScoreboard();
    const games = scoreboardData?.scoreboard?.games || [];

    res.json({
      cacheStatus: games.length > 0 ? 'populated' : 'empty',
      games: games.length,
      timestamp: new Date().toISOString(),
      lastUpdate: scoreboardData?.scoreboard?.gameDate || 'unknown'
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({
      cacheStatus: 'error',
      error: 'Failed to get cache status'
    });
  }
});

// Test endpoint - Get user info by email
app.get("/api/v1/test/user/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log(`[Test] Fetching user info for email: ${email}`);
    
    const user = await clerkService.getUserByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        email: email
      });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        clerk_id: user.clerk_id,
        stripe_id: user.stripe_id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_image: user.profile_image,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Routes
import schedulev1Routes from "./routes/schedule_http";
import scheduleRoutes from "./routes/schedule";
import standingsRoutes from "./routes/standings";
import playerRoutes from "./routes/players";
import teamRoutes from "./routes/teams";
import searchRoutes from "./routes/search";
import predictionsRoutes from "./routes/predictions";
import leagueRoutes from "./routes/league";
import scoreboardRoutes from "./routes/scoreboard";
import logoRouter from "./routes/logo";
import webhooksRouter from "./routes/webhooks";
import subscriptionsRouter from "./routes/subscriptions";
import usersRouter from "./routes/users";
 
app.use(express.json());
app.use("/api/v1", schedulev1Routes);
app.use("/api/v1", scheduleRoutes);
app.use("/api/v1/standings", standingsRoutes);
app.use("/api/v1", teamRoutes);
app.use("/api/v1", searchRoutes);
app.use("/api/v1", predictionsRoutes);
app.use("/api/v1", leagueRoutes);
app.use("/api/v1", playerRoutes);
app.use("/api/v1/scoreboard", scoreboardRoutes);
app.use('/api/v1/logos', logoRouter);

// Webhook routes
app.use('/api/v1/webhooks', webhooksRouter);

// Subscription management routes
app.use('/api/v1/subscriptions', subscriptionsRouter); 
 
// User management routes
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/user', usersRouter);

// Subscription success redirect handlers (from Stripe checkout)
// Both /subscription/success and /subscriptions/success for flexibility
const handleSubscriptionSuccess = async (req: express.Request, res: express.Response) => {
  try {
    const { session_id } = req.query;
    const templatesDir = path.join(__dirname, 'templates');
    
    if (!session_id) {
      const invalidTemplate = await fs.readFile(path.join(templatesDir, 'invalid.html'), 'utf-8');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(400).send(invalidTemplate);
    }

    const subscriptionsService = await import('./services/subscriptions').then(m => m.default);
    const result = await subscriptionsService.handleCheckoutSuccess(session_id as string);
    
    // Load success template and replace placeholders
    let successTemplate = await fs.readFile(path.join(templatesDir, 'success.html'), 'utf-8');
    
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
    res.send(successTemplate);
  } catch (error) {
    console.error('[SubscriptionsRouter] Error processing checkout success:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const templatesDir = path.join(__dirname, 'templates');
    
    try {
      let errorTemplate = await fs.readFile(path.join(templatesDir, 'error.html'), 'utf-8');
      errorTemplate = errorTemplate.replace('{{ERROR_MESSAGE}}', errorMessage);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(500).send(errorTemplate);
    } catch (templateError) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(500).send(`
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
    res.send(cancelTemplate);
  } catch (error) {
    console.error('[SubscriptionsRouter] Error loading cancel page:', error);
    res.status(500).send('<html><body><h1>Error loading cancel page</h1></body></html>');
  }
});

app.get('/subscriptions/cancel', async (req: express.Request, res: express.Response) => {
  try {
    const templatesDir = path.join(__dirname, 'templates');
    const cancelTemplate = await fs.readFile(path.join(templatesDir, 'cancel.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(cancelTemplate);
  } catch (error) {
    console.error('[SubscriptionsRouter] Error loading cancel page:', error);
    res.status(500).send('<html><body><h1>Error loading cancel page</h1></body></html>');
  }
});

// Serve team logos as static files
const logosPath = path.join(__dirname, '..', 'assets', 'logos');
app.use('/api/v1/team-logo', express.static(logosPath));


// Import WebSocket managers and services
import {
  scoreboardWebSocketManager,
  playbyplayWebSocketManager
} from "./services/websocketManager";
import { dataCache } from "./services/dataCache";
import { startCleanupTask, stopCleanupTask } from "./services/keyMoments";
import { connectToDatabase, closeDatabase } from "./config/database";
import { migrationService } from "./services/migrations";
import clerkService from "./services/clerk";

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
      console.log('[WebSocket] ✅ Routing to scoreboard WebSocket manager');
      scoreboardWebSocketManager.handleConnection(ws);

    } else if (url?.startsWith("/api/v1/playbyplay/ws/")) {
      const gameId = url.split("/").pop();
      if (gameId) {
        console.log(`[WebSocket] ✅ Routing to playbyplay for game ${gameId}`);
        playbyplayWebSocketManager.handleConnection(ws, gameId);
      } else {
        console.log(`[WebSocket] ❌ No game ID found in URL: ${url}`);
        ws.close();
      }
    } else {
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
  console.log('Data cache polling started');
} catch (error) {
  console.error('Error starting data cache:', error);
}

try {
  startCleanupTask();
  console.log('Cleanup task started');
} catch (error) {
  console.error('Error starting cleanup task:', error);
}

try {
  scoreboardWebSocketManager.startBroadcasting();
  playbyplayWebSocketManager.startBroadcasting();
  console.log('WebSocket broadcasting started');
} catch (error) {
  console.error('Error starting WebSocket broadcasting:', error);
}

try {
  scoreboardWebSocketManager.startCleanupTask();
  playbyplayWebSocketManager.startCleanupTask();
  console.log('WebSocket cleanup tasks started');
} catch (error) {
  console.error('Error starting cleanup tasks:', error);
}

try {
  clerkService.startAutoSync();
  console.log('Clerk auto sync started');
} catch (error) {
  console.error('Error starting Clerk auto sync:', error);
}

// Start server
const PORT = parseInt(process.env.PORT || '8000');

// Initialize database connection
(async () => {
  try {
    await connectToDatabase();
    console.log('[Database] SQL Server connection initialized');
    
    // Run pending migrations
    await migrationService.runPendingMigrations();
  } catch (error) {
    console.error('[Database] Failed to initialize connection:', error);
    console.log('[Database] Continuing without database connection - operation is non-critical');
  }
})();

if (isIISNode) {
  // IISNode provides PORT as a named pipe
  server.listen(process.env.PORT || 8000, () => {
    console.log('Server running under IISNode on pipe:', process.env.PORT);
  });
} else {
  // Development mode
  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]:', err);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[Unhandled Rejection]:', reason);
  });

  server.on('error', (err: any) => {
    console.error('[Server Error Event]:', err.message);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
    }
  });

  server.on('clientError', (err: any, socket: any) => {
    console.error('[Client Error]:', err);
    socket.end();
  });

  
  try {
    console.log(`[Server] Attempting to listen on 0.0.0.0:${PORT}...`);
    server.listen(PORT, '0.0.0.0', () => {
      const addr = server.address() as any;
      console.log(`[Server] ✅ Successfully listening on ${addr?.address}:${addr?.port}`);
      console.log(`[WebSocket] Ready to accept WebSocket connections`);
    });
  } catch (err) {
    console.error(`[Server] Error calling listen():`, err);
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
  await scoreboardWebSocketManager.stopCleanupTask();
  await playbyplayWebSocketManager.stopCleanupTask();
  clerkService.stopAutoSync();
  await closeDatabase();
  server.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log('[Shutdown] SIGINT received - closing gracefully');
  await dataCache.stopPolling();
  await stopCleanupTask();
  await scoreboardWebSocketManager.stopCleanupTask();
  await playbyplayWebSocketManager.stopCleanupTask();
  clerkService.stopAutoSync();
  await closeDatabase();
  server.close();
  process.exit(0);
});

// Export server for IISNode
export default server;