import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock DB client and server logger so validateFile can call getStorageSettings
vi.mock('./db/client', () => ({
  queryRows: vi.fn().mockResolvedValue([]),
  queryFirst: vi.fn().mockResolvedValue(null)
}));

vi.mock('./server-logger', () => ({
  logServerError: vi.fn(),
  logServerWarn: vi.fn()
}));

import { validateFile } from './media-storage';

describe('validateFile — upload type validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validSize = 1024 * 1024; // 1 MB — well under default 10 MB limit

  describe('allowed types', () => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'application/pdf'
    ];

    it.each(allowedTypes)('accepts %s uploads', async mimetype => {
      const result = await validateFile({ mimetype, size: validSize });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('rejected types (P1 security fix)', () => {
    it('rejects SVG uploads (image/svg+xml)', async () => {
      const result = await validateFile({ mimetype: 'image/svg+xml', size: validSize });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('rejects octet-stream uploads (application/octet-stream)', async () => {
      const result = await validateFile({ mimetype: 'application/octet-stream', size: validSize });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('rejects text/html uploads', async () => {
      const result = await validateFile({ mimetype: 'text/html', size: validSize });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('rejects application/javascript uploads', async () => {
      const result = await validateFile({ mimetype: 'application/javascript', size: validSize });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('rejects empty mimetype', async () => {
      const result = await validateFile({ mimetype: '', size: validSize });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    });
  });

  describe('file size validation', () => {
    it('rejects files exceeding the default max size (10 MB)', async () => {
      const oversize = 11 * 1024 * 1024; // 11 MB
      const result = await validateFile({ mimetype: 'image/jpeg', size: oversize });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
    });

    it('accepts files at exactly the max size', async () => {
      const exactSize = 10 * 1024 * 1024; // 10 MB
      const result = await validateFile({ mimetype: 'image/jpeg', size: exactSize });
      expect(result.valid).toBe(true);
    });

    it('accepts zero-byte files (valid mimetype)', async () => {
      const result = await validateFile({ mimetype: 'image/jpeg', size: 0 });
      expect(result.valid).toBe(true);
    });
  });

  describe('error message content', () => {
    it('lists allowed types in rejection message', async () => {
      const result = await validateFile({ mimetype: 'text/plain', size: validSize });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/JPG|PNG|WebP|GIF|AVIF|PDF/i);
    });

    it('includes size limit in rejection message for oversized files', async () => {
      const oversize = 11 * 1024 * 1024;
      const result = await validateFile({ mimetype: 'image/jpeg', size: oversize });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/10MB|10 MB|Maximum size/i);
    });
  });
});
