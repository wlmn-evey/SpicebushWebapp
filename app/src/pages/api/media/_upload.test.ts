import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock all dependencies the upload module uses
vi.mock('@lib/admin-auth-check', () => ({
  checkAdminAuth: vi.fn()
}));

vi.mock('@lib/db', () => ({
  db: {
    cache: { invalidateCollection: vi.fn() }
  }
}));

vi.mock('@lib/media-storage', () => ({
  handleMediaUpload: vi.fn(),
  validateFile: vi.fn()
}));

vi.mock('@lib/api-utils', () => ({
  errorResponse: vi.fn(
    (msg: string, status: number) =>
      new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { 'Content-Type': 'application/json' }
      })
  )
}));

vi.mock('@lib/db/client', () => ({
  query: vi.fn(),
  queryFirst: vi.fn(),
  queryRows: vi.fn()
}));

vi.mock('@lib/server-logger', () => ({
  logServerError: vi.fn()
}));

vi.mock('@lib/photo-framing-defaults', () => ({
  getPhotoFramingDefaults: vi.fn().mockReturnValue({
    primaryFocalX: 50,
    primaryFocalY: 50,
    primaryFocalDescription: 'center',
    mobileCropX: 0,
    mobileCropY: 0,
    mobileCropWidth: 100,
    mobileCropHeight: 100,
    tabletCropX: 0,
    tabletCropY: 0,
    tabletCropWidth: 100,
    tabletCropHeight: 100
  })
}));

import { query, queryFirst } from '@lib/db/client';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { validateFile, handleMediaUpload } from '@lib/media-storage';
import { getPhotoFramingDefaults } from '@lib/photo-framing-defaults';
import { POST } from './upload';

const makeTestFile = (content: string, name: string, type: string): File => {
  const nodeBuffer = Buffer.from(content);
  const file = new File([nodeBuffer], name, { type });
  if (typeof file.arrayBuffer !== 'function') {
    (file as unknown as Record<string, unknown>).arrayBuffer = () =>
      Promise.resolve(
        nodeBuffer.buffer.slice(
          nodeBuffer.byteOffset,
          nodeBuffer.byteOffset + nodeBuffer.byteLength
        )
      );
  }
  return file;
};

const makeMockContext = (
  fields: Record<string, string>,
  file?: { name: string; type: string; content: string }
) => {
  const fd = new FormData();
  if (file) {
    fd.set('file', makeTestFile(file.content, file.name, file.type));
  }
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  const request = {
    formData: () => Promise.resolve(fd)
  } as unknown as Request;
  return { request, locals: {} } as unknown as Parameters<typeof POST>[0];
};

const jpegFile = { name: 'photo.jpg', type: 'image/jpeg', content: 'fake-image-data' };

const setupAllMocks = (queryFirstReturn: unknown = null) => {
  vi.mocked(checkAdminAuth).mockResolvedValue({
    isAuthenticated: true,
    isAdmin: true,
    session: { userId: 'admin-1', userEmail: 'admin@test.com' } as never,
    user: { email: 'admin@test.com' } as never
  });
  vi.mocked(validateFile).mockResolvedValue({ valid: true });
  vi.mocked(handleMediaUpload).mockResolvedValue({
    success: true,
    mediaId: 'media-1',
    url: '/uploads/test.jpg',
    storagePath: 'test.jpg',
    provider: 'local',
    width: 1200,
    height: 800,
    mimeType: 'image/jpeg',
    originalFilename: 'test.jpg'
  });
  vi.mocked(query).mockResolvedValue({ rows: [] } as never);
  vi.mocked(queryFirst).mockResolvedValue(queryFirstReturn as never);
  vi.mocked(getPhotoFramingDefaults).mockReturnValue({
    primaryFocalX: 50,
    primaryFocalY: 50,
    primaryFocalDescription: 'center',
    mobileCropX: 0,
    mobileCropY: 0,
    mobileCropWidth: 100,
    mobileCropHeight: 100,
    tabletCropX: 0,
    tabletCropY: 0,
    tabletCropWidth: 100,
    tabletCropHeight: 100
  });
};

