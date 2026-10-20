import { describe, expect, it, vi, beforeEach } from 'vitest';

// DISTINCT filename from PR-1's content.test.ts (no collision). Mock set is CORRECTED vs.
// entries.test.ts: content.ts uses `query` + `db.cache`, NOT queryFirst/queryRows (VERIFIED).
vi.mock('@lib/admin-auth-check', () => ({ checkAdminAuth: vi.fn() }));
vi.mock('@lib/db/client', () => ({ query: vi.fn() }));
vi.mock('@lib/db', () => ({ db: { cache: { invalidateCollection: vi.fn() } } }));

import { checkAdminAuth } from '@lib/admin-auth-check';
import { query } from '@lib/db/client';
import { db } from '@lib/db';
import { POST } from './content';
import { BLOG_FORM_FIELDS } from '@lib/blog-form-fields';

const F = BLOG_FORM_FIELDS;

/** Build a POST Context whose request carries a real FormData body. */
const makeContext = (fields: Record<string, string>) => {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    body.append(key, value);
  }
  const request = new Request('http://localhost/api/admin/content', { method: 'POST', body });
  return { request, locals: {} } as unknown as Parameters<typeof POST>[0];
};

/** Pull the params array from the upsert/delete `query` call (skips any non-SQL noise). */
const upsertParams = (): unknown[] => {
  const call = vi.mocked(query).mock.calls.find(([sql]) => String(sql).includes('INSERT INTO'));
  if (!call) throw new Error('no upsert query call recorded');
  return call[1] as unknown[];
};

// Param order in content.ts upsert: [collection, slug, title, JSON.stringify(data), status, email, updatedAt]
const PARAM_COLLECTION = 0;
const PARAM_SLUG = 1;
const PARAM_TITLE = 2;
const PARAM_DATA = 3;
const PARAM_STATUS = 4;

const validPublishedFields = (overrides: Record<string, string> = {}): Record<string, string> => ({
  [F.collection]: 'blog',
  [F.slug]: 'a-real-post',
  [F.title]: 'A Real Post',
  [F.status]: 'published',
  [F.date]: '2026-06-01',
  [F.author]: 'Spicebush Team',
  [F.excerptRaw]: 'A short summary of the post.',
  [F.bodyRaw]: 'Hello world body content.',
  ...overrides
});

