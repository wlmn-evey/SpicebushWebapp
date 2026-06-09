import type { BrowserContext } from '@playwright/test';

/** The live admin session cookie name (app/src/lib/auth/admin-session.ts:18). */
export const ADMIN_SESSION_COOKIE = 'sbms-admin-session';

/**
 * Bootstrap an authenticated admin browser context by adding the session cookie with the EXACT
 * attributes the app sets at `auth/callback.astro` (path '/', httpOnly, sameSite 'Lax', secure on
 * HTTPS). This is PAGE-level auth — unlike the request-context `Cookie` header in `blog.spec.ts`
 * test 24, which bypasses cookie-attribute matching and does not prove a page renders authenticated
 * (R4-F22). Reusable across the V2 browser-fixture gates (editor, dashboard, ticker, AI).
 *
 * The value is a real, short-lived session token the owner provisions via `E2E_ADMIN_SESSION` and
 * revokes after the run. Returns false (the caller should skip) when no token is configured.
 */
export async function authenticateAdmin(
  context: BrowserContext,
  baseURL: string
): Promise<boolean> {
  const token = process.env.E2E_ADMIN_SESSION;
  if (!token) return false;
  const url = new URL(baseURL);
  await context.addCookies([
    {
      name: ADMIN_SESSION_COOKIE,
      value: token,
      domain: url.hostname,
      path: '/',
      httpOnly: true,
      secure: url.protocol === 'https:',
      sameSite: 'Lax'
    }
  ]);
  return true;
}
