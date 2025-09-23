/**
 * Magic Link Error Handling and Edge Cases Test Suite
 * 
 * Tests various error conditions, edge cases, and failure scenarios
 * for the magic link authentication system.
 * 
 * Run with: npx playwright test tests/e2e/magic-link-error-handling.spec.ts
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321';
const ADMIN_EMAIL = 'admin@spicebushmontessori.org';
const TIMEOUT = 15000;

test.describe('Magic Link Error Handling - Network and Service Failures', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Network Failure During Magic Link Request', async ({ page }) => {
    // Intercept and fail all network requests to auth endpoints
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
    const errorSelectors = [
      'text=/network.*error/i',
      'text=/connection.*failed/i',
      'text=/failed.*to.*send/i',
      'text=/try.*again.*later/i',
      'text=/server.*unavailable/i',
      'text=/request.*failed/i'
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 10000 })) {
        errorFound = true;
        break;
      }
    }
    
    expect(errorFound).toBe(true);
    
    // Button should be re-enabled for retry
    await expect(submitButton).toBeEnabled();
  });

  test('Server Error (500) Response', async ({ page }) => {
    // Intercept and return server error
    await page.route('**/auth/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should show server error message
    await expect(page.locator('text=/server.*error|internal.*error|500|service.*unavailable/i')).toBeVisible({ timeout: 10000 });
    
    // Should not show success message
    await expect(page.locator('text=/sent|check.*email/i')).not.toBeVisible();
  });

  test('Timeout During Magic Link Request', async ({ page }) => {
    // Intercept and delay responses indefinitely
    await page.route('**/auth/**', route => {
      if (route.request().method() === 'POST') {
        // Never respond - this will cause timeout
        return; // Don't call route.continue() or route.fulfill()
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should show loading state initially
    const loadingIndicator = page.locator('[data-loading="true"], .loading, .spinner');
    if (await loadingIndicator.isVisible()) {
      await expect(submitButton).toBeDisabled();
    }
    
    // Should eventually show timeout error or re-enable button
    await page.waitForTimeout(5000); // Wait 5 seconds
    
    const hasTimeoutError = await page.locator('text=/timeout|taking.*too.*long|try.*again/i').isVisible();
    const isButtonEnabled = await submitButton.isEnabled();
    
    // Should either show timeout error or re-enable button for retry
    expect(hasTimeoutError || isButtonEnabled).toBe(true);
  });

  test('Malformed Server Response', async ({ page }) => {
    // Intercept and return invalid JSON
    await page.route('**/auth/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response {'
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should handle malformed response gracefully
    await expect(page.locator('text=/error|unexpected.*response|try.*again/i')).toBeVisible({ timeout: 10000 });
  });

  test('Rate Limiting Response from Server', async ({ page }) => {
    // Intercept and return rate limit error
    await page.route('**/auth/**', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please wait before trying again.',
            retry_after: 60
          })
        });
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should show rate limiting message
    await expect(page.locator('text=/rate.*limit|too.*many.*requests|wait.*before/i')).toBeVisible({ timeout: 10000 });
    
    // Should indicate when user can try again
    const retryMessage = page.locator('text=/try.*again.*in|wait.*60|minute/i');
    await expect(retryMessage).toBeVisible();
  });
});

