/**
 * Media Storage Handler
 * Local storage with future Google Cloud Storage migration path
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';
import { query, queryRows } from './db/client';
import { logServerError, logServerWarn } from './server-logger';

type StorageProviderName = 'local' | 'gcs' | 'r2' | 'b2';

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

const normalizeProvider = (value: unknown): StorageProviderName => {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (normalized === 'gcs' || normalized === 'r2' || normalized === 'b2') {
    return normalized;
  }
  return 'local';
};

// Storage configuration
const STORAGE_CONFIG = {
  local: {
    uploadDir: './public/uploads',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/octet-stream']
  },
  // Future: Google Cloud Storage config
  gcs: {
    bucketName: process.env.GCS_BUCKET_NAME || 'spicebush-media',
    projectId: process.env.GCS_PROJECT_ID,
    keyFilename: process.env.GCS_KEY_FILE
  }
};

// Storage interface for easy provider switching
interface StorageProvider {
  upload(file: File | Buffer, filename: string): Promise<{ url: string; path: string }>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

// Local file system storage
class LocalStorage implements StorageProvider {
  private uploadDir: string;

  constructor(uploadDir: string) {
    this.uploadDir = uploadDir;
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async upload(file: Buffer, filename: string): Promise<{ url: string; path: string }> {
    // Generate unique filename
    const timestamp = Date.now();
    const hash = createHash('md5').update(file).digest('hex').substring(0, 8);
    const ext = path.extname(filename);
    const safeFilename = `${timestamp}-${hash}${ext}`;
    
    // Save file
    const filePath = path.join(this.uploadDir, safeFilename);
    await fs.writeFile(filePath, file);
    
    // Return public URL
    const publicPath = `/uploads/${safeFilename}`;
    return {
      url: publicPath,
      path: filePath
    };
  }

  async delete(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      logServerWarn('Failed to delete local media file', { filePath, error });
    }
  }

  getUrl(path: string): string {
    return path; // Already a public URL for local storage
  }
}

// Future: Google Cloud Storage implementation
class GoogleCloudStorage implements StorageProvider {
  // Placeholder for future implementation
  async upload(_file: Buffer, _filename: string): Promise<{ url: string; path: string }> {
    throw new Error('Google Cloud Storage not yet implemented');
  }

  async delete(_path: string): Promise<void> {
    throw new Error('Google Cloud Storage not yet implemented');
  }

  getUrl(_path: string): string {
    throw new Error('Google Cloud Storage not yet implemented');
  }
}

// Cache for storage settings
let storageSettingsCache: StorageSettings | null = null;
let cacheExpiry = 0;

// Get storage settings from database
async function getStorageSettings() {
  const now = Date.now();
  
  // Return cached settings if valid
  if (storageSettingsCache && cacheExpiry > now) {
    return storageSettingsCache;
  }
  
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
    data?.forEach(row => {
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
      provider: normalizeProvider(settings.storage_provider),
      config: {
        maxFileSize: maxFileSizeMb * 1024 * 1024,
        gcs: toConfigRecord(settings.gcs_config),
        r2: toConfigRecord(settings.r2_config),
        b2: toConfigRecord(settings.b2_config)
      }
    };
    
    // Cache for 5 minutes
    cacheExpiry = now + 5 * 60 * 1000;
    
    return storageSettingsCache;
  } catch (error) {
    logServerWarn('Failed to load storage settings, using local defaults', { error });
    // Fallback to local storage
    return {
      provider: 'local',
      config: {
        maxFileSize: STORAGE_CONFIG.local.maxFileSize,
        gcs: {},
        r2: {},
        b2: {}
      }
    };
  }
}

// Factory to get storage provider
export async function getStorageProvider(): Promise<StorageProvider> {
  const settings = await getStorageSettings();
  
  switch (settings.provider) {
  case 'gcs':
    return new GoogleCloudStorage();
  case 'r2':
    // Future: return new CloudflareR2Storage();
    return new LocalStorage(STORAGE_CONFIG.local.uploadDir);
  case 'b2':
    // Future: return new BackblazeB2Storage();
    return new LocalStorage(STORAGE_CONFIG.local.uploadDir);
  case 'local':
  default:
    return new LocalStorage(STORAGE_CONFIG.local.uploadDir);
  }
}

// Media upload handler with auth check
export async function handleMediaUpload(
  file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Validate file
    if (!STORAGE_CONFIG.local.allowedTypes.includes(file.mimetype)) {
      return { success: false, error: 'File type not allowed' };
    }
    
    if (file.size > STORAGE_CONFIG.local.maxFileSize) {
      return { success: false, error: 'File too large' };
    }
    
    // Upload file
    const storage = await getStorageProvider();
    const { url } = await storage.upload(file.buffer, file.originalname);
    
    // Save to database
    await query(
      `
        INSERT INTO media (filename, url, size, uploaded_by)
        VALUES ($1, $2, $3, $4)
      `,
      [file.originalname, url, file.size, userId]
    );
    
    return { success: true, url };
  } catch (error) {
    logServerError('Media upload failed', error);
    return { success: false, error: 'Upload failed' };
  }
}

// Helper to validate uploaded files
export async function validateFile(
  file: { mimetype: string; size: number }
): Promise<{ valid: boolean; error?: string }> {
  const settings = await getStorageSettings();
  const maxFileSize = settings.config.maxFileSize || STORAGE_CONFIG.local.maxFileSize;
  
  if (!STORAGE_CONFIG.local.allowedTypes.includes(file.mimetype)) {
    return { valid: false, error: 'File type not allowed. Allowed types: JPG, PNG, WebP, GIF, PDF' };
  }
  
  if (file.size > maxFileSize) {
    return { valid: false, error: `File too large. Maximum size: ${maxFileSize / 1024 / 1024}MB` };
  }
  
  return { valid: true };
}
