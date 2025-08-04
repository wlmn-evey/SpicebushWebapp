#!/usr/bin/env node

// Simple database connection test using CommonJS
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testConnection() {
  console.log('Testing database connection...\n');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

  console.log('Supabase URL:', supabaseUrl);
  console.log('Has Anon Key:', !!supabaseAnonKey);
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Missing Supabase configuration');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test 1: Simple query
    console.log('\n1. Testing simple query...');
    const { data, error, status } = await supabase
      .from('settings')
      .select('key')
      .limit(1);

    if (error) {
      console.error('Error:', error.message);
      console.error('Status:', status);
      console.error('Details:', error);
    } else {
      console.log('✅ Query successful');
      console.log('Data:', data);
    }

    // Test 2: Check content table
    console.log('\n2. Testing content table...');
    const { data: contentData, error: contentError } = await supabase
      .from('content')
      .select('type, title')
      .eq('type', 'hours')
      .limit(5);

    if (contentError) {
      console.error('Content Error:', contentError.message);
    } else {
      console.log('✅ Content query successful');
      console.log('Found', contentData?.length || 0, 'hours entries');
    }

  } catch (err) {
    console.error('Fatal error:', err);
  }
}

testConnection();