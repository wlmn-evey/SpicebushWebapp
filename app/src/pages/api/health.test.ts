import { describe, expect, it, vi } from 'vitest';

vi.mock('@lib/db/client', () => ({
  queryFirst: vi.fn().mockRejectedValue(new Error('password authentication failed for user neondb'))
}));

vi.mock('@lib/server-logger', () => ({
  logServerError: vi.fn()
}));

import { logServerError } from '@lib/server-logger';
import { GET } from './health';

describe('GET /api/health', () => {
  it('hides database error details from the public response', async () => {
    vi.stubEnv('NETLIFY_DATABASE_URL', 'postgres://example');
    // The handler ignores its context; call it the way it is declared.
    const response = await (GET as () => Promise<Response>)();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe('Database check failed');
    expect(JSON.stringify(body)).not.toContain('neondb');
    expect(logServerError).toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
