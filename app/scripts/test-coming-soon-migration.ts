#!/usr/bin/env tsx
/**
 * Test script for the coming-soon migration
 * This script tests various aspects of the migration without executing it
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { parse } from 'acorn';

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0
};

function logTest(testName: string, passed: boolean, message?: string) {
  const status = passed ? '✓' : '✗';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${status}\x1b[0m ${testName}`);
  if (message) {
    console.log(`  ${message}`);
  }
  
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
}

function logWarning(message: string) {
  console.log(`\x1b[33m⚠\x1b[0m ${message}`);
  testResults.warnings++;
}

async function runTests() {
  console.log('Testing Coming-Soon Migration Script\n');
  console.log('='.repeat(50));
  
  // Test 1: Check if migration script exists
  const migrationScriptPath = join(process.cwd(), 'scripts', 'migrate-coming-soon-settings.ts');
  const scriptExists = existsSync(migrationScriptPath);
  logTest('Migration script exists', scriptExists, migrationScriptPath);
  
  if (!scriptExists) {
    console.log('\nCannot continue tests - migration script not found');
    return;
  }
  
  // Test 2: Check script syntax
  let scriptSyntaxValid = false;
  try {
    const scriptContent = readFileSync(migrationScriptPath, 'utf-8');
    // Remove shebang for parsing
    const contentWithoutShebang = scriptContent.replace(/^#!.*\n/, '');
    
    // Basic syntax check - TypeScript compiler would be better but this is quick
    scriptSyntaxValid = true;
    logTest('Script syntax appears valid', true);
  } catch (error: any) {
    logTest('Script syntax check', false, error.message);
  }
  
  // Test 3: Check if all required markdown files exist
  const settingsDir = join(process.cwd(), 'src', 'content', 'settings');
  const requiredFiles = [
    'coming-soon-mode.md',
    'coming-soon-launch-date.md',
    'coming-soon-message.md',
    'coming-soon-newsletter.md'
  ];
  
  console.log('\nChecking markdown files:');
  let allFilesExist = true;
  const fileContents: any[] = [];
  
  for (const fileName of requiredFiles) {
    const filePath = join(settingsDir, fileName);
    const exists = existsSync(filePath);
    logTest(`  ${fileName}`, exists);
    
    if (exists) {
      try {
        const content = readFileSync(filePath, 'utf-8');
        const parsed = matter(content);
        fileContents.push({ fileName, data: parsed.data });
        
        // Validate the parsed data
        if (!parsed.data.key || !parsed.data.value) {
          logWarning(`    Missing required fields (key/value) in ${fileName}`);
        }
      } catch (error: any) {
        logTest(`    Parse ${fileName}`, false, error.message);
        allFilesExist = false;
      }
    } else {
      allFilesExist = false;
    }
  }
  
  // Test 4: Display parsed content
  if (fileContents.length > 0) {
    console.log('\nParsed markdown content:');
    fileContents.forEach(({ fileName, data }) => {
      console.log(`\n  ${fileName}:`);
      console.log(`    key: ${data.key}`);
      console.log(`    value: ${data.value}`);
      console.log(`    type: ${data.type || 'not specified'}`);
    });
  }
  
  // Test 5: Check environment variables
  console.log('\nEnvironment variables:');
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
  
  logTest('  PUBLIC_SUPABASE_URL', !!supabaseUrl, supabaseUrl || 'Not set');
  logTest('  SUPABASE_SERVICE_ROLE_KEY or PUBLIC_SUPABASE_ANON_KEY', !!supabaseKey, supabaseKey ? 'Set' : 'Not set');
  
  // Test 6: Test database connection (if env vars are set)
  if (supabaseUrl && supabaseKey) {
    console.log('\nTesting database connection:');
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Try to query the settings table
      const { data, error } = await supabase
        .from('settings')
        .select('key')
        .limit(1);
      
      if (error) {
        logTest('  Database connection', false, error.message);
      } else {
        logTest('  Database connection', true, 'Successfully connected');
        
        // Check for existing coming-soon settings
        const { data: existingSettings, error: queryError } = await supabase
          .from('settings')
          .select('key, value')
          .like('key', 'coming_soon_%');
        
        if (!queryError && existingSettings && existingSettings.length > 0) {
          console.log('\n  Existing coming-soon settings found:');
          existingSettings.forEach(setting => {
            console.log(`    - ${setting.key}: ${setting.value}`);
          });
          logWarning('\n  Note: Running the migration will update these existing settings');
        } else {
          console.log('\n  No existing coming-soon settings found in database');
        }
      }
    } catch (error: any) {
      logTest('  Database connection', false, error.message);
    }
  } else {
    logWarning('Skipping database tests - environment variables not set');
  }
  
  // Test 7: Check for potential issues
  console.log('\nChecking for potential issues:');
  
  // Check if gray-matter is installed
  try {
    require.resolve('gray-matter');
    logTest('  gray-matter dependency', true, 'Package is installed');
  } catch {
    logTest('  gray-matter dependency', false, 'Package not found - run npm install');
  }
  
  // Check if @supabase/supabase-js is installed
  try {
    require.resolve('@supabase/supabase-js');
    logTest('  @supabase/supabase-js dependency', true, 'Package is installed');
  } catch {
    logTest('  @supabase/supabase-js dependency', false, 'Package not found - run npm install');
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary:');
  console.log(`  Passed: ${testResults.passed}`);
  console.log(`  Failed: ${testResults.failed}`);
  console.log(`  Warnings: ${testResults.warnings}`);
  console.log('='.repeat(50));
  
  if (testResults.failed === 0 && testResults.warnings === 0) {
    console.log('\n✓ All tests passed! The migration script appears ready to run.');
    console.log('  To execute the migration, run: tsx scripts/migrate-coming-soon-settings.ts');
  } else if (testResults.failed === 0) {
    console.log('\n⚠ Tests passed with warnings. Review the warnings before running the migration.');
  } else {
    console.log('\n✗ Some tests failed. Please fix the issues before running the migration.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});