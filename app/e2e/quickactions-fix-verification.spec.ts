/**
 * QuickActions Fix Verification Tests
 * 
 * Tests the fixes implemented for broken QuickActions buttons and coming soon toggle.
 * This suite verifies that the 30-minute simple fix works correctly.
 * 
 * Fixed Issues:
 * 1. Button navigation to existing admin pages (no 404s)
 * 2. Coming soon toggle with new settings API format
 * 3. Proper error handling and state management
 */

import { test, expect } from '@playwright/test';

// Test configuration
const ADMIN_DASHBOARD_URL = '/admin/dashboard';

// Helper to mock admin authentication
async function mockAdminAuth(page: any) {
  await page.route('/api/admin/auth/check', route => {
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ 
        isAuthenticated: true,
        user: { id: 'admin-test', email: 'admin@test.com' }
      })
    });
  });
}

// Helper to mock settings API
async function mockSettingsAPI(page: any, initialState = false, shouldFail = false) {
  await page.route('/api/admin/settings', async route => {
    if (route.request().method() === 'GET') {
      if (shouldFail) {
        route.abort();
      } else {
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ coming_soon_enabled: initialState })
        });
      }
    } else if (route.request().method() === 'POST') {
      if (shouldFail) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        const postData = await route.request().postDataJSON();
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Settings updated successfully',
            data: postData
          })
        });
      }
    }
  });
}

test.describe('QuickActions Fix Verification', () => {
  
  test.beforeEach(async ({ page }) => {
    // Mock admin authentication for all tests
    await mockAdminAuth(page);
  });

  test.describe('Button Navigation Fix', () => {
    
    test('Post Announcement button navigates correctly', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      // Wait for QuickActions component to load
      await page.waitForSelector('#quick-actions', { timeout: 10000 });
      
      // Click Post Announcement button
      const postButton = page.locator('button:has-text("Post Announcement")');
      await expect(postButton).toBeVisible();
      
      // Test click leads to correct navigation
      const navigationPromise = page.waitForURL(/.*\/admin\/communications/);
      await postButton.click();
      await navigationPromise;
      
      // Verify we're on the communications page
      expect(page.url()).toContain('/admin/communications');
    });

    test('Update Hours button navigates correctly', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions', { timeout: 10000 });
      
      const hoursButton = page.locator('button:has-text("Update Hours")');
      await expect(hoursButton).toBeVisible();
      
      const navigationPromise = page.waitForURL(/.*\/admin\/hours\/edit/);
      await hoursButton.click();
      await navigationPromise;
      
      expect(page.url()).toContain('/admin/hours/edit');
    });

    test('Add Staff button navigates correctly', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions', { timeout: 10000 });
      
      const staffButton = page.locator('button:has-text("Add Staff")');
      await expect(staffButton).toBeVisible();
      
      const navigationPromise = page.waitForURL(/.*\/admin\/staff\/edit/);
      await staffButton.click();
      await navigationPromise;
      
      expect(page.url()).toContain('/admin/staff/edit');
    });

    test('Button clicks show loading status', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions', { timeout: 10000 });
      
      const postButton = page.locator('button:has-text("Post Announcement")');
      
      // Click button and immediately check for status
      await postButton.click();
      
      // Check that status message appears
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Opening communications center');
      
      // Should have loading class
      await expect(statusEl).toHaveClass(/loading/);
    });
  });

  test.describe('Coming Soon Toggle Fix', () => {
    
    test('Toggle loads initial state from new API format', async ({ page }) => {
      // Start with coming soon enabled
      await mockSettingsAPI(page, true);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const toggle = page.locator('#coming-soon-toggle');
      
      // Should be checked based on API response
      await expect(toggle).toBeChecked();
      
      // Data attribute should be set correctly
      await expect(toggle).toHaveAttribute('data-current-state', 'true');
    });

    test('Toggle loads disabled state correctly', async ({ page }) => {
      // Start with coming soon disabled
      await mockSettingsAPI(page, false);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const toggle = page.locator('#coming-soon-toggle');
      
      // Should be unchecked
      await expect(toggle).not.toBeChecked();
      await expect(toggle).toHaveAttribute('data-current-state', 'false');
    });

    test('Toggle sends correct API request when changed', async ({ page }) => {
      let apiRequestData: any = null;
      
      // Mock API and capture request data
      await page.route('/api/admin/settings', async route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ coming_soon_enabled: false })
          });
        } else if (route.request().method() === 'POST') {
          apiRequestData = await route.request().postDataJSON();
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      // Toggle should start unchecked
      const toggle = page.locator('#coming-soon-toggle');
      await expect(toggle).not.toBeChecked();
      
      // Click to enable
      await toggle.click();
      
      // Wait for API call
      await page.waitForTimeout(500);
      
      // Verify correct API request was sent
      expect(apiRequestData).toEqual({ coming_soon_enabled: true });
      
      // Toggle should now be checked
      await expect(toggle).toBeChecked();
    });

    test('Toggle shows success message after update', async ({ page }) => {
      await mockSettingsAPI(page, false);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const toggle = page.locator('#coming-soon-toggle');
      await toggle.click();
      
      // Check for success status
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      await expect(statusEl).toHaveClass(/success/);
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Coming Soon mode enabled');
    });

    test('Toggle shows loading state during API call', async ({ page }) => {
      // Mock delayed API response
      await page.route('/api/admin/settings', async route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ coming_soon_enabled: false })
          });
        } else if (route.request().method() === 'POST') {
          // Add delay to test loading state
          await new Promise(resolve => setTimeout(resolve, 1000));
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const toggle = page.locator('#coming-soon-toggle');
      await toggle.click();
      
      // Should show loading status immediately
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      await expect(statusEl).toHaveClass(/loading/);
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Updating coming soon mode');
    });

    test('Toggle reverts on API error and shows error message', async ({ page }) => {
      // Mock API failure
      await mockSettingsAPI(page, false, true);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const toggle = page.locator('#coming-soon-toggle');
      
      // Should start unchecked
      await expect(toggle).not.toBeChecked();
      
      // Click to enable (will fail)
      await toggle.click();
      
      // Wait for error handling
      await page.waitForTimeout(1000);
      
      // Toggle should revert to original state
      await expect(toggle).not.toBeChecked();
      
      // Should show error message
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      await expect(statusEl).toHaveClass(/error/);
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Failed to update setting');
    });

    test('Toggle handles API load failure gracefully', async ({ page }) => {
      // Mock API to fail on initial load
      await page.route('/api/admin/settings', route => {
        if (route.request().method() === 'GET') {
          route.abort();
        }
      });
      
      // Suppress expected console errors
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Failed to load coming soon state')) {
          // Expected error, ignore
        }
      });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const toggle = page.locator('#coming-soon-toggle');
      
      // Should still be present and functional
      await expect(toggle).toBeVisible();
      
      // Should default to unchecked
      await expect(toggle).not.toBeChecked();
      await expect(toggle).toHaveAttribute('data-current-state', 'false');
    });
  });

  test.describe('UI Integration', () => {
    
    test('QuickActions component renders all elements correctly', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions', { timeout: 10000 });
      
      // Check main panel
      const panel = page.locator('#quick-actions');
      await expect(panel).toBeVisible();
      
      // Check heading
      const heading = page.locator('#quick-actions h3');
      await expect(heading).toContainText('Quick Actions');
      
      // Check all buttons are present
      await expect(page.locator('button:has-text("Post Announcement")')).toBeVisible();
      await expect(page.locator('button:has-text("Update Hours")')).toBeVisible();
      await expect(page.locator('button:has-text("Add Staff")')).toBeVisible();
      
      // Check toggle
      await expect(page.locator('#coming-soon-toggle')).toBeVisible();
      
      // Check help text
      const helpText = page.locator('.help-text');
      await expect(helpText).toContainText('Show a coming soon page to visitors');
    });

    test('Status messages auto-hide after success', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const statusEl = page.locator('#action-status');
      
      // Initially hidden
      await expect(statusEl).toHaveCSS('display', 'none');
      
      // Toggle to trigger success message
      await page.click('#coming-soon-toggle');
      
      // Should appear
      await expect(statusEl).toBeVisible();
      
      // Should auto-hide after 3 seconds
      await expect(statusEl).toHaveCSS('display', 'none', { timeout: 4000 });
    });
  });

  test.describe('Accessibility', () => {
    
    test('Toggle is keyboard accessible', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle', { timeout: 10000 });
      
      const toggle = page.locator('#coming-soon-toggle');
      
      // Focus with keyboard
      await toggle.focus();
      await expect(toggle).toBeFocused();
      
      // Activate with space key
      const initialChecked = await toggle.isChecked();
      await page.keyboard.press('Space');
      
      // Wait for change
      await page.waitForTimeout(500);
      
      // Should have toggled
      const newChecked = await toggle.isChecked();
      expect(newChecked).toBe(!initialChecked);
    });

    test('Buttons are keyboard accessible', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions', { timeout: 10000 });
      
      const postButton = page.locator('button:has-text("Post Announcement")');
      
      // Focus and activate with Enter
      await postButton.focus();
      await expect(postButton).toBeFocused();
      
      const navigationPromise = page.waitForURL(/.*\/admin\/communications/);
      await page.keyboard.press('Enter');
      await navigationPromise;
      
      expect(page.url()).toContain('/admin/communications');
    });
  });
});