import { test, expect } from '@playwright/test';

// Quick smoke test - runs essential checks in under 30 seconds
test.describe('Quick Smoke Test', () => {
  test.describe.configure({ mode: 'parallel' });

  test('homepage loads without errors @smoke', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Quick checks
    await expect(page.locator('h1')).toBeVisible({ timeout: 5000 });
    expect(errors).toHaveLength(0);
  });

  test('navigation works @smoke', async ({ page }) => {
    await page.goto('/');
    
    // Test one critical navigation
    await page.click('a[href="/about"]');
    await expect(page).toHaveURL(/\/about/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('API health check @smoke', async ({ page }) => {
    const response = await page.request.get('/api/health', {
      failOnStatusCode: false
    });
    
    // 404 is OK (endpoint might not exist), 500 is not
    expect(response.status()).toBeLessThan(500);
  });

  test('no redirect loops @smoke', async ({ page }) => {
    let redirectCount = 0;
    
    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        redirectCount++;
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    expect(redirectCount).toBeLessThanOrEqual(1);
  });

  test('critical forms are present @smoke', async ({ page }) => {
    await page.goto('/contact');
    
    const form = await page.$('form');
    expect(form).not.toBeNull();
    
    const submitButton = await page.$('button[type="submit"]');
    expect(submitButton).not.toBeNull();
  });

  test('mobile menu works @smoke', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    await page.goto('/');
    
    const menuButton = await page.$('button[aria-label*="menu"], .mobile-menu-toggle');
    expect(menuButton).not.toBeNull();
  });

  test('coming soon mode check @smoke', async ({ page }) => {
    const response = await page.goto('/');
    
    // Should not error regardless of mode
    expect(response?.status()).toBeLessThan(500);
    
    // Should show either normal site or coming soon
    const isComingSoon = page.url().includes('coming-soon');
    const hasNav = await page.$('nav');
    
    expect(isComingSoon || hasNav !== null).toBeTruthy();
  });
});

// Ultra-fast critical path test - for CI/CD pipelines
test.describe('Critical Path Test', () => {
  test('critical user journey @critical', async ({ page }) => {
    // Homepage
    await page.goto('/');
    const homeTitle = await page.textContent('h1');
    expect(homeTitle).toBeTruthy();

    // Programs page
    await page.goto('/programs');
    await expect(page.locator('h1')).toContainText('Programs');

    // Contact form
    await page.goto('/contact');
    const contactForm = await page.$('form');
    expect(contactForm).not.toBeNull();

    // Tour registration
    await page.goto('/admissions/tours');
    const tourForm = await page.$('form');
    expect(tourForm).not.toBeNull();
  });
});