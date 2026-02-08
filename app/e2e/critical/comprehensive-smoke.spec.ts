import { expect, test } from '@playwright/test';

const ROUTES = [
  '/',
  '/about',
  '/our-principles',
  '/admissions',
  '/admissions/schedule-tour',
  '/admissions/tuition-calculator',
  '/contact',
  '/coming-soon',
  '/blog',
  '/donate',
  '/enrollment'
];

test.describe('Comprehensive Smoke', () => {
  test('core routes load without 5xx responses', async ({ page }) => {
    for (const route of ROUTES) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response, `No response for ${route}`).not.toBeNull();
      expect(response!.status(), `${route} returned server error`).toBeLessThan(500);
    }
  });

  test('homepage renders primary shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
  });

  test('admin and API access enforce auth boundaries', async ({ page }) => {
    const adminPage = await page.request.get('/admin/settings', { failOnStatusCode: false });
    expect([200, 302, 303, 401, 403]).toContain(adminPage.status());
    expect(adminPage.status()).toBeLessThan(500);

    // Do not follow redirects so we can validate the actual auth boundary response.
    const adminApi = await page.request.get('/api/admin/settings', {
      failOnStatusCode: false,
      maxRedirects: 0
    });
    expect([401, 403, 302, 303]).toContain(adminApi.status());

    const health = await page.request.get('/api/health', { failOnStatusCode: false });
    expect([200]).toContain(health.status());
  });
});
