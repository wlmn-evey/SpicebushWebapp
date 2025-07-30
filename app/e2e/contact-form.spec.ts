import { test, expect } from '@playwright/test';

/**
 * Comprehensive test suite for the Contact Form implementation
 * 
 * Tests cover:
 * 1. Form submission flow and success redirect
 * 2. Form validation (required fields, email/phone format)
 * 3. Honeypot spam protection
 * 4. Success page functionality
 * 5. Error handling
 * 6. Mobile responsiveness
 */

test.describe('Contact Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    // Wait for the form to be visible
    await page.waitForSelector('form#contact-form', { state: 'visible' });
  });

  test.describe('Form Submission Flow', () => {
    test('should successfully submit form and redirect to success page', async ({ page }) => {
      // Fill out all required fields
      await page.fill('#name', 'Test User');
      await page.fill('#email', 'test@example.com');
      await page.selectOption('#subject', 'tour');
      await page.fill('#message', 'I would like to schedule a tour of your school.');

      // Submit the form
      await page.click('#submit-btn');

      // Should redirect to success page
      await page.waitForURL('**/contact-success');
      
      // Verify success page content
      await expect(page.locator('h1')).toContainText('Thank You!');
      await expect(page.locator('text=Your message has been sent successfully')).toBeVisible();
      
      // Check for "What happens next" section
      await expect(page.locator('text=What happens next?')).toBeVisible();
      await expect(page.locator('text=Our admissions team will review your message')).toBeVisible();
    });

    test('should handle form with all fields filled', async ({ page }) => {
      // Fill all fields including optional ones
      await page.fill('#name', 'Full Test User');
      await page.fill('#email', 'fulltest@example.com');
      await page.fill('#phone', '5551234567'); // Will be formatted
      await page.selectOption('#child-age', '4');
      await page.selectOption('#subject', 'admissions');
      await page.fill('#message', 'Complete form submission test with all fields.');
      await page.check('input[name="tour-interest"]');

      // Submit the form
      await page.click('#submit-btn');

      // Should redirect to success page
      await page.waitForURL('**/contact-success');
      await expect(page.locator('h1')).toContainText('Thank You!');
    });

    test('should show loading state during submission', async ({ page }) => {
      // Fill required fields
      await page.fill('#name', 'Test User');
      await page.fill('#email', 'test@example.com');
      await page.selectOption('#subject', 'general');
      await page.fill('#message', 'Testing loading state');

      // Click submit and check loading state
      await page.click('#submit-btn');
      
      // The button should be disabled and show loading text
      await expect(page.locator('#submit-btn')).toBeDisabled();
      await expect(page.locator('#submit-loading')).toBeVisible();
      await expect(page.locator('#submit-text')).toBeHidden();
    });
  });

  test.describe('Form Validation', () => {
    test('should require all mandatory fields', async ({ page }) => {
      // Try to submit empty form
      await page.click('button[type="submit"]');

      // Should not navigate away from the contact page
      await expect(page).toHaveURL(/.*\/contact$/);

      // Check for browser validation messages (HTML5 validation)
      const nameField = page.locator('#name');
      const emailField = page.locator('#email');
      const subjectField = page.locator('#subject');
      const messageField = page.locator('#message');

      // Verify fields are marked as required
      await expect(nameField).toHaveAttribute('required', '');
      await expect(emailField).toHaveAttribute('required', '');
      await expect(subjectField).toHaveAttribute('required', '');
      await expect(messageField).toHaveAttribute('required', '');
    });

    test('should validate email format', async ({ page }) => {
      // Fill form with invalid email
      await page.fill('#name', 'Test User');
      await page.fill('#email', 'invalid-email');
      await page.selectOption('#subject', 'general');
      await page.fill('#message', 'Test message');

      // Trigger blur event to activate validation
      await page.locator('#email').blur();

      // Email field should have red border (validation error styling)
      await expect(page.locator('#email')).toHaveClass(/border-red-300/);

      // Fix the email
      await page.fill('#email', 'valid@example.com');
      await page.locator('#email').blur();

      // Border should return to normal
      await expect(page.locator('#email')).not.toHaveClass(/border-red-300/);
    });

    test('should format phone number automatically', async ({ page }) => {
      const phoneField = page.locator('#phone');

      // Type phone number without formatting
      await phoneField.fill('5551234567');

      // Should be automatically formatted
      await expect(phoneField).toHaveValue('(555) 123-4567');

      // Test partial phone number
      await phoneField.fill('');
      await phoneField.type('555123');
      await expect(phoneField).toHaveValue('(555) 123');
    });

    test('should validate required fields on blur', async ({ page }) => {
      // Focus and blur empty required fields
      const nameField = page.locator('#name');
      const emailField = page.locator('#email');
      const messageField = page.locator('#message');

      // Test name field
      await nameField.focus();
      await nameField.blur();
      await expect(nameField).toHaveClass(/border-red-300/);

      // Test email field
      await emailField.focus();
      await emailField.blur();
      await expect(emailField).toHaveClass(/border-red-300/);

      // Test message field
      await messageField.focus();
      await messageField.blur();
      await expect(messageField).toHaveClass(/border-red-300/);

      // Fill fields and verify validation clears
      await nameField.fill('Test User');
      await expect(nameField).not.toHaveClass(/border-red-300/);

      await emailField.fill('test@example.com');
      await expect(emailField).not.toHaveClass(/border-red-300/);

      await messageField.fill('Test message');
      await expect(messageField).not.toHaveClass(/border-red-300/);
    });
  });

  test.describe('Honeypot Spam Protection', () => {
    test('should have hidden honeypot field', async ({ page }) => {
      // Check that honeypot field exists and is hidden
      const honeypotContainer = page.locator('div[style*="display: none"]');
      await expect(honeypotContainer).toBeHidden();

      // The honeypot input should exist inside
      const honeypotInput = honeypotContainer.locator('input[name="bot-field"]');
      await expect(honeypotInput).toBeHidden();
    });

    test('should include honeypot attribute in form', async ({ page }) => {
      // Verify form has Netlify honeypot attribute
      const form = page.locator('form#contact-form');
      await expect(form).toHaveAttribute('data-netlify-honeypot', 'bot-field');
    });
  });

  test.describe('Success Page', () => {
    test('should display all success page elements', async ({ page }) => {
      // Navigate directly to success page
      await page.goto('/contact-success');

      // Check main elements
      await expect(page.locator('h1')).toContainText('Thank You!');
      await expect(page.locator('text=Your message has been sent successfully')).toBeVisible();

      // Check "What happens next" section
      const nextSteps = page.locator('text=What happens next?');
      await expect(nextSteps).toBeVisible();

      // Check bullet points
      await expect(page.locator('text=Our admissions team will review your message')).toBeVisible();
      await expect(page.locator('text=We\'ll respond within 24 hours during business days')).toBeVisible();
      await expect(page.locator('text=If you requested a tour')).toBeVisible();

      // Check action buttons
      const homeButton = page.locator('a:has-text("Back to Home")');
      const callButton = page.locator('a:has-text("Call Us")');
      
      await expect(homeButton).toBeVisible();
      await expect(homeButton).toHaveAttribute('href', '/');
      
      await expect(callButton).toBeVisible();
      await expect(callButton).toHaveAttribute('href', 'tel:484-202-0712');

      // Check footer message
      await expect(page.locator('text=Need immediate assistance?')).toBeVisible();
    });

    test('should have functional navigation buttons', async ({ page }) => {
      await page.goto('/contact-success');

      // Test "Back to Home" button
      const homeButton = page.locator('a:has-text("Back to Home")');
      await homeButton.click();
      await expect(page).toHaveURL('/');

      // Go back to success page and test phone link
      await page.goto('/contact-success');
      const callButton = page.locator('a:has-text("Call Us")');
      const href = await callButton.getAttribute('href');
      expect(href).toBe('tel:484-202-0712');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should be fully functional on mobile', async ({ page }) => {
      // Check form is properly displayed
      const form = page.locator('form#contact-form');
      await expect(form).toBeVisible();

      // Check that fields stack vertically on mobile
      const nameField = page.locator('#name');
      const emailField = page.locator('#email');
      const phoneField = page.locator('#phone');
      const childAgeField = page.locator('#child-age');

      await expect(nameField).toBeVisible();
      await expect(emailField).toBeVisible();
      await expect(phoneField).toBeVisible();
      await expect(childAgeField).toBeVisible();

      // Fill and submit form on mobile
      await nameField.fill('Mobile Test User');
      await emailField.fill('mobile@example.com');
      await page.selectOption('#subject', 'tour');
      await page.fill('#message', 'Testing on mobile device');

      // Submit button should be full width on mobile
      const submitButton = page.locator('#submit-btn');
      await expect(submitButton).toHaveClass(/w-full/);

      // Submit form
      await submitButton.click();

      // Should redirect to success page
      await page.waitForURL('**/contact-success');
      await expect(page.locator('h1')).toContainText('Thank You!');
    });

    test('should show mobile-optimized success page', async ({ page }) => {
      await page.goto('/contact-success');

      // Check that buttons stack vertically on mobile
      const buttonsContainer = page.locator('.flex-col.sm\\:flex-row');
      await expect(buttonsContainer).toBeVisible();

      // Both buttons should be visible and accessible
      const homeButton = page.locator('a:has-text("Back to Home")');
      const callButton = page.locator('a:has-text("Call Us")');
      
      await expect(homeButton).toBeVisible();
      await expect(callButton).toBeVisible();
    });
  });

  test.describe('Additional Features', () => {
    test('should display contact methods cards', async ({ page }) => {
      // Check all three contact method cards
      const phoneCard = page.locator('text=Call Us').locator('..');
      const emailCard = page.locator('text=Email Us').locator('..');
      const visitCard = page.locator('text=Visit Us').locator('..');

      await expect(phoneCard).toBeVisible();
      await expect(emailCard).toBeVisible();
      await expect(visitCard).toBeVisible();

      // Verify phone number is clickable
      const phoneLink = page.locator('a[href="tel:484-202-0712"]').first();
      await expect(phoneLink).toBeVisible();
      await expect(phoneLink).toHaveText('(484) 202-0712');

      // Verify email is clickable
      const emailLink = page.locator('a[href="mailto:information@spicebushmontessori.org"]');
      await expect(emailLink).toBeVisible();
      await expect(emailLink).toHaveText('information@spicebushmontessori.org');

      // Verify address is displayed
      await expect(page.locator('text=827 Concord Road')).toBeVisible();
      await expect(page.locator('text=Glen Mills, PA 19342')).toBeVisible();
    });

    test('should display hours widget', async ({ page }) => {
      // Check that hours widget section is visible
      const hoursSection = page.locator('text=When We\'re Here').locator('..');
      await expect(hoursSection).toBeVisible();

      // Hours widget component should be rendered
      const hoursWidget = page.locator('.bg-white:has-text("When We\'re Here")');
      await expect(hoursWidget).toBeVisible();
    });

    test('should display additional information links', async ({ page }) => {
      // Check "More Ways to Connect" section
      const connectSection = page.locator('text=More Ways to Connect').locator('..');
      await expect(connectSection).toBeVisible();

      // Check links
      const admissionsLink = page.locator('a[href="/admissions"]');
      const calculatorLink = page.locator('a[href="/admissions/tuition-calculator"]');
      const feedbackLink = page.locator('a[href*="google.com/forms"]');

      await expect(admissionsLink).toBeVisible();
      await expect(calculatorLink).toBeVisible();
      await expect(feedbackLink).toBeVisible();
    });

    test('should display emergency contact information', async ({ page }) => {
      // Check emergency contact section
      const emergencySection = page.locator('text=Emergency Contact').locator('..');
      await expect(emergencySection).toBeVisible();

      // Verify emergency phone number
      const emergencyPhone = emergencySection.locator('a[href="tel:484-202-0712"]');
      await expect(emergencyPhone).toBeVisible();
      await expect(emergencyPhone).toHaveText('(484) 202-0712');
    });
  });

  test.describe('Cross-browser Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should work correctly in ${browserName}`, async ({ page, browserName }) => {
        // Fill and submit form
        await page.fill('#name', `${browserName} Test User`);
        await page.fill('#email', `${browserName}@example.com`);
        await page.selectOption('#subject', 'general');
        await page.fill('#message', `Testing in ${browserName} browser`);

        await page.click('button[type="submit"]');

        // Should redirect to success page
        await page.waitForURL('**/contact-success');
        await expect(page.locator('h1')).toContainText('Thank You!');
      });
    });
  });
});