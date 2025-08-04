#!/usr/bin/env node
/**
 * Direct database migration using PostgreSQL connection
 */

import pg from 'pg';
const { Client } = pg;

// Extract database URL components from environment
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;

if (!databaseUrl && !dbPassword) {
  console.error('❌ Error: Missing required environment variables');
  console.error('   Please set either DATABASE_URL or SUPABASE_DB_PASSWORD');
  process.exit(1);
}

let clientConfig;
if (databaseUrl) {
  // Parse connection string if provided
  const url = new URL(databaseUrl);
  clientConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }
  };
} else {
  // Fall back to individual environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const projectRef = supabaseUrl?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  clientConfig = {
    host: projectRef ? `db.${projectRef}.supabase.co` : process.env.SUPABASE_DB_HOST,
    port: parseInt(process.env.SUPABASE_DB_PORT || '5432'),
    user: process.env.SUPABASE_DB_USER || 'postgres',
    password: dbPassword,
    database: process.env.SUPABASE_DB_NAME || 'postgres',
    ssl: { rejectUnauthorized: false }
  };
}

const client = new Client(clientConfig);

console.log('🚀 Connecting to hosted Supabase database...');
console.log(`📍 Using database host: ${clientConfig.host}`);
console.log('');

async function createTables() {
  console.log('📝 Creating tables...');
  
  try {
    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.settings (
        key text PRIMARY KEY,
        value text,
        updated_at timestamp with time zone DEFAULT now()
      )
    `);
    console.log('✅ Settings table created');

    // Create admin tables
    await client.query(`
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
      )
    `);
    
    await client.query(`
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
      )
    `);
    console.log('✅ Admin tables created');

    // Grant permissions
    await client.query(`
      GRANT ALL ON public.settings TO anon, authenticated;
      GRANT ALL ON public.admin_sessions TO anon, authenticated;
      GRANT ALL ON public.admin_audit_log TO anon, authenticated;
    `);
    console.log('✅ Permissions granted');

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('⚠️  Tables already exist, continuing...');
    } else {
      throw error;
    }
  }
}

async function importData() {
  console.log('\n📊 Importing settings data...');
  
  const settingsData = [
    ['site_message', '', '2025-07-30T14:49:05.065064+00'],
    ['coming_soon_mode', 'false', '2025-07-30T18:18:07.564229+00'],
    ['coming_soon_message', "We're preparing something special for you. Our new website will launch soon with exciting features and resources for families interested in Montessori education.", '2025-07-30T18:18:07.569524+00'],
    ['coming_soon_newsletter', 'true', '2025-07-30T18:18:07.571021+00'],
    ['coming_soon_launch_date', 'Fall 2025', '2025-07-30T18:18:07.566875+00'],
    ['school_phone', '(484) 202-0712', '2025-07-30T19:12:52.244166+00'],
    ['school_email', 'information@spicebushmontessori.org', '2025-07-30T19:12:52.250003+00'],
    ['school_address_street', '827 Concord Road', '2025-07-30T19:12:52.252366+00'],
    ['school_address_city', 'Glen Mills', '2025-07-30T19:12:52.256+00'],
    ['school_address_state', 'PA', '2025-07-30T19:12:52.257604+00'],
    ['school_address_zip', '19342', '2025-07-30T19:12:52.259086+00'],
    ['school_facebook', 'https://www.facebook.com/spicebushmontessori', '2025-07-30T19:12:52.260547+00'],
    ['school_instagram', 'https://www.instagram.com/spicebushmontessori/', '2025-07-30T19:12:52.262017+00'],
    ['newsletter_enabled', 'true', '2025-07-30T14:49:05.076621+00'],
    ['analytics_enabled', 'false', '2025-07-30T14:49:05.078152+00'],
    ['hours_display_format', 'detailed', '2025-07-30T15:19:17.811614+00'],
    ['tour_scheduling_enabled', 'true', '2025-07-30T14:49:05.075098+00']
  ];

  try {
    for (const [key, value, updated_at] of settingsData) {
      await client.query(
        `INSERT INTO public.settings (key, value, updated_at) 
         VALUES ($1, $2, $3::timestamptz) 
         ON CONFLICT (key) DO UPDATE 
         SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
        [key, value, updated_at]
      );
    }
    console.log(`✅ Imported ${settingsData.length} settings`);
  } catch (error) {
    console.error('❌ Import error:', error.message);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    const result = await client.query('SELECT key, value FROM public.settings ORDER BY key');
    
    console.log(`\n✅ Found ${result.rows.length} settings in database:`);
    console.log('━'.repeat(60));
    
    result.rows.forEach(row => {
      const value = row.value && row.value.length > 40 
        ? row.value.substring(0, 37) + '...' 
        : row.value || '(empty)';
      console.log(`${row.key.padEnd(25)} │ ${value}`);
    });
    console.log('━'.repeat(60));
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
}

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    await createTables();
    await importData();
    await verifyMigration();
    
    console.log('\n✅ Migration complete!');
    console.log('\n💡 Next steps:');
    console.log('   1. Update environment variables');
    console.log('   2. Test application with new database');
    console.log('   3. Stop local containers');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

main();