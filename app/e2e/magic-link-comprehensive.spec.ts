import { test, expect, Page, BrowserContext } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// Test configuration
const TEST_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4321';
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.TEST_SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_ANON_KEY or TEST_SUPABASE_ANON_KEY environment variable');
}
const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';
const TEST_NON_ADMIN_EMAIL = 'parent@example.com';
const SESSION_COOKIE_NAME = 'sbms-session';

// Initialize Supabase client for test utilities
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Magic Link Test Helper Class
 * Provides utility methods for authentication testing
 */
class MagicLinkTestHelper {
  constructor(private page: Page) {}

  async goToMagicLogin() {
    await this.page.goto('/auth/magic-login');
    await this.page.waitForLoadState('networkidle');
  }

  async fillEmailAndSubmit(email: string) {
    await this.page.fill('input[type="email"]', email);
    await this.page.click('button[type="submit"]');
  }

  async waitForSuccessMessage() {
    await this.page.waitForSelector('#success-message', { state: 'visible', timeout: 10000 });
  }

  async clearAuthState() {
    // Clear cookies
    await this.page.context().clearCookies();
    
    // Clear local storage and session storage
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // Clear any Supabase auth state
    await this.page.evaluate(() => {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
        }
      });
    });
  }

  async getSessionCookie() {
    const cookies = await this.page.context().cookies();
    return cookies.find(c => c.name === SESSION_COOKIE_NAME);
  }

  async simulateNetworkCondition(condition: 'offline' | 'slow' | 'fast') {
    switch (condition) {
      case 'offline':
        await this.page.context().setOffline(true);
        break;
      case 'slow':
        await this.page.context().setOffline(false);
        // Simulate slow 3G
        await this.page.route('**/*', async route => {
          await new Promise(resolve => setTimeout(resolve, 2000));
          await route.continue();
        });
        break;
      case 'fast':
        await this.page.context().setOffline(false);
        await this.page.unroute('**/*');
        break;
    }
  }

  async extractMagicLinkFromConsole(): Promise<string | null> {
    // In development, Supabase logs the magic link to console
    // This is a workaround for testing without email service
    return new Promise((resolve) => {
      this.page.on('console', msg => {
        const text = msg.text();
        if (text.includes('auth/confirm') || text.includes('auth/verify')) {
          const match = text.match(/https?:\/\/[^\s]+/);
          if (match) resolve(match[0]);
        }
      });
      setTimeout(() => resolve(null), 5000);
    });
  }
}

