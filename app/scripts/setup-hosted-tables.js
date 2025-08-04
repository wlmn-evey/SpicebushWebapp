#!/usr/bin/env node
/**
 * Setup tables in hosted Supabase using proper approach
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Setting up hosted Supabase tables...');
console.log(`📍 Using Supabase URL: ${url}`);
console.log('');

// Create admin client with service role key
const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  // First, let's check if the settings table exists by trying to query it
  console.log('🔍 Checking existing tables...');
  
  const { data: existingSettings, error: checkError } = await supabaseAdmin
    .from('settings')
    .select('key')
    .limit(1);
  
  if (checkError && checkError.code === '42P01') {
    console.log('⚠️  Settings table does not exist');
    console.log('\n📋 Manual setup required:');
    const projectId = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    console.log(`1. Go to: https://supabase.com/dashboard/project/${projectId || 'YOUR_PROJECT_ID'}/sql/new`);
    console.log('2. Run the SQL from: exports/20250730_201543/complete-migration.sql');
    console.log('\nOr use the Table Editor to create tables manually.');
    return false;
  } else if (existingSettings) {
    console.log('✅ Settings table already exists');
    return true;
  }
}

async function importData() {
  console.log('\n📊 Importing settings data...');
  
  const settingsData = [
    { key: 'site_message', value: '' },
    { key: 'coming_soon_mode', value: 'false' },
    { key: 'coming_soon_message', value: "We're preparing something special for you. Our new website will launch soon with exciting features and resources for families interested in Montessori education." },
    { key: 'coming_soon_newsletter', value: 'true' },
    { key: 'coming_soon_launch_date', value: 'Fall 2025' },
    { key: 'school_phone', value: '(484) 202-0712' },
    { key: 'school_email', value: 'information@spicebushmontessori.org' },
    { key: 'school_address_street', value: '827 Concord Road' },
    { key: 'school_address_city', value: 'Glen Mills' },
    { key: 'school_address_state', value: 'PA' },
    { key: 'school_address_zip', value: '19342' },
    { key: 'school_facebook', value: 'https://www.facebook.com/spicebushmontessori' },
    { key: 'school_instagram', value: 'https://www.instagram.com/spicebushmontessori/' },
    { key: 'newsletter_enabled', value: 'true' },
    { key: 'analytics_enabled', value: 'false' },
    { key: 'hours_display_format', value: 'detailed' },
    { key: 'tour_scheduling_enabled', value: 'true' }
  ];
  
  try {
    // Use upsert to handle existing records
    const { data, error } = await supabaseAdmin
      .from('settings')
      .upsert(settingsData, { 
        onConflict: 'key',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('❌ Failed to import settings:', error);
      return false;
    } else {
      console.log(`✅ Successfully imported ${settingsData.length} settings`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error importing data:', error);
    return false;
  }
}

async function verifyData() {
  console.log('\n🔍 Verifying imported data...');
  
  try {
    const { data, error, count } = await supabaseAdmin
      .from('settings')
      .select('*', { count: 'exact' })
      .order('key');
    
    if (error) {
      console.error('❌ Verification failed:', error);
      return;
    }
    
    console.log(`\n✅ Found ${data.length} settings in database:`);
    console.log('━'.repeat(60));
    
    data.forEach(row => {
      const value = row.value && row.value.length > 40 
        ? row.value.substring(0, 37) + '...' 
        : row.value || '(empty)';
      console.log(`${row.key.padEnd(25)} │ ${value}`);
    });
    console.log('━'.repeat(60));
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  }
}

// Main execution
async function main() {
  const tablesExist = await setupDatabase();
  
  if (tablesExist) {
    const imported = await importData();
    if (imported) {
      await verifyData();
      
      console.log('\n✅ Migration complete!');
      console.log('\n💡 Next steps:');
      console.log('   1. Update .env.local with new credentials');
      console.log('   2. Update code for new key naming');
      console.log('   3. Test the application');
    }
  } else {
    console.log('\n⚠️  Please create the tables first using the SQL editor.');
  }
}

main().catch(console.error);