import { describe, expect, it } from 'vitest';
import {
  isAllowedRenderHost,
  readBodyWithLimit,
  resolveRedirectTarget
} from './media-render-source';

describe('isAllowedRenderHost', () => {
  it.each([
    'spicebushmontessori.org',
    'www.spicebushmontessori.org',
    'spicebush-testing.netlify.app',
    'deploy-preview-42--spicebush-testing.netlify.app',
    'SPICEBUSHMONTESSORI.ORG'
  ])('allows %s', host => {
    expect(isAllowedRenderHost(host, 'localhost')).toBe(true);
  });

  it('allows the request host itself', () => {
    expect(isAllowedRenderHost('localhost', 'localhost')).toBe(true);
  });

  it.each([
    'evil-spicebush.netlify.app',
    'spicebush-attacker.netlify.app',
    'spicebush-testing.netlify.app.evil.com',
    'x--spicebush-testing-evil.netlify.app',
    'a.b--spicebush-testing.netlify.app',
    'evil.com'
  ])('rejects %s', host => {
    expect(isAllowedRenderHost(host, 'spicebushmontessori.org')).toBe(false);
  });
});

describe('readBodyWithLimit', () => {
  it('returns the body when under the limit', async () => {
    const result = await readBodyWithLimit(new Response(new Uint8Array([1, 2, 3])), 10);
    expect(result).toEqual(Buffer.from([1, 2, 3]));
  });

  it('rejects an oversized declared Content-Length', async () => {
    const response = new Response(new Uint8Array(4), {
      headers: { 'Content-Length': '999999' }
    });
    expect(await readBodyWithLimit(response, 10)).toBeNull();
  });

  it('rejects a streamed body that exceeds the limit without a Content-Length', async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(8));
        controller.enqueue(new Uint8Array(8));
        controller.close();
      }
    });
    expect(await readBodyWithLimit(new Response(stream), 10)).toBeNull();
  });
});

describe('resolveRedirectTarget', () => {
  const current = new URL('https://spicebush-testing.netlify.app/images/a.jpg');
  const redirect = (status: number, location?: string) =>
    new Response(null, { status, headers: location ? { location } : {} });

  it('returns undefined for non-redirect responses', () => {
    expect(
      resolveRedirectTarget(new Response('x'), current, 'spicebushmontessori.org')
    ).toBeUndefined();
  });

  it('follows the Netlify site 301 to the production domain', () => {
    const next = resolveRedirectTarget(
      redirect(301, 'https://spicebushmontessori.org/images/a.jpg'),
      current,
      'spicebushmontessori.org'
    );
    expect(next?.href).toBe('https://spicebushmontessori.org/images/a.jpg');
  });

  it('resolves relative locations against the current URL', () => {
    expect(
      resolveRedirectTarget(redirect(302, '/images/b.jpg'), current, 'spicebushmontessori.org')
        ?.href
    ).toBe('https://spicebush-testing.netlify.app/images/b.jpg');
  });

  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'https://evil-spicebush.netlify.app/x.jpg',
    'file:///etc/passwd'
  ])('rejects a redirect off the allowlist: %s', location => {
    expect(
      resolveRedirectTarget(redirect(302, location), current, 'spicebushmontessori.org')
    ).toBeNull();
  });

  it('rejects a redirect with no Location header', () => {
    expect(resolveRedirectTarget(redirect(307), current, 'spicebushmontessori.org')).toBeNull();
  });
});
