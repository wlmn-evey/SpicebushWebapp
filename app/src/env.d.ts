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
  readonly AUTH0_DOMAIN?: string;
  readonly AUTH0_CLIENT_ID?: string;
  readonly AUTH0_CLIENT_SECRET?: string;
  readonly AUTH0_CALLBACK_URL?: string;
  readonly AUTH0_AUDIENCE?: string;
  readonly AUTH0_LOGOUT_RETURN_TO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
