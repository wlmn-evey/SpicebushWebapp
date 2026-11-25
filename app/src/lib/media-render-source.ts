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

export const ALLOWED_MEDIA_PATH_PREFIXES = ['/images/', '/uploads/', '/api/media/blob/'] as const;

const ALLOWED_RASTER_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif'
]);

export function isAllowedRasterContentType(contentType: string): boolean {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  return ALLOWED_RASTER_IMAGE_TYPES.has(mime);
}

export function isAllowedMediaPath(pathname: string): boolean {
  if (pathname.startsWith('/api/media/render')) return false;
  return ALLOWED_MEDIA_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

export function isAllowedRenderHost(hostname: string, requestHostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === requestHostname.toLowerCase()) return true;
  if (STATIC_ALLOWED_HOSTS.has(host)) return true;
  // Deploy previews / branch deploys of this Netlify site only (`<prefix>--<site>.netlify.app`).
  return /^[a-z0-9-]+--spicebush-testing\.netlify\.app$/.test(host);
}

const isAllowedPort = (candidate: URL, reference: URL): boolean => {
  if (!candidate.port) return true;
  return (
    candidate.hostname.toLowerCase() === reference.hostname.toLowerCase() &&
    candidate.port === reference.port
  );
};

/**
 * Resolves and validates a media URL (relative or absolute) against the allowed hosts,
 * normalized path prefixes, port restrictions, and self-recursion blocklist.
 */
export function resolveSafeMediaSourceUrl(rawSrc: string, requestUrl: URL): URL | null {
  const src = rawSrc.trim();
  if (!src) return null;

  let resolved: URL;
  if (src.startsWith('/')) {
    if (src.startsWith('//')) return null;
    try {
      resolved = new URL(src, requestUrl.origin);
    } catch {
      return null;
    }
    if (resolved.origin !== requestUrl.origin) return null;
  } else {
    try {
      resolved = new URL(src);
    } catch {
      return null;
    }
    const isSameOriginLocalHttp =
      resolved.protocol === 'http:' &&
      resolved.origin === requestUrl.origin &&
      (resolved.hostname === 'localhost' || resolved.hostname === '127.0.0.1');
    if (resolved.protocol !== 'https:' && !isSameOriginLocalHttp) {
      return null;
    }
    if (!isAllowedRenderHost(resolved.hostname, requestUrl.hostname)) {
      return null;
    }
    if (!isAllowedPort(resolved, requestUrl)) {
      return null;
    }
  }

  if (!isAllowedMediaPath(resolved.pathname)) {
    return null;
  }

  return resolved;
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
  const isLocalHttp =
    next.protocol === 'http:' && (next.hostname === 'localhost' || next.hostname === '127.0.0.1');
  if (next.protocol !== 'https:' && !isLocalHttp) return null;
  if (!isAllowedRenderHost(next.hostname, requestHostname)) return null;
  if (!isAllowedPort(next, currentUrl)) return null;
  if (!isAllowedMediaPath(next.pathname)) return null;
  return next;
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
