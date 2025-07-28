#!/usr/bin/env node

// Quick Authentication System Check
// This script performs a rapid validation of the authentication system

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://localhost:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';

const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';
const TEST_ADMIN_PASSWORD = 'gcb4uvd*pvz*ZGD_hta';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function checkAuth() {
  console.log(`${colors.yellow}🔐 Quick Authentication Check${colors.reset}`);
  console.log('============================\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  // Test 1: Check Supabase connection
  try {
    console.log(`${colors.yellow}1. Testing Supabase connection...${colors.reset}`);
    const { data, error } = await supabase.from('_test_connection').select('*').limit(1);
    if (!error || error.code === '42P01') { // Table doesn't exist is OK
      console.log(`${colors.green}✅ Supabase is accessible${colors.reset}`);
      results.passed++;
      results.tests.push({ name: 'Supabase Connection', status: 'passed' });
    } else {
      throw error;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Supabase connection failed: ${error.message}${colors.reset}`);
    results.failed++;
    results.tests.push({ name: 'Supabase Connection', status: 'failed', error: error.message });
  }

  // Test 2: Login with admin credentials
  try {
    console.log(`\n${colors.yellow}2. Testing admin login...${colors.reset}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_ADMIN_EMAIL,
      password: TEST_ADMIN_PASSWORD
    });

    if (error) throw error;

    console.log(`${colors.green}✅ Admin login successful${colors.reset}`);
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    results.passed++;
    results.tests.push({ name: 'Admin Login', status: 'passed' });

    // Test 3: Check session
    console.log(`\n${colors.yellow}3. Testing session persistence...${colors.reset}`);
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) throw sessionError;

    if (session) {
      console.log(`${colors.green}✅ Session is active${colors.reset}`);
      console.log(`   Access token: ${session.access_token.substring(0, 20)}...`);
      results.passed++;
      results.tests.push({ name: 'Session Persistence', status: 'passed' });
    } else {
      throw new Error('No session found');
    }

    // Test 4: Check user details
    console.log(`\n${colors.yellow}4. Testing user retrieval...${colors.reset}`);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (user) {
      console.log(`${colors.green}✅ User details retrieved${colors.reset}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`);
      results.passed++;
      results.tests.push({ name: 'User Retrieval', status: 'passed' });
    } else {
      throw new Error('No user found');
    }

    // Test 5: Logout
    console.log(`\n${colors.yellow}5. Testing logout...${colors.reset}`);
    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) throw logoutError;

    console.log(`${colors.green}✅ Logout successful${colors.reset}`);
    results.passed++;
    results.tests.push({ name: 'Logout', status: 'passed' });

  } catch (error) {
    console.log(`${colors.red}❌ Test failed: ${error.message}${colors.reset}`);
    results.failed++;
    results.tests.push({ name: 'Authentication Flow', status: 'failed', error: error.message });
  }

  // Test 6: Wrong password
  try {
    console.log(`\n${colors.yellow}6. Testing invalid credentials...${colors.reset}`);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: TEST_ADMIN_EMAIL,
      password: 'wrong-password'
    });

    if (error && error.message.includes('Invalid login credentials')) {
      console.log(`${colors.green}✅ Invalid credentials properly rejected${colors.reset}`);
      results.passed++;
      results.tests.push({ name: 'Invalid Credentials', status: 'passed' });
    } else {
      throw new Error('Invalid credentials were not rejected');
    }
  } catch (error) {
    if (error.message === 'Invalid credentials were not rejected') {
      console.log(`${colors.red}❌ Security issue: ${error.message}${colors.reset}`);
      results.failed++;
      results.tests.push({ name: 'Invalid Credentials', status: 'failed', error: error.message });
    }
  }

  // Summary
  console.log(`\n${colors.yellow}========== SUMMARY ==========${colors.reset}`);
  console.log(`Total tests: ${results.passed + results.failed}`);
  console.log(`${colors.green}Passed: ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${results.failed}${colors.reset}`);

  if (results.failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Authentication system is working correctly.${colors.reset}`);
    console.log(`\nThe user can now login with:`);
    console.log(`Email: ${TEST_ADMIN_EMAIL}`);
    console.log(`Password: ${TEST_ADMIN_PASSWORD}`);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Please check the errors above.${colors.reset}`);
    console.log('\nFailed tests:');
    results.tests
      .filter(t => t.status === 'failed')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the check
checkAuth().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});