#!/usr/bin/env node
/**
 * Setup hosted Supabase with schema and data
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const url = process.env.HOSTED_SUPABASE_URL;

if (!url) {
  console.error('❌ Missing HOSTED_SUPABASE_URL environment variable');
  console.error('   Set HOSTED_SUPABASE_URL=https://your-project.supabase.co');
  process.exit(1);
}
const serviceKey = process.env.HOSTED_SUPABASE_SERVICE_KEY || process.env.HOSTED_SUPABASE_SECRET_KEY;

if (!serviceKey) {
  console.error('❌ Missing HOSTED_SUPABASE_SERVICE_KEY or HOSTED_SUPABASE_SECRET_KEY');
  console.error('   This script requires the service/secret key to create tables');
  process.exit(1);
}

console.log('🚀 Setting up hosted Supabase...\n');

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runSQL(sql, description) {
  console.log(`📝 ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // Try direct query if RPC doesn't exist
      const { data: directData, error: directError } = await supabase
        .from('_sql')
        .insert({ query: sql })
        .select();
      
      if (directError) {
        throw directError;
      }
    }
    console.log(`✅ ${description} complete`);
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    // Don't fail on "already exists" errors
    if (error.message.includes('already exists')) {
      console.log('⚠️  Already exists, continuing...');
      return true;
    }
    return false;
  }
}

async function setupTables() {
  // Create settings table
  const settingsSQL = `
    CREATE TABLE IF NOT EXISTS public.settings (
      key text PRIMARY KEY,
      value text,
      updated_at timestamp with time zone DEFAULT now()
    );
    
    -- Grant permissions
    GRANT ALL ON public.settings TO anon, authenticated;
  `;
  
  await runSQL(settingsSQL, 'Creating settings table');

  // Create admin tables
  const adminSQL = `
    CREATE TABLE IF NOT EXISTS public.admin_sessions (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      session_token text UNIQUE NOT NULL,
      user_id uuid,
      user_email text,
      created_at timestamp with time zone DEFAULT now(),
      last_activity timestamp with time zone DEFAULT now(),
      expires_at timestamp with time zone,
      ip_address text,
      user_agent text,
      is_active boolean DEFAULT true
    );

    CREATE TABLE IF NOT EXISTS public.admin_audit_log (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      session_id uuid,
      user_email text,
      action text,
      resource_type text,
      resource_id text,
      details jsonb,
      ip_address text,
      created_at timestamp with time zone DEFAULT now()
    );
    
    GRANT ALL ON public.admin_sessions TO anon, authenticated;
    GRANT ALL ON public.admin_audit_log TO anon, authenticated;
  `;
  
  await runSQL(adminSQL, 'Creating admin tables');
}

async function importData() {
  console.log('\n📊 Importing data...');
  
  // Settings data
  const settingsData = [
    { key: 'site_message', value: '', updated_at: '2025-07-30T14:49:05.065064+00' },
    { key: 'coming_soon_mode', value: 'false', updated_at: '2025-07-30T18:18:07.564229+00' },
    { key: 'coming_soon_message', value: "We're preparing something special for you. Our new website will launch soon with exciting features and resources for families interested in Montessori education.", updated_at: '2025-07-30T18:18:07.569524+00' },
    { key: 'coming_soon_newsletter', value: 'true', updated_at: '2025-07-30T18:18:07.571021+00' },
    { key: 'coming_soon_launch_date', value: 'Fall 2025', updated_at: '2025-07-30T18:18:07.566875+00' },
    { key: 'school_phone', value: '(484) 202-0712', updated_at: '2025-07-30T19:12:52.244166+00' },
    { key: 'school_email', value: 'information@spicebushmontessori.org', updated_at: '2025-07-30T19:12:52.250003+00' },
    { key: 'school_address_street', value: '827 Concord Road', updated_at: '2025-07-30T19:12:52.252366+00' },
    { key: 'school_address_city', value: 'Glen Mills', updated_at: '2025-07-30T19:12:52.256+00' },
    { key: 'school_address_state', value: 'PA', updated_at: '2025-07-30T19:12:52.257604+00' },
    { key: 'school_address_zip', value: '19342', updated_at: '2025-07-30T19:12:52.259086+00' },
    { key: 'school_facebook', value: 'https://www.facebook.com/spicebushmontessori', updated_at: '2025-07-30T19:12:52.260547+00' },
    { key: 'school_instagram', value: 'https://www.instagram.com/spicebushmontessori/', updated_at: '2025-07-30T19:12:52.262017+00' },
    { key: 'newsletter_enabled', value: 'true', updated_at: '2025-07-30T14:49:05.076621+00' },
    { key: 'analytics_enabled', value: 'false', updated_at: '2025-07-30T14:49:05.078152+00' },
    { key: 'hours_display_format', value: 'detailed', updated_at: '2025-07-30T15:19:17.811614+00' },
    { key: 'tour_scheduling_enabled', value: 'true', updated_at: '2025-07-30T14:49:05.075098+00' }
  ];

  try {
    const { data, error } = await supabase
      .from('settings')
      .upsert(settingsData, { onConflict: 'key' });
    
    if (error) throw error;
    console.log(`✅ Imported ${settingsData.length} settings`);
  } catch (error) {
    console.error('❌ Failed to import settings:', error.message);
  }
}

async function verifyImport() {
  console.log('\n🔍 Verifying import...');
  
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('key')
      .order('key');
    
    if (error) throw error;
    
    console.log(`✅ Found ${data.length} settings in database`);
    console.log('\n📋 Settings keys:');
    data.forEach(row => console.log(`   - ${row.key}`));
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  await setupTables();
  await importData();
  await verifyImport();
  
  console.log('\n✅ Setup complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Update .env.local with new credentials');
  console.log('   2. Update code for new key naming');
  console.log('   3. Test the application');
}

main().catch(console.error);