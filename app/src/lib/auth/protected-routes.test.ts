import { describe, expect, it } from 'vitest';
import { isProtectedRoute, normalizePathForAuth } from './protected-routes';

describe('isProtectedRoute', () => {
  it.each([
    '/admin',
    '/admin/',
    '/admin/contact-submissions',
    '/api/admin/settings',
    '/api/cms/entries',
    '/api/media/upload',
    '/api/storage/stats',
    '/api/email/send',
    '/api/test-email'
  ])('protects %s', path => {
    expect(isProtectedRoute(path)).toBe(true);
  });

  it.each([
    ['percent-encoded letter', '/%61dmin/contact-submissions'],
    ['fully encoded prefix', '/%61%64%6d%69%6e'],
    ['encoded api segment', '/%61pi/admin/settings'],
    ['encoded slash', '/api%2Fadmin%2Fsettings'],
    ['encoded trailing slash + dot-dot', '/admin%2F..'],
    ['double-encoded', '/%2561dmin'],
    ['uppercase', '/Admin'],
    ['uppercase api', '/API/ADMIN/settings'],
    ['doubled slash', '//admin'],
    ['doubled inner slash', '/api//admin/settings']
  ])('protects %s variant (%s)', (_label, path) => {
    expect(isProtectedRoute(path)).toBe(true);
  });

  it('fails closed on malformed percent-encoding', () => {
    expect(isProtectedRoute('/%E0%A4%A')).toBe(true);
    expect(isProtectedRoute('/about%')).toBe(true);
  });

  it.each([
    '/',
    '/about',
    '/administration-faq',
    '/api/contact/submit',
    '/api/email',
    '/auth/sign-in'
  ])('leaves %s public', path => {
    expect(isProtectedRoute(path)).toBe(false);
  });
});

describe('normalizePathForAuth', () => {
  it('decodes, collapses slashes and lowercases', () => {
    expect(normalizePathForAuth('//%41dmin%2Fblog')).toBe('/admin/blog');
  });

  it('returns null for undecodable input', () => {
    expect(normalizePathForAuth('/%E0%A4%A')).toBeNull();
  });

  it('keeps a literal percent from %25 instead of failing closed', () => {
    expect(normalizePathForAuth('/blog/100%25-fun')).toBe('/blog/100%-fun');
    expect(isProtectedRoute('/blog/100%25-fun')).toBe(false);
  });

  it('returns null when decoding never stabilises', () => {
    expect(normalizePathForAuth('/%25252561dmin')).toBeNull();
  });
});
