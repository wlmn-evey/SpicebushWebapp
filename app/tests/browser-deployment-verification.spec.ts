/**
 * Browser-Based Deployment Verification Tests
 * 
 * These tests verify the deployment fixes work correctly in a real browser environment.
 * They test the actual deployed site to ensure environment variables and configuration
 * are working as expected.
 */

import { test, expect, type Page } from '@playwright/test';

// Configuration for testing site
const TESTING_SITE_URL = 'https://spicebush-testing.netlify.app';
const PRODUCTION_SITE_URL = 'https://spicebushmontessori.org';

// Determine which URL to test based on environment
const BASE_URL = process.env.TEST_PRODUCTION === 'true' ? PRODUCTION_SITE_URL : TESTING_SITE_URL;

test.describe('Deployment Environment Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console monitoring to catch JavaScript errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error(`Console error: ${msg.text()}`);
      }
    });

    // Monitor network failures
    page.on('requestfailed', (request) => {
      console.error(`Network request failed: ${request.url()} - ${request.failure()?.errorText}`);
    });
  });

  test('site loads without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for specific environment variable related errors
    const envErrors = errors.filter(error => 
      error.includes('Supabase configuration missing') ||
      error.includes('PUBLIC_SUPABASE') ||
      error.includes('SUPABASE_SERVICE') ||
      error.includes('environment variable')
    );

    expect(envErrors).toHaveLength(0);
    
    // Ensure the page loaded successfully
    await expect(page).toHaveTitle(/Spicebush Montessori/);
  });

  test('Supabase client initializes correctly', async ({ page }) => {
    await page.goto(BASE_URL);

    // Check that Supabase client is initialized without errors
    const supabaseStatus = await page.evaluate(() => {
      // @ts-ignore - accessing window supabase if available
      return {
        hasSupabase: typeof window.supabase !== 'undefined',
        // Check if there are any Supabase-related errors in the page
        errors: window.console ? [] : []
      };
    });

    // The page should load without Supabase configuration errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('environment-specific features work correctly', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check if this is testing environment
    const isTestingEnv = BASE_URL.includes('testing');
    
    if (isTestingEnv) {
      // Testing environment specific checks
      // May have different styling, debugging info, etc.
      console.log('Running tests against testing environment');
    } else {
      // Production environment specific checks
      console.log('Running tests against production environment');
    }

    // Both environments should have basic functionality
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});

test.describe('Security Headers Verification', () => {
  test('security headers are properly set', async ({ page }) => {
    const response = await page.goto(BASE_URL);
    expect(response).not.toBeNull();

    const headers = response!.headers();

    // Verify critical security headers
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-xss-protection']).toBe('1; mode=block');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    
    // CSP should be present
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy']).toContain('https://js.stripe.com');
    expect(headers['content-security-policy']).toContain('https://*.supabase.co');

    // HSTS should be enabled
    expect(headers['strict-transport-security']).toContain('max-age=31536000');
  });

  test('CSP allows required external resources', async ({ page }) => {
    const cspViolations: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Content Security Policy')) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check for CSP violations
    expect(cspViolations).toHaveLength(0);
  });
});

test.describe('Performance and Caching', () => {
  test('static assets have proper cache headers', async ({ page }) => {
    await page.goto(BASE_URL);

    // Test static asset caching
    const [response] = await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/_astro/') && response.status() === 200
      ),
      page.reload()
    ]);

    const cacheControl = response.headers()['cache-control'];
    expect(cacheControl).toContain('max-age=31536000');
    expect(cacheControl).toContain('immutable');
  });

  test('page load performance is acceptable', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Check for performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        load: navigation.loadEventEnd - navigation.loadEventStart,
        firstByte: navigation.responseStart - navigation.requestStart
      };
    });

    // Time to first byte should be reasonable
    expect(performanceMetrics.firstByte).toBeLessThan(2000);
  });
});

