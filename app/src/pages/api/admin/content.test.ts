import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@lib/admin-auth-check', () => ({ checkAdminAuth: vi.fn() }));
vi.mock('@lib/db/client', () => ({ query: vi.fn() }));
vi.mock('@lib/db', () => ({ db: { cache: { invalidateCollection: vi.fn() } } }));

import { checkAdminAuth } from '@lib/admin-auth-check';
import { query } from '@lib/db/client';
import { db } from '@lib/db';
import { POST } from './content';

const queryMock = vi.mocked(query);
const invalidateMock = vi.mocked(db.cache.invalidateCollection);
const authMock = vi.mocked(checkAdminAuth);

const ENDPOINT = 'http://localhost/api/admin/content';

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

// A valid published blog post field set used as a baseline.
const validBlogFields = (): Record<string, string> => ({
  collection: 'blog',
  slug: 'a-new-post',
  title: 'A New Post',
  status: 'published',
  'data.date': '2024-01-01',
  'data.excerpt': 'An excerpt',
  'data.body_raw': 'Hello world'
});

beforeEach(() => {
  queryMock.mockReset();
  invalidateMock.mockReset();
  authMock.mockReset();
  // Default: authenticated admin. Default query resolves as a successful upsert.
  authMock.mockResolvedValue({
    isAuthenticated: true,
    isAdmin: true,
    session: { userEmail: 'admin@spicebush.org' } as never,
    user: null
  });
  queryMock.mockResolvedValue({ rows: [], rowCount: 1 } as never);
});

describe('POST /api/admin/content — _raw round-trip (test 11)', () => {
  it('stores _raw fields byte-identical as strings (not coerced)', async () => {
    const response = await callPost(
      formRequest({
        collection: 'blog',
        slug: 'raw-post',
        title: 'Raw Post',
        status: 'draft',
        'data.body_raw': '{"a":1}',
        'data.excerpt_raw': '2024'
      })
    );
    expect(response.status).toBe(200);
    const dataJson = queryMock.mock.calls[0][1]?.[3] as string;
    const stored = JSON.parse(dataJson);
    expect(stored.body).toBe('{"a":1}');
    expect(typeof stored.body).toBe('string');
    expect(stored.excerpt).toBe('2024');
    expect(typeof stored.excerpt).toBe('string');
  });

  it('keeps a "true" body_raw as the string "true"', async () => {
    await callPost(
      formRequest({
        collection: 'blog',
        slug: 'bool-post',
        title: 'Bool Post',
        status: 'draft',
        'data.body_raw': 'true'
      })
    );
    const dataJson = queryMock.mock.calls[0][1]?.[3] as string;
    expect(JSON.parse(dataJson).body).toBe('true');
  });
});

describe('POST /api/admin/content — createOnly (test 12)', () => {
  it('returns 400 with a collision message when the row already exists', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 } as never);
    const response = await callPost(formRequest({ ...validBlogFields(), createOnly: 'true' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/already exists/i);
    // Insert-only SQL path was used.
    expect(queryMock.mock.calls[0][0]).toContain('DO NOTHING');
    expect(invalidateMock).not.toHaveBeenCalled();
  });

  it('runs the upsert (DO UPDATE) when createOnly is absent', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const response = await callPost(formRequest(validBlogFields()));
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('DO UPDATE');
    expect(invalidateMock).toHaveBeenCalledWith('blog');
  });

  it('succeeds on createOnly when no conflict (rowCount 1)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const response = await callPost(formRequest({ ...validBlogFields(), createOnly: 'true' }));
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('DO NOTHING');
    expect(invalidateMock).toHaveBeenCalledWith('blog');
  });

  it('coerces a JSON-body createOnly:"false" (string) to the DO UPDATE branch (F2)', async () => {
    // The JSON path passes the body through untouched, so a string "false" would be truthy
    // and wrongly take DO NOTHING — turning an edit into a 400 collision. parseBooleanValue
    // must coerce it to false regardless of source.
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 1 } as never);
    const request = new Request(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        collection: 'blog',
        slug: 'a-new-post',
        title: 'A New Post',
        status: 'published',
        createOnly: 'false',
        data: { date: '2024-01-01', excerpt: 'An excerpt', body: 'Hello world' }
      })
    });
    const response = await callPost(request);
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('DO UPDATE');
    expect(queryMock.mock.calls[0][0]).not.toContain('DO NOTHING');
  });
});

