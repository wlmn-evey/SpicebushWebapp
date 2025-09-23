import { test, expect, Page, TestInfo } from '@playwright/test';
import { 
  checkForJavaScriptErrors, 
  checkForNetworkErrors, 
  checkBrokenResources,
  detectInfiniteLoops,
  formatErrorReport,
  JavaScriptError,
  NetworkError
} from '../fixtures/error-helpers';

// Configuration
const PAGES_TO_TEST = [
  { name: 'Homepage', path: '/' },
  { name: 'About', path: '/about' },
  { name: 'Programs', path: '/programs' },
  { name: 'Admissions', path: '/admissions' },
  { name: 'Tour Registration', path: '/admissions/tours' },
  { name: 'Tuition', path: '/admissions/tuition' },
  { name: 'Calendar', path: '/calendar' },
  { name: 'Parents', path: '/parents' },
  { name: 'Contact', path: '/contact' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Terms of Service', path: '/terms' },
];

const API_ENDPOINTS = [
  { path: '/api/health', method: 'GET', expectedStatus: [200, 404] },
  { path: '/api/health/db', method: 'GET', expectedStatus: [200, 404] },
  { path: '/api/settings', method: 'GET', expectedStatus: [200, 404] },
  { path: '/api/auth/session', method: 'GET', expectedStatus: [200, 401] },
  { path: '/api/contact', method: 'GET', expectedStatus: [405] },
  { path: '/api/admin/settings', method: 'GET', expectedStatus: [401] },
  { path: '/api/newsletter/subscribe', method: 'GET', expectedStatus: [405] },
];

interface PageTestResult {
  page: string;
  path: string;
  status: 'pass' | 'fail';
  loadTime: number;
  jsErrors: JavaScriptError[];
  networkErrors: NetworkError[];
  consoleErrors: string[];
  brokenResources: {
    images: string[];
    scripts: string[];
    stylesheets: string[];
  };
  missingElements: string[];
  infiniteLoop: boolean;
}

test.describe('Comprehensive Smoke Tests', () => {
  let testResults: PageTestResult[] = [];

  test.afterAll(async ({}, testInfo) => {
    // Generate comprehensive report
    const report = generateComprehensiveReport(testResults);
    
    await testInfo.attach('comprehensive-test-report', {
      body: report,
      contentType: 'text/markdown',
    });

    // Also save as HTML for better viewing
    const htmlReport = generateHTMLReport(testResults);
    await testInfo.attach('comprehensive-test-report.html', {
      body: htmlReport,
      contentType: 'text/html',
    });
  });

  test('all pages load without JavaScript errors', async ({ page, browser }, testInfo) => {
    for (const pageToTest of PAGES_TO_TEST) {
      await test.step(`Testing ${pageToTest.name}`, async () => {
        const result = await testPage(page, pageToTest, testInfo);
        testResults.push(result);
        
        // Assert no JavaScript errors
        expect(result.jsErrors, `${pageToTest.name} should have no JavaScript errors`).toHaveLength(0);
        
        // Assert no console errors
        expect(result.consoleErrors, `${pageToTest.name} should have no console errors`).toHaveLength(0);
      });
    }
  });

  test('no broken resources on any page', async ({ page }, testInfo) => {
    for (const pageToTest of PAGES_TO_TEST) {
      await test.step(`Checking resources on ${pageToTest.name}`, async () => {
        await page.goto(pageToTest.path);
        const brokenResources = await checkBrokenResources(page);
        
        expect(brokenResources.images, `${pageToTest.name} should have no broken images`).toHaveLength(0);
        expect(brokenResources.scripts, `${pageToTest.name} should have no broken scripts`).toHaveLength(0);
        expect(brokenResources.stylesheets, `${pageToTest.name} should have no broken stylesheets`).toHaveLength(0);
      });
    }
  });

  test('all API endpoints respond correctly', async ({ page }) => {
    for (const endpoint of API_ENDPOINTS) {
      await test.step(`Testing ${endpoint.method} ${endpoint.path}`, async () => {
        const response = await page.request[endpoint.method.toLowerCase()](endpoint.path);
        
        expect(
          endpoint.expectedStatus,
          `${endpoint.path} should return one of: ${endpoint.expectedStatus.join(', ')}`
        ).toContain(response.status());
        
        // No 5xx errors allowed
        expect(response.status()).toBeLessThan(500);
      });
    }
  });

  test('navigation works without redirect loops', async ({ page }) => {
    const navigationTests = [
      { from: '/', to: '/about' },
      { from: '/about', to: '/programs' },
      { from: '/programs', to: '/admissions' },
      { from: '/admissions', to: '/contact' },
      { from: '/contact', to: '/' },
    ];

    for (const nav of navigationTests) {
      await test.step(`Navigate from ${nav.from} to ${nav.to}`, async () => {
        const redirects: string[] = [];
        
        page.on('response', response => {
          if (response.status() >= 300 && response.status() < 400) {
            redirects.push(`${response.url()} -> ${response.headers()['location']}`);
          }
        });

        await page.goto(nav.from);
        await page.click(`a[href="${nav.to}"]`);
        await page.waitForLoadState('networkidle');

        // Should have no more than 1 redirect
        expect(redirects.length).toBeLessThanOrEqual(1);
        
        // Should end up at the expected URL
        expect(page.url()).toContain(nav.to);
      });
    }
  });

  test('forms are present and functional', async ({ page }) => {
    const forms = [
      { 
        page: '/contact', 
        selector: 'form',
        fields: ['name', 'email', 'message'] 
      },
      { 
        page: '/admissions/tours', 
        selector: 'form',
        fields: ['parentName', 'email', 'phone'] 
      },
    ];

    for (const form of forms) {
      await test.step(`Testing form on ${form.page}`, async () => {
        await page.goto(form.page);
        
        const formElement = await page.$(form.selector);
        expect(formElement).not.toBeNull();

        // Check all expected fields exist
        for (const field of form.fields) {
          const input = await page.$(`[name="${field}"], [id="${field}"]`);
          expect(input, `Field ${field} should exist`).not.toBeNull();
        }

        // Check form can be submitted (but don't actually submit)
        const submitButton = await page.$('button[type="submit"], input[type="submit"]');
        expect(submitButton).not.toBeNull();
      });
    }
  });

  test('authentication flow works correctly', async ({ page, context }) => {
    // Test magic link login page
    await page.goto('/auth/magic-login');
    
    // Should see login form
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test session check
    const sessionResponse = await page.request.get('/api/auth/session');
    expect([200, 401]).toContain(sessionResponse.status());
  });

  test('admin panel is accessible', async ({ page }) => {
    // Try to access admin panel
    await page.goto('/admin');
    
    // Should either show login or redirect to login
    const url = page.url();
    expect(
      url.includes('/admin') || url.includes('/auth'),
      'Should be on admin or auth page'
    ).toBeTruthy();
    
    // No 500 errors
    const response = await page.request.get('/admin');
    expect(response.status()).toBeLessThan(500);
  });

  test('coming soon mode functions correctly', async ({ page }) => {
    // Check if coming soon mode is active
    const response = await page.goto('/');
    
    if (page.url().includes('coming-soon')) {
      // Coming soon mode is active
      await expect(page.locator('h1')).toContainText('Spicebush Montessori');
      await expect(page.locator('text=Enrolling')).toBeVisible();
      
      // Newsletter form should be present
      await expect(page.locator('form[name="coming-soon-contact"]')).toBeVisible();
    } else {
      // Normal mode
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();
    }
  });

  test('mobile responsiveness', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await test.step(`Testing ${viewport.name} viewport`, async () => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/');
        
        // Check for horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        
        expect(hasHorizontalScroll, `No horizontal scroll on ${viewport.name}`).toBe(false);
        
        // Check navigation visibility
        if (viewport.width < 768) {
          // Mobile menu should be present
          const mobileMenu = await page.$('button[aria-label*="menu"], .mobile-menu-toggle');
          expect(mobileMenu).not.toBeNull();
        }
      });
    }
  });

  test('performance metrics', async ({ page }) => {
    const performanceMetrics: any[] = [];

    for (const pageToTest of PAGES_TO_TEST.slice(0, 5)) { // Test first 5 pages
      await test.step(`Measuring performance for ${pageToTest.name}`, async () => {
        const startTime = Date.now();
        
        await page.goto(pageToTest.path, { waitUntil: 'networkidle' });
        
        const loadTime = Date.now() - startTime;
        
        // Get performance metrics
        const metrics = await page.evaluate(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          return {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
            firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0,
          };
        });
        
        performanceMetrics.push({
          page: pageToTest.name,
          loadTime,
          ...metrics
        });
        
        // Assert reasonable load times
        expect(loadTime, `${pageToTest.name} should load within 5 seconds`).toBeLessThan(5000);
      });
    }
    
    console.table(performanceMetrics);
  });
});