test.describe('Magic Link Callback Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Invalid Token Hash in Callback', async ({ page }) => {
    const invalidCallbackUrl = `${BASE_URL}/auth/callback?type=magiclink&token_hash=invalid-token-hash&access_token=fake-token`;
    
    await page.goto(invalidCallbackUrl);
    
    // Should show invalid token error
    await expect(page.locator('text=/invalid.*token|token.*expired|link.*invalid/i')).toBeVisible({ timeout: 10000 });
    
    // Should provide option to request new link
    const newLinkButton = page.locator('a:has-text("Request New"), a:has-text("Get New Link"), a:has-text("Back to Login")');
    await expect(newLinkButton).toBeVisible();
    
    // Test navigation back to login
    await newLinkButton.first().click();
    await expect(page).toHaveURL(/\/auth\/magic-login$/);
  });

  test('Expired Magic Link Token', async ({ page }) => {
    const expiredCallbackUrl = `${BASE_URL}/auth/callback?type=magiclink&error=token_expired&error_description=The+magic+link+has+expired`;
    
    await page.goto(expiredCallbackUrl);
    
    // Should show expiration message
    await expect(page.locator('text=/expired|link.*expired|no.*longer.*valid|timed.*out/i')).toBeVisible({ timeout: 5000 });
    
    // Should explain the issue
    await expect(page.locator('text=/security.*reasons|request.*new.*link/i')).toBeVisible();
    
    // Should provide clear action
    const actionButton = page.locator('button:has-text("Request New Link"), a:has-text("Get New Link")');
    if (await actionButton.isVisible()) {
      await actionButton.click();
      await expect(page).toHaveURL(/\/auth\/magic-login$/);
    }
  });

  test('Missing Required Parameters in Callback', async ({ page }) => {
    const incompleteUrls = [
      `${BASE_URL}/auth/callback`, // No parameters
      `${BASE_URL}/auth/callback?type=magiclink`, // Missing token
      `${BASE_URL}/auth/callback?token_hash=abc123`, // Missing type
      `${BASE_URL}/auth/callback?type=invalid&token_hash=abc123` // Wrong type
    ];
    
    for (const url of incompleteUrls) {
      await page.goto(url);
      
      // Should show appropriate error message
      const errorSelectors = [
        'text=/invalid.*request/i',
        'text=/missing.*parameters/i',
        'text=/malformed.*link/i',
        'text=/invalid.*link/i'
      ];
      
      let errorFound = false;
      for (const selector of errorSelectors) {
        if (await page.locator(selector).isVisible({ timeout: 5000 })) {
          errorFound = true;
          break;
        }
      }
      
      // If no specific error message, should at least not crash and provide navigation
      if (!errorFound) {
        const navigationOption = page.locator('a:has-text("Login"), a:has-text("Home"), a:has-text("Back")');
        await expect(navigationOption).toBeVisible();
      }
      
      console.log(`✅ Handled incomplete callback URL: ${url}`);
    }
  });

  test('Supabase Authentication Error in Callback', async ({ page }) => {
    // Intercept Supabase auth requests and return error
    await page.route('**/auth/v1/**', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code'
        })
      });
    });

    const callbackUrl = `${BASE_URL}/auth/callback?type=magiclink&token_hash=valid-format-token&access_token=test-token`;
    
    await page.goto(callbackUrl);
    
    // Should handle Supabase error gracefully
    await expect(page.locator('text=/authentication.*failed|invalid.*authorization|expired.*code/i')).toBeVisible({ timeout: 10000 });
    
    // Should provide recovery option
    const retryOption = page.locator('a:has-text("Try Again"), a:has-text("New Link"), button:has-text("Back")');
    await expect(retryOption).toBeVisible();
  });

  test('Database Connection Error During Callback', async ({ page }) => {
    // Intercept database-related requests and fail them
    await page.route('**/api/**', route => {
      if (route.request().url().includes('supabase') || route.request().url().includes('postgrest')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    const callbackUrl = `${BASE_URL}/auth/callback?type=magiclink&token_hash=valid-token&access_token=valid-token`;
    
    await page.goto(callbackUrl);
    
    // Should handle database error
    const errorSelectors = [
      'text=/database.*error/i',
      'text=/connection.*failed/i',
      'text=/service.*unavailable/i',
      'text=/try.*again.*later/i'
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 10000 })) {
        errorFound = true;
        break;
      }
    }
    
    // Should either show specific error or graceful fallback
    expect(errorFound).toBe(true);
  });
});

