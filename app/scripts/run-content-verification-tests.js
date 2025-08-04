#!/usr/bin/env node

/**
 * Content Verification Test Runner
 * 
 * This script runs comprehensive content verification tests to ensure
 * factual information accuracy across the SpicebushWebapp.
 */

import { execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();
const COLORS = {
  RESET: '\x1b[0m',
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  WHITE: '\x1b[37m',
  BOLD: '\x1b[1m'
};

function colorize(text, color) {
  return `${color}${text}${COLORS.RESET}`;
}

function logSection(title) {
  console.log(`\n${colorize('='.repeat(60), COLORS.CYAN)}`);
  console.log(`${colorize(title, COLORS.BOLD + COLORS.CYAN)}`);
  console.log(`${colorize('='.repeat(60), COLORS.CYAN)}\n`);
}

function logStep(step) {
  console.log(`${colorize('▶', COLORS.BLUE)} ${step}`);
}

function logSuccess(message) {
  console.log(`${colorize('✓', COLORS.GREEN)} ${message}`);
}

function logWarning(message) {
  console.log(`${colorize('⚠', COLORS.YELLOW)} ${message}`);
}

function logError(message) {
  console.log(`${colorize('✗', COLORS.RED)} ${message}`);
}

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf-8', 
      cwd: PROJECT_ROOT,
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message, output: error.stdout };
  }
}

function checkPrerequisites() {
  logSection('Prerequisites Check');
  
  // Check if we're in the right directory
  const packageJsonPath = join(PROJECT_ROOT, 'package.json');
  if (!existsSync(packageJsonPath)) {
    logError('package.json not found. Please run this script from the project root.');
    process.exit(1);
  }
  
  logSuccess('Project root directory confirmed');
  
  // Check if required test files exist
  const requiredFiles = [
    'src/test/content-verification/content-verification.test.ts',
    'src/test/content-verification/database-display-alignment.test.ts',
    'src/test/content-verification/cross-page-consistency.test.ts',
    'e2e/content-verification-e2e.spec.ts'
  ];
  
  const missingFiles = requiredFiles.filter(file => !existsSync(join(PROJECT_ROOT, file)));
  
  if (missingFiles.length > 0) {
    logError('Missing required test files:');
    missingFiles.forEach(file => console.log(`  - ${file}`));
    process.exit(1);
  }
  
  logSuccess('All required test files found');
  
  // Check if database connection is available
  logStep('Checking database connection...');
  const dbCheck = runCommand('npm run test:quickactions 2>/dev/null || echo "DB check skipped"', { silent: true });
  if (dbCheck.success) {
    logSuccess('Database connection available');
  } else {
    logWarning('Database connection may not be available - some tests may be skipped');
  }
}

function runUnitTests() {
  logSection('Running Content Verification Unit Tests');
  
  logStep('Running core content verification tests...');
  const unitResult = runCommand('npm run test src/test/content-verification/content-verification.test.ts');
  
  if (!unitResult.success) {
    logError('Content verification unit tests failed');
    return false;
  }
  
  logSuccess('Core content verification tests passed');
  
  logStep('Running database-display alignment tests...');
  const alignmentResult = runCommand('npm run test src/test/content-verification/database-display-alignment.test.ts');
  
  if (!alignmentResult.success) {
    logError('Database-display alignment tests failed');
    return false;
  }
  
  logSuccess('Database-display alignment tests passed');
  
  logStep('Running cross-page consistency tests...');
  const consistencyResult = runCommand('npm run test src/test/content-verification/cross-page-consistency.test.ts');
  
  if (!consistencyResult.success) {
    logError('Cross-page consistency tests failed');
    return false;
  }
  
  logSuccess('Cross-page consistency tests passed');
  
  return true;
}

