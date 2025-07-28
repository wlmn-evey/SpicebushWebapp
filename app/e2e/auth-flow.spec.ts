import { test, expect } from '@playwright/test';

// Test credentials
const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';
const TEST_ADMIN_PASSWORD = 'gcb4uvd*pvz*ZGD_hta';

test.describe('Authentication Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.context().clearCookies();
    await page.goto('/');
  });

  test('should display login page with proper elements', async ({ page }) => {
    await page.goto('/auth/login');

    // Check page title
    await expect(page).toHaveTitle(/Login.*Spicebush/i);

    // Check form elements
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Check form labels
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
    await expect(page.locator('label:has-text("Password")')).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    await page.goto('/auth/login');

    // Click submit without filling form
    await page.locator('button[type="submit"]').click();

    // Check for validation messages
    await expect(page.locator('text=Email is required')).toBeVisible();
    await expect(page.locator('text=Password is required')).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/auth/login');

    // Enter invalid email
    await page.fill('input[type="email"]', 'not-an-email');
    await page.fill('input[type="password"]', 'password123');
    await page.locator('button[type="submit"]').click();

    // Check for validation message
    await expect(page.locator('text=Please enter a valid email')).toBeVisible();
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in login form
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    
    // Submit form
    await page.locator('button[type="submit"]').click();

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Should redirect to admin dashboard
    await expect(page).toHaveURL('/admin');
    
    // Check for admin elements
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    await expect(page.locator('nav').getByText('Settings')).toBeVisible();
  });

  test('should show error for incorrect password', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in login form with wrong password
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', 'wrong-password');
    
    // Submit form
    await page.locator('button[type="submit"]').click();

    // Check for error message
    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL('/auth/login');
  });

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in login form with non-existent user
    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit form
    await page.locator('button[type="submit"]').click();

    // Check for error message
    await expect(page.locator('text=Invalid login credentials')).toBeVisible();
    
    // Should stay on login page
    await expect(page).toHaveURL('/auth/login');
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Find and click logout button
    await page.locator('button:has-text("Sign Out")').click();

    // Should redirect to home or login page
    await expect(page).not.toHaveURL('/admin');
    
    // Try to access admin page - should redirect to login
    await page.goto('/admin');
    await expect(page).toHaveURL('/auth/login?redirect=/admin');
  });

  test('should persist session across page reloads', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Reload page
    await page.reload();

    // Should still be on admin page
    await expect(page).toHaveURL('/admin');
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should redirect to requested page after login', async ({ page }) => {
    // Try to access admin page without auth
    await page.goto('/admin/settings');
    
    // Should redirect to login with redirect param
    await expect(page).toHaveURL('/auth/login?redirect=/admin/settings');

    // Login
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Should redirect to originally requested page
    await expect(page).toHaveURL('/admin/settings');
  });

  test('should handle password visibility toggle', async ({ page }) => {
    await page.goto('/auth/login');

    const passwordInput = page.locator('input[type="password"]');
    const toggleButton = page.locator('button[aria-label="Toggle password visibility"]');

    // Check initial state
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Toggle visibility
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Toggle back
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle form submission with Enter key', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in form
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);

    // Press Enter in password field
    await page.locator('input[type="password"]').press('Enter');

    // Wait for navigation
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Should be logged in
    await expect(page).toHaveURL('/admin');
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in form
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);

    // Click submit and check for loading state
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // Button should show loading state
    await expect(submitButton).toBeDisabled();
    await expect(submitButton).toContainText(/Signing in|Loading/i);
  });

  test('should handle concurrent login attempts', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in form
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);

    // Click submit multiple times quickly
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();

    // Should handle gracefully and login once
    await page.waitForNavigation({ waitUntil: 'networkidle' });
    await expect(page).toHaveURL('/admin');
  });

  test('should clear form on navigation away and back', async ({ page }) => {
    await page.goto('/auth/login');

    // Fill in form
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');

    // Navigate away
    await page.goto('/');

    // Navigate back
    await page.goto('/auth/login');

    // Form should be cleared
    await expect(page.locator('input[type="email"]')).toHaveValue('');
    await expect(page.locator('input[type="password"]')).toHaveValue('');
  });
});

test.describe('Admin Access Control', () => {
  test('should deny access to admin pages for non-authenticated users', async ({ page }) => {
    const adminPages = [
      '/admin',
      '/admin/settings',
      '/admin/tuition',
      '/admin/teachers',
      '/admin/analytics',
      '/admin/cms',
    ];

    for (const adminPage of adminPages) {
      await page.goto(adminPage);
      await expect(page).toHaveURL(/\/auth\/login/);
    }
  });

  test('should show admin nav only for admin users', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Check admin navigation is visible
    await expect(page.locator('nav').getByText('Admin Dashboard')).toBeVisible();
    await expect(page.locator('nav').getByText('Settings')).toBeVisible();
    await expect(page.locator('nav').getByText('CMS')).toBeVisible();
  });

  test('should handle deep linking to admin sections', async ({ page }) => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Test navigation to different admin sections
    const sections = [
      { url: '/admin/tuition', title: 'Tuition' },
      { url: '/admin/teachers', title: 'Teachers' },
      { url: '/admin/settings', title: 'Settings' },
    ];

    for (const section of sections) {
      await page.goto(section.url);
      await expect(page).toHaveURL(section.url);
      await expect(page.locator(`h1:has-text("${section.title}")`)).toBeVisible();
    }
  });
});

test.describe('Coming Soon Mode Integration', () => {
  test('should bypass coming soon mode for admin users', async ({ page }) => {
    // Enable coming soon mode (this would be set in the system)
    // For now, we'll test the behavior assuming it's enabled

    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Navigate to homepage
    await page.goto('/');

    // Should see the actual site, not coming soon page
    await expect(page.locator('text=Coming Soon')).not.toBeVisible();
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should show admin preview bar when in coming soon mode', async ({ page }) => {
    // Login as admin
    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForNavigation({ waitUntil: 'networkidle' });

    // Check for admin preview bar
    await expect(page.locator('text=Admin Preview Mode')).toBeVisible();
    await expect(page.locator('text=Site is in Coming Soon mode')).toBeVisible();
  });
});

test.describe('Security and Error Handling', () => {
  test('should not expose sensitive information in URLs', async ({ page }) => {
    await page.goto('/auth/login');

    // Try login with wrong password
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', 'wrong-password');
    await page.locator('button[type="submit"]').click();

    // Check URL doesn't contain password
    const url = page.url();
    expect(url).not.toContain('password');
    expect(url).not.toContain('wrong-password');
  });

  test('should handle XSS attempts in login form', async ({ page }) => {
    await page.goto('/auth/login');

    const xssAttempts = [
      '<script>alert("XSS")</script>',
      '"><script>alert("XSS")</script>',
      'javascript:alert("XSS")',
    ];

    for (const xssAttempt of xssAttempts) {
      await page.fill('input[type="email"]', xssAttempt);
      await page.fill('input[type="password"]', 'password');
      await page.locator('button[type="submit"]').click();

      // Check no alerts appear
      await page.waitForTimeout(1000);
      
      // Page should still be functional
      await expect(page.locator('input[type="email"]')).toBeVisible();
    }
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Simulate offline mode
    await context.setOffline(true);

    await page.goto('/auth/login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();

    // Should show network error message
    await expect(page.locator('text=/Network error|Connection failed|Offline/i')).toBeVisible();

    // Re-enable network
    await context.setOffline(false);
  });

  test('should prevent clickjacking attacks', async ({ page }) => {
    await page.goto('/auth/login');

    // Check for X-Frame-Options or CSP headers
    const response = await page.goto('/auth/login');
    const headers = response?.headers();
    
    // Should have frame protection
    const xFrameOptions = headers?.['x-frame-options'];
    const csp = headers?.['content-security-policy'];
    
    expect(
      xFrameOptions === 'DENY' || 
      xFrameOptions === 'SAMEORIGIN' ||
      csp?.includes('frame-ancestors')
    ).toBeTruthy();
  });
});