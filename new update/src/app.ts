// Suppress deprecation warnings from dependencies (whatwg-url, uglify-js, etc.)
process.noDeprecation = true;

import express from 'express';
import * as http from 'http';
import * as WebSocket from 'ws';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as os from 'os';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import routes
import playerRouter from './routes/players';
import scheduleRouter from './routes/schedule';
import scoreboardRouter from './routes/scoreboard';
import standingsRouter from './routes/standings';
import teamRouter from './routes/teams';
import searchRouter from './routes/search';
import predictionsRouter from './routes/predictions';
import leagueRouter from './routes/league';
import logoRouter from './routes/logo';

// Import services
import { dataCache } from './services/dataCache';
import { scoreboardWebsocketManager, playbyplayWebsocketManager } from './services/websocketsManager';
import { startCleanupTask, stopCleanupTask } from './services/keyMoments';

// Import config
import { getFrontendUrl, getPort, getNbaApiKey } from './config';

// Create Express app
const app = express();
const server = http.createServer(app);
const port = getPort();

 
// Detect if running under Plesk IISNode
const isIISNode = !!(
    process.env.IISNODE_VERSION ||
    process.env.APPL_PHYSICAL_PATH ||
    process.env.PLESK_BIN ||
    (process.cwd && process.cwd().includes('vhosts'))
);



console.log('[Plesk IISNode Detection]');
console.log('  IISNODE_VERSION:', process.env.IISNODE_VERSION);
console.log('  APPL_PHYSICAL_PATH:', process.env.APPL_PHYSICAL_PATH);
console.log('  PLESK_BIN:', process.env.PLESK_BIN);
console.log('  CWD includes vhosts:', process.cwd().includes('vhosts'));
console.log('  => isIISNode:', isIISNode);

// Create WebSocket server with origin validation
const wss = new WebSocket.Server({ 
    server,
    perMessageDeflate: false, // Disable compression for better performance in IISNode
    clientTracking: true
});

// Log WebSocket upgrade attempts for debugging
server.on('upgrade', (request, socket, head) => {
    console.log(`[WebSocket Upgrade] Path: ${request.url}, Origin: ${request.headers.origin || 'no origin'}`);
});

// Handle WebSocket errors
wss.on('error', (error) => {
    console.log('[WebSocket Server Error]', error);
});

const isTestEnvironment =   true; // Set to true to disable rate limiting during tests

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max:  100, // limit each IP to 100 requests per windowMs
    message: {
        error: `Too many requests from this IP, please try again later. ${isTestEnvironment ? 1000 : 100}`,
        retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req, res) => isTestEnvironment,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Stricter rate limiting for search endpoints
const searchLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max:  10, // limit each IP to 10 search requests per minute
    message: {
        error: `Too many search requests, please try again later. ${isTestEnvironment ? 100 : 10}`,
        retryAfter: 60
    },
    skip: (req, res) => isTestEnvironment,
});

// Request timeout middleware (30 seconds)
app.use((req, res, next) => {
    const timeout = 30000; // 30 seconds
    const timer = setTimeout(() => {
        if (!res.headersSent) {
            res.status(408).json({
                error: 'Request timeout',
                message: 'The request took too long to process'
            });
        }
    }, timeout);

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
});

// CORS configuration
const frontendUrl = getFrontendUrl();
const allowedOrigins = ['*'];

if (frontendUrl !== '*') {
    allowedOrigins.length = 0; // Clear the array
    allowedOrigins.push(frontendUrl);

    // Always allow localhost for local development
    if (!frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1')) {
        allowedOrigins.push(
            'http://localhost:8000',
            'http://localhost:5173', // Vite default port
            'http://127.0.0.1:8000',
            'http://127.0.0.1:5173'
        );
    }
}

app.use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
});

