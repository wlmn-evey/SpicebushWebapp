#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// Color helpers
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const blue = (text: string) => `\x1b[34m${text}\x1b[0m`;

console.log(blue('\n📊 CSS Test Report Generator\n'));

const timestamp = new Date().toISOString();
const reportDir = join(process.cwd(), 'test-results', 'css-verification');

// Ensure report directory exists
if (!existsSync(reportDir)) {
  mkdirSync(reportDir, { recursive: true });
}

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  error?: string;
  details?: string;
}

interface TestCategory {
  name: string;
  tests: TestResult[];
}

const testResults: TestCategory[] = [];

// Helper to run command and capture output
function runCommand(command: string, description: string): TestResult {
  const startTime = Date.now();
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    const duration = Date.now() - startTime;
    
    return {
      name: description,
      status: 'passed',
      duration,
      details: output.trim()
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return {
      name: description,
      status: 'failed',
      duration,
      error: error.message || String(error)
    };
  }
}

// Test 1: Build Tests
console.log('Running build tests...');
const buildTests: TestResult[] = [];

buildTests.push(runCommand(
  'npm run build',
  'Full Production Build'
));

buildTests.push(runCommand(
  'npx tailwindcss -i ./src/styles/global.css -o ./test-output.css --minify',
  'Tailwind CSS Build'
));

// Clean up test output
try {
  execSync('rm -f ./test-output.css');
} catch {}

testResults.push({
  name: 'Build Tests',
  tests: buildTests
});

// Test 2: Playwright E2E Tests
console.log('\nRunning E2E tests...');
const e2eTests: TestResult[] = [];

e2eTests.push(runCommand(
  'npx playwright test e2e/critical/css-verification.spec.ts --reporter=json',
  'CSS Verification E2E Tests'
));

testResults.push({
  name: 'E2E Browser Tests',
  tests: e2eTests
});

// Test 3: Visual Regression Tests
console.log('\nRunning visual regression tests...');
const visualTests: TestResult[] = [];

visualTests.push(runCommand(
  'npx playwright test e2e/visual-regression.spec.ts --grep "CSS"',
  'Visual Regression Tests'
));

testResults.push({
  name: 'Visual Tests',
  tests: visualTests
});

// Test 4: Performance Tests
console.log('\nRunning performance tests...');
const perfTests: TestResult[] = [];

perfTests.push(runCommand(
  'npx playwright test e2e/performance-metrics.spec.ts --grep "CSS|Style"',
  'CSS Performance Metrics'
));

testResults.push({
  name: 'Performance Tests',
  tests: perfTests
});

