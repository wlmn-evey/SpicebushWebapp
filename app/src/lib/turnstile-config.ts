const FALLBACK_TURNSTILE_SITE_KEY = '0x4AAAAAACgpHjC0CwuAr4uP';

export const getTurnstileSiteKey = (): string =>
  (process.env.PUBLIC_TURNSTILE_SITE_KEY || FALLBACK_TURNSTILE_SITE_KEY).trim();
