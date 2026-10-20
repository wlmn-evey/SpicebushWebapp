import { logError } from '@lib/error-logger';

type DbEnvKey = 'NETLIFY_DATABASE_URL' | 'DATABASE_URL';

/**
 * Read a DB env var from `import.meta.env` using STATIC property access only.
 *
 * Vite (and Astro's dev module runner) rewrites `import.meta.env.NAME` at transform time but
 * rejects dynamic access (`import.meta.env[name]`, or grabbing the `env` object and indexing it)
 * with "[module runner] Dynamic access of "import.meta.env" is not supported" — which broke every
 * DB call under `astro dev`. Each key therefore gets its own literal expression. The try/catch
 * covers runtimes where `import.meta.env` is undefined (plain Node scripts); those fall back to
 * `process.env` below.
 */
function readImportMetaEnv(key: DbEnvKey): string | undefined {
  try {
    switch (key) {
      case 'NETLIFY_DATABASE_URL':
        return import.meta.env.NETLIFY_DATABASE_URL;
      case 'DATABASE_URL':
        return import.meta.env.DATABASE_URL;
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

function readProcessEnv(key: DbEnvKey): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[key] : undefined;
}

const envCache = new Map<string, string>();

function readEnv(key: DbEnvKey, { required = false }: { required?: boolean } = {}): string {
  if (envCache.has(key)) {
    return envCache.get(key) as string;
  }

  const value = readImportMetaEnv(key) ?? readProcessEnv(key);

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
