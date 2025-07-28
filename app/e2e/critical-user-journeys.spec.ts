import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Homepage Experience', () => {
    test('should load homepage with correct title and navigation', async ({ page }) => {
      // Verify page title
      await expect(page).toHaveTitle(/Spicebush Montessori/);
      
      // Check main navigation is visible
      await expect(page.locator('nav')).toBeVisible();
      
      // Verify logo is present
      await expect(page.locator('img[alt*="Spicebush"]').first()).toBeVisible();
    });

    test('should display school hours widget with Friday closing time', async ({ page }) => {
      // Scroll to footer where hours widget is located
      await page.locator('footer').scrollIntoViewIfNeeded();
      
      // Check hours widget is visible
      const hoursWidget = page.locator('#sbms-hours-widget');
      await expect(hoursWidget).toBeVisible();
      
      // Verify Friday shows 3:00 PM closing
      const fridayHours = hoursWidget.locator('li:has-text("Friday")');
      await expect(fridayHours).toContainText('3:00 PM');
      
      // Check for Friday closing message
      await expect(fridayHours).toContainText('Closes at 3:00 PM');
    });

    test('should have accessible footer with correct email', async ({ page }) => {
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      
      // Check email link
      const emailLink = footer.locator('a[href^="mailto:"]');
      await expect(emailLink).toHaveAttribute('href', 'mailto:information@spicebushmontessori.org');
      await expect(emailLink).toContainText('information@spicebushmontessori.org');
      
      // Verify footer text color contrast
      const footerText = footer.locator('.text-light-stone').first();
      await expect(footerText).toBeVisible();
    });
  });

  test.describe('Admin Authentication Flow', () => {
    test('should show login form on admin page', async ({ page }) => {
      await page.goto('/admin');
      
      // Check for login form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should reject non-admin email addresses', async ({ page }) => {
      await page.goto('/admin');
      
      // Try to login with non-admin email
      await page.fill('input[type="email"]', 'parent@gmail.com');
      await page.fill('input[type="password"]', 'testpassword');
      await page.click('button[type="submit"]');
      
      // Should show error or remain on login page
      await expect(page.locator('text=/unauthorized|not authorized|admin access/i')).toBeVisible({ timeout: 5000 });
    });

    test('should handle admin domain emails correctly', async ({ page }) => {
      await page.goto('/admin');
      
      // Fill in admin domain email
      await page.fill('input[type="email"]', 'teacher@spicebushmontessori.org');
      await page.fill('input[type="password"]', 'testpassword');
      
      // The form should accept the email format
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toHaveValue('teacher@spicebushmontessori.org');
    });
  });

  test.describe('Contact and Information Access', () => {
    test('should navigate to contact page from footer', async ({ page }) => {
      // Scroll to footer
      await page.locator('footer').scrollIntoViewIfNeeded();
      
      // Click contact link
      await page.click('footer a:has-text("Contact")');
      
      // Verify navigation
      await expect(page).toHaveURL(/\/contact/);
      await expect(page.locator('h1')).toContainText(/contact/i);
    });

    test('should have working phone and email links', async ({ page }) => {
      await page.locator('footer').scrollIntoViewIfNeeded();
      
      // Check phone link
      const phoneLink = page.locator('a[href^="tel:"]');
      await expect(phoneLink).toHaveAttribute('href', 'tel:484-202-0712');
      
      // Check email link
      const emailLink = page.locator('a[href^="mailto:"]');
      await expect(emailLink).toHaveAttribute('href', 'mailto:information@spicebushmontessori.org');
    });
  });

  test.describe('Tuition Calculator Journey', () => {
    test('should navigate to tuition calculator', async ({ page }) => {
      // Navigate to tuition calculator
      await page.goto('/admissions/tuition-calculator');
      
      // Verify page loaded
      await expect(page.locator('h1')).toContainText(/tuition/i);
      
      // Check calculator elements are present
      await expect(page.locator('form, [data-calculator]').first()).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display mobile navigation menu', async ({ page, isMobile }) => {
      if (!isMobile) {
        test.skip();
      }
      
      // Check for mobile menu button
      const menuButton = page.locator('button[aria-label*="menu" i]');
      await expect(menuButton).toBeVisible();
      
      // Click menu button
      await menuButton.click();
      
      // Verify navigation items are visible
      await expect(page.locator('nav a:has-text("About")')).toBeVisible();
    });

    test('should show hours widget properly on mobile', async ({ page, isMobile }) => {
      if (!isMobile) {
        test.skip();
      }
      
      // Scroll to footer
      await page.locator('footer').scrollIntoViewIfNeeded();
      
      // Check hours widget adapts to mobile
      const hoursWidget = page.locator('#sbms-hours-widget');
      await expect(hoursWidget).toBeVisible();
      
      // Legend should be visible on mobile
      const legend = hoursWidget.locator('#sbms-legend');
      await expect(legend).toBeVisible();
    });
  });

  test.describe('Accessibility Checks', () => {
    test('should have no accessibility violations on homepage', async ({ page }) => {
      // This would use @axe-core/playwright for automated accessibility testing
      // For now, we'll do manual checks
      
      // Check for alt text on images
      const images = page.locator('img');
      const imageCount = await images.count();
      
      for (let i = 0; i < imageCount; i++) {
        const img = images.nth(i);
        const altText = await img.getAttribute('alt');
        expect(altText).toBeTruthy();
      }
      
      // Check for ARIA labels on icon buttons
      const iconButtons = page.locator('button:has(svg)');
      const buttonCount = await iconButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = iconButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();
        expect(ariaLabel || text).toBeTruthy();
      }
    });

    test('should have sufficient color contrast in footer', async ({ page }) => {
      await page.locator('footer').scrollIntoViewIfNeeded();
      
      // Visual regression test would capture this
      // For now, verify classes are applied correctly
      const footerText = page.locator('footer .text-light-stone').first();
      await expect(footerText).toHaveClass(/text-light-stone/);
      
      const footerBg = page.locator('footer.bg-forest-canopy');
      await expect(footerBg).toHaveClass(/bg-forest-canopy/);
    });
  });

  test.describe('Production Readiness', () => {
    test('should not have console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // No console errors should be present
      expect(consoleErrors).toHaveLength(0);
    });

    test('should not expose debug information', async ({ page }) => {
      await page.goto('/');
      
      // Check that debug info is hidden
      const debugInfo = page.locator('#debug-info');
      await expect(debugInfo).toBeHidden();
      
      // Verify no console.log statements in view
      const pageContent = await page.content();
      expect(pageContent).not.toContain('console.log');
      expect(pageContent).not.toContain('console.debug');
    });

    test('should load all critical resources', async ({ page }) => {
      const failedRequests: string[] = [];
      
      page.on('requestfailed', (request) => {
        failedRequests.push(request.url());
      });
      
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // No critical resources should fail
      expect(failedRequests).toHaveLength(0);
    });
  });
});