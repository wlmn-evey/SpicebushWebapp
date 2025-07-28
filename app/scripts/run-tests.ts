#!/usr/bin/env tsx

/**
 * Test Runner Script for Spicebush Montessori Critical Fixes
 * 
 * This script helps run the appropriate tests for verifying critical fixes:
 * 1. Admin authorization system
 * 2. Email standardization
 * 3. Footer accessibility
 * 4. Friday closing time display
 * 5. Console log removal
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command: string, description: string): boolean {
  log(`\n🧪 ${description}`, colors.cyan);
  log(`   Running: ${command}`, colors.blue);
  
  try {
    execSync(command, { stdio: 'inherit' });
    log(`✅ ${description} - PASSED`, colors.green);
    return true;
  } catch (error) {
    log(`❌ ${description} - FAILED`, colors.red);
    return false;
  }
}

async function main() {
  log('\n🚀 Spicebush Montessori Test Suite', colors.cyan);
  log('================================', colors.cyan);
  
  const args = process.argv.slice(2);
  const testType = args[0] || 'all';
  
  const results: { test: string; passed: boolean }[] = [];
  
  // Check if dependencies are installed
  if (!existsSync(join(process.cwd(), 'node_modules'))) {
    log('\n⚠️  Dependencies not installed. Running npm install...', colors.yellow);
    execSync('npm install', { stdio: 'inherit' });
  }
  
  // Install Playwright browsers if needed
  if (!existsSync(join(process.cwd(), 'node_modules/.cache/ms-playwright'))) {
    log('\n⚠️  Installing Playwright browsers...', colors.yellow);
    execSync('npx playwright install', { stdio: 'inherit' });
  }
  
  switch (testType) {
    case 'unit':
      results.push({
        test: 'Unit Tests',
        passed: runCommand('npm run test:unit', 'Unit Tests (admin-config, components)'),
      });
      break;
      
    case 'integration':
      results.push({
        test: 'Integration Tests',
        passed: runCommand('npm run test:integration', 'Integration Tests (admin auth flow)'),
      });
      break;
      
    case 'accessibility':
      results.push({
        test: 'Accessibility Tests',
        passed: runCommand('npm run test:accessibility', 'Accessibility Tests (footer contrast)'),
      });
      break;
      
    case 'e2e':
      results.push({
        test: 'E2E Tests',
        passed: runCommand('npm run test:e2e', 'End-to-End Tests (critical user journeys)'),
      });
      break;
      
    case 'visual':
      results.push({
        test: 'Visual Regression',
        passed: runCommand('npm run test:visual', 'Visual Regression Tests'),
      });
      break;
      
    case 'quick':
      // Quick test suite for rapid feedback
      results.push({
        test: 'Unit Tests',
        passed: runCommand('npm run test:unit', 'Unit Tests'),
      });
      results.push({
        test: 'Accessibility Tests',
        passed: runCommand('npm run test:accessibility', 'Accessibility Tests'),
      });
      break;
      
    case 'ci':
      // CI test suite
      results.push({
        test: 'All Tests with Coverage',
        passed: runCommand('npm run test:ci', 'CI Test Suite'),
      });
      break;
      
    case 'all':
    default:
      // Run all test suites
      results.push({
        test: 'Unit Tests',
        passed: runCommand('npm run test:unit', 'Unit Tests'),
      });
      results.push({
        test: 'Integration Tests',
        passed: runCommand('npm run test:integration', 'Integration Tests'),
      });
      results.push({
        test: 'Accessibility Tests',
        passed: runCommand('npm run test:accessibility', 'Accessibility Tests'),
      });
      results.push({
        test: 'E2E Tests',
        passed: runCommand('npm run test:e2e', 'End-to-End Tests'),
      });
      break;
  }
  
  // Additional checks
  log('\n🔍 Running additional checks...', colors.cyan);
  
  // Check for console.log statements
  try {
    execSync('grep -r "console\\.log" src/ --include="*.ts" --include="*.tsx" --include="*.astro" || true', { 
      stdio: 'pipe' 
    });
    const consoleLogOutput = execSync(
      'grep -r "console\\.log" src/ --include="*.ts" --include="*.tsx" --include="*.astro" || echo "none"', 
      { encoding: 'utf8' }
    ).trim();
    
    if (consoleLogOutput !== 'none' && consoleLogOutput.length > 0) {
      log('⚠️  Found console.log statements:', colors.yellow);
      console.log(consoleLogOutput);
      results.push({ test: 'Console.log Check', passed: false });
    } else {
      log('✅ No console.log statements found', colors.green);
      results.push({ test: 'Console.log Check', passed: true });
    }
  } catch (error) {
    log('✅ No console.log statements found', colors.green);
    results.push({ test: 'Console.log Check', passed: true });
  }
  
  // Summary
  log('\n📊 Test Summary', colors.cyan);
  log('===============', colors.cyan);
  
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    log(`${icon} ${result.test}`, color);
  });
  
  log('\n📈 Results:', colors.cyan);
  log(`   Total Tests: ${totalTests}`, colors.blue);
  log(`   Passed: ${passedTests}`, colors.green);
  log(`   Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
  
  // Critical fixes verification
  log('\n🔐 Critical Fixes Verification:', colors.cyan);
  log('1. Admin Authorization: Check admin-config.test.ts results', colors.blue);
  log('2. Email Standardization: Check footer-contrast.test.ts results', colors.blue);
  log('3. Footer Accessibility: Check visual regression results', colors.blue);
  log('4. Friday Hours Display: Check hours-widget.test.ts results', colors.blue);
  log('5. Console Logs: ' + (results.find(r => r.test === 'Console.log Check')?.passed ? 'CLEAN' : 'NEEDS CLEANUP'), 
      results.find(r => r.test === 'Console.log Check')?.passed ? colors.green : colors.red);
  
  // Exit with appropriate code
  if (failedTests > 0) {
    log('\n❌ Tests failed! Please fix the issues above.', colors.red);
    process.exit(1);
  } else {
    log('\n✅ All tests passed! Ready for deployment.', colors.green);
    process.exit(0);
  }
}

// Show usage if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  log('Usage: tsx scripts/run-tests.ts [test-type]', colors.cyan);
  log('\nTest Types:', colors.blue);
  log('  all          - Run all test suites (default)');
  log('  unit         - Run unit tests only');
  log('  integration  - Run integration tests only');
  log('  accessibility - Run accessibility tests only');
  log('  e2e          - Run end-to-end tests only');
  log('  visual       - Run visual regression tests only');
  log('  quick        - Run quick test suite (unit + accessibility)');
  log('  ci           - Run CI test suite with coverage');
  log('\nExamples:', colors.blue);
  log('  tsx scripts/run-tests.ts');
  log('  tsx scripts/run-tests.ts unit');
  log('  tsx scripts/run-tests.ts quick');
  process.exit(0);
}

// Run the test suite
main().catch(error => {
  log(`\n❌ Test runner error: ${error.message}`, colors.red);
  process.exit(1);
});