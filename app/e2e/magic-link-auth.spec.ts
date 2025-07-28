import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const TEST_BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:4321';
const MAILHOG_URL = 'http://localhost:8025';
const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';
const TEST_NON_ADMIN_EMAIL = 'parent@example.com';

// Helper functions
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
    await this.page.waitForSelector('#success-message', { state: 'visible' });
  }

  async getLatestEmailFromMailHog(): Promise<any> {
    // In a real test environment, you'd fetch from MailHog API
    // For now, we'll simulate the email structure
    return {
      subject: 'Confirm your signup',
      html: `<a href="${TEST_BASE_URL}/auth/update-password?type=magiclink&token=test-token">Sign in</a>`,
      to: [{ address: TEST_ADMIN_EMAIL }],
    };
  }

  async simulateMagicLinkClick(magicLinkUrl: string) {
    await this.page.goto(magicLinkUrl);
  }

  async clearAuthState() {
    await this.page.context().clearCookies();
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }
}

test.describe('Magic Link Authentication E2E Tests', () => {
  let helper: MagicLinkTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new MagicLinkTestHelper(page);
    await helper.clearAuthState();
  });

  test.describe('Magic Link Request Flow', () => {
    test('should display magic login page with correct elements', async ({ page }) => {
      await helper.goToMagicLogin();

      // Check page title and branding
      await expect(page).toHaveTitle(/Sign In.*Spicebush/i);
      await expect(page.locator('img[alt*="Spicebush"]')).toBeVisible();

      // Check welcome message
      await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
      await expect(page.locator('text=no password needed')).toBeVisible();

      // Check form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('button:has-text("Send Magic Link")')).toBeVisible();
      await expect(page.locator('text=Use password instead')).toBeVisible();

      // Check form styling and accessibility
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('required');
      await expect(emailInput).toHaveAttribute('placeholder', 'Enter your email');
      
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
    });

    test('should show validation error for empty email', async ({ page }) => {
      await helper.goToMagicLogin();
      
      // Try to submit without email
      await page.click('button[type="submit"]');
      
      // Should show HTML5 validation
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveJSProperty('validity.valueMissing', true);
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await helper.goToMagicLogin();
      
      // Enter invalid email
      await page.fill('input[type="email"]', 'not-an-email');
      await page.click('button[type="submit"]');
      
      // Should show HTML5 validation
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveJSProperty('validity.typeMismatch', true);
    });

    test('should successfully send magic link for admin email', async ({ page }) => {
      await helper.goToMagicLogin();
      
      // Fill and submit form
      await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
      
      // Should show loading state
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();
      await expect(page.locator('#loading-spinner')).toBeVisible();
      
      // Should show success message
      await helper.waitForSuccessMessage();
      await expect(page.locator('#success-message')).toBeVisible();
      await expect(page.locator('#sent-email')).toHaveText(TEST_ADMIN_EMAIL);
      
      // Form should be hidden
      await expect(page.locator('#magic-link-form').locator('..')).toHaveClass(/hidden/);
    });

    test('should handle resend magic link', async ({ page }) => {
      await helper.goToMagicLogin();
      
      // Send initial magic link
      await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
      await helper.waitForSuccessMessage();
      
      // Click resend button
      await page.click('#resend-button');
      
      // Should show confirmation message
      await expect(page.locator('#auth-alert')).toBeVisible();
      await expect(page.locator('#auth-alert-message')).toContainText('Magic link resent');
    });

    test('should display error for network failures', async ({ page }) => {
      // Simulate network error by going offline
      await page.context().setOffline(true);
      
      await helper.goToMagicLogin();
      await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
      
      // Should show error message
      await expect(page.locator('#auth-alert')).toBeVisible();
      await expect(page.locator('#auth-alert-message')).toContainText(/failed|error/i);
      
      // Restore network
      await page.context().setOffline(false);
    });
  });

  test.describe('Magic Link Callback Flow', () => {
    test('should handle magic link redirect correctly', async ({ page }) => {
      // Simulate clicking a magic link
      const magicLinkUrl = `${TEST_BASE_URL}/auth/update-password?type=magiclink&token=test-token`;
      await page.goto(magicLinkUrl);
      
      // Should show processing state
      await expect(page.locator('text=Processing Magic Link')).toBeVisible();
      await expect(page.locator('.animate-spin')).toBeVisible();
      
      // Should redirect to callback
      await page.waitForURL('**/auth/callback**');
      expect(page.url()).toContain('/auth/callback');
    });

    test('should complete authentication flow for admin user', async ({ page }) => {
      // Mock a successful authentication by going directly to callback
      // In a real test, this would be triggered by the magic link
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      
      // Should show processing state
      await expect(page.locator('text=Signing you in')).toBeVisible();
      
      // Should show success state
      await expect(page.locator('#success')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Success!')).toBeVisible();
      
      // Should redirect to admin dashboard
      await page.waitForURL('**/admin**', { timeout: 10000 });
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });

    test('should reject non-admin users', async ({ page }) => {
      // Mock authentication for non-admin user
      await page.goto('/auth/callback?type=magiclink&token=valid-non-admin-token');
      
      // Should show error state
      await expect(page.locator('#error')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Access denied')).toBeVisible();
      
      // Should provide link to request new magic link
      const newLinkButton = page.locator('a:has-text("Request new link")');
      await expect(newLinkButton).toBeVisible();
      await expect(newLinkButton).toHaveAttribute('href', '/auth/magic-login');
    });

    test('should handle expired magic links', async ({ page }) => {
      await page.goto('/auth/callback?type=magiclink&token=expired-token');
      
      // Should show error state
      await expect(page.locator('#error')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Invalid or expired')).toBeVisible();
    });

    test('should handle malformed magic links', async ({ page }) => {
      await page.goto('/auth/callback?type=magiclink');
      
      // Should show error state
      await expect(page.locator('#error')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Admin Dashboard Access', () => {
    test('should set admin cookie after successful authentication', async ({ page }) => {
      // Complete authentication flow
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**');
      
      // Check that admin cookie is set
      const cookies = await page.context().cookies();
      const adminCookie = cookies.find(c => c.name === 'sbms-admin-auth');
      expect(adminCookie).toBeTruthy();
      expect(adminCookie?.value).toBe('true');
      expect(adminCookie?.path).toBe('/');
    });

    test('should maintain session across page reloads', async ({ page }) => {
      // Complete authentication
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**');
      
      // Reload page
      await page.reload();
      
      // Should still be authenticated
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });

    test('should maintain session across browser tabs', async ({ context }) => {
      const page1 = await context.newPage();
      
      // Authenticate in first tab
      await page1.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page1.waitForURL('**/admin**');
      
      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/admin');
      
      // Should be authenticated in second tab
      await expect(page2.locator('text=Admin Dashboard')).toBeVisible();
      
      await page1.close();
      await page2.close();
    });

    test('should redirect to login when accessing admin without auth', async ({ page }) => {
      await page.goto('/admin');
      
      // Should redirect to login
      await page.waitForURL('**/auth/login**');
      await expect(page.locator('input[type="email"]')).toBeVisible();
    });
  });

  test.describe('Coming Soon Mode Integration', () => {
    test('should bypass coming soon mode for authenticated admin', async ({ page }) => {
      // Complete authentication
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**');
      
      // Navigate to main site
      await page.goto('/');
      
      // Should see actual site, not coming soon page
      await expect(page.locator('text=Coming Soon')).not.toBeVisible();
      await expect(page.locator('nav')).toBeVisible();
    });

    test('should show admin preview bar when in coming soon mode', async ({ page }) => {
      // Complete authentication
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**');
      
      // Navigate to main site
      await page.goto('/');
      
      // Should show admin preview bar
      await expect(page.locator('text=Admin Preview Mode')).toBeVisible();
      await expect(page.locator('text=Site is in Coming Soon mode')).toBeVisible();
    });
  });

  test.describe('Logout Flow', () => {
    test('should logout successfully', async ({ page }) => {
      // Complete authentication
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**');
      
      // Find and click logout button
      await page.click('button:has-text("Sign Out")');
      
      // Should redirect away from admin
      await page.waitForFunction(() => !window.location.pathname.startsWith('/admin'));
      
      // Try to access admin again
      await page.goto('/admin');
      await page.waitForURL('**/auth/login**');
    });

    test('should clear admin cookie on logout', async ({ page }) => {
      // Complete authentication
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**');
      
      // Logout
      await page.click('button:has-text("Sign Out")');
      
      // Check that admin cookie is cleared
      const cookies = await page.context().cookies();
      const adminCookie = cookies.find(c => c.name === 'sbms-admin-auth');
      expect(adminCookie?.value).not.toBe('true');
    });
  });
});

test.describe('Magic Link Security Tests', () => {
  let helper: MagicLinkTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new MagicLinkTestHelper(page);
    await helper.clearAuthState();
  });

  test('should prevent XSS in email input', async ({ page }) => {
    await helper.goToMagicLogin();
    
    const xssPayloads = [
      '<script>alert("XSS")</script>@example.com',
      'javascript:alert("XSS")@example.com',
      '><img src=x onerror=alert("XSS")>@example.com',
    ];
    
    for (const payload of xssPayloads) {
      await page.fill('input[type="email"]', payload);
      await page.click('button[type="submit"]');
      
      // Wait a moment for any potential XSS execution
      await page.waitForTimeout(1000);
      
      // Page should still be functional
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Clear the input for next test
      await page.fill('input[type="email"]', '');
    }
  });

  test('should not expose sensitive information in URLs', async ({ page }) => {
    await helper.goToMagicLogin();
    await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
    
    // Check URL doesn't contain email or tokens
    expect(page.url()).not.toContain(TEST_ADMIN_EMAIL);
    expect(page.url()).not.toContain('token');
    expect(page.url()).not.toContain('password');
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/auth/magic-login');
    const headers = response?.headers();
    
    // Check for security headers
    expect(
      headers?.['x-frame-options'] === 'DENY' ||
      headers?.['x-frame-options'] === 'SAMEORIGIN' ||
      headers?.['content-security-policy']?.includes('frame-ancestors')
    ).toBeTruthy();
  });

  test('should handle multiple rapid submissions gracefully', async ({ page }) => {
    await helper.goToMagicLogin();
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    
    // Click submit multiple times rapidly
    const submitButton = page.locator('button[type="submit"]');
    await Promise.all([
      submitButton.click(),
      submitButton.click(),
      submitButton.click(),
    ]);
    
    // Should handle gracefully and show success once
    await helper.waitForSuccessMessage();
    await expect(page.locator('#success-message')).toBeVisible();
  });
});

test.describe('User Experience Tests', () => {
  let helper: MagicLinkTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = new MagicLinkTestHelper(page);
    await helper.clearAuthState();
  });

  test('should provide clear loading feedback', async ({ page }) => {
    await helper.goToMagicLogin();
    
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    
    // Monitor loading states
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show loading state immediately
    await expect(submitButton).toBeDisabled();
    await expect(page.locator('#loading-spinner')).toBeVisible();
    await expect(page.locator('#button-text')).toBeHidden();
  });

  test('should have accessible form elements', async ({ page }) => {
    await helper.goToMagicLogin();
    
    // Check form accessibility
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = page.locator('label[for="email"]');
    
    await expect(emailLabel).toBeVisible();
    await expect(emailInput).toHaveAttribute('id', 'email');
    
    // Check ARIA attributes
    const alertDiv = page.locator('#auth-alert');
    await expect(alertDiv).toHaveAttribute('role', 'alert');
    await expect(alertDiv).toHaveAttribute('aria-live', 'polite');
  });

  test('should support keyboard navigation', async ({ page }) => {
    await helper.goToMagicLogin();
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
    
    // Submit with Enter
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.keyboard.press('Enter');
    
    // Should submit form
    await helper.waitForSuccessMessage();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Start at magic login
    await helper.goToMagicLogin();
    
    // Navigate to login page
    await page.click('a[href="/auth/login"]');
    await expect(page).toHaveURL('**/auth/login');
    
    // Go back
    await page.goBack();
    await expect(page).toHaveURL('**/auth/magic-login');
    
    // Form should be cleared
    await expect(page.locator('input[type="email"]')).toHaveValue('');
  });

  test('should provide helpful error recovery', async ({ page }) => {
    await helper.goToMagicLogin();
    
    // Simulate an error scenario
    await page.context().setOffline(true);
    await helper.fillEmailAndSubmit(TEST_ADMIN_EMAIL);
    
    // Should show error with recovery option
    await expect(page.locator('#auth-alert')).toBeVisible();
    
    // Form should remain usable after error
    await page.context().setOffline(false);
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    await expect(page.locator('input[type="email"]')).toHaveValue(TEST_ADMIN_EMAIL);
  });
});
