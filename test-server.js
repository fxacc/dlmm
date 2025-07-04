#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync } from 'fs';

const testMCPServer = () => {
  console.log('Testing Puppeteer MCP Server...');
  
  const server = spawn('node', ['src/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let messageId = 1;

  const sendMessage = (message) => {
    const jsonMessage = JSON.stringify(message) + '\n';
    server.stdin.write(jsonMessage);
  };

  const sendInitialize = () => {
    sendMessage({
      jsonrpc: '2.0',
      id: messageId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });
  };

  const sendListTools = () => {
    sendMessage({
      jsonrpc: '2.0',
      id: messageId++,
      method: 'tools/list',
      params: {}
    });
  };

  server.stdout.on('data', (data) => {
    const messages = data.toString().split('\n').filter(Boolean);
    messages.forEach(message => {
      try {
        const parsed = JSON.parse(message);
        console.log('Received:', JSON.stringify(parsed, null, 2));
        
        if (parsed.method === 'notifications/initialized') {
          console.log('Server initialized, requesting tools list...');
          sendListTools();
        }
      } catch (e) {
        console.log('Raw output:', message);
      }
    });
  });

  server.stderr.on('data', (data) => {
    console.error('Server error:', data.toString());
  });

  server.on('close', (code) => {
    console.log(`Server exited with code ${code}`);
  });

  setTimeout(() => {
    console.log('Sending initialize message...');
    sendInitialize();
  }, 100);

  setTimeout(() => {
    console.log('Closing server...');
    server.kill();
  }, 5000);
};

testMCPServer();