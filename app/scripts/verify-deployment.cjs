#!/usr/bin/env node

/**
 * Deployment Verification Script
 * Verifies that the deployment is successful and all features are working
 */

const https = require('https');
const SITE_URL = 'https://spicebush-testing.netlify.app';

console.log('🚀 Verifying Deployment to: ' + SITE_URL);
console.log('=' .repeat(50) + '\n');

let totalChecks = 0;
let passedChecks = 0;

function check(name, condition, details = '') {
  totalChecks++;
  if (condition) {
    console.log(`✅ ${name}`);
    if (details) console.log(`   ${details}`);
    passedChecks++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
  }
}

async function getUrl(path) {
  return new Promise((resolve) => {
    const url = new URL(path, SITE_URL);
    const startTime = Date.now();
    
    https.get(url.href, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          time: Date.now() - startTime
        });
      });
    }).on('error', (err) => {
      resolve({ error: err.message });
    });
  });
}

async function runVerification() {
  console.log('1️⃣  Page Accessibility\n');
  
  // Test main pages
  const homepage = await getUrl('/');
  check('Homepage loads', homepage.status === 200, `Load time: ${homepage.time}ms`);
  
  const contact = await getUrl('/contact');
  check('Contact page loads', contact.status === 200, `Load time: ${contact.time}ms`);
  
  const programs = await getUrl('/programs');
  check('Programs page loads', programs.status === 200, `Load time: ${programs.time}ms`);
  
  const about = await getUrl('/about');
  check('About page loads', about.status === 200, `Load time: ${about.time}ms`);
  
  console.log('\n2️⃣  Performance Metrics\n');
  
  check('Homepage loads under 5s', homepage.time < 5000, `Actual: ${homepage.time}ms`);
  check('Homepage loads under 2s', homepage.time < 2000, `Target performance met`);
  
  console.log('\n3️⃣  Security Headers\n');
  
  const headers = homepage.headers;
  check('X-Frame-Options present', headers['x-frame-options'] === 'DENY');
  check('X-Content-Type-Options present', headers['x-content-type-options'] === 'nosniff');
  check('X-XSS-Protection present', headers['x-xss-protection'] === '1; mode=block');
  check('Strict-Transport-Security present', headers['strict-transport-security'] !== undefined);
  check('Referrer-Policy present', headers['referrer-policy'] !== undefined);
  
  console.log('\n4️⃣  API Endpoints\n');
  
  const health = await getUrl('/api/health');
  check('Health endpoint responds', health.status === 200);
  
  if (health.body) {
    try {
      const healthData = JSON.parse(health.body);
      check('Health returns JSON', true);
      check('Health includes status', healthData.status !== undefined, `Status: ${healthData.status}`);
      check('Health includes timestamp', healthData.timestamp !== undefined);
    } catch (e) {
      check('Health returns valid JSON', false, e.message);
    }
  }
  
  console.log('\n5️⃣  Authentication & Redirects\n');
  
  const admin = await getUrl('/admin');
  check('Admin page redirects when not authenticated', admin.status === 302 || admin.status === 301);
  
  const testEmail = await getUrl('/test-email');
  check('Test email page blocked in production', testEmail.status === 302 || testEmail.status === 404);
  
  console.log('\n6️⃣  Error Handling\n');
  
  const notFound = await getUrl('/this-page-does-not-exist-12345');
  check('404 handling works', notFound.status === 404 || notFound.status === 302, 
    'Netlify may use 302 redirects for 404s');
  
  console.log('\n7️⃣  Content Verification\n');
  
  check('Homepage has content', homepage.body && homepage.body.length > 1000, 
    `Content size: ${homepage.body ? homepage.body.length : 0} bytes`);
  check('Homepage contains Spicebush', homepage.body && homepage.body.includes('Spicebush'));
  check('Homepage contains Montessori', homepage.body && homepage.body.includes('Montessori'));
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 DEPLOYMENT VERIFICATION SUMMARY\n');
  console.log(`Total Checks: ${totalChecks}`);
  console.log(`Passed: ${passedChecks}`);
  console.log(`Failed: ${totalChecks - passedChecks}`);
  console.log(`Success Rate: ${Math.round((passedChecks/totalChecks) * 100)}%`);
  
  if (passedChecks === totalChecks) {
    console.log('\n🎉 DEPLOYMENT SUCCESSFUL - All checks passed!');
  } else if (passedChecks >= totalChecks * 0.8) {
    console.log('\n✅ DEPLOYMENT ACCEPTABLE - Most checks passed');
  } else {
    console.log('\n⚠️  DEPLOYMENT ISSUES - Review failed checks above');
  }
  
  // Special notes
  console.log('\n📝 Notes:');
  console.log('- Database connectivity requires Netlify env vars');
  console.log('- Email service requires valid Unione.io API key');
  console.log('- Admin features require authentication setup');
  console.log('- Full functionality needs environment configuration');
}

runVerification().catch(console.error);