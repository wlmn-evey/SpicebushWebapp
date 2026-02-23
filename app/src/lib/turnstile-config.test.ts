import { afterEach, describe, expect, it } from 'vitest';
import { getTurnstileSiteKey } from './turnstile-config';

describe('turnstile-config', () => {
  const originalSiteKey = process.env.PUBLIC_TURNSTILE_SITE_KEY;

  afterEach(() => {
    if (originalSiteKey === undefined) {
      delete process.env.PUBLIC_TURNSTILE_SITE_KEY;
    } else {
      process.env.PUBLIC_TURNSTILE_SITE_KEY = originalSiteKey;
    }
  });

  it('returns fallback key when env var is not set', () => {
    delete process.env.PUBLIC_TURNSTILE_SITE_KEY;
    expect(getTurnstileSiteKey()).toBe('0x4AAAAAACgpHjC0CwuAr4uP');
  });

  it('returns trimmed env site key when configured', () => {
    process.env.PUBLIC_TURNSTILE_SITE_KEY = '  custom-site-key  ';
    expect(getTurnstileSiteKey()).toBe('custom-site-key');
  });
});
