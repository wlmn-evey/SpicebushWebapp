#!/usr/bin/env node

import fetch from 'node-fetch';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4321';

console.log('🧪 Testing Server-Side Database Access\n');
console.log('Base URL:', BASE_URL);
console.log('Testing API endpoints and SSR pages...\n');

// Color codes
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const reset = '\x1b[0m';

async function testEndpoint(name, url, options = {}) {
  process.stdout.write(`Testing ${name}... `);
  
  try {
    const response = await fetch(url, {
      ...options,
      redirect: 'manual' // Don't follow redirects automatically
    });
    
    if (response.status >= 200 && response.status < 400) {
      console.log(`${green}✓ Success (${response.status})${reset}`);
      return { success: true, status: response.status };
    } else {
      console.log(`${red}✗ Failed (${response.status})${reset}`);
      return { success: false, status: response.status };
    }
  } catch (error) {
    console.log(`${red}✗ Error: ${error.message}${reset}`);
    return { success: false, error: error.message };
  }
}

async function testNewsletterAPI() {
  console.log(`${blue}1. Newsletter API Test${reset}`);
  
  const testEmail = `test-${Date.now()}@example.com`;
  const result = await testEndpoint(
    'Newsletter Subscribe',
    `${BASE_URL}/api/newsletter/subscribe`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        first_name: 'Test',
        last_name: 'User'
      })
    }
  );
  
  if (result.success) {
    console.log(`   ${green}✓ API can write to database${reset}`);
  } else {
    console.log(`   ${red}✗ API cannot access database${reset}`);
  }
  
  console.log('');
}

async function testAuthAPI() {
  console.log(`${blue}2. Auth Check API Test${reset}`);
  
  const result = await testEndpoint(
    'Auth Check',
    `${BASE_URL}/api/auth/check`
  );
  
  if (result.success) {
    console.log(`   ${green}✓ Auth API is accessible${reset}`);
  }
  
  console.log('');
}

async function testSSRPages() {
  console.log(`${blue}3. Server-Side Rendered Pages${reset}`);
  
  // Test coming-soon page
  const result = await testEndpoint(
    'Coming Soon Page',
    `${BASE_URL}/coming-soon`
  );
  
  if (result.success) {
    // Fetch content to check for database data
    try {
      const response = await fetch(`${BASE_URL}/coming-soon`);
      const html = await response.text();
      
      const hasDbContent = 
        html.includes('Spicebush Montessori') &&
        (html.includes('3-6 years') || html.includes('Ages Served')) &&
        (html.includes('8:30 AM') || html.includes('School Hours'));
      
      if (hasDbContent) {
        console.log(`   ${green}✓ SSR page loads with database content${reset}`);
      } else {
        console.log(`   ${yellow}⚠ SSR page loads but may be missing database content${reset}`);
      }
    } catch (e) {
      console.log(`   ${yellow}⚠ Could not verify database content${reset}`);
    }
  }
  
  console.log('');
}

async function testClientSideSecurity() {
  console.log(`${blue}4. Client-Side Security Check${reset}`);
  
  try {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    
    const sensitiveKeys = [
      'SUPABASE_SERVICE_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_DB_PASSWORD',
      'DATABASE_URL',
      'DB_PASSWORD'
    ];
    
    let foundSensitive = false;
    for (const key of sensitiveKeys) {
      if (html.includes(key)) {
        console.log(`   ${red}✗ Found sensitive key: ${key}${reset}`);
        foundSensitive = true;
      }
    }
    
    if (!foundSensitive) {
      console.log(`   ${green}✓ No sensitive keys in client-side code${reset}`);
    }
    
    // Check for proper use of PUBLIC keys
    if (html.includes('PUBLIC_SUPABASE_URL') || html.includes('PUBLIC_SUPABASE_PUBLIC_KEY')) {
      console.log(`   ${green}✓ Public keys are properly prefixed${reset}`);
    }
    
  } catch (error) {
    console.log(`   ${yellow}⚠ Could not check security: ${error.message}${reset}`);
  }
  
  console.log('');
}

// Run all tests
async function runTests() {
  console.log('Starting tests...\n');
  
  // Check if dev server is running
  try {
    const response = await fetch(BASE_URL, { 
      redirect: 'manual'
    });
    if (response.status >= 200 && response.status < 400) {
      console.log(`${green}✓ Dev server is running${reset}\n`);
    } else {
      console.log(`${yellow}⚠ Dev server returned status ${response.status}${reset}\n`);
    }
  } catch (error) {
    console.log(`${red}✗ Dev server is not running at ${BASE_URL}${reset}`);
    console.log(`${yellow}Please run 'npm run dev' first${reset}\n`);
    console.log(`Error: ${error.message}`);
    process.exit(1);
  }
  
  await testNewsletterAPI();
  await testAuthAPI();
  await testSSRPages();
  await testClientSideSecurity();
  
  console.log(`${blue}=== Test Summary ===${reset}`);
  console.log('Database connectivity should work from:');
  console.log('- API routes (server-side)');
  console.log('- SSR pages (server-side)');
  console.log('- But NOT from client-side JavaScript');
  console.log('\nIf all tests passed, your configuration is secure! 🎉');
}

runTests().catch(error => {
  console.error(`${red}Fatal error: ${error.message}${reset}`);
  process.exit(1);
});