// Helper function to get local LAN IP
function getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        if (!interfaces[name]) continue;
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// Health check endpoint with detailed status
app.get('/api/v1/health', (req, res) => {
    try {
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || 'development',
            isIISNode: isIISNode
        });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint with detailed status
app.get('/', (req, res) => {
    const health = {
        status: 'healthy',
        message: 'NBA Live API is running',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        server: isIISNode ? {
            type: 'IISNode',
            port: port,
            localIP: getLocalIP(),
            publicHost: req.headers.host,
            websocketUrl: `wss://${req.headers.host}`,
            websocketPlayByPlayUrl: `wss://${req.headers.host}/api/v1/ws/{gameId}/play-by-play`
        } : {
            type: 'Standalone',
            port: port,
            localIP: getLocalIP()
        },
        services: {
            nba_api: !!getNbaApiKey(),
            websocket: wss.clients.size,
            polling: dataCache.isPolling()
        }
    };
    
    // Return HTML status page if accessed from browser, JSON if accessed from API client
    const acceptHeader = req.headers.accept || '';
    if (acceptHeader.includes('text/html') && !acceptHeader.includes('application/json')) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>NBA Live API - Server Status</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
                    .container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; padding: 30px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
                    h1 { color: #333; margin-bottom: 10px; }
                    .status { display: inline-block; padding: 8px 16px; border-radius: 4px; background: #10b981; color: white; font-weight: bold; margin-bottom: 20px; }
                    .section { margin-bottom: 25px; }
                    .section h2 { color: #667eea; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 2px solid #667eea; padding-bottom: 8px; }
                    .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
                    .info-item { background: #f5f5f5; padding: 15px; border-radius: 4px; border-left: 4px solid #667eea; }
                    .info-label { font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .info-value { color: #333; margin-top: 5px; font-size: 14px; word-break: break-all; font-family: 'Courier New', monospace; }
                    .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-top: 8px; }
                    .badge.active { background: #d1fae5; color: #065f46; }
                    .badge.inactive { background: #fee2e2; color: #991b1b; }
                    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🏀 NBA Live API</h1>
                    <div class="status">✓ Healthy</div>
                    
                    <div class="section">
                        <h2>Server Information</h2>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Server Type</div>
                                <div class="info-value">${health.server.type}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Environment</div>
                                <div class="info-value">${health.environment}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Port</div>
                                <div class="info-value">${health.server.port}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Local IP</div>
                                <div class="info-value">${health.server.localIP}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Public Host</div>
                                <div class="info-value">${health.server.publicHost || 'N/A'}</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Uptime</div>
                                <div class="info-value">${Math.floor(health.uptime)}s</div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>WebSocket URLs</h2>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Scoreboard WebSocket</div>
                                <div class="info-value"><code>${health.server.websocketUrl}</code></div>
                            </div>
                            ${health.server.websocketPlayByPlayUrl ? `
                            <div class="info-item">
                                <div class="info-label">Play-by-Play WebSocket</div>
                                <div class="info-value"><code>${health.server.websocketPlayByPlayUrl}</code></div>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <div class="section">
                        <h2>Services Status</h2>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">NBA API</div>
                                <div class="info-value">
                                    <div class="badge ${health.services.nba_api ? 'active' : 'inactive'}">
                                        ${health.services.nba_api ? '✓ Configured' : '✗ Not Configured'}
                                    </div>
                                </div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">WebSocket Clients</div>
                                <div class="info-value">${health.services.websocket} connected</div>
                            </div>
                            <div class="info-item">
                                <div class="info-label">Data Polling</div>
                                <div class="info-value">
                                    <div class="badge ${health.services.polling ? 'active' : 'inactive'}">
                                        ${health.services.polling ? '✓ Active' : '✗ Inactive'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="section">
                        <h2>Timestamps</h2>
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="info-label">Current Time</div>
                                <div class="info-value">${health.timestamp}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
        res.set('Content-Type', 'text/html');
        res.send(html);
    } else {
        res.json(health);
    }
});

// Config check endpoint
app.get('/api/v1/config/check', (req, res) => {
    const groqKey = process.env.GROQ_API_KEY;
    res.json({
        groq_configured: groqKey !== undefined,
        groq_key_length: groqKey ? groqKey.length : 0,
    });
});

// Register API routes
app.use('/api/v1', playerRouter);
app.use('/api/v1', scheduleRouter);
app.use('/api/v1', scoreboardRouter);
app.use('/api/v1/standings', standingsRouter);
app.use('/api/v1', teamRouter);
app.use('/api/v1/search', searchLimiter); // Apply stricter rate limiting to search
app.use('/api/v1', searchRouter);
app.use('/api/v1/predictions', predictionsRouter);
app.use('/api/v1', leagueRouter);
app.use('/api/v1/logos', logoRouter);

// Serve team logos as static files
const logosPath = path.join(__dirname, '..', 'assets', 'logos');
app.use('/api/v1/team-logo', express.static(logosPath));

// WebSocket connection handling
wss.on('connection', (ws: WebSocket, req) => {
    const url = req.url;
    console.log(`[WebSocket Connected] URL: ${url}, Origin: ${req.headers.origin || 'none'}`);

    if (url === '/api/v1/ws') {
        console.log('[WebSocket] Connecting scoreboard WebSocket');
        scoreboardWebsocketManager.connect(ws);
    } else if (url?.startsWith('/api/v1/ws/') && url?.endsWith('/play-by-play')) {
        // Extract game_id from URL: /api/v1/ws/{game_id}/play-by-play
        const gameIdMatch = url.match(/^\/api\/v1\/ws\/([^\/]+)\/play-by-play$/);
        if (gameIdMatch) {
            const gameId = gameIdMatch[1];
            console.log(`[WebSocket] Connecting play-by-play WebSocket for game: ${gameId}`);
            playbyplayWebsocketManager.connect(ws, gameId);
        } else {
            console.log(`[WebSocket] Invalid play-by-play URL format: ${url}`);
            ws.close(1008, 'Invalid play-by-play WebSocket endpoint format');
        }
    } else {
        console.log(`[WebSocket] Invalid WebSocket endpoint: ${url}`);
        ws.close(1008, 'Invalid WebSocket endpoint');
    }
});

// Enhanced error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const statusCode = err.statusCode || err.status || 500;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Don't leak error details in production
    const errorResponse: any = {
        error: 'Internal server error',
        timestamp: new Date().toISOString(),
        path: req.originalUrl
    };

    if (isDevelopment) {
        errorResponse.message = err.message;
        errorResponse.stack = err.stack;
    }

    // Handle specific error types
    if (err.name === 'ValidationError') {
        errorResponse.error = 'Validation Error';
        errorResponse.details = err.details;
        return res.status(400).json(errorResponse);
    }

    if (err.name === 'UnauthorizedError') {
        errorResponse.error = 'Unauthorized';
        return res.status(401).json(errorResponse);
    }

    if (err.code === 'EBADCSRFTOKEN') {
        errorResponse.error = 'Invalid CSRF token';
        return res.status(403).json(errorResponse);
    }

    res.status(statusCode).json(errorResponse);
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Startup function
export async function startServer() {
    try {
        // Start background polling tasks that fetch data from NBA API
        await dataCache.startPolling();

        // Start key moments cleanup task
        startCleanupTask();

        // Start WebSocket cleanup tasks
        scoreboardWebsocketManager.startCleanupTask();
        playbyplayWebsocketManager.startCleanupTask();

        // Start broadcasting tasks
        setInterval(() => {
            try {
                scoreboardWebsocketManager.broadcastUpdates();
            } catch (error) {
                console.log('Error in scoreboard broadcasting interval:', error);
            }
        }, 4000); // Broadcast every 4 seconds

        setInterval(() => {
            try {
                playbyplayWebsocketManager.broadcastPlaybyplayUpdates( );
            } catch (error) {
                console.log('Error in play-by-play broadcasting interval:', error);
            }
        }, 2000); // Broadcast every 2 seconds

        // IISNode manages the HTTP server in Plesk environment

        // Graceful shutdown
        process.on('SIGTERM', async () => {
            await dataCache.stopPolling();
            stopCleanupTask();
            scoreboardWebsocketManager.stopCleanupTask();
            playbyplayWebsocketManager.stopCleanupTask();

            server.close(() => {
                process.exit(0);
            });
        });

        process.on('SIGTERM', async () => {
            await dataCache.stopPolling();
            stopCleanupTask();
            scoreboardWebsocketManager.stopCleanupTask();
            playbyplayWebsocketManager.stopCleanupTask();

            server.close(() => {
                process.exit(0);
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            console.log('Uncaught Exception:', error);
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            console.log('Unhandled Rejection at:', promise, 'reason:', reason);
            process.exit(1);
        });

    } catch (error) {
        console.log('Failed to start server:', error);
        process.exit(1);
    }
}

// Export app for testing and IISNode
export default app;
export { server };

// Initialize services when running under IISNode
// IISNode will attach the server to the HTTP handler
if (process.env.IISNODE_VERSION || process.env.APPL_PHYSICAL_PATH || process.env.PLESK_BIN || process.cwd().includes('vhosts')) {
    console.log('[Startup] Detected IISNode/Plesk environment - initializing services');
    startServer().catch(error => {
        console.log('[Startup Error] Failed to initialize services:', error);
    });
} else if (process.env.NODE_ENV === 'production') {
    console.log('[Startup] Production environment detected but not IISNode - initializing services anyway');
    startServer().catch(error => {
        console.log('[Startup Error] Failed to initialize services:', error);
    });
}