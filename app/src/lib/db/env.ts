import { logError } from '@lib/error-logger';

type DbEnvKey = 'NETLIFY_DATABASE_URL' | 'DATABASE_URL';

/**
 * Database URLs come from `process.env` only. Never reference them through `import.meta.env`:
 * Astro 7 inlines every private variable a module mentions there into the server bundle, even
 * behind an `import.meta.env.DEV` check. In `astro dev`, `.env.local` reaches `process.env` via
 * the dotenv call in astro.config.mjs; on Netlify the site's environment variables do.
 */
function readProcessEnv(key: DbEnvKey): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[key] : undefined;
}

const envCache = new Map<string, string>();

function readEnv(key: DbEnvKey, { required = false }: { required?: boolean } = {}): string {
  if (envCache.has(key)) {
    return envCache.get(key) as string;
  }

  const value = readProcessEnv(key);

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
