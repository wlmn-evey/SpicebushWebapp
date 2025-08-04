#!/usr/bin/env node

/**
 * Test runner for Bug #048 verification
 * Run this script to verify that the performance issue has been fixed
 */

import { spawn } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

const tests = [
  {
    name: 'Unit Tests - Whitelisting Logic',
    command: 'npm',
    args: ['test', 'tests/bug-048-performance-fix.test.ts'],
    description: 'Verifies the whitelisting implementation prevents unnecessary database queries'
  },
  {
    name: 'Performance Benchmarks',
    command: 'npm',
    args: ['test', 'tests/bug-048-performance-benchmark.test.ts'],
    description: 'Measures performance improvements and ensures operations are fast'
  },
  {
    name: 'Integration Tests',
    command: 'npm',
    args: ['test', 'tests/bug-048-integration.test.ts'],
    description: 'Tests actual page loads and verifies no collection errors occur',
    requiresServer: true
  }
];

async function runTest(test: typeof tests[0]): Promise<boolean> {
  const spinner = ora(`Running ${test.name}...`).start();
  
  return new Promise((resolve) => {
    const proc = spawn(test.command, test.args, {
      stdio: 'pipe',
      shell: true
    });
    
    let output = '';
    let errorOutput = '';
    
    proc.stdout?.on('data', (data) => {
      output += data.toString();
    });
    
    proc.stderr?.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        spinner.succeed(chalk.green(`✓ ${test.name}`));
        console.log(chalk.gray(`  ${test.description}`));
        
        // Extract and display key metrics
        const metrics = extractMetrics(output);
        if (metrics.length > 0) {
          metrics.forEach(metric => {
            console.log(chalk.cyan(`    ${metric}`));
          });
        }
        
        resolve(true);
      } else {
        spinner.fail(chalk.red(`✗ ${test.name}`));
        console.log(chalk.red(output));
        console.log(chalk.red(errorOutput));
        resolve(false);
      }
    });
  });
}

function extractMetrics(output: string): string[] {
  const metrics: string[] = [];
  
  // Extract performance timings
  const timingMatches = output.match(/\b\d+(\.\d+)?ms\b/g);
  if (timingMatches) {
    const relevantTimings = timingMatches.slice(0, 3); // First few timings
    metrics.push(`Performance: ${relevantTimings.join(', ')}`);
  }
  
  // Extract test counts
  const passMatch = output.match(/(\d+) passed/);
  if (passMatch) {
    metrics.push(`Tests passed: ${passMatch[1]}`);
  }
  
  return metrics;
}

async function startDevServer(): Promise<() => void> {
  console.log(chalk.yellow('Starting development server...'));
  
  const server = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    shell: true
  });
  
  // Wait for server to be ready
  return new Promise((resolve) => {
    let isReady = false;
    
    const checkReady = (data: Buffer) => {
      const output = data.toString();
      if (output.includes('ready in') || output.includes('Local:')) {
        if (!isReady) {
          isReady = true;
          console.log(chalk.green('✓ Development server ready'));
          resolve(() => {
            server.kill();
          });
        }
      }
    };
    
    server.stdout?.on('data', checkReady);
    server.stderr?.on('data', checkReady);
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!isReady) {
        console.log(chalk.red('✗ Server failed to start'));
        server.kill();
        resolve(() => {});
      }
    }, 30000);
  });
}

async function main() {
  console.log(chalk.bold.blue('\n🔍 Bug #048 Performance Fix Verification\n'));
  console.log(chalk.gray('This test suite verifies that the 25+ second page load issue has been resolved.\n'));
  
  let stopServer: (() => void) | null = null;
  let allTestsPassed = true;
  
  try {
    // Check if we need to start the dev server
    const needsServer = tests.some(t => t.requiresServer);
    if (needsServer) {
      stopServer = await startDevServer();
      console.log('');
    }
    
    // Run all tests
    for (const test of tests) {
      const passed = await runTest(test);
      if (!passed) {
        allTestsPassed = false;
      }
      console.log(''); // Add spacing between tests
    }
    
    // Summary
    console.log(chalk.bold('\n📊 Test Summary:\n'));
    
    if (allTestsPassed) {
      console.log(chalk.green.bold('✅ All tests passed!'));
      console.log(chalk.green('\nBug #048 has been successfully fixed:'));
      console.log(chalk.green('- Pages now load in reasonable time (< 5 seconds)'));
      console.log(chalk.green('- No more "collection does not exist" errors'));
      console.log(chalk.green('- Admin pages work correctly'));
      console.log(chalk.green('- Performance is optimized for production'));
    } else {
      console.log(chalk.red.bold('❌ Some tests failed!'));
      console.log(chalk.red('\nBug #048 may not be fully resolved.'));
      console.log(chalk.yellow('\nPlease check the failed tests above for details.'));
    }
    
  } catch (error) {
    console.error(chalk.red('\nError running tests:'), error);
  } finally {
    if (stopServer) {
      console.log(chalk.gray('\nStopping development server...'));
      stopServer();
    }
  }
  
  process.exit(allTestsPassed ? 0 : 1);
}

// Run the tests
main().catch(console.error);