describe('POST /api/admin/content — allowlist + delete + origin + redirect (test 13)', () => {
  it('accepts a valid blog POST (upsert + cache invalidate)', async () => {
    const response = await callPost(formRequest(validBlogFields()));
    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(invalidateMock).toHaveBeenCalledWith('blog');
  });

  it('handles action=delete for blog (DELETE + invalidate + success)', async () => {
    const response = await callPost(
      formRequest({ collection: 'blog', slug: 'gone', action: 'delete' })
    );
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('DELETE FROM content');
    expect(queryMock.mock.calls[0][1]).toEqual(['blog', 'gone']);
    expect(invalidateMock).toHaveBeenCalledWith('blog');
  });

  it('handles action=archive for blog (status=archived + invalidate)', async () => {
    const response = await callPost(
      formRequest({ collection: 'blog', slug: 'old-post', action: 'archive' })
    );
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('SET status = $2');
    expect(queryMock.mock.calls[0][1]).toEqual(['old-post', 'archived']);
    expect(invalidateMock).toHaveBeenCalledWith('blog');
  });

  it('handles action=restore for blog (status=draft — archived is reversible, R4-F12)', async () => {
    const response = await callPost(
      formRequest({ collection: 'blog', slug: 'old-post', action: 'restore' })
    );
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][1]).toEqual(['old-post', 'draft']);
  });

  it('rejects archive/restore for a non-blog collection with 400', async () => {
    const response = await callPost(
      formRequest({ collection: 'faq', slug: 'q1', action: 'archive' })
    );
    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('handles action=bulk-archive (UPDATE … slug = ANY, deduped + lowercased)', async () => {
    const body = new URLSearchParams();
    body.append('collection', 'blog');
    body.append('action', 'bulk-archive');
    body.append('slugs', 'Post-A');
    body.append('slugs', 'post-b');
    body.append('slugs', 'post-a'); // dup of the lowercased Post-A
    const response = await callPost(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
    );
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('UPDATE content');
    expect(queryMock.mock.calls[0][0]).toContain('slug = ANY($1)');
    expect(queryMock.mock.calls[0][1]).toEqual([['post-a', 'post-b']]); // deduped + lowercased
    expect(invalidateMock).toHaveBeenCalledWith('blog');
  });

  it('handles action=bulk-delete (DELETE … slug = ANY)', async () => {
    const body = new URLSearchParams();
    body.append('collection', 'blog');
    body.append('action', 'bulk-delete');
    body.append('slugs', 'a');
    body.append('slugs', 'b');
    const response = await callPost(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
    );
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('DELETE FROM content');
    expect(queryMock.mock.calls[0][1]).toEqual([['a', 'b']]);
  });

  it('rejects a bulk action with no valid slugs (400, no query)', async () => {
    const body = new URLSearchParams();
    body.append('collection', 'blog');
    body.append('action', 'bulk-archive');
    body.append('slugs', 'Bad Slug!'); // fails the charset filter → dropped → empty set
    const response = await callPost(
      new Request(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
    );
    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a non-allowlisted collection with 400', async () => {
    const response = await callPost(
      formRequest({ collection: 'users', slug: 'x', title: 'x', status: 'draft' })
    );
    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a mismatched Origin header with 403', async () => {
    const response = await callPost(
      formRequest(validBlogFields(), { origin: 'https://evil.example.com' })
    );
    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects Sec-Fetch-Site: cross-site with 403', async () => {
    const response = await callPost(
      formRequest(validBlogFields(), { 'sec-fetch-site': 'cross-site' })
    );
    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('proceeds when Origin matches the request origin', async () => {
    const response = await callPost(formRequest(validBlogFields(), { origin: 'http://localhost' }));
    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('proceeds (fail-open) when both Origin and Sec-Fetch-Site are absent', async () => {
    const response = await callPost(formRequest(validBlogFields()));
    expect(response.status).toBe(200);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('parseRedirectPath rejects backslash + protocol-relative paths', async () => {
    // Validation failure (date-prefixed slug) with a malicious redirectTo: because the redirect is
    // rejected (→ null), responseByFormat returns JSON 400, NOT a 303 to the evil path.
    const backslash = await callPost(
      formRequest({ ...validBlogFields(), slug: '2026-08-01-festival', redirectTo: '/\\evil.com' })
    );
    expect(backslash.status).toBe(400);
    expect(backslash.headers.get('location')).toBeNull();

    const protoRel = await callPost(
      formRequest({ ...validBlogFields(), slug: '2026-08-01-festival', redirectTo: '//evil.com' })
    );
    expect(protoRel.status).toBe(400);
    expect(protoRel.headers.get('location')).toBeNull();
  });

  it('parseRedirectPath accepts a safe path → 303 Location on a validation failure', async () => {
    const response = await callPost(
      formRequest({
        ...validBlogFields(),
        slug: '2026-08-01-festival',
        redirectTo: '/admin/blog?saved=new'
      })
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toContain('/admin/blog');
    expect(response.headers.get('location')).toContain('error=');
  });

  it('accepts a safe redirectTo → 303 Location on success', async () => {
    const response = await callPost(
      formRequest({ ...validBlogFields(), redirectTo: '/admin/blog?saved=new' })
    );
    expect(response.status).toBe(303);
    expect(response.headers.get('location')).toBe('/admin/blog?saved=new');
  });
});

describe('POST /api/admin/content — blog validation (test 13 / acceptance)', () => {
  it('rejects a missing status with 400 (R2-F2)', async () => {
    const fields = validBlogFields();
    delete fields.status;
    const response = await callPost(formRequest(fields));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Status must be Draft, Published, Scheduled, or Archived');
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a date-prefixed slug with 400 (R2-F19)', async () => {
    const response = await callPost(
      formRequest({ ...validBlogFields(), slug: '2026-08-01-festival' })
    );
    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('rejects a published body containing ![](x) with 400 (R2-F26)', async () => {
    const response = await callPost(
      formRequest({ ...validBlogFields(), 'data.body_raw': '![](x)' })
    );
    expect(response.status).toBe(400);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('canonicalizes a mixed-case status to lowercase before storing', async () => {
    // validateBlogData accepts status case-insensitively; the SQL read filter is exact
    // `status = 'published'`, so the stored value must be lowercase or the post vanishes.
    const response = await callPost(formRequest({ ...validBlogFields(), status: 'Published' }));
    expect(response.status).toBe(200);
    // Stored status is the 5th positional param ($5) in the upsert values.
    expect(queryMock.mock.calls[0][1]?.[4]).toBe('published');
  });
});

describe('POST /api/admin/content — auth (test 14)', () => {
  it('returns 403 ONLY for an authenticated non-admin', async () => {
    authMock.mockResolvedValue({
      isAuthenticated: true,
      isAdmin: false,
      session: { userEmail: 'user@x.org' } as never,
      user: null
    });
    const response = await callPost(formRequest(validBlogFields()));
    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });
});

describe('POST /api/admin/content — existing-collection regression (test 15, R4-F32)', () => {
  it('still saves an existing collection (faq) through the modified handler, headers absent', async () => {
    const response = await callPost(
      formRequest({
        collection: 'faq',
        slug: 'q1',
        title: 'Q1',
        status: 'published',
        'data.section_title': 'General',
        'data.question': 'How?',
        'data.answer': 'Like so.'
      })
    );
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('DO UPDATE');
    expect(invalidateMock).toHaveBeenCalledWith('faq');
  });

  it('still deletes an existing collection (faq) via action=delete, headers absent', async () => {
    const response = await callPost(
      formRequest({ collection: 'faq', slug: 'q1', action: 'delete' })
    );
    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0][0]).toContain('DELETE FROM content');
    expect(invalidateMock).toHaveBeenCalledWith('faq');
  });
});