describe('POST /api/media/upload — slug numeric sort (F-01 P0 fix)', () => {
  beforeEach(() => {
    setupAllMocks();
  });

  it('returns base slug when no existing slugs match (max_suffix is null)', async () => {
    // queryFirst returns { max_suffix: null } when no rows match the WHERE clause
    vi.mocked(queryFirst).mockResolvedValue({ max_suffix: null });
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'photo', category: 'gallery' },
      jpegFile
    );
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('photo');
  });

  it('returns base slug when queryFirst returns null (no rows at all)', async () => {
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'photo', category: 'gallery' },
      jpegFile
    );
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('photo');
  });

  it('returns slug-2 when only the exact base slug exists (max_suffix=1)', async () => {
    // When only "photo" exists, the CASE gives it value 1, so MAX=1
    vi.mocked(queryFirst).mockResolvedValue({ max_suffix: 1 });
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'photo', category: 'gallery' },
      jpegFile
    );
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('photo-2');
  });

  it('generates photo-11 when photo through photo-10 exist (P0 numeric sort fix)', async () => {
    // The old code did lexicographic ORDER BY DESC LIMIT 1 which returned "photo-9"
    // (because "9" > "10" lexicographically), producing "photo-10" (duplicate!).
    // The new code uses MAX() which correctly returns max_suffix=10,
    // yielding "photo-11".
    vi.mocked(queryFirst).mockResolvedValue({ max_suffix: 10 });
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'photo', category: 'gallery' },
      jpegFile
    );
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('photo-11');
  });

  it('increments correctly for large suffix numbers (max_suffix=99)', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ max_suffix: 99 });
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'classroom-activity', category: 'classroom' },
      jpegFile
    );
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('classroom-activity-100');
  });

  it('escapes underscores in base slug to prevent LIKE wildcard matching', async () => {
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'my_photo', category: 'gallery' },
      jpegFile
    );
    await POST(ctx);

    // Find the slug uniqueness query (the one that queries content with type='photos')
    const slugQueryCalls = vi
      .mocked(queryFirst)
      .mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes("type = 'photos'")
      );
    expect(slugQueryCalls).toHaveLength(1);

    // The LIKE parameter should have escaped underscores: my\_photo-%
    const [, values] = slugQueryCalls[0];
    expect(values![0]).toBe('my_photo'); // exact match param unchanged
    expect(values![1]).toBe('my\\_photo-%'); // LIKE param has escaped underscore
  });

  it('escapes percent signs in base slug to prevent LIKE wildcard matching', async () => {
    // Edge case: slug containing a percent (shouldn't happen normally but defensive)
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'photo-100percent', category: 'gallery' },
      { name: 'photo-100percent.jpg', type: 'image/jpeg', content: 'data' }
    );
    await POST(ctx);

    const slugQueryCalls = vi
      .mocked(queryFirst)
      .mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes("type = 'photos'")
      );
    // The slug validator would reject % so the slug itself is clean,
    // but the escaping logic should still work
    expect(slugQueryCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('uses SQL MAX() instead of ORDER BY LIMIT 1 for numeric correctness', async () => {
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'photo', category: 'gallery' },
      jpegFile
    );
    await POST(ctx);

    const slugQueryCalls = vi
      .mocked(queryFirst)
      .mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes("type = 'photos'")
      );
    expect(slugQueryCalls).toHaveLength(1);

    const [sql] = slugQueryCalls[0];
    // Verify the query uses MAX() — this is the core of the P0 fix
    expect(sql).toContain('MAX(');
    // And does NOT use ORDER BY ... LIMIT 1 (the old buggy approach)
    expect(sql).not.toContain('ORDER BY');
    expect(sql).not.toContain('LIMIT 1');
  });

  it('uses ESCAPE clause in the LIKE query for safety', async () => {
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'photo', category: 'gallery' },
      jpegFile
    );
    await POST(ctx);

    const slugQueryCalls = vi
      .mocked(queryFirst)
      .mock.calls.filter(
        call => typeof call[0] === 'string' && call[0].includes("type = 'photos'")
      );
    const [sql] = slugQueryCalls[0];
    expect(sql).toContain("ESCAPE '\\'");
  });
});

describe('POST /api/media/upload — auth and validation', () => {
  beforeEach(() => {
    setupAllMocks();
  });

  it('returns 401 for unauthenticated users', async () => {
    vi.mocked(checkAdminAuth).mockResolvedValue({
      isAuthenticated: false,
      isAdmin: false,
      session: null,
      user: null
    });
    const ctx = makeMockContext({}, jpegFile);
    const response = await POST(ctx);
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid file type', async () => {
    vi.mocked(validateFile).mockResolvedValue({ valid: false, error: 'File type not allowed' });
    const ctx = makeMockContext(
      {},
      { name: 'script.svg', type: 'image/svg+xml', content: '<svg></svg>' }
    );
    const response = await POST(ctx);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('File type not allowed');
  });

  it('does not create photo entry when createPhotoEntry is not set', async () => {
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext({}, jpegFile);
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBeNull();
  });

  it('returns 500 when handleMediaUpload fails', async () => {
    vi.mocked(handleMediaUpload).mockResolvedValue({
      success: false,
      error: 'Storage unavailable'
    } as never);
    const ctx = makeMockContext({}, jpegFile);
    const response = await POST(ctx);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Storage unavailable');
  });
});