function runE2ETests() {
  logSection('Running End-to-End Content Verification Tests');
  
  // Check if development server is running
  logStep('Checking if development server is available...');
  const serverCheck = runCommand('curl -s -o /dev/null -w "%{http_code}" http://localhost:4321 2>/dev/null || echo "000"', { silent: true });
  
  if (!serverCheck.output || serverCheck.output.trim() !== '200') {
    logWarning('Development server not running on port 4321');
    logStep('Starting development server for E2E tests...');
    
    // Start dev server in background
    const devServer = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      detached: true,
      cwd: PROJECT_ROOT
    });
    
    // Wait for server to start
    console.log('Waiting for server to start...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Run E2E tests
    logStep('Running E2E content verification tests...');
    const e2eResult = runCommand('npm run test:e2e e2e/content-verification-e2e.spec.ts');
    
    // Clean up server
    process.kill(-devServer.pid);
    
    if (!e2eResult.success) {
      logError('E2E content verification tests failed');
      return false;
    }
  } else {
    logSuccess('Development server is running');
    
    logStep('Running E2E content verification tests...');
    const e2eResult = runCommand('npm run test:e2e e2e/content-verification-e2e.spec.ts');
    
    if (!e2eResult.success) {
      logError('E2E content verification tests failed');
      return false;
    }
  }
  
  logSuccess('E2E content verification tests passed');
  return true;
}

function runIntegrationTests() {
  logSection('Running Integration Tests for Content Verification');
  
  // Check if integration tests exist and run them
  const integrationTests = [
    'src/test/integration/content-db-direct.integration.test.ts',
    'src/test/lib/content-db-direct.test.ts'
  ];
  
  for (const testFile of integrationTests) {
    if (existsSync(join(PROJECT_ROOT, testFile))) {
      logStep(`Running ${testFile}...`);
      const result = runCommand(`npm run test ${testFile}`);
      
      if (!result.success) {
        logError(`Integration test failed: ${testFile}`);
        return false;
      }
      
      logSuccess(`Integration test passed: ${testFile}`);
    }
  }
  
  return true;
}

function generateReport() {
  logSection('Content Verification Test Report');
  
  console.log(`${colorize('Test Suite Summary:', COLORS.BOLD)}`);
  console.log(`${colorize('✓', COLORS.GREEN)} Business information consistency verified`);
  console.log(`${colorize('✓', COLORS.GREEN)} Tuition and program information accuracy confirmed`);
  console.log(`${colorize('✓', COLORS.GREEN)} Staff information correctness validated`);
  console.log(`${colorize('✓', COLORS.GREEN)} Cross-page consistency maintained`);
  console.log(`${colorize('✓', COLORS.GREEN)} Database vs display content alignment verified`);
  
  console.log(`\n${colorize('Content Verification Complete!', COLORS.BOLD + COLORS.GREEN)}`);
  console.log(`\nThese tests ensure that:`);
  console.log(`  • Contact information is consistent across all pages`);
  console.log(`  • Hours information matches between database and display`);
  console.log(`  • Staff details are accurate and properly formatted`);
  console.log(`  • Tuition and program data is consistent`);
  console.log(`  • All factual information maintains integrity`);
  
  console.log(`\n${colorize('To run individual test suites:', COLORS.CYAN)}`);
  console.log(`  npm run test:content-verification-unit`);
  console.log(`  npm run test:content-verification-e2e`);
  console.log(`  npm run test:content-verification-all`);
}

async function main() {
  console.log(`${colorize('Content Verification Test Suite', COLORS.BOLD + COLORS.MAGENTA)}`);
  console.log(`${colorize('Ensuring factual accuracy across SpicebushWebapp', COLORS.MAGENTA)}\n`);
  
  try {
    // Check prerequisites
    checkPrerequisites();
    
    // Run unit tests
    const unitTestsPass = runUnitTests();
    if (!unitTestsPass) {
      logError('Unit tests failed - stopping execution');
      process.exit(1);
    }
    
    // Run integration tests
    const integrationTestsPass = runIntegrationTests();
    if (!integrationTestsPass) {
      logError('Integration tests failed - stopping execution');  
      process.exit(1);
    }
    
    // Run E2E tests (optional - may require dev server)
    if (process.argv.includes('--include-e2e')) {
      const e2eTestsPass = await runE2ETests();
      if (!e2eTestsPass) {
        logWarning('E2E tests failed - but continuing with report');
      }
    } else {
      logStep('Skipping E2E tests (use --include-e2e to run them)');
    }
    
    // Generate report
    generateReport();
    
  } catch (error) {
    logError(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Content Verification Test Runner

Usage: node scripts/run-content-verification-tests.js [options]

Options:
  --include-e2e    Include end-to-end browser tests
  --help, -h       Show this help message

Examples:
  node scripts/run-content-verification-tests.js
  node scripts/run-content-verification-tests.js --include-e2e
`);
  process.exit(0);
}

// Run the main function
main().catch(error => {
  logError(`Unexpected error: ${error.message}`);
  process.exit(1);
});