test.describe('Magic Link Authentication - Comprehensive Tests', () => {
  let helper: MagicLinkTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new MagicLinkTestHelper(page);
    await helper.clearAuthState();
  });

  test.describe('Complete Authentication Flow', () => {
    test('should complete full magic link authentication flow', async ({ page }) => {
      // Step 1: Navigate to magic login
      await helper.goToMagicLogin();
      
      // Verify page elements
      await expect(page).toHaveTitle(/Sign In.*Spicebush/i);
      await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
      
      // Step 2: Submit email
      await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
      
      // Verify loading state
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();
      await expect(page.locator('#loading-spinner')).toBeVisible();
      
      // Step 3: Verify success message
      await helper.waitForSuccessMessage();
      await expect(page.locator('#sent-email')).toHaveText(TEST_ADMIN_EMAIL);
      
      // Step 4: In a real test, we would retrieve the magic link from email
      // For now, we'll simulate the callback
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      
      // Step 5: Verify processing
      await expect(page.locator('text=Signing you in')).toBeVisible();
      
      // Step 6: Verify successful authentication
      await page.waitForURL('**/admin**', { timeout: 15000 });
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
      
      // Step 7: Verify session cookie is set
      const sessionCookie = await helper.getSessionCookie();
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(sessionCookie?.secure).toBe(true);
      expect(sessionCookie?.sameSite).toBe('Lax');
    });

    test('should handle non-admin user authentication', async ({ page }) => {
      await helper.goToMagicLogin();
      await helper.fillEmailAndSubmit(TEST_NON_ADMIN_EMAIL);
      await helper.waitForSuccessMessage();
      
      // Simulate non-admin callback
      await page.goto(`/auth/callback?type=magiclink&token=test-non-admin-token`);
      
      // Should show access denied
      await expect(page.locator('#error')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Access denied')).toBeVisible();
      
      // Should not have session cookie
      const sessionCookie = await helper.getSessionCookie();
      expect(sessionCookie).toBeFalsy();
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      // Authenticate first
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page.waitForURL('**/admin**');
      
      // Get initial session cookie
      const initialCookie = await helper.getSessionCookie();
      expect(initialCookie).toBeTruthy();
      
      // Reload page
      await page.reload();
      
      // Should still be on admin page
      await expect(page).toHaveURL(/.*\/admin/);
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
      
      // Cookie should persist
      const reloadedCookie = await helper.getSessionCookie();
      expect(reloadedCookie?.value).toBe(initialCookie?.value);
    });

    test('should maintain session across browser tabs', async ({ context }) => {
      const page1 = await context.newPage();
      const helper1 = new MagicLinkTestHelper(page1);
      
      // Authenticate in first tab
      await page1.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page1.waitForURL('**/admin**');
      
      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/admin');
      
      // Should be authenticated in second tab
      await expect(page2).toHaveURL(/.*\/admin/);
      await expect(page2.locator('text=Admin Dashboard')).toBeVisible();
      
      // Close tabs
      await page1.close();
      await page2.close();
    });

    test('should handle session expiration gracefully', async ({ page }) => {
      // Set expired session cookie
      await page.context().addCookies([{
        name: SESSION_COOKIE_NAME,
        value: 'expired-session-token',
        domain: new URL(TEST_BASE_URL).hostname,
        path: '/',
        expires: Date.now() / 1000 - 3600 // Expired 1 hour ago
      }]);
      
      // Try to access admin
      await page.goto('/admin');
      
      // Should redirect to login
      await page.waitForURL('**/auth/login**');
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  });

  test.describe('Protected Routes', () => {
    test('should protect all admin routes', async ({ page }) => {
      const protectedRoutes = [
        '/admin',
        '/admin/newsletter',
        '/admin/settings',
        '/admin/communications',
        '/admin/communications/templates'
      ];
      
      for (const route of protectedRoutes) {
        await page.goto(route);
        await page.waitForURL('**/auth/login**');
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page).not.toHaveURL(route);
      }
    });

    test('should allow access to public routes', async ({ page }) => {
      const publicRoutes = [
        '/',
        '/about',
        '/programs',
        '/admissions',
        '/auth/login',
        '/auth/magic-login'
      ];
      
      for (const route of publicRoutes) {
        const response = await page.goto(route);
        expect(response?.status()).toBeLessThan(400);
      }
    });

    test('should protect API endpoints', async ({ page }) => {
      const protectedEndpoints = [
        '/api/admin/settings',
        '/api/admin/newsletter',
        '/api/admin/communications',
        '/api/cms/entries'
      ];
      
      for (const endpoint of protectedEndpoints) {
        const response = await page.request.get(endpoint);
        expect([401, 403]).toContain(response.status());
      }
    });
  });

  test.describe('Logout Functionality', () => {
    test('should logout successfully and clear session', async ({ page }) => {
      // Authenticate first
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page.waitForURL('**/admin**');
      
      // Verify authenticated
      const preCookie = await helper.getSessionCookie();
      expect(preCookie).toBeTruthy();
      
      // Find and click logout
      await page.click('button:has-text("Sign Out")');
      
      // Should redirect away from admin
      await page.waitForFunction(() => !window.location.pathname.startsWith('/admin'));
      
      // Session cookie should be cleared
      const postCookie = await helper.getSessionCookie();
      expect(postCookie).toBeFalsy();
      
      // Should not be able to access admin
      await page.goto('/admin');
      await page.waitForURL('**/auth/login**');
    });

    test('should invalidate session on server after logout', async ({ page }) => {
      // Authenticate
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page.waitForURL('**/admin**');
      
      // Get session token
      const sessionCookie = await helper.getSessionCookie();
      const sessionToken = sessionCookie?.value;
      
      // Logout
      await page.click('button:has-text("Sign Out")');
      
      // Try to use the old session token
      await page.context().addCookies([{
        name: SESSION_COOKIE_NAME,
        value: sessionToken!,
        domain: new URL(TEST_BASE_URL).hostname,
        path: '/'
      }]);
      
      // Should still not have access
      const response = await page.request.get('/api/auth/check');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Edge Cases and Error Handling', () => {
    test('should handle network failures during magic link request', async ({ page }) => {
      await helper.goToMagicLogin();
      
      // Go offline before submitting
      await helper.simulateNetworkCondition('offline');
      
      await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
      
      // Should show error
      await expect(page.locator('#auth-alert')).toBeVisible();
      await expect(page.locator('#auth-alert-message')).toContainText(/failed|error|offline/i);
      
      // Form should remain functional after going back online
      await helper.simulateNetworkCondition('fast');
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
      await expect(page.locator('input[type="email"]')).toHaveValue(TEST_ADMIN_EMAIL);
    });

    test('should handle slow network gracefully', async ({ page }) => {
      await helper.goToMagicLogin();
      
      // Simulate slow network
      await helper.simulateNetworkCondition('slow');
      
      await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
      
      // Should show loading state
      await expect(page.locator('#loading-spinner')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeDisabled();
      
      // Should eventually complete (with longer timeout)
      await helper.waitForSuccessMessage();
      
      // Restore network
      await helper.simulateNetworkCondition('fast');
    });

    test('should prevent duplicate submissions', async ({ page }) => {
      await helper.goToMagicLogin();
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      
      // Click submit multiple times rapidly
      const submitButton = page.locator('button[type="submit"]');
      
      // Use Promise.allSettled to handle potential rejections
      await Promise.allSettled([
        submitButton.click(),
        submitButton.click(),
        submitButton.click()
      ]);
      
      // Should still show success only once
      await helper.waitForSuccessMessage();
      const successMessages = await page.locator('#success-message').count();
      expect(successMessages).toBe(1);
    });

    test('should handle invalid magic link formats', async ({ page }) => {
      const invalidLinks = [
        '/auth/callback',
        '/auth/callback?type=magiclink',
        '/auth/callback?token=abc123',
        '/auth/callback?type=wrongtype&token=abc123',
        '/auth/callback?type=magiclink&token='
      ];
      
      for (const link of invalidLinks) {
        await page.goto(link);
        await expect(page.locator('#error')).toBeVisible({ timeout: 10000 });
        await expect(page.locator('text=/Invalid|error/i')).toBeVisible();
      }
    });

    test('should handle expired magic links', async ({ page }) => {
      // Simulate expired token
      await page.goto('/auth/callback?type=magiclink&token=expired-token');
      
      // Should show appropriate error
      await expect(page.locator('#error')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/expired|invalid/i')).toBeVisible();
      
      // Should provide option to request new link
      const newLinkButton = page.locator('a:has-text("Request new link")');
      await expect(newLinkButton).toBeVisible();
      await newLinkButton.click();
      await page.waitForURL('**/auth/magic-login**');
    });
  });

  test.describe('Security Tests', () => {
    test('should not expose sensitive information in URLs', async ({ page }) => {
      await helper.goToMagicLogin();
      await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
      
      // Check URL doesn't contain sensitive data
      const url = page.url();
      expect(url).not.toContain(TEST_ADMIN_EMAIL);
      expect(url).not.toContain('token');
      expect(url).not.toContain('session');
    });

    test('should prevent XSS in email input', async ({ page }) => {
      await helper.goToMagicLogin();
      
      const xssPayloads = [
        '<script>alert("XSS")</script>@example.com',
        'test@example.com<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")@example.com'
      ];
      
      for (const payload of xssPayloads) {
        await page.fill('input[type="email"]', payload);
        await page.click('button[type="submit"]');
        
        // Wait to see if any alerts appear
        let alertFired = false;
        page.on('dialog', () => { alertFired = true; });
        await page.waitForTimeout(1000);
        
        expect(alertFired).toBe(false);
        
        // Clear input for next test
        await page.fill('input[type="email"]', '');
      }
    });

    test('should reject tampered session cookies', async ({ page }) => {
      // Set various invalid session cookies
      const invalidCookies = [
        { value: 'tampered-session-token' },
        { value: '' },
        { value: 'a'.repeat(1000) }, // Very long token
        { value: '../../../etc/passwd' }, // Path traversal attempt
        { value: '<script>alert("XSS")</script>' } // XSS attempt
      ];
      
      for (const cookie of invalidCookies) {
        await page.context().clearCookies();
        await page.context().addCookies([{
          name: SESSION_COOKIE_NAME,
          value: cookie.value,
          domain: new URL(TEST_BASE_URL).hostname,
          path: '/'
        }]);
        
        // Should reject access
        const response = await page.request.get('/api/auth/check');
        expect(response.status()).toBe(401);
      }
    });

    test('should enforce HTTPS for session cookies in production', async ({ page }) => {
      // This test would run in production environment
      if (TEST_BASE_URL.startsWith('https://')) {
        await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
        await page.waitForURL('**/admin**');
        
        const sessionCookie = await helper.getSessionCookie();
        expect(sessionCookie?.secure).toBe(true);
      }
    });

    test('should implement proper CORS headers', async ({ page }) => {
      const response = await page.request.get('/api/auth/check', {
        headers: {
          'Origin': 'https://evil-site.com'
        }
      });
      
      const headers = response.headers();
      
      // Should not allow arbitrary origins
      expect(headers['access-control-allow-origin']).not.toBe('https://evil-site.com');
      expect(headers['access-control-allow-origin']).not.toBe('*');
    });
  });

  test.describe('Browser Compatibility', () => {
    test('should work with autofill', async ({ page }) => {
      await helper.goToMagicLogin();
      
      // Simulate browser autofill
      await page.evaluate(() => {
        const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
        emailInput.value = 'evey@eveywinters.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      // Should be able to submit
      await page.click('button[type="submit"]');
      await helper.waitForSuccessMessage();
    });

    test('should handle browser back/forward navigation', async ({ page }) => {
      // Navigate through the flow
      await page.goto('/');
      await page.goto('/auth/magic-login');
      await page.goto('/auth/login');
      
      // Go back to magic login
      await page.goBack();
      await expect(page).toHaveURL(/.*magic-login/);
      await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
      
      // Go forward
      await page.goForward();
      await expect(page).toHaveURL(/.*\/login/);
    });

    test('should work without JavaScript', async ({ browser }) => {
      // Create context with JavaScript disabled
      const context = await browser.newContext({
        javaScriptEnabled: false
      });
      const page = await context.newPage();
      
      await page.goto('/auth/magic-login');
      
      // Basic form should still be visible
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      await context.close();
    });
  });

  test.describe('Performance and Load Testing', () => {
    test('should handle concurrent login attempts', async ({ browser }) => {
      const contexts = [];
      const promises = [];
      
      // Create 5 concurrent sessions
      for (let i = 0; i < 5; i++) {
        const context = await browser.newContext();
        contexts.push(context);
        
        const page = await context.newPage();
        const helper = new MagicLinkTestHelper(page);
        
        promises.push(
          helper.goToMagicLogin()
            .then(() => helper.fillEmailAndSubmit(`test${i}@example.com`))
        );
      }
      
      // All should complete without errors
      await Promise.all(promises);
      
      // Cleanup
      for (const context of contexts) {
        await context.close();
      }
    });

    test('should load magic login page quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/auth/magic-login');
      const loadTime = Date.now() - startTime;
      
      // Page should load in under 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check that critical elements are visible quickly
      await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 1000 });
      await expect(page.locator('button[type="submit"]')).toBeVisible({ timeout: 1000 });
    });
  });

  test.describe('Coming Soon Mode Integration', () => {
    test('should bypass coming soon mode for authenticated admins', async ({ page }) => {
      // Authenticate as admin
      await page.goto(`/auth/callback?type=magiclink&token=test-admin-token`);
      await page.waitForURL('**/admin**');
      
      // Navigate to main site
      await page.goto('/');
      
      // Should not see coming soon page
      await expect(page.locator('text=Coming Soon')).not.toBeVisible();
      
      // Should see admin preview indicator
      await expect(page.locator('text=/Admin Preview|Preview Mode/i')).toBeVisible();
    });

    test('should show coming soon for unauthenticated users', async ({ page }) => {
      // Ensure no authentication
      await helper.clearAuthState();
      
      // Navigate to main site
      await page.goto('/');
      
      // Should be redirected to coming soon
      await expect(page).toHaveURL(/.*coming-soon/);
      await expect(page.locator('text=Coming Soon')).toBeVisible();
    });
  });
});

test.describe('Magic Link Authentication - Visual Regression', () => {
  test('should match login page visual snapshot', async ({ page }) => {
    await page.goto('/auth/magic-login');
    await page.waitForLoadState('networkidle');
    
    // Wait for fonts to load
    await page.waitForTimeout(1000);
    
    // Take screenshot
    await expect(page).toHaveScreenshot('magic-login-page.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should match success state visual snapshot', async ({ page }) => {
    const helper = new MagicLinkTestHelper(page);
    await helper.goToMagicLogin();
    await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
    await helper.waitForSuccessMessage();
    
    // Wait for animations
    await page.waitForTimeout(500);
    
    await expect(page).toHaveScreenshot('magic-login-success.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});