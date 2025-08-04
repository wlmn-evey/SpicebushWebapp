#!/usr/bin/env node
/**
 * Migrate data to hosted Supabase
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🚀 Starting migration to hosted Supabase...\n');

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createTables() {
  console.log('📝 Creating tables...');
  
  try {
    // Create settings table
    const { error: settingsError } = await supabase.from('settings').select('key').limit(1);
    
    if (settingsError && settingsError.code === '42P01') {
      // Table doesn't exist, create it
      const { data, error } = await supabase.rpc('query', {
        query: `
          CREATE TABLE public.settings (
            key text PRIMARY KEY,
            value text,
            updated_at timestamp with time zone DEFAULT now()
          );
          GRANT ALL ON public.settings TO anon, authenticated;
        `
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error('❌ Failed to create settings table:', error.message);
      } else {
        console.log('✅ Settings table created');
      }
    } else {
      console.log('✅ Settings table already exists');
    }
    
    // Create admin tables
    const { error: sessionError } = await supabase.from('admin_sessions').select('id').limit(1);
    
    if (sessionError && sessionError.code === '42P01') {
      const { error } = await supabase.rpc('query', {
        query: `
          CREATE TABLE public.admin_sessions (
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
          
          CREATE TABLE public.admin_audit_log (
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
        `
      });
      
      if (error && !error.message.includes('already exists')) {
        console.error('❌ Failed to create admin tables:', error.message);
      } else {
        console.log('✅ Admin tables created');
      }
    } else {
      console.log('✅ Admin tables already exist');
    }
    
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
  }
}

async function importData() {
  console.log('\n📊 Importing settings data...');
  
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
    
    if (error) {
      console.error('❌ Failed to import settings:', error.message);
    } else {
      console.log(`✅ Imported ${settingsData.length} settings`);
    }
  } catch (error) {
    console.error('❌ Error importing data:', error.message);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    const { data, count } = await supabase
      .from('settings')
      .select('*', { count: 'exact' })
      .order('key');
    
    if (data) {
      console.log(`✅ Found ${data.length} settings in database`);
      console.log('\n📋 Imported settings:');
      data.forEach(row => {
        const value = row.value.length > 50 ? row.value.substring(0, 47) + '...' : row.value;
        console.log(`   ${row.key}: ${value}`);
      });
    }
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Main execution
async function main() {
  await createTables();
  await importData();
  await verifyMigration();
  
  console.log('\n✅ Migration complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Update environment variables');
  console.log('   2. Test application with new database');
  console.log('   3. Stop local containers');
}

main().catch(console.error);