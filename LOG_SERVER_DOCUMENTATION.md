# Log Server Implementation Documentation

## Overview

The **Log Server** is a WebSocket-based debug logging system that allows you to send and receive debug messages from anywhere in the NBA API application. It supports:

- ✅ **Secure Authentication** - Username/password protected
- ✅ **Connection Limiting** - Maximum 2 concurrent connections
- ✅ **Real-time Debug Messages** - Stream debug data to connected clients
- ✅ **System Notifications** - Track connection state changes
- ✅ **Statistics Endpoint** - Monitor active connections via HTTP

## Architecture

### Files Created

1. **`src/services/LogServer.ts`** - Core service managing WebSocket connections
   - Handles authentication and authorization
   - Enforces connection limits (max 2)
   - Broadcasts debug messages to all authenticated clients
   - Tracks pending and authenticated connections

2. **`src/routes/LogServerWs.ts`** - Route handler and exports
   - `handleLogServerConnection()` - Main WebSocket connection handler
   - `sendDebugLog()` - Send debug messages from anywhere in the app
   - `getLogServerStats()` - Get current connection statistics

3. **`src/index.ts`** - Integration points
   - Imports LogServer and routing handler
   - Registers `/logserver/ws` WebSocket endpoint
   - Adds `/api/v1/logserver/stats` HTTP endpoint for monitoring

## Configuration

### Environment Variables

```bash
# Optional: Set custom credentials (defaults shown)
LOG_SERVER_USERNAME=debug
LOG_SERVER_PASSWORD=password
```

## Usage

### WebSocket Connection

**URL:** `ws://localhost:8000/logserver/ws`

### Step 1: Connect & Authenticate

```javascript
const ws = new WebSocket('ws://localhost:8000/logserver/ws');

ws.onopen = () => {
  console.log('Connected');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'auth_required') {
    // Send authentication
    ws.send(JSON.stringify({
      type: 'auth',
      username: 'debug',
      password: 'password'
    }));
  } else if (message.type === 'auth_success') {
    console.log('Authenticated!', message.clientId);
  }
};
```

### Step 2: Receive Messages

```javascript
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'debug':
      console.log(`[${message.category}] ${message.message}`, message.data);
      break;
    case 'system':
      console.log(`[SYSTEM] ${message.message}`);
      break;
    case 'error':
      console.error(message.message);
      break;
  }
};
```

### Send Debug Messages

**From any service:**

```typescript
import { sendDebugLog } from '../routes/LogServerWs';

// Send a debug message
sendDebugLog('DATABASE', 'Query executed', { rows: 42, duration: '145ms' });
sendDebugLog('CACHE', 'Cache hit', { key: 'scoreboard' });
sendDebugLog('WebSocket', 'Broadcast sent', { clients: 2 });
```

**Example in a service:**

```typescript
// src/services/schedule.ts
import { sendDebugLog } from '../routes/LogServerWs';

export async function getSchedule(date: string) {
  try {
    const cache = await dataCache.getSchedule(date);
    if (cache) {
      sendDebugLog('SCHEDULE', 'Cache hit', { date, games: cache.length });
      return cache;
    }
    
    const schedule = await fetchNBASchedule(date);
    sendDebugLog('SCHEDULE', 'Fetched from API', { date, games: schedule.length });
    await dataCache.setSchedule(date, schedule);
    return schedule;
  } catch (error) {
    sendDebugLog('SCHEDULE', 'Error fetching schedule', { date, error: error.message });
    throw error;
  }
}
```

## Message Format

### Connection Messages

**Auth Required:**
```json
{
  "type": "auth_required",
  "message": "Please authenticate with username and password"
}
```

**Authentication Payload:**
```json
{
  "type": "auth",
  "username": "debug",
  "password": "password"
}
```

**Auth Success:**
```json
{
  "type": "auth_success",
  "message": "Authentication successful",
  "clientId": "client_1772640753769_0lhl15kzi",
  "connectedClients": 1
}
```

**Auth Failed:**
```json
{
  "type": "auth_failed",
  "message": "Invalid username or password"
}
```

### Debug Messages

**Format:**
```json
{
  "type": "debug",
  "timestamp": "2026-03-04T16:13:28.402Z",
  "category": "DATABASE",
  "message": "Query executed successfully",
  "data": {
    "table": "games",
    "rows": 42,
    "duration": "145ms"
  }
}
```

**System Message:**
```json
{
  "type": "system",
  "timestamp": "2026-03-04T16:13:28.402Z",
  "message": "Client connected (1/2 connections active)"
}
```

## HTTP Endpoints

### Get Log Server Statistics

**Endpoint:** `GET /api/v1/logserver/stats`

**Response:**
```json
{
  "success": true,
  "logserver": {
    "activeConnections": 1,
    "maxConnections": 2,
    "pendingConnections": 0,
    "clients": [
      {
        "id": "client_1772640753769_0lhl15kzi",
        "username": "debug",
        "connectedAt": 1772640753769,
        "uptime": "2m 34s"
      }
    ]
  },
  "timestamp": "2026-03-04T16:13:28.402Z"
}
```

