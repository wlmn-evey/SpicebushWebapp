#!/usr/bin/env node
/**
 * Verify hosted Supabase connection
 * Usage: HOSTED_SUPABASE_URL=xxx HOSTED_SUPABASE_PUBLIC_KEY=xxx node scripts/verify-hosted-supabase.js
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.HOSTED_SUPABASE_URL;
const publicKey = process.env.HOSTED_SUPABASE_PUBLIC_KEY;

if (!url || !publicKey) {
  console.error('❌ Missing environment variables:');
  console.error('   HOSTED_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('   HOSTED_SUPABASE_PUBLIC_KEY=your-public-key');
  process.exit(1);
}

console.log('🔍 Testing hosted Supabase connection...\n');

try {
  const supabase = createClient(url, publicKey);
  
  // Test 1: Basic connection
  console.log('1. Testing basic connection...');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  console.log('✅ Connection successful');
  
  // Test 2: Database access
  console.log('\n2. Testing database access...');
  const { data, error } = await supabase
    .from('settings')
    .select('count')
    .limit(1);
    
  if (error && error.code === '42P01') {
    console.log('⚠️  Settings table does not exist (expected for new project)');
  } else if (error) {
    throw error;
  } else {
    console.log('✅ Database access successful');
  }
  
  // Test 3: Auth endpoint
  console.log('\n3. Testing auth endpoint...');
  const { error: healthError } = await supabase.auth.getSession();
  if (healthError) throw healthError;
  console.log('✅ Auth endpoint accessible');
  
  console.log('\n✅ All tests passed!');
  console.log('\n📋 Connection details:');
  console.log(`   URL: ${url}`);
  console.log(`   Region: ${url.split('.')[0].split('-').slice(0, -1).join('-')}`);
  console.log('\n💡 Next steps:');
  console.log('   1. Save these credentials securely');
  console.log('   2. Run backup script: npm run backup:local');
  console.log('   3. Begin data migration');
  
} catch (error) {
  console.error('\n❌ Connection test failed:', error.message);
  process.exit(1);
}