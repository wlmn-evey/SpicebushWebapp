#!/usr/bin/env node

// Quick database state verification
// Checks that all critical tables exist and contain expected data

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function verifyDatabaseState() {
  console.log('🔍 Verifying Database State...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(`${colors.red}❌ Missing Supabase configuration${colors.reset}`);
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  let allTestsPassed = true;
  const results = [];

  // Test 1: Database Connection
  console.log('1. Testing Database Connection...');
  try {
    const { error } = await supabase.from('settings').select('count').single();
    if (!error) {
      results.push({ test: 'Database Connection', status: 'PASS' });
      console.log(`${colors.green}✅ Database connection successful${colors.reset}\n`);
    } else {
      throw error;
    }
  } catch (error) {
    results.push({ test: 'Database Connection', status: 'FAIL', error: error.message });
    console.log(`${colors.red}❌ Database connection failed: ${error.message}${colors.reset}\n`);
    allTestsPassed = false;
  }

  // Test 2: Critical Tables
  console.log('2. Checking Critical Tables...');
  const criticalTables = {
    'content': 'Content storage',
    'settings': 'Application settings',
    'admin_sessions': 'Admin authentication',
    'newsletter_subscribers': 'Newsletter functionality',
    'contact_form_submissions': 'Contact forms',
    'communications_messages': 'Email communications',
    'cms_hours': 'Hours management',
    'cms_photos': 'Photo management',
    'cms_blog': 'Blog content'
  };

  for (const [table, description] of Object.entries(criticalTables)) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`${colors.green}✅ ${table} (${description})${colors.reset}`);
        results.push({ test: `Table: ${table}`, status: 'PASS' });
      } else {
        throw error;
      }
    } catch (error) {
      console.log(`${colors.red}❌ ${table} (${description}): ${error.message}${colors.reset}`);
      results.push({ test: `Table: ${table}`, status: 'FAIL', error: error.message });
      allTestsPassed = false;
    }
  }

  // Test 3: Content Table Data
  console.log('\n3. Verifying Content Data...');
  try {
    const { data: hoursData, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'hours')
      .order('day');

    if (!error && hoursData && hoursData.length > 0) {
      console.log(`${colors.green}✅ Found ${hoursData.length} hours entries${colors.reset}`);
      const days = hoursData.map(h => h.day);
      console.log(`   Days: ${days.join(', ')}`);
      results.push({ test: 'Hours Data', status: 'PASS', count: hoursData.length });
    } else {
      throw new Error('No hours data found');
    }
  } catch (error) {
    console.log(`${colors.red}❌ Hours data verification failed: ${error.message}${colors.reset}`);
    results.push({ test: 'Hours Data', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 4: Settings Data
  console.log('\n4. Verifying Settings Data...');
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*');

    if (!error && settings && settings.length > 0) {
      console.log(`${colors.green}✅ Found ${settings.length} settings${colors.reset}`);
      
      // Check for critical settings
      const criticalSettings = ['school_name', 'school_email', 'school_phone', 'coming_soon_enabled'];
      const foundSettings = settings.map(s => s.key);
      
      criticalSettings.forEach(key => {
        if (foundSettings.includes(key)) {
          console.log(`   ${colors.green}✓ ${key}${colors.reset}`);
        } else {
          console.log(`   ${colors.red}✗ ${key} (missing)${colors.reset}`);
          allTestsPassed = false;
        }
      });
      
      results.push({ test: 'Settings Data', status: 'PASS', count: settings.length });
    } else {
      throw new Error('No settings data found');
    }
  } catch (error) {
    console.log(`${colors.red}❌ Settings data verification failed: ${error.message}${colors.reset}`);
    results.push({ test: 'Settings Data', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Test 5: Database Write Operations
  console.log('\n5. Testing Write Operations...');
  try {
    // Test write to content table
    const testData = {
      type: 'test',
      title: 'Database Verification Test',
      content: { timestamp: new Date().toISOString() },
      status: 'active'
    };

    const { data: writeData, error: writeError } = await supabase
      .from('content')
      .insert(testData)
      .select()
      .single();

    if (!writeError && writeData) {
      console.log(`${colors.green}✅ Write operation successful${colors.reset}`);
      
      // Clean up test data
      await supabase.from('content').delete().eq('id', writeData.id);
      console.log(`${colors.green}✅ Cleanup successful${colors.reset}`);
      
      results.push({ test: 'Write Operations', status: 'PASS' });
    } else {
      throw writeError;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Write operation failed: ${error.message}${colors.reset}`);
    results.push({ test: 'Write Operations', status: 'FAIL', error: error.message });
    allTestsPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:');
  console.log('='.repeat(50));
  
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  
  console.log(`Total Tests: ${results.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (allTestsPassed) {
    console.log(`\n${colors.green}🎉 All database verifications passed!${colors.reset}`);
    console.log('The database is properly configured and operational.');
  } else {
    console.log(`\n${colors.red}⚠️  Some database verifications failed${colors.reset}`);
    console.log('Please check the errors above and ensure all migrations were applied.');
    
    // Show failed tests
    console.log('\nFailed Tests:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`- ${r.test}: ${r.error || 'Unknown error'}`);
    });
  }

  process.exit(allTestsPassed ? 0 : 1);
}

// Run verification
verifyDatabaseState().catch(error => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});