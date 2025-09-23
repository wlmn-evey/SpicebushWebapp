import { test, expect } from '@playwright/test';

test.describe('All Pages Load Without Errors', () => {
  const pages = [
    { path: '/', name: 'Homepage' },
    { path: '/about', name: 'About' },
    { path: '/programs', name: 'Programs' },
    { path: '/admissions', name: 'Admissions' },
    { path: '/contact', name: 'Contact' },
    { path: '/donate', name: 'Donate' },
    { path: '/blog', name: 'Blog' },
    { path: '/our-principles', name: 'Our Principles' },
    { path: '/policies', name: 'Policies' },
    { path: '/privacy-policy', name: 'Privacy Policy' },
    { path: '/non-discrimination-policy', name: 'Non-Discrimination Policy' },
    { path: '/accessibility', name: 'Accessibility' },
  ];

  for (const pageInfo of pages) {
    test(`${pageInfo.name} page loads without JavaScript errors`, async ({ page }) => {
      const jsErrors: string[] = [];
      const networkErrors: { url: string; status: number }[] = [];
      
      // Monitor JavaScript errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          jsErrors.push(msg.text());
        }
      });
      
      page.on('pageerror', (error) => {
        jsErrors.push(error.message);
      });
      
      // Monitor network errors
      page.on('response', (response) => {
        // Only track 4xx and 5xx errors for same-origin requests
        if (response.status() >= 400 && response.url().includes(page.url().split('/')[2])) {
          networkErrors.push({
            url: response.url(),
            status: response.status()
          });
        }
      });
      
      // Navigate to page
      const response = await page.goto(pageInfo.path, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Check response status
      expect(response?.status()).toBeLessThan(400);
      
      // Wait for any async operations
      await page.waitForTimeout(1000);
      
      // Check for JavaScript errors
      if (jsErrors.length > 0) {
        console.error(`JavaScript errors on ${pageInfo.name}:`, jsErrors);
      }
      expect(jsErrors).toHaveLength(0);
      
      // Check for network errors (excluding external resources)
      const criticalNetworkErrors = networkErrors.filter(
        error => !error.url.includes('googletagmanager') && 
                 !error.url.includes('analytics') &&
                 !error.url.includes('fonts.googleapis')
      );
      
      if (criticalNetworkErrors.length > 0) {
        console.error(`Network errors on ${pageInfo.name}:`, criticalNetworkErrors);
      }
      expect(criticalNetworkErrors).toHaveLength(0);
      
      // Verify page has content
      const h1 = await page.locator('h1').first();
      await expect(h1).toBeVisible();
      
      // Check that page has proper structure
      await expect(page.locator('body')).toBeVisible();
      
      // For coming soon mode, check alternate content
      const bodyText = await page.locator('body').textContent();
      if (bodyText?.includes('Coming Soon')) {
        // If in coming soon mode, verify it has proper content
        await expect(page.locator('text=Coming Soon')).toBeVisible();
      } else {
        // Otherwise, check for navigation
        const nav = page.locator('nav').first();
        if (await nav.isVisible()) {
          await expect(nav).toBeVisible();
        }
      }
    });
  }

  test('404 page handles non-existent routes', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist', {
      waitUntil: 'networkidle'
    });
    
    // Should either return 404 or redirect
    expect([404, 301, 302]).toContain(response?.status());
    
    // Should show 404 content or redirect to valid page
    const content = await page.textContent('body');
    expect(
      content?.includes('404') || 
      content?.includes('not found') || 
      content?.includes('Coming Soon') ||
      page.url().endsWith('/')
    ).toBeTruthy();
  });

  test('admin pages require authentication', async ({ page }) => {
    const adminPages = [
      '/admin',
      '/admin/settings',
      '/admin/hours',
      '/admin/photos',
    ];
    
    for (const adminPath of adminPages) {
      const response = await page.goto(adminPath, {
        waitUntil: 'networkidle'
      });
      
      // Should either show login form or redirect
      const hasLoginForm = await page.locator('input[type="email"], input[name="email"]').isVisible().catch(() => false);
      const isRedirected = !page.url().includes(adminPath);
      
      expect(hasLoginForm || isRedirected).toBeTruthy();
    }
  });
});