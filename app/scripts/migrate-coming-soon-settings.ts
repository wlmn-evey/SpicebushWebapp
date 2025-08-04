#!/usr/bin/env tsx
/**
 * Migration script for coming-soon settings
 * 
 * This script migrates coming-soon configuration from markdown files
 * to the database settings table, maintaining consistency with the
 * existing key-value pattern used throughout the application.
 * 
 * The script performs upserts to handle both new installations and
 * updates to existing settings.
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
 * Migrate a single setting to the database
 */
async function migrateSetting(setting: SettingFile) {
  const { key, value } = setting;
  
  // Upsert the setting
  const { data, error } = await supabase
    .from('settings')
    .upsert({ 
      key, 
      value,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'key'
    })
    .select();

  if (error) {
    console.error(`Error migrating ${key}:`, error);
    return false;
  }

  console.log(`✓ Migrated ${key}: ${value}`);
  return true;
}

/**
 * Main migration function
 */
async function migrateComingSoonSettings() {
  console.log('Starting coming-soon settings migration...\n');

  const settingsDir = join(process.cwd(), 'src', 'content', 'settings');
  const settingFiles = [
    'coming-soon-mode.md',
    'coming-soon-launch-date.md',
    'coming-soon-message.md',
    'coming-soon-newsletter.md'
  ];

  let successCount = 0;
  let errorCount = 0;

  // Check if we have existing coming_soon_enabled setting
  const { data: existingEnabled } = await supabase
    .from('settings')
    .select('key, value')
    .eq('key', 'coming_soon_enabled')
    .single();

  if (existingEnabled) {
    console.log(`Found existing coming_soon_enabled: ${existingEnabled.value}`);
    console.log('This will be replaced by coming_soon_mode\n');
  }

  // Process each settings file
  for (const fileName of settingFiles) {
    const filePath = join(settingsDir, fileName);
    const setting = readSettingFile(filePath);
    
    if (!setting) {
      errorCount++;
      continue;
    }

    const success = await migrateSetting(setting);
    if (success) {
      successCount++;
    } else {
      errorCount++;
    }
  }

  // Handle the migration from coming_soon_enabled to coming_soon_mode
  if (existingEnabled) {
    console.log('\nMigrating coming_soon_enabled to coming_soon_mode...');
    
    // Update the key name if needed
    const { error: updateError } = await supabase
      .from('settings')
      .update({ 
        key: 'coming_soon_mode',
        updated_at: new Date().toISOString()
      })
      .eq('key', 'coming_soon_enabled');

    if (updateError) {
      console.error('Error updating key name:', updateError);
    } else {
      console.log('✓ Renamed coming_soon_enabled to coming_soon_mode');
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Migration completed:`);
  console.log(`  - Successful: ${successCount}`);
  console.log(`  - Failed: ${errorCount}`);
  console.log('='.repeat(50));

  // Verify the migration
  console.log('\nVerifying migration...');
  const { data: allSettings, error: verifyError } = await supabase
    .from('settings')
    .select('key, value')
    .like('key', 'coming_soon_%')
    .order('key');

  if (verifyError) {
    console.error('Error verifying settings:', verifyError);
  } else {
    console.log('\nCurrent coming-soon settings in database:');
    allSettings?.forEach(setting => {
      console.log(`  - ${setting.key}: ${setting.value}`);
    });
  }

  // Exit with appropriate code
  process.exit(errorCount > 0 ? 1 : 0);
}

// Run the migration
migrateComingSoonSettings().catch(error => {
  console.error('Fatal error during migration:', error);
  process.exit(1);
});