// Helper function to test a single page comprehensively
async function testPage(page: Page, pageInfo: { name: string; path: string }, testInfo: TestInfo): Promise<PageTestResult> {
  const jsErrors: JavaScriptError[] = [];
  const networkErrors: NetworkError[] = [];
  const consoleErrors: string[] = [];
  let loadTime = 0;
  let infiniteLoop = false;

  // Set up error collection
  await checkForJavaScriptErrors(page);
  await checkForNetworkErrors(page);

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    jsErrors.push({
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  });

  // Navigate to page
  const startTime = Date.now();
  try {
    await page.goto(pageInfo.path, { waitUntil: 'networkidle', timeout: 30000 });
    loadTime = Date.now() - startTime;
  } catch (error) {
    loadTime = Date.now() - startTime;
    jsErrors.push({
      message: `Navigation error: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }

  // Check for infinite loops
  infiniteLoop = await detectInfiniteLoops(page, 3000);

  // Check for broken resources
  const brokenResources = await checkBrokenResources(page);

  // Check for required elements
  const missingElements: string[] = [];
  const requiredElements = ['h1', 'nav', 'footer'];
  
  for (const selector of requiredElements) {
    const element = await page.$(selector);
    if (!element) {
      missingElements.push(selector);
    }
  }

  // Take screenshot on failure
  if (jsErrors.length > 0 || consoleErrors.length > 0 || infiniteLoop) {
    await testInfo.attach(`${pageInfo.name}-screenshot`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }

  return {
    page: pageInfo.name,
    path: pageInfo.path,
    status: jsErrors.length === 0 && consoleErrors.length === 0 && !infiniteLoop ? 'pass' : 'fail',
    loadTime,
    jsErrors,
    networkErrors,
    consoleErrors,
    brokenResources,
    missingElements,
    infiniteLoop
  };
}

// Generate comprehensive markdown report
function generateComprehensiveReport(results: PageTestResult[]): string {
  let report = '# Comprehensive Browser Test Report\n\n';
  report += `**Test Date:** ${new Date().toISOString()}\n\n`;
  report += `**Total Pages Tested:** ${results.length}\n`;
  report += `**Passed:** ${results.filter(r => r.status === 'pass').length}\n`;
  report += `**Failed:** ${results.filter(r => r.status === 'fail').length}\n\n`;

  report += '## Summary\n\n';
  report += '| Page | Status | Load Time | JS Errors | Console Errors | Broken Resources |\n';
  report += '|------|--------|-----------|-----------|----------------|------------------|\n';

  for (const result of results) {
    const brokenCount = result.brokenResources.images.length + 
                       result.brokenResources.scripts.length + 
                       result.brokenResources.stylesheets.length;
    
    report += `| ${result.page} | ${result.status === 'pass' ? '✅' : '❌'} | ${result.loadTime}ms | ${result.jsErrors.length} | ${result.consoleErrors.length} | ${brokenCount} |\n`;
  }

  report += '\n## Detailed Results\n\n';

  for (const result of results) {
    if (result.status === 'fail') {
      report += `### ${result.page} (${result.path})\n\n`;
      
      if (result.jsErrors.length > 0) {
        report += '**JavaScript Errors:**\n';
        result.jsErrors.forEach(error => {
          report += `- ${error.message}\n`;
          if (error.stack) {
            report += `  \`\`\`\n${error.stack}\n  \`\`\`\n`;
          }
        });
        report += '\n';
      }

      if (result.consoleErrors.length > 0) {
        report += '**Console Errors:**\n';
        result.consoleErrors.forEach(error => {
          report += `- ${error}\n`;
        });
        report += '\n';
      }

      if (result.infiniteLoop) {
        report += '**⚠️ Possible infinite loop detected**\n\n';
      }

      const brokenCount = result.brokenResources.images.length + 
                         result.brokenResources.scripts.length + 
                         result.brokenResources.stylesheets.length;
      if (brokenCount > 0) {
        report += '**Broken Resources:**\n';
        if (result.brokenResources.images.length > 0) {
          report += `- Images: ${result.brokenResources.images.join(', ')}\n`;
        }
        if (result.brokenResources.scripts.length > 0) {
          report += `- Scripts: ${result.brokenResources.scripts.join(', ')}\n`;
        }
        if (result.brokenResources.stylesheets.length > 0) {
          report += `- Stylesheets: ${result.brokenResources.stylesheets.join(', ')}\n`;
        }
        report += '\n';
      }

      if (result.missingElements.length > 0) {
        report += `**Missing Elements:** ${result.missingElements.join(', ')}\n\n`;
      }
    }
  }

  return report;
}

// Generate HTML report for better viewing
function generateHTMLReport(results: PageTestResult[]): string {
  const passedCount = results.filter(r => r.status === 'pass').length;
  const failedCount = results.filter(r => r.status === 'fail').length;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Browser Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .pass { color: green; }
    .fail { color: red; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .error { background-color: #ffebee; padding: 10px; margin: 10px 0; border-radius: 3px; }
    .error-detail { font-family: monospace; font-size: 12px; white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Comprehensive Browser Test Report</h1>
  
  <div class="summary">
    <h2>Summary</h2>
    <p><strong>Test Date:</strong> ${new Date().toISOString()}</p>
    <p><strong>Total Pages Tested:</strong> ${results.length}</p>
    <p class="pass"><strong>Passed:</strong> ${passedCount}</p>
    <p class="fail"><strong>Failed:</strong> ${failedCount}</p>
  </div>

  <table>
    <tr>
      <th>Page</th>
      <th>Status</th>
      <th>Load Time</th>
      <th>JS Errors</th>
      <th>Console Errors</th>
      <th>Broken Resources</th>
    </tr>
    ${results.map(result => {
      const brokenCount = result.brokenResources.images.length + 
                         result.brokenResources.scripts.length + 
                         result.brokenResources.stylesheets.length;
      return `
      <tr>
        <td>${result.page}</td>
        <td class="${result.status}">${result.status === 'pass' ? '✅ Pass' : '❌ Fail'}</td>
        <td>${result.loadTime}ms</td>
        <td>${result.jsErrors.length}</td>
        <td>${result.consoleErrors.length}</td>
        <td>${brokenCount}</td>
      </tr>
      `;
    }).join('')}
  </table>

  <h2>Failed Pages Details</h2>
  ${results.filter(r => r.status === 'fail').map(result => `
    <div class="error">
      <h3>${result.page} (${result.path})</h3>
      ${result.jsErrors.length > 0 ? `
        <h4>JavaScript Errors:</h4>
        ${result.jsErrors.map(error => `
          <div class="error-detail">${error.message}</div>
        `).join('')}
      ` : ''}
      ${result.consoleErrors.length > 0 ? `
        <h4>Console Errors:</h4>
        ${result.consoleErrors.map(error => `
          <div class="error-detail">${error}</div>
        `).join('')}
      ` : ''}
      ${result.infiniteLoop ? '<p><strong>⚠️ Possible infinite loop detected</strong></p>' : ''}
    </div>
  `).join('')}
</body>
</html>
  `;
}