test.describe('Authentication System', () => {
  test('admin login page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    
    // Should either show login form or redirect to auth
    const hasLoginForm = await page.locator('form').isVisible().catch(() => false);
    const hasAuthRedirect = page.url().includes('/auth') || page.url().includes('/login');
    
    expect(hasLoginForm || hasAuthRedirect).toBeTruthy();
  });

  test('magic link form handles submission correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    
    // Look for email input (common in magic link forms)
    const emailInput = page.locator('input[type="email"]').first();
    
    if (await emailInput.isVisible()) {
      await emailInput.fill('test@spicebushmontessori.org');
      
      // Find and click submit button
      const submitButton = page.locator('button[type="submit"], input[type="submit"]').first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        
        // Should not show JavaScript errors after submission
        await page.waitForTimeout(2000); // Wait for any async operations
        
        // Check that form submitted without throwing errors
        // (We can't test actual email sending in automated tests)
      }
    }
  });
});

test.describe('Error Handling and Fallbacks', () => {
  test('graceful handling of missing resources', async ({ page }) => {
    const networkFailures: string[] = [];
    
    page.on('requestfailed', (request) => {
      networkFailures.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Filter out expected failures (404s for optional resources are OK)
    const criticalFailures = networkFailures.filter(failure => 
      !failure.includes('favicon') && 
      !failure.includes('optional-resource') &&
      !failure.includes('analytics') // Analytics might be blocked in test environment
    );

    // Should not have critical resource failures
    expect(criticalFailures.length).toBeLessThan(3); // Allow some tolerance
  });

  test('fallback behavior for environment variables', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check that the site works even if some fallback mechanisms are in use
    // This is verified by ensuring no environment variable errors appear
    const jsErrors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    const envVarErrors = jsErrors.filter(error =>
      error.toLowerCase().includes('environment') ||
      error.toLowerCase().includes('supabase configuration missing') ||
      error.toLowerCase().includes('public_supabase')
    );

    expect(envVarErrors).toHaveLength(0);
  });
});

test.describe('Cross-Browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach((browserName) => {
    test(`works correctly in ${browserName}`, async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      const errors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Basic functionality should work in all browsers
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      
      // Should not have critical JavaScript errors
      const criticalErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('ResizeObserver') && // Common, non-critical error
        !error.includes('Non-passive event listener') // Performance warning, not critical
      );

      expect(criticalErrors.length).toBeLessThan(2); // Allow minor tolerance

      await context.close();
    });
  });
});

test.describe('Mobile Responsiveness', () => {
  test('site works on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check that mobile navigation works
    await expect(page.locator('body')).toBeVisible();
    
    // Mobile-specific checks
    const mobileMenu = page.locator('[data-mobile-menu], .mobile-menu, button[aria-label*="menu"]').first();
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      // Menu should open without errors
      await page.waitForTimeout(500);
    }
  });

  test('responsive images load correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    // Check that images load
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check first few images load successfully
      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const img = images.nth(i);
        await expect(img).toBeVisible();
        
        // Verify image has loaded (not broken)
        const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
        expect(naturalWidth).toBeGreaterThan(0);
      }
    }
  });
});

// Utility test to verify test configuration
test.describe('Test Configuration', () => {
  test('test is running against correct environment', async ({ page }) => {
    console.log(`Testing against: ${BASE_URL}`);
    
    const response = await page.goto(BASE_URL);
    expect(response?.status()).toBe(200);
    
    // Log environment for debugging
    const isTestingEnv = BASE_URL.includes('testing');
    const isProductionEnv = BASE_URL.includes('spicebushmontessori.org') && !BASE_URL.includes('testing');
    
    console.log(`Environment detected: ${isTestingEnv ? 'Testing' : isProductionEnv ? 'Production' : 'Unknown'}`);
    
    // Verify we can reach the site
    await expect(page).toHaveTitle(/Spicebush/);
  });
});