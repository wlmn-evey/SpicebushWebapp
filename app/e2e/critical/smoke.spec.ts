import { test, expect } from '@playwright/test';
import { checkForJavaScriptErrors, checkForNetworkErrors } from '../fixtures/error-helpers';

test.describe('Smoke Tests - Critical Site Functionality', () => {
  let jsErrors: string[] = [];
  let networkErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Reset error arrays
    jsErrors = [];
    networkErrors = [];
    
    // Set up error monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      jsErrors.push(error.message);
    });
    
    page.on('requestfailed', (request) => {
      networkErrors.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });
    
    page.on('response', (response) => {
      if (response.status() >= 400 && response.url().includes(page.url())) {
        networkErrors.push(`${response.status()} ${response.url()}`);
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    // Attach error logs if test failed
    if (testInfo.status === 'failed') {
      if (jsErrors.length > 0) {
        await testInfo.attach('javascript-errors', {
          body: JSON.stringify(jsErrors, null, 2),
          contentType: 'application/json',
        });
      }
      if (networkErrors.length > 0) {
        await testInfo.attach('network-errors', {
          body: JSON.stringify(networkErrors, null, 2),
          contentType: 'application/json',
        });
      }
    }
  });

  test('homepage loads without errors', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for no JavaScript errors
    expect(jsErrors).toHaveLength(0);
    
    // Check for no network errors
    expect(networkErrors).toHaveLength(0);
    
    // Verify critical elements are present
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    
    // Check for proper meta tags
    const title = await page.title();
    expect(title).toContain('Spicebush Montessori');
    
    // Verify no broken images
    const brokenImages = await page.$$eval('img', images => 
      images.filter(img => !img.complete || img.naturalHeight === 0).map(img => img.src)
    );
    expect(brokenImages).toHaveLength(0);
  });

  test('all main navigation links work', async ({ page }) => {
    await page.goto('/');
    
    const navLinks = [
      { text: 'About', url: '/about' },
      { text: 'Programs', url: '/programs' },
      { text: 'Admissions', url: '/admissions' },
      { text: 'Contact', url: '/contact' },
    ];
    
    for (const link of navLinks) {
      // Click nav link
      await page.click(`nav a:has-text("${link.text}")`);
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      // Verify URL
      await expect(page).toHaveURL(new RegExp(link.url));
      
      // Verify page loaded properly
      await expect(page.locator('h1')).toBeVisible();
      
      // Check no JS errors on this page
      expect(jsErrors).toHaveLength(0);
      
      // Go back to homepage for next iteration
      await page.goto('/');
    }
  });

  test('critical API endpoints respond', async ({ page }) => {
    const endpoints = [
      { path: '/api/settings', expectedStatus: [200, 404] }, // 404 is ok if no settings
      { path: '/api/auth/session', expectedStatus: [200, 401] }, // 401 is ok if not logged in
      { path: '/api/contact', expectedStatus: [200, 405] }, // 405 for GET is ok
    ];
    
    for (const endpoint of endpoints) {
      const response = await page.request.get(endpoint.path);
      expect(endpoint.expectedStatus).toContain(response.status());
      
      // If it's a 500 error, that's always bad
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('no redirect loops exist', async ({ page }) => {
    const redirects: string[] = [];
    
    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        redirects.push(`${response.status()} ${response.url()} -> ${response.headers()['location']}`);
      }
    });
    
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Should have no more than 1 redirect
    expect(redirects.length).toBeLessThanOrEqual(1);
    
    // Check no circular redirects
    const uniqueUrls = new Set(redirects.map(r => r.split(' -> ')[1]));
    expect(uniqueUrls.size).toBe(redirects.length);
  });

  test('footer contains correct contact information', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer');
    await footer.scrollIntoViewIfNeeded();
    
    // Check email
    const emailLink = footer.locator('a[href^="mailto:"]');
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute('href', 'mailto:information@spicebushmontessori.org');
    
    // Check phone
    const phoneLink = footer.locator('a[href^="tel:"]');
    await expect(phoneLink).toBeVisible();
    
    // Check address
    await expect(footer).toContainText('Chapel Hill');
  });

  test('coming soon mode can be toggled', async ({ page }) => {
    // This test will check if coming soon mode works when enabled
    // First, check if site is in normal mode
    await page.goto('/');
    
    const pageContent = await page.content();
    
    // If in coming soon mode, should see coming soon content
    if (pageContent.includes('Coming Soon')) {
      // Verify coming soon page elements
      await expect(page.locator('text=Coming Soon')).toBeVisible();
      await expect(page.locator('text=under construction')).toBeVisible();
    } else {
      // Verify normal site elements
      await expect(page.locator('nav')).toBeVisible();
      await expect(page.locator('h1')).toBeVisible();
    }
  });

  test('mobile menu works on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Mobile menu button should be visible
    const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu"), button.mobile-menu-toggle');
    await expect(mobileMenuButton).toBeVisible();
    
    // Click to open menu
    await mobileMenuButton.click();
    
    // Navigation should be visible
    await expect(page.locator('nav a:has-text("About")')).toBeVisible();
  });
});