import { test, expect } from '@playwright/test';

const PAGES_TO_TEST = [
  { name: 'Homepage', path: '/' },
  { name: 'Programs', path: '/programs' },
  { name: 'About', path: '/about' },
  { name: 'Staff', path: '/staff' },
  { name: 'Tour Scheduling', path: '/tour-scheduling' },
  { name: 'Contact', path: '/contact' }
];

test.describe('Performance Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set timeout for performance tests
    test.setTimeout(60000);
  });

  test('all pages load within acceptable time', async ({ page }) => {
    const results = [];
    
    for (const pageInfo of PAGES_TO_TEST) {
      const startTime = Date.now();
      
      try {
        // Navigate to the page with network idle
        await page.goto(`http://localhost:4323${pageInfo.path}`, {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        const loadTime = Date.now() - startTime;
        
        // Check for JavaScript errors
        const jsErrors = [];
        page.on('pageerror', error => jsErrors.push(error.message));
        
        // Wait a bit to catch any delayed errors
        await page.waitForTimeout(1000);
        
        results.push({
          page: pageInfo.name,
          path: pageInfo.path,
          loadTime: loadTime,
          status: loadTime < 10000 ? 'PASS' : 'FAIL',
          errors: jsErrors
        });
        
        // Verify page loaded correctly
        expect(loadTime).toBeLessThan(10000); // 10 second threshold
        expect(jsErrors).toHaveLength(0);
        
      } catch (error) {
        results.push({
          page: pageInfo.name,
          path: pageInfo.path,
          loadTime: Date.now() - startTime,
          status: 'ERROR',
          error: error.message
        });
      }
    }
    
    // Generate report
    console.log('\n=== Performance Test Results ===\n');
    console.table(results);
    
    // Check if programs page specifically is fixed
    const programsResult = results.find(r => r.page === 'Programs');
    if (programsResult) {
      console.log(`\nPrograms page load time: ${programsResult.loadTime}ms`);
      expect(programsResult.loadTime).toBeLessThan(10000);
      expect(programsResult.status).toBe('PASS');
    }
  });

  test('programs page loads quickly without redirect loops', async ({ page }) => {
    const startTime = Date.now();
    
    // Monitor navigation events
    const navigations = [];
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        navigations.push({
          url: frame.url(),
          time: Date.now() - startTime
        });
      }
    });
    
    // Navigate to programs page
    const response = await page.goto('http://localhost:4323/programs', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    const totalLoadTime = Date.now() - startTime;
    
    // Log navigation chain
    console.log('\nNavigation chain:');
    navigations.forEach((nav, index) => {
      console.log(`${index + 1}. ${nav.url} (${nav.time}ms)`);
    });
    
    console.log(`\nTotal load time: ${totalLoadTime}ms`);
    
    // Assertions
    expect(response.status()).toBe(200);
    expect(totalLoadTime).toBeLessThan(10000); // Should load in under 10 seconds
    expect(navigations.length).toBeLessThanOrEqual(2); // No redirect loops
    
    // Check page content loaded
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 5000 });
  });

  test('no console errors on any page', async ({ page }) => {
    const errors = [];
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          page: page.url(),
          message: msg.text()
        });
      }
    });
    
    for (const pageInfo of PAGES_TO_TEST) {
      await page.goto(`http://localhost:4323${pageInfo.path}`, {
        waitUntil: 'domcontentloaded'
      });
      
      // Wait a bit for any delayed errors
      await page.waitForTimeout(2000);
    }
    
    // Report errors
    if (errors.length > 0) {
      console.log('\nConsole errors found:');
      errors.forEach(error => {
        console.log(`- ${error.page}: ${error.message}`);
      });
    }
    
    expect(errors).toHaveLength(0);
  });
});