/**
 * k6 Load Testing Script
 * 
 * Tests WebSocket connection handling and WebRTC signaling under load
 * 
 * Scenarios:
 * 1. Ramp up to 100 users
 * 2. Sustain 500 concurrent users
 * 3. Stress test with 1000 users
 * 4. Ramp down gracefully
 * 
 * Metrics:
 * - Connection establishment time
 * - Extension assignment time
 * - Call setup latency
 * - Socket message throughput
 * - Error rates
 * 
 * Usage:
 * k6 run tests/load/load-test.k6.js
 * k6 run --vus 100 --duration 30s tests/load/load-test.k6.js
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

// Custom metrics
const connectionTime = new Trend('connection_time');
const extensionAssignmentTime = new Trend('extension_assignment_time');
const callSetupTime = new Trend('call_setup_time');
const messageRate = new Counter('messages_sent');
const errorRate = new Rate('errors');
const successfulConnections = new Counter('successful_connections');
const failedConnections = new Counter('failed_connections');

// Test configuration
export const options = {
  scenarios: {
    // Scenario 1: Gradual ramp-up (warm-up)
    warmup: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 100 },
      ],
      gracefulRampDown: '30s',
      startTime: '0s',
    },
    
    // Scenario 2: Sustained load test
    sustained: {
      executor: 'constant-vus',
      vus: 500,
      duration: '3m',
      startTime: '2m',
    },
    
    // Scenario 3: Stress test (spike)
    stress: {
      executor: 'ramping-vus',
      startVUs: 500,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 500 },
      ],
      gracefulRampDown: '30s',
      startTime: '5m',
    },
  },
  
  // Thresholds - test fails if these are not met
  thresholds: {
    'connection_time': ['p(95)<500'], // 95% of connections under 500ms
    'extension_assignment_time': ['p(95)<200'], // 95% under 200ms
    'call_setup_time': ['p(95)<1000'], // 95% under 1s
    'errors': ['rate<0.05'], // Error rate under 5%
    'successful_connections': ['count>1000'], // At least 1000 successful connections
    'ws_connecting': ['p(95)<500'], // WebSocket connection time
    'ws_msgs_received': ['count>10000'], // Minimum message throughput
  },
};

// Test data
const SERVER_URL = __ENV.SERVER_URL || 'ws://localhost:3000';
const extensions = [];

// Generate test extensions
for (let i = 1; i <= 1000; i++) {
  extensions.push(`test-${String(i).padStart(4, '0')}`);
}

export default function () {
  const url = SERVER_URL;
  const params = {
    headers: {
      'User-Agent': 'k6-load-test',
    },
    tags: { name: 'WebSocketConnection' },
  };

  const connectionStart = Date.now();
  let extensionAssigned = false;
  let assignedExtension = '';
  const messagesReceived = [];

  const res = ws.connect(url, params, function (socket) {
    const connectionEnd = Date.now();
    connectionTime.add(connectionEnd - connectionStart);
    successfulConnections.add(1);

    // Wait for extension assignment
    const extensionStart = Date.now();

    socket.on('open', () => {
      console.log('WebSocket connected');
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messagesReceived.push(message);
        
        // Track extension assignment
        if (message.extensionNumber && !extensionAssigned) {
          extensionAssigned = true;
          assignedExtension = message.extensionNumber;
          const extensionEnd = Date.now();
          extensionAssignmentTime.add(extensionEnd - extensionStart);
        }
        
        messageRate.add(1);
      } catch (e) {
        console.error('Failed to parse message:', e);
        errorRate.add(1);
      }
    });

    socket.on('error', (e) => {
      console.error('WebSocket error:', e);
      errorRate.add(1);
      failedConnections.add(1);
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Wait for extension assignment
    socket.setTimeout(function () {
      if (!extensionAssigned) {
        console.log('Extension not assigned within timeout');
        errorRate.add(1);
      }
    }, 5000);

    // Simulate user activity
    socket.setTimeout(function () {
      // Send a test call initiation
      if (extensionAssigned) {
        const callStart = Date.now();
        const targetExtension = extensions[Math.floor(Math.random() * extensions.length)];
        
        socket.send(JSON.stringify({
          type: 'call-user',
          targetExtension: targetExtension,
          offer: {
            type: 'offer',
            sdp: 'test-sdp-data'
          }
        }));
        
        messageRate.add(1);
        
        // Simulate call setup time
        socket.setTimeout(function () {
          const callEnd = Date.now();
          callSetupTime.add(callEnd - callStart);
        }, 1000);
      }
    }, 2000);

    // Keep connection alive for 10-30 seconds
    const connectionDuration = 10000 + Math.random() * 20000;
    socket.setTimeout(function () {
      socket.close();
    }, connectionDuration);
  });

  check(res, {
    'WebSocket connected': (r) => r && r.status === 101,
  }) || errorRate.add(1);

  // Add some randomness to user behavior
  sleep(Math.random() * 3);
}

// Teardown function
export function teardown(data) {
  console.log('Load test completed');
  console.log(`Total connections: ${successfulConnections.value + failedConnections.value}`);
  console.log(`Successful: ${successfulConnections.value}`);
  console.log(`Failed: ${failedConnections.value}`);
  console.log(`Messages sent: ${messageRate.value}`);
  console.log(`Error rate: ${(errorRate.value * 100).toFixed(2)}%`);
}
