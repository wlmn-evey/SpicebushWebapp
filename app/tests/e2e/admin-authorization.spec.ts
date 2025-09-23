/**
 * Admin Authorization and Email Domain Validation Tests
 * 
 * Specifically tests the admin role verification and email domain restrictions
 * for the magic link authentication system.
 * 
 * Run with: npx playwright test tests/e2e/admin-authorization.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4321';

// Admin email domains and specific emails that should be allowed
const VALID_ADMIN_EMAILS = [
  'admin@spicebushmontessori.org',
  'director@spicebushmontessori.org',
  'evey@eveywinters.com',
  'test@spicebushmontessori.org',
  'support@spicebushmontessori.org',
  'info@spicebushmontessori.org'
];

// Invalid emails that should be rejected
const INVALID_EMAILS = [
  // Different domains
  'admin@gmail.com',
  'director@yahoo.com',
  'evey@hotmail.com',
  'user@example.com',
  'parent@otherschool.org',
  
  // Similar but wrong domains
  'admin@spicebush-montessori.org',
  'admin@spicebushmontessori.com',
  'admin@spicebushmontessori.net',
  'evey@eveywinters.net',
  'evey@eveywinter.com',
  
  // Typo variations
  'admin@spicebushmontesori.org',
  'admin@spicebushmontessori.or',
  'evey@everywinters.com',
  
  // Security test cases
  'admin@spicebushmontessori.org.evil.com',
  'admin@evil.com',
  'attacker@spicebushmontessori.org.malicious.com'
];

test.describe('Admin Email Domain Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Valid Admin Emails - Should Accept All Authorized Domains', async ({ page }) => {
    for (const email of VALID_ADMIN_EMAILS) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should show success message for all valid admin emails
      await expect(page.locator('text=/sent|check.*email|magic.*link/i')).toBeVisible({ 
        timeout: 10000 
      });
      
      // Should not show any authorization error
      await expect(page.locator('text=/not.*authorized|invalid.*email|access.*denied/i')).not.toBeVisible();
      
      console.log(`✅ ${email} - Accepted as valid admin email`);
    }
  });

  test('Invalid Emails - Should Reject All Unauthorized Domains', async ({ page }) => {
    for (const email of INVALID_EMAILS) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should show error message for invalid emails
      const errorSelectors = [
        'text=/not.*authorized/i',
        'text=/invalid.*email/i', 
        'text=/access.*denied/i',
        'text=/not.*allowed/i',
        'text=/unauthorized/i',
        'text=/permission.*denied/i'
      ];
      
      let errorFound = false;
      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector);
        if (await errorElement.isVisible({ timeout: 5000 })) {
          errorFound = true;
          break;
        }
      }
      
      expect(errorFound).toBe(true);
      
      // Should not show success message
      await expect(page.locator('text=/sent|check.*email/i')).not.toBeVisible();
      
      console.log(`✅ ${email} - Correctly rejected as invalid email`);
    }
  });

  test('Case Insensitive Email Validation', async ({ page }) => {
    const emailVariations = [
      'Admin@SpicebushMontessori.org',
      'ADMIN@SPICEBUSHMONTESSORI.ORG',
      'admin@SPICEBUSHMONTESSORI.org',
      'EVEY@EVEYWINTERS.COM',
      'Evey@EveYWinters.com'
    ];
    
    for (const email of emailVariations) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should accept regardless of case
      await expect(page.locator('text=/sent|check.*email/i')).toBeVisible({ 
        timeout: 10000 
      });
      
      console.log(`✅ ${email} - Case variation accepted`);
    }
  });

  test('Email Validation - Malformed Email Addresses', async ({ page }) => {
    const malformedEmails = [
      // Missing @ symbol
      'adminspicebushmontessori.org',
      'eveyeveywinters.com',
      
      // Multiple @ symbols
      'admin@@spicebushmontessori.org',
      'ad@min@spicebushmontessori.org',
      
      // Missing domain
      'admin@',
      'evey@',
      
      // Missing local part
      '@spicebushmontessori.org',
      '@eveywinters.com',
      
      // Invalid characters
      'admin..test@spicebushmontessori.org',
      'admin test@spicebushmontessori.org',
      'admin@spicebush montessori.org',
      
      // Empty strings
      '',
      ' ',
      '   '
    ];
    
    for (const email of malformedEmails) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should either show validation error or not submit
      const hasValidationError = await page.locator('text=/invalid|format|valid.*email/i').isVisible({ timeout: 2000 });
      const hasSuccessMessage = await page.locator('text=/sent|check.*email/i').isVisible({ timeout: 2000 });
      
      // Should not succeed with malformed email
      expect(hasSuccessMessage).toBe(false);
      
      console.log(`✅ "${email}" - Correctly rejected as malformed`);
    }
  });
});

test.describe('Admin Role Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Admin Cookie Authentication - Valid Admin', async ({ page }) => {
    // Simulate successful admin authentication
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
    
    // Should access admin panel without redirect
    expect(page.url()).toContain('/admin');
    
    // Should see admin content
    const adminIndicators = [
      'text=/dashboard/i',
      'text=/settings/i',
      'text=/admin.*panel/i',
      'text=/welcome.*admin/i',
      'text=/communications/i'
    ];
    
    let adminContentFound = false;
    for (const indicator of adminIndicators) {
      if (await page.locator(indicator).isVisible({ timeout: 5000 })) {
        adminContentFound = true;
        break;
      }
    }
    
    expect(adminContentFound).toBe(true);
  });

  test('No Admin Cookie - Should Redirect to Login', async ({ page }) => {
    // Try to access admin without authentication
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login or show access denied
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/auth/') || currentUrl.includes('/login');
    const hasAccessDenied = await page.locator('text=/access.*denied|not.*authorized|login.*required/i').isVisible();
    
    expect(isLoginPage || hasAccessDenied).toBe(true);
  });

  test('Invalid Admin Cookie - Should Not Grant Access', async ({ page }) => {
    // Set invalid admin cookie
    await page.context().addCookies([{
      name: 'sbms-admin-auth',
      value: 'false',
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    // Should not access admin panel
    const currentUrl = page.url();
    const isAdminPanel = currentUrl.includes('/admin') && !currentUrl.includes('/auth');
    
    expect(isAdminPanel).toBe(false);
  });

  test('Session Timeout Simulation', async ({ page }) => {
    // Set admin cookie
    await page.context().addCookies([{
      name: 'sbms-admin-auth',
      value: 'true',
      domain: 'localhost',
      path: '/'
    }]);
    
    // Access admin panel
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/admin');
    
    // Clear cookies to simulate session timeout
    await page.context().clearCookies();
    
    // Try to navigate to another admin page
    await page.goto(`${BASE_URL}/admin/settings`);
    await page.waitForLoadState('networkidle');
    
    // Should redirect to login
    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/auth/') || currentUrl.includes('/login');
    
    expect(isLoginPage).toBe(true);
  });

  test('Direct Admin Routes Protection', async ({ page }) => {
    const adminRoutes = [
      '/admin',
      '/admin/dashboard',
      '/admin/settings',
      '/admin/communications',
      '/admin/content',
      '/admin/users'
    ];
    
    for (const route of adminRoutes) {
      // Clear any existing auth
      await page.context().clearCookies();
      
      // Try to access admin route directly
      await page.goto(`${BASE_URL}${route}`);
      await page.waitForLoadState('networkidle');
      
      // Should not be able to access without auth
      const currentUrl = page.url();
      const hasAccess = currentUrl.includes(route) && !currentUrl.includes('/auth');
      
      if (hasAccess) {
        // Check if it's actually showing admin content or just a generic page
        const hasAdminContent = await page.locator('text=/admin|dashboard|settings/i').isVisible();
        expect(hasAdminContent).toBe(false);
      }
      
      console.log(`✅ ${route} - Protected from unauthorized access`);
    }
  });
});

test.describe('Security Edge Cases', () => {
  test('Domain Spoofing Attempts', async ({ page }) => {
    const spoofingAttempts = [
      // Subdomain attacks
      'admin@evil.spicebushmontessori.org',
      'admin@spicebushmontessori.org.evil.com',
      'admin@fake-spicebushmontessori.org',
      
      // Unicode/punycode attacks (if supported)
      'admin@spіcebushmontessori.org', // Uses cyrillic і
      'admin@spicebushmοntessori.org', // Uses greek ο
      
      // Homograph attacks
      'admin@spicebush-montessori.org',
      'admin@spicebushmontessоri.org', // Mixed scripts
      
      // Case variations with additional domains
      'admin@SPICEBUSHMONTESSORI.ORG.evil.com'
    ];
    
    for (const email of spoofingAttempts) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(email);
      await submitButton.click();
      
      // Should reject spoofing attempts
      const hasError = await page.locator('text=/not.*authorized|invalid|denied/i').isVisible({ timeout: 5000 });
      const hasSuccess = await page.locator('text=/sent|check.*email/i').isVisible({ timeout: 2000 });
      
      expect(hasSuccess).toBe(false);
      
      console.log(`✅ ${email} - Spoofing attempt blocked`);
    }
  });

  test('Admin Cookie Tampering Protection', async ({ page }) => {
    const tamperedCookies = [
      'admin=true',
      'sbms-admin=true', 
      'true',
      'sbms-admin-auth=1',
      'sbms-admin-auth=yes',
      'sbms-admin-auth=TRUE',
      'sbms-admin-auth=admin',
      'sbms-admin-auth=authenticated'
    ];
    
    for (const cookieValue of tamperedCookies) {
      await page.context().clearCookies();
      
      // Try to set tampered cookie
      await page.context().addCookies([{
        name: cookieValue.includes('=') ? cookieValue.split('=')[0] : 'sbms-admin-auth',
        value: cookieValue.includes('=') ? cookieValue.split('=')[1] : cookieValue,
        domain: 'localhost',
        path: '/'
      }]);
      
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState('networkidle');
      
      // Should not grant admin access with tampered cookie
      const currentUrl = page.url();
      const hasAdminAccess = currentUrl.includes('/admin') && !currentUrl.includes('/auth');
      
      if (hasAdminAccess) {
        // Double-check by looking for actual admin content
        const hasAdminContent = await page.locator('text=/admin.*panel|dashboard|settings/i').isVisible();
        expect(hasAdminContent).toBe(false);
      }
      
      console.log(`✅ Cookie tampering attempt blocked: ${cookieValue}`);
    }
  });

  test('Injection Attempts in Email Field', async ({ page }) => {
    const injectionAttempts = [
      // XSS attempts
      '<script>alert("xss")</script>@spicebushmontessori.org',
      'admin@spicebushmontessori.org<script>alert(1)</script>',
      'javascript:alert(1)@spicebushmontessori.org',
      
      // SQL injection attempts
      "admin'; DROP TABLE users; --@spicebushmontessori.org",
      "admin' OR '1'='1@spicebushmontessori.org",
      
      // Command injection attempts
      'admin`ls -la`@spicebushmontessori.org',
      'admin$(whoami)@spicebushmontessori.org',
      
      // LDAP injection attempts
      'admin*)(uid=*))(|(uid=*@spicebushmontessori.org'
    ];
    
    for (const maliciousEmail of injectionAttempts) {
      await page.goto(`${BASE_URL}/auth/magic-login`);
      
      const emailInput = page.locator('input[type="email"]');
      const submitButton = page.locator('button[type="submit"]');
      
      await emailInput.fill(maliciousEmail);
      await submitButton.click();
      
      // Should not execute any injected code
      const hasAlert = await page.evaluate(() => {
        return !!document.querySelector('script') || 
               window.location.href.includes('javascript:') ||
               document.documentElement.innerHTML.includes('<script>');
      });
      
      expect(hasAlert).toBe(false);
      
      // Should not show success message
      const hasSuccess = await page.locator('text=/sent|check.*email/i').isVisible({ timeout: 2000 });
      expect(hasSuccess).toBe(false);
      
      console.log(`✅ Injection attempt blocked: ${maliciousEmail.substring(0, 30)}...`);
    }
  });
});

// Utility functions for manual testing
export async function testEmailDomain(page: Page, email: string): Promise<{isValid: boolean, message: string}> {
  try {
    await page.goto(`${BASE_URL}/auth/magic-login`);
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');
    
    const hasSuccess = await page.locator('text=/sent|check.*email/i').isVisible({ timeout: 5000 });
    const hasError = await page.locator('text=/not.*authorized|invalid|denied/i').isVisible({ timeout: 5000 });
    
    if (hasSuccess) {
      return { isValid: true, message: 'Email accepted - magic link sent' };
    } else if (hasError) {
      const errorText = await page.locator('text=/not.*authorized|invalid|denied/i').textContent();
      return { isValid: false, message: errorText || 'Email rejected' };
    } else {
      return { isValid: false, message: 'Unexpected response' };
    }
  } catch (error) {
    return { isValid: false, message: `Error: ${error}` };
  }
}

export async function testAdminAccess(page: Page, cookieValue: string): Promise<boolean> {
  try {
    await page.context().addCookies([{
      name: 'sbms-admin-auth',
      value: cookieValue,
      domain: 'localhost',
      path: '/'
    }]);
    
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    const hasAdminAccess = currentUrl.includes('/admin') && !currentUrl.includes('/auth');
    
    if (hasAdminAccess) {
      const hasAdminContent = await page.locator('text=/admin.*panel|dashboard|settings/i').isVisible();
      return hasAdminContent;
    }
    
    return false;
  } catch {
    return false;
  }
}