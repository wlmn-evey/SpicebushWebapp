/**
 * Settings Browser Test Suite
 * End-to-end tests using Playwright to verify browser functionality
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:4321';
const SETTINGS_PAGE = `${BASE_URL}/admin/settings-new`;
const LOGIN_PAGE = `${BASE_URL}/auth/login`;

// Test configuration
test.describe.configure({ mode: 'serial' });

test.describe('Settings Management UI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page first (adjust based on your auth flow)
    await page.goto(LOGIN_PAGE);
    
    // TODO: Add actual login steps here based on your authentication
    // For now, we'll assume you're already logged in or skip auth for testing
    // await page.fill('[name="email"]', 'admin@test.com');
    // await page.fill('[name="password"]', 'testpassword');
    // await page.click('button[type="submit"]');
    
    // Navigate to settings page
    await page.goto(SETTINGS_PAGE);
  });

  test('should load settings page successfully', async ({ page }) => {
    await expect(page).toHaveTitle(/Settings Management/);
    await expect(page.locator('h1')).toContainText('Site Settings');
    
    // Check that the form is present
    await expect(page.locator('#settings-form')).toBeVisible();
  });

  test('should display all settings sections', async ({ page }) => {
    // Check for all four sections
    const sections = [
      'Coming Soon Mode',
      'Academic Settings', 
      'Tuition & Financial Settings',
      'Site Communications'
    ];

    for (const sectionTitle of sections) {
      await expect(page.locator('.settings-section__title', { hasText: sectionTitle })).toBeVisible();
    }
  });

  test('should display all form fields', async ({ page }) => {
    // Coming Soon fields
    await expect(page.locator('[name="coming_soon_enabled"]')).toBeVisible();
    await expect(page.locator('[name="coming_soon_launch_date"]')).toBeVisible();
    await expect(page.locator('[name="coming_soon_message"]')).toBeVisible();
    await expect(page.locator('[name="coming_soon_newsletter"]')).toBeVisible();
    
    // Academic fields
    await expect(page.locator('[name="current_school_year"]')).toBeVisible();
    
    // Financial fields
    await expect(page.locator('[name="sibling_discount_rate"]')).toBeVisible();
    await expect(page.locator('[name="upfront_discount_rate"]')).toBeVisible();
    await expect(page.locator('[name="annual_increase_rate"]')).toBeVisible();
    
    // Communications fields
    await expect(page.locator('[name="site_message"]')).toBeVisible();
  });

  test('should enable save button when form changes', async ({ page }) => {
    // Initially, save button should be disabled
    const saveButton = page.locator('button[type="submit"]');
    await expect(saveButton).toBeDisabled();
    
    // Make a change to the form
    await page.fill('[name="site_message"]', 'Test message from browser test');
    
    // Save button should now be enabled
    await expect(saveButton).toBeEnabled();
  });

  test('should save form successfully', async ({ page }) => {
    // Fill in some test data
    await page.fill('[name="site_message"]', 'Browser test message');
    await page.fill('[name="current_school_year"]', '2025-2026');
    
    // Click save button
    const saveButton = page.locator('button[type="submit"]');
    await saveButton.click();
    
    // Wait for success message
    await expect(page.locator('#status-message')).toBeVisible();
    await expect(page.locator('.status-success')).toBeVisible();
    
    // Save button should be disabled again
    await expect(saveButton).toBeDisabled();
  });

  test('should handle toggle switches correctly', async ({ page }) => {
    const toggles = [
      '[name="coming_soon_enabled"]',
      '[name="coming_soon_newsletter"]'
    ];

    for (const toggleSelector of toggles) {
      const toggle = page.locator(toggleSelector);
      
      // Get initial state
      const initialChecked = await toggle.isChecked();
      
      // Click to toggle
      await toggle.click();
      
      // Verify state changed
      const newChecked = await toggle.isChecked();
      expect(newChecked).toBe(!initialChecked);
      
      // Verify save button is enabled
      await expect(page.locator('button[type="submit"]')).toBeEnabled();
    }
  });

  test('should validate number inputs', async ({ page }) => {
    const numberFields = [
      '[name="sibling_discount_rate"]',
      '[name="upfront_discount_rate"]',
      '[name="annual_increase_rate"]'
    ];

    for (const fieldSelector of numberFields) {
      const field = page.locator(fieldSelector);
      
      // Clear and enter valid decimal
      await field.clear();
      await field.fill('0.15');
      
      // Verify value was accepted
      await expect(field).toHaveValue('0.15');
      
      // Test invalid values
      await field.clear();
      await field.fill('abc');
      
      // Browser should either reject input or show validation error
      // The exact behavior depends on browser and input type
      const value = await field.inputValue();
      expect(value).not.toBe('abc'); // Should not accept non-numeric
    }
  });

  test('should validate date input', async ({ page }) => {
    const dateField = page.locator('[name="coming_soon_launch_date"]');
    
    // Test valid date
    await dateField.fill('2025-06-15');
    await expect(dateField).toHaveValue('2025-06-15');
    
    // Test invalid date format (browser should handle this)
    await dateField.clear();
    await dateField.type('invalid-date');
    
    // Browser date input should reject invalid formats
    const value = await dateField.inputValue();
    expect(value).not.toBe('invalid-date');
  });

  test('should validate school year pattern', async ({ page }) => {
    const schoolYearField = page.locator('[name="current_school_year"]');
    
    // Test valid format
    await schoolYearField.fill('2025-2026');
    await expect(schoolYearField).toHaveValue('2025-2026');
    
    // Test invalid format - should show validation error or prevent submission
    await schoolYearField.clear();
    await schoolYearField.fill('invalid');
    
    // Try to submit form
    await page.locator('button[type="submit"]').click();
    
    // Should show validation error or prevent submission
    // This depends on HTML5 validation and your custom validation
  });

  test('should reset form correctly', async ({ page }) => {
    // Get original values
    const originalSiteMessage = await page.locator('[name="site_message"]').inputValue();
    const originalSchoolYear = await page.locator('[name="current_school_year"]').inputValue();
    
    // Make changes
    await page.fill('[name="site_message"]', 'Changed message');
    await page.fill('[name="current_school_year"]', '2026-2027');
    
    // Verify changes were made
    await expect(page.locator('[name="site_message"]')).toHaveValue('Changed message');
    await expect(page.locator('[name="current_school_year"]')).toHaveValue('2026-2027');
    
    // Click reset button
    await page.locator('#reset-button').click();
    
    // Verify values were reset
    await expect(page.locator('[name="site_message"]')).toHaveValue(originalSiteMessage);
    await expect(page.locator('[name="current_school_year"]')).toHaveValue(originalSchoolYear);
    
    // Save button should be disabled again
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test('should show loading state during save', async ({ page }) => {
    // Make a change
    await page.fill('[name="site_message"]', 'Testing loading state');
    
    // Click save and immediately check for loading state
    const saveButton = page.locator('button[type="submit"]');
    await saveButton.click();
    
    // Should show loading text and disable button
    await expect(page.locator('.btn-loading')).toBeVisible();
    await expect(saveButton).toBeDisabled();
    
    // Wait for completion
    await expect(page.locator('#status-message')).toBeVisible();
    
    // Loading should be hidden, normal text should show
    await expect(page.locator('.btn-loading')).toBeHidden();
    await expect(page.locator('.btn-text')).toBeVisible();
  });

  test('should handle form submission errors gracefully', async ({ page }) => {
    // Mock a network error or server error response
    await page.route('/api/admin/settings', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Make a change and try to save
    await page.fill('[name="site_message"]', 'Test error handling');
    await page.locator('button[type="submit"]').click();
    
    // Should show error message
    await expect(page.locator('#status-message')).toBeVisible();
    await expect(page.locator('.status-error')).toBeVisible();
    
    // Button should not remain in loading state
    await expect(page.locator('.btn-loading')).toBeHidden();
    await expect(page.locator('.btn-text')).toBeVisible();
  });

  test('should preserve form state across page interactions', async ({ page }) => {
    // Fill in some data
    await page.fill('[name="site_message"]', 'Persistent test message');
    await page.check('[name="coming_soon_enabled"]');
    await page.fill('[name="sibling_discount_rate"]', '0.12');
    
    // Scroll around, click other elements
    await page.locator('.settings-section__title').first().click();
    await page.keyboard.press('Tab'); // Navigate with keyboard
    
    // Verify data is still there
    await expect(page.locator('[name="site_message"]')).toHaveValue('Persistent test message');
    await expect(page.locator('[name="coming_soon_enabled"]')).toBeChecked();
    await expect(page.locator('[name="sibling_discount_rate"]')).toHaveValue('0.12');
  });

  test('should handle special characters in text fields', async ({ page }) => {
    const specialText = 'Special chars: áéíóú ñ ¡¿ 中文 🎉';
    
    await page.fill('[name="coming_soon_message"]', specialText);
    
    // Save the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for success
    await expect(page.locator('.status-success')).toBeVisible();
    
    // Reload page and verify special characters were preserved
    await page.reload();
    await expect(page.locator('[name="coming_soon_message"]')).toHaveValue(specialText);
  });

  test('should be responsive on mobile viewports', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify page still works on mobile
    await expect(page.locator('#settings-form')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test form interaction on mobile
    await page.fill('[name="site_message"]', 'Mobile test');
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
  });

  test('should maintain accessibility standards', async ({ page }) => {
    // Check for form labels
    const formFields = await page.locator('input, textarea, select').all();
    
    for (const field of formFields) {
      const fieldName = await field.getAttribute('name');
      if (fieldName) {
        // Should have associated label
        const label = page.locator(`label[for="${fieldName}"], label`).filter({ has: page.locator(`[name="${fieldName}"]`) });
        await expect(label).toBeVisible();
      }
    }
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus').first();
    await expect(focusedElement).toBeVisible();
  });
});