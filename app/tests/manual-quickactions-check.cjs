/**
 * Manual QuickActions Test Runner
 * Quick verification script to test the fixed QuickActions functionality
 * 
 * This script provides a simpler way to manually verify the fixes without
 * setting up full browser automation. Run this with Node.js to test the
 * API endpoints and basic functionality.
 */

const http = require('http');
const https = require('https');
const url = require('url');

const BASE_URL = 'http://localhost:4322';

// Helper function to make HTTP requests
function makeRequest(targetUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(targetUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'QuickActions-Test-Client',
        ...options.headers
      }
    };

    const req = protocol.request(requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          parsedBody: (() => {
            try {
              return JSON.parse(data);
            } catch (e) {
              return data;
            }
          })()
        });
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function testPageExists(path, testName) {
  console.log(`\\n🔍 Testing: ${testName}`);
  console.log(`   URL: ${BASE_URL}${path}`);
  
  try {
    const response = await makeRequest(`${BASE_URL}${path}`);
    
    if (response.statusCode === 200) {
      console.log(`   ✅ SUCCESS: Page loads (status: ${response.statusCode})`);
      return true;
    } else if (response.statusCode === 404) {
      console.log(`   ❌ FAILED: Page not found (status: ${response.statusCode})`);
      return false;
    } else {
      console.log(`   ⚠️  WARNING: Unexpected status (${response.statusCode})`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testSettingsAPI() {
  console.log(`\\n🔍 Testing: Settings API GET request`);
  console.log(`   URL: ${BASE_URL}/api/admin/settings`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/settings`);
    
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 200) {
      console.log(`   ✅ SUCCESS: API responds with 200`);
      console.log(`   Response: ${JSON.stringify(response.parsedBody, null, 2)}`);
      return true;
    } else if (response.statusCode === 401) {
      console.log(`   ⚠️  INFO: Authentication required (expected for admin endpoint)`);
      return true; // This is expected behavior
    } else {
      console.log(`   ❌ FAILED: Unexpected response`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

async function testSettingsAPIPost() {
  console.log(`\\n🔍 Testing: Settings API POST request`);
  console.log(`   URL: ${BASE_URL}/api/admin/settings`);
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/admin/settings`, {
      method: 'POST',
      body: { coming_soon_enabled: true }
    });
    
    console.log(`   Status: ${response.statusCode}`);
    
    if (response.statusCode === 401) {
      console.log(`   ⚠️  INFO: Authentication required (expected for admin endpoint)`);
      return true; // This is expected behavior
    } else if (response.statusCode === 200 || response.statusCode === 207) {
      console.log(`   ✅ SUCCESS: API accepts POST requests`);
      console.log(`   Response: ${JSON.stringify(response.parsedBody, null, 2)}`);
      return true;
    } else {
      console.log(`   ❌ FAILED: Unexpected response`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runQuickActionsTests() {
  console.log('🚀 QuickActions Manual Test Suite');
  console.log('=====================================');
  console.log(`Testing server at: ${BASE_URL}`);
  console.log('Note: Make sure your dev server is running on port 4322');
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Test 1: Admin Communications Page
  const test1 = await testPageExists('/admin/communications', 'Post Announcement Button Target');
  results.total++;
  if (test1) results.passed++; else results.failed++;
  
  // Test 2: Admin Hours Edit Page  
  const test2 = await testPageExists('/admin/hours/edit', 'Update Hours Button Target');
  results.total++;
  if (test2) results.passed++; else results.failed++;
  
  // Test 3: Admin Staff Edit Page
  const test3 = await testPageExists('/admin/staff/edit', 'Add Staff Button Target');
  results.total++;
  if (test3) results.passed++; else results.failed++;
  
  // Test 4: Settings API GET
  const test4 = await testSettingsAPI();
  results.total++;
  if (test4) results.passed++; else results.failed++;
  
  // Test 5: Settings API POST
  const test5 = await testSettingsAPIPost();
  results.total++;
  if (test5) results.passed++; else results.failed++;
  
  // Test 6: Admin Dashboard (where QuickActions is displayed)
  const test6 = await testPageExists('/admin/dashboard', 'Admin Dashboard (QuickActions Container)');
  results.total++;
  if (test6) results.passed++; else results.failed++;
  
  // Summary
  console.log('\\n📋 Test Results Summary');
  console.log('========================');
  console.log(`✅ Passed: ${results.passed}/${results.total}`);
  console.log(`❌ Failed: ${results.failed}/${results.total}`);
  
  if (results.failed === 0) {
    console.log('\\n🎉 All tests passed! Your QuickActions fixes appear to be working correctly.');
  } else {
    console.log('\\n⚠️  Some tests failed. Please check the output above for details.');
  }
  
  console.log('\\n📝 Next Steps:');
  console.log('1. Run the full Playwright test suite: npm run test:quickactions');
  console.log('2. Test manually in browser by visiting /admin/dashboard');
  console.log('3. Click each QuickActions button to verify navigation');
  console.log('4. Toggle the "Coming Soon" switch and verify API calls in browser dev tools');
  
  return results.failed === 0;
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runQuickActionsTests().catch(console.error);
}

module.exports = { runQuickActionsTests, testPageExists, testSettingsAPI };