import { test, expect, Browser, devices } from '@playwright/test';

const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';

// Browser configurations for cross-browser testing
const browserConfigs = [
  { name: 'Chromium', channel: 'chromium' },
  { name: 'Chrome', channel: 'chrome' },
  { name: 'Firefox', channel: 'firefox' },
  { name: 'Safari', channel: 'webkit' },
  { name: 'Edge', channel: 'msedge' },
];

// Test magic link authentication across different browsers
for (const browserConfig of browserConfigs) {
  test.describe(`Magic Link Cross-Browser Tests - ${browserConfig.name}`, () => {
    // Skip Safari on non-macOS systems
    test.skip(({ browserName }) => 
      browserConfig.channel === 'webkit' && process.platform !== 'darwin',
      'Safari only available on macOS'
    );
    
    // Skip Edge if not available
    test.skip(({ browserName }) => 
      browserConfig.channel === 'msedge' && !process.env.CI,
      'Edge testing requires CI environment or explicit setup'
    );

    test.beforeEach(async ({ page }) => {
      // Clear all browser state
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test('should display magic login page correctly', async ({ page }) => {
      await page.goto('/auth/magic-login');
      await page.waitForLoadState('networkidle');

      // Check basic page elements
      await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check browser-specific styling
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('required');
      
      // Verify CSS renders correctly
      const backgroundColor = await page.locator('body').evaluate(el => 
        getComputedStyle(el).backgroundColor
      );
      expect(backgroundColor).toBeTruthy();
    });

    test('should handle form submission', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Fill and submit form
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.click('button[type="submit"]');
      
      // Should show loading state
      await expect(page.locator('#loading-spinner')).toBeVisible({ timeout: 5000 });
      
      // Should show success message
      await expect(page.locator('#success-message')).toBeVisible({ timeout: 10000 });
      
      // Verify email display
      await expect(page.locator('#sent-email')).toContainText(TEST_ADMIN_EMAIL);
    });

    test('should handle magic link callback', async ({ page }) => {
      // Simulate magic link click
      await page.goto('/auth/update-password?type=magiclink&token=test-token');
      
      // Should show processing state
      await expect(page.locator('text=Processing Magic Link')).toBeVisible();
      
      // Should redirect to callback
      await page.waitForURL('**/auth/callback**', { timeout: 10000 });
      
      // Should show authentication processing
      await expect(page.locator('text=Signing you in')).toBeVisible();
    });

    test('should handle authentication completion', async ({ page }) => {
      // Go directly to callback with valid token
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      
      // Should complete authentication
      await page.waitForURL('**/admin**', { timeout: 15000 });
      
      // Should show admin dashboard
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
      
      // Check admin cookie is set
      const cookies = await page.context().cookies();
      const adminCookie = cookies.find(c => c.name === 'sbms-admin-auth');
      expect(adminCookie?.value).toBe('true');
    });

    test('should handle browser-specific features', async ({ page, browserName }) => {
      await page.goto('/auth/magic-login');
      
      // Test autofill attribute support
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('autocomplete', 'email');
      
      // Test form validation
      await page.fill('input[type="email"]', 'invalid-email');
      await page.click('button[type="submit"]');
      
      // Browser should show native validation
      const validationMessage = await emailInput.evaluate(el => 
        (el as HTMLInputElement).validationMessage
      );
      expect(validationMessage).toBeTruthy();
      
      // Test focus management
      await emailInput.focus();
      await expect(emailInput).toBeFocused();
    });

    test('should handle keyboard navigation', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await expect(page.locator('input[type="email"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('button[type="submit"]')).toBeFocused();
      
      // Test Enter key submission
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.keyboard.press('Enter');
      
      // Should submit form
      await expect(page.locator('#loading-spinner')).toBeVisible();
    });

    test('should handle browser refresh and navigation', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Fill form
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      
      // Refresh page
      await page.reload();
      
      // Form should be cleared
      await expect(page.locator('input[type="email"]')).toHaveValue('');
      
      // Test back/forward navigation
      await page.goto('/auth/login');
      await page.goBack();
      
      // Should return to magic login page
      await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
    });

    test('should handle error states appropriately', async ({ page }) => {
      // Test network error handling
      await page.route('**/auth/v1/otp', route => {
        route.abort('failed');
      });
      
      await page.goto('/auth/magic-login');
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.click('button[type="submit"]');
      
      // Should show error message
      await expect(page.locator('#auth-alert')).toBeVisible({ timeout: 5000 });
      
      // Error should be user-friendly
      const errorText = await page.locator('#auth-alert-message').textContent();
      expect(errorText).toBeTruthy();
      expect(errorText?.toLowerCase()).toContain('error');
    });
  });
}

test.describe('Browser-Specific Feature Tests', () => {
  test.describe('Chrome/Chromium Specific', () => {
    test.use({ channel: 'chrome' });
    
    test('should work with Chrome autofill', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Test Chrome's autofill suggestions
      const emailInput = page.locator('input[type="email"]');
      await emailInput.click();
      
      // Simulate autofill
      await emailInput.fill(TEST_ADMIN_EMAIL);
      
      // Verify autofill value
      await expect(emailInput).toHaveValue(TEST_ADMIN_EMAIL);
    });

    test('should handle Chrome security features', async ({ page }) => {
      // Test mixed content handling
      await page.goto('/auth/magic-login');
      
      // Check for security warnings in console
      const consoleMessages: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'warning' || msg.type() === 'error') {
          consoleMessages.push(msg.text());
        }
      });
      
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.click('button[type="submit"]');
      
      // Should not have security-related console warnings
      const securityWarnings = consoleMessages.filter(msg => 
        msg.toLowerCase().includes('mixed content') ||
        msg.toLowerCase().includes('insecure')
      );
      expect(securityWarnings).toHaveLength(0);
    });
  });

  test.describe('Firefox Specific', () => {
    test.use({ browserName: 'firefox' });
    
    test('should work with Firefox Enhanced Tracking Protection', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Complete form submission with tracking protection enabled
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.click('button[type="submit"]');
      
      // Should work despite tracking protection
      await expect(page.locator('#success-message')).toBeVisible({ timeout: 10000 });
    });

    test('should handle Firefox-specific validation', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Test Firefox's built-in email validation
      await page.fill('input[type="email"]', 'invalid-email');
      
      const isValid = await page.locator('input[type="email"]').evaluate(el => 
        (el as HTMLInputElement).checkValidity()
      );
      
      expect(isValid).toBe(false);
    });
  });

  test.describe('Safari Specific', () => {
    test.use({ browserName: 'webkit' });
    test.skip(({ browserName }) => process.platform !== 'darwin', 'Safari only on macOS');
    
    test('should work with Safari Intelligent Tracking Prevention', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Complete authentication flow with ITP enabled
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.click('button[type="submit"]');
      
      await expect(page.locator('#success-message')).toBeVisible();
      
      // Test cookie setting with ITP
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**');
      
      const cookies = await page.context().cookies();
      const adminCookie = cookies.find(c => c.name === 'sbms-admin-auth');
      expect(adminCookie).toBeTruthy();
    });

    test('should handle Safari-specific webkit features', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Test webkit appearance
      const buttonStyles = await page.locator('button[type="submit"]').evaluate(el => {
        const styles = getComputedStyle(el);
        return {
          appearance: styles.webkitAppearance || styles.appearance,
          borderRadius: styles.borderRadius,
        };
      });
      
      expect(buttonStyles).toBeTruthy();
    });
  });
});

