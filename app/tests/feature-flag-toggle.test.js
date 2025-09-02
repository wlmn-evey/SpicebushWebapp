#!/usr/bin/env node

/**
 * Feature Flag Toggle Test
 * Tests that the auth system correctly switches between Clerk and Supabase
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: [],
};

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function testPassed(name, message) {
  log(`✅ ${name}: ${message}`, colors.green);
  results.passed.push({ name, message });
}

function testFailed(name, message) {
  log(`❌ ${name}: ${message}`, colors.red);
  results.failed.push({ name, message });
}

function testWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
  results.warnings.push(message);
}

// Test 1: Check if feature flag is set
function testFeatureFlag() {
  log('\n📝 Test 1: Checking feature flag configuration...', colors.blue);
  
  const envPath = path.join(__dirname, '../.env.local');
  const envExamplePath = path.join(__dirname, '../.env.example');
  
  // Check .env.example
  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    if (envExample.includes('USE_CLERK_AUTH')) {
      testPassed('Feature Flag', 'USE_CLERK_AUTH defined in .env.example');
    } else {
      testFailed('Feature Flag', 'USE_CLERK_AUTH not found in .env.example');
    }
  } else {
    testWarning('.env.example file not found');
  }
  
  // Check .env.local if it exists
  if (fs.existsSync(envPath)) {
    const env = fs.readFileSync(envPath, 'utf8');
    const match = env.match(/USE_CLERK_AUTH=(\w+)/);
    if (match) {
      testPassed('Environment', `USE_CLERK_AUTH set to: ${match[1]}`);
    } else {
      testWarning('USE_CLERK_AUTH not set in .env.local');
    }
  } else {
    testWarning('.env.local file not found - using defaults');
  }
}

// Test 2: Check adapter files exist
function testAdapterFiles() {
  log('\n📝 Test 2: Checking adapter files...', colors.blue);
  
  const adapterFiles = [
    'src/lib/auth/adapter.ts',
    'src/lib/auth/index.ts',
    'src/lib/auth/clerk-client.ts',
    'src/lib/auth/clerk-helpers.ts',
    'src/lib/auth/types.ts',
    'src/lib/auth/errors.ts',
  ];
  
  adapterFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      testPassed('File Exists', file);
    } else {
      testFailed('File Missing', file);
    }
  });
}

// Test 3: Check parallel auth pages
function testParallelPages() {
  log('\n📝 Test 3: Checking parallel auth pages...', colors.blue);
  
  const authPages = [
    { clerk: 'src/pages/auth/clerk-sign-in.astro', supabase: 'src/pages/auth/sign-in.astro' },
    { clerk: 'src/pages/auth/clerk-callback.astro', supabase: 'src/pages/auth/callback.astro' },
    { clerk: 'src/pages/auth/clerk-sign-out.astro', supabase: 'src/pages/auth/sign-out.astro' },
  ];
  
  authPages.forEach(({ clerk, supabase }) => {
    const clerkPath = path.join(__dirname, '..', clerk);
    const supabasePath = path.join(__dirname, '..', supabase);
    
    if (fs.existsSync(clerkPath) && fs.existsSync(supabasePath)) {
      testPassed('Parallel Pages', `Both ${path.basename(clerk)} and ${path.basename(supabase)} exist`);
    } else if (!fs.existsSync(clerkPath)) {
      testFailed('Clerk Page Missing', clerk);
    } else if (!fs.existsSync(supabasePath)) {
      testFailed('Supabase Page Missing', supabase);
    }
  });
}

// Test 4: Check middleware adapter
function testMiddleware() {
  log('\n📝 Test 4: Checking middleware configuration...', colors.blue);
  
  const middlewarePath = path.join(__dirname, '../src/middleware.ts');
  const middlewareAdapterPath = path.join(__dirname, '../src/middleware-adapter.ts');
  
  if (fs.existsSync(middlewareAdapterPath)) {
    testPassed('Middleware Adapter', 'middleware-adapter.ts exists');
    
    const content = fs.readFileSync(middlewareAdapterPath, 'utf8');
    if (content.includes('shouldUseClerk')) {
      testPassed('Feature Flag Check', 'Middleware uses shouldUseClerk()');
    } else {
      testFailed('Feature Flag Check', 'Middleware does not check feature flag');
    }
  } else {
    testFailed('Middleware Adapter', 'middleware-adapter.ts not found');
  }
  
  if (fs.existsSync(middlewarePath)) {
    const content = fs.readFileSync(middlewarePath, 'utf8');
    if (content.includes('clerkMiddleware') && !content.includes('shouldUseClerk')) {
      testWarning('Original middleware still uses Clerk directly - needs update');
    }
  }
}

// Test 5: Check backup files
function testBackups() {
  log('\n📝 Test 5: Checking backup files...', colors.blue);
  
  const backupDir = path.join(__dirname, '../backup/auth-supabase');
  
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir);
    if (files.length > 0) {
      testPassed('Backup Files', `${files.length} files backed up`);
      
      // Check for critical files
      const criticalFiles = ['supabase.ts', 'AuthForm.astro'];
      criticalFiles.forEach(file => {
        if (files.includes(file)) {
          testPassed('Critical Backup', `${file} backed up`);
        } else {
          testWarning(`${file} not found in backup`);
        }
      });
    } else {
      testWarning('Backup directory exists but is empty');
    }
  } else {
    testFailed('Backup Directory', 'backup/auth-supabase not found');
  }
}

// Test 6: Check rollback script
function testRollback() {
  log('\n📝 Test 6: Checking rollback capability...', colors.blue);
  
  const rollbackScript = path.join(__dirname, '../scripts/rollback-auth.sh');
  
  if (fs.existsSync(rollbackScript)) {
    testPassed('Rollback Script', 'rollback-auth.sh exists');
    
    const stats = fs.statSync(rollbackScript);
    if (stats.mode & parseInt('111', 8)) {
      testPassed('Script Executable', 'Rollback script is executable');
    } else {
      testWarning('Rollback script exists but is not executable');
    }
  } else {
    testFailed('Rollback Script', 'rollback-auth.sh not found');
  }
}

// Test 7: Check test infrastructure
function testTestInfrastructure() {
  log('\n📝 Test 7: Checking test infrastructure...', colors.blue);
  
  const testFiles = [
    'tests/unit/clerk/auth-adapter.test.ts',
    'tests/unit/clerk/clerk-helpers.test.ts',
    'tests/integration/clerk/magic-link-flow.test.ts',
    'tests/puppeteer/test-clerk-magic-link.js',
  ];
  
  testFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
      testPassed('Test File', file);
    } else {
      testWarning(`Test file not found: ${file}`);
    }
  });
}

// Run all tests
function runTests() {
  log('🧪 Feature Flag Toggle Test Suite', colors.blue);
  log('================================', colors.blue);
  
  testFeatureFlag();
  testAdapterFiles();
  testParallelPages();
  testMiddleware();
  testBackups();
  testRollback();
  testTestInfrastructure();
  
  // Print summary
  log('\n📊 Test Summary', colors.blue);
  log('===============', colors.blue);
  log(`✅ Passed: ${results.passed.length}`, colors.green);
  log(`❌ Failed: ${results.failed.length}`, colors.red);
  log(`⚠️  Warnings: ${results.warnings.length}`, colors.yellow);
  
  if (results.failed.length > 0) {
    log('\nFailed Tests:', colors.red);
    results.failed.forEach(test => {
      log(`  - ${test.name}: ${test.message}`, colors.red);
    });
  }
  
  if (results.warnings.length > 0) {
    log('\nWarnings:', colors.yellow);
    results.warnings.forEach(warning => {
      log(`  - ${warning}`, colors.yellow);
    });
  }
  
  // Recommendations
  log('\n📋 Recommendations:', colors.blue);
  if (results.failed.length === 0) {
    log('  ✅ Migration appears ready for testing!', colors.green);
    log('  1. Test with USE_CLERK_AUTH=clerk', colors.blue);
    log('  2. Test with USE_CLERK_AUTH=supabase', colors.blue);
    log('  3. Run npm test for unit tests', colors.blue);
    log('  4. Deploy to testing environment', colors.blue);
  } else {
    log('  ⚠️  Address failed tests before proceeding', colors.yellow);
    log('  1. Fix missing files or configurations', colors.blue);
    log('  2. Re-run this test suite', colors.blue);
    log('  3. Proceed with manual testing once all tests pass', colors.blue);
  }
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run the tests
runTests();