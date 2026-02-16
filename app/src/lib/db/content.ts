import { logError } from '@lib/error-logger';
import { CacheStore, calculateCacheStats } from './cache';
import { queryFirst, queryRows } from './client';
import type { ContentEntry, ContentRow, SettingRow } from './types';

const DATABASE_COLLECTIONS = new Set([
  'blog',
  'staff',
  'announcements',
  'events',
  'faq',
  'tuition',
  'settings',
  'testimonials',
  'school-info',
  'hours',
  'photos',
  'cms_hours',
  'cms_blog',
  'cms_staff',
  'cms_announcements',
  'cms_events',
  'cms_tuition',
  'cms_testimonials'
]);

const DEFAULT_COLLECTION_TTL = 5 * 60 * 1000; // 5 minutes
const SETTINGS_TTL = 30 * 60 * 1000; // 30 minutes

const cache = new CacheStore();
let queryCount = 0;
let cacheHits = 0;
let cacheMisses = 0;

const toContentEntry = (row: ContentRow): ContentEntry => {
  const dataRecord = { ...(row.data ?? {}) } as Record<string, unknown>;
  const originalTitle = typeof dataRecord['title'] === 'string' ? (dataRecord['title'] as string) : undefined;
  const mergedData = {
    ...dataRecord,
    title: row.title ?? originalTitle
  } as Record<string, unknown> & { title?: string };

  const bodyValue = typeof dataRecord['body'] === 'string' ? (dataRecord['body'] as string) : '';

  return {
    id: row.slug,
    slug: row.slug,
    collection: row.type,
    data: mergedData,
    body: bodyValue
  };
};

const parseSettingValue = (value: unknown) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }
  return value;
};

async function fetchCollection(collection: string): Promise<ContentEntry[]> {
  if (!DATABASE_COLLECTIONS.has(collection)) {
    return [];
  }

  try {
    const rows = await queryRows<ContentRow>(
      `
        SELECT slug, type, title, data, status, created_at, updated_at, author_email, id
        FROM content
        WHERE type = $1 AND status = 'published'
        ORDER BY created_at DESC
      `,
      [collection]
    );
    return rows.map(toContentEntry);
  } catch (error) {
    logError('db.content', error, { action: 'fetchCollection', collection });
    return [];
  }
}

async function fetchEntry(collection: string, slug: string): Promise<ContentEntry | null> {
  if (!DATABASE_COLLECTIONS.has(collection)) {
    return null;
  }

  try {
    const row = await queryFirst<ContentRow>(
      `
        SELECT slug, type, title, data, status, created_at, updated_at, author_email, id
        FROM content
        WHERE type = $1 AND slug = $2 AND status = 'published'
        LIMIT 1
      `,
      [collection, slug]
    );
    return row ? toContentEntry(row) : null;
  } catch (error) {
    logError('db.content', error, { action: 'fetchEntry', collection, slug });
    return null;
  }
}

function getCollectionTtl(collection: string, fallback: number): number {
  switch (collection) {
  case 'settings':
    return SETTINGS_TTL;
  case 'staff':
  case 'tuition':
    return 15 * 60 * 1000;
  case 'announcements':
  case 'events':
  case 'blog':
    return 5 * 60 * 1000;
  default:
    return fallback;
  }
}

export async function getCollection(collection: string, maxAge = DEFAULT_COLLECTION_TTL): Promise<ContentEntry[]> {
  const cacheKey = `collection:${collection}`;
  queryCount++;

  const cached = cache.get<ContentEntry[]>(cacheKey);
  if (cached) {
    cacheHits++;
    return cached;
  }

  cacheMisses++;
  const data = await fetchCollection(collection);
  cache.set(cacheKey, data, getCollectionTtl(collection, maxAge));
  return data;
}

export async function getEntry(
  collection: string,
  slug: string,
  maxAge = DEFAULT_COLLECTION_TTL
): Promise<ContentEntry | null> {
  const cacheKey = `entry:${collection}:${slug}`;
  queryCount++;

  const cached = cache.get<ContentEntry | null>(cacheKey);
  if (cached !== null) {
    cacheHits++;
    return cached;
  }

  cacheMisses++;
  const entry = await fetchEntry(collection, slug);
  cache.set(cacheKey, entry, getCollectionTtl(collection, maxAge));
  return entry;
}

