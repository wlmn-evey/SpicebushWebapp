/**
 * Admin route protection used by the middleware.
 *
 * The check must run on the same (decoded) path the router matches. Checking the raw
 * `url.pathname` let `GET /%61dmin/...` skip auth while the router still rendered the
 * admin page. Astro 5.18.2 decodes `context.url` itself; this is defense in depth.
 */
export const PROTECTED_PREFIXES = [
  '/admin',
  '/api/admin',
  '/api/cms',
  '/api/media/upload',
  '/api/storage/stats',
  // Handler-enforced admin auth too; listed here so removing the handler check can't
  // expose them (#31).
  '/api/email/send',
  '/api/test-email'
];

const MAX_DECODE_PASSES = 3;

const finalize = (path: string): string => path.replace(/\/{2,}/g, '/').toLowerCase();

/**
 * Percent-decodes (including `%2F`, repeatedly for double-encoding), collapses repeated
 * slashes and lowercases a pathname for the protection check only. Returns null when
 * the raw path is malformed or never decodes to a stable value — callers must treat
 * that as protected (fail closed). A later pass that fails (e.g. a literal `%` left by
 * `%25`) keeps the last good decode so public URLs containing `%25` still work.
 */
export function normalizePathForAuth(pathname: string): string | null {
  let current = pathname;
  for (let pass = 0; pass < MAX_DECODE_PASSES; pass += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return pass === 0 ? null : finalize(current);
    }
    if (decoded === current) {
      return finalize(current);
    }
    current = decoded;
  }
  return null;
}

export function isProtectedRoute(pathname: string): boolean {
  const normalized = normalizePathForAuth(pathname);
  if (normalized === null) return true;
  return PROTECTED_PREFIXES.some(
    prefix => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}
