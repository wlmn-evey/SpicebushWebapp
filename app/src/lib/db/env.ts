import { logError } from '@lib/error-logger';

type EnvRecord = Record<string, string | undefined>;

// Astro 6+ inlines `import.meta.env` values at build time (non-public vars are no
// longer rewritten to `process.env`), and Vite 8's dev module runner throws on
// dynamic `import.meta.env[key]` access. Runtime secrets therefore come from
// `process.env`; the static reads below only exist in dev, where `.env` files are
// exposed through `import.meta.env`, and are compiled out of production builds so
// no build-machine secret is inlined into the server bundle.
const devImportMetaEnv: EnvRecord = import.meta.env.DEV
  ? {
      NETLIFY_DATABASE_URL: import.meta.env.NETLIFY_DATABASE_URL,
      DATABASE_URL: import.meta.env.DATABASE_URL
    }
  : {};

const envCache = new Map<string, string>();

function readEnv(key: string, { required = false }: { required?: boolean } = {}): string {
  if (envCache.has(key)) {
    return envCache.get(key) as string;
  }

  const value =
    (typeof process !== 'undefined' ? process.env?.[key] : undefined) || devImportMetaEnv[key];

  if (!value) {
    if (required) {
      const message = `Missing required environment variable ${key}. Check your .env.local / Netlify settings.`;
      logError('db.env', new Error(message));
      throw new Error(message);
    }

    return '';
  }

  envCache.set(key, value);
  return value;
}

export function getNetlifyDatabaseUrl(): string {
  const netlifyDatabaseUrl = readEnv('NETLIFY_DATABASE_URL');
  if (netlifyDatabaseUrl) {
    return netlifyDatabaseUrl;
  }

  return readEnv('DATABASE_URL', { required: true });
}

export function clearEnvCache() {
  envCache.clear();
}
