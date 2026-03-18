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
  errorResponse: vi.fn((msg: string, status: number) =>
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
        nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength)
      );
  }
  return file;
};

const makeMockContext = (fields: Record<string, string>, file?: { name: string; type: string; content: string }) => {
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

const jpegFile = { name: 'classroom-activity.jpg', type: 'image/jpeg', content: 'fake-image-data' };

/**
 * Set up all mocks fresh for each test. This must be called in every beforeEach
 * because setup.ts afterEach calls vi.restoreAllMocks() which resets implementations.
 */
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

describe('POST /api/media/upload — photo slug uniqueness (P2 fix)', () => {
  beforeEach(() => {
    setupAllMocks();
  });

  it('uses baseSlug directly when no existing slugs match', async () => {
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext({ createPhotoEntry: 'true', category: 'classroom' }, jpegFile);
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('classroom-activity');
  });

  it('appends -2 when the exact base slug already exists', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ slug: 'classroom-activity' });
    const ctx = makeMockContext({ createPhotoEntry: 'true', category: 'classroom' }, jpegFile);
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('classroom-activity-2');
  });

  it('increments suffix when slug with suffix already exists', async () => {
    vi.mocked(queryFirst).mockResolvedValue({ slug: 'classroom-activity-3' });
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', slug: 'classroom-activity', category: 'classroom' },
      jpegFile
    );
    const response = await POST(ctx);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.photoSlug).toBe('classroom-activity-4');
  });

  it('uses a single query for slug uniqueness check (N+1 fix)', async () => {
    vi.mocked(queryFirst).mockResolvedValue(null);
    const ctx = makeMockContext(
      { createPhotoEntry: 'true', category: 'gallery' },
      { name: 'test-photo.jpg', type: 'image/jpeg', content: 'data' }
    );
    await POST(ctx);

    const slugQueryCalls = vi.mocked(queryFirst).mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes("type = 'photos'")
    );
    expect(slugQueryCalls).toHaveLength(1);
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

  it('returns 400 for invalid file type (SVG rejection)', async () => {
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
});
