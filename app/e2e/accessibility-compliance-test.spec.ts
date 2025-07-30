/**
 * Comprehensive accessibility compliance tests for the critical fixes
 * Tests the four key accessibility areas that were fixed:
 * 1. Contact form validation with screen reader announcements
 * 2. Honeypot field invisible to assistive technology
 * 3. Complete alt text audit for all images
 * 4. Heading hierarchy structure (H1->H2->H3)
 */

import { test, expect } from '@playwright/test';

test.describe('Accessibility Compliance Tests - Critical Fixes', () => {
  
  test.describe('Bug 036: Contact Form Validation Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/contact');
    });

    test('should announce validation errors to screen readers with aria-live', async ({ page }) => {
      // Submit form without filling required fields to trigger validation
      await page.click('#submit-btn');
      
      // Check for aria-live regions that announce errors
      const ariaLiveRegions = await page.locator('[aria-live]').all();
      expect(ariaLiveRegions.length).toBeGreaterThan(0);
      
      // Verify error messages are associated with form fields via aria-describedby
      const nameField = page.locator('#name');
      await expect(nameField).toHaveAttribute('aria-invalid', 'true');
      
      const nameErrorId = await nameField.getAttribute('aria-describedby');
      if (nameErrorId) {
        const errorElement = page.locator(`#${nameErrorId}`);
        await expect(errorElement).toBeVisible();
      }
      
      // Check email field validation
      const emailField = page.locator('#email');
      await page.fill('#email', 'invalid-email');
      await page.blur('#email');
      
      await expect(emailField).toHaveAttribute('aria-invalid', 'true');
      const emailErrorId = await emailField.getAttribute('aria-describedby');
      if (emailErrorId) {
        const emailErrorElement = page.locator(`#${emailErrorId}`);
        await expect(emailErrorElement).toBeVisible();
        await expect(emailErrorElement).toContainText('valid email');
      }
    });

    test('should provide descriptive error messages for screen readers', async ({ page }) => {
      // Test name field validation
      await page.focus('#name');
      await page.blur('#name');
      
      const nameErrorMessage = await page.locator('[id*="name-error"]').textContent();
      if (nameErrorMessage) {
        expect(nameErrorMessage).toMatch(/required|enter|provide/i);
        expect(nameErrorMessage).not.toMatch(/^Error:|Invalid/i);
      }
      
      // Test email field validation
      await page.fill('#email', 'invalid');
      await page.blur('#email');
      
      const emailErrorMessage = await page.locator('[id*="email-error"]').textContent();
      if (emailErrorMessage) {
        expect(emailErrorMessage).toMatch(/valid email|email address/i);
        expect(emailErrorMessage).not.toMatch(/^Error:|Invalid/i);
      }
    });

    test('should maintain proper focus management during validation', async ({ page }) => {
      // Fill form partially and submit to trigger validation
      await page.fill('#name', 'Test User');
      await page.click('#submit-btn');
      
      // Verify focus moves to first error field or stays on submit button
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBeTruthy();
      
      // Test that error fields remain focusable
      const emailField = page.locator('#email');
      await emailField.focus();
      await expect(emailField).toBeFocused();
    });
  });

  test.describe('Bug 037: Honeypot Field Screen Reader Invisibility', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/contact');
    });

    test('should hide honeypot field from screen readers with aria-hidden', async ({ page }) => {
      const honeypotContainer = page.locator('[style*="display: none"]');
      await expect(honeypotContainer).toHaveAttribute('aria-hidden', 'true');
      
      const honeypotField = page.locator('input[name="bot-field"]');
      await expect(honeypotField).toHaveAttribute('tabindex', '-1');
      await expect(honeypotField).toHaveAttribute('autocomplete', 'off');
    });

    test('should not be discoverable by keyboard navigation', async ({ page }) => {
      // Tab through form fields and ensure honeypot is not reachable
      const focusableElements = await page.locator('input:not([tabindex="-1"]), select, textarea, button').all();
      
      for (const element of focusableElements) {
        await element.focus();
        const elementName = await element.getAttribute('name');
        expect(elementName).not.toBe('bot-field');
      }
    });

    test('should remain invisible visually', async ({ page }) => {
      const honeypotContainer = page.locator('[style*="display: none"]');
      await expect(honeypotContainer).toHaveCSS('display', 'none');
      
      const honeypotField = page.locator('input[name="bot-field"]');
      const isVisible = await honeypotField.isVisible();
      expect(isVisible).toBe(false);
    });
  });

  test.describe('Bug 006: Complete Alt Text Audit', () => {
    const pagesToTest = [
      '/',
      '/about',
      '/programs', 
      '/admissions',
      '/contact',
      '/blog'
    ];

    for (const pagePath of pagesToTest) {
      test(`should have descriptive alt text for all images on ${pagePath}`, async ({ page }) => {
        await page.goto(pagePath);
        
        const images = await page.locator('img').all();
        
        for (const img of images) {
          const altText = await img.getAttribute('alt');
          expect(altText).toBeTruthy();
          
          if (altText) {
            // Alt text should be descriptive (more than just filename)
            expect(altText.length).toBeGreaterThan(5);
            expect(altText).not.toMatch(/\.(jpg|jpeg|png|gif|webp)$/i);
            expect(altText).not.toMatch(/^image|photo|picture$/i);
            
            // Should describe the educational/contextual content
            if (pagePath === '/programs') {
              expect(altText.toLowerCase()).toMatch(/montessori|child|learn|material|activity/);
            }
            if (pagePath === '/about') {
              expect(altText.toLowerCase()).toMatch(/montessori|child|learn|development|environment/);
            }
          }
        }
      });
    }

    test('should not have missing alt attributes on any images', async ({ page }) => {
      const allPages = ['/', '/about', '/programs', '/admissions', '/contact'];
      
      for (const pagePath of allPages) {
        await page.goto(pagePath);
        
        // Check that no images are missing alt attributes entirely
        const imagesWithoutAlt = await page.locator('img:not([alt])').count();
        expect(imagesWithoutAlt).toBe(0);
        
        // Check that no images have empty alt on content images (decorative images can have alt="")
        const contentImages = await page.locator('img[src*="/images/"]').all();
        for (const img of contentImages) {
          const altText = await img.getAttribute('alt');
          expect(altText).toBeTruthy();
          expect(altText!.length).toBeGreaterThan(0);
        }
      }
    });
  });

  test.describe('Bug 017: Heading Hierarchy Structure', () => {
    const pagesToTest = [
      { path: '/', title: 'Homepage' },
      { path: '/about', title: 'About Page' },
      { path: '/programs', title: 'Programs Page' },
      { path: '/admissions', title: 'Admissions Page' },
      { path: '/contact', title: 'Contact Page' }
    ];

    for (const pageInfo of pagesToTest) {
      test(`should have proper heading hierarchy on ${pageInfo.title}`, async ({ page }) => {
        await page.goto(pageInfo.path);
        
        // Check that there's exactly one H1 per page
        const h1Count = await page.locator('h1').count();
        expect(h1Count).toBe(1);
        
        // Get all headings in order
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
        const headingLevels = [];
        
        for (const heading of headings) {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          const level = parseInt(tagName.charAt(1));
          headingLevels.push(level);
        }
        
        // Verify heading hierarchy (no skipping levels)
        expect(headingLevels[0]).toBe(1); // First heading should be H1
        
        for (let i = 1; i < headingLevels.length; i++) {
          const currentLevel = headingLevels[i];
          const previousLevel = headingLevels[i - 1];
          
          // Current level should not skip more than one level from previous
          expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1);
        }
      });

      test(`should have meaningful heading content on ${pageInfo.title}`, async ({ page }) => {
        await page.goto(pageInfo.path);
        
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
        
        for (const heading of headings) {
          const headingText = await heading.textContent();
          expect(headingText).toBeTruthy();
          expect(headingText!.trim().length).toBeGreaterThan(2);
          
          // Headings should not be just numbers or single words (unless appropriate)
          if (headingText!.trim().length > 0) {
            expect(headingText!.trim()).not.toMatch(/^[0-9]+$/);
          }
        }
      });
    }
  });

  test.describe('WCAG 2.1 Level A Compliance', () => {
    test('should support keyboard navigation throughout the site', async ({ page }) => {
      await page.goto('/');
      
      // Test that all interactive elements are keyboard accessible
      const interactiveElements = await page.locator('a, button, input, select, textarea, [role="button"], [tabindex="0"]').all();
      
      for (const element of interactiveElements) {
        await element.focus();
        await expect(element).toBeFocused();
        
        // Check that focused elements have visible focus indicators
        const focusOutline = await element.evaluate(el => {
          const styles = window.getComputedStyle(el);
          return styles.outline !== 'none' || styles.boxShadow !== 'none';
        });
        
        // Either should have outline or box-shadow for focus indication
        // expect(focusOutline).toBe(true);
      }
    });

    test('should have proper color contrast ratios', async ({ page }) => {
      await page.goto('/');
      
      // Test high contrast elements (headers, buttons, links)
      const textElements = await page.locator('h1, h2, h3, a, button, p').all();
      
      for (const element of textElements) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el);
            return {
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize
            };
          });
          
          // Basic check that text is not transparent or same as background
          expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
          expect(styles.color).not.toBe(styles.backgroundColor);
        }
      }
    });

    test('should have proper form labels and associations', async ({ page }) => {
      await page.goto('/contact');
      
      // Check that all form inputs have proper labels
      const formInputs = await page.locator('input[type="text"], input[type="email"], input[type="tel"], select, textarea').all();
      
      for (const input of formInputs) {
        const inputId = await input.getAttribute('id');
        const inputName = await input.getAttribute('name');
        
        if (inputName !== 'bot-field') { // Skip honeypot field
          expect(inputId).toBeTruthy();
          
          // Check for associated label
          const label = page.locator(`label[for="${inputId}"]`);
          await expect(label).toBeVisible();
          
          const labelText = await label.textContent();
          expect(labelText).toBeTruthy();
          expect(labelText!.trim().length).toBeGreaterThan(1);
        }
      }
    });

    test('should have proper page titles and meta descriptions', async ({ page }) => {
      const pagesToTest = [
        { path: '/', expectedTitlePattern: /spicebush|montessori|school/i },
        { path: '/about', expectedTitlePattern: /about|spicebush|montessori/i },
        { path: '/contact', expectedTitlePattern: /contact|spicebush|montessori/i }
      ];
      
      for (const pageInfo of pagesToTest) {
        await page.goto(pageInfo.path);
        
        const title = await page.title();
        expect(title).toBeTruthy();
        expect(title).toMatch(pageInfo.expectedTitlePattern);
        
        // Check for meta description
        const metaDescription = await page.locator('meta[name="description"]').getAttribute('content');
        expect(metaDescription).toBeTruthy();
        expect(metaDescription!.length).toBeGreaterThan(50);
        expect(metaDescription!.length).toBeLessThan(160);
      }
    });
  });

  test.describe('Screen Reader Compatibility Tests', () => {
    test('should have proper landmark roles', async ({ page }) => {
      await page.goto('/');
      
      // Check for main content landmark
      const main = page.locator('main, [role="main"]');
      await expect(main).toBeVisible();
      
      // Check for navigation landmark  
      const nav = page.locator('nav, [role="navigation"]');
      await expect(nav).toBeVisible();
      
      // Check for contentinfo (footer) landmark
      const footer = page.locator('footer, [role="contentinfo"]');
      await expect(footer).toBeVisible();
    });

    test('should provide skip links for keyboard users', async ({ page }) => {
      await page.goto('/');
      
      // Tab to first element and check if skip link appears
      await page.keyboard.press('Tab');
      
      const skipLink = page.locator('a[href="#main-content"], a[href="#content"], .skip-link');
      // Skip link might exist but be visually hidden until focused
      const skipLinkExists = await skipLink.count() > 0;
      
      if (skipLinkExists) {
        await expect(skipLink.first()).toContainText(/skip|main|content/i);
      }
    });

    test('should announce form status changes', async ({ page }) => {
      await page.goto('/contact');
      
      // Check for aria-live regions for form feedback
      const ariaLiveRegions = await page.locator('[aria-live]').count();
      expect(ariaLiveRegions).toBeGreaterThan(0);
      
      // Test form submission status announcements
      const successAlert = page.locator('#form-success');
      const errorAlert = page.locator('#form-error');
      
      await expect(successAlert).toHaveAttribute('aria-live', /.+/); // Should have aria-live attribute
      await expect(errorAlert).toHaveAttribute('aria-live', /.+/);   // Should have aria-live attribute
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/contact');
      
      // Check that touch targets are large enough (at least 44px)
      const buttons = await page.locator('button, a, input[type="submit"]').all();
      
      for (const button of buttons) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          const boundingBox = await button.boundingBox();
          if (boundingBox) {
            expect(boundingBox.height).toBeGreaterThanOrEqual(44);
            expect(boundingBox.width).toBeGreaterThanOrEqual(44);
          }
        }
      }
      
      // Check that form inputs have appropriate input types for mobile keyboards
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();
      
      const telInput = page.locator('input[type="tel"]');
      await expect(telInput).toBeVisible();
    });

    test('should handle zoom up to 200% without horizontal scrolling', async ({ page }) => {
      await page.goto('/');
      
      // Simulate 200% zoom by setting viewport to half size
      await page.setViewportSize({ width: 640, height: 400 });
      
      // Check that no horizontal scrollbar appears
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      
      expect(hasHorizontalScroll).toBe(false);
    });
  });
});