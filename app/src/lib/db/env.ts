import { logError } from '@lib/error-logger';

type EnvRecord = Record<string, string | undefined>;

function readImportMetaEnv(): EnvRecord {
  try {
    const meta = import.meta as unknown;
    if (meta && typeof meta === 'object' && 'env' in (meta as Record<string, unknown>)) {
      const candidate = (meta as { env?: unknown }).env;
      if (candidate && typeof candidate === 'object') {
        return candidate as EnvRecord;
      }
    }
  } catch {
    // ignore - fall back to process.env
  }
  return {};
}

const importMetaEnv: EnvRecord = readImportMetaEnv();

const envCache = new Map<string, string>();

function readEnv(key: string, { required = false }: { required?: boolean } = {}): string {
  if (envCache.has(key)) {
    return envCache.get(key) as string;
  }

  const value = importMetaEnv[key] ?? (typeof process !== 'undefined' ? process.env?.[key] : undefined);

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