export async function getEntries(
  collection: string,
  filter: (entry: ContentEntry) => boolean
): Promise<ContentEntry[]> {
  const entries = await getCollection(collection);
  return entries.filter(filter);
}

export async function getSetting(key: string, maxAge = SETTINGS_TTL): Promise<unknown> {
  const cacheKey = `setting:${key}`;
  queryCount++;

  const cached = cache.get<unknown>(cacheKey);
  if (cached !== null) {
    cacheHits++;
    return cached;
  }

  cacheMisses++;
  try {
    const row = await queryFirst<SettingRow>(
      `
        SELECT key, value, updated_at
        FROM settings
        WHERE key = $1
        LIMIT 1
      `,
      [key]
    );

    const value = row ? parseSettingValue(row.value) : null;
    cache.set(cacheKey, value, maxAge);
    return value;
  } catch (error) {
    logError('db.content', error, { action: 'getSetting', key });
    return null;
  }
}

export async function getAllSettings(maxAge = SETTINGS_TTL): Promise<Record<string, unknown>> {
  const cacheKey = 'setting:all';
  queryCount++;

  const cached = cache.get<Record<string, unknown>>(cacheKey);
  if (cached) {
    cacheHits++;
    return cached;
  }

  cacheMisses++;
  try {
    const rows = await queryRows<SettingRow>(
      `
        SELECT key, value, updated_at
        FROM settings
      `
    );

    const settings: Record<string, unknown> = {};
    rows.forEach((row) => {
      settings[row.key] = parseSettingValue(row.value);
    });

    cache.set(cacheKey, settings, maxAge);
    return settings;
  } catch (error) {
    logError('db.content', error, { action: 'getAllSettings' });
    return {};
  }
}

export async function getBatchedPageData(collections: string[]): Promise<Record<string, ContentEntry[]>> {
  const results = await Promise.all(
    collections.map(async (collection) => [collection, await getCollection(collection)] as const)
  );
  return Object.fromEntries(results);
}

export async function getHomepageData() {
  return getBatchedPageData(['blog', 'staff', 'testimonials']);
}

export async function getAdminData() {
  const [collections, settings] = await Promise.all([
    getBatchedPageData(['blog', 'staff', 'tuition', 'hours', 'faq', 'testimonials']),
    getAllSettings()
  ]);

  return { collections, settings };
}

export async function getSchoolInfo(): Promise<ContentEntry | null> {
  return getEntry('school-info', 'general');
}

export const cacheUtils = {
  invalidateCollection(collection: string) {
    cache.clear(`collection:${collection}`);
    cache.clear(`entry:${collection}`);
    if (collection === 'settings') {
      cache.clear('setting:');
    }
  },
  invalidateSettings() {
    cache.clear('setting:');
  },
  clearAll() {
    cache.clear();
  },
  getMetrics() {
    const stats = calculateCacheStats(cache);
    const hitRate = queryCount > 0 ? (cacheHits / queryCount) * 100 : 0;
    return {
      queries: queryCount,
      cacheHits,
      cacheMisses,
      hitRate: `${hitRate.toFixed(1)}%`,
      ...stats
    };
  },
  resetMetrics() {
    queryCount = 0;
    cacheHits = 0;
    cacheMisses = 0;
  },
  async preloadCommonData() {
    try {
      await Promise.all([
        getCollection('blog'),
        getCollection('staff'),
        getCollection('hours'),
        getCollection('faq'),
        getCollection('testimonials'),
        getAllSettings()
      ]);
    } catch (error) {
      logError('db.content', error, { action: 'preloadCommonData' });
    }
  }
};

if (typeof setInterval === 'function') {
  setInterval(() => {
    const stats = calculateCacheStats(cache);
    if (stats.expiredEntries > 0) {
      cache.clear();
    }
  }, 10 * 60 * 1000);
}

export {
  getCollection as getCollectionDirect,
  getEntry as getEntryDirect,
  getAllSettings as getAllSettingsDirect,
  getSetting as getSettingDirect
};
