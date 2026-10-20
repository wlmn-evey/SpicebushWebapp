/**
 * Baseline security headers for SSR responses.
 *
 * netlify.toml `[[headers]]` only reach static files served by the CDN, not responses
 * produced by the SSR function, so the middleware stamps these on every response.
 * A header a route already set (e.g. the blob route's CSP) is never overwritten.
 * No page is meant to be framed (no same-origin iframes), hence DENY.
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
};

const stamp = (headers: Headers): void => {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) {
      headers.set(name, value);
    }
  }
};

export function applySecurityHeaders(response: Response): Response {
  try {
    stamp(response.headers);
    return response;
  } catch {
    // Responses proxied from fetch() carry immutable headers; clone before stamping.
    const copy = new Response(response.body, response);
    stamp(copy.headers);
    return copy;
  }
}
