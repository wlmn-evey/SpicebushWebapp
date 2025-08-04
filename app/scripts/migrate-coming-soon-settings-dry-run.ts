#!/usr/bin/env tsx
/**
 * DRY RUN version of the coming-soon migration script
 * This script simulates the migration without making any database changes
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

// Initialize Supabase client
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';

const supabase = createClient(supabaseUrl, supabaseKey);

interface SettingFile {
  name: string;
  key: string;
  value: string;
  description?: string;
  type?: string;
}

/**
 * Read and parse a settings markdown file
 */
function readSettingFile(filePath: string): SettingFile | null {
  try {
    const fileContent = readFileSync(filePath, 'utf-8');
    const { data } = matter(fileContent);
    return data as SettingFile;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * Main dry-run function
 */
async function dryRunMigration() {
  console.log('DRY RUN: Coming-Soon Settings Migration\n');
  console.log('This is a simulation - no changes will be made to the database.\n');
  console.log('='.repeat(50));

  const settingsDir = join(process.cwd(), 'src', 'content', 'settings');
  const settingFiles = [
    'coming-soon-mode.md',
    'coming-soon-launch-date.md',
    'coming-soon-message.md',
    'coming-soon-newsletter.md'
  ];

  const settingsToMigrate: SettingFile[] = [];
  let readErrors = 0;

  // Step 1: Read all markdown files
  console.log('Step 1: Reading markdown files...\n');
  for (const fileName of settingFiles) {
    const filePath = join(settingsDir, fileName);
    const setting = readSettingFile(filePath);
    
    if (setting) {
      settingsToMigrate.push(setting);
      console.log(`✓ Read ${fileName}:`);
      console.log(`  - key: ${setting.key}`);
      console.log(`  - value: ${setting.value}`);
      console.log(`  - type: ${setting.type || 'not specified'}`);
    } else {
      readErrors++;
    }
  }

  console.log(`\nFiles read successfully: ${settingsToMigrate.length}`);
  console.log(`Read errors: ${readErrors}`);

  // Step 2: Check database connection and existing settings
  console.log('\n' + '='.repeat(50));
  console.log('Step 2: Checking database...\n');

  try {
    // Check if we can connect to the database
    const { data: testConnection, error: connectionError } = await supabase
      .from('settings')
      .select('key')
      .limit(1);

    if (connectionError) {
      console.log('❌ Cannot connect to database:', connectionError.message);
      console.log('\nNote: The migration requires a running Supabase instance.');
      return;
    }

    console.log('✓ Database connection successful');

    // Check for existing coming_soon_enabled setting
    const { data: existingEnabled } = await supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'coming_soon_enabled')
      .single();

    if (existingEnabled) {
      console.log(`\nFound legacy setting: coming_soon_enabled = ${existingEnabled.value}`);
      console.log('→ This would be renamed to: coming_soon_mode');
    }

    // Check for existing coming-soon settings
    const { data: existingSettings } = await supabase
      .from('settings')
      .select('key, value')
      .like('key', 'coming_soon_%')
      .order('key');

    if (existingSettings && existingSettings.length > 0) {
      console.log('\nExisting coming-soon settings in database:');
      existingSettings.forEach(setting => {
        console.log(`  - ${setting.key}: ${setting.value}`);
      });
    } else {
      console.log('\nNo existing coming-soon settings found in database.');
    }

  } catch (error) {
    console.log('❌ Database error:', error);
    console.log('\nNote: The migration requires a running Supabase instance.');
    return;
  }

  // Step 3: Show what would be migrated
  console.log('\n' + '='.repeat(50));
  console.log('Step 3: Migration Plan\n');
  console.log('The following operations would be performed:\n');

  settingsToMigrate.forEach((setting, index) => {
    console.log(`${index + 1}. UPSERT setting:`);
    console.log(`   - key: ${setting.key}`);
    console.log(`   - value: ${setting.value}`);
    console.log(`   - action: Insert new or update existing\n`);
  });

  // Summary
  console.log('='.repeat(50));
  console.log('\nDRY RUN SUMMARY:');
  console.log(`- Settings to migrate: ${settingsToMigrate.length}`);
  console.log(`- Read errors: ${readErrors}`);
  console.log(`- Database accessible: Yes`);
  console.log('\nTo execute the actual migration, run:');
  console.log('  npx tsx scripts/migrate-coming-soon-settings.ts');
  console.log('\n⚠️  Make sure Supabase is running before executing the migration.');
}

// Run the dry run
dryRunMigration().catch(error => {
  console.error('Fatal error during dry run:', error);
  process.exit(1);
});