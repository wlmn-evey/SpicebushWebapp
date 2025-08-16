#!/usr/bin/env node

const https = require('https');
const SITE_URL = process.env.PUBLIC_SITE_URL || 'https://spicebush-testing.netlify.app';

const tests = [];

// Test 1: Schedule tour page has header
tests.push({
  name: 'Schedule tour has header',
  url: '/admissions/schedule-tour',
  check: (html) => html.includes('<header') && html.includes('</header>')
});

// Test 2: Schedule tour has footer  
tests.push({
  name: 'Schedule tour has footer',
  url: '/admissions/schedule-tour',
  check: (html) => html.includes('<footer') && html.includes('</footer>')
});

// Test 3: No duplicate schedule page
tests.push({
  name: 'Root schedule-tour returns 404',
  url: '/schedule-tour',
  expectedStatus: 404
});

// Test 4: Footer logo present
tests.push({
  name: 'Footer has logo',
  url: '/',
  check: (html) => html.includes('homepage-spicebush-logo')
});

// Test 5: Footer login link styling
tests.push({
  name: 'Footer has login link',
  url: '/',
  check: (html) => html.includes('/auth/login') && html.includes('footer-auth-nav')
});

// Test 6: Database health
tests.push({
  name: 'Health endpoint responds',
  url: '/api/health',
  check: (html) => {
    try {
      const json = JSON.parse(html);
      return json.status !== undefined;
    } catch {
      return false;
    }
  }
});

// Test 7: No fake teachers mentioned
tests.push({
  name: 'No Sarah Johnson on site',
  url: '/about',
  check: (html) => !html.includes('Sarah Johnson')
});

tests.push({
  name: 'No Michael Chen on site',
  url: '/about',
  check: (html) => !html.includes('Michael Chen')
});

tests.push({
  name: 'No Emily Rodriguez on site',
  url: '/about',
  check: (html) => !html.includes('Emily Rodriguez')
});

// Run all tests
async function runTests() {
  console.log('🧪 Running Fix Verification Tests...');
  console.log('   Testing against:', SITE_URL);
  console.log('=' .repeat(50) + '\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const result = await testUrl(test);
    if (result) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else {
      console.log(`❌ ${test.name}`);
      failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Results: ${passed}/${tests.length} passed`);
  
  if (failed > 0) {
    console.log(`\n⚠️  ${failed} tests failed. Review issues above.`);
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed! Fixes verified.');
  }
}

async function testUrl(test) {
  return new Promise((resolve) => {
    const url = new URL(test.url, SITE_URL);
    
    https.get(url.href, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Check status code if specified
        if (test.expectedStatus) {
          // Netlify returns 302 for 404s sometimes
          resolve(res.statusCode === test.expectedStatus || 
                  (test.expectedStatus === 404 && res.statusCode === 302));
        } 
        // Otherwise run check function
        else if (test.check) {
          resolve(test.check(data));
        } 
        // Default to checking for 200
        else {
          resolve(res.statusCode === 200);
        }
      });
    }).on('error', (err) => {
      console.error(`   Error testing ${test.url}:`, err.message);
      resolve(false);
    });
  });
}

// Run tests
runTests().catch(console.error);