test.describe('Browser and Client-Side Error Handling', () => {
  test('JavaScript Disabled Environment', async ({ page }) => {
    // Disable JavaScript
    await page.context().addInitScript(() => {
      Object.defineProperty(window, 'fetch', { value: undefined });
      Object.defineProperty(window, 'XMLHttpRequest', { value: undefined });
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    // Form should still be usable with basic HTML functionality
    const form = page.locator('form');
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(form).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(submitButton).toBeVisible();
    
    // Should have proper form action for fallback
    const formAction = await form.getAttribute('action');
    expect(formAction).toBeTruthy();
    
    await emailInput.fill(ADMIN_EMAIL);
    // Note: Actual submission would depend on server-side handling
  });

  test('Local Storage Unavailable', async ({ page }) => {
    // Mock localStorage to throw errors
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: () => { throw new Error('localStorage unavailable'); },
          setItem: () => { throw new Error('localStorage unavailable'); },
          removeItem: () => { throw new Error('localStorage unavailable'); },
          clear: () => { throw new Error('localStorage unavailable'); }
        }
      });
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    // Should still function without localStorage
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should either work normally or show graceful fallback
    const hasSuccess = await page.locator('text=/sent|check.*email/i').isVisible({ timeout: 10000 });
    const hasError = await page.locator('text=/error/i').isVisible({ timeout: 5000 });
    
    // Should not crash the application
    expect(hasSuccess || hasError).toBe(true);
  });

  test('Cookie Disabled Environment', async ({ page }) => {
    // Block all cookie setting
    await page.context().addInitScript(() => {
      Object.defineProperty(document, 'cookie', {
        get: () => '',
        set: () => { throw new Error('Cookies disabled'); }
      });
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Should still send magic link even without cookie support
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: 10000 });
    
    // May show warning about cookie requirement for full functionality
    const cookieWarning = page.locator('text=/cookies.*required|enable.*cookies/i');
    if (await cookieWarning.isVisible()) {
      console.log('✅ Cookie warning displayed appropriately');
    }
  });

  test('Very Slow Network Connection', async ({ page }) => {
    // Slow down all network requests significantly
    await page.route('**/*', route => {
      setTimeout(() => route.continue(), 3000); // 3 second delay
    });

    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    
    const startTime = Date.now();
    await submitButton.click();
    
    // Should show loading indicator for slow requests
    await expect(page.locator('[data-loading="true"], .loading, .spinner')).toBeVisible({ timeout: 1000 });
    await expect(submitButton).toBeDisabled();
    
    // Should eventually complete or timeout gracefully
    await expect(page.locator('text=/sent|check.*email|error|timeout/i')).toBeVisible({ timeout: 20000 });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Slow network request completed in ${duration}ms`);
  });

  test('Browser Back Button During Processing', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Wait for processing to start
    await page.waitForTimeout(1000);
    
    // Use browser back button
    await page.goBack();
    
    // Should return to clean state
    await expect(page).toHaveURL(/\/auth\/magic-login$/);
    
    // Form should be in initial state
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('');
    
    // Should be able to use form again
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Edge Cases and Boundary Conditions', () => {
  test('Extremely Long Email Addresses', async ({ page }) => {
    const longLocalPart = 'a'.repeat(64); // Maximum local part length
    const longDomainPart = 'b'.repeat(63); // Maximum domain label length
    const longEmail = `${longLocalPart}@${longDomainPart}.spicebushmontessori.org`;
    
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(longEmail);
    await submitButton.click();
    
    // Should handle long emails appropriately
    const hasResponse = await page.locator('text=/sent|check.*email|invalid|too.*long/i').isVisible({ timeout: 10000 });
    expect(hasResponse).toBe(true);
  });

  test('Unicode Characters in Email', async ({ page }) => {
    const unicodeEmails = [
      'тест@spicebushmontessori.org', // Cyrillic
      'ユーザー@spicebushmontessori.org', // Japanese
      'müller@spicebushmontessori.org', // German umlaut
      'josé@spicebushmontessori.org', // Spanish accent
      '用户@spicebushmontessori.org' // Chinese
    ];
    
    for (const email of unicodeEmails) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should handle unicode emails gracefully (accept or reject consistently)
      const hasResponse = await page.locator('text=/sent|check.*email|invalid|not.*supported/i').isVisible({ timeout: 10000 });
      expect(hasResponse).toBe(true);
      
      console.log(`✅ Unicode email handled: ${email}`);
    }
  });

  test('Rapid Multiple Submissions', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    
    // Submit multiple times rapidly
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(submitButton.click());
    }
    
    await Promise.all(promises);
    
    // Should handle multiple submissions gracefully
    // Either through rate limiting, button disabling, or duplicate prevention
    const responses = await Promise.all([
      page.locator('text=/sent|check.*email/i').isVisible({ timeout: 2000 }),
      page.locator('text=/rate.*limit|too.*many/i').isVisible({ timeout: 2000 }),
      page.locator('text=/already.*sent|duplicate/i').isVisible({ timeout: 2000 })
    ]);
    
    const hasValidResponse = responses.some(response => response);
    expect(hasValidResponse).toBe(true);
  });

  test('Page Refresh During Magic Link Processing', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Immediately refresh the page
    await page.reload();
    
    // Should return to clean initial state
    const emailValue = await emailInput.inputValue();
    expect(emailValue).toBe('');
    
    // Should not show success message from previous submission
    await expect(page.locator('text=/sent|check.*email/i')).not.toBeVisible();
    
    // Form should be functional again
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ timeout: 10000 });
  });

  test('Browser Tab Switching During Processing', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();
    
    // Start magic link process in first tab
    await page1.goto(`${BASE_URL}/auth/magic-login`);
    const emailInput = page1.locator('input[type="email"]');
    const submitButton = page1.locator('button[type="submit"]');
    
    await emailInput.fill(ADMIN_EMAIL);
    await submitButton.click();
    
    // Switch to second tab and try the same
    await page2.goto(`${BASE_URL}/auth/magic-login`);
    const emailInput2 = page2.locator('input[type="email"]');
    const submitButton2 = page2.locator('button[type="submit"]');
    
    await emailInput2.fill(ADMIN_EMAIL);
    await submitButton2.click();
    
    // Both tabs should handle the requests appropriately
    const response1 = await page1.locator('text=/sent|check.*email|rate.*limit/i').isVisible({ timeout: 10000 });
    const response2 = await page2.locator('text=/sent|check.*email|rate.*limit/i').isVisible({ timeout: 10000 });
    
    expect(response1).toBe(true);
    expect(response2).toBe(true);
    
    await context.close();
  });
});

// Utility functions for error testing
export async function simulateNetworkFailure(page: Page): Promise<void> {
  await page.route('**/*', route => route.abort('failed'));
}

export async function simulateSlowNetwork(page: Page, delayMs: number = 3000): Promise<void> {
  await page.route('**/*', route => {
    setTimeout(() => route.continue(), delayMs);
  });
}

export async function simulateServerError(page: Page, statusCode: number = 500): Promise<void> {
  await page.route('**/auth/**', route => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: `Server error ${statusCode}` })
      });
    } else {
      route.continue();
    }
  });
}

export async function testErrorRecovery(page: Page, email: string): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');
    
    // Check if error is handled gracefully
    const hasError = await page.locator('text=/error|failed/i').isVisible({ timeout: 5000 });
    const hasRecovery = await page.locator('button:enabled, a:has-text("Try Again")').isVisible({ timeout: 5000 });
    
    return hasError && hasRecovery;
  } catch {
    return false;
  }
}