#!/usr/bin/env tsx

import { exec } from 'child_process';
import { promisify } from 'util';
import * as readline from 'readline';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise(resolve => rl.question(query, resolve));
};

interface TestOption {
  name: string;
  command: string;
  description: string;
}

const testOptions: TestOption[] = [
  {
    name: 'Quick Smoke Test',
    command: 'npm run test:smoke',
    description: 'Fast smoke test - essential checks only (< 30s)'
  },
  {
    name: 'Critical Path Test',
    command: 'npm run test:smoke:critical',
    description: 'Ultra-fast critical user journey test (< 15s)'
  },
  {
    name: 'Comprehensive Browser Test',
    command: 'npm run test:comprehensive',
    description: 'Full browser test suite with detailed reporting'
  },
  {
    name: 'Docker Health Check',
    command: 'npm run test:docker:health',
    description: 'Check Docker container health and configuration'
  },
  {
    name: 'All Browser Tests',
    command: 'npm run test:browser:all',
    description: 'Run all browser tests in the critical folder'
  },
  {
    name: 'Coming Soon Tests',
    command: 'npm run test:coming-soon:e2e',
    description: 'Test coming soon functionality'
  },
  {
    name: 'Interactive Test UI',
    command: 'npx playwright test --ui',
    description: 'Open Playwright UI for interactive testing'
  },
  {
    name: 'View Last Report',
    command: 'npm run test:browser:report',
    description: 'Open the HTML report from the last test run'
  }
];

async function main() {
  console.log('\n🧪 Browser Test Runner\n');
  console.log('Select a test suite to run:\n');

  testOptions.forEach((option, index) => {
    console.log(`${index + 1}. ${option.name}`);
    console.log(`   ${option.description}\n`);
  });

  const choice = await question('Enter your choice (1-8) or q to quit: ');

  if (choice.toLowerCase() === 'q') {
    console.log('Goodbye!');
    rl.close();
    process.exit(0);
  }

  const index = parseInt(choice) - 1;
  if (index < 0 || index >= testOptions.length) {
    console.log('Invalid choice!');
    rl.close();
    process.exit(1);
  }

  const selected = testOptions[index];
  console.log(`\n📋 Running: ${selected.name}\n`);

  // Check if we should run with specific browser
  let browserChoice = '';
  if (!selected.command.includes('--ui') && !selected.command.includes('report')) {
    const useBrowser = await question('Run with specific browser? (c)hrome, (f)irefox, (w)ebkit, or (a)ll [default: all]: ');
    
    switch(useBrowser.toLowerCase()) {
      case 'c':
        browserChoice = ' --project=chromium';
        break;
      case 'f':
        browserChoice = ' --project=firefox';
        break;
      case 'w':
        browserChoice = ' --project=webkit';
        break;
    }
  }

  // Check if we should run in headed mode
  let headedMode = '';
  if (!selected.command.includes('--ui') && !selected.command.includes('report')) {
    const headed = await question('Run in headed mode (see browser)? (y/N): ');
    if (headed.toLowerCase() === 'y') {
      headedMode = ' --headed';
    }
  }

  const command = selected.command + browserChoice + headedMode;
  console.log(`\n🚀 Executing: ${command}\n`);

  try {
    // Create test results directory
    await mkdir('test-results', { recursive: true });

    // Run the test
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command, {
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ Tests completed in ${duration}s`);

    // Generate summary report
    await generateSummaryReport(selected.name, duration);

    // Ask if user wants to view report
    if (selected.name !== 'View Last Report') {
      const viewReport = await question('\nView HTML report? (y/N): ');
      if (viewReport.toLowerCase() === 'y') {
        await execAsync('npm run test:browser:report');
      }
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:');
    console.error(error.message);
    
    // Still ask to view report on failure
    const viewReport = await question('\nView HTML report to see details? (y/N): ');
    if (viewReport.toLowerCase() === 'y') {
      try {
        await execAsync('npm run test:browser:report');
      } catch (e) {
        console.error('Could not open report:', e.message);
      }
    }
  }

  rl.close();
}

async function generateSummaryReport(testName: string, duration: string) {
  const summaryPath = join('test-results', 'last-run-summary.json');
  
  try {
    const summary = {
      testName,
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
      command: process.argv.join(' ')
    };

    await writeFile(summaryPath, JSON.stringify(summary, null, 2));

    // Try to read results.json if it exists
    try {
      const resultsPath = join('test-results', 'results.json');
      const results = JSON.parse(await readFile(resultsPath, 'utf-8'));
      
      const stats = results.stats || {};
      console.log('\n📊 Test Summary:');
      console.log(`   Total tests: ${stats.total || 'N/A'}`);
      console.log(`   Passed: ${stats.passed || 'N/A'}`);
      console.log(`   Failed: ${stats.failed || 'N/A'}`);
      console.log(`   Skipped: ${stats.skipped || 'N/A'}`);
      console.log(`   Duration: ${duration}s`);
    } catch (e) {
      // Results file might not exist for all test types
    }
  } catch (error) {
    // Ignore summary generation errors
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\nTest run cancelled.');
  rl.close();
  process.exit(0);
});

main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});