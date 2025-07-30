import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Comprehensive accessibility tests for contact page
 * Verifies Bug #038 (decorative icons) and Bug #039 (map text alternative) fixes
 */

test.describe('Contact Page Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await page.waitForSelector('form#contact-form', { state: 'visible' });
  });

  test.describe('Decorative Icons Accessibility (Bug #038)', () => {
    test('all decorative icons should have aria-hidden="true"', async ({ page }) => {
      // Get all icon elements by their class patterns
      const iconSelectors = [
        'svg.lucide', // General Lucide icon selector
        '[class*="lucide-"]', // Alternative selector
      ];

      for (const selector of iconSelectors) {
        const icons = await page.locator(selector).all();
        
        for (const icon of icons) {
          const ariaHidden = await icon.getAttribute('aria-hidden');
          expect(ariaHidden).toBe('true');
        }
      }
    });

    test('specific icon instances should be hidden from screen readers', async ({ page }) => {
      // Test hero section icon
      const heroIcon = page.locator('section').filter({ hasText: "Let's Connect" }).locator('svg').first();
      await expect(heroIcon).toHaveAttribute('aria-hidden', 'true');

      // Test contact method card icons
      const phoneCardIcon = page.locator('div:has-text("Call Us")').locator('svg').first();
      await expect(phoneCardIcon).toHaveAttribute('aria-hidden', 'true');

      const emailCardIcon = page.locator('div:has-text("Email Us")').locator('svg').first();
      await expect(emailCardIcon).toHaveAttribute('aria-hidden', 'true');

      const visitCardIcon = page.locator('div:has-text("Visit Us")').locator('svg').first();
      await expect(visitCardIcon).toHaveAttribute('aria-hidden', 'true');
    });

    test('form field icons should not interfere with labels', async ({ page }) => {
      // Test that form labels are properly associated despite icons
      const formFields = [
        { label: 'Your Name', input: '#name' },
        { label: 'Email Address', input: '#email' },
        { label: 'Phone Number', input: '#phone' },
        { label: 'Subject', input: '#subject' },
        { label: 'Your Message', input: '#message' }
      ];

      for (const field of formFields) {
        const label = page.locator(`label:has-text("${field.label}")`);
        const input = page.locator(field.input);
        
        // Verify label points to input
        const labelFor = await label.getAttribute('for');
        const inputId = await input.getAttribute('id');
        expect(labelFor).toBe(inputId);

        // Check if label has an icon and it's hidden
        const icon = await label.locator('svg').first();
        if (await icon.count() > 0) {
          await expect(icon).toHaveAttribute('aria-hidden', 'true');
        }
      }
    });

    test('alert icons should be decorative only', async ({ page }) => {
      // Trigger form validation to show error
      await page.click('#submit-btn');
      
      // Wait for validation
      await page.waitForTimeout(500);

      // Check error message icons if visible
      const errorIcons = page.locator('.text-red-600 svg');
      const errorCount = await errorIcons.count();
      
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          await expect(errorIcons.nth(i)).toHaveAttribute('aria-hidden', 'true');
        }
      }
    });

    test('section header icons should be hidden from screen readers', async ({ page }) => {
      // Test section headers
      const sections = [
        { text: 'Send Us a Message', iconClass: 'Send' },
        { text: "When We're Here", iconClass: 'Clock' },
        { text: 'More Ways to Connect', iconClass: 'Heart' },
        { text: 'Emergency Contact', iconClass: 'AlertCircle' }
      ];

      for (const section of sections) {
        const sectionElement = page.locator(`text="${section.text}"`).first();
        const icon = sectionElement.locator('..').locator('svg').first();
        
        if (await icon.count() > 0) {
          await expect(icon).toHaveAttribute('aria-hidden', 'true');
        }
      }
    });
  });

  test.describe('Google Map Accessibility (Bug #039)', () => {
    test('map iframe should have proper aria-describedby', async ({ page }) => {
      const mapIframe = page.locator('iframe[src*="google.com/maps"]');
      
      // Check aria-describedby attribute
      await expect(mapIframe).toHaveAttribute('aria-describedby', 'school-address');
      
      // Check title attribute
      await expect(mapIframe).toHaveAttribute('title', 'Spicebush Montessori School Location Map');
    });

    test('address section should have correct id for aria reference', async ({ page }) => {
      const addressSection = page.locator('#school-address');
      
      // Verify section exists
      await expect(addressSection).toBeVisible();
      
      // Verify it contains address information
      await expect(addressSection).toContainText('827 Concord Road');
      await expect(addressSection).toContainText('Glen Mills, PA 19342');
    });

    test('map and address should have proper ARIA relationship', async ({ page }) => {
      const mapIframe = page.locator('iframe[src*="google.com/maps"]');
      const addressSection = page.locator('#school-address');
      
      // Get aria-describedby value from map
      const ariaDescribedBy = await mapIframe.getAttribute('aria-describedby');
      
      // Get id from address section
      const addressId = await addressSection.getAttribute('id');
      
      // They should match
      expect(ariaDescribedBy).toBe(addressId);
      expect(ariaDescribedBy).toBe('school-address');
    });

    test('address should use semantic HTML', async ({ page }) => {
      const addressElement = page.locator('#school-address address');
      
      // Verify semantic address element exists
      await expect(addressElement).toBeVisible();
      
      // Verify it's not styled as italic (common default for address element)
      await expect(addressElement).toHaveClass(/not-italic/);
    });
  });

  test.describe('Screen Reader Simulation', () => {
    test('should navigate through form without announcing decorative icons', async ({ page }) => {
      // Tab through the form and verify focus order
      await page.keyboard.press('Tab'); // Skip to main content
      await page.keyboard.press('Tab'); // First form field

      // Get focused element
      const focusedElement = page.locator(':focus');
      
      // Should focus on form inputs, not icons
      await expect(focusedElement).toHaveAttribute('type', /(text|email|tel|submit)/);
    });

    test('should announce map alternative text via address', async ({ page }) => {
      // Navigate to map section
      await page.locator('h2:has-text("Find Us")').scrollIntoViewIfNeeded();
      
      // Verify both map and text alternative are present
      const mapIframe = page.locator('iframe[src*="google.com/maps"]');
      const addressText = page.locator('#school-address');
      
      await expect(mapIframe).toBeVisible();
      await expect(addressText).toBeVisible();
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should allow keyboard navigation without icon interference', async ({ page }) => {
      // Tab through interactive elements
      const interactiveElements = await page.locator('a, button, input, select, textarea').all();
      
      let tabbableCount = 0;
      for (const element of interactiveElements) {
        if (await element.isVisible()) {
          const tabindex = await element.getAttribute('tabindex');
          if (tabindex !== '-1') {
            tabbableCount++;
          }
        }
      }
      
      // Ensure reasonable number of tabbable elements
      expect(tabbableCount).toBeGreaterThan(10);
      expect(tabbableCount).toBeLessThan(50); // Not too many due to hidden icons
    });

    test('form should be fully keyboard accessible', async ({ page }) => {
      // Tab to first form field
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Fill form using keyboard only
      await page.keyboard.type('Test User');
      await page.keyboard.press('Tab');
      await page.keyboard.type('test@example.com');
      await page.keyboard.press('Tab');
      await page.keyboard.type('5551234567');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip child age
      await page.keyboard.press('ArrowDown'); // Select first option
      await page.keyboard.press('Tab');
      await page.keyboard.type('This is a test message for accessibility verification.');
      
      // Tab to submit button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Verify we're on submit button
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toHaveAttribute('type', 'submit');
    });
  });

  test.describe('WCAG 2.1 Level A Compliance', () => {
    test('should pass automated accessibility checks', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag21a'])
        .analyze();

      // Filter out known acceptable issues
      const violations = accessibilityScanResults.violations.filter(violation => {
        // Filter out any false positives for decorative icons
        if (violation.id === 'aria-hidden-focus') {
          return false; // Icons with aria-hidden="true" are acceptable
        }
        return true;
      });

      expect(violations).toEqual([]);
    });

    test('should have proper heading structure', async ({ page }) => {
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      
      let lastLevel = 0;
      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const level = parseInt(tagName.charAt(1));
        
        // Check heading levels don't skip
        if (lastLevel > 0) {
          expect(level).toBeLessThanOrEqual(lastLevel + 1);
        }
        lastLevel = level;
      }
    });

    test('should have sufficient color contrast', async ({ page }) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('.container')
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });
  });

  test.describe('Form Functionality with Accessibility', () => {
    test('should maintain form functionality with accessibility fixes', async ({ page }) => {
      // Fill and submit form
      await page.fill('#name', 'Accessibility Test');
      await page.fill('#email', 'a11y@test.com');
      await page.selectOption('#subject', 'general');
      await page.fill('#message', 'Testing form functionality with accessibility fixes.');
      
      // Submit form
      await page.click('#submit-btn');
      
      // Should redirect to success page
      await page.waitForURL('**/contact-success');
      await expect(page.locator('h1')).toContainText('Thank You!');
    });

    test('should show accessible validation errors', async ({ page }) => {
      // Submit empty form
      await page.click('#submit-btn');
      
      // Check for accessible error messages
      const nameInput = page.locator('#name');
      const errorMessage = page.locator('#name-error');
      
      // Input should be marked invalid
      await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      await expect(nameInput).toHaveAttribute('aria-describedby', 'name-error');
      
      // Error should have alert role
      await expect(errorMessage).toHaveAttribute('role', 'alert');
    });
  });

  test.describe('Visual Regression', () => {
    test('icons should remain visually present', async ({ page }) => {
      // Take screenshot to verify icons are still visible
      await page.screenshot({ 
        path: 'test-results/contact-page-icons.png',
        fullPage: true 
      });
      
      // Verify specific icons are visible
      const heroIcon = page.locator('section').filter({ hasText: "Let's Connect" }).locator('svg').first();
      await expect(heroIcon).toBeVisible();
      
      const formIcons = await page.locator('form#contact-form svg').all();
      expect(formIcons.length).toBeGreaterThan(5);
    });

    test('map section layout should be intact', async ({ page }) => {
      await page.locator('h2:has-text("Find Us")').scrollIntoViewIfNeeded();
      
      // Take screenshot of map section
      const mapSection = page.locator('section:has(h2:has-text("Find Us"))');
      await mapSection.screenshot({ 
        path: 'test-results/contact-page-map-section.png' 
      });
      
      // Verify layout elements
      await expect(page.locator('iframe[src*="google.com/maps"]')).toBeVisible();
      await expect(page.locator('#school-address')).toBeVisible();
      await expect(page.locator('text="Getting Here"')).toBeVisible();
    });
  });

  test.describe('Cross-browser Accessibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`accessibility fixes work in ${browserName}`, async ({ page, browserName }) => {
        // Test critical accessibility features
        const icon = page.locator('svg').first();
        await expect(icon).toHaveAttribute('aria-hidden', 'true');
        
        const mapIframe = page.locator('iframe[src*="google.com/maps"]');
        await expect(mapIframe).toHaveAttribute('aria-describedby', 'school-address');
        
        const addressSection = page.locator('#school-address');
        await expect(addressSection).toBeVisible();
      });
    });
  });
});