/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly NETLIFY_DATABASE_URL?: string;
  readonly DATABASE_URL?: string;
  readonly URL?: string;
  readonly PUBLIC_SITE_URL: string;
  readonly COMING_SOON_MODE?: string;
  readonly ADMIN_EMAILS?: string;
  readonly ADMIN_DOMAINS?: string;
  readonly AUTH_PROVIDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
