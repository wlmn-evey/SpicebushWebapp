/**
 * Shared site-origin resolver.
 *
 * Precedence: `site?.origin` → `process.env.PUBLIC_SITE_URL` → hardcoded prod fallback.
 * Hoisted verbatim from `robots.txt.ts` so the same resolution is reused by robots,
 * the blog sitemap shell, and per-post ogImage construction (PR-4).
 *
 * NOTE: a structurally-similar private `resolveSiteOrigin` exists in `seo-config.ts`
 * (accepts `URL | string`); this file is NOT a refactor of that helper.
 */
export function resolveSiteOrigin(site?: URL): string {
  if (site?.origin) return site.origin;

  if (typeof process !== 'undefined' && typeof process.env.PUBLIC_SITE_URL === 'string') {
    try {
      return new URL(process.env.PUBLIC_SITE_URL).origin;
    } catch {
      // fall through to fallback
    }
  }

  return 'https://spicebushmontessori.org';
}
