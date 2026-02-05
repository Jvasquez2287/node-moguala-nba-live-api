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
        requestTimeout: 30000
    }
};
let poolConnection = null;
async function connectToDatabase() {
    try {
        if (poolConnection && poolConnection.connected) {
            console.log('[Database] Already connected to SQL Server');
            return poolConnection;
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
        return poolConnection;
    }
    catch (error) {
        console.error('[Database] ❌ Failed to connect to SQL Server:', error instanceof Error ? error.message : error);
        poolConnection = null;
        // Don't throw - connection is non-critical
        return null;
    }
}
function getConnection() {
    return poolConnection;
}
async function executeQuery(query, params) {
    try {
        if (!poolConnection || !poolConnection.connected) {
            await connectToDatabase();
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
        console.error('[Database] Query execution error:', error);
        throw error;
    }
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