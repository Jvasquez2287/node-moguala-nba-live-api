#!/usr/bin/env node
/**
 * Test script to send debug messages to log server
 * Demonstrates how to use the sendDebugLog function from other parts of the application
 */

const http = require('http');

// Function to send debug messages via internal function
// In real application, this would be called directly from services:
// import { sendDebugLog } from './routes/LogServerWs';
// sendDebugLog('DATABASE', 'Query executed', { rows: 42 });

// For this test, we'll simulate what would happen inside the application
async function testDebugMessages() {
  console.log('🧪 Testing Log Server Debug Messages\n');

  // Example 1: Simulate various debug messages that would come from different services
  const messages = [
    {
      category: 'DATABASE',
      message: 'Query executed successfully',
      data: { table: 'games', rows: 42, duration: '145ms' }
    },
    {
      category: 'CACHE',
      message: 'Cache hit for scoreboard',
      data: { key: 'scoreboard', ttl: '3600s' }
    },
    {
      category: 'WebSocket',
      message: 'Broadcast sent',
      data: { clients: 1, games: 10, type: 'scoreboard_update' }
    },
    {
      category: 'AUTH',
      message: 'User authenticated',
      data: { userId: 'user_123', provider: 'clerk' }
    },
    {
      category: 'API',
      message: 'Request processed',
      data: { endpoint: '/api/v1/schedule', method: 'GET', status: 200, duration: '34ms' }
    }
  ];

  console.log('These debug messages would be sent to log server clients:\n');
  messages.forEach((msg, index) => {
    console.log(`${index + 1}. [${msg.category}] ${msg.message}`);
    if (msg.data) {
      console.log(`   Data: ${JSON.stringify(msg.data)}\n`);
    }
  });

  // Check stats endpoint
  console.log('Checking log server stats...\n');
  
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/v1/logserver/stats',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const stats = JSON.parse(data);
          console.log('📊 Log Server Stats:');
          console.log(JSON.stringify(stats, null, 2));
        } catch (e) {
          console.log('Raw response:', data);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('Error getting stats:', error);
      resolve();
    });

    req.end();
  });
}

testDebugMessages().then(() => {
  console.log('\n✅ Test completed\n');
  console.log('📚 Usage in your code:\n');
  console.log('  import { sendDebugLog } from "./routes/LogServerWs";\n');
  console.log('  // Send debug message\n');
  console.log('  sendDebugLog("DATABASE", "Query executed", { rows: 42 });\n');
  console.log('  // In services:\n');
  console.log('  import { sendDebugLog } from "../routes/LogServerWs";\n');
  console.log('  sendDebugLog("SCHEDULE", "Fetched schedule", { games: 10 });\n');
});
