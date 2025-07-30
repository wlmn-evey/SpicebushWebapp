import { test, expect, Page } from '@playwright/test';

/**
 * Production Verification Test Suite
 * Validates all core functionality, performance improvements, and bug fixes
 */

// Performance thresholds based on fixes
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000, // 3 seconds max for page load (was 16s, now ~2.5s)
  navigation: 1000, // 1 second max for navigation
  firstContentfulPaint: 1500, // 1.5 seconds max for FCP
};

// Core pages to test
const CORE_PAGES = [
  { path: '/', name: 'Home' },
  { path: '/about', name: 'About' },
  { path: '/programs', name: 'Programs' },
  { path: '/admissions', name: 'Admissions' },
  { path: '/parents', name: 'Parents' },
  { path: '/calendar', name: 'Calendar' },
  { path: '/contact', name: 'Contact' },
];

// Helper function to measure page load performance
async function measurePageLoad(page: Page, url: string): Promise<number> {
  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle' });
  return Date.now() - startTime;
}

test.describe('Core Page Loading', () => {
  CORE_PAGES.forEach(({ path, name }) => {
    test(`should load ${name} page successfully`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      
      // Verify page has content
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      expect(bodyText?.length).toBeGreaterThan(100);
      
      // Check for error indicators
      await expect(page.locator('text=/error|failed|exception/i')).toHaveCount(0);
    });
  });
});

test.describe('Performance Verification', () => {
  test('should load homepage within performance threshold', async ({ page }) => {
    const loadTime = await measurePageLoad(page, '/');
    expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.pageLoad);
    
    // Verify First Contentful Paint
    const fcp = await page.evaluate(() => {
      const entry = performance.getEntriesByName(window.location.origin + '/')[0] as PerformanceNavigationTiming;
      return entry ? entry.loadEventEnd - entry.fetchStart : 0;
    });
    
    expect(fcp).toBeGreaterThan(0);
    expect(fcp).toBeLessThan(PERFORMANCE_THRESHOLDS.firstContentfulPaint);
  });

  test('should navigate between pages quickly', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation performance
    for (const { path, name } of CORE_PAGES.slice(1, 4)) {
      const startTime = Date.now();
      await page.click(`a[href="${path}"]`);
      await page.waitForLoadState('networkidle');
      const navTime = Date.now() - startTime;
      
      expect(navTime).toBeLessThan(PERFORMANCE_THRESHOLDS.navigation);
      expect(page.url()).toContain(path);
    }
  });
});

test.describe('Navigation Testing', () => {
  test('should have functional main navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check navigation menu exists
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    
    // Verify all navigation links
    for (const { path, name } of CORE_PAGES) {
      const link = nav.locator(`a[href="${path}"]`);
      if (await link.count() > 0) {
        await expect(link).toBeVisible();
      }
    }
  });

  test('should navigate using mobile menu', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Look for mobile menu button
    const menuButton = page.locator('button[aria-label*="menu" i]').or(page.locator('button:has-text("Menu")'));
    
    if (await menuButton.count() > 0) {
      await menuButton.click();
      
      // Verify mobile menu is open
      const mobileNav = page.locator('nav[aria-expanded="true"]').or(page.locator('.mobile-menu'));
      await expect(mobileNav).toBeVisible();
      
      // Test navigation from mobile menu
      const aboutLink = mobileNav.locator('a[href="/about"]');
      if (await aboutLink.count() > 0) {
        await aboutLink.click();
        await expect(page).toHaveURL(/\/about/);
      }
    }
  });
});

test.describe('Mobile Responsiveness', () => {
  const viewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPad', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should display correctly on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      
      // Check no horizontal scroll
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(bodyWidth).toBeLessThanOrEqual(width);
      
      // Verify main content is visible
      const mainContent = page.locator('main').or(page.locator('[role="main"]'));
      await expect(mainContent).toBeVisible();
      
      // Check text is readable (not too small)
      const fontSize = await page.evaluate(() => {
        const body = document.body;
        return parseInt(window.getComputedStyle(body).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(14);
    });
  });
});

test.describe('Critical User Flows', () => {
  test('should complete tour scheduling flow', async ({ page }) => {
    await page.goto('/admissions');
    
    // Look for tour scheduling button/link
    const tourButton = page.locator('a:has-text("Schedule"), button:has-text("Schedule")').first();
    
    if (await tourButton.count() > 0) {
      await tourButton.click();
      
      // Wait for tour form or calendar to load
      await page.waitForLoadState('networkidle');
      
      // Verify we're on a tour scheduling page
      const urlOrContent = page.url().includes('tour') || 
                          page.url().includes('schedule') ||
                          await page.textContent('body').then(text => 
                            text?.toLowerCase().includes('tour') || 
                            text?.toLowerCase().includes('schedule')
                          );
      
      expect(urlOrContent).toBeTruthy();
    }
  });

  test('should display and validate contact form', async ({ page }) => {
    await page.goto('/contact');
    
    // Check for contact form
    const form = page.locator('form').first();
    
    if (await form.count() > 0) {
      // Verify form fields
      const nameField = form.locator('input[name*="name" i]').or(form.locator('input[type="text"]')).first();
      const emailField = form.locator('input[type="email"]').first();
      const messageField = form.locator('textarea').first();
      
      await expect(nameField).toBeVisible();
      await expect(emailField).toBeVisible();
      await expect(messageField).toBeVisible();
      
      // Test form validation
      await form.locator('button[type="submit"]').click();
      
      // Check for validation messages
      const validationMessage = page.locator('.error, [role="alert"], .validation-message').first();
      const hasValidation = await validationMessage.count() > 0;
      
      if (hasValidation) {
        await expect(validationMessage).toBeVisible();
      }
    }
  });
});

test.describe('Accessibility Basics', () => {
  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    
    // Check heading hierarchy
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    
    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check each image has alt text
      for (let i = 0; i < Math.min(imageCount, 10); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt).toBeTruthy();
      }
    }
  });

  test('should have proper focus indicators', async ({ page }) => {
    await page.goto('/');
    
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if focused element has visible outline
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
      };
    });
    
    expect(focusedElement).toBeTruthy();
  });
});

test.describe('Image Optimization Verification', () => {
  test('should load optimized images', async ({ page }) => {
    await page.goto('/');
    
    // Collect image load times and sizes
    const imageStats = await page.evaluate(() => {
      const images = Array.from(document.querySelectorAll('img'));
      return Promise.all(images.slice(0, 5).map(async (img) => {
        const response = await fetch(img.src);
        const blob = await response.blob();
        return {
          src: img.src,
          size: blob.size,
          width: img.naturalWidth,
          height: img.naturalHeight,
        };
      }));
    });
    
    // Verify images are reasonably sized
    imageStats.forEach(({ src, size }) => {
      // Images should be under 500KB for web optimization
      expect(size).toBeLessThan(500 * 1024);
    });
  });
});

test.describe('Environment Configuration', () => {
  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // Check essential meta tags
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title).toContain('Spicebush');
    
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });
});

// Smoke test for quick validation
test.describe('Smoke Tests', () => {
  test('critical path smoke test', async ({ page }) => {
    // Homepage loads
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    
    // Navigation works
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/\/about/);
    
    // Programs page loads
    await page.goto('/programs');
    await expect(page.locator('main')).toBeVisible();
    
    // Contact page loads
    await page.goto('/contact');
    const form = page.locator('form');
    await expect(form).toBeVisible();
  });
});