// Generate HTML Report
const htmlReport = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CSS Verification Test Report - ${new Date(timestamp).toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 30px;
    }
    
    h1 {
      color: #2d3748;
      margin-bottom: 10px;
      font-size: 2em;
    }
    
    .timestamp {
      color: #718096;
      font-size: 0.9em;
      margin-bottom: 30px;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    
    .summary-card {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 20px;
      text-align: center;
    }
    
    .summary-card h3 {
      font-size: 2.5em;
      margin-bottom: 5px;
    }
    
    .summary-card p {
      color: #718096;
      font-size: 0.9em;
    }
    
    .passed { color: #48bb78; }
    .failed { color: #f56565; }
    .skipped { color: #ed8936; }
    
    .category {
      margin-bottom: 30px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      overflow: hidden;
    }
    
    .category-header {
      background: #f7fafc;
      padding: 15px 20px;
      font-weight: 600;
      font-size: 1.1em;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .test-list {
      list-style: none;
    }
    
    .test-item {
      padding: 15px 20px;
      border-bottom: 1px solid #f0f0f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .test-item:last-child {
      border-bottom: none;
    }
    
    .test-name {
      flex: 1;
      font-weight: 500;
    }
    
    .test-status {
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.85em;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .status-passed {
      background: #c6f6d5;
      color: #276749;
    }
    
    .status-failed {
      background: #fed7d7;
      color: #9b2c2c;
    }
    
    .status-skipped {
      background: #feebc8;
      color: #975a16;
    }
    
    .test-duration {
      color: #718096;
      font-size: 0.85em;
      margin-left: 10px;
    }
    
    .error-details {
      background: #fff5f5;
      border: 1px solid #feb2b2;
      border-radius: 4px;
      padding: 10px;
      margin-top: 10px;
      font-size: 0.9em;
      color: #c53030;
      font-family: monospace;
    }
    
    .checklist {
      background: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 20px;
      margin-top: 30px;
    }
    
    .checklist h2 {
      margin-bottom: 15px;
      color: #2d3748;
    }
    
    .checklist ul {
      list-style: none;
      padding-left: 0;
    }
    
    .checklist li {
      padding: 8px 0;
      padding-left: 25px;
      position: relative;
    }
    
    .checklist li:before {
      content: "□";
      position: absolute;
      left: 0;
      color: #718096;
    }
    
    .recommendations {
      background: #edf2f7;
      border-left: 4px solid #4299e1;
      padding: 20px;
      margin-top: 30px;
      border-radius: 4px;
    }
    
    .recommendations h3 {
      color: #2b6cb0;
      margin-bottom: 10px;
    }
    
    .recommendations ul {
      margin-left: 20px;
      color: #4a5568;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 CSS Verification Test Report</h1>
    <p class="timestamp">Generated on ${new Date(timestamp).toLocaleString()}</p>
    
    ${generateSummary()}
    ${generateTestResults()}
    ${generateChecklist()}
    ${generateRecommendations()}
  </div>
</body>
</html>
`;

function generateSummary(): string {
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;
  
  testResults.forEach(category => {
    category.tests.forEach(test => {
      totalTests++;
      if (test.status === 'passed') passedTests++;
      else if (test.status === 'failed') failedTests++;
      else skippedTests++;
    });
  });
  
  const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
  
  return `
    <div class="summary">
      <div class="summary-card">
        <h3>${totalTests}</h3>
        <p>Total Tests</p>
      </div>
      <div class="summary-card">
        <h3 class="passed">${passedTests}</h3>
        <p>Passed</p>
      </div>
      <div class="summary-card">
        <h3 class="failed">${failedTests}</h3>
        <p>Failed</p>
      </div>
      <div class="summary-card">
        <h3>${passRate}%</h3>
        <p>Pass Rate</p>
      </div>
    </div>
  `;
}

function generateTestResults(): string {
  return testResults.map(category => `
    <div class="category">
      <div class="category-header">${category.name}</div>
      <ul class="test-list">
        ${category.tests.map(test => `
          <li class="test-item">
            <span class="test-name">${test.name}</span>
            <div>
              <span class="test-status status-${test.status}">${test.status}</span>
              ${test.duration ? `<span class="test-duration">${test.duration}ms</span>` : ''}
            </div>
          </li>
          ${test.error ? `<div class="error-details">${escapeHtml(test.error)}</div>` : ''}
        `).join('')}
      </ul>
    </div>
  `).join('');
}

function generateChecklist(): string {
  return `
    <div class="checklist">
      <h2>📋 Manual Verification Checklist</h2>
      <ul>
        <li>Verify custom colors (forest-canopy, moss-green, sunlight-gold) are rendering</li>
        <li>Check responsive breakpoints at 375px, 768px, and 1920px</li>
        <li>Test hover states on buttons and interactive elements</li>
        <li>Verify form styling and focus states</li>
        <li>Check for FOUC (Flash of Unstyled Content) on page load</li>
        <li>Inspect browser DevTools for CSS-related console errors</li>
        <li>Verify all CSS files load with status 200 in Network tab</li>
        <li>Test navigation menu on mobile and desktop</li>
        <li>Check tuition calculator styling at /tuition-affordability</li>
        <li>Verify print styles if applicable</li>
      </ul>
    </div>
  `;
}

function generateRecommendations(): string {
  const hasFailures = testResults.some(cat => 
    cat.tests.some(test => test.status === 'failed')
  );
  
  if (!hasFailures) {
    return `
      <div class="recommendations" style="border-color: #48bb78; background: #f0fff4;">
        <h3 style="color: #276749;">✅ All Tests Passed!</h3>
        <p>The CSS implementation is working correctly. The application is ready for deployment.</p>
      </div>
    `;
  }
  
  return `
    <div class="recommendations">
      <h3>🔧 Recommendations</h3>
      <ul>
        <li>Review failed tests and check the error logs for details</li>
        <li>Ensure postcss.config.mjs includes tailwindcss and autoprefixer plugins</li>
        <li>Verify @tailwind directives are present in src/styles/global.css</li>
        <li>Check that all required dependencies are installed</li>
        <li>Clear build cache and node_modules if issues persist</li>
        <li>Run 'npm install' to ensure all dependencies are up to date</li>
      </ul>
    </div>
  `;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

// Save HTML report
const htmlPath = join(reportDir, `css-test-report-${Date.now()}.html`);
writeFileSync(htmlPath, htmlReport);

// Generate Markdown report
const markdownReport = `# CSS Verification Test Report

Generated: ${new Date(timestamp).toLocaleString()}

## Summary

${testResults.map(category => {
  const passed = category.tests.filter(t => t.status === 'passed').length;
  const failed = category.tests.filter(t => t.status === 'failed').length;
  return `- **${category.name}**: ${passed} passed, ${failed} failed`;
}).join('\n')}

## Test Results

${testResults.map(category => `
### ${category.name}

${category.tests.map(test => 
  `- ${test.status === 'passed' ? '✅' : '❌'} ${test.name} ${test.duration ? `(${test.duration}ms)` : ''}`
).join('\n')}
`).join('\n')}

## Manual Verification Checklist

- [ ] Custom colors rendering (forest-canopy, moss-green, sunlight-gold)
- [ ] Responsive design at all breakpoints
- [ ] Hover states and transitions
- [ ] Form styling and focus states
- [ ] No FOUC on page load
- [ ] No CSS console errors
- [ ] All CSS files load successfully
- [ ] Mobile navigation working
- [ ] Component-specific styling

## Next Steps

1. Review any failed tests
2. Run manual verification checklist
3. Test on multiple browsers
4. Verify Docker build if using containers
`;

const markdownPath = join(reportDir, `css-test-report-${Date.now()}.md`);
writeFileSync(markdownPath, markdownReport);

// Print summary to console
console.log('\n' + '='.repeat(50));
console.log(green('\n✅ Test report generated successfully!\n'));
console.log(`📄 HTML Report: ${htmlPath}`);
console.log(`📝 Markdown Report: ${markdownPath}`);
console.log('\nOpen the HTML report in a browser for best viewing experience.');
console.log('\n' + '='.repeat(50) + '\n');