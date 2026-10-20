import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@lib/media-storage', () => ({
  getNetlifyBlobByPath: vi.fn(),
  mediaStorageUtils: {
    decodeBlobPath: vi.fn()
  }
}));

import { getNetlifyBlobByPath, mediaStorageUtils } from '@lib/media-storage';
import { GET } from './[...key]';

const makeContext = (key: string) =>
  ({
    params: { key }
  }) as unknown as Parameters<typeof GET>[0];

describe('GET /api/media/blob/[...key] — SVG security headers (F-05 P1 fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when blob key is missing or invalid', async () => {
    vi.mocked(mediaStorageUtils.decodeBlobPath).mockReturnValue('');
    const response = await GET(makeContext(''));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Missing blob key');
  });

  it('returns 404 when blob is not found', async () => {
    vi.mocked(mediaStorageUtils.decodeBlobPath).mockReturnValue('some/path.jpg');
    vi.mocked(getNetlifyBlobByPath).mockResolvedValue(null);
    const response = await GET(makeContext('some/path.jpg'));
    expect(response.status).toBe(404);
  });

  describe('SVG content type', () => {
    beforeEach(() => {
      vi.mocked(mediaStorageUtils.decodeBlobPath).mockReturnValue('images/icon.svg');
      vi.mocked(getNetlifyBlobByPath).mockResolvedValue({
        data: Buffer.from('<svg></svg>'),
        contentType: 'image/svg+xml',
        etag: '"abc123"'
      } as never);
    });

    it('sets Content-Security-Policy header for SVG content', async () => {
      const response = await GET(makeContext('images/icon.svg'));
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Security-Policy')).toBe(
        "default-src 'none'; style-src 'unsafe-inline'"
      );
    });

    it('sets Content-Disposition: attachment for SVG content', async () => {
      const response = await GET(makeContext('images/icon.svg'));
      expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="image.svg"');
    });

    it('sets X-Content-Type-Options: nosniff for SVG content', async () => {
      const response = await GET(makeContext('images/icon.svg'));
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('still sets correct Content-Type for SVG', async () => {
      const response = await GET(makeContext('images/icon.svg'));
      expect(response.headers.get('Content-Type')).toBe('image/svg+xml');
    });

    it('still sets Cache-Control for SVG', async () => {
      const response = await GET(makeContext('images/icon.svg'));
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    });

    it('sets ETag when available', async () => {
      const response = await GET(makeContext('images/icon.svg'));
      expect(response.headers.get('ETag')).toBe('"abc123"');
    });
  });

  describe('JPEG content type', () => {
    beforeEach(() => {
      vi.mocked(mediaStorageUtils.decodeBlobPath).mockReturnValue('images/photo.jpg');
      vi.mocked(getNetlifyBlobByPath).mockResolvedValue({
        data: Buffer.from('fake-jpeg'),
        contentType: 'image/jpeg',
        etag: '"def456"'
      } as never);
    });

    it('sets X-Content-Type-Options: nosniff for JPEG content', async () => {
      const response = await GET(makeContext('images/photo.jpg'));
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('does NOT set Content-Disposition: attachment for JPEG', async () => {
      const response = await GET(makeContext('images/photo.jpg'));
      expect(response.headers.get('Content-Disposition')).toBeNull();
    });

    it('does NOT set Content-Security-Policy for JPEG', async () => {
      const response = await GET(makeContext('images/photo.jpg'));
      expect(response.headers.get('Content-Security-Policy')).toBeNull();
    });

    it('sets correct Content-Type for JPEG', async () => {
      const response = await GET(makeContext('images/photo.jpg'));
      expect(response.headers.get('Content-Type')).toBe('image/jpeg');
    });

    it('sets Cache-Control for JPEG', async () => {
      const response = await GET(makeContext('images/photo.jpg'));
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    });
  });

  describe('PNG content type', () => {
    beforeEach(() => {
      vi.mocked(mediaStorageUtils.decodeBlobPath).mockReturnValue('images/icon.png');
      vi.mocked(getNetlifyBlobByPath).mockResolvedValue({
        data: Buffer.from('fake-png'),
        contentType: 'image/png',
        etag: null
      } as never);
    });

    it('sets X-Content-Type-Options: nosniff for PNG', async () => {
      const response = await GET(makeContext('images/icon.png'));
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('does NOT set Content-Disposition for PNG', async () => {
      const response = await GET(makeContext('images/icon.png'));
      expect(response.headers.get('Content-Disposition')).toBeNull();
    });

    it('omits ETag when not available', async () => {
      const response = await GET(makeContext('images/icon.png'));
      expect(response.headers.get('ETag')).toBeNull();
    });
  });
});
