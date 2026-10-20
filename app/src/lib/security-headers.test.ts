import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, applySecurityHeaders } from './security-headers';

describe('applySecurityHeaders', () => {
  it('adds every baseline header to a plain response', () => {
    const response = applySecurityHeaders(new Response('<html></html>'));
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
  });

  it('does not overwrite headers a route set deliberately', () => {
    const response = applySecurityHeaders(
      new Response('x', {
        headers: { 'X-Frame-Options': 'SAMEORIGIN', 'Content-Type': 'image/svg+xml' }
      })
    );
    expect(response.headers.get('X-Frame-Options')).toBe('SAMEORIGIN');
    expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
  });

  it('never adds a Content-Security-Policy', () => {
    const response = applySecurityHeaders(new Response('x'));
    expect(response.headers.has('Content-Security-Policy')).toBe(false);
  });

  it('clones responses whose headers are immutable', () => {
    const immutable = Response.redirect('https://spicebushmontessori.org/', 302);
    const response = applySecurityHeaders(immutable);
    expect(response.status).toBe(302);
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});
