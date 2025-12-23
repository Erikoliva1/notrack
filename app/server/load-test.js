/**
 * LOAD TESTING SCRIPT - DDOS SIMULATION
 * 
 * Simulates 100-500 concurrent connections hitting the server
 * to verify rate limiting and system stability under load.
 * 
 * Features:
 * - Configurable concurrent connections
 * - Configurable request rate
 * - Multiple endpoint testing
 * - Real-time statistics
 * - Rate limit verification
 * 
 * Usage:
 * node load-test.js [connections] [duration]
 * 
 * Examples:
 * node load-test.js 100 10    # 100 connections for 10 seconds
 * node load-test.js 500 30    # 500 connections for 30 seconds
 */

const http = require('http');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  host: 'localhost',
  port: 3000,
  // Number of concurrent connections (from command line or default)
  connections: parseInt(process.argv[2]) || 100,
  // Test duration in seconds (from command line or default)
  duration: parseInt(process.argv[3]) || 10,
  // Delay between requests per connection (ms)
  requestDelay: 100,
};

// ============================================================================
// ENDPOINTS TO TEST
// ============================================================================

const endpoints = [
  { method: 'GET', path: '/', name: 'Health Check' },
  { method: 'GET', path: '/api/health/redis', name: 'Redis Health' },
  { method: 'POST', path: '/api/auth/guest', name: 'Guest Auth (Rate Limited)' },
];

// ============================================================================
// STATISTICS TRACKING
// ============================================================================

const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  rateLimitedRequests: 0,
  errors: {},
  startTime: null,
  endTime: null,
  responseTimes: [],
};

// ============================================================================
// HTTP REQUEST FUNCTION
// ============================================================================

function makeRequest(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    
    const options = {
      hostname: config.host,
      port: config.port,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      stats.responseTimes.push(responseTime);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        stats.totalRequests++;
        
        if (res.statusCode === 200 || res.statusCode === 201) {
          stats.successfulRequests++;
        } else if (res.statusCode === 429) {
          // Rate limited
          stats.rateLimitedRequests++;
          stats.successfulRequests++; // Rate limiting is working as expected
        } else {
          stats.failedRequests++;
          const errorKey = `HTTP_${res.statusCode}`;
          stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
        }
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          endpoint: endpoint.name,
        });
      });
    });

    req.on('error', (error) => {
      stats.totalRequests++;
      stats.failedRequests++;
      const errorKey = error.code || 'UNKNOWN_ERROR';
      stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
      
      resolve({
        error: error.message,
        endpoint: endpoint.name,
      });
    });

    // For POST requests, send empty body
    if (endpoint.method === 'POST') {
      req.write(JSON.stringify({}));
    }

    req.end();
  });
}

// ============================================================================
// CONCURRENT CONNECTION SIMULATION
// ============================================================================

async function simulateConnection(connectionId) {
  const endTime = Date.now() + (config.duration * 1000);
  let requestCount = 0;

  while (Date.now() < endTime) {
    // Randomly select an endpoint
    const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
    
    // Make request
    const result = await makeRequest(endpoint);
    requestCount++;

    // Log interesting events
    if (result.statusCode === 429) {
      console.log(`[Connection ${connectionId}] ⚠️  Rate limited on ${endpoint.name}`);
    } else if (result.error) {
      console.log(`[Connection ${connectionId}] ❌ Error: ${result.error}`);
    }

    // Delay before next request
    await new Promise(resolve => setTimeout(resolve, config.requestDelay));
  }

  return requestCount;
}

// ============================================================================
// STATISTICS DISPLAY
// ============================================================================

function displayStatistics() {
  const duration = (stats.endTime - stats.startTime) / 1000;
  const avgResponseTime = stats.responseTimes.length > 0
    ? stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
    : 0;
  const minResponseTime = stats.responseTimes.length > 0
    ? Math.min(...stats.responseTimes)
    : 0;
  const maxResponseTime = stats.responseTimes.length > 0
    ? Math.max(...stats.responseTimes)
    : 0;
  
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                    LOAD TEST RESULTS                           ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n📊 TEST CONFIGURATION:`);
  console.log(`   Concurrent Connections: ${config.connections}`);
  console.log(`   Test Duration: ${config.duration}s`);
  console.log(`   Target: http://${config.host}:${config.port}`);
  
  console.log(`\n📈 PERFORMANCE METRICS:`);
  console.log(`   Total Requests: ${stats.totalRequests}`);
  console.log(`   Requests/sec: ${(stats.totalRequests / duration).toFixed(2)}`);
  console.log(`   Successful: ${stats.successfulRequests} (${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`   Failed: ${stats.failedRequests} (${((stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`   Rate Limited (429): ${stats.rateLimitedRequests}`);
  
  console.log(`\n⏱️  RESPONSE TIMES:`);
  console.log(`   Average: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   Minimum: ${minResponseTime}ms`);
  console.log(`   Maximum: ${maxResponseTime}ms`);
  
  if (Object.keys(stats.errors).length > 0) {
    console.log(`\n❌ ERRORS:`);
    Object.entries(stats.errors).forEach(([error, count]) => {
      console.log(`   ${error}: ${count}`);
    });
  }
  
  console.log(`\n🛡️  SECURITY ASSESSMENT:`);
  if (stats.rateLimitedRequests > 0) {
    console.log(`   ✅ Rate Limiting: WORKING (blocked ${stats.rateLimitedRequests} requests)`);
  } else {
    console.log(`   ⚠️  Rate Limiting: NOT TRIGGERED (increase load or check config)`);
  }
  
  if (stats.failedRequests === 0 || (stats.failedRequests / stats.totalRequests) < 0.01) {
    console.log(`   ✅ Server Stability: EXCELLENT (${((1 - stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}% success rate)`);
  } else if ((stats.failedRequests / stats.totalRequests) < 0.05) {
    console.log(`   ⚠️  Server Stability: GOOD (${((1 - stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}% success rate)`);
  } else {
    console.log(`   ❌ Server Stability: POOR (${((1 - stats.failedRequests / stats.totalRequests) * 100).toFixed(1)}% success rate)`);
  }
  
  console.log('\n════════════════════════════════════════════════════════════════\n');
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function runLoadTest() {
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('           DDOS SIMULATION - LOAD TEST STARTING                 ');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n🎯 Target: http://${config.host}:${config.port}`);
  console.log(`⚡ Concurrent Connections: ${config.connections}`);
  console.log(`⏱️  Duration: ${config.duration} seconds`);
  console.log(`\n🚀 Launching attack...\n`);

  stats.startTime = Date.now();

  // Create array of connection promises
  const connections = [];
  for (let i = 0; i < config.connections; i++) {
    connections.push(simulateConnection(i + 1));
  }

  // Wait for all connections to complete
  await Promise.all(connections);

  stats.endTime = Date.now();

  // Display results
  displayStatistics();
}

// ============================================================================
// START
// ============================================================================

// Check if server is reachable first
const testReq = http.get(`http://${config.host}:${config.port}/`, (res) => {
  console.log(`✅ Server is reachable (Status: ${res.statusCode})`);
  runLoadTest().catch(error => {
    console.error('Load test failed:', error);
    process.exit(1);
  });
});

testReq.on('error', (error) => {
  console.error(`\n❌ Cannot reach server at http://${config.host}:${config.port}`);
  console.error(`Error: ${error.message}`);
  console.error(`\nPlease ensure the server is running first:\n`);
  console.error(`  cd server`);
  console.error(`  npm run dev\n`);
  process.exit(1);
});
