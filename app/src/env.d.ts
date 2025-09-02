/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  readonly CLERK_SECRET_KEY: string;
  readonly PUBLIC_SITE_URL: string;
  readonly COMING_SOON_MODE?: string;
  readonly PUBLIC_CLERK_SIGN_IN_URL?: string;
  readonly PUBLIC_CLERK_SIGN_UP_URL?: string;
  readonly PUBLIC_CLERK_AFTER_SIGN_IN_URL?: string;
  readonly PUBLIC_CLERK_AFTER_SIGN_UP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}