describe('POST /api/admin/content — blog path (§12.16 + §12.18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      session: { userEmail: 'admin@spicebush.example' } as never,
      user: null
    });
    vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }], rowCount: 1 } as never);
  });

  it('writes a valid published blog post and invalidates the blog cache', async () => {
    const response = await POST(makeContext(validPublishedFields()));
    expect(response.status).toBe(200);

    const params = upsertParams();
    expect(params[PARAM_COLLECTION]).toBe('blog');
    expect(params[PARAM_SLUG]).toBe('a-real-post');
    expect(params[PARAM_TITLE]).toBe('A Real Post');
    expect(params[PARAM_STATUS]).toBe('published');

    const data = JSON.parse(params[PARAM_DATA] as string) as Record<string, unknown>;
    expect(data.body).toBe('Hello world body content.');
    expect(data.excerpt).toBe('A short summary of the post.');

    expect(db.cache.invalidateCollection).toHaveBeenCalledWith('blog');
  });

  it('passes _raw body/excerpt through as strings without JSON coercion', async () => {
    await POST(
      makeContext(
        validPublishedFields({
          [F.bodyRaw]: '{"a":1}',
          [F.excerptRaw]: '2024'
        })
      )
    );

    const data = JSON.parse(upsertParams()[PARAM_DATA] as string) as Record<string, unknown>;
    expect(data.body).toBe('{"a":1}');
    expect(typeof data.body).toBe('string');
    expect(data.excerpt).toBe('2024');
    expect(typeof data.excerpt).toBe('string');
  });

  it('trims whitespace-padded body via normalizeBlogData (R2-F8)', async () => {
    await POST(
      makeContext(
        validPublishedFields({
          [F.bodyRaw]: '\n   Hello world\n  '
        })
      )
    );

    const data = JSON.parse(upsertParams()[PARAM_DATA] as string) as Record<string, unknown>;
    expect(data.body).toBe('Hello world');
  });

  it('returns 400 and writes NO row when status is omitted (R2-F2)', async () => {
    const fields = validPublishedFields();
    delete fields[F.status];
    const response = await POST(makeContext(fields));

    expect(response.status).toBe(400);
    const upsertCalled = vi
      .mocked(query)
      .mock.calls.some(([sql]) => String(sql).includes('INSERT INTO'));
    expect(upsertCalled).toBe(false);
  });

  it('§12.18: an edit of a published post submitting status=published stores published', async () => {
    // Edit form (NO createOnly) — the page renders selected={post.status} so this resubmits published.
    const fields = validPublishedFields({
      [F.baseDataJson]: JSON.stringify({
        title: 'A Real Post',
        date: '2026-06-01',
        author: 'Spicebush Team',
        excerpt: 'A short summary of the post.',
        body: 'Hello world body content.',
        status: 'published'
      })
    });
    await POST(makeContext(fields));
    expect(upsertParams()[PARAM_STATUS]).toBe('published');
  });

  it('#84/R1-F15: preserves data.categories/data.tags carried in baseDataJson through the edit upsert', async () => {
    // The edit form resubmits baseDataJson reconstructed by `blogPostToEditData`, which now carries
    // categories/tags (no form input exists for them). The wholesale `data = EXCLUDED.data` upsert
    // MUST keep them — before the fix the edit form dropped them and they were silently wiped.
    const fields = validPublishedFields({
      [F.baseDataJson]: JSON.stringify({
        title: 'A Real Post',
        date: '2026-06-01',
        author: 'Spicebush Team',
        excerpt: 'A short summary of the post.',
        body: 'Hello world body content.',
        status: 'published',
        categories: ['Montessori', 'Parenting'],
        tags: ['toddlers', 'play']
      })
    });
    await POST(makeContext(fields));

    const data = JSON.parse(upsertParams()[PARAM_DATA] as string) as Record<string, unknown>;
    expect(data.categories).toEqual(['Montessori', 'Parenting']);
    expect(data.tags).toEqual(['toddlers', 'play']);
  });

  it('§12.18 control: a draft-defaulted add stores draft', async () => {
    const fields = validPublishedFields({
      [F.status]: 'draft',
      [F.createOnly]: 'true'
    });
    await POST(makeContext(fields));
    expect(upsertParams()[PARAM_STATUS]).toBe('draft');
  });

  it('createOnly conflict (rowCount 0) returns 400', async () => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as never);
    const response = await POST(
      makeContext(validPublishedFields({ [F.status]: 'draft', [F.createOnly]: 'true' }))
    );
    expect(response.status).toBe(400);
  });

  it('runs the form-based delete branch and invalidates the cache', async () => {
    const response = await POST(
      makeContext({
        [F.collection]: 'blog',
        [F.slug]: 'a-real-post',
        [F.action]: 'delete'
      })
    );
    expect(response.status).toBe(200);
    const deleteCalled = vi
      .mocked(query)
      .mock.calls.some(([sql]) => String(sql).includes('DELETE FROM content'));
    expect(deleteCalled).toBe(true);
    expect(db.cache.invalidateCollection).toHaveBeenCalledWith('blog');
  });
});

describe('POST /api/admin/content — existing-collection regression (R4-F32, header-absent fail-open)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      session: { userEmail: 'admin@spicebush.example' } as never,
      user: null
    });
    vi.mocked(query).mockResolvedValue({ rows: [{ id: '1' }], rowCount: 1 } as never);
  });

  it('still saves a faq entry with no Origin / Sec-Fetch-Site headers (fail-open)', async () => {
    const response = await POST(
      makeContext({
        [F.collection]: 'faq',
        [F.slug]: 'faq-existing',
        [F.status]: 'published',
        'data.section_title': 'General FAQs',
        'data.question': 'A question?',
        'data.answer': 'An answer.'
      })
    );
    expect(response.status).toBe(200);
    expect(upsertParams()[PARAM_COLLECTION]).toBe('faq');
    expect(db.cache.invalidateCollection).toHaveBeenCalledWith('faq');
  });

  it('still deletes a staff entry through the modified handler', async () => {
    const response = await POST(
      makeContext({
        [F.collection]: 'staff',
        [F.slug]: 'jane-doe',
        [F.action]: 'delete'
      })
    );
    expect(response.status).toBe(200);
    const deleteCalled = vi
      .mocked(query)
      .mock.calls.some(([sql]) => String(sql).includes('DELETE FROM content'));
    expect(deleteCalled).toBe(true);
    expect(db.cache.invalidateCollection).toHaveBeenCalledWith('staff');
  });
});
