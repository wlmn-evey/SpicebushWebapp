/**
 * End-to-end tests for form validation across all forms
 * Tests real browser behavior including JavaScript enhancement and fallbacks
 */

import { test, expect } from '@playwright/test';

test.describe('Form Validation E2E Tests', () => {
  test.describe('Contact Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/contact');
      await page.waitForLoadState('networkidle');
    });

    test('should validate required fields on blur', async ({ page }) => {
      // Focus and blur name field
      await page.locator('#name').focus();
      await page.locator('#email').focus(); // Focus next field to trigger blur
      
      // Check error appears
      const nameError = page.locator('#name-error');
      await expect(nameError).toBeVisible();
      await expect(nameError).toHaveText('This field is required');
      
      // Check ARIA attributes
      await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
      await expect(page.locator('#name')).toHaveAttribute('aria-describedby', 'name-error');
      
      // Check border color changed
      await expect(page.locator('#name')).toHaveClass(/border-red-300/);
    });

    test('should validate email format', async ({ page }) => {
      await page.fill('#email', 'invalid-email');
      await page.locator('#phone').focus(); // Blur email field
      
      const emailError = page.locator('#email-error');
      await expect(emailError).toBeVisible();
      await expect(emailError).toHaveText('Please enter a valid email address');
    });

    test('should validate phone number format', async ({ page }) => {
      await page.fill('#phone', '123');
      await page.locator('#message').focus();
      
      const phoneError = page.locator('#phone-error');
      await expect(phoneError).toBeVisible();
      await expect(phoneError).toHaveText('Please enter a 10-digit phone number');
    });

    test('should format phone number on input', async ({ page }) => {
      const phoneInput = page.locator('#phone');
      await phoneInput.type('1234567890');
      
      // Check formatted value
      await expect(phoneInput).toHaveValue('(123) 456-7890');
    });

    test('should validate message length', async ({ page }) => {
      await page.fill('#message', 'Short');
      await page.locator('#name').focus(); // Blur message field
      
      const messageError = page.locator('#message-error');
      await expect(messageError).toBeVisible();
      await expect(messageError).toHaveText('Must be at least 10 characters');
    });

    test('should clear errors on input', async ({ page }) => {
      // Create error
      await page.locator('#name').focus();
      await page.locator('#email').focus();
      const nameError = page.locator('#name-error');
      await expect(nameError).toBeVisible();
      
      // Start typing
      await page.fill('#name', 'J');
      await expect(nameError).not.toBeVisible();
      await expect(page.locator('#name')).not.toHaveAttribute('aria-invalid');
    });

    test('should prevent form submission with errors', async ({ page }) => {
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Check multiple errors appear
      await expect(page.locator('#name-error')).toBeVisible();
      await expect(page.locator('#email-error')).toBeVisible();
      await expect(page.locator('#message-error')).toBeVisible();
      
      // Check form wasn't submitted (still on same page)
      await expect(page).toHaveURL(/\/contact$/);
    });

    test('should focus first error field on submit', async ({ page }) => {
      // Try to submit empty form
      await page.click('button[type="submit"]');
      
      // Check name field (first error) has focus
      await expect(page.locator('#name')).toBeFocused();
    });

    test('should submit successfully with valid data', async ({ page }) => {
      // Fill valid data
      await page.fill('#name', 'John Doe');
      await page.fill('#email', 'john@example.com');
      await page.fill('#phone', '1234567890');
      await page.selectOption('#subject', 'tour');
      await page.fill('#message', 'I would like to schedule a tour of your school.');
      
      // Mock successful submission
      await page.route('**/contact', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 302,
            headers: { 'Location': '/contact-success' }
          });
        }
      });
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Check loading state
      await expect(page.locator('#submit-loading')).toBeVisible();
      await expect(page.locator('#submit-text')).not.toBeVisible();
      await expect(page.locator('#submit-btn')).toBeDisabled();
    });

    test('should work without JavaScript', async ({ page, browser }) => {
      // Create context with JavaScript disabled
      const context = await browser.newContext({ javaScriptEnabled: false });
      const noJsPage = await context.newPage();
      
      await noJsPage.goto('/contact');
      
      // Try to submit empty form
      await noJsPage.click('button[type="submit"]');
      
      // Browser should use HTML5 validation
      // Check that we're still on the same page
      await expect(noJsPage).toHaveURL(/\/contact$/);
      
      await context.close();
    });
  });

  test.describe('Newsletter Signup Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
    });

    test('should validate email in footer newsletter', async ({ page }) => {
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Find newsletter form in footer
      const newsletterForm = page.locator('.newsletter-footer').first();
      const emailInput = newsletterForm.locator('input[type="email"]');
      
      // Test empty submission
      await emailInput.focus();
      await emailInput.press('Tab');
      
      // Check for custom error display
      const errorElement = newsletterForm.locator('.field-error');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toHaveText('This field is required');
    });

    test('should validate email format in newsletter', async ({ page }) => {
      const newsletterForm = page.locator('.newsletter-footer').first();
      const emailInput = newsletterForm.locator('input[type="email"]');
      
      await emailInput.fill('invalid-email');
      await emailInput.press('Tab');
      
      const errorElement = newsletterForm.locator('.field-error');
      await expect(errorElement).toBeVisible();
      await expect(errorElement).toHaveText('Please enter a valid email address');
    });

    test('should submit newsletter successfully', async ({ page }) => {
      const newsletterForm = page.locator('.newsletter-footer').first();
      const emailInput = newsletterForm.locator('input[type="email"]');
      const submitButton = newsletterForm.locator('button[type="submit"]');
      
      // Mock API response
      await page.route('**/api/newsletter/subscribe', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Thank you for subscribing!' })
        });
      });
      
      await emailInput.fill('test@example.com');
      await submitButton.click();
      
      // Check loading state
      await expect(submitButton).toHaveText('Subscribing...');
      await expect(submitButton).toBeDisabled();
      
      // Check success message
      const messageEl = newsletterForm.locator('.form-message-footer');
      await expect(messageEl).toBeVisible();
      await expect(messageEl).toHaveClass(/success/);
      await expect(messageEl).toHaveText('Thank you for subscribing!');
    });

    test('should handle API errors gracefully', async ({ page }) => {
      const newsletterForm = page.locator('.newsletter-footer').first();
      const emailInput = newsletterForm.locator('input[type="email"]');
      const submitButton = newsletterForm.locator('button[type="submit"]');
      
      // Mock API error
      await page.route('**/api/newsletter/subscribe', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Email already subscribed' })
        });
      });
      
      await emailInput.fill('existing@example.com');
      await submitButton.click();
      
      // Check error message
      const messageEl = newsletterForm.locator('.form-message-footer');
      await expect(messageEl).toBeVisible();
      await expect(messageEl).toHaveClass(/error/);
      await expect(messageEl).toHaveText('Email already subscribed');
    });
  });

  test.describe('Donation Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/donate');
      await page.waitForLoadState('networkidle');
    });

    test('should validate minimum donation amount', async ({ page }) => {
      // Wait for React component to load
      await page.waitForSelector('#donation-form', { state: 'visible' });
      
      // Enter custom amount less than $1
      const customAmountInput = page.locator('input[placeholder="Enter amount"]');
      await customAmountInput.fill('0.50');
      
      // Check submit button state
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();
    });

    test('should validate donor information', async ({ page }) => {
      // Select donation amount
      await page.click('button:has-text("$100")');
      
      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeDisabled();
      
      // Fill in invalid email
      await page.fill('#email', 'invalid-email');
      await expect(submitButton).toBeDisabled();
      
      // Fill in valid data
      await page.fill('#firstName', 'John');
      await page.fill('#lastName', 'Doe');
      await page.fill('#email', 'john@example.com');
      
      // Now submit should be enabled
      await expect(submitButton).toBeEnabled();
    });

    test('should handle anonymous donations', async ({ page }) => {
      // Select donation amount
      await page.click('button:has-text("$100")');
      
      // Check anonymous checkbox
      await page.check('#anonymous');
      
      // Name fields should be disabled
      await expect(page.locator('#firstName')).toBeDisabled();
      await expect(page.locator('#lastName')).toBeDisabled();
      
      // Only email should be required
      await page.fill('#email', 'anonymous@example.com');
      
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeEnabled();
    });

    test('should show selected donation level', async ({ page }) => {
      // Click on a donation level
      const treeLevel = page.locator('button:has-text("Tree")');
      await treeLevel.click();
      
      // Check it's selected
      await expect(treeLevel).toHaveClass(/border-forest-canopy/);
      
      // Submit button should show amount
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toContainText('Donate $100');
    });

    test('should toggle between one-time and monthly', async ({ page }) => {
      // Select monthly
      await page.click('button:has-text("Monthly Gift")');
      
      // Select a donation level
      await page.click('button:has-text("$50")');
      
      // Check submit button shows monthly
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toContainText('Donate $50/month');
      
      // Check donation level shows monthly
      const saplingLevel = page.locator('button:has-text("Sapling")');
      await expect(saplingLevel).toContainText('$50/mo');
    });
  });

  test.describe('Mobile Experience', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('contact form should be usable on mobile', async ({ page }) => {
      await page.goto('/contact');
      
      // Check form fields are visible and accessible
      await expect(page.locator('#name')).toBeVisible();
      await expect(page.locator('#email')).toBeVisible();
      await expect(page.locator('#message')).toBeVisible();
      
      // Test validation still works
      await page.locator('#name').focus();
      await page.locator('#email').focus();
      
      const nameError = page.locator('#name-error');
      await expect(nameError).toBeVisible();
      
      // Check submit button is reachable
      const submitButton = page.locator('button[type="submit"]');
      await expect(submitButton).toBeInViewport();
    });

    test('newsletter form should stack on mobile', async ({ page }) => {
      await page.goto('/');
      
      const newsletterForm = page.locator('.newsletter-footer').first();
      const formWrapper = newsletterForm.locator('.form-footer-wrapper');
      
      // Check form elements stack vertically
      const computedStyle = await formWrapper.evaluate(el => 
        window.getComputedStyle(el).flexDirection
      );
      
      // Mobile styles should apply
      expect(['column', 'column-reverse']).toContain(computedStyle);
    });
  });

  test.describe('Accessibility', () => {
    test('forms should be keyboard navigable', async ({ page }) => {
      await page.goto('/contact');
      
      // Tab through form fields
      await page.keyboard.press('Tab'); // Skip to main content
      await page.keyboard.press('Tab'); // Name field
      
      await expect(page.locator('#name')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Email field
      await expect(page.locator('#email')).toBeFocused();
      
      await page.keyboard.press('Tab'); // Phone field
      await expect(page.locator('#phone')).toBeFocused();
    });

    test('error messages should be announced', async ({ page }) => {
      await page.goto('/contact');
      
      // Create error
      await page.locator('#name').focus();
      await page.locator('#email').focus();
      
      // Check error has proper ARIA attributes
      const nameError = page.locator('#name-error');
      await expect(nameError).toHaveAttribute('role', 'alert');
      await expect(nameError).toHaveAttribute('aria-live', 'polite');
    });

    test('form should work with screen reader', async ({ page }) => {
      await page.goto('/contact');
      
      // Check all fields have labels
      const fields = ['name', 'email', 'phone', 'subject', 'message'];
      
      for (const fieldId of fields) {
        const field = page.locator(`#${fieldId}`);
        const label = page.locator(`label[for="${fieldId}"]`);
        
        await expect(field).toBeVisible();
        await expect(label).toBeVisible();
      }
      
      // Check required fields are marked
      await expect(page.locator('label[for="name"]')).toContainText('*');
      await expect(page.locator('label[for="email"]')).toContainText('*');
      await expect(page.locator('label[for="message"]')).toContainText('*');
    });
  });
});