import sql, { config } from 'mssql';
import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.join(process.cwd(), ".env") });

// SQL Server configuration using environment variables
const sqlConfig: config = {
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

let poolConnection: sql.ConnectionPool | null = null;

export async function connectToDatabase(): Promise<sql.ConnectionPool> {
  try {
    if (poolConnection && poolConnection.connected) {
      console.log('[Database] Already connected to SQL Server');
      return poolConnection;
    }

    console.log(`[Database] Connecting to SQL Server at ${sqlConfig.server}:${sqlConfig.port} with user ${sqlConfig.user}`);
    
    poolConnection = new sql.ConnectionPool(sqlConfig);
    
    poolConnection.on('error', (err: Error) => {
      console.error('[Database] Connection pool error:', err);
      poolConnection = null;
    });

    console.log('[Database] Initiating connection pool...');
    await poolConnection.connect();
    console.log('[Database] ✅ Successfully connected to SQL Server at', sqlConfig.server);
    return poolConnection;
  } catch (error) {
    console.error('[Database] ❌ Failed to connect to SQL Server:', error instanceof Error ? error.message : error);
    poolConnection = null;
    // Don't throw - connection is non-critical
    return null as any;
  }
}

export function getConnection(): sql.ConnectionPool | null {
  return poolConnection;
}

export async function executeQuery(query: string, params?: Record<string, any>): Promise<any> {
  try {
    if (!poolConnection || !poolConnection.connected) {
      await connectToDatabase();
    }

    const request = poolConnection!.request();

    // Add parameters if provided
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        request.input(key, value);
      }
    }

    const result = await request.query(query);
    return result;
  } catch (error) {
    console.error('[Database] Query execution error:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    if (poolConnection) {
      await poolConnection.close();
      poolConnection = null;
      console.log('[Database] Connection closed');
    }
  } catch (error) {
    console.error('[Database] Error closing connection:', error);
  }
}

export default {
  connectToDatabase,
  getConnection,
  executeQuery,
  closeDatabase
};
