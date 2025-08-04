#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Get environment variables
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4321';

console.log(`${colors.blue}=== Database Connection Verification ===${colors.reset}\n`);

// Check if environment variables are set
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(`${colors.red}❌ Error: Supabase environment variables not set${colors.reset}`);
  console.log('Please ensure the following are set:');
  console.log('- PUBLIC_SUPABASE_URL');
  console.log('- PUBLIC_SUPABASE_PUBLIC_KEY or PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log(`${colors.green}✓ Environment variables loaded${colors.reset}`);
console.log(`  SUPABASE_URL: ${SUPABASE_URL}`);
console.log(`  ANON_KEY: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
console.log(`  BASE_URL: ${BASE_URL}\n`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testDirectConnection() {
  console.log(`${colors.blue}1. Testing Direct Supabase Connection${colors.reset}`);
  
  try {
    // Test 1: Read settings table
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('key')
      .limit(1);
    
    if (settingsError) {
      console.log(`${colors.red}  ❌ Failed to read settings table: ${settingsError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}  ✓ Successfully connected to settings table${colors.reset}`);
    }
    
    // Test 2: Read newsletter_subscribers table
    const { data: subscribers, error: subscribersError } = await supabase
      .from('newsletter_subscribers')
      .select('email')
      .limit(1);
    
    if (subscribersError) {
      console.log(`${colors.red}  ❌ Failed to read newsletter_subscribers table: ${subscribersError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}  ✓ Successfully connected to newsletter_subscribers table${colors.reset}`);
    }
    
    // Test 3: Check auth functionality
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError && authError.message !== 'Auth session missing!') {
      console.log(`${colors.red}  ❌ Auth system error: ${authError.message}${colors.reset}`);
    } else {
      console.log(`${colors.green}  ✓ Auth system is responsive${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.red}  ❌ Direct connection failed: ${error.message}${colors.reset}`);
  }
  
  console.log('');
}

async function testAPIRoutes() {
  console.log(`${colors.blue}2. Testing API Routes${colors.reset}`);
  
  try {
    // Test newsletter subscription endpoint
    const testEmail = `test-verify-${Date.now()}@example.com`;
    const response = await fetch(`${BASE_URL}/api/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        first_name: 'Test',
        last_name: 'Verify'
      })
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`${colors.green}  ✓ Newsletter API endpoint working${colors.reset}`);
      
      // Clean up test data
      await supabase
        .from('newsletter_subscribers')
        .delete()
        .eq('email', testEmail);
    } else {
      console.log(`${colors.red}  ❌ Newsletter API failed: ${result.error || 'Unknown error'}${colors.reset}`);
    }
    
    // Test auth check endpoint
    const authResponse = await fetch(`${BASE_URL}/api/auth/check`);
    const authResult = await authResponse.json();
    
    if (authResponse.ok) {
      console.log(`${colors.green}  ✓ Auth check API endpoint working${colors.reset}`);
    } else {
      console.log(`${colors.red}  ❌ Auth check API failed${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.yellow}  ⚠ API route test failed - is the dev server running?${colors.reset}`);
    console.log(`    Error: ${error.message}`);
  }
  
  console.log('');
}

async function testServerSideRendering() {
  console.log(`${colors.blue}3. Testing Server-Side Rendering${colors.reset}`);
  
  try {
    const response = await fetch(`${BASE_URL}/coming-soon`);
    const html = await response.text();
    
    if (response.ok) {
      // Check for database-driven content
      const hasSchoolInfo = html.includes('3-6 years old') || html.includes('Ages Served');
      const hasTuitionInfo = html.includes('Family Income Tuition') || html.includes('FIT');
      const hasHoursInfo = html.includes('8:30 AM') || html.includes('School Hours');
      
      if (hasSchoolInfo && hasTuitionInfo && hasHoursInfo) {
        console.log(`${colors.green}  ✓ SSR page loads with database content${colors.reset}`);
      } else {
        console.log(`${colors.yellow}  ⚠ SSR page loads but may be missing database content${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}  ❌ Failed to load SSR page${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.yellow}  ⚠ SSR test failed - is the dev server running?${colors.reset}`);
    console.log(`    Error: ${error.message}`);
  }
  
  console.log('');
}

async function checkClientSideSecurity() {
  console.log(`${colors.blue}4. Checking Client-Side Security${colors.reset}`);
  
  try {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    
    // Check for sensitive keys in HTML
    const hasSensitiveKeys = 
      html.includes('SUPABASE_SERVICE_KEY') ||
      html.includes('SUPABASE_DB_PASSWORD') ||
      html.includes('DATABASE_URL') ||
      html.includes('process.env.SUPABASE_SERVICE_KEY');
    
    if (!hasSensitiveKeys) {
      console.log(`${colors.green}  ✓ No sensitive keys found in client-side code${colors.reset}`);
    } else {
      console.log(`${colors.red}  ❌ WARNING: Sensitive keys may be exposed in client-side code${colors.reset}`);
    }
    
    // Check if PUBLIC keys are properly used
    const hasPublicKey = html.includes('PUBLIC_SUPABASE_URL');
    if (hasPublicKey) {
      console.log(`${colors.green}  ✓ Public keys are being used appropriately${colors.reset}`);
    }
    
  } catch (error) {
    console.log(`${colors.yellow}  ⚠ Security check failed - is the dev server running?${colors.reset}`);
    console.log(`    Error: ${error.message}`);
  }
  
  console.log('');
}

// Run all tests
async function runAllTests() {
  await testDirectConnection();
  await testAPIRoutes();
  await testServerSideRendering();
  await checkClientSideSecurity();
  
  console.log(`${colors.blue}=== Verification Complete ===${colors.reset}\n`);
  console.log('Summary:');
  console.log('- Direct database connections should work from server-side code');
  console.log('- API routes should be able to access the database');
  console.log('- Server-side rendered pages should load database content');
  console.log('- Client-side code should NOT contain sensitive credentials');
  console.log('\nIf all tests passed, your database connectivity is working correctly!');
}

// Run the tests
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});