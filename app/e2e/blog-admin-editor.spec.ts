import { test, expect } from '@playwright/test';
import { authenticateAdmin } from './helpers/admin-auth';

/**
 * Blog V2 page-auth spike (R4-F22). Proves `context.addCookies` bootstraps a PAGE-level authenticated
 * admin session against the testing deploy — the prerequisite for every V2 browser-fixture gate.
 * Owner-run: needs a real, short-lived `E2E_ADMIN_SESSION` token (revoked after the run); skipped in
 * CI and whenever no token is configured. The TipTap-editor-interaction assertions are added in the
 * cutover PR, once the island is mounted in place of the body textarea.
 */
test.describe('Blog V2 — authenticated admin page-auth spike', () => {
  test('context.addCookies renders /admin/blog authenticated (not a sign-in redirect)', async ({
    context,
    page,
    baseURL
  }) => {
    test.skip(!process.env.E2E_ADMIN_SESSION, 'E2E_ADMIN_SESSION required for authenticated page-auth');

    const authenticated = await authenticateAdmin(context, baseURL!);
    expect(authenticated).toBe(true);

    const response = await page.goto('/admin/blog');
    expect(response?.status()).toBeLessThan(400);
    // The admin surface renders — a blog-management form posting to the content endpoint — rather
    // than the sign-in page a request-context-only auth would land on.
    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.locator('form[action="/api/admin/content"]').first()).toBeVisible();
  });
});