## Security Features

### 1. Authentication
- **Username & Password:** Default credentials are `debug`/`password`
- **Customizable:** Set via `LOG_SERVER_USERNAME` and `LOG_SERVER_PASSWORD` env vars
- **Connection Rejection:** Invalid credentials result in immediate connection close

### 2. Connection Limits
- **Maximum 2 concurrent connections** (including pending)
- **Excess connections rejected** with policy violation error
- **Pending connection tracking** prevents race conditions

### 3. Message Validation
- All incoming messages are JSON parsed and validated
- Invalid message format results in error response
- Authenticated clients only receive/make protected calls

## Test Files Included

### 1. `test-logserver-client.js`
Simple test client that connects and listens for messages.

**Usage:**
```bash
node test-logserver-client.js debug password
```

### 2. `test-logserver-security.js`
Tests authentication failure and connection limit enforcement.

**Usage:**
```bash
node test-logserver-security.js
```

### 3. `test-send-debug.js`
Demonstrates the HTTP stats endpoint and debug message format.

**Usage:**
```bash
node test-send-debug.js
```

## Integration Examples

### Example 1: Debug League Operations

```typescript
// src/services/league.ts
import { sendDebugLog } from '../routes/LogServerWs';

export async function getLeagueLeaders() {
  sendDebugLog('LEAGUE', 'Fetching league leaders', { timestamp: new Date() });
  
  try {
    const leaders = await fetchLeagueLeaders();
    sendDebugLog('LEAGUE', 'Leaders fetched', { 
      count: leaders.length,
      categories: Object.keys(leaders[0] || {})
    });
    return leaders;
  } catch (error) {
    sendDebugLog('LEAGUE', 'Error fetching leaders', { 
      error: error.message,
      stack: error.stack?.split('\n')[0]
    });
    throw error;
  }
}
```

### Example 2: Debug Cache Operations

```typescript
// src/services/dataCache.ts
import { sendDebugLog } from '../routes/LogServerWs';

async set<T>(key: string, value: T, ttlMs?: number) {
  try {
    await executeQuery(...);
    sendDebugLog('CACHE', 'Set cache entry', { 
      key,
      ttl: ttlMs ? `${ttlMs}ms` : 'permanent',
      size: JSON.stringify(value).length
    });
  } catch (error) {
    sendDebugLog('CACHE', 'Cache set failed', { key, error: error.message });
  }
}
```

### Example 3: Debug WebSocket Operations

```typescript
// src/services/websocketManager.ts
import { sendDebugLog } from '../routes/LogServerWs';

private checkAndBroadcast() {
  const dataChanged = this.hasGameDataChanged(newGames, this.currentGames);
  
  if (dataChanged) {
    sendDebugLog('WebSocket', 'Broadcasting changes', {
      games: newGames.length,
      clients: this.activeConnections.size,
      type: 'scoreboard'
    });
  }
}
```

## Known Considerations

1. **Pending Connections**: Connections are tracked both pending (before auth) and authenticated
   - Prevents race condition where multiple rapid connections bypass limit
   - Unauthenticated connections that fail auth are automatically removed

2. **Real-time Broadcasting**: Debug messages are sent to ALL authenticated clients
   - Useful for multiple developers debugging simultaneously
   - Consider message volume in production

3. **No Message Persistence**: Messages are not stored; clients must be connected to receive
   - Implement message queue if persistence needed (Redis, RabbitMQ)

4. **No Message Filtering**: All clients receive all debug messages
   - Implement topic/category filtering if needed for large applications

## Performance Notes

- **Low Overhead:** Debug messages are JSON serialized once per message
- **Efficient Broadcasting:** Uses Set for dead connection cleanup
- **No Database Impact:** Messages are in-memory only, never persisted

## Future Enhancements

Potential improvements for future versions:

```typescript
// Topic/Category filtering
sendDebugLog('DATABASE', 'Query', data, { topic: 'queries-only' });

// Message buffering for disconnected clients
config.enableMessageBuffer = true; // Buffer last 100 messages

// Rate limiting per client
config.rateLimit = '100 messages/minute';

// Message compression
config.compression = 'gzip';
```

## Troubleshooting

### Connection Refused
- Verify server is running on port 8000
- Check firewall rules
- Confirm WebSocket endpoint: `ws://localhost:8000/logserver/ws`

### Authentication Failed
- Check username/password (default: `debug`/`password`)
- Verify `LOG_SERVER_USERNAME` and `LOG_SERVER_PASSWORD` env vars if customized
- Ensure connection isn't being rejected due to limit (max 2)

### No Messages Received
- Verify client successfully authenticated (received `auth_success`)
- Check that services are calling `sendDebugLog()` 
- Ensure services have imported the function correctly
- Check browser console or terminal for errors

### Connection Limit Reached
- Maximum 2 connections allowed simultaneously
- Disconnect one client before connecting a new one
- Check `/api/v1/logserver/stats` endpoint to see active connections
