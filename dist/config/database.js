"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.getConnection = getConnection;
exports.executeQuery = executeQuery;
exports.closeDatabase = closeDatabase;
const mssql_1 = __importDefault(require("mssql"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env file
dotenv_1.default.config({ path: path_1.default.join(process.cwd(), ".env") });
// SQL Server configuration using environment variables
const sqlConfig = {
    server: process.env.DB_SERVER || '74.50.90.58',
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USER || 'db-xur',
    password: process.env.DB_PASSWORD || 'Ava+112511@',
    database: process.env.DB_NAME || 'master',
    options: {
        encrypt: true,
        trustServerCertificate: true, // For self-signed certificates
        connectTimeout: 30000,
        requestTimeout: 30000,
        cancelTimeout: 5000,
        enableArithAbort: true,
        abortTransactionOnError: true
    },
    pool: {
        max: 10,
        min: 1,
        idleTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        destroyTimeoutMillis: 5000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 200,
        propagateCreateError: false
    }
};
let poolConnection = null;
let connectionAttemptInProgress = false;
async function connectToDatabase() {
    try {
        // Avoid multiple simultaneous connection attempts
        if (connectionAttemptInProgress) {
            let retries = 0;
            while (connectionAttemptInProgress && retries < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }
            if (poolConnection && poolConnection.connected) {
                return poolConnection;
            }
        }
        if (poolConnection && poolConnection.connected) {
            console.log('[Database] Already connected to SQL Server');
            return poolConnection;
        }
        connectionAttemptInProgress = true;
        // Close existing pool if it's broken
        if (poolConnection) {
            try {
                await poolConnection.close();
            }
            catch (e) {
                // Ignore close errors
            }
            poolConnection = null;
        }
        console.log(`[Database] Connecting to SQL Server at ${sqlConfig.server}:${sqlConfig.port} with user ${sqlConfig.user}`);
        poolConnection = new mssql_1.default.ConnectionPool(sqlConfig);
        poolConnection.on('error', (err) => {
            console.error('[Database] Connection pool error:', err);
            poolConnection = null;
        });
        console.log('[Database] Initiating connection pool...');
        await poolConnection.connect();
        console.log('[Database] ✅ Successfully connected to SQL Server at', sqlConfig.server);
        connectionAttemptInProgress = false;
        return poolConnection;
    }
    catch (error) {
        console.error('[Database] ❌ Failed to connect to SQL Server:', error instanceof Error ? error.message : error);
        poolConnection = null;
        connectionAttemptInProgress = false;
        throw error;
    }
}
function getConnection() {
    return poolConnection;
}
async function executeQuery(query, params) {
    const maxRetries = 3;
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            // Ensure connection is valid
            if (!poolConnection || !poolConnection.connected) {
                const connection = await connectToDatabase();
                if (!connection) {
                    throw new Error('Failed to establish database connection');
                }
            }
            const request = poolConnection.request();
            // Add parameters if provided
            if (params) {
                for (const [key, value] of Object.entries(params)) {
                    request.input(key, value);
                }
            }
            const result = await request.query(query);
            return result;
        }
        catch (error) {
            lastError = error;
            const errorCode = error?.code;
            const isConnectionError = errorCode === 'ECONNCLOSED' ||
                errorCode === 'ESOCKET' ||
                errorCode === 'ETIMEDOUT' ||
                error?.message?.includes('Connection is closed') ||
                error?.message?.includes('Connection timeout');
            if (isConnectionError && attempt < maxRetries - 1) {
                console.warn(`[Database] Connection error on attempt ${attempt + 1}/${maxRetries}, retrying...`, errorCode);
                poolConnection = null; // Force reconnection
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
                continue;
            }
            console.error('[Database] Query execution error:', error);
            poolConnection = null; // Invalidate connection on error
            throw error;
        }
    }
    throw lastError || new Error('Database query failed');
}
async function closeDatabase() {
    try {
        if (poolConnection) {
            await poolConnection.close();
            poolConnection = null;
            console.log('[Database] Connection closed');
        }
    }
    catch (error) {
        console.error('[Database] Error closing connection:', error);
    }
}
exports.default = {
    connectToDatabase,
    getConnection,
    executeQuery,
    closeDatabase
};
//# sourceMappingURL=database.js.map