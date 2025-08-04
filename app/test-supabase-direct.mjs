#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

// Get environment variables
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLIC_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection...\n');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('  PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('  PUBLIC_SUPABASE_PUBLIC_KEY:', SUPABASE_ANON_KEY ? '✓' : '✗');
  process.exit(1);
}

console.log('✓ Environment variables loaded');
console.log('  URL:', SUPABASE_URL);
console.log('  Key:', SUPABASE_ANON_KEY.substring(0, 20) + '...\n');

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test 1: Basic connection
console.log('Test 1: Basic Connection');
try {
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .limit(3);
  
  if (error) {
    console.error('❌ Connection failed:', error.message);
  } else {
    console.log('✓ Successfully connected to Supabase');
    console.log('✓ Retrieved', data?.length || 0, 'settings');
    if (data && data.length > 0) {
      console.log('  Sample settings:', data.map(s => s.key).join(', '));
    }
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
}

console.log('\nTest 2: Newsletter Subscribers Table');
try {
  const { count, error } = await supabase
    .from('newsletter_subscribers')
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.error('❌ Failed to query newsletter_subscribers:', error.message);
  } else {
    console.log('✓ Successfully queried newsletter_subscribers table');
    console.log('  Total subscribers:', count || 0);
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
}

console.log('\nTest 3: Content Tables');
try {
  // Test hours table
  const { data: hours, error: hoursError } = await supabase
    .from('hours')
    .select('day, open_time, close_time')
    .order('order')
    .limit(7);
  
  if (hoursError) {
    console.error('❌ Failed to query hours:', hoursError.message);
  } else {
    console.log('✓ Successfully queried hours table');
    console.log('  Days configured:', hours?.length || 0);
  }
  
  // Test school_info
  const { data: schoolInfo, error: schoolError } = await supabase
    .from('school_info')
    .select('name, email, phone')
    .single();
  
  if (schoolError) {
    console.error('❌ Failed to query school_info:', schoolError.message);
  } else {
    console.log('✓ Successfully queried school_info');
    console.log('  School:', schoolInfo?.name);
    console.log('  Email:', schoolInfo?.email);
    console.log('  Phone:', schoolInfo?.phone);
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
}

console.log('\nTest 4: Auth System');
try {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error && error.message !== 'Auth session missing!') {
    console.error('❌ Auth system error:', error.message);
  } else {
    console.log('✓ Auth system is functional');
    console.log('  Current user:', user ? user.email : 'Not logged in');
  }
} catch (err) {
  console.error('❌ Unexpected error:', err.message);
}

console.log('\n✅ Database connectivity tests complete!');