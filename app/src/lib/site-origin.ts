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
/**
 * Hostnames that serve the canonical production site. Anything else — the
 * spicebush-testing.netlify.app default subdomain, deploy previews, branch
 * deploys, localhost — must never be indexed by search engines (#127).
 */
const PRODUCTION_HOSTNAMES = new Set(['spicebushmontessori.org', 'www.spicebushmontessori.org']);

export function isProductionHostname(hostname: string): boolean {
  return PRODUCTION_HOSTNAMES.has(hostname.toLowerCase());
}

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
