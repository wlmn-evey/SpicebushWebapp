import { afterEach, describe, expect, it, vi } from 'vitest';

import { isProductionHostname, resolveSiteOrigin } from './site-origin';

describe('isProductionHostname', () => {
  it('accepts the canonical apex and www hostnames, case-insensitively', () => {
    expect(isProductionHostname('spicebushmontessori.org')).toBe(true);
    expect(isProductionHostname('www.spicebushmontessori.org')).toBe(true);
    expect(isProductionHostname('SpicebushMontessori.org')).toBe(true);
  });

  it('rejects the Netlify default subdomain, previews, and local hosts', () => {
    expect(isProductionHostname('spicebush-testing.netlify.app')).toBe(false);
    expect(isProductionHostname('deploy-preview-42--spicebush-testing.netlify.app')).toBe(false);
    expect(isProductionHostname('testing--spicebush-testing.netlify.app')).toBe(false);
    expect(isProductionHostname('localhost')).toBe(false);
    expect(isProductionHostname('spicebushmontessori.org.evil.example')).toBe(false);
  });
});

describe('resolveSiteOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('prefers the provided site URL origin', () => {
    expect(resolveSiteOrigin(new URL('https://example.org/some/path'))).toBe(
      'https://example.org'
    );
  });

  it('falls back to PUBLIC_SITE_URL, then the hardcoded production origin', () => {
    vi.stubEnv('PUBLIC_SITE_URL', 'https://staging.example.org');
    expect(resolveSiteOrigin()).toBe('https://staging.example.org');

    vi.stubEnv('PUBLIC_SITE_URL', 'not a url');
    expect(resolveSiteOrigin()).toBe('https://spicebushmontessori.org');
  });
});
