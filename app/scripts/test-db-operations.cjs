#!/usr/bin/env node

// Test database operations (CRUD)
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.hosted' });

async function testDatabaseOperations() {
  console.log('🔍 Testing Database Operations...\n');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  let allPassed = true;

  // Test 1: CREATE - Newsletter Signup
  console.log('1. Testing CREATE (Newsletter Signup)...');
  try {
    const testEmail = `test-${Date.now()}@example.com`;
    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: testEmail,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    console.log('✅ CREATE successful - Newsletter subscriber added');
    
    // Clean up
    if (data?.id) {
      await supabase.from('newsletter_subscribers').delete().eq('id', data.id);
    }
  } catch (error) {
    console.error('❌ CREATE failed:', error.message);
    allPassed = false;
  }

  // Test 2: READ - Settings
  console.log('\n2. Testing READ (Settings)...');
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', 'school_name')
      .single();

    if (error) throw error;
    console.log('✅ READ successful - School name:', data.value);
  } catch (error) {
    console.error('❌ READ failed:', error.message);
    allPassed = false;
  }

  // Test 3: UPDATE - Test Content
  console.log('\n3. Testing UPDATE (Content)...');
  try {
    // First create a test entry
    const { data: testData, error: createError } = await supabase
      .from('content')
      .insert({
        type: 'test',
        title: 'Test Entry',
        status: 'draft'
      })
      .select()
      .single();

    if (createError) throw createError;

    // Update it
    const { error: updateError } = await supabase
      .from('content')
      .update({ status: 'published' })
      .eq('id', testData.id);

    if (updateError) throw updateError;
    console.log('✅ UPDATE successful');

    // Clean up
    await supabase.from('content').delete().eq('id', testData.id);
  } catch (error) {
    console.error('❌ UPDATE failed:', error.message);
    allPassed = false;
  }

  // Test 4: DELETE - Test Entry
  console.log('\n4. Testing DELETE...');
  try {
    // Create a test entry
    const { data: testData, error: createError } = await supabase
      .from('content')
      .insert({
        type: 'test-delete',
        title: 'To Be Deleted'
      })
      .select()
      .single();

    if (createError) throw createError;

    // Delete it
    const { error: deleteError } = await supabase
      .from('content')
      .delete()
      .eq('id', testData.id);

    if (deleteError) throw deleteError;
    console.log('✅ DELETE successful');
  } catch (error) {
    console.error('❌ DELETE failed:', error.message);
    allPassed = false;
  }

  // Test 5: Contact Form Submission
  console.log('\n5. Testing Contact Form Submission...');
  try {
    const submission = {
      name: 'Test Parent',
      email: 'test@example.com',
      phone: '555-0123',
      interest: 'tour',
      message: 'Database test submission',
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('contact_form_submissions')
      .insert(submission)
      .select()
      .single();

    if (error) throw error;
    console.log('✅ Contact form submission successful');

    // Clean up
    if (data?.id) {
      await supabase.from('contact_form_submissions').delete().eq('id', data.id);
    }
  } catch (error) {
    console.error('❌ Contact form submission failed:', error.message);
    allPassed = false;
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All database operations passed!');
    console.log('The database is fully functional for all CRUD operations.');
  } else {
    console.log('❌ Some operations failed. Check errors above.');
  }

  process.exit(allPassed ? 0 : 1);
}

testDatabaseOperations();