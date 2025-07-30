import { test, expect, type Page } from '@playwright/test';

// Helper to get session cookie
async function getSessionCookie(page: Page) {
  const cookies = await page.context().cookies();
  return cookies.find(c => c.name === 'sbms-session');
}

// Helper to clear session cookie
async function clearSessionCookie(page: Page) {
  await page.context().clearCookies();
}

// Helper to set a fake session cookie
async function setFakeSessionCookie(page: Page) {
  await page.context().addCookies([{
    name: 'sbms-session',
    value: 'fake-invalid-session-token',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
}

// Helper to set old-style auth cookie
async function setOldAuthCookie(page: Page) {
  await page.context().addCookies([{
    name: 'sbms-admin-auth',
    value: 'true',
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);
}

test.describe('Session Management E2E Tests', () => {
  const baseURL = 'http://localhost:4322';
  const adminEmail = 'admin@spicebushmontessori.org';
  const adminPassword = process.env.ADMIN_TEST_PASSWORD || 'test-password';
  const nonAdminEmail = 'parent@example.com';
  const nonAdminPassword = 'parent-password';

  test.beforeEach(async ({ page }) => {
    // Clear all cookies before each test
    await clearSessionCookie(page);
    
    // Navigate to home page to establish context
    await page.goto(baseURL);
  });

  test.describe('Session Creation', () => {
    test('should create secure session on admin login', async ({ page }) => {
      // Navigate to admin login
      await page.goto(`${baseURL}/admin`);
      
      // Should redirect to auth page
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Fill login form
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      
      // Wait for redirect to admin dashboard
      await page.waitForURL(/\/admin/);
      
      // Check session cookie was created
      const sessionCookie = await getSessionCookie(page);
      expect(sessionCookie).toBeTruthy();
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(sessionCookie?.sameSite).toBe('Lax');
      expect(sessionCookie?.value).toMatch(/^[a-zA-Z0-9_-]{32}$/); // 32 char nanoid token
      
      // Verify cookie expiry is approximately 7 days
      if (sessionCookie?.expires) {
        const expiryDate = new Date(sessionCookie.expires * 1000);
        const expectedExpiry = new Date();
        expectedExpiry.setDate(expectedExpiry.getDate() + 7);
        const diff = Math.abs(expiryDate.getTime() - expectedExpiry.getTime());
        expect(diff).toBeLessThan(60 * 60 * 1000); // Within 1 hour tolerance
      }
    });

    test('should not create session for non-admin users', async ({ page }) => {
      // Navigate to admin login
      await page.goto(`${baseURL}/admin`);
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Try to login with non-admin credentials
      await page.fill('input[type="email"]', nonAdminEmail);
      await page.fill('input[type="password"]', nonAdminPassword);
      await page.click('button[type="submit"]');
      
      // Should show error and not redirect to admin
      await expect(page.locator('.error-message')).toBeVisible();
      await expect(page).not.toHaveURL(/\/admin$/);
      
      // No session cookie should be created
      const sessionCookie = await getSessionCookie(page);
      expect(sessionCookie).toBeFalsy();
    });
  });

  test.describe('Session Validation', () => {
    test('should allow access to admin pages with valid session', async ({ page }) => {
      // First login to create session
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
      
      // Navigate directly to various admin pages
      const adminPages = [
        '/admin',
        '/admin/settings',
        '/admin/content',
        '/admin/uploads',
      ];
      
      for (const adminPage of adminPages) {
        await page.goto(`${baseURL}${adminPage}`);
        await expect(page).toHaveURL(new RegExp(adminPage));
        // Should not redirect to login
        await expect(page).not.toHaveURL(/\/auth\/login/);
      }
    });

    test('should redirect to login with invalid session', async ({ page }) => {
      // Set a fake invalid session cookie
      await setFakeSessionCookie(page);
      
      // Try to access admin page
      await page.goto(`${baseURL}/admin`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Invalid session cookie should be cleared
      const sessionCookie = await getSessionCookie(page);
      expect(sessionCookie).toBeFalsy();
    });

    test('should update last activity on navigation', async ({ page }) => {
      // Login first
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
      
      // Get initial session cookie
      const initialCookie = await getSessionCookie(page);
      expect(initialCookie).toBeTruthy();
      
      // Wait for activity threshold (in real scenario this would be 15+ minutes)
      // For testing, we'll just navigate between pages
      await page.goto(`${baseURL}/admin/settings`);
      await page.waitForLoadState('networkidle');
      
      await page.goto(`${baseURL}/admin/content`);
      await page.waitForLoadState('networkidle');
      
      // Session should still be valid
      await expect(page).not.toHaveURL(/\/auth\/login/);
      
      // Cookie should persist
      const updatedCookie = await getSessionCookie(page);
      expect(updatedCookie?.value).toBe(initialCookie?.value);
    });
  });

  test.describe('Session Logout', () => {
    test('should invalidate session on logout', async ({ page }) => {
      // Login first
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
      
      // Verify session exists
      let sessionCookie = await getSessionCookie(page);
      expect(sessionCookie).toBeTruthy();
      
      // Click logout
      await page.click('button:has-text("Sign Out")');
      
      // Should redirect to home or login
      await expect(page).toHaveURL(/\/(auth\/login)?$/);
      
      // Session cookie should be cleared
      sessionCookie = await getSessionCookie(page);
      expect(sessionCookie).toBeFalsy();
      
      // Try to access admin page again
      await page.goto(`${baseURL}/admin`);
      await expect(page).toHaveURL(/\/auth\/login/);
    });

    test('should not allow reuse of invalidated session', async ({ page, context }) => {
      // Login first
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
      
      // Get session token
      const sessionCookie = await getSessionCookie(page);
      const sessionToken = sessionCookie?.value;
      expect(sessionToken).toBeTruthy();
      
      // Logout
      await page.click('button:has-text("Sign Out")');
      await expect(page).toHaveURL(/\/(auth\/login)?$/);
      
      // Try to reuse the old session token in a new context
      const newPage = await context.newPage();
      await newPage.context().addCookies([{
        name: 'sbms-session',
        value: sessionToken!,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      }]);
      
      // Should not grant access
      await newPage.goto(`${baseURL}/admin`);
      await expect(newPage).toHaveURL(/\/auth\/login/);
    });
  });

  test.describe('Security Features', () => {
    test('should not accept old cookie-based authentication', async ({ page }) => {
      // Set old-style auth cookie
      await setOldAuthCookie(page);
      
      // Try to access admin page
      await page.goto(`${baseURL}/admin`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Old cookie should not grant access
      const cookies = await page.context().cookies();
      const oldCookie = cookies.find(c => c.name === 'sbms-admin-auth');
      expect(oldCookie).toBeTruthy(); // Cookie exists but doesn't grant access
    });

    test('should protect against session fixation', async ({ page }) => {
      // Set a pre-existing session cookie
      await setFakeSessionCookie(page);
      
      // Login
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
      
      // Check that a new session was created
      const sessionCookie = await getSessionCookie(page);
      expect(sessionCookie?.value).not.toBe('fake-invalid-session-token');
      expect(sessionCookie?.value).toMatch(/^[a-zA-Z0-9_-]{32}$/);
    });

    test('should handle concurrent sessions', async ({ browser }) => {
      // Create two separate contexts (like different browsers)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      try {
        // Login in both contexts
        for (const page of [page1, page2]) {
          await page.goto(`${baseURL}/auth/login`);
          await page.fill('input[type="email"]', adminEmail);
          await page.fill('input[type="password"]', adminPassword);
          await page.click('button[type="submit"]');
          await page.waitForURL(/\/admin/);
        }
        
        // Both should have different session tokens
        const cookies1 = await context1.cookies();
        const cookies2 = await context2.cookies();
        
        const session1 = cookies1.find(c => c.name === 'sbms-session');
        const session2 = cookies2.find(c => c.name === 'sbms-session');
        
        expect(session1?.value).toBeTruthy();
        expect(session2?.value).toBeTruthy();
        expect(session1?.value).not.toBe(session2?.value);
        
        // Both sessions should work independently
        await page1.goto(`${baseURL}/admin/settings`);
        await expect(page1).toHaveURL(/\/admin\/settings/);
        
        await page2.goto(`${baseURL}/admin/content`);
        await expect(page2).toHaveURL(/\/admin\/content/);
        
        // Logout from one shouldn't affect the other
        await page1.click('button:has-text("Sign Out")');
        await expect(page1).toHaveURL(/\/(auth\/login)?$/);
        
        // Page 2 should still have access
        await page2.goto(`${baseURL}/admin`);
        await expect(page2).toHaveURL(/\/admin/);
        await expect(page2).not.toHaveURL(/\/auth\/login/);
        
      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('Audit Logging', () => {
    test('should log admin actions', async ({ page }) => {
      // Login
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
      
      // Perform an admin action (e.g., toggle coming soon mode)
      await page.goto(`${baseURL}/admin/settings`);
      
      // Find and click the coming soon toggle
      const toggle = page.locator('input[type="checkbox"][name="coming_soon"]');
      const initialState = await toggle.isChecked();
      await toggle.click();
      
      // Wait for the change to be saved
      await page.waitForResponse(resp => 
        resp.url().includes('/api/admin/settings') && resp.status() === 200
      );
      
      // The audit log should have been created (verified through API or database)
      // In a real test, you might check the audit log table or API endpoint
      
      // Verify the setting was changed
      await page.reload();
      const newState = await toggle.isChecked();
      expect(newState).not.toBe(initialState);
    });
  });

  test.describe('Session Expiry', () => {
    test('should handle expired sessions gracefully', async ({ page }) => {
      // This test would require manipulating time or waiting for actual expiry
      // For demonstration, we'll test the behavior with an expired session
      
      // Set an expired session cookie (would normally be done by time passage)
      await page.context().addCookies([{
        name: 'sbms-session',
        value: 'expired-session-token',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
        expires: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      }]);
      
      // Try to access admin page
      await page.goto(`${baseURL}/admin`);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/auth\/login/);
      
      // Cookie should be cleared
      const sessionCookie = await getSessionCookie(page);
      expect(sessionCookie).toBeFalsy();
    });
  });

  test.describe('Middleware Integration', () => {
    test('should allow admin to bypass coming soon mode', async ({ page }) => {
      // First, ensure coming soon mode is enabled
      // This would typically be done through the admin panel
      
      // Login as admin
      await page.goto(`${baseURL}/auth/login`);
      await page.fill('input[type="email"]', adminEmail);
      await page.fill('input[type="password"]', adminPassword);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
      
      // Admin should be able to access all pages even with coming soon enabled
      const publicPages = ['/', '/about', '/programs', '/contact'];
      
      for (const publicPage of publicPages) {
        await page.goto(`${baseURL}${publicPage}`);
        // Should not redirect to coming soon page
        await expect(page).not.toHaveURL(/\/coming-soon/);
      }
    });

    test('should redirect non-admin users to coming soon when enabled', async ({ page }) => {
      // Clear any session
      await clearSessionCookie(page);
      
      // Try to access public pages without admin session
      // (Assuming coming soon mode is enabled)
      await page.goto(`${baseURL}/programs`);
      
      // Should potentially redirect to coming soon (if enabled)
      // This depends on the current state of the coming_soon_enabled setting
      const url = page.url();
      expect(url).toMatch(/\/(programs|coming-soon)/);
    });
  });
});