import { test, expect } from '@playwright/test';
import { devices } from '@playwright/test';

/**
 * Visual regression tests for critical UI components
 * These tests capture screenshots and compare against baselines
 */

test.describe('Visual Regression Tests', () => {
  // Define viewports for testing
  const viewports = [
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'mobile', width: 375, height: 667 },
  ];

  test.describe('Footer Accessibility', () => {
    viewports.forEach(({ name, width, height }) => {
      test(`footer contrast and layout - ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        
        // Scroll to footer
        await page.evaluate(() => {
          document.querySelector('footer')?.scrollIntoView();
        });
        
        // Wait for any animations
        await page.waitForTimeout(500);
        
        // Capture footer screenshot
        const footer = page.locator('footer');
        await expect(footer).toHaveScreenshot(`footer-${name}.png`, {
          fullPage: false,
          animations: 'disabled',
        });
      });

      test(`footer links hover state - ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        
        await page.evaluate(() => {
          document.querySelector('footer')?.scrollIntoView();
        });
        
        // Hover over a link to capture hover state
        const link = page.locator('footer a.text-light-stone').first();
        await link.hover();
        await page.waitForTimeout(300); // Wait for transition
        
        await expect(link).toHaveScreenshot(`footer-link-hover-${name}.png`);
      });
    });

    test('footer color contrast verification', async ({ page }) => {
      await page.goto('/');
      
      // Inject axe-core for automated contrast checking
      await page.addScriptTag({
        url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js'
      });
      
      // Run contrast check on footer
      const contrastResults = await page.evaluate(() => {
        return new Promise((resolve) => {
          // @ts-ignore
          axe.run('footer', {
            rules: ['color-contrast']
          }, (err, results) => {
            resolve(results.violations);
          });
        });
      });
      
      expect(contrastResults).toHaveLength(0);
    });
  });

  test.describe('Hours Widget Display', () => {
    viewports.forEach(({ name, width, height }) => {
      test(`hours widget layout - ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        
        // Scroll to hours widget
        await page.evaluate(() => {
          document.querySelector('#sbms-hours-widget')?.scrollIntoView();
        });
        
        // Wait for widget to load
        await page.waitForSelector('#hours-list li', { timeout: 5000 });
        await page.waitForTimeout(1000); // Wait for animations
        
        const widget = page.locator('#sbms-hours-widget');
        await expect(widget).toHaveScreenshot(`hours-widget-${name}.png`, {
          animations: 'disabled',
        });
      });

      test(`friday hours display - ${name}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await page.goto('/');
        
        await page.evaluate(() => {
          document.querySelector('#sbms-hours-widget')?.scrollIntoView();
        });
        
        await page.waitForSelector('#hours-list li:has-text("Friday")', { timeout: 5000 });
        
        // Capture just Friday's hours
        const fridayHours = page.locator('#hours-list li:has-text("Friday")');
        await expect(fridayHours).toHaveScreenshot(`friday-hours-${name}.png`);
      });
    });

    test('hours widget legend visibility', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        document.querySelector('#sbms-hours-widget')?.scrollIntoView();
      });
      
      const legend = page.locator('#sbms-legend');
      await expect(legend).toHaveScreenshot('hours-legend.png');
    });
  });

  test.describe('Admin Login UI', () => {
    test('login form appearance', async ({ page }) => {
      await page.goto('/admin');
      
      // Wait for form to be visible
      await page.waitForSelector('form', { timeout: 5000 });
      
      const loginForm = page.locator('form').first();
      await expect(loginForm).toHaveScreenshot('admin-login-form.png');
    });

    test('login form with validation errors', async ({ page }) => {
      await page.goto('/admin');
      
      // Submit empty form to trigger validation
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
      
      const loginForm = page.locator('form').first();
      await expect(loginForm).toHaveScreenshot('admin-login-errors.png');
    });
  });

  test.describe('Email Display Consistency', () => {
    test('footer email display', async ({ page }) => {
      await page.goto('/');
      
      await page.evaluate(() => {
        document.querySelector('footer')?.scrollIntoView();
      });
      
      const emailLink = page.locator('a[href^="mailto:"]').first();
      await expect(emailLink).toHaveScreenshot('email-display.png');
    });
  });

  test.describe('Mobile Specific Visual Tests', () => {
    test('mobile navigation menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      // Open mobile menu if present
      const menuButton = page.locator('button[aria-label*="menu" i]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(500); // Wait for animation
        
        const nav = page.locator('nav');
        await expect(nav).toHaveScreenshot('mobile-nav-open.png');
      }
    });

    test('mobile hours widget layout', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      
      await page.evaluate(() => {
        document.querySelector('#sbms-hours-widget')?.scrollIntoView();
      });
      
      await page.waitForSelector('#hours-list li', { timeout: 5000 });
      
      const widget = page.locator('#sbms-hours-widget');
      await expect(widget).toHaveScreenshot('mobile-hours-widget.png', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Dark Mode Support', () => {
    test('footer in dark mode', async ({ page }) => {
      // Emulate dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.goto('/');
      
      await page.evaluate(() => {
        document.querySelector('footer')?.scrollIntoView();
      });
      
      const footer = page.locator('footer');
      await expect(footer).toHaveScreenshot('footer-dark-mode.png');
    });
  });

  test.describe('High Contrast Mode', () => {
    test('footer in high contrast', async ({ page }) => {
      // Emulate high contrast mode
      await page.emulateMedia({ forcedColors: 'active' });
      await page.goto('/');
      
      await page.evaluate(() => {
        document.querySelector('footer')?.scrollIntoView();
      });
      
      const footer = page.locator('footer');
      await expect(footer).toHaveScreenshot('footer-high-contrast.png');
    });
  });

  test.describe('Print Styles', () => {
    test('footer print layout', async ({ page }) => {
      await page.goto('/');
      
      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      
      await page.evaluate(() => {
        document.querySelector('footer')?.scrollIntoView();
      });
      
      const footer = page.locator('footer');
      await expect(footer).toHaveScreenshot('footer-print.png');
    });
  });
});

// Configuration for visual regression baseline management
test.describe('Baseline Management', () => {
  test('update baselines command', async ({ page }) => {
    // This test documents how to update baselines
    // Run with: npx playwright test --update-snapshots
    test.skip();
  });

  test('review baseline differences', async ({ page }) => {
    // This test documents how to review differences
    // After test failure, check: npx playwright show-report
    test.skip();
  });
});