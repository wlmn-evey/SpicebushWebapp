/**
 * Newsletter Component Browser Tests
 * Tests for the NewsletterSignup.astro component functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Newsletter Signup Component', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept API calls to avoid hitting real endpoints
    await page.route('/api/newsletter/subscribe', async (route) => {
      const request = route.request();
      const data = await request.postDataJSON();
      
      // Simulate different responses based on email
      if (data.email === 'existing@example.com') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'You are already subscribed to our newsletter!' })
        });
      } else if (data.email === 'error@example.com') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Failed to process subscription' })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Successfully subscribed to newsletter!',
            subscriber: { email: data.email, subscription_type: data.subscription_type }
          })
        });
      }
    });
  });

  test.describe('Footer Variant', () => {
    test('should display newsletter signup in footer', async ({ page }) => {
      await page.goto('/');
      
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      // Check footer newsletter elements
      const footerNewsletter = page.locator('.newsletter-footer');
      await expect(footerNewsletter).toBeVisible();
      await expect(footerNewsletter.locator('.newsletter-title-footer')).toContainText('Newsletter');
      await expect(footerNewsletter.locator('.newsletter-description-footer')).toContainText('Stay updated');
      
      // Check form elements
      const emailInput = footerNewsletter.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      await expect(emailInput).toHaveAttribute('placeholder', 'Your email');
      
      const submitButton = footerNewsletter.locator('.submit-button-footer');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toContainText('Subscribe');
    });

    test('should successfully subscribe via footer', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      const emailInput = footerNewsletter.locator('input[type="email"]');
      const submitButton = footerNewsletter.locator('.submit-button-footer');
      const message = footerNewsletter.locator('.form-message-footer');
      
      // Fill and submit form
      await emailInput.fill('test@example.com');
      await submitButton.click();
      
      // Check loading state
      await expect(submitButton).toContainText('Subscribing...');
      await expect(submitButton).toBeDisabled();
      
      // Check success message
      await expect(message).toBeVisible();
      await expect(message).toHaveClass(/success/);
      await expect(message).toContainText('Successfully subscribed');
      
      // Check form is reset
      await expect(emailInput).toHaveValue('');
      await expect(submitButton).toContainText('Subscribe');
      await expect(submitButton).toBeEnabled();
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      const emailInput = footerNewsletter.locator('input[type="email"]');
      const submitButton = footerNewsletter.locator('.submit-button-footer');
      
      // Try to submit with invalid email
      await emailInput.fill('invalid-email');
      await submitButton.click();
      
      // Browser should show HTML5 validation error
      const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy();
    });

    test('should handle duplicate subscription', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      const emailInput = footerNewsletter.locator('input[type="email"]');
      const submitButton = footerNewsletter.locator('.submit-button-footer');
      const message = footerNewsletter.locator('.form-message-footer');
      
      // Try to subscribe existing email
      await emailInput.fill('existing@example.com');
      await submitButton.click();
      
      // Check error message
      await expect(message).toBeVisible();
      await expect(message).toHaveClass(/error/);
      await expect(message).toContainText('already subscribed');
    });

    test('should handle server errors gracefully', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      const emailInput = footerNewsletter.locator('input[type="email"]');
      const submitButton = footerNewsletter.locator('.submit-button-footer');
      const message = footerNewsletter.locator('.form-message-footer');
      
      // Trigger server error
      await emailInput.fill('error@example.com');
      await submitButton.click();
      
      // Check error message
      await expect(message).toBeVisible();
      await expect(message).toHaveClass(/error/);
      await expect(message).toContainText('Failed to process subscription');
    });

    test('should hide message after 5 seconds', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      const emailInput = footerNewsletter.locator('input[type="email"]');
      const submitButton = footerNewsletter.locator('.submit-button-footer');
      const message = footerNewsletter.locator('.form-message-footer');
      
      // Submit form
      await emailInput.fill('test@example.com');
      await submitButton.click();
      
      // Message should be visible
      await expect(message).toBeVisible();
      
      // Wait for message to disappear
      await page.waitForTimeout(5500);
      await expect(message).not.toHaveClass(/show/);
    });
  });

  test.describe('Card Variant', () => {
    test('should display all form fields in card variant', async ({ page }) => {
      // Navigate to a page with card variant (would need to create a test page)
      await page.goto('/test/newsletter-card');
      
      const card = page.locator('.newsletter-card');
      await expect(card).toBeVisible();
      
      // Check name fields are shown
      await expect(card.locator('input[name="first_name"]')).toBeVisible();
      await expect(card.locator('input[name="last_name"]')).toBeVisible();
      await expect(card.locator('input[name="email"]')).toBeVisible();
      
      // Check styling
      await expect(card).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      await expect(card).toHaveCSS('border-radius', '12px');
    });
  });

  test.describe('Inline Variant', () => {
    test('should display compact inline form', async ({ page }) => {
      // Navigate to a page with inline variant
      await page.goto('/test/newsletter-inline');
      
      const inline = page.locator('.newsletter-form-inline');
      await expect(inline).toBeVisible();
      
      // Check layout
      const wrapper = inline.locator('.form-inline-wrapper');
      await expect(wrapper).toHaveCSS('display', 'flex');
      
      // Check no name fields
      await expect(inline.locator('input[name="first_name"]')).not.toBeVisible();
      await expect(inline.locator('input[name="email"]')).toBeVisible();
    });
  });

  test.describe('Tracking and Metadata', () => {
    test('should include tracking metadata in submission', async ({ page }) => {
      let capturedRequest: any = null;
      
      await page.route('/api/newsletter/subscribe', async (route) => {
        capturedRequest = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Subscribed!' })
        });
      });
      
      await page.goto('/about');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      await footerNewsletter.locator('input[type="email"]').fill('tracking@example.com');
      await footerNewsletter.locator('.submit-button-footer').click();
      
      // Verify tracking data
      expect(capturedRequest).toBeTruthy();
      expect(capturedRequest.email).toBe('tracking@example.com');
      expect(capturedRequest.signup_page).toBe('/about');
      expect(capturedRequest.signup_source).toBe('website_footer');
      expect(capturedRequest.subscription_type).toBe('general');
    });
  });

  test.describe('Responsive Design', () => {
    test('should be mobile-friendly', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      const wrapper = footerNewsletter.locator('.form-footer-wrapper');
      
      // On mobile, flex items should maintain proper spacing
      await expect(wrapper).toBeVisible();
      await expect(wrapper.locator('input[type="email"]')).toBeVisible();
      await expect(wrapper.locator('.submit-button-footer')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels and keyboard navigation', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      const footerNewsletter = page.locator('.newsletter-footer');
      const emailInput = footerNewsletter.locator('input[type="email"]');
      const submitButton = footerNewsletter.locator('.submit-button-footer');
      
      // Check screen reader labels
      const label = footerNewsletter.locator('label[for*="email"]');
      await expect(label).toHaveClass(/sr-only/);
      await expect(label).toContainText('Email Address');
      
      // Test keyboard navigation
      await emailInput.focus();
      await page.keyboard.type('keyboard@example.com');
      await page.keyboard.press('Tab');
      
      // Submit button should be focused
      await expect(submitButton).toBeFocused();
      await page.keyboard.press('Enter');
      
      // Should submit form
      const message = footerNewsletter.locator('.form-message-footer');
      await expect(message).toBeVisible();
    });
  });
});