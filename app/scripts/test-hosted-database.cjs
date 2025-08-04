#!/usr/bin/env node

// Test connection to hosted Supabase database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.hosted' });

async function testHostedDatabase() {
  console.log('🔍 Testing Hosted Supabase Database Connection...\n');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

  console.log('Supabase URL:', supabaseUrl);
  console.log('Is Hosted:', supabaseUrl?.includes('supabase.co'));
  console.log('Has Anon Key:', !!supabaseAnonKey);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Connection and Settings Table
  console.log('\n1. Testing connection via settings table...');
  try {
    const { data, error, count } = await supabase
      .from('settings')
      .select('*', { count: 'exact' });

    if (error) throw error;
    
    console.log('✅ Settings table accessible');
    console.log(`   Found ${count} settings`);
    testsPassed++;
  } catch (error) {
    console.error('❌ Settings table error:', error.message);
    testsFailed++;
  }

  // Test 2: Content Table (checking for hours data)
  console.log('\n2. Testing content table (hours data)...');
  try {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('type', 'hours')
      .order('day');

    if (error) throw error;
    
    console.log('✅ Content table accessible');
    console.log(`   Found ${data.length} hours entries`);
    if (data.length > 0) {
      console.log('   Days:', data.map(d => d.day).join(', '));
    }
    testsPassed++;
  } catch (error) {
    console.error('❌ Content table error:', error.message);
    testsFailed++;
  }

  // Test 3: Check all critical tables
  console.log('\n3. Checking critical tables...');
  const tables = [
    'admin_sessions',
    'admin_settings',
    'contact_form_submissions',
    'newsletter_subscribers',
    'communications_messages',
    'cms_blog',
    'cms_photos',
    'cms_hours'
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) throw error;
      console.log(`   ✅ ${table}`);
      testsPassed++;
    } catch (error) {
      console.error(`   ❌ ${table}: ${error.message}`);
      testsFailed++;
    }
  }

  // Test 4: Database Write Test
  console.log('\n4. Testing database write operations...');
  try {
    const testData = {
      type: 'test',
      title: 'Hosted DB Test',
      content: { timestamp: new Date().toISOString() },
      status: 'active'
    };

    const { data: writeData, error: writeError } = await supabase
      .from('content')
      .insert(testData)
      .select()
      .single();

    if (writeError) throw writeError;

    console.log('✅ Write operation successful');
    
    // Clean up
    await supabase.from('content').delete().eq('id', writeData.id);
    console.log('✅ Cleanup successful');
    testsPassed++;
  } catch (error) {
    console.error('❌ Write operation error:', error.message);
    testsFailed++;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${testsPassed + testsFailed}`);
  console.log(`✅ Passed: ${testsPassed}`);
  console.log(`❌ Failed: ${testsFailed}`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 All tests passed! The hosted database is fully operational.');
    console.log('✅ No "relation does not exist" errors found');
    console.log('✅ All critical tables are accessible');
    console.log('✅ Read/write operations working correctly');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }

  process.exit(testsFailed === 0 ? 0 : 1);
}

testHostedDatabase();