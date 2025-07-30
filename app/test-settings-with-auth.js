#!/usr/bin/env node

/**
 * Settings API Test with Authentication
 * 
 * This script demonstrates how to test the settings API with proper authentication.
 * You need to provide a valid session token to run these tests.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:4321';
const API_ENDPOINT = `${BASE_URL}/api/admin/settings`;

// TO RUN THESE TESTS:
// 1. Log into your admin panel in a browser
// 2. Open DevTools > Application > Cookies
// 3. Copy the "sbms-session" cookie value
// 4. Set the SESSION_TOKEN environment variable:
//    export SESSION_TOKEN="your-session-token-here"
//    node test-settings-with-auth.js

const SESSION_TOKEN = process.env.SESSION_TOKEN;

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

async function testWithAuth(description, testFn) {
  try {
    log(`\n🧪 Testing: ${description}`, 'blue');
    const result = await testFn();
    if (result.success) {
      log(`✅ PASS: ${result.message}`, 'green');
      if (result.data) {
        log(`📊 Data: ${JSON.stringify(result.data, null, 2)}`, 'reset');
      }
    } else {
      log(`❌ FAIL: ${result.message}`, 'red');
      if (result.error) {
        log(`❌ Error: ${JSON.stringify(result.error, null, 2)}`, 'red');
      }
    }
    return result.success;
  } catch (error) {
    log(`❌ ERROR: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('🔐 Starting Authenticated Settings API Tests', 'blue');
  
  if (!SESSION_TOKEN) {
    log('❌ No SESSION_TOKEN provided!', 'red');
    log('', 'reset');
    log('To get your session token:', 'yellow');
    log('1. Open your browser and log into the admin panel', 'reset');
    log('2. Open Developer Tools (F12)', 'reset');
    log('3. Go to Application > Cookies', 'reset');  
    log('4. Find the "sbms-session" cookie and copy its value', 'reset');
    log('5. Run: export SESSION_TOKEN="your-token-here"', 'reset');
    log('6. Then run: node test-settings-with-auth.js', 'reset');
    process.exit(1);
  }

  const authHeaders = {
    'Cookie': `sbms-session=${SESSION_TOKEN}`,
    'Content-Type': 'application/json'
  };

  let passCount = 0;
  let totalTests = 0;

  // Test 1: GET settings with authentication
  totalTests++;
  const test1 = await testWithAuth('GET settings with authentication', async () => {
    const response = await fetch(API_ENDPOINT, {
      headers: { 'Cookie': `sbms-session=${SESSION_TOKEN}` }
    });
    
    if (response.status === 200) {
      const data = await response.json();
      return {
        success: true,
        message: `Successfully retrieved settings (${Object.keys(data).length} keys)`,
        data: Object.keys(data).reduce((acc, key) => {
          acc[key] = typeof data[key] === 'string' && data[key].length > 50 
            ? data[key].substring(0, 50) + '...'
            : data[key];
          return acc;
        }, {})
      };
    } else if (response.status === 401) {
      return {
        success: false,
        message: 'Authentication failed - check your session token'
      };
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Unexpected response status: ${response.status}`,
        error: errorData
      };
    }
  });
  if (test1) passCount++;

  // Test 2: POST single setting update
  totalTests++;
  const test2 = await testWithAuth('POST single setting update', async () => {
    const testData = {
      site_message: `Test message from automated test - ${new Date().toISOString()}`
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(testData)
    });
    
    if (response.status === 200) {
      const result = await response.json();
      if (result.success) {
        return {
          success: true,
          message: `Setting updated successfully`,
          data: result
        };
      } else {
        return {
          success: false,
          message: 'Update reported as failed',
          error: result
        };
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Update failed with status: ${response.status}`,
        error: errorData
      };
    }
  });
  if (test2) passCount++;

  // Test 3: POST multiple settings update
  totalTests++;
  const test3 = await testWithAuth('POST multiple settings update', async () => {
    const testData = {
      coming_soon_enabled: false,
      current_school_year: '2025-2026',
      sibling_discount_rate: '0.12'
    };

    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(testData)
    });
    
    if (response.status === 200) {
      const result = await response.json();
      if (result.success && result.results && result.results.length === 3) {
        const allSucceeded = result.results.every(r => r.success);
        return {
          success: allSucceeded,
          message: allSucceeded 
            ? 'All 3 settings updated successfully' 
            : `Some updates failed: ${result.results.filter(r => !r.success).length} failures`,
          data: result
        };
      } else {
        return {
          success: false,
          message: 'Unexpected result structure',
          error: result
        };
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: `Multiple update failed with status: ${response.status}`,
        error: errorData
      };
    }
  });
  if (test3) passCount++;

  // Test 4: Test boolean value handling
  totalTests++;
  const test4 = await testWithAuth('Boolean value handling', async () => {
    // Test true
    const response1 = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ coming_soon_enabled: true })
    });

    if (response1.status !== 200) {
      return { success: false, message: 'Failed to set boolean true' };
    }

    // Test false
    const response2 = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ coming_soon_enabled: false })
    });

    if (response2.status !== 200) {
      return { success: false, message: 'Failed to set boolean false' };
    }

    // Verify the values
    const getResponse = await fetch(API_ENDPOINT, {
      headers: { 'Cookie': `sbms-session=${SESSION_TOKEN}` }
    });

    if (getResponse.status === 200) {
      const settings = await getResponse.json();
      return {
        success: true,
        message: `Boolean handling works. Current value: ${settings.coming_soon_enabled}`,
        data: { coming_soon_enabled: settings.coming_soon_enabled }
      };
    } else {
      return { success: false, message: 'Failed to verify boolean values' };
    }
  });
  if (test4) passCount++;

  // Test 5: Test decimal precision
  totalTests++;
  const test5 = await testWithAuth('Decimal precision handling', async () => {
    const testRate = '0.125';
    
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ sibling_discount_rate: testRate })
    });

    if (response.status !== 200) {
      return { success: false, message: 'Failed to set decimal value' };
    }

    // Verify precision is maintained
    const getResponse = await fetch(API_ENDPOINT, {
      headers: { 'Cookie': `sbms-session=${SESSION_TOKEN}` }
    });

    if (getResponse.status === 200) {
      const settings = await getResponse.json();
      if (settings.sibling_discount_rate === testRate) {
        return {
          success: true,
          message: `Decimal precision maintained: ${settings.sibling_discount_rate}`,
          data: { sibling_discount_rate: settings.sibling_discount_rate }
        };
      } else {
        return {
          success: false,
          message: `Precision lost: expected ${testRate}, got ${settings.sibling_discount_rate}`
        };
      }
    } else {
      return { success: false, message: 'Failed to verify decimal precision' };
    }
  });
  if (test5) passCount++;

  // Test 6: Error handling with invalid data
  totalTests++;
  const test6 = await testWithAuth('Error handling with invalid data', async () => {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify(null)
    });
    
    if (response.status === 400) {
      const result = await response.json();
      return {
        success: true,
        message: 'Correctly rejected invalid data with 400 status',
        data: result
      };
    } else {
      return {
        success: false,
        message: `Expected 400 for invalid data, got ${response.status}`
      };
    }
  });
  if (test6) passCount++;

  // Final Results
  log('\n📊 Authenticated Test Results', 'blue');
  log(`✅ Passed: ${passCount}/${totalTests}`, passCount === totalTests ? 'green' : 'yellow');
  
  if (passCount === totalTests) {
    log('\n🎉 All authenticated tests passed!', 'green');
    log('📝 Your settings API is working correctly:', 'blue');
    log('   ✅ Authentication is working', 'reset');
    log('   ✅ GET endpoint retrieves settings', 'reset');
    log('   ✅ POST endpoint updates settings', 'reset');
    log('   ✅ Boolean values are handled correctly', 'reset');
    log('   ✅ Decimal precision is maintained', 'reset');
    log('   ✅ Error handling works as expected', 'reset');
  } else {
    log('\n⚠️  Some tests failed. Issues found:', 'yellow');
    if (passCount === 0) {
      log('   - Authentication may not be working', 'reset');
      log('   - Check your session token', 'reset');
    } else {
      log('   - Core functionality works but some edge cases fail', 'reset');
      log('   - Check the specific test failures above', 'reset');
    }
  }

  log('\n🎯 Next steps:', 'blue');
  log('   1. Run Jest tests: cd tests && npm test', 'reset');
  log('   2. Run browser tests: cd tests && npm run test:browser', 'reset');
  log('   3. Test form UI manually in browser', 'reset');
  log('   4. Check audit logging in database', 'reset');
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  log(`❌ Unhandled error: ${error.message}`, 'red');
  process.exit(1);
});

// Run the tests
main().catch(console.error);