import { describe, expect, it } from 'vitest';
import { safeRedirectPath, safeRedirectPathOr } from './safe-redirect';

describe('safeRedirectPath', () => {
  it.each(['/', '/admin', '/admin?x=1', '/admin/blog#top', '/auth/sign-in?next=%2Fadmin'])(
    'accepts same-origin path %s',
    value => {
      expect(safeRedirectPath(value)).toBe(value);
    }
  );

  it.each([
    ['protocol-relative', '//evil.com'],
    ['backslash', '/\\evil.com'],
    ['double backslash', '/\\\\evil.com'],
    ['tab smuggled slash', '/\t/evil.com'],
    ['newline smuggled slash', '/\n/evil.com'],
    ['CRLF header split', '/admin\r\nSet-Cookie: x=1'],
    ['DEL char', '/admin\x7f'],
    ['absolute https', 'https://evil.com'],
    ['javascript scheme', ['java', 'script:alert(1)'].join('')],
    ['relative path', 'admin'],
    ['leading space', ' //evil.com'],
    ['empty', '']
  ])('rejects %s', (_label, value) => {
    expect(safeRedirectPath(value)).toBeNull();
  });

  it('rejects non-strings', () => {
    expect(safeRedirectPath(null)).toBeNull();
    expect(safeRedirectPath(undefined)).toBeNull();
    expect(safeRedirectPath(42)).toBeNull();
  });

  it.each(['/%2F%2Fevil.com', '/%5Cevil.com', '/%09/evil.com'])(
    'keeps percent-encoded %s on-site (browser treats it as a literal path)',
    value => {
      const result = safeRedirectPath(value);
      expect(result).toBe(value);
      expect(new URL(result as string, 'https://spicebushmontessori.org').host).toBe(
        'spicebushmontessori.org'
      );
    }
  );
});

describe('safeRedirectPathOr', () => {
  it('returns the fallback for unsafe input', () => {
    expect(safeRedirectPathOr('/\\evil.com', '/admin')).toBe('/admin');
    expect(safeRedirectPathOr(null, '/')).toBe('/');
  });

  it('returns the value for safe input', () => {
    expect(safeRedirectPathOr('/admin/blog', '/admin')).toBe('/admin/blog');
  });
});
