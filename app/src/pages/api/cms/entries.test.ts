import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn()
}));

vi.mock('@lib/db/client', () => ({
  queryFirst: vi.fn(),
  queryRows: vi.fn()
}));

import { checkAdminAuth } from '@lib/admin-auth-check';
import { queryFirst, queryRows } from '@lib/db/client';
import { GET } from './entries';

const makeContext = (searchParams: Record<string, string> = {}) => {
  const url = new URL('http://localhost/api/cms/entries');
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }

  return {
    url,
    locals: {}
  } as unknown as Parameters<typeof GET>[0];
};

describe('GET /api/cms/entries — pagination (P2 fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: true,
      isAdmin: true,
      session: {} as never,
      user: null
    });
  });

  it('returns 403 for non-admin users', async () => {
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: false,
      isAdmin: false,
      session: null,
      user: null
    });

    const response = await GET(makeContext({ collection: 'hours' }));
    expect(response.status).toBe(403);
  });

  it('returns 400 for disallowed collection names', async () => {
    const response = await GET(makeContext({ collection: 'users' }));
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.error).toContain('not allowed');
  });

  it('returns 400 for empty collection', async () => {
    const response = await GET(makeContext({}));
    expect(response.status).toBe(400);
  });

  it('returns paginated results with total count', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 42 });
    vi.mocked(queryRows).mockResolvedValue([
      { type: 'hours', slug: 'monday', title: 'Monday Hours', data: {}, status: 'published' }
    ]);

    const response = await GET(makeContext({ collection: 'hours', page: '1', pageSize: '10' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.total).toBe(42);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(10);
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].collection).toBe('hours');
  });

  it('uses default pagination when page/pageSize not provided', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 5 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const response = await GET(makeContext({ collection: 'staff' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50); // DEFAULT_PAGE_SIZE
  });

  it('caps page size at MAX_PAGE_SIZE (500)', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const response = await GET(makeContext({ collection: 'faq', pageSize: '9999' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.pageSize).toBe(500);
  });

  it('normalizes invalid page/pageSize to defaults', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const response = await GET(makeContext({ collection: 'photos', page: 'abc', pageSize: '-5' }));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
  });

  it('calculates correct OFFSET for page 3', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 100 });
    vi.mocked(queryRows).mockResolvedValue([]);

    await GET(makeContext({ collection: 'testimonials', page: '3', pageSize: '20' }));

    // Verify query was called with correct LIMIT and OFFSET
    const [, values] = vi.mocked(queryRows).mock.calls[0];
    // values should be [collection, pageSize, offset]
    expect(values![0]).toBe('testimonials');
    expect(values![1]).toBe(20); // pageSize
    expect(values![2]).toBe(40); // offset = (3-1) * 20
  });

  it('returns 500 on DB query failure', async () => {
    vi.mocked(queryFirst).mockRejectedValue(new Error('DB timeout'));

    const response = await GET(makeContext({ collection: 'hours' }));
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Failed to fetch entries');
    // Should not leak internal error details
    expect(JSON.stringify(body)).not.toContain('DB timeout');
  });

  it('accepts all valid collection names', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ count: 0 });
    vi.mocked(queryRows).mockResolvedValue([]);

    const validCollections = [
      'hours',
      'staff',
      'tuition',
      'settings',
      'school-info',
      'faq',
      'testimonials',
      'photos',
      'media-slots'
    ];

    for (const collection of validCollections) {
      const response = await GET(makeContext({ collection }));
      expect(response.status).toBe(200);
    }
  });
});
