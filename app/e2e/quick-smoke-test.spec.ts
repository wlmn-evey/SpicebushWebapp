import { test, expect } from '@playwright/test';

/**
 * Quick Smoke Test - Focused on critical functionality
 * Run this for fast production verification
 */

test.describe('Quick Production Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Set a reasonable timeout for page loads
    page.setDefaultTimeout(30000);
  });

  test('Critical pages load successfully', async ({ page }) => {
    // Test homepage
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toBeVisible();
    
    // Test Programs page
    await page.goto('/programs');
    await expect(page.locator('main')).toBeVisible();
    
    // Test Admissions page
    await page.goto('/admissions');
    await expect(page.locator('h1, h2').first()).toBeVisible();
    
    // Test Contact page
    await page.goto('/contact');
    const formOrContent = page.locator('form, main');
    await expect(formOrContent.first()).toBeVisible();
  });

  test('Performance check - homepage loads under 5 seconds', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    console.log(`Homepage load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // 5 second threshold
  });

  test('Navigation works on desktop', async ({ page }) => {
    await page.goto('/');
    
    // Find and click a navigation link
    const navLinks = page.locator('nav a[href^="/"]');
    const linkCount = await navLinks.count();
    
    if (linkCount > 0) {
      // Click the first internal navigation link
      const firstLink = navLinks.first();
      const href = await firstLink.getAttribute('href');
      await firstLink.click();
      
      // Verify navigation occurred
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain(href);
    }
  });

  test('Mobile responsiveness - no horizontal scroll', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBe(false);
  });

  test('Images are optimized', async ({ page }) => {
    await page.goto('/');
    
    // Check first few images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    if (imageCount > 0) {
      // Check first image has reasonable size
      const firstImg = images.first();
      const src = await firstImg.getAttribute('src');
      
      if (src && !src.startsWith('data:')) {
        const response = await page.request.get(src);
        const size = (await response.body()).length;
        
        // Images should be under 1MB
        expect(size).toBeLessThan(1024 * 1024);
      }
    }
  });

  test('Contact form exists and is accessible', async ({ page }) => {
    await page.goto('/contact');
    
    const form = page.locator('form');
    if (await form.count() > 0) {
      // Check for basic form fields
      const inputs = form.locator('input, textarea, select');
      const inputCount = await inputs.count();
      expect(inputCount).toBeGreaterThan(0);
      
      // Check submit button exists
      const submitButton = form.locator('button[type="submit"], input[type="submit"]');
      await expect(submitButton.first()).toBeVisible();
    }
  });

  test('Tour scheduling link is findable', async ({ page }) => {
    await page.goto('/admissions');
    
    // Look for tour/schedule related links or buttons
    const tourElements = page.locator('a, button').filter({ 
      hasText: /tour|schedule|visit/i 
    });
    
    const tourCount = await tourElements.count();
    expect(tourCount).toBeGreaterThan(0);
  });
});