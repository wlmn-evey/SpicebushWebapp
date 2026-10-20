/**
 * Source guards for /api/media/render, which fetches a remote image server-side.
 *
 * Absolute sources are limited to hosts this app actually serves from. The previous
 * rule (`*.netlify.app` containing "spicebush") let anyone register a matching Netlify
 * site and make the renderer fetch from it.
 */
const NETLIFY_SITE_HOST = 'spicebush-testing.netlify.app';

const STATIC_ALLOWED_HOSTS = new Set([
  'spicebushmontessori.org',
  'www.spicebushmontessori.org',
  NETLIFY_SITE_HOST
]);

/** Matches the media upload ceiling (10 MB default) with headroom. */
export const MAX_RENDER_SOURCE_BYTES = 15 * 1024 * 1024;

export function isAllowedRenderHost(hostname: string, requestHostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === requestHostname.toLowerCase()) return true;
  if (STATIC_ALLOWED_HOSTS.has(host)) return true;
  // Deploy previews / branch deploys of this Netlify site only (`<prefix>--<site>.netlify.app`).
  return /^[a-z0-9-]+--spicebush-testing\.netlify\.app$/.test(host);
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * For a `redirect: 'manual'` response: `undefined` when it isn't a redirect, `null` when the
 * redirect leaves the allowlist (or is malformed), otherwise the next URL to fetch.
 */
export function resolveRedirectTarget(
  response: Response,
  currentUrl: URL,
  requestHostname: string
): URL | null | undefined {
  if (!REDIRECT_STATUSES.has(response.status)) return undefined;
  const location = response.headers.get('location');
  if (!location) return null;
  let next: URL;
  try {
    next = new URL(location, currentUrl);
  } catch {
    return null;
  }
  if (next.protocol !== 'https:' && next.protocol !== 'http:') return null;
  return isAllowedRenderHost(next.hostname, requestHostname) ? next : null;
}

/**
 * Reads a fetch() body into memory, giving up (null) once it exceeds `maxBytes`.
 * Rejects early on an oversized Content-Length without reading the body.
 */
export async function readBodyWithLimit(
  response: Response,
  maxBytes: number = MAX_RENDER_SOURCE_BYTES
): Promise<Buffer | null> {
  const declared = Number.parseInt(response.headers.get('content-length') ?? '', 10);
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel().catch(() => undefined);
    return null;
  }

  if (!response.body) return null;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks, total);
}
