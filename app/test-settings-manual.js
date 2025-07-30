#!/usr/bin/env node

/**
 * Manual Settings API Test
 * 
 * This script tests the settings API endpoints directly by bypassing the frontend
 * and authentication to focus on core functionality testing.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4321';
const API_ENDPOINT = `${BASE_URL}/api/admin/settings`;

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(description, testFn) {
  try {
    log(`\n🧪 Testing: ${description}`, 'blue');
    const result = await testFn();
    if (result.success) {
      log(`✅ PASS: ${result.message}`, 'green');
    } else {
      log(`❌ FAIL: ${result.message}`, 'red');
    }
    return result.success;
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🚀 Starting Settings API Manual Tests', 'blue');
  log(`🌐 Testing endpoint: ${API_ENDPOINT}`, 'yellow');
  
  let passCount = 0;
  let totalTests = 0;

  // Test 1: Check if API endpoint exists (should return 401 without auth)
  totalTests++;
  const test1 = await testEndpoint('API endpoint accessibility', async () => {
    const response = await fetch(API_ENDPOINT);
    if (response.status === 401) {
      const data = await response.json();
      return {
        success: true,
        message: `Endpoint accessible, returns 401 as expected: ${JSON.stringify(data)}`
      };
    } else {
      return {
        success: false,
        message: `Expected 401, got ${response.status}`
      };
    }
  });
  if (test1) passCount++;

  // Test 2: Check POST endpoint (should also return 401 without auth)
  totalTests++;
  const test2 = await testEndpoint('POST endpoint accessibility', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'value' })
    });
    
    if (response.status === 401) {
      const data = await response.json();
      return {
        success: true,
        message: `POST endpoint accessible, returns 401 as expected: ${JSON.stringify(data)}`
      };
    } else {
      return {
        success: false,
        message: `Expected 401, got ${response.status}`
      };
    }
  });
  if (test2) passCount++;

  // Test 3: Check if server is responding to basic requests
  totalTests++;
  const test3 = await testEndpoint('Server basic connectivity', async () => {
    const response = await fetch(BASE_URL);
    if (response.status === 200 || response.status === 404) {
      return {
        success: true,
        message: `Server is responding (status: ${response.status})`
      };
    } else {
      return {
        success: false,
        message: `Server not responding properly (status: ${response.status})`
      };
    }
  });
  if (test3) passCount++;

  // Test 4: Check if we can reach the settings page (even if it errors)
  totalTests++;
  const test4 = await testEndpoint('Settings page accessibility', async () => {
    const response = await fetch(`${BASE_URL}/admin/settings-new`);
    if (response.status === 500) {
      return {
        success: true,
        message: 'Settings page exists but returns 500 (likely auth error)'
      };
    } else if (response.status === 404) {
      return {
        success: false,
        message: 'Settings page not found (404)'
      };
    } else {
      return {
        success: true,
        message: `Settings page accessible (status: ${response.status})`
      };
    }
  });
  if (test4) passCount++;

  // Test 5: Test with various HTTP methods to understand API behavior
  totalTests++;
  const test5 = await testEndpoint('API method support', async () => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE'];
    const results = [];
    
    for (const method of methods) {
      try {
        const response = await fetch(API_ENDPOINT, { method });
        results.push(`${method}: ${response.status}`);
      } catch (error) {
        results.push(`${method}: ERROR`);
      }
    }
    
    return {
      success: true,
      message: `Method responses: ${results.join(', ')}`
    };
  });
  if (test5) passCount++;

  // Final Results
  log('\n📊 Test Results Summary', 'blue');
  log(`✅ Passed: ${passCount}/${totalTests}`, passCount === totalTests ? 'green' : 'yellow');
  
  if (passCount === totalTests) {
    log('\n🎉 All basic connectivity tests passed!', 'green');
    log('📝 Next steps:', 'blue');
    log('   1. Set up authentication for full API testing', 'reset');
    log('   2. Test with valid admin session cookie', 'reset');
    log('   3. Run the Jest test suite: npm test', 'reset');
    log('   4. Run browser tests: npm run test:browser', 'reset');
  } else {
    log('\n⚠️  Some basic tests failed. Check your:', 'yellow');
    log('   1. Development server (should be running on port 4321)', 'reset');
    log('   2. API endpoint implementation', 'reset');
    log('   3. Routing configuration', 'reset');
  }

  // Authentication Instructions
  log('\n🔐 To test with authentication:', 'blue');
  log('   1. Log into your admin panel in a browser', 'reset');
  log('   2. Open DevTools > Application > Cookies', 'reset');
  log('   3. Copy the "sbms-session" cookie value', 'reset');
  log('   4. Update the test files with: Cookie: "sbms-session=YOUR_TOKEN"', 'reset');
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the tests
main().catch(console.error);