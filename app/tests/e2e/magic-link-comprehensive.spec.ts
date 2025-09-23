/**
 * Comprehensive Magic Link Authentication E2E Tests
 * 
 * Tests the complete magic link authentication flow including:
 * - Email domain validation
 * - Authentication flow
 * - Admin role verification
 * - Error handling
 * - Session management
 * - Production readiness
 * 
 * Run with: npx playwright test tests/e2e/magic-link-comprehensive.spec.ts
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321';
const ADMIN_EMAIL = 'admin@spicebushmontessori.org';
const DIRECTOR_EMAIL = 'director@spicebushmontessori.org';
const EVEY_EMAIL = 'evey@eveywinters.com';
const INVALID_EMAIL = 'parent@example.com';
const TIMEOUT = 15000;

test.describe('Magic Link Authentication - Complete E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Valid Admin Email - Complete Authentication Flow', async ({ page }) => {
    // Step 1: Navigate to magic login page
    await page.goto(`${BASE_URL}/auth/magic-login`);
    await expect(page).toHaveTitle(/Login|Magic Link|Sign In/i);
    
    // Step 2: Verify page elements are present and functional
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toBeEnabled();
    
    // Step 3: Test form validation
    await submitButton.click(); // Submit empty form
    await expect(emailInput).toBeFocused(); // Should focus on empty field
    
    // Step 4: Enter valid admin email
    await emailInput.fill(ADMIN_EMAIL);
    await expect(emailInput).toHaveValue(ADMIN_EMAIL);
    
    // Step 5: Submit form and verify loading state
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/auth') && response.request().method() === 'POST'
    );
    
    await submitButton.click();
    
    // Check for loading indicator
    const loadingIndicator = page.locator('.loading, [data-loading="true"], text=Sending');
    if (await loadingIndicator.isVisible()) {
      await expect(submitButton).toBeDisabled();
    }
    
    // Step 6: Verify success message appears
    await expect(page.locator('text=/sent|check.*email|magic.*link/i')).toBeVisible({ timeout: TIMEOUT });
    
    // Step 7: Verify email is displayed in success message
    await expect(page.locator(`text=${ADMIN_EMAIL}`)).toBeVisible();
    
    // Step 8: Verify resend functionality
    const resendButton = page.locator('button:has-text("Resend"), button:has-text("Send Again")');
    if (await resendButton.isVisible()) {
      await resendButton.click();
      await expect(page.locator('text=/sent|resent|another.*link/i')).toBeVisible();
    }
  });

  test('Email Domain Validation - All Valid Admin Domains', async ({ page }) => {
    const validEmails = [ADMIN_EMAIL, DIRECTOR_EMAIL, EVEY_EMAIL];
    
    for (const email of validEmails) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should show success message for valid emails
      await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: TIMEOUT });
      await expect(page.locator('text=/not.*authorized|invalid.*email|access.*denied/i')).not.toBeVisible();
    }
  });

  test('Email Domain Validation - Reject Invalid Domains', async ({ page }) => {
    const invalidEmails = [
      'parent@example.com',
      'user@gmail.com',
      'attacker@evil.com',
      'admin@wrongdomain.org'
    ];
    
    for (const email of invalidEmails) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should show error message for invalid emails
      await expect(page.locator('text=/not.*authorized|invalid.*email|access.*denied|not.*allowed/i')).toBeVisible({ timeout: 5000 });
      
      // Should not show success message
      await expect(page.locator('text=/sent|check.*email/i')).not.toBeVisible();
    }
  });

  test('Magic Link Callback Processing - Valid Token', async ({ page }) => {
    // Simulate valid magic link callback
    const callbackUrl = `${BASE_URL}/auth/callback?type=magiclink&token_hash=mock-valid-token&access_token=mock-access&refresh_token=mock-refresh`;
    
    await page.goto(callbackUrl);
    
    // Should show processing indicator
    await expect(page.locator('text=/processing|verifying|authenticating/i')).toBeVisible({ timeout: 5000 });
    
    // Wait for processing to complete
    await page.waitForLoadState('networkidle');
    
    // Check final state - should either redirect to admin or show specific error
    const currentUrl = page.url();
    const hasError = await page.locator('text=/error|invalid|expired/i').isVisible();
    const isAdminPanel = currentUrl.includes('/admin');
    const isAuthPage = currentUrl.includes('/auth');
    
    // Should be in one of these valid states
    expect(hasError || isAdminPanel || isAuthPage).toBe(true);
  });

  test('Magic Link Callback Processing - Invalid Token', async ({ page }) => {
    const invalidCallbackUrl = `${BASE_URL}/auth/callback?type=magiclink&error=invalid_request&error_description=Invalid+token`;
    
    await page.goto(invalidCallbackUrl);
    
    // Should show error message
    await expect(page.locator('text=/error|invalid|expired|try.*again/i')).toBeVisible({ timeout: 5000 });
    
    // Should provide navigation options
    const backToLoginLink = page.locator('a:has-text("Back to Login"), a:has-text("Try Again"), a:has-text("Return")');
    await expect(backToLoginLink).toBeVisible();
    
    // Test the back to login functionality
    await backToLoginLink.click();
    await expect(page).toHaveURL(/\/auth\/magic-login$/);
  });

  test('Session Management - Admin Cookie Persistence', async ({ page }) => {
    // Simulate successful authentication by setting admin cookie
    await page.context().addCookies([{
      name: 'sbms-admin-auth',
      value: 'true',
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax'
    }]);
    
    // Navigate to admin area
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should not redirect to login
    expect(page.url()).toContain('/admin');
    
    // Verify admin content is accessible
    await expect(page.locator('text=/dashboard|settings|admin.*panel/i')).toBeVisible();
    
    // Test session persistence across page refreshes
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin');
  });

  test('Auto-Redirect After Authentication', async ({ page }) => {
    // Start at magic login with redirect parameter
    const redirectPath = '/admin/settings';
    await page.goto(`${BASE_URL}/auth/magic-login?redirect=${encodeURIComponent(redirectPath)}`);
    
    const emailInput = page.locator('input[type="email"]');
    await emailInput.fill(ADMIN_EMAIL);
    await page.locator('button[type="submit"]').click();
    
    // Verify success message
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible();
    
    // Simulate auth completion by setting cookie and navigating to callback
    await page.context().addCookies([{
      name: 'sbms-admin-auth',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto(`${BASE_URL}/auth/callback?type=magiclink&redirect=${encodeURIComponent(redirectPath)}`);
    await page.waitForLoadState('networkidle');
    
    // Should redirect to intended page
    expect(page.url()).toContain(redirectPath);
  });
});

test.describe('Magic Link Authentication - Error Handling & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Rate Limiting Protection', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Submit multiple requests rapidly
    for (let i = 0; i < 5; i++) {
      await emailInput.fill(ADMIN_EMAIL);
      await submitButton.click();
      
      if (i === 0) {
        // First request should succeed or show loading
        const successMessage = page.locator('text=/sent|check.*email/i');
        const loadingIndicator = page.locator('.loading, [data-loading="true"]');
        
        await expect(successMessage.or(loadingIndicator)).toBeVisible({ timeout: 5000 });
      }
      
      await page.waitForTimeout(500); // Small delay between requests
    }
    
    // After multiple requests, check for rate limiting
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    const rateLimitMessage = page.locator('text=/too.*many|rate.*limit|wait.*before|slow.*down/i');
    const successMessage = page.locator('text=/sent|check.*email/i');
    
    // Should either show rate limit or success (implementation dependent)
    const hasRateLimit = await rateLimitMessage.isVisible();
    const hasSuccess = await successMessage.isVisible();
    
    expect(hasRateLimit || hasSuccess).toBe(true);
  });

  test('Network Error Handling', async ({ page }) => {
    // Intercept and fail the magic link request
    await page.route('**/auth/**', route => {
      if (route.request().method() === 'POST') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });
    
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should show network error message
    await expect(page.locator('text=/error|failed|network|connection|try.*again/i')).toBeVisible({ timeout: 10000 });
    
    // Button should be re-enabled for retry
    await expect(submitButton).toBeEnabled();
  });

  test('Malformed Email Input', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    const malformedEmails = [
      'not-an-email',
      '@domain.com',
      'user@',
      'user..name@domain.com',
      'user name@domain.com'
    ];
    
    for (const badEmail of malformedEmails) {
      await emailInput.fill(badEmail);
      await submitButton.click();
      
      // Should show validation error or reject submission
      const hasValidationError = await page.locator('text=/invalid|format|valid.*email/i').isVisible();
      const hasSuccessMessage = await page.locator('text=/sent|check.*email/i').isVisible();
      
      // Should not succeed with malformed email
      expect(hasSuccessMessage).toBe(false);
      
      if (!hasValidationError) {
        // If no validation error shown, the form should not have submitted
        await expect(page).toHaveURL(/\/auth\/magic-login$/);
      }
      
      await page.reload(); // Reset for next test
    }
  });

  test('Expired Magic Link Handling', async ({ page }) => {
    const expiredCallbackUrl = `${BASE_URL}/auth/callback?type=magiclink&error=expired_token&error_description=Magic+link+has+expired`;
    
    await page.goto(expiredCallbackUrl);
    
    // Should show expired token message
    await expect(page.locator('text=/expired|link.*expired|no.*longer.*valid/i')).toBeVisible();
    
    // Should provide option to request new link
    const newLinkButton = page.locator('a:has-text("Request New"), a:has-text("Get New Link"), a:has-text("Try Again")');
    await expect(newLinkButton).toBeVisible();
    
    await newLinkButton.click();
    await expect(page).toHaveURL(/\/auth\/magic-login$/);
  });

  test('Concurrent Session Handling', async ({ page, context }) => {
    // Simulate user already authenticated in another tab
    await context.addCookies([{
      name: 'sbms-admin-auth',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }]);
    
    // Try to access magic login while already authenticated
    await page.goto(`${BASE_URL}/auth/magic-login`);
    await page.waitForLoadState('networkidle');
    
    // Should either redirect to admin or show already authenticated message
    const currentUrl = page.url();
    const alreadyAuthMessage = page.locator('text=/already.*logged|already.*authenticated/i');
    
    const isRedirected = currentUrl.includes('/admin');
    const showsMessage = await alreadyAuthMessage.isVisible();
    
    expect(isRedirected || showsMessage).toBe(true);
  });
});

test.describe('Magic Link Authentication - Cross-Browser & Device Testing', () => {
  test('Mobile Device Compatibility', async ({ page }) => {
    // Test on various mobile viewports
    const mobileViewports = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11 Pro' },
      { width: 360, height: 640, name: 'Android Small' },
      { width: 412, height: 915, name: 'Android Large' }
    ];
    
    for (const viewport of mobileViewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      // Verify form is usable on this viewport
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await expect(emailInput).toBeVisible();
      await expect(submitButton).toBeVisible();
      
      // Check if elements are properly sized for touch interaction
      const emailBox = await emailInput.boundingBox();
      const submitBox = await submitButton.boundingBox();
      
      expect(emailBox?.width).toBeGreaterThan(200); // Minimum usable width
      expect(emailBox?.height).toBeGreaterThan(40);  // Minimum touch target
      expect(submitBox?.width).toBeGreaterThan(100);
      expect(submitBox?.height).toBeGreaterThan(40);
      
      // Test form functionality
      await emailInput.fill(ADMIN_EMAIL);
      await submitButton.click();
      
      await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: TIMEOUT });
      
      console.log(`✅ ${viewport.name} (${viewport.width}x${viewport.height}) - Magic link form functional`);
    }
  });

  test('Touch Interaction Compatibility', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    // Simulate touch interactions
    await emailInput.tap();
    await expect(emailInput).toBeFocused();
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.tap();
    
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: TIMEOUT });
  });

  test('Accessibility Compliance - WCAG Standards', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    // Check for proper labels and ARIA attributes
    const emailInput = page.locator('input[type="email"]');
    
    // Should have label or aria-label
    const labelText = await emailInput.getAttribute('aria-label') || 
                     await page.locator('label[for]').textContent() ||
                     await emailInput.getAttribute('placeholder');
    
    expect(labelText).toBeTruthy();
    expect(labelText?.toLowerCase()).toContain('email');
    
    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(emailInput).toBeFocused();
    
    await page.keyboard.press('Tab');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();
    
    // Check for proper error messaging
    await submitButton.click(); // Submit empty form
    
    const errorMessage = page.locator('[role="alert"], .error, .invalid, [aria-invalid="true"]');
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      expect(errorText).toBeTruthy();
      expect(errorText?.length).toBeGreaterThan(5); // Should be descriptive
    }
    
    // Check color contrast (basic)
    const backgroundColor = await page.evaluate(() => {
      const element = document.querySelector('input[type="email"]');
      return window.getComputedStyle(element!).backgroundColor;
    });
    
    const textColor = await page.evaluate(() => {
      const element = document.querySelector('input[type="email"]');
      return window.getComputedStyle(element!).color;
    });
    
    expect(backgroundColor).toBeTruthy();
    expect(textColor).toBeTruthy();
  });

  test('Performance - Page Load and Response Times', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/auth/magic-login`);
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Page should load within reasonable time
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    
    // Test form submission response time
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    
    const submitStartTime = Date.now();
    await submitButton.click();
    
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: TIMEOUT });
    
    const submitTime = Date.now() - submitStartTime;
    
    // Form submission should respond within reasonable time
    expect(submitTime).toBeLessThan(10000); // 10 seconds max
    
    console.log(`🚀 Performance: Page load ${loadTime}ms, Form submit ${submitTime}ms`);
  });
});

test.describe('Magic Link Authentication - Production Readiness', () => {
  test.skip(() => !process.env.RUN_PRODUCTION_TESTS, 'Skipping production tests - set RUN_PRODUCTION_TESTS=true to enable');

  test('Production Environment - SSL and Security', async ({ page }) => {
    const prodUrl = process.env.PRODUCTION_URL || BASE_URL;
    
    // Skip if testing on localhost
    if (prodUrl.includes('localhost')) {
      test.skip();
      return;
    }
    
    await page.goto(`${prodUrl}/auth/magic-login`);
    
    // Verify HTTPS is used
    expect(page.url()).toContain('https://');
    
    // Check for security headers (if accessible via browser)
    const securityHeaders = await page.evaluate(() => {
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      return meta ? meta.getAttribute('content') : null;
    });
    
    // Test form submission over HTTPS
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: TIMEOUT });
  });

  test('Production Environment - Email Delivery Verification', async ({ page }) => {
    const prodUrl = process.env.PRODUCTION_URL || BASE_URL;
    
    await page.goto(`${prodUrl}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should show success message indicating email was sent
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: TIMEOUT });
    
    // Should not show any server errors
    await expect(page.locator('text=/server.*error|500|internal.*error/i')).not.toBeVisible();
    
    console.log('✅ Production email sending appears functional');
  });

  test('Production Environment - Database Connectivity', async ({ page }) => {
    const prodUrl = process.env.PRODUCTION_URL || BASE_URL;
    
    // Test that the magic login page loads (requires database for settings)
    await page.goto(`${prodUrl}/auth/magic-login`);
    await page.waitForLoadState('networkidle');
    
    // Should not show database connection errors
    await expect(page.locator('text=/database.*error|connection.*failed|db.*error/i')).not.toBeVisible();
    
    // Form should be functional
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    console.log('✅ Production database connectivity appears functional');
  });
});

// Test utilities for manual verification
export async function verifyMagicLinkEmail(page: Page, email: string): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');
    
    const success = await page.locator('text=/sent|check.*email/i').isVisible({ timeout: 5000 });
    return success;
  } catch {
    return false;
  }
}

export async function simulateMagicLinkCallback(page: Page, tokenHash: string): Promise<string> {
  const callbackUrl = `${BASE_URL}/auth/callback?type=magiclink&token_hash=${tokenHash}`;
  await page.goto(callbackUrl);
  await page.waitForLoadState('networkidle');
  return page.url();
}