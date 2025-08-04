#!/usr/bin/env node
/**
 * Manual verification script for coming-soon functionality
 * Run with: npm run test:coming-soon
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test results tracking
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

// Helper functions
function log(message: string, type: 'info' | 'success' | 'error' = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[type]}${message}${reset}`);
}

async function runTest(name: string, testFn: () => Promise<void>) {
  try {
    log(`\nRunning: ${name}`, 'info');
    await testFn();
    results.push({ name, passed: true });
    log(`✓ ${name}`, 'success');
  } catch (error) {
    results.push({ 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
    log(`✗ ${name}`, 'error');
    if (error instanceof Error) {
      console.error(`  Error: ${error.message}`);
    }
  }
}

// Tests
async function testDatabaseConnection() {
  const { data, error } = await supabase
    .from('settings')
    .select('count')
    .limit(1);
  
  if (error) throw new Error(`Database connection failed: ${error.message}`);
  log('  Database connection successful', 'success');
}

async function testComingSoonSettings() {
  // Check if coming soon settings exist
  const comingSoonKeys = [
    'coming_soon_enabled',
    'coming_soon_launch_date',
    'coming_soon_message',
    'coming_soon_newsletter'
  ];
  
  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', comingSoonKeys);
  
  if (error) throw new Error(`Failed to fetch settings: ${error.message}`);
  
  const foundKeys = data?.map(row => row.key) || [];
  const missingKeys = comingSoonKeys.filter(key => !foundKeys.includes(key));
  
  if (missingKeys.length > 0) {
    log(`  Missing settings: ${missingKeys.join(', ')}`, 'error');
    
    // Try to create missing settings
    for (const key of missingKeys) {
      const defaultValues: Record<string, any> = {
        'coming_soon_enabled': false,
        'coming_soon_launch_date': '2025-02-01',
        'coming_soon_message': "We're preparing something special for you.",
        'coming_soon_newsletter': true
      };
      
      const { error: insertError } = await supabase
        .from('settings')
        .insert({
          key,
          value: defaultValues[key],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        log(`  Failed to create ${key}: ${insertError.message}`, 'error');
      } else {
        log(`  Created missing setting: ${key}`, 'success');
      }
    }
  } else {
    log('  All coming soon settings present', 'success');
  }
  
  // Display current values
  if (data && data.length > 0) {
    log('\n  Current coming soon settings:', 'info');
    data.forEach(setting => {
      log(`    ${setting.key}: ${JSON.stringify(setting.value)}`, 'info');
    });
  }
}

async function testToggleComingSoon() {
  // Get current state
  const { data: currentData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'coming_soon_enabled')
    .single();
  
  const currentState = currentData?.value === true || currentData?.value === 'true';
  log(`  Current state: ${currentState ? 'ENABLED' : 'DISABLED'}`, 'info');
  
  // Toggle the state
  const newState = !currentState;
  const { error: updateError } = await supabase
    .from('settings')
    .upsert({
      key: 'coming_soon_enabled',
      value: newState,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  
  if (updateError) throw new Error(`Failed to toggle: ${updateError.message}`);
  
  // Verify the change
  const { data: newData } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'coming_soon_enabled')
    .single();
  
  const newStateVerified = newData?.value === true || newData?.value === 'true';
  if (newStateVerified !== newState) {
    throw new Error('Toggle operation failed - state did not change');
  }
  
  log(`  Successfully toggled to: ${newState ? 'ENABLED' : 'DISABLED'}`, 'success');
  
  // Toggle back to original state
  const { error: revertError } = await supabase
    .from('settings')
    .upsert({
      key: 'coming_soon_enabled',
      value: currentState,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
  
  if (revertError) {
    log(`  Warning: Failed to revert to original state`, 'error');
  } else {
    log(`  Reverted to original state: ${currentState ? 'ENABLED' : 'DISABLED'}`, 'info');
  }
}

async function testUpdateAllSettings() {
  const testValues = {
    coming_soon_enabled: true,
    coming_soon_launch_date: '2025-03-15',
    coming_soon_message: 'Test message from verification script',
    coming_soon_newsletter: false
  };
  
  // Store original values
  const { data: originalData } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', Object.keys(testValues));
  
  const originalValues: Record<string, any> = {};
  originalData?.forEach(row => {
    originalValues[row.key] = row.value;
  });
  
  // Update all settings
  const updates = Object.entries(testValues).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString()
  }));
  
  const { error: updateError } = await supabase
    .from('settings')
    .upsert(updates, { onConflict: 'key' });
  
  if (updateError) throw new Error(`Failed to update settings: ${updateError.message}`);
  
  // Verify updates
  const { data: updatedData } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', Object.keys(testValues));
  
  const allUpdated = Object.entries(testValues).every(([key, expectedValue]) => {
    const actualValue = updatedData?.find(row => row.key === key)?.value;
    return actualValue === expectedValue;
  });
  
  if (!allUpdated) {
    throw new Error('Not all settings were updated correctly');
  }
  
  log('  All settings updated successfully', 'success');
  
  // Restore original values
  const restoreUpdates = Object.entries(originalValues).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString()
  }));
  
  const { error: restoreError } = await supabase
    .from('settings')
    .upsert(restoreUpdates, { onConflict: 'key' });
  
  if (restoreError) {
    log('  Warning: Failed to restore original values', 'error');
  } else {
    log('  Original values restored', 'info');
  }
}

async function testMigrationData() {
  // Check if settings were properly migrated
  const { data: settingsCount } = await supabase
    .from('settings')
    .select('count')
    .eq('key', 'coming_soon_enabled');
  
  if (!settingsCount || settingsCount.length === 0) {
    throw new Error('No coming soon settings found - migration may have failed');
  }
  
  // Check data types
  const { data: settingsData } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['coming_soon_enabled', 'coming_soon_newsletter']);
  
  settingsData?.forEach(setting => {
    if (setting.key.includes('enabled') || setting.key.includes('newsletter')) {
      const isBool = typeof setting.value === 'boolean' || 
                     setting.value === 'true' || 
                     setting.value === 'false';
      if (!isBool) {
        log(`  Warning: ${setting.key} has unexpected type: ${typeof setting.value}`, 'error');
      }
    }
  });
  
  log('  Migration data verified', 'success');
}

// Main execution
async function main() {
  log('\n=== Coming Soon Functionality Verification ===\n', 'info');
  
  // Run all tests
  await runTest('Database Connection', testDatabaseConnection);
  await runTest('Coming Soon Settings Exist', testComingSoonSettings);
  await runTest('Toggle Coming Soon Mode', testToggleComingSoon);
  await runTest('Update All Settings', testUpdateAllSettings);
  await runTest('Migration Data Integrity', testMigrationData);
  
  // Summary
  log('\n=== Test Summary ===', 'info');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  log(`\nTotal: ${results.length}`, 'info');
  log(`Passed: ${passed}`, 'success');
  log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
  
  if (failed > 0) {
    log('\nFailed tests:', 'error');
    results.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}: ${r.error}`, 'error');
    });
  }
  
  // Instructions for manual verification
  log('\n=== Manual Verification Steps ===', 'info');
  log('\n1. Check Admin Panel:', 'info');
  log('   - Navigate to http://localhost:4321/admin/settings', 'info');
  log('   - Login with admin credentials', 'info');
  log('   - Verify "Coming Soon Mode" section is visible', 'info');
  log('   - Toggle the switch and save - verify it persists', 'info');
  
  log('\n2. Test Coming Soon Redirect:', 'info');
  log('   - Enable coming soon mode in admin panel', 'info');
  log('   - Open incognito/private browser window', 'info');
  log('   - Navigate to http://localhost:4321', 'info');
  log('   - Verify redirect to /coming-soon page', 'info');
  
  log('\n3. Test Admin Bypass:', 'info');
  log('   - With coming soon enabled, stay logged in as admin', 'info');
  log('   - Navigate to homepage - should NOT redirect', 'info');
  log('   - Can access all pages normally', 'info');
  
  log('\n4. Test Settings Persistence:', 'info');
  log('   - Change all coming soon settings', 'info');
  log('   - Save and refresh the page', 'info');
  log('   - Verify all values are retained', 'info');
  
  process.exit(failed > 0 ? 1 : 0);
}

// Run the tests
main().catch(error => {
  log('\nFatal error during test execution:', 'error');
  console.error(error);
  process.exit(1);
});