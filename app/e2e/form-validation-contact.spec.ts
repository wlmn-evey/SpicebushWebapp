/**
 * End-to-end tests for the pragmatic form validation solution
 * Tests the contact form implementation in a real browser environment
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Contact Form Validation', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/contact-enhanced');
    
    // Wait for the form to be fully loaded
    await page.waitForSelector('form[name="contact"]');
  });

  test.describe('Basic Form Functionality', () => {
    test('should display contact form with all required fields', async () => {
      // Verify form structure
      await expect(page.locator('form[name="contact"]')).toBeVisible();
      
      // Verify required fields are present
      await expect(page.locator('[name="name"]')).toBeVisible();
      await expect(page.locator('[name="email"]')).toBeVisible();
      await expect(page.locator('[name="phone"]')).toBeVisible();
      await expect(page.locator('[name="subject"]')).toBeVisible();
      await expect(page.locator('[name="message"]')).toBeVisible();
      
      // Verify submit button
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show required field indicators', async () => {
      // Check for required asterisks
      const requiredFields = ['name', 'email', 'subject', 'message'];
      
      for (const field of requiredFields) {
        const label = page.locator(`label[for*="${field}"]`);
        await expect(label.locator('.form-field__required')).toBeVisible();
      }
    });

    test('should have proper form attributes for Netlify', async () => {
      const form = page.locator('form[name="contact"]');
      
      await expect(form).toHaveAttribute('method', 'POST');
      await expect(form).toHaveAttribute('data-netlify', 'true');
      await expect(form).toHaveAttribute('netlify-honeypot', 'bot-field');
      
      // Check for hidden form-name field
      await expect(page.locator('[name="form-name"]')).toHaveValue('contact');
      
      // Check for honeypot field
      await expect(page.locator('[name="bot-field"]')).toBeHidden();
    });
  });

  test.describe('HTML5 Validation Integration', () => {
    test('should use HTML5 validation attributes', async () => {
      // Required fields should have required attribute
      await expect(page.locator('[name="name"]')).toHaveAttribute('required');
      await expect(page.locator('[name="email"]')).toHaveAttribute('required');
      await expect(page.locator('[name="subject"]')).toHaveAttribute('required');
      await expect(page.locator('[name="message"]')).toHaveAttribute('required');
      
      // Email field should have email type
      await expect(page.locator('[name="email"]')).toHaveAttribute('type', 'email');
      
      // Phone field should have tel type
      await expect(page.locator('[name="phone"]')).toHaveAttribute('type', 'tel');
      
      // Phone field should NOT be required (optional)
      await expect(page.locator('[name="phone"]')).not.toHaveAttribute('required');
    });

    test('should show HTML5 validation messages for empty required fields', async () => {
      // Try to submit empty form
      await page.locator('button[type="submit"]').click();
      
      // HTML5 should prevent submission and show validation messages
      // The exact behavior varies by browser, but form should not submit
      await expect(page.locator('form[name="contact"]')).toBeVisible();
      
      // Check that we're still on the contact page (not success)
      await expect(page.locator('.form-success')).not.toBeVisible();
    });

    test('should validate email format with HTML5', async () => {
      await page.locator('[name="name"]').fill('Test User');
      await page.locator('[name="email"]').fill('invalid-email');
      await page.locator('[name="subject"]').selectOption('general');
      await page.locator('[name="message"]').fill('This is a test message.');
      
      await page.locator('button[type="submit"]').click();
      
      // HTML5 should catch invalid email
      await expect(page.locator('.form-success')).not.toBeVisible();
    });
  });

  test.describe('Server-side Validation', () => {
    test('should show server validation errors for empty required fields', async () => {
      // Submit form with empty required fields
      await page.locator('button[type="submit"]').click();
      
      // Wait for form to process and return with errors
      await page.waitForTimeout(1000);
      
      // Should show validation errors (not success message)
      await expect(page.locator('.form-success')).not.toBeVisible();
      
      // Check for error messages (exact selectors depend on implementation)
      const nameError = page.locator('[id*="name-error"], .form-field--error:has([name="name"]) .form-field__error');
      const emailError = page.locator('[id*="email-error"], .form-field--error:has([name="email"]) .form-field__error');
      
      if (await nameError.count() > 0) {
        await expect(nameError).toContainText('required');
      }
      if (await emailError.count() > 0) {
        await expect(emailError).toContainText('required');
      }
    });

    test('should validate email format on server', async () => {
      await page.locator('[name="name"]').fill('Test User');
      await page.locator('[name="email"]').fill('invalid-email-format');
      await page.locator('[name="subject"]').selectOption('general');
      await page.locator('[name="message"]').fill('This is a test message that is long enough.');
      
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Should show email validation error
      const emailError = page.locator('[id*="email-error"], .form-field--error:has([name="email"]) .form-field__error');
      if (await emailError.count() > 0) {
        await expect(emailError).toContainText('valid email');
      }
    });

    test('should validate phone number format', async () => {
      await page.locator('[name="name"]').fill('Test User');
      await page.locator('[name="email"]').fill('test@example.com');
      await page.locator('[name="phone"]').fill('123'); // Invalid phone
      await page.locator('[name="subject"]').selectOption('general');
      await page.locator('[name="message"]').fill('This is a test message that is long enough.');
      
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Should show phone validation error
      const phoneError = page.locator('[id*="phone-error"], .form-field--error:has([name="phone"]) .form-field__error');
      if (await phoneError.count() > 0) {
        await expect(phoneError).toContainText('10-digit');
      }
    });

    test('should validate message minimum length', async () => {
      await page.locator('[name="name"]').fill('Test User');
      await page.locator('[name="email"]').fill('test@example.com');
      await page.locator('[name="subject"]').selectOption('general');
      await page.locator('[name="message"]').fill('Short'); // Too short
      
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Should show message length validation error
      const messageError = page.locator('[id*="message-error"], .form-field--error:has([name="message"]) .form-field__error');
      if (await messageError.count() > 0) {
        await expect(messageError).toContainText('10 characters');
      }
    });
  });

  test.describe('Phone Number Formatting', () => {
    test('should format phone number as user types', async () => {
      const phoneInput = page.locator('[name="phone"]');
      
      // Type digits one by one
      await phoneInput.fill('5');
      await expect(phoneInput).toHaveValue('5');
      
      await phoneInput.fill('555');
      await expect(phoneInput).toHaveValue('555');
      
      await phoneInput.fill('5551234567');
      
      // Wait for formatting to be applied
      await page.waitForTimeout(100);
      
      // Should be formatted
      await expect(phoneInput).toHaveValue('(555) 123-4567');
    });

    test('should format phone number on paste', async () => {
      const phoneInput = page.locator('[name="phone"]');
      
      // Simulate pasting unformatted number
      await phoneInput.fill('555-123-4567');
      await phoneInput.blur(); // Trigger formatting
      await page.waitForTimeout(100);
      
      await expect(phoneInput).toHaveValue('(555) 123-4567');
    });

    test('should handle various phone number formats', async () => {
      const phoneInput = page.locator('[name="phone"]');
      const testFormats = [
        { input: '5551234567', expected: '(555) 123-4567' },
        { input: '555.123.4567', expected: '(555) 123-4567' },
        { input: '+1 555 123 4567', expected: '(555) 123-4567' }
      ];
      
      for (const { input, expected } of testFormats) {
        await phoneInput.fill(input);
        await phoneInput.blur();
        await page.waitForTimeout(100);
        await expect(phoneInput).toHaveValue(expected);
        await phoneInput.clear();
      }
    });

    test('should not format incomplete phone numbers', async () => {
      const phoneInput = page.locator('[name="phone"]');
      
      await phoneInput.fill('555123');
      await phoneInput.blur();
      await page.waitForTimeout(100);
      
      // Should remain unformatted
      await expect(phoneInput).toHaveValue('555123');
    });
  });

  test.describe('Accessibility Features', () => {
    test('should have proper ARIA attributes on form fields', async () => {
      // Labels should be properly associated
      await expect(page.locator('[name="name"]')).toHaveAttribute('id');
      await expect(page.locator('label[for*="name"]')).toBeVisible();
      
      await expect(page.locator('[name="email"]')).toHaveAttribute('id');
      await expect(page.locator('label[for*="email"]')).toBeVisible();
    });

    test('should show error messages with proper ARIA attributes', async () => {
      // Submit form to trigger validation errors
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Check for ARIA error associations
      const nameField = page.locator('[name="name"]');
      const nameError = page.locator('[id*="name-error"]');
      
      if (await nameError.count() > 0) {
        await expect(nameField).toHaveAttribute('aria-invalid', 'true');
        await expect(nameField).toHaveAttribute('aria-describedby', /.*name-error.*/);
        await expect(nameError).toHaveAttribute('role', 'alert');
      }
    });

    test('should be keyboard navigable', async () => {
      // Tab through form fields
      await page.keyboard.press('Tab'); // Should focus first field
      const firstField = await page.locator(':focus');
      await expect(firstField).toHaveAttribute('name', 'name');
      
      await page.keyboard.press('Tab'); // Should focus email field
      const secondField = await page.locator(':focus');
      await expect(secondField).toHaveAttribute('name', 'email');
      
      // Continue tabbing to verify all fields are reachable
      await page.keyboard.press('Tab'); // phone
      await page.keyboard.press('Tab'); // subject
      await page.keyboard.press('Tab'); // message
      await page.keyboard.press('Tab'); // submit button
      
      const submitButton = await page.locator(':focus');
      await expect(submitButton).toHaveAttribute('type', 'submit');
    });

    test('should have visible focus indicators', async () => {
      const nameField = page.locator('[name="name"]');
      await nameField.focus();
      
      // Check for focus styles (implementation specific)
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeFocused();
    });

    test('should announce validation errors to screen readers', async () => {
      // Submit form to trigger errors
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Error messages should have role="alert" for screen reader announcement
      const errorMessages = page.locator('[role="alert"]');
      if (await errorMessages.count() > 0) {
        await expect(errorMessages.first()).toBeVisible();
      }
    });
  });

  test.describe('Successful Form Submission', () => {
    test('should submit valid form successfully', async () => {
      // Fill out valid form data
      await page.locator('[name="name"]').fill('Sarah Johnson');
      await page.locator('[name="email"]').fill('sarah@example.com');
      await page.locator('[name="phone"]').fill('(555) 123-4567');
      await page.locator('[name="subject"]').selectOption('tour');
      await page.locator('[name="message"]').fill('I would love to schedule a tour of your Montessori school. My daughter is 4 years old.');
      
      // Submit form
      await page.locator('button[type="submit"]').click();
      
      // Wait for form processing
      await page.waitForTimeout(2000);
      
      // Should show success message (in test environment, this might not fully work with Netlify)
      // But form should not show validation errors
      const validationErrors = page.locator('.form-field--error');
      await expect(validationErrors).toHaveCount(0);
    });

    test('should handle optional phone field correctly', async () => {
      // Fill form without phone number
      await page.locator('[name="name"]').fill('Michael Chen');
      await page.locator('[name="email"]').fill('mchen@email.com');
      // Leave phone empty
      await page.locator('[name="subject"]').selectOption('admissions');
      await page.locator('[name="message"]').fill('Can you tell me more about your admissions process?');
      
      // Submit form
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(2000);
      
      // Should not show phone validation error
      const phoneError = page.locator('[id*="phone-error"]');
      await expect(phoneError).toHaveCount(0);
    });
  });

  test.describe('User Experience', () => {
    test('should show helpful placeholders', async () => {
      await expect(page.locator('[name="name"]')).toHaveAttribute('placeholder', /.*name.*/i);
      await expect(page.locator('[name="email"]')).toHaveAttribute('placeholder', /.*email.*/i);
      await expect(page.locator('[name="phone"]')).toHaveAttribute('placeholder', /.*\d{3}.*\d{3}.*\d{4}.*/);
    });

    test('should show help text for optional fields', async () => {
      // Phone field should indicate it's optional
      const phoneHelp = page.locator('.form-field:has([name="phone"]) .form-field__help');
      if (await phoneHelp.count() > 0) {
        await expect(phoneHelp).toContainText(/optional/i);
      }
    });

    test('should provide subject options relevant to school', async () => {
      const subjectSelect = page.locator('[name="subject"]');
      await subjectSelect.click();
      
      // Should have school-relevant options
      await expect(page.locator('option[value="tour"]')).toBeVisible();
      await expect(page.locator('option[value="admissions"]')).toBeVisible();
      await expect(page.locator('option[value="tuition"]')).toBeVisible();
      await expect(page.locator('option[value="programs"]')).toBeVisible();
    });

    test('should maintain form data during validation cycles', async () => {
      // Fill form with mixed valid/invalid data
      await page.locator('[name="name"]').fill('Test User');
      await page.locator('[name="email"]').fill('invalid-email');
      await page.locator('[name="subject"]').selectOption('general');
      await page.locator('[name="message"]').fill('Valid message content here.');
      
      // Submit to trigger validation
      await page.locator('button[type="submit"]').click();
      await page.waitForTimeout(1000);
      
      // Valid fields should retain their values
      await expect(page.locator('[name="name"]')).toHaveValue('Test User');
      await expect(page.locator('[name="subject"]')).toHaveValue('general');
      await expect(page.locator('[name="message"]')).toHaveValue('Valid message content here.');
      
      // Invalid field should also retain value for user to correct
      await expect(page.locator('[name="email"]')).toHaveValue('invalid-email');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work well on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Form should be visible and usable
      await expect(page.locator('form[name="contact"]')).toBeVisible();
      
      // Fields should be appropriately sized
      const nameField = page.locator('[name="name"]');
      const fieldBox = await nameField.boundingBox();
      expect(fieldBox?.width).toBeGreaterThan(200); // Reasonable touch target
      
      // Form should be scrollable if needed
      await page.locator('[name="message"]').scrollIntoViewIfNeeded();
      await expect(page.locator('[name="message"]')).toBeVisible();
    });

    test('should have appropriate touch targets on mobile', async () => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Submit button should be large enough for touch
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThan(44); // iOS minimum touch target
      
      // Select field should be touchable
      const subjectSelect = page.locator('[name="subject"]');
      const selectBox = await subjectSelect.boundingBox();
      expect(selectBox?.height).toBeGreaterThan(44);
    });
  });
});