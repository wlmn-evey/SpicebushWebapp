/**
 * Media Storage Handler
 * Uses Netlify Blobs by default with local fallback for development.
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { getStore } from '@netlify/blobs';
import { queryRows } from './db/client';
import { logServerError, logServerWarn } from './server-logger';

type StorageProviderName = 'local' | 'netlify-blobs' | 'gcs' | 'r2' | 'b2';

type StorageSettingsConfig = {
  maxFileSize: number;
  gcs: Record<string, unknown>;
  r2: Record<string, unknown>;
  b2: Record<string, unknown>;
};

type StorageSettings = {
  provider: StorageProviderName;
  config: StorageSettingsConfig;
};

type UploadFileInput = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};

export type MediaUploadSuccess = {
  success: true;
  mediaId: string;
  url: string;
  storagePath: string;
  provider: StorageProviderName;
  width: number | null;
  height: number | null;
  mimeType: string;
  originalFilename: string;
};

export type MediaUploadFailure = {
  success: false;
  error: string;
};

export type MediaUploadResult = MediaUploadSuccess | MediaUploadFailure;

type UploadResult = {
  url: string;
  path: string;
  provider: StorageProviderName;
};

type MediaAssetReference = {
  url?: string | null;
  storagePath?: string | null;
  metadata?: Record<string, unknown> | null;
};

type MediaBlobPayload = {
  data: ArrayBuffer;
  contentType: string;
  etag?: string;
};

const toConfigRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toFiniteNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const parseEnvProvider = (value: unknown): StorageProviderName | null => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'netlify' || normalized === 'blobs') return 'netlify-blobs';
  if (normalized === 'local') return 'local';
  if (normalized === 'netlify-blobs') return 'netlify-blobs';
  if (normalized === 'gcs' || normalized === 'r2' || normalized === 'b2') {
    return normalized;
  }
  return null;
};

const normalizeProvider = (
  value: unknown,
  fallback: StorageProviderName = 'netlify-blobs'
): StorageProviderName => parseEnvProvider(value) ?? fallback;

const resolveContentType = (metadata: Record<string, unknown>): string => {
  const candidate = metadata.contentType;
  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate;
  }
  return 'application/octet-stream';
};

const safeBasename = (filename: string): string => {
  const fallbackName = 'upload.bin';
  const raw = path.basename(filename || fallbackName).trim();
  const cleaned = raw.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return cleaned.length > 0 ? cleaned : fallbackName;
};

const extensionFromMime = (mimeType: string): string => {
  const normalized = mimeType.trim().toLowerCase();
  switch (normalized) {
  case 'image/jpeg':
    return '.jpg';
  case 'image/png':
    return '.png';
  case 'image/webp':
    return '.webp';
  case 'image/gif':
    return '.gif';
  case 'image/avif':
    return '.avif';
  case 'image/svg+xml':
    return '.svg';
  case 'application/pdf':
    return '.pdf';
  default:
    return '.bin';
  }
};

const normalizeExtension = (filename: string, mimeType: string): string => {
  const ext = path.extname(safeBasename(filename)).toLowerCase();
  if (/^\.[a-z0-9]{2,5}$/.test(ext)) {
    return ext;
  }
  return extensionFromMime(mimeType);
};

const buildStorageKey = (filename: string, fileBuffer: Buffer, mimeType: string): string => {
  const timestamp = Date.now();
  const hash = createHash('md5').update(fileBuffer).digest('hex').slice(0, 10);
  const ext = normalizeExtension(filename, mimeType);
  const yearMonth = new Date().toISOString().slice(0, 7).replace('-', '/');
  return `${yearMonth}/${timestamp}-${hash}${ext}`;
};

const decodeBlobPath = (rawPath: string): string =>
  rawPath
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => decodeURIComponent(segment))
    .join('/');

const getBlobPathFromUrl = (url: string, basePath: string): string | null => {
  const expectedPrefix = `${basePath}/`;
  if (!url.startsWith(expectedPrefix)) {
    return null;
  }
  const rawPath = url.slice(expectedPrefix.length);
  if (!rawPath) {
    return null;
  }
  return decodeBlobPath(rawPath);
};

const getLocalPathFromUrl = (url: string): string | null => {
  if (!url.startsWith('/uploads/')) {
    return null;
  }
  return path.basename(url.slice('/uploads/'.length));
};

const STORAGE_CONFIG = {
  local: {
    uploadDir: './public/uploads',
    maxFileSize: 10 * 1024 * 1024,
    allowedTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/avif',
      'image/svg+xml',
      'application/pdf',
      'application/octet-stream'
    ]
  },
  netlifyBlobs: {
    storeName: process.env.NETLIFY_MEDIA_BLOB_STORE || 'spicebush-media',
    basePath: '/api/media/blob'
  },
  gcs: {
    bucketName: process.env.GCS_BUCKET_NAME || 'spicebush-media',
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_KEY_FILE
  }
};

interface StorageProvider {
  name: StorageProviderName;
  upload(file: Buffer, filename: string, metadata?: Record<string, unknown>): Promise<UploadResult>;
  delete(pathValue: string): Promise<void>;
  getUrl(pathValue: string): string;
}

class LocalStorage implements StorageProvider {
  name: StorageProviderName = 'local';

  constructor(private uploadDir: string) {}

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Buffer, filename: string, metadata: Record<string, unknown> = {}): Promise<UploadResult> {
    await this.ensureUploadDir();

    const contentType = typeof metadata.contentType === 'string'
      ? metadata.contentType
      : 'application/octet-stream';
    const key = buildStorageKey(filename, file, contentType).replace(/\//g, '-');
    const filePath = path.join(this.uploadDir, key);
    await fs.writeFile(filePath, file);

    return {
      url: this.getUrl(key),
      path: key,
      provider: this.name
    };
  }

  async delete(pathValue: string): Promise<void> {
    const safePath = path.basename(pathValue);
    const filePath = path.join(this.uploadDir, safePath);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      logServerWarn('Failed to delete local media file', { filePath, error });
    }
  }

  getUrl(pathValue: string): string {
    return `/uploads/${path.basename(pathValue)}`;
  }
}

class NetlifyBlobsStorage implements StorageProvider {
  name: StorageProviderName = 'netlify-blobs';

  constructor(private storeName: string, private basePath: string) {}

  private getStoreInstance() {
    return getStore(this.storeName);
  }

  async upload(file: Buffer, filename: string, metadata: Record<string, unknown> = {}): Promise<UploadResult> {
    const key = buildStorageKey(filename, file, String(metadata.contentType ?? 'application/octet-stream'));
    const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;

    await this.getStoreInstance().set(key, arrayBuffer, { metadata });

    return {
      url: this.getUrl(key),
      path: key,
      provider: this.name
    };
  }

  async delete(pathValue: string): Promise<void> {
    await this.getStoreInstance().delete(pathValue);
  }

  getUrl(pathValue: string): string {
    const encodedPath = pathValue.split('/').map((segment) => encodeURIComponent(segment)).join('/');
    return `${this.basePath}/${encodedPath}`;
  }
}

class GoogleCloudStorage implements StorageProvider {
  name: StorageProviderName = 'gcs';

  async upload(_file: Buffer, _filename: string): Promise<UploadResult> {
    throw new Error('Google Cloud Storage not yet implemented');
  }

  async delete(_pathValue: string): Promise<void> {
    throw new Error('Google Cloud Storage not yet implemented');
  }

  getUrl(_pathValue: string): string {
    throw new Error('Google Cloud Storage not yet implemented');
  }
}

let storageSettingsCache: StorageSettings | null = null;
let cacheExpiry = 0;

async function getStorageSettings(): Promise<StorageSettings> {
  const now = Date.now();

  if (storageSettingsCache && cacheExpiry > now) {
    return storageSettingsCache;
  }

  const envDefault = parseEnvProvider(process.env.MEDIA_STORAGE_PROVIDER) ?? 'netlify-blobs';

  try {
    const data = await queryRows<{ setting_key: string; setting_value: unknown }>(
      `
        SELECT setting_key, setting_value
        FROM admin_settings
        WHERE setting_category = 'storage'
          AND setting_key = ANY($1::text[])
      `,
      [['storage_provider', 'max_file_size', 'gcs_config', 'r2_config', 'b2_config']]
    );

    const settings: Record<string, unknown> = {};
    data?.forEach((row) => {
      try {
        if (typeof row.setting_value === 'string') {
          settings[row.setting_key] = JSON.parse(row.setting_value);
        } else {
          settings[row.setting_key] = row.setting_value;
        }
      } catch {
        settings[row.setting_key] = row.setting_value;
      }
    });

    const maxFileSizeMb = toFiniteNumber(settings.max_file_size, 10);
    storageSettingsCache = {
      provider: normalizeProvider(settings.storage_provider, envDefault),
      config: {
        maxFileSize: maxFileSizeMb * 1024 * 1024,
        gcs: toConfigRecord(settings.gcs_config),
        r2: toConfigRecord(settings.r2_config),
        b2: toConfigRecord(settings.b2_config)
      }
    };

    cacheExpiry = now + 5 * 60 * 1000;
    return storageSettingsCache;
  } catch (error) {
    logServerWarn('Failed to load storage settings, using defaults', { error });

    return {
      provider: envDefault,
      config: {
        maxFileSize: STORAGE_CONFIG.local.maxFileSize,
        gcs: {},
        r2: {},
        b2: {}
      }
    };
  }
}

export async function getStorageProvider(): Promise<StorageProvider> {
  const settings = await getStorageSettings();

  switch (settings.provider) {
  case 'netlify-blobs':
    return new NetlifyBlobsStorage(
      STORAGE_CONFIG.netlifyBlobs.storeName,
      STORAGE_CONFIG.netlifyBlobs.basePath
    );
  case 'gcs':
    return new GoogleCloudStorage();
  case 'r2':
  case 'b2':
    logServerWarn('Requested storage provider is not implemented, falling back to local', {
      provider: settings.provider
    });
    return new LocalStorage(STORAGE_CONFIG.local.uploadDir);
  case 'local':
  default:
    return new LocalStorage(STORAGE_CONFIG.local.uploadDir);
  }
}

const getImageDimensions = async (file: UploadFileInput): Promise<{ width: number | null; height: number | null }> => {
  if (!file.mimetype.startsWith('image/')) {
    return { width: null, height: null };
  }

  try {
    const metadata = await sharp(file.buffer).metadata();
    return {
      width: metadata.width ?? null,
      height: metadata.height ?? null
    };
  } catch (error) {
    logServerWarn('Failed to read uploaded image dimensions', {
      filename: file.originalname,
      mimetype: file.mimetype,
      error
    });
    return { width: null, height: null };
  }
};

const uploadWithFallback = async (
  storage: StorageProvider,
  file: UploadFileInput,
  metadata: Record<string, unknown>
): Promise<UploadResult> => {
  try {
    return await storage.upload(file.buffer, file.originalname, metadata);
  } catch (error) {
    if (storage.name !== 'netlify-blobs') {
      throw error;
    }

    const isProduction = (process.env.NODE_ENV ?? '').trim().toLowerCase() === 'production';
    if (isProduction) {
      throw error;
    }

    logServerWarn('Netlify Blobs upload failed, falling back to local storage', {
      filename: file.originalname,
      error
    });

    const localStorage = new LocalStorage(STORAGE_CONFIG.local.uploadDir);
    return localStorage.upload(file.buffer, file.originalname, metadata);
  }
};

export async function handleMediaUpload(file: UploadFileInput, userId: string): Promise<MediaUploadResult> {
  try {
    const settings = await getStorageSettings();
    const maxFileSize = settings.config.maxFileSize || STORAGE_CONFIG.local.maxFileSize;

    if (!STORAGE_CONFIG.local.allowedTypes.includes(file.mimetype)) {
      return { success: false, error: 'File type not allowed' };
    }

    if (file.size > maxFileSize) {
      return { success: false, error: 'File too large' };
    }

    const { width, height } = await getImageDimensions(file);
    const storage = await getStorageProvider();

    const storageMetadata: Record<string, unknown> = {
      contentType: file.mimetype,
      originalFilename: file.originalname,
      uploadedBy: userId,
      uploadedAt: new Date().toISOString(),
      width,
      height
    };

    const uploaded = await uploadWithFallback(storage, file, storageMetadata);

    const mediaMetadata: Record<string, unknown> = {
      provider: uploaded.provider,
      contentType: file.mimetype,
      width,
      height
    };

    const inserted = await queryRows<{ id: string; url: string; storage_path: string | null }>(
      `
        INSERT INTO media (filename, url, size, type, metadata, storage_path, uploaded_by)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        RETURNING id, url, storage_path
      `,
      [
        file.originalname,
        uploaded.url,
        file.size,
        file.mimetype,
        JSON.stringify(mediaMetadata),
        uploaded.path,
        userId
      ]
    );

    const row = inserted[0];
    if (!row) {
      return { success: false, error: 'Failed to store media metadata' };
    }

    return {
      success: true,
      mediaId: row.id,
      url: row.url,
      storagePath: row.storage_path ?? uploaded.path,
      provider: uploaded.provider,
      width,
      height,
      mimeType: file.mimetype,
      originalFilename: file.originalname
    };
  } catch (error) {
    logServerError('Media upload failed', error);
    return { success: false, error: 'Upload failed' };
  }
}

export async function validateFile(
  file: { mimetype: string; size: number }
): Promise<{ valid: boolean; error?: string }> {
  const settings = await getStorageSettings();
  const maxFileSize = settings.config.maxFileSize || STORAGE_CONFIG.local.maxFileSize;

  if (!STORAGE_CONFIG.local.allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'File type not allowed. Allowed types: JPG, PNG, WebP, GIF, AVIF, SVG, PDF' };
  }

  if (file.size > maxFileSize) {
    return { valid: false, error: `File too large. Maximum size: ${maxFileSize / 1024 / 1024}MB` };
  }

  return { valid: true };
}

export async function getNetlifyBlobByPath(pathValue: string): Promise<MediaBlobPayload | null> {
  try {
    const store = getStore(STORAGE_CONFIG.netlifyBlobs.storeName);
    const blob = await store.getWithMetadata(pathValue, { type: 'arrayBuffer' });

    if (!blob) {
      return null;
    }

    const metadata = toConfigRecord(blob.metadata);
    return {
      data: blob.data,
      contentType: resolveContentType(metadata),
      etag: blob.etag
    };
  } catch (error) {
    logServerError('Failed to read Netlify blob', error, { pathValue });
    return null;
  }
}

const inferProviderFromReference = (reference: MediaAssetReference): StorageProviderName => {
  const providerFromMetadata = parseEnvProvider(reference.metadata?.provider);
  if (providerFromMetadata) {
    return providerFromMetadata;
  }

  const url = typeof reference.url === 'string' ? reference.url : '';
  if (url.startsWith(`${STORAGE_CONFIG.netlifyBlobs.basePath}/`)) {
    return 'netlify-blobs';
  }

  return 'local';
};

export async function deleteStoredMediaAsset(reference: MediaAssetReference): Promise<void> {
  const provider = inferProviderFromReference(reference);
  const storagePath = typeof reference.storagePath === 'string' ? reference.storagePath : null;
  const url = typeof reference.url === 'string' ? reference.url : null;

  if (provider === 'netlify-blobs') {
    const blobPath = storagePath || (url ? getBlobPathFromUrl(url, STORAGE_CONFIG.netlifyBlobs.basePath) : null);
    if (!blobPath) {
      return;
    }

    try {
      const storage = new NetlifyBlobsStorage(
        STORAGE_CONFIG.netlifyBlobs.storeName,
        STORAGE_CONFIG.netlifyBlobs.basePath
      );
      await storage.delete(blobPath);
    } catch (error) {
      logServerWarn('Failed to delete Netlify blob media asset', { blobPath, error });
    }

    return;
  }

  const localPath = storagePath || (url ? getLocalPathFromUrl(url) : null);
  if (!localPath) {
    return;
  }

  try {
    const storage = new LocalStorage(STORAGE_CONFIG.local.uploadDir);
    await storage.delete(localPath);
  } catch (error) {
    logServerWarn('Failed to delete local media asset', { localPath, error });
  }
}

export const mediaStorageUtils = {
  decodeBlobPath
};
