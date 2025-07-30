import { test, expect } from '@playwright/test';

test.describe('Tour Scheduling Page Verification', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admissions/schedule-tour');
  });

  test('page loads successfully', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/Schedule a Tour - Spicebush Montessori School/);
    
    // Check main heading
    await expect(page.locator('h1')).toContainText('Visit Our School');
    
    // Check form is present
    await expect(page.locator('form#tour-form')).toBeVisible();
  });

  test('form contains all required fields', async ({ page }) => {
    // Check all form fields are present
    await expect(page.locator('input#parent-name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#phone')).toBeVisible();
    await expect(page.locator('select#child-age')).toBeVisible();
    await expect(page.locator('textarea#preferred-times')).toBeVisible();
    await expect(page.locator('textarea#questions')).toBeVisible();
    
    // Check submit button
    await expect(page.locator('button[type="submit"]')).toContainText('Request Tour');
  });

  test('form validation works correctly', async ({ page }) => {
    // Try to submit empty form
    await page.locator('button[type="submit"]').click();
    
    // Check HTML5 validation messages appear
    const parentNameInput = page.locator('input#parent-name');
    const validationMessage = await parentNameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(validationMessage).toBeTruthy();
  });

  test('successful form submission', async ({ page }) => {
    // Fill out the form
    await page.fill('input#parent-name', 'Jane Doe');
    await page.fill('input#email', 'jane@example.com');
    await page.fill('input#phone', '(555) 123-4567');
    await page.selectOption('select#child-age', '4');
    await page.fill('textarea#preferred-times', 'Tuesday mornings work best');
    await page.fill('textarea#questions', 'Do you have any openings for Fall 2025?');
    
    // Submit the form
    await page.locator('button[type="submit"]').click();
    
    // Wait for success message
    await expect(page.locator('#success-message')).toBeVisible();
    await expect(page.locator('#success-message')).toContainText('Thank you for your interest!');
    
    // Check form is reset
    await expect(page.locator('input#parent-name')).toHaveValue('');
  });

  test('error handling for failed submission', async ({ page }) => {
    // Mock API failure
    await page.route('/api/schedule-tour', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server error' })
      });
    });
    
    // Fill and submit form
    await page.fill('input#parent-name', 'Jane Doe');
    await page.fill('input#email', 'jane@example.com');
    await page.fill('input#phone', '(555) 123-4567');
    await page.selectOption('select#child-age', '4');
    
    await page.locator('button[type="submit"]').click();
    
    // Check error message appears
    await expect(page.locator('#error-message')).toBeVisible();
    await expect(page.locator('#error-message')).toContainText('Something went wrong');
  });

  test('mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check form is still accessible
    await expect(page.locator('form#tour-form')).toBeVisible();
    
    // Check buttons are properly sized for mobile
    const submitButton = page.locator('button[type="submit"]');
    const box = await submitButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target size
  });

  test('contact information is displayed', async ({ page }) => {
    // Check alternative contact methods are shown
    await expect(page.locator('text=/Call us directly/')).toBeVisible();
    await expect(page.locator('a[href^="tel:"]')).toBeVisible();
    await expect(page.locator('a[href^="mailto:"]')).toBeVisible();
  });

  test('location information is displayed', async ({ page }) => {
    // Check location section exists
    await expect(page.locator('text=/Find Us/')).toBeVisible();
    await expect(page.locator('text=/Spicebush Montessori School/')).toBeVisible();
    
    // Check address is displayed
    await expect(page.locator('text=/Free street parking available/')).toBeVisible();
  });

  test('tour information is clear', async ({ page }) => {
    // Check tour details are displayed
    await expect(page.locator('text=/45-60 Minutes/')).toBeVisible();
    await expect(page.locator('text=/Classroom Observation/')).toBeVisible();
    await expect(page.locator('text=/Meet Our Teachers/')).toBeVisible();
    await expect(page.locator('text=/Q&A Time/')).toBeVisible();
    
    // Check available times are shown
    await expect(page.locator('text=/Tuesday & Thursday mornings/')).toBeVisible();
    await expect(page.locator('text=/Wednesday afternoons/')).toBeVisible();
  });

  test('form data is properly validated before submission', async ({ page }) => {
    // Test invalid email
    await page.fill('input#parent-name', 'Test User');
    await page.fill('input#email', 'invalid-email');
    await page.fill('input#phone', '(555) 123-4567');
    await page.selectOption('select#child-age', '4');
    
    // The browser should show HTML5 validation error for email
    const emailInput = page.locator('input#email');
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.checkValidity());
    expect(isValid).toBe(false);
  });
});