import { describe, expect, it } from 'vitest';
import {
  isAllowedMediaPath,
  isAllowedRasterContentType,
  isAllowedRenderHost,
  readBodyWithLimit,
  resolveRedirectTarget,
  resolveSafeMediaSourceUrl
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

  it('rejects a redirect to /api/media/render or non-media paths', () => {
    expect(
      resolveRedirectTarget(
        redirect(302, 'https://spicebushmontessori.org/api/media/render?src=/images/a.jpg'),
        current,
        'spicebushmontessori.org'
      )
    ).toBeNull();
    expect(
      resolveRedirectTarget(
        redirect(302, 'https://spicebushmontessori.org/admin'),
        current,
        'spicebushmontessori.org'
      )
    ).toBeNull();
  });

  it('rejects http downgrade redirects to non-local hosts', () => {
    expect(
      resolveRedirectTarget(
        redirect(302, 'http://spicebushmontessori.org/images/a.jpg'),
        current,
        'spicebushmontessori.org'
      )
    ).toBeNull();
  });
});

describe('isAllowedMediaPath & isAllowedRasterContentType', () => {
  it('allows only expected media prefixes and blocks render recursion', () => {
    expect(isAllowedMediaPath('/images/a.webp')).toBe(true);
    expect(isAllowedMediaPath('/uploads/photo.jpg')).toBe(true);
    expect(isAllowedMediaPath('/api/media/blob/abc.png')).toBe(true);
    expect(isAllowedMediaPath('/api/media/render')).toBe(false);
    expect(isAllowedMediaPath('/admin/settings')).toBe(false);
  });

  it('allows raster image MIME types and rejects SVG / non-image types', () => {
    expect(isAllowedRasterContentType('image/jpeg')).toBe(true);
    expect(isAllowedRasterContentType('image/webp; charset=utf-8')).toBe(true);
    expect(isAllowedRasterContentType('image/png')).toBe(true);
    expect(isAllowedRasterContentType('image/svg+xml')).toBe(false);
    expect(isAllowedRasterContentType('text/html')).toBe(false);
  });
});

describe('resolveSafeMediaSourceUrl', () => {
  const reqUrl = new URL('https://spicebushmontessori.org/api/media/render');

  it('accepts valid relative and absolute media URLs', () => {
    expect(resolveSafeMediaSourceUrl('/images/a.webp', reqUrl)?.href).toBe(
      'https://spicebushmontessori.org/images/a.webp'
    );
    expect(
      resolveSafeMediaSourceUrl('https://spicebushmontessori.org/api/media/blob/abc.jpg', reqUrl)
        ?.href
    ).toBe('https://spicebushmontessori.org/api/media/blob/abc.jpg');
  });

  it.each([
    '/images/../api/media/render?src=/images/a.webp',
    '/images/../../admin/settings',
    'https://spicebushmontessori.org/api/media/render?src=/images/a.webp',
    'https://spicebushmontessori.org:8443/images/a.webp',
    'https://evil.example.com/images/a.webp',
    'http://169.254.169.254/latest/meta-data/',
    '//evil.example.com/images/a.webp'
  ])('rejects unsafe media source: %s', candidate => {
    expect(resolveSafeMediaSourceUrl(candidate, reqUrl)).toBeNull();
  });
});
