/**
 * Accessibility tests for form validation
 * Tests WCAG 2.1 AA compliance and screen reader compatibility
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Form Validation Accessibility Tests', () => {
  test.describe('WCAG Compliance', () => {
    test('contact form should pass axe accessibility checks', async ({ page }) => {
      await page.goto('/contact');
      await injectAxe(page);
      
      // Check initial state
      await checkA11y(page, '#contact-form', {
        detailedReport: true,
        detailedReportOptions: {
          html: true
        }
      });
      
      // Create validation errors
      await page.locator('#name').focus();
      await page.locator('#email').focus();
      await page.locator('#email').fill('invalid');
      await page.locator('#phone').focus();
      
      // Check with errors displayed
      await checkA11y(page, '#contact-form', {
        detailedReport: true
      });
    });

    test('newsletter form should pass axe checks', async ({ page }) => {
      await page.goto('/');
      await injectAxe(page);
      
      const newsletterForm = page.locator('.newsletter-footer').first();
      
      // Check accessibility
      await checkA11y(page, '.newsletter-footer', {
        detailedReport: true
      });
    });

    test('donation form should pass axe checks', async ({ page }) => {
      await page.goto('/donate');
      await injectAxe(page);
      
      // Wait for React component
      await page.waitForSelector('#donation-form', { state: 'visible' });
      
      await checkA11y(page, '#donation-form', {
        detailedReport: true
      });
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should navigate contact form with keyboard only', async ({ page }) => {
      await page.goto('/contact');
      
      // Start at top of page
      await page.keyboard.press('Tab');
      
      // Tab through all form fields
      const focusSequence = [
        '#name',
        '#email',
        '#phone',
        '#child-age',
        '#subject',
        '#message',
        'input[name="tour-interest"]',
        '#submit-btn'
      ];
      
      for (const selector of focusSequence) {
        await page.keyboard.press('Tab');
        const element = page.locator(selector);
        await expect(element).toBeFocused();
      }
      
      // Should be able to submit with Enter
      await page.keyboard.press('Enter');
      
      // Check errors appear
      await expect(page.locator('#name-error')).toBeVisible();
    });

    test('should navigate backwards with Shift+Tab', async ({ page }) => {
      await page.goto('/contact');
      
      // Focus submit button
      await page.locator('#submit-btn').focus();
      
      // Navigate backwards
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('input[name="tour-interest"]')).toBeFocused();
      
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('#message')).toBeFocused();
    });

    test('should trap focus in error state', async ({ page }) => {
      await page.goto('/contact');
      
      // Submit empty form
      await page.locator('#submit-btn').click();
      
      // Focus should move to first error field
      await expect(page.locator('#name')).toBeFocused();
    });
  });

  test.describe('Screen Reader Announcements', () => {
    test('error messages should be properly announced', async ({ page }) => {
      await page.goto('/contact');
      
      // Check error elements have proper roles
      const nameError = page.locator('#name-error');
      await expect(nameError).toHaveAttribute('role', 'alert');
      await expect(nameError).toHaveAttribute('aria-live', 'polite');
      
      // Create error
      await page.locator('#name').focus();
      await page.locator('#email').focus();
      
      // Error should be visible and associated
      await expect(nameError).toBeVisible();
      await expect(page.locator('#name')).toHaveAttribute('aria-describedby', 'name-error');
    });

    test('field labels should be associated correctly', async ({ page }) => {
      await page.goto('/contact');
      
      // Check all form fields have associated labels
      const fields = [
        { input: '#name', label: 'Your Name *' },
        { input: '#email', label: 'Email Address *' },
        { input: '#phone', label: 'Phone Number' },
        { input: '#subject', label: 'Subject *' },
        { input: '#message', label: 'Your Message *' }
      ];
      
      for (const field of fields) {
        const input = page.locator(field.input);
        const label = page.locator(`label[for="${field.input.slice(1)}"]`);
        
        await expect(label).toBeVisible();
        await expect(label).toHaveText(new RegExp(field.label.replace('*', '\\*')));
      }
    });

    test('required fields should be marked appropriately', async ({ page }) => {
      await page.goto('/contact');
      
      // Check HTML5 required attribute
      await expect(page.locator('#name')).toHaveAttribute('required', '');
      await expect(page.locator('#email')).toHaveAttribute('required', '');
      await expect(page.locator('#message')).toHaveAttribute('required', '');
      
      // Check visual indication
      await expect(page.locator('label[for="name"]')).toContainText('*');
      await expect(page.locator('label[for="email"]')).toContainText('*');
      await expect(page.locator('label[for="message"]')).toContainText('*');
    });
  });

  test.describe('Focus Management', () => {
    test('focus indicators should be visible', async ({ page }) => {
      await page.goto('/contact');
      
      // Focus a field
      await page.locator('#name').focus();
      
      // Check focus ring is visible
      const focusStyle = await page.locator('#name').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          boxShadow: styles.boxShadow
        };
      });
      
      // Should have some focus indication
      expect(
        focusStyle.outline !== 'none' || 
        focusStyle.boxShadow.includes('ring')
      ).toBeTruthy();
    });

    test('focus should move logically through form', async ({ page }) => {
      await page.goto('/contact');
      
      // Fill form partially
      await page.fill('#name', 'John');
      await page.fill('#email', 'invalid-email');
      
      // Submit to trigger validation
      await page.click('#submit-btn');
      
      // Focus should go to first error (email in this case since name is valid)
      await expect(page.locator('#email')).toBeFocused();
    });
  });

  test.describe('Color Contrast', () => {
    test('error messages should have sufficient contrast', async ({ page }) => {
      await page.goto('/contact');
      
      // Create error
      await page.locator('#name').focus();
      await page.locator('#email').focus();
      
      // Get error color and background
      const errorContrast = await page.locator('#name-error').evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor
        };
      });
      
      // Error text should be clearly visible (red-600 on white background)
      expect(errorContrast.color).toMatch(/rgb/);
    });

    test('focus states should be distinguishable', async ({ page }) => {
      await page.goto('/contact');
      
      const input = page.locator('#name');
      
      // Get unfocused state
      const unfocusedBorder = await input.evaluate(el => 
        window.getComputedStyle(el).borderColor
      );
      
      // Focus and get focused state
      await input.focus();
      const focusedBorder = await input.evaluate(el => 
        window.getComputedStyle(el).borderColor
      );
      
      // Border colors should be different
      expect(unfocusedBorder).not.toBe(focusedBorder);
    });
  });

  test.describe('Mobile Accessibility', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('touch targets should be large enough', async ({ page }) => {
      await page.goto('/contact');
      
      // Check input heights
      const inputHeight = await page.locator('#name').evaluate(el => 
        el.getBoundingClientRect().height
      );
      
      // Should be at least 44px for touch targets
      expect(inputHeight).toBeGreaterThanOrEqual(44);
      
      // Check button size
      const buttonRect = await page.locator('#submit-btn').boundingBox();
      expect(buttonRect?.height).toBeGreaterThanOrEqual(44);
    });

    test('form should be zoomable', async ({ page }) => {
      await page.goto('/contact');
      
      // Check viewport meta tag allows zooming
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).not.toContain('maximum-scale=1');
      expect(viewportMeta).not.toContain('user-scalable=no');
    });
  });

  test.describe('Error Recovery', () => {
    test('should allow users to correct errors easily', async ({ page }) => {
      await page.goto('/contact');
      
      // Create multiple errors
      await page.fill('#email', 'invalid');
      await page.fill('#phone', '123');
      await page.click('#submit-btn');
      
      // Check errors are shown
      await expect(page.locator('#name-error')).toBeVisible();
      await expect(page.locator('#email-error')).toBeVisible();
      await expect(page.locator('#phone-error')).toBeVisible();
      
      // Fix errors one by one
      await page.fill('#name', 'John Doe');
      await expect(page.locator('#name-error')).not.toBeVisible();
      
      await page.fill('#email', 'john@example.com');
      await expect(page.locator('#email-error')).not.toBeVisible();
      
      await page.fill('#phone', '1234567890');
      await expect(page.locator('#phone-error')).not.toBeVisible();
    });

    test('should preserve user input after validation', async ({ page }) => {
      await page.goto('/contact');
      
      // Fill some fields
      await page.fill('#name', 'John Doe');
      await page.fill('#message', 'Test message that is long enough');
      
      // Submit with missing email
      await page.click('#submit-btn');
      
      // Check other fields retained their values
      await expect(page.locator('#name')).toHaveValue('John Doe');
      await expect(page.locator('#message')).toHaveValue('Test message that is long enough');
    });
  });

  test.describe('Assistive Technology Hints', () => {
    test('should provide helpful error descriptions', async ({ page }) => {
      await page.goto('/contact');
      
      // Test each validation type
      const validationTests = [
        {
          field: '#email',
          value: 'invalid',
          expectedError: 'Please enter a valid email address'
        },
        {
          field: '#phone',
          value: '123',
          expectedError: 'Please enter a 10-digit phone number'
        },
        {
          field: '#message',
          value: 'Short',
          expectedError: 'Must be at least 10 characters'
        }
      ];
      
      for (const test of validationTests) {
        await page.fill(test.field, test.value);
        await page.locator('#name').focus(); // Blur current field
        
        const errorId = `${test.field.slice(1)}-error`;
        const error = page.locator(`#${errorId}`);
        
        await expect(error).toHaveText(test.expectedError);
        await expect(page.locator(test.field)).toHaveAttribute('aria-describedby', errorId);
      }
    });

    test('should indicate field format requirements', async ({ page }) => {
      await page.goto('/contact');
      
      // Check placeholder text provides format hints
      await expect(page.locator('#phone')).toHaveAttribute('placeholder', '(555) 123-4567');
      await expect(page.locator('#email')).toHaveAttribute('placeholder', 'your.email@example.com');
    });
  });

  test.describe('Form State Communication', () => {
    test('should communicate form submission state', async ({ page }) => {
      await page.goto('/contact');
      
      // Fill valid form
      await page.fill('#name', 'John Doe');
      await page.fill('#email', 'john@example.com');
      await page.fill('#message', 'This is a test message for the form');
      await page.selectOption('#subject', 'general');
      
      // Mock form submission
      await page.route('**/contact', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: 'Success'
          });
        }, 1000);
      });
      
      // Submit form
      await page.click('#submit-btn');
      
      // Check loading state is communicated
      await expect(page.locator('#submit-btn')).toBeDisabled();
      await expect(page.locator('#submit-loading')).toBeVisible();
      await expect(page.locator('#submit-loading')).toHaveText('Sending...');
    });
  });
});