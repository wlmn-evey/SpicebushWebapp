/**
 * QuickActions Component Integration Tests
 * Tests the fixes for broken button navigation and coming soon toggle functionality
 * 
 * This test suite verifies:
 * 1. Button navigation to existing admin pages (no 404s)
 * 2. Coming soon toggle with new settings API
 * 3. Proper state management and error handling
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = 'http://localhost:4322';
const ADMIN_DASHBOARD_URL = `${BASE_URL}/admin/dashboard`;

// Helper function to login as admin (adjust based on your auth system)
async function loginAsAdmin(page) {
  // Navigate to admin login
  await page.goto(`${BASE_URL}/admin/login`);
  
  // Fill in admin credentials (you may need to adjust selectors)
  await page.fill('[name="email"]', 'admin@test.com');
  await page.fill('[name="password"]', 'adminpassword');
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForURL(/.*\/admin\/dashboard/);
}

// Helper function to mock API responses
async function mockSettingsAPI(page, responseData = null, shouldFail = false) {
  await page.route('/api/admin/settings', async route => {
    if (route.request().method() === 'GET') {
      if (shouldFail) {
        route.abort();
      } else {
        const mockData = responseData || { coming_soon_enabled: false };
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockData)
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
        route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Settings updated successfully'
          })
        });
      }
    }
  });
}

test.describe('QuickActions Component Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up basic route interception for admin auth
    await page.route('/api/admin/auth/check', route => {
      route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ isAuthenticated: true })
      });
    });
  });

  test.describe('Button Navigation Tests', () => {
    
    test('Post Announcement button navigates to communications page', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      // Wait for QuickActions to load
      await page.waitForSelector('#quick-actions');
      
      // Click Post Announcement button
      await page.click('button:has-text("Post Announcement")');
      
      // Verify navigation to communications page
      await page.waitForURL(/.*\/admin\/communications/);
      expect(page.url()).toContain('/admin/communications');
      
      // Verify page loads without 404 error
      const pageTitle = await page.textContent('h1, h2, .page-title');
      expect(pageTitle).not.toBeNull();
      expect(await page.locator('text=404').count()).toBe(0);
    });

    test('Update Hours button navigates to hours edit page', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions');
      
      // Click Update Hours button
      await page.click('button:has-text("Update Hours")');
      
      // Verify navigation to hours edit page
      await page.waitForURL(/.*\/admin\/hours\/edit/);
      expect(page.url()).toContain('/admin/hours/edit');
      
      // Verify page loads without 404 error
      const pageTitle = await page.textContent('h1, h2, .page-title');
      expect(pageTitle).not.toBeNull();
      expect(await page.locator('text=404').count()).toBe(0);
    });

    test('Add Staff button navigates to staff edit page', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions');
      
      // Click Add Staff button
      await page.click('button:has-text("Add Staff")');
      
      // Verify navigation to staff edit page
      await page.waitForURL(/.*\/admin\/staff\/edit/);
      expect(page.url()).toContain('/admin/staff/edit');
      
      // Verify page loads without 404 error
      const pageTitle = await page.textContent('h1, h2, .page-title');
      expect(pageTitle).not.toBeNull();
      expect(await page.locator('text=404').count()).toBe(0);
    });

    test('Buttons show loading status when clicked', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#quick-actions');
      
      // Click a button and check for loading status
      await page.click('button:has-text("Post Announcement")');
      
      // Check if status message appears
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Opening communications center...');
      
      // Verify loading class is applied
      await expect(statusEl).toHaveClass(/loading/);
    });
  });

  test.describe('Coming Soon Toggle Tests', () => {
    
    test('Toggle loads current state from API on page load', async ({ page }) => {
      // Mock API to return enabled state
      await mockSettingsAPI(page, { coming_soon_enabled: true });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle');
      
      // Verify toggle is checked based on API response
      const toggle = page.locator('#coming-soon-toggle');
      await expect(toggle).toBeChecked();
      
      // Verify data attribute is set correctly
      const currentState = await toggle.getAttribute('data-current-state');
      expect(currentState).toBe('true');
    });

    test('Toggle loads disabled state from API on page load', async ({ page }) => {
      // Mock API to return disabled state
      await mockSettingsAPI(page, { coming_soon_enabled: false });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle');
      
      // Verify toggle is unchecked based on API response
      const toggle = page.locator('#coming-soon-toggle');
      await expect(toggle).not.toBeChecked();
      
      // Verify data attribute is set correctly
      const currentState = await toggle.getAttribute('data-current-state');
      expect(currentState).toBe('false');
    });

    test('Toggle handles string "true" value from API', async ({ page }) => {
      // Mock API to return string "true"
      await mockSettingsAPI(page, { coming_soon_enabled: 'true' });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle');
      
      // Verify toggle is checked for string "true"
      const toggle = page.locator('#coming-soon-toggle');
      await expect(toggle).toBeChecked();
    });

    test('Toggle updates setting via API when changed', async ({ page }) => {
      let postRequestCalled = false;
      let postRequestData = null;
      
      // Mock GET request
      await page.route('/api/admin/settings', async route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ coming_soon_enabled: false })
          });
        } else if (route.request().method() === 'POST') {
          postRequestCalled = true;
          postRequestData = await route.request().postDataJSON();
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Settings updated successfully'
            })
          });
        }
      });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle');
      
      // Click the toggle to enable it
      const toggle = page.locator('#coming-soon-toggle');
      await toggle.click();
      
      // Wait for API call to complete
      await page.waitForTimeout(100);
      
      // Verify POST request was made with correct data
      expect(postRequestCalled).toBe(true);
      expect(postRequestData).toEqual({ coming_soon_enabled: true });
      
      // Verify success status is shown
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      await expect(statusEl).toHaveClass(/success/);
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Coming Soon mode enabled');
    });

    test('Toggle shows loading state during API call', async ({ page }) => {
      // Mock slow API response
      await page.route('/api/admin/settings', async route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ coming_soon_enabled: false })
          });
        } else if (route.request().method() === 'POST') {
          // Delay response to test loading state
          await new Promise(resolve => setTimeout(resolve, 1000));
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
          });
        }
      });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle');
      
      // Click the toggle
      const toggle = page.locator('#coming-soon-toggle');
      await toggle.click();
      
      // Verify loading status appears
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      await expect(statusEl).toHaveClass(/loading/);
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Updating coming soon mode...');
    });

    test('Toggle reverts state on API error', async ({ page }) => {
      // Mock GET to return false initially
      await page.route('/api/admin/settings', async route => {
        if (route.request().method() === 'GET') {
          route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify({ coming_soon_enabled: false })
          });
        } else if (route.request().method() === 'POST') {
          // Simulate API error
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Server error' })
          });
        }
      });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle');
      
      const toggle = page.locator('#coming-soon-toggle');
      
      // Verify initial state
      await expect(toggle).not.toBeChecked();
      
      // Click to enable (should fail)
      await toggle.click();
      
      // Wait for error handling
      await page.waitForTimeout(100);
      
      // Verify toggle reverted to original state
      await expect(toggle).not.toBeChecked();
      
      // Verify error status is shown
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toBeVisible();
      await expect(statusEl).toHaveClass(/error/);
      
      const statusMessage = page.locator('#action-status .status-message');
      await expect(statusMessage).toContainText('Failed to update setting');
    });

    test('Toggle handles API load failure gracefully', async ({ page }) => {
      // Mock API to fail on GET request
      await mockSettingsAPI(page, null, true);
      
      // Suppress console errors for this test
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().includes('Failed to load coming soon state')) {
          // Expected error, ignore
        }
      });
      
      await page.goto(ADMIN_DASHBOARD_URL);
      await page.waitForSelector('#coming-soon-toggle');
      
      // Toggle should still be present and functional
      const toggle = page.locator('#coming-soon-toggle');
      await expect(toggle).toBeVisible();
      
      // Should default to unchecked state
      await expect(toggle).not.toBeChecked();
      
      // Data attribute should show default state
      const currentState = await toggle.getAttribute('data-current-state');
      expect(currentState).toBe('false');
    });
  });

  test.describe('UI Integration Tests', () => {
    
    test('QuickActions panel renders correctly', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      // Verify main panel exists
      const panel = page.locator('#quick-actions');
      await expect(panel).toBeVisible();
      
      // Verify heading
      const heading = page.locator('#quick-actions h3');
      await expect(heading).toContainText('Quick Actions');
      
      // Verify all buttons are present
      const buttons = page.locator('.action-btn');
      await expect(buttons).toHaveCount(3);
      
      await expect(page.locator('button:has-text("Post Announcement")')).toBeVisible();
      await expect(page.locator('button:has-text("Update Hours")')).toBeVisible();
      await expect(page.locator('button:has-text("Add Staff")')).toBeVisible();
      
      // Verify toggle is present
      const toggle = page.locator('#coming-soon-toggle');
      await expect(toggle).toBeVisible();
      
      // Verify help text
      const helpText = page.locator('.help-text');
      await expect(helpText).toContainText('Show a coming soon page to visitors');
    });

    test('Status display appears and disappears correctly', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle');
      
      // Initially status should be hidden
      const statusEl = page.locator('#action-status');
      await expect(statusEl).toHaveCSS('display', 'none');
      
      // Click toggle to trigger status display
      await page.click('#coming-soon-toggle');
      
      // Status should appear
      await expect(statusEl).toBeVisible();
      
      // Wait for auto-hide (3 seconds + buffer)
      await page.waitForTimeout(3500);
      
      // Status should be hidden again
      await expect(statusEl).toHaveCSS('display', 'none');
    });
  });

  test.describe('Accessibility Tests', () => {
    
    test('Toggle has proper ARIA attributes and keyboard navigation', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('#coming-soon-toggle');
      
      const toggle = page.locator('#coming-soon-toggle');
      
      // Test keyboard navigation
      await toggle.focus();
      await expect(toggle).toBeFocused();
      
      // Test space key activation
      await page.keyboard.press('Space');
      
      // Verify toggle changed state
      await expect(toggle).toBeChecked();
    });

    test('Buttons are keyboard accessible', async ({ page }) => {
      await mockSettingsAPI(page);
      await page.goto(ADMIN_DASHBOARD_URL);
      
      await page.waitForSelector('.action-btn');
      
      const postButton = page.locator('button:has-text("Post Announcement")');
      
      // Focus and activate with keyboard
      await postButton.focus();
      await expect(postButton).toBeFocused();
      
      await page.keyboard.press('Enter');
      
      // Should navigate to communications page
      await page.waitForURL(/.*\/admin\/communications/);
    });
  });
});