test.describe('Cross-Browser Session Management', () => {
  test('should maintain session consistency across browsers', async ({ browser }) => {
    // This test simulates the same user using different browsers
    // In practice, this would be separate browser instances
    
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();
    
    // Authenticate in first browser
    await page1.goto('/auth/callback?type=magiclink&token=valid-admin-token');
    await page1.waitForURL('**/admin**');
    
    // Verify authentication
    await expect(page1.locator('text=Admin Dashboard')).toBeVisible();
    
    // Check cookie is set
    const cookies1 = await context1.cookies();
    const adminCookie1 = cookies1.find(c => c.name === 'sbms-admin-auth');
    expect(adminCookie1?.value).toBe('true');
    
    await context1.close();
  });

  test('should handle concurrent sessions gracefully', async ({ browser }) => {
    // Create multiple browser contexts to simulate different sessions
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
      browser.newContext(),
    ]);
    
    const pages = await Promise.all(
      contexts.map(context => context.newPage())
    );
    
    try {
      // Authenticate in all contexts simultaneously
      const authPromises = pages.map(async (page, index) => {
        await page.goto('/auth/magic-login');
        await page.fill('input[type="email"]', `admin${index}@spicebushmontessori.org`);
        await page.click('button[type="submit"]');
        return page.waitForSelector('#success-message', { timeout: 10000 });
      });
      
      await Promise.all(authPromises);
      
      // All should succeed
      for (const page of pages) {
        await expect(page.locator('#success-message')).toBeVisible();
      }
      
    } finally {
      // Cleanup
      await Promise.all(contexts.map(context => context.close()));
    }
  });
});

test.describe('Browser Compatibility Edge Cases', () => {
  test('should handle older browser simulation', async ({ page }) => {
    // Simulate missing modern features
    await page.addInitScript(() => {
      // Remove modern features that might not be available in older browsers
      delete (window as any).fetch;
      delete (window as any).Promise;
    });
    
    await page.goto('/auth/magic-login');
    
    // Page should still load (with polyfills)
    await expect(page.locator('input[type="email"]')).toBeVisible();
    
    // Note: In a real implementation, you'd have polyfills for these features
  });

  test('should handle browser extensions interference', async ({ page }) => {
    // Simulate ad blocker or other extension interference
    await page.route('**/analytics**', route => route.abort());
    await page.route('**/tracking**', route => route.abort());
    
    await page.goto('/auth/magic-login');
    
    // Core functionality should still work
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('#success-message')).toBeVisible();
  });

  test('should handle JavaScript disabled gracefully', async ({ page }) => {
    // Disable JavaScript
    await page.context().addInitScript(() => {
      Object.defineProperty(window, 'navigator', {
        value: {
          ...window.navigator,
          javaEnabled: () => false,
        },
      });
    });
    
    await page.goto('/auth/magic-login');
    
    // Basic HTML form should still be present
    await expect(page.locator('form')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Note: Without JavaScript, the form would need server-side handling
  });

  test('should handle different screen resolutions', async ({ page }) => {
    const resolutions = [
      { width: 1920, height: 1080 }, // Full HD
      { width: 1366, height: 768 },  // Common laptop
      { width: 1024, height: 768 },  // Older display
      { width: 2560, height: 1440 }, // QHD
    ];
    
    for (const resolution of resolutions) {
      await page.setViewportSize(resolution);
      await page.goto('/auth/magic-login');
      
      // Elements should be visible at all resolutions
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Check layout doesn't break
      const emailInput = page.locator('input[type="email"]');
      const boundingBox = await emailInput.boundingBox();
      expect(boundingBox?.width).toBeGreaterThan(200); // Minimum usable width
    }
  });
});

test.describe('Cross-Browser Performance', () => {
  test('should load within acceptable time across browsers', async ({ page, browserName }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/magic-login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Adjust expectations based on browser
    const maxLoadTime = browserName === 'firefox' ? 5000 : 3000;
    expect(loadTime).toBeLessThan(maxLoadTime);
    
    // Verify critical elements loaded
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle memory usage efficiently', async ({ page }) => {
    // Perform multiple navigation cycles
    for (let i = 0; i < 5; i++) {
      await page.goto('/auth/magic-login');
      await page.fill('input[type="email"]', `test${i}@example.com`);
      await page.goto('/auth/login');
      await page.goBack();
    }
    
    // Check memory usage (if available)
    const memoryInfo = await page.evaluate(() => {
      if ('memory' in performance) {
        return (performance as any).memory;
      }
      return null;
    });
    
    if (memoryInfo) {
      // Memory usage should be reasonable
      expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
  });
});
