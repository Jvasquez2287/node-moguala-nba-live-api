import { WebSocket } from 'ws';

interface AuthenticatedConnection {
  ws: WebSocket;
  username: string;
  connectedAt: number;
}

class LogServerManager {
  private connections: Map<string, AuthenticatedConnection> = new Map();
  private pendingConnections: Set<WebSocket> = new Set();
  private readonly MAX_CONNECTIONS = 2;
  private readonly DEBUG_USERNAME = process.env.LOG_SERVER_USERNAME || 'debug';
  private readonly DEBUG_PASSWORD = process.env.LOG_SERVER_PASSWORD || 'password';

  /**
   * Authenticate a client with username and password
   */
  private authenticateClient(username: string, password: string): boolean {
    return username === this.DEBUG_USERNAME && password === this.DEBUG_PASSWORD;
  }

  /**
   * Handle a new WebSocket connection
   */
  handleConnection(ws: WebSocket): void {
    // Check connection limit (including pending connections)
    const totalConnections = this.connections.size + this.pendingConnections.size;
    if (totalConnections >= this.MAX_CONNECTIONS) {
      console.log('[LogServer] ❌ Connection limit reached (2 connections max)');
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Connection limit reached. Maximum 2 concurrent connections allowed.'
      }));
      ws.close(1008, 'Policy violation - connection limit');
      return;
    }

    // Add to pending connections
    this.pendingConnections.add(ws);
    console.log('[LogServer] ✅ New connection attempt (Total pending: ' + this.pendingConnections.size + ', Active: ' + this.connections.size + '/2)');

    let clientId: string | null = null;
    let authenticated = false;

    // Send authentication prompt
    ws.send(JSON.stringify({
      type: 'auth_required',
      message: 'Please authenticate with username and password'
    }));

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle authentication
        if (!authenticated) {
          if (message.type === 'auth' && message.username && message.password) {
            if (this.authenticateClient(message.username, message.password)) {
              clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
              
              // Move from pending to authenticated
              this.pendingConnections.delete(ws);
              this.connections.set(clientId, {
                ws,
                username: message.username,
                connectedAt: Date.now()
              });
              authenticated = true;

              console.log(`[LogServer] ✅ Client authenticated: ${message.username} (ID: ${clientId})`);
              console.log(`[LogServer] Active connections: ${this.connections.size}/${this.MAX_CONNECTIONS}`);
              
              ws.send(JSON.stringify({
                type: 'auth_success',
                message: 'Authentication successful',
                clientId,
                connectedClients: this.connections.size
              }));

              // Broadcast connection update to all clients
              this.broadcastSystemMessage(`Client connected (${this.connections.size}/${this.MAX_CONNECTIONS} connections active)`);
            } else {
              console.log('[LogServer] ❌ Authentication failed - invalid credentials');
              ws.send(JSON.stringify({
                type: 'auth_failed',
                message: 'Invalid username or password'
              }));
              this.pendingConnections.delete(ws);
              ws.close(1008, 'Authentication failed');
            }
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid authentication message format. Expected: { type: "auth", username: "...", password: "..." }'
            }));
          }
        } else {
          // Handle other message types from authenticated clients
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        }
      } catch (error) {
        console.error('[LogServer] Error parsing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      // Remove from pending if not authenticated
      if (!authenticated) {
        this.pendingConnections.delete(ws);
        console.log(`[LogServer] Unauthenticated connection closed before authentication`);
      } else if (clientId) {
        this.connections.delete(clientId);
        console.log(`[LogServer] ✅ Client disconnected: ${clientId} (Remaining: ${this.connections.size}/${this.MAX_CONNECTIONS})`);
        this.broadcastSystemMessage(`Client disconnected (${this.connections.size}/${this.MAX_CONNECTIONS} connections active)`);
      }
    });

    // Handle errors
    ws.on('error', (error: Error) => {
      console.error('[LogServer] WebSocket error:', error);
      this.pendingConnections.delete(ws);
      if (clientId && authenticated) {
        this.connections.delete(clientId);
      }
    });
  }

  /**
   * Send a debug message to all connected clients
   */
  sendDebugMessage(category: string, message: string, data?: any): void {
    const debugMessage = JSON.stringify({
      type: 'debug',
      timestamp: new Date().toISOString(),
      category,
      message,
      data: data || null
    });

    this.broadcastToClients(debugMessage);
  }

  /**
   * Broadcast a system message to all connected clients
   */
  private broadcastSystemMessage(message: string): void {
    const systemMessage = JSON.stringify({
      type: 'System',
      timestamp: new Date().toISOString(),
      message
    });

    this.broadcastToClients(systemMessage);
  }

  /**
   * Broadcast raw message to all connected clients
   */
  private broadcastToClients(message: string): void {
    let successCount = 0;
    let failureCount = 0;
    const deadConnections: string[] = [];

    for (const [clientId, connection] of this.connections) {
      try {
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(message);
          successCount++;
        } else {
          console.warn(`[LogServer] Connection not OPEN (readyState: ${connection.ws.readyState}), marking as dead`);
          deadConnections.push(clientId);
          failureCount++;
        }
      } catch (error) {
        console.error('[LogServer] Error sending to client:', error);
        deadConnections.push(clientId);
        failureCount++;
      }
    }

    // Clean up dead connections
    deadConnections.forEach(clientId => {
      this.connections.delete(clientId);
      console.log(`[LogServer] Removed dead connection: ${clientId}`);
    });

    if (this.connections.size > 0) {
      console.log(`[LogServer] Message broadcast - Sent: ${successCount}, Failed: ${failureCount}, Active: ${this.connections.size}/${this.MAX_CONNECTIONS}`);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): { activeConnections: number; maxConnections: number; pendingConnections: number; clients: Array<{ id: string; username: string; connectedAt: number; uptime: string }> } {
    const clients = Array.from(this.connections.entries()).map(([id, conn]) => ({
      id,
      username: conn.username,
      connectedAt: conn.connectedAt,
      uptime: this.formatUptime(Date.now() - conn.connectedAt)
    }));

    return {
      activeConnections: this.connections.size,
      maxConnections: this.MAX_CONNECTIONS,
      pendingConnections: this.pendingConnections.size,
      clients
    };
  }

  /**
   * Format milliseconds to readable uptime string
   */
  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }

  /**
   * Close all connections and reset
   */
  reset(): void {
    for (const connection of this.pendingConnections) {
      try {
        connection.close();
      } catch (error) {
        console.error('[LogServer] Error closing pending connection:', error);
      }
    }
    
    for (const [clientId, connection] of this.connections) {
      try {
        connection.ws.close();
      } catch (error) {
        console.error(`[LogServer] Error closing connection ${clientId}:`, error);
      }
    }
    
    this.connections.clear();
    this.pendingConnections.clear();
    console.log('[LogServer] All connections closed and maps cleared');
  }
}

// Export singleton instance
export const logServer = new LogServerManager();
