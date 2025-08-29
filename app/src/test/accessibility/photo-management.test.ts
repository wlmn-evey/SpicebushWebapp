/**
 * Accessibility Tests for Photo Management System
 * 
 * Tests WCAG compliance and accessibility features including:
 * - Screen reader compatibility
 * - Keyboard navigation
 * - Color contrast
 * - ARIA attributes
 * - Focus management
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Photo Management Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      document.cookie = 'sbms-admin-auth=bypass; path=/';
    });

    // Mock photo data
    const mockPhotos = [
      {
        id: '1',
        name: 'classroom-photo.jpg',
        url: 'https://example.com/classroom.jpg',
        path: 'https://example.com/classroom.jpg'
      },
      {
        id: '2', 
        name: 'outdoor-play.jpg',
        url: 'https://example.com/outdoor.jpg',
        path: 'https://example.com/outdoor.jpg'
      }
    ];

    await page.route('**/api/cms/media', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockPhotos)
      });
    });
  });

  test('photo management page should be accessible', async ({ page }) => {
    await page.goto('/admin/photos');
    
    // Wait for content to load
    await page.waitForSelector('.photo-card', { timeout: 5000 });

    // Run axe accessibility checks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('photo upload page should be accessible', async ({ page }) => {
    await page.goto('/admin/photos/upload');

    // Run axe accessibility checks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('h1');

    // Check heading levels
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);

    const h1Text = await page.locator('h1').textContent();
    expect(h1Text).toContain('Photo Management');

    // Check that h2s exist for sections
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('should have proper focus management in modal', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Open modal
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-photo-url]').click();

    // Modal should be open and focused
    const modal = page.locator('#photo-modal');
    await expect(modal).toHaveClass(/modal--open/);

    // Close button should be focusable
    const closeButton = modal.locator('.modal-close');
    await closeButton.focus();
    await expect(closeButton).toBeFocused();

    // Escape key should close modal
    await page.keyboard.press('Escape');
    await expect(modal).not.toHaveClass(/modal--open/);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Tab through interactive elements
    await page.keyboard.press('Tab'); // Should focus on first interactive element
    
    // Find all focusable elements
    const focusableElements = await page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])').all();
    expect(focusableElements.length).toBeGreaterThan(0);

    // Test that Tab moves focus forward
    const firstFocusable = focusableElements[0];
    await firstFocusable.focus();
    await expect(firstFocusable).toBeFocused();

    // Test Shift+Tab moves focus backward
    if (focusableElements.length > 1) {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      await expect(firstFocusable).toBeFocused();
    }
  });

  test('should have accessible image alt text', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-image');

    // All images should have alt text
    const images = page.locator('img.photo-image');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const altText = await img.getAttribute('alt');
      expect(altText).toBeTruthy();
      expect(altText?.length).toBeGreaterThan(0);
    }
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Check for proper ARIA attributes
    
    // Status messages should have role="alert"
    const statusMessages = page.locator('[role="alert"]');
    if (await statusMessages.count() > 0) {
      await expect(statusMessages.first()).toHaveAttribute('role', 'alert');
    }

    // Buttons should have accessible names
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const textContent = await button.textContent();
      const title = await button.getAttribute('title');
      
      // Button should have accessible name from one of these sources
      expect(ariaLabel || textContent?.trim() || title).toBeTruthy();
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Run specific color contrast checks
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('.photo-card')
      .analyze();

    // Filter for color contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });

  test('should handle screen reader announcements', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Check for aria-live regions for dynamic content
    const liveRegions = page.locator('[aria-live]');
    
    // Should have live regions for status updates
    if (await liveRegions.count() > 0) {
      const liveRegion = liveRegions.first();
      const ariaLive = await liveRegion.getAttribute('aria-live');
      expect(['polite', 'assertive']).toContain(ariaLive);
    }
  });

  test('should provide skip links for keyboard users', async ({ page }) => {
    await page.goto('/admin/photos');

    // Check for skip navigation links
    const skipLinks = page.locator('a[href^="#"]').filter({ hasText: /skip/i });
    
    if (await skipLinks.count() > 0) {
      const skipLink = skipLinks.first();
      await skipLink.focus();
      await expect(skipLink).toBeVisible();
    }
  });

  test('should have accessible form labels on upload page', async ({ page }) => {
    await page.goto('/admin/photos/upload');

    // All form inputs should have associated labels
    const inputs = page.locator('input, textarea, select');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const inputId = await input.getAttribute('id');
      const inputName = await input.getAttribute('name');
      
      if (inputId) {
        // Should have associated label
        const label = page.locator(`label[for="${inputId}"]`);
        await expect(label).toBeVisible();
      } else if (inputName) {
        // Should have aria-label or be wrapped in label
        const ariaLabel = await input.getAttribute('aria-label');
        const wrappingLabel = input.locator('xpath=ancestor::label');
        
        expect(ariaLabel || await wrappingLabel.count() > 0).toBeTruthy();
      }
    }
  });

  test('should have accessible error messages', async ({ page }) => {
    await page.goto('/admin/photos/upload');

    // Test form validation error accessibility
    await page.locator('button[type="submit"]').click();

    // Wait for any validation errors
    await page.waitForTimeout(500);

    // Check for accessible error messages
    const errorMessages = page.locator('.field-error, [role="alert"]');
    const errorCount = await errorMessages.count();

    if (errorCount > 0) {
      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        
        // Error should be visible
        await expect(error).toBeVisible();
        
        // Error should have content
        const errorText = await error.textContent();
        expect(errorText?.trim().length).toBeGreaterThan(0);
      }

      // Form fields with errors should have aria-invalid
      const invalidFields = page.locator('[aria-invalid="true"]');
      expect(await invalidFields.count()).toBeGreaterThan(0);
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Enable high contrast mode simulation
    await page.emulateMedia({ 
      colorScheme: 'dark',
      forcedColors: 'active'
    });

    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Run accessibility checks in high contrast mode
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be accessible with screen reader simulation', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Navigate using only keyboard (simulating screen reader)
    const currentElement = null;
    const focusableElements = await page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])').all();

    for (const element of focusableElements.slice(0, 5)) { // Test first 5 elements
      await element.focus();
      
      // Each element should be focusable and have accessible name
      await expect(element).toBeFocused();
      
      const accessibleName = await element.evaluate((el) => {
        // Simulate how screen readers compute accessible name
        return (el as any).ariaLabel || 
               el.textContent?.trim() || 
               el.getAttribute('title') ||
               el.getAttribute('alt') ||
               (el as HTMLInputElement).placeholder;
      });
      
      expect(accessibleName).toBeTruthy();
    }
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Simulate reduced motion preference
    await page.emulateMedia({ 
      reducedMotion: 'reduce'
    });

    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Check that animations are reduced/removed
    const elementsWithTransition = page.locator('[class*="transition"], [style*="transition"]');
    const count = await elementsWithTransition.count();

    if (count > 0) {
      // Should respect reduced motion preference
      for (let i = 0; i < Math.min(count, 3); i++) {
        const element = elementsWithTransition.nth(i);
        const transitionDuration = await element.evaluate(el => 
          getComputedStyle(el).transitionDuration
        );
        
        // Should have no transition or very short duration
        expect(['0s', '0.01s']).toContain(transitionDuration);
      }
    }
  });

  test('should maintain focus trap in modal', async ({ page }) => {
    await page.goto('/admin/photos');
    await page.waitForSelector('.photo-card');

    // Open modal
    const firstCard = page.locator('.photo-card').first();
    await firstCard.hover();
    await firstCard.locator('[data-photo-url]').click();

    const modal = page.locator('#photo-modal');
    await expect(modal).toHaveClass(/modal--open/);

    // Get focusable elements within modal
    const modalFocusable = modal.locator('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    const focusableCount = await modalFocusable.count();

    if (focusableCount > 0) {
      // Focus should be trapped within modal
      const firstFocusable = modalFocusable.first();
      const lastFocusable = modalFocusable.last();

      // Tab from last element should go to first
      await lastFocusable.focus();
      await page.keyboard.press('Tab');
      await expect(firstFocusable).toBeFocused();

      // Shift+Tab from first element should go to last
      await firstFocusable.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(lastFocusable).toBeFocused();
    }
  });
});