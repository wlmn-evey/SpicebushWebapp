import { test, expect } from '@playwright/test';

test.describe('Hours Admin Interface Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin panel
    await page.goto('/admin');
    
    // Login if needed (mock auth for testing)
    if (await page.locator('text="Login"').isVisible()) {
      await page.goto('/admin?test-auth=true');
    }
  });

  test('should display hours in admin list view', async ({ page }) => {
    // Navigate to hours management
    await page.goto('/admin/hours');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check that the hours list is displayed
    await expect(page.locator('h1:has-text("School Hours Management")')).toBeVisible();
    
    // Verify all days are shown
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await expect(page.locator(`text="${day}"`)).toBeVisible();
    }
    
    // Check that open/closed status is displayed correctly
    await expect(page.locator('text="Operating Days"')).toBeVisible();
    await expect(page.locator('.stat-number').filter({ hasText: '5' })).toBeVisible(); // 5 operating days
    await expect(page.locator('.stat-number').filter({ hasText: '2' })).toBeVisible(); // 2 closed days
    
    // Verify hours are displayed
    await expect(page.locator('text="8:30 AM - 5:30 PM"')).toBeVisible(); // Monday-Thursday
    await expect(page.locator('text="8:30 AM - 3:00 PM"')).toBeVisible(); // Friday
  });

  test('should allow editing hours', async ({ page }) => {
    // Navigate to hours management
    await page.goto('/admin/hours');
    
    // Click edit button for Monday
    await page.locator('.day-card:has-text("Monday") .action-btn--edit').click();
    
    // Wait for edit page to load
    await page.waitForURL('**/admin/hours/edit**');
    
    // Check that edit form is displayed
    await expect(page.locator('h1:has-text("Edit Hours")')).toBeVisible();
    
    // Verify form fields are populated
    await expect(page.locator('input[name="day"]')).toHaveValue('Monday');
    await expect(page.locator('input[name="open_time"]')).toHaveValue('8:30 AM');
    await expect(page.locator('input[name="close_time"]')).toHaveValue('5:30 PM');
    
    // Update the closing time
    await page.locator('input[name="close_time"]').fill('6:00 PM');
    
    // Save changes
    await page.locator('button:has-text("Save Changes")').click();
    
    // Should redirect back to list with success message
    await page.waitForURL('**/admin/hours**');
    await expect(page.locator('.status-message--success')).toBeVisible();
    
    // Verify the change is reflected
    await expect(page.locator('.day-card:has-text("Monday") text="8:30 AM - 6:00 PM"')).toBeVisible();
  });

  test('should handle quick actions for standard week', async ({ page }) => {
    // Navigate to hours management
    await page.goto('/admin/hours');
    
    // Click standard week quick action
    await page.locator('button[data-quick-action="standard-week"]').click();
    
    // Confirm the action in dialog
    await page.on('dialog', dialog => dialog.accept());
    
    // Wait for the page to reload
    await page.waitForLoadState('networkidle');
    
    // Verify success message
    await expect(page.locator('.status-message--success')).toContainText('standard week schedule applied successfully');
    
    // Verify the standard hours are applied
    await expect(page.locator('.day-card:has-text("Monday") text="8:30 AM - 3:00 PM"')).toBeVisible();
    await expect(page.locator('.day-card:has-text("Friday") text="8:30 AM - 3:00 PM"')).toBeVisible();
  });
});

test.describe('Hours Widget Verification', () => {
  test('should display hours widget on homepage', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for the widget to load
    await page.waitForSelector('#sbms-hours-widget', { state: 'visible' });
    
    // Check that the widget title is displayed
    await expect(page.locator('#sbms-hours-widget h3:has-text("School Hours")')).toBeVisible();
    
    // Verify current time is displayed
    await expect(page.locator('#current-time')).toBeVisible();
    
    // Check that hours list is rendered
    await expect(page.locator('#hours-list')).toBeVisible();
    
    // Verify days are displayed in correct order (starting with today)
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const firstDay = await page.locator('#hours-list li').first().textContent();
    expect(firstDay).toContain(today);
    
    // Check that open days show time ranges
    const mondayCard = page.locator('#hours-list li:has-text("Monday")');
    if (await mondayCard.isVisible()) {
      await expect(mondayCard).toContainText('8:30 AM–5:30 PM');
    }
    
    // Check that closed days show as closed
    const sundayCard = page.locator('#hours-list li:has-text("Sunday")');
    if (await sundayCard.isVisible()) {
      await expect(sundayCard).toContainText('Closed');
    }
  });

  test('should show visual time bars correctly', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for the widget to load
    await page.waitForSelector('#sbms-hours-widget', { state: 'visible' });
    
    // Check that the legend is displayed
    await expect(page.locator('#sbms-legend')).toBeVisible();
    await expect(page.locator('text="Before Care"')).toBeVisible();
    await expect(page.locator('text="Regular Hours"')).toBeVisible();
    await expect(page.locator('text="After Care"')).toBeVisible();
    
    // Verify visual bars are rendered for open days
    const openDayCard = page.locator('#hours-list li').filter({ hasNot: page.locator('text="Closed"') }).first();
    await expect(openDayCard.locator('.bg-forest-canopy')).toBeVisible(); // Regular hours bar
  });

  test('should update current time indicator', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');
    
    // Wait for the widget to load
    await page.waitForSelector('#sbms-hours-widget', { state: 'visible' });
    
    // Get current day and time
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const currentHour = now.getHours();
    
    // Only test during school hours on weekdays
    if (currentHour >= 8 && currentHour <= 17 && !['Saturday', 'Sunday'].includes(currentDay)) {
      // Look for the current time indicator (red line)
      const todayCard = page.locator(`#hours-list li:has-text("${currentDay}")`);
      await expect(todayCard.locator('.bg-red-500')).toBeVisible();
      
      // Check for the time tooltip
      await expect(todayCard.locator('text="Now:"')).toBeVisible();
    }
  });
});