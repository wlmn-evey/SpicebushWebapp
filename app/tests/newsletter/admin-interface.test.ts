/**
 * Newsletter Admin Interface Tests
 * Tests for the /admin/newsletter page functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Newsletter Admin Interface', () => {
  // Mock authentication for admin tests
  test.beforeEach(async ({ page, context }) => {
    // Set admin authentication cookie
    await context.addCookies([{
      name: 'sb-auth-token',
      value: 'mock-admin-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax'
    }]);

    // Mock API responses
    await page.route('/api/admin/newsletter?action=stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_subscribers: 150,
          active_subscribers: 120,
          unsubscribed_count: 30,
          recent_signups: 15,
          types_breakdown: {
            general: 80,
            parents: 40,
            staff: 0
          }
        })
      });
    });

    await page.route('/api/admin/newsletter', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status') || 'active';
      
      const mockSubscribers = [
        {
          email: 'john.doe@example.com',
          first_name: 'John',
          last_name: 'Doe',
          subscription_type: 'parents',
          subscription_status: 'active',
          created_at: '2025-01-15T10:00:00Z',
          signup_source: 'website_footer'
        },
        {
          email: 'jane.smith@example.com',
          first_name: 'Jane',
          last_name: 'Smith',
          subscription_type: 'general',
          subscription_status: 'active',
          created_at: '2025-01-20T14:30:00Z',
          signup_source: 'website_card'
        },
        {
          email: 'unsubscribed@example.com',
          first_name: 'Former',
          last_name: 'Subscriber',
          subscription_type: 'general',
          subscription_status: 'unsubscribed',
          created_at: '2024-12-01T10:00:00Z',
          unsubscribed_at: '2025-01-10T10:00:00Z',
          signup_source: 'website_inline'
        }
      ];
      
      const filtered = status === 'all' ? mockSubscribers : 
                      mockSubscribers.filter(s => s.subscription_status === status);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(filtered)
      });
    });
  });

  test('should require authentication', async ({ page, context }) => {
    // Clear auth cookies
    await context.clearCookies();
    
    // Try to access admin page
    await page.goto('/admin/newsletter');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login\?redirect=.*newsletter/);
  });

  test('should display newsletter statistics', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Newsletter Management');
    
    // Check statistics cards
    await expect(page.locator('[data-stat="total_subscribers"]')).toContainText('150');
    await expect(page.locator('[data-stat="active_subscribers"]')).toContainText('120');
    await expect(page.locator('[data-stat="recent_signups"]')).toContainText('15');
    await expect(page.locator('[data-stat="unsubscribed_count"]')).toContainText('30');
  });

  test('should display subscriber list', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    // Wait for subscribers to load
    await page.waitForSelector('.subscriber-item');
    
    // Check subscriber entries
    const subscribers = page.locator('.subscriber-item');
    await expect(subscribers).toHaveCount(2); // Only active by default
    
    // Check first subscriber details
    const firstSubscriber = subscribers.first();
    await expect(firstSubscriber).toContainText('john.doe@example.com');
    await expect(firstSubscriber).toContainText('John Doe');
    await expect(firstSubscriber).toContainText('parents');
  });

  test('should filter subscribers by status', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    // Click on status filter
    const statusFilter = page.locator('#status-filter');
    await statusFilter.selectOption('all');
    
    // Wait for updated list
    await page.waitForTimeout(500);
    
    // Should show all subscribers including unsubscribed
    const subscribers = page.locator('.subscriber-item');
    await expect(subscribers).toHaveCount(3);
    
    // Check unsubscribed subscriber is shown
    await expect(page.locator('text=unsubscribed@example.com')).toBeVisible();
  });

  test('should filter subscribers by type', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    // Select type filter
    const typeFilter = page.locator('#type-filter');
    await typeFilter.selectOption('parents');
    
    // Wait for filtered results
    await page.waitForTimeout(500);
    
    // Should only show parent subscribers
    const subscribers = page.locator('.subscriber-item');
    await expect(subscribers).toHaveCount(1);
    await expect(subscribers.first()).toContainText('john.doe@example.com');
  });

  test('should search subscribers', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    const searchInput = page.locator('#subscriber-search');
    await searchInput.fill('jane');
    
    // Real-time search simulation
    await page.waitForTimeout(300);
    
    // Should filter results
    const visibleSubscribers = page.locator('.subscriber-item:visible');
    await expect(visibleSubscribers).toHaveCount(1);
    await expect(visibleSubscribers.first()).toContainText('jane.smith@example.com');
    
    // Clear search
    await searchInput.clear();
    await page.waitForTimeout(300);
    await expect(page.locator('.subscriber-item:visible')).toHaveCount(2);
  });

  test('should export subscribers to CSV', async ({ page }) => {
    // Set up download handler
    const downloadPromise = page.waitForEvent('download');
    
    await page.goto('/admin/newsletter');
    
    // Click export button
    const exportButton = page.locator('button:has-text("Export to CSV")');
    await exportButton.click();
    
    // Wait for download
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/newsletter-subscribers-active-\d{4}-\d{2}-\d{2}\.csv/);
    
    // Verify content
    const content = await download.path();
    expect(content).toBeTruthy();
  });

  test('should unsubscribe a user', async ({ page }) => {
    let unsubscribeEmail: string | null = null;
    
    // Mock unsubscribe endpoint
    await page.route('/api/admin/newsletter', async (route) => {
      if (route.request().method() === 'POST') {
        const data = await route.request().postDataJSON();
        if (data.action === 'unsubscribe') {
          unsubscribeEmail = data.email;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true, message: 'Subscriber removed successfully' })
          });
        }
      } else {
        await route.continue();
      }
    });
    
    await page.goto('/admin/newsletter');
    
    // Find unsubscribe button for first subscriber
    const firstSubscriber = page.locator('.subscriber-item').first();
    const unsubButton = firstSubscriber.locator('button:has-text("Unsubscribe")');
    
    // Confirm dialog will appear
    page.on('dialog', dialog => dialog.accept());
    
    await unsubButton.click();
    
    // Verify correct email was unsubscribed
    expect(unsubscribeEmail).toBe('john.doe@example.com');
    
    // Check success message
    await expect(page.locator('.notification.success')).toContainText('Subscriber removed successfully');
  });

  test('should display type breakdown chart', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    // Check chart container
    const chartContainer = page.locator('#type-breakdown-chart');
    await expect(chartContainer).toBeVisible();
    
    // Chart should be rendered (check canvas element)
    const canvas = chartContainer.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should handle empty subscriber list', async ({ page }) => {
    // Override route to return empty list
    await page.route('/api/admin/newsletter', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    await page.goto('/admin/newsletter');
    
    // Should show empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.locator('.empty-state')).toContainText('No subscribers found');
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Override route to return error
    await page.route('/api/admin/newsletter?action=stats', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database error' })
      });
    });
    
    await page.goto('/admin/newsletter');
    
    // Should show error message
    await expect(page.locator('.notification.error')).toBeVisible();
    await expect(page.locator('.notification.error')).toContainText('Failed to load statistics');
    
    // Stats should show default values
    await expect(page.locator('[data-stat="total_subscribers"]')).toContainText('0');
  });

  test('should navigate back to admin dashboard', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    // Click back button
    const backButton = page.locator('a:has-text("Back to Admin Dashboard")');
    await backButton.click();
    
    // Should navigate to admin dashboard
    await expect(page).toHaveURL('/admin');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/admin/newsletter');
    
    // Stats cards should stack vertically
    const statsGrid = page.locator('.grid').first();
    await expect(statsGrid).toHaveCSS('grid-template-columns', '1fr');
    
    // Table should be scrollable
    const tableContainer = page.locator('.overflow-x-auto');
    await expect(tableContainer).toBeVisible();
  });

  test('should show loading states', async ({ page }) => {
    // Delay API response to see loading state
    await page.route('/api/admin/newsletter', async (route) => {
      await page.waitForTimeout(1000);
      await route.continue();
    });
    
    await page.goto('/admin/newsletter');
    
    // Should show loading skeleton
    await expect(page.locator('.loading-skeleton')).toBeVisible();
    
    // Wait for content to load
    await page.waitForSelector('.subscriber-item');
    
    // Loading skeleton should be hidden
    await expect(page.locator('.loading-skeleton')).not.toBeVisible();
  });

  test('should validate CSV import format', async ({ page }) => {
    await page.goto('/admin/newsletter');
    
    // Click import button
    const importButton = page.locator('button:has-text("Import CSV")');
    await importButton.click();
    
    // Modal should open
    const modal = page.locator('.import-modal');
    await expect(modal).toBeVisible();
    
    // Upload invalid CSV
    const fileInput = modal.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('invalid,csv,format\nno-email,field')
    });
    
    // Should show validation error
    await expect(modal.locator('.error')).toContainText('Invalid CSV format');
  });
});