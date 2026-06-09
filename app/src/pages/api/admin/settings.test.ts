import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/admin-auth-check', () => ({ checkAdminAuth: vi.fn() }));
vi.mock('@lib/db/client', () => ({ query: vi.fn(), queryRows: vi.fn() }));
vi.mock('@lib/db', () => ({ db: { cache: { invalidateSettings: vi.fn() } } }));

import { checkAdminAuth } from '@lib/admin-auth-check';
import { query } from '@lib/db/client';
import { db } from '@lib/db';
import { POST } from './settings';

const queryMock = vi.mocked(query);
const invalidateMock = vi.mocked(db.cache.invalidateSettings);
const authMock = vi.mocked(checkAdminAuth);

const ENDPOINT = 'http://localhost/api/admin/settings';

const formRequest = (
  fields: Record<string, string>,
  headers: Record<string, string> = {}
): Request => {
  const body = new URLSearchParams(fields);
  return new Request(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: body.toString()
  });
};

const callPost = (request: Request) =>
  POST({ request, locals: {} } as unknown as Parameters<typeof POST>[0]);

// A representative ticker write (the new caller R2-F1 hardens).
const tickerFields = (): Record<string, string> => ({
  redirectTo: '/admin/ticker',
  ticker_items: JSON.stringify([{ text: 'Hello' }])
});

beforeEach(() => {
  queryMock.mockReset();
  invalidateMock.mockReset();
  authMock.mockReset();
  authMock.mockResolvedValue({
    isAuthenticated: true,
    isAdmin: true,
    session: { userEmail: 'admin@spicebush.org' } as never,
    user: null
  });
  queryMock.mockResolvedValue({ rows: [], rowCount: 1 } as never);
});

describe('POST /api/admin/settings — auth + CSRF origin check (R2-F1 / bug #85)', () => {
  it('rejects an unauthenticated request with 403 (before any write)', async () => {
    authMock.mockResolvedValue({ isAuthenticated: false, isAdmin: false } as never);
    const response = await callPost(formRequest(tickerFields()));
    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a mismatched Origin header with 403 (no write)', async () => {
    const response = await callPost(
      formRequest(tickerFields(), { origin: 'https://evil.example.com' })
    );
    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects Sec-Fetch-Site: cross-site with 403 (no write)', async () => {
    const response = await callPost(
      formRequest(tickerFields(), { 'sec-fetch-site': 'cross-site' })
    );
    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('proceeds (303 redirect) when the Origin matches the request origin', async () => {
    const response = await callPost(formRequest(tickerFields(), { origin: 'http://localhost' }));
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/admin/ticker');
    expect(queryMock).toHaveBeenCalled();
    expect(invalidateMock).toHaveBeenCalled();
  });

  it('FAILS OPEN: a same-origin form POST with NO Origin/Sec-Fetch headers still succeeds', async () => {
    // The 16 existing same-origin settings forms send no Origin on some browsers — must not break.
    const response = await callPost(formRequest(tickerFields()));
    expect(response.status).toBe(303);
    expect(queryMock).toHaveBeenCalled();
  });
});
