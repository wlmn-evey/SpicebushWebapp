import { logError } from '@lib/error-logger';

type DbEnvKey = 'NETLIFY_DATABASE_URL' | 'DATABASE_URL';

/**
 * Runtime secrets come from `process.env`. Astro inlines `import.meta.env.NAME` values at build
 * time, and Vite loads `.env` files into it, so an ungated read would bake the build machine's
 * database URL into the SSR bundle (local `npm run build` with `.env.local` present, then
 * `netlify deploy --dir=app/dist`). `import.meta.env.DEV` is statically false in production builds,
 * so these static reads are compiled out there; in `astro dev` they expose `.env` values, which
 * Vite does not copy into `process.env`. Static property access only: Vite's dev module runner
 * rejects dynamic `import.meta.env[name]` access.
 */
const devImportMetaEnv: Partial<Record<DbEnvKey, string | undefined>> = import.meta.env.DEV
  ? {
      NETLIFY_DATABASE_URL: import.meta.env.NETLIFY_DATABASE_URL,
      DATABASE_URL: import.meta.env.DATABASE_URL
    }
  : {};

function readProcessEnv(key: DbEnvKey): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[key] : undefined;
}

const envCache = new Map<string, string>();

function readEnv(key: DbEnvKey, { required = false }: { required?: boolean } = {}): string {
  if (envCache.has(key)) {
    return envCache.get(key) as string;
  }

  const value = readProcessEnv(key) || devImportMetaEnv[key];

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
