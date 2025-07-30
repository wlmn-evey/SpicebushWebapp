import { test, expect } from '@playwright/test';

test.describe('Contact Form Quick Test', () => {
  test('should load contact page and display form', async ({ page }) => {
    // Navigate to contact page
    await page.goto('/contact');
    
    // Wait for form to be visible
    const form = page.locator('form#contact-form');
    await expect(form).toBeVisible({ timeout: 10000 });
    
    // Check key form elements
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#subject')).toBeVisible();
    await expect(page.locator('#message')).toBeVisible();
    await expect(page.locator('#submit-btn')).toBeVisible();
    
    // Check form has Netlify attributes
    await expect(form).toHaveAttribute('data-netlify', 'true');
    await expect(form).toHaveAttribute('data-netlify-honeypot', 'bot-field');
    await expect(form).toHaveAttribute('action', '/contact-success');
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/contact');
    
    // Try to submit empty form
    await page.click('#submit-btn');
    
    // Should stay on contact page (not navigate away)
    await expect(page).toHaveURL(/\/contact$/);
    
    // Fill only some fields and verify validation
    await page.fill('#name', 'Test User');
    await page.click('#submit-btn');
    
    // Should still be on contact page
    await expect(page).toHaveURL(/\/contact$/);
  });

  test('should format phone number', async ({ page }) => {
    await page.goto('/contact');
    
    const phoneField = page.locator('#phone');
    await phoneField.fill('5551234567');
    
    // Check formatted value
    await expect(phoneField).toHaveValue('(555) 123-4567');
  });

  test('should load success page directly', async ({ page }) => {
    await page.goto('/contact-success');
    
    // Check success page elements
    await expect(page.locator('h1')).toContainText('Thank You!');
    await expect(page.locator('text=Your message has been sent successfully')).toBeVisible();
    
    // Check navigation buttons
    await expect(page.locator('a:has-text("Back to Home")')).toBeVisible();
    await expect(page.locator('a:has-text("Call Us")')).toBeVisible();
  });
});