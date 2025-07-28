import { test, expect, devices } from '@playwright/test';

// Mobile device configurations for testing
const mobileDevices = [
  { name: 'iPhone 12', config: devices['iPhone 12'] },
  { name: 'iPhone SE', config: devices['iPhone SE'] },
  { name: 'Pixel 5', config: devices['Pixel 5'] },
  { name: 'Samsung Galaxy S21', config: devices['Galaxy S21'] },
  { name: 'iPad', config: devices['iPad'] },
];

const TEST_ADMIN_EMAIL = 'evey@eveywinters.com';

// Test magic link authentication on mobile devices
for (const device of mobileDevices) {
  test.describe(`Magic Link Mobile Tests - ${device.name}`, () => {
    test.use(device.config);

    test.beforeEach(async ({ page }) => {
      // Clear auth state
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    });

    test('should display magic login page properly on mobile', async ({ page }) => {
      await page.goto('/auth/magic-login');
      await page.waitForLoadState('networkidle');

      // Check mobile-specific layout
      await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
      
      // Check responsive design elements
      const container = page.locator('.max-w-md');
      await expect(container).toBeVisible();
      
      // Logo should be appropriately sized
      const logo = page.locator('img[alt*="Spicebush"]');
      await expect(logo).toBeVisible();
      
      // Check that text is readable (not too small)
      const subtitle = page.locator('text=no password needed');
      await expect(subtitle).toBeVisible();
    });

    test('should have appropriately sized touch targets', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Email input should be large enough for touch
      const emailInput = page.locator('input[type="email"]');
      const inputBox = await emailInput.boundingBox();
      expect(inputBox?.height).toBeGreaterThan(40); // Minimum 44px recommended
      
      // Submit button should be large enough for touch
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(40);
      expect(buttonBox?.width).toBeGreaterThan(100);
      
      // Alternative link should be tappable
      const altLink = page.locator('a[href="/auth/login"]');
      const linkBox = await altLink.boundingBox();
      expect(linkBox?.height).toBeGreaterThan(30);
    });

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Tap email input
      await page.tap('input[type="email"]');
      
      // On mobile, this should bring up email keyboard
      // Check that input is focused
      await expect(page.locator('input[type="email"]')).toBeFocused();
      
      // Type email
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      
      // Tap submit button
      await page.tap('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('#success-message')).toBeVisible({ timeout: 10000 });
    });

    test('should handle mobile viewport orientation changes', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Test in portrait mode (default)
      await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
      
      // Simulate landscape mode if on phone
      if (device.name.includes('iPhone') || device.name.includes('Pixel')) {
        // Note: Playwright doesn't have direct orientation change,
        // but we can simulate by changing viewport
        const viewport = page.viewportSize();
        if (viewport) {
          await page.setViewportSize({
            width: Math.max(viewport.width, viewport.height),
            height: Math.min(viewport.width, viewport.height),
          });
        }
        
        // Page should still be usable in landscape
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
      }
    });

    test('should handle mobile email app switching', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Submit magic link request
      await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
      await page.tap('button[type="submit"]');
      
      // Should show success message with mobile-friendly instructions
      await expect(page.locator('#success-message')).toBeVisible();
      await expect(page.locator('text=Check Your Email')).toBeVisible();
      
      // Should show email address for confirmation
      await expect(page.locator('#sent-email')).toContainText(TEST_ADMIN_EMAIL);
      
      // Resend button should be easily tappable
      const resendButton = page.locator('#resend-button');
      await expect(resendButton).toBeVisible();
      
      const resendBox = await resendButton.boundingBox();
      expect(resendBox?.height).toBeGreaterThan(30);
    });

    test('should display callback page properly on mobile', async ({ page }) => {
      // Simulate magic link click on mobile
      await page.goto('/auth/callback?type=magiclink&token=test-token');
      
      // Should show mobile-friendly processing state
      await expect(page.locator('text=Signing you in')).toBeVisible();
      
      // Loading animation should be visible and appropriately sized
      const loadingIcon = page.locator('.animate-spin');
      await expect(loadingIcon).toBeVisible();
      
      const iconBox = await loadingIcon.boundingBox();
      expect(iconBox?.width).toBeGreaterThan(30);
      expect(iconBox?.height).toBeGreaterThan(30);
    });

    test('should handle mobile error states gracefully', async ({ page }) => {
      // Simulate expired magic link
      await page.goto('/auth/callback?type=magiclink&token=expired-token');
      
      // Should show mobile-friendly error message
      await expect(page.locator('#error')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=Something went wrong')).toBeVisible();
      
      // Error message should be readable on mobile
      const errorMsg = page.locator('#error-message');
      await expect(errorMsg).toBeVisible();
      
      // Action button should be easily tappable
      const actionButton = page.locator('a:has-text("Request new link")');
      await expect(actionButton).toBeVisible();
      
      const buttonBox = await actionButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(40);
      
      // Tap the button
      await actionButton.tap();
      await expect(page).toHaveURL('**/auth/magic-login');
    });

    test('should work with mobile browser features', async ({ page }) => {
      await page.goto('/auth/magic-login');
      
      // Test autofill/autocomplete functionality
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveAttribute('type', 'email');
      
      // Should trigger email keyboard on mobile
      await emailInput.tap();
      await emailInput.fill(TEST_ADMIN_EMAIL);
      
      // Test form submission
      await page.tap('button[type="submit"]');
      
      // Should handle mobile form submission properly
      await expect(page.locator('#success-message')).toBeVisible({ timeout: 10000 });
    });

    test('should maintain session across mobile browser minimization', async ({ page }) => {
      // Complete authentication flow
      await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
      await page.waitForURL('**/admin**', { timeout: 10000 });
      
      // Simulate app backgrounding by navigating away and back
      await page.goto('about:blank');
      await page.waitForTimeout(1000);
      
      // Navigate back to admin
      await page.goto('/admin');
      
      // Should still be authenticated
      await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    });
  });
}

test.describe('Mobile-Specific User Experience', () => {
  test.use(devices['iPhone 12']);

  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test('should handle mobile email link opening scenarios', async ({ page }) => {
    // Scenario 1: User opens magic link in same browser
    await page.goto('/auth/magic-login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.tap('button[type="submit"]');
    
    // User clicks link in email (simulated)
    await page.goto('/auth/update-password?type=magiclink&token=test-token');
    
    // Should redirect to callback
    await page.waitForURL('**/auth/callback**');
    
    // Should complete authentication
    await page.waitForURL('**/admin**', { timeout: 10000 });
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should provide mobile-optimized admin interface', async ({ page }) => {
    // Complete authentication
    await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
    await page.waitForURL('**/admin**');
    
    // Check mobile navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Mobile nav items should be appropriately sized
    const navItems = page.locator('nav a');
    const count = await navItems.count();
    
    for (let i = 0; i < count; i++) {
      const item = navItems.nth(i);
      const box = await item.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThan(35);
      }
    }
  });

  test('should handle mobile logout properly', async ({ page }) => {
    // Complete authentication
    await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
    await page.waitForURL('**/admin**');
    
    // Find logout button (might be in mobile menu)
    const logoutButton = page.locator('button:has-text("Sign Out")');
    
    // If not visible, might be in a mobile menu
    if (!(await logoutButton.isVisible())) {
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button:has-text("Menu")');
      if (await mobileMenuButton.isVisible()) {
        await mobileMenuButton.tap();
      }
    }
    
    // Tap logout
    await logoutButton.tap();
    
    // Should logout and redirect
    await page.waitForFunction(() => !window.location.pathname.startsWith('/admin'));
  });

  test('should handle mobile browser history correctly', async ({ page }) => {
    // Start authentication flow
    await page.goto('/auth/magic-login');
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.tap('button[type="submit"]');
    
    // Simulate clicking magic link
    await page.goto('/auth/callback?type=magiclink&token=valid-admin-token');
    await page.waitForURL('**/admin**');
    
    // Navigate to admin section
    await page.goto('/admin/settings');
    
    // Use mobile back button behavior
    await page.goBack();
    await expect(page).toHaveURL('**/admin');
    
    // Should still be authenticated
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
  });

  test('should work with mobile browser autofill', async ({ page }) => {
    await page.goto('/auth/magic-login');
    
    // Simulate browser autofill
    const emailInput = page.locator('input[type="email"]');
    
    // Check input attributes that enable autofill
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('name', 'email');
    
    // Simulate autofill by setting value directly
    await emailInput.fill(TEST_ADMIN_EMAIL);
    
    // Form should accept autofilled value
    await page.tap('button[type="submit"]');
    await expect(page.locator('#success-message')).toBeVisible();
  });
});

test.describe('Mobile Accessibility', () => {
  test.use(devices['iPhone 12']);

  test('should support mobile screen readers', async ({ page }) => {
    await page.goto('/auth/magic-login');
    
    // Check ARIA labels and roles
    const emailInput = page.locator('input[type="email"]');
    const emailLabel = page.locator('label[for="email"]');
    
    await expect(emailLabel).toBeVisible();
    await expect(emailInput).toHaveAttribute('id', 'email');
    
    // Alert should have proper ARIA attributes
    const alert = page.locator('#auth-alert');
    await expect(alert).toHaveAttribute('role', 'alert');
    await expect(alert).toHaveAttribute('aria-live', 'polite');
  });

  test('should support mobile focus management', async ({ page }) => {
    await page.goto('/auth/magic-login');
    
    // Focus should be visible on mobile
    await page.tap('input[type="email"]');
    await expect(page.locator('input[type="email"]')).toBeFocused();
    
    // Focus should move logically through form
    await page.keyboard.press('Tab');
    await expect(page.locator('button[type="submit"]')).toBeFocused();
  });

  test('should have sufficient contrast on mobile devices', async ({ page }) => {
    await page.goto('/auth/magic-login');
    
    // This would need actual color contrast testing
    // For now, we ensure critical elements are visible
    await expect(page.locator('h2:has-text("Welcome Back")')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe('Mobile Performance', () => {
  test.use(devices['iPhone SE']); // Lower-end device for performance testing

  test('should load quickly on mobile devices', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/auth/magic-login');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within reasonable time on mobile
    expect(loadTime).toBeLessThan(5000); // 5 seconds max
    
    // Critical elements should be visible
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should handle mobile network conditions', async ({ page }) => {
    // Simulate slow 3G connection
    await page.route('**/*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Add delay
      await route.continue();
    });
    
    await page.goto('/auth/magic-login');
    
    // Should still be functional despite slow network
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    
    // Form submission should work
    await page.fill('input[type="email"]', TEST_ADMIN_EMAIL);
    await page.tap('button[type="submit"]');
    
    // Should show loading state promptly
    await expect(page.locator('#loading-spinner')).toBeVisible({ timeout: 2000 });
  });
});
