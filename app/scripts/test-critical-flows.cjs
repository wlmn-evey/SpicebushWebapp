#!/usr/bin/env node

/**
 * Critical Flow Testing Script
 * Tests the most important user paths in the application
 */

require('dotenv').config({ path: '.env.local' });
const https = require('https');

const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://spicebushmontessori.org';

console.log('🧪 Testing Critical User Flows...');
console.log('================================\n');

// Test configurations
const tests = [
  {
    name: 'Homepage Load',
    path: '/',
    expectedStatus: 200,
    maxLoadTime: 5000
  },
  {
    name: 'Contact Page',
    path: '/contact',
    expectedStatus: 200,
    maxLoadTime: 3000
  },
  {
    name: 'Programs Page',
    path: '/programs',
    expectedStatus: 200,
    maxLoadTime: 3000
  },
  {
    name: 'About Page',
    path: '/about',
    expectedStatus: 200,
    maxLoadTime: 3000
  },
  {
    name: 'Admin Login',
    path: '/admin',
    expectedStatus: 200,
    maxLoadTime: 3000
  },
  {
    name: 'Health Check API',
    path: '/api/health',
    expectedStatus: 200,
    maxLoadTime: 1000
  },
  {
    name: '404 Page',
    path: '/non-existent-page',
    expectedStatus: 404,
    maxLoadTime: 2000
  }
];

let passedTests = 0;
let failedTests = 0;

// Test function
async function testEndpoint(test) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(test.path, SITE_URL);
    
    console.log(`Testing: ${test.name}`);
    console.log(`  URL: ${url.href}`);
    
    https.get(url.href, (res) => {
      const loadTime = Date.now() - startTime;
      const statusOk = res.statusCode === test.expectedStatus;
      const loadTimeOk = loadTime <= test.maxLoadTime;
      
      if (statusOk && loadTimeOk) {
        console.log(`  ✅ PASS - Status: ${res.statusCode}, Load time: ${loadTime}ms`);
        passedTests++;
      } else {
        if (!statusOk) {
          console.log(`  ❌ FAIL - Expected status ${test.expectedStatus}, got ${res.statusCode}`);
        }
        if (!loadTimeOk) {
          console.log(`  ❌ FAIL - Load time ${loadTime}ms exceeds max ${test.maxLoadTime}ms`);
        }
        failedTests++;
      }
      
      console.log('');
      resolve();
    }).on('error', (err) => {
      console.log(`  ❌ ERROR - ${err.message}`);
      console.log('');
      failedTests++;
      resolve();
    });
  });
}

// Run all tests sequentially
async function runTests() {
  console.log(`Testing against: ${SITE_URL}\n`);
  
  for (const test of tests) {
    await testEndpoint(test);
  }
  
  // Print summary
  console.log('================================');
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${passedTests}`);
  console.log(`   ❌ Failed: ${failedTests}`);
  console.log(`   📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`);
  
  if (failedTests > 0) {
    console.log('\n⚠️  Some tests failed. Review the output above for details.');
    process.exit(1);
  } else {
    console.log('\n🎉 All critical flows passed!');
  }
}

// Check if site is reachable
https.get(SITE_URL, (res) => {
  if (res.statusCode === 200 || res.statusCode === 301 || res.statusCode === 302) {
    runTests();
  } else {
    console.error(`❌ Site not reachable at ${SITE_URL} (Status: ${res.statusCode})`);
    console.log('   Make sure the site is deployed or running locally.');
    process.exit(1);
  }
}).on('error', (err) => {
  console.error(`❌ Cannot connect to ${SITE_URL}`);
  console.log(`   Error: ${err.message}`);
  console.log('   Make sure the site is deployed or running locally.');
  process.exit(1);
});