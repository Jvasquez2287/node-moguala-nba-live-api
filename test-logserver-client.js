#!/usr/bin/env node
/**
 * Test client for Log Server WebSocket
 * Usage: node test-logserver-client.js [username] [password]
 */

const WebSocket = require('ws');

const username = process.argv[2] || 'debug';
const password = process.argv[3] || 'password';
const wsUrl = 'ws://localhost:8000/logserver/ws';

console.log(`\n🚀 Connecting to Log Server at ${wsUrl}`);
console.log(`📝 Authenticating as: ${username}\n`);

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
  console.log('✅ Connected to log server\n');
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    
    // Format output based on message type
    switch (message.type) {
      case 'auth_required':
        console.log('[AUTH REQUIRED]', message.message);
        // Send authentication
        console.log(`\n📤 Sending credentials...`);
        ws.send(JSON.stringify({
          type: 'auth',
          username,
          password
        }));
        break;
        
      case 'auth_success':
        console.log('\n✅ [AUTH SUCCESS]', message.message);
        console.log(`   Client ID: ${message.clientId}`);
        console.log(`   Active connections: ${message.connectedClients}/2\n`);
        console.log('📡 Listening for debug messages...\n');
        break;
        
      case 'auth_failed':
        console.log('\n❌ [AUTH FAILED]', message.message);
        ws.close();
        break;
        
      case 'debug':
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        console.log(`[${timestamp}] [${message.category}] ${message.message}`);
        if (message.data) {
          console.log('   DATA:', JSON.stringify(message.data, null, 2));
        }
        break;
        
      case 'system':
        const sysTime = new Date(message.timestamp).toLocaleTimeString();
        console.log(`[${sysTime}] [SYSTEM] ${message.message}`);
        break;
        
      case 'error':
        console.log('\n❌ [ERROR]', message.message);
        break;
        
      default:
        console.log('[MESSAGE]', message);
    }
  } catch (error) {
    console.log('Raw message:', data);
  }
});

ws.on('close', () => {
  console.log('\n❌ Connection closed');
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
});

// Keep the client running
process.on('SIGINT', () => {
  console.log('\n\n👋 Client disconnecting...');
  ws.close();
  process.exit(0);
});

console.log('Press Ctrl+C to exit\n');
