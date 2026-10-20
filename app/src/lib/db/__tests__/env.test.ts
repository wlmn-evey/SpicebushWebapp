import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/error-logger', () => ({
  logError: vi.fn()
}));

import { clearEnvCache, getNetlifyDatabaseUrl } from '../env';

describe('db env', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    clearEnvCache();
  });

  it('reads NETLIFY_DATABASE_URL via static import.meta.env access', () => {
    vi.stubEnv('NETLIFY_DATABASE_URL', 'postgres://netlify-url');
    expect(getNetlifyDatabaseUrl()).toBe('postgres://netlify-url');
  });

  it('falls back to DATABASE_URL', () => {
    vi.stubEnv('NETLIFY_DATABASE_URL', '');
    vi.stubEnv('DATABASE_URL', 'postgres://fallback-url');
    expect(getNetlifyDatabaseUrl()).toBe('postgres://fallback-url');
  });

  it('throws a clear error when neither is set', () => {
    vi.stubEnv('NETLIFY_DATABASE_URL', '');
    vi.stubEnv('DATABASE_URL', '');
    expect(() => getNetlifyDatabaseUrl()).toThrow(/Missing required environment variable/);
  });

  it('never indexes import.meta.env dynamically (Vite module runner rejects it in dev)', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const source = readFileSync(resolve(process.cwd(), 'src/lib/db/env.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(source).not.toMatch(/import\.meta\.env\s*\[/);
    expect(source).not.toMatch(/\(import\.meta as [^)]*\)\.env/);
    expect(source).toContain('import.meta.env.NETLIFY_DATABASE_URL');
  });
});
