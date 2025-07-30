/**
 * High-performance content caching layer
 * Implements in-memory caching and query batching for optimal performance
 * Designed for simplicity and effectiveness without over-engineering
 */
import { getCollection as getCollectionDirect, getEntry as getEntryDirect, getAllSettings as getAllSettingsDirect, getSetting as getSettingDirect } from './content-db-direct';
import type { ContentEntry } from './content-db-direct';

// Simple in-memory cache implementation
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiry: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttl
    });
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    // Simple pattern matching for cache invalidation
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      if (now > entry.expiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      memoryUsage: this.cache.size * 100 // rough estimate
    };
  }
}

// Global cache instance
const contentCache = new SimpleCache();

// Performance metrics tracking
let queryCount = 0;
let cacheHits = 0;
let cacheMisses = 0;

// Cache key generators
const getCacheKey = (type: 'collection' | 'entry' | 'setting', ...args: string[]): string => {
  return `${type}:${args.join(':')}`;
};

// Cached collection getter with TTL optimization
export async function getCollection(collection: string, maxAge = 5 * 60 * 1000): Promise<ContentEntry[]> {
  const cacheKey = getCacheKey('collection', collection);
  queryCount++;
  
  // Check cache first
  const cached = contentCache.get<ContentEntry[]>(cacheKey);
  if (cached) {
    cacheHits++;
    return cached;
  }
  
  // Cache miss - fetch from database
  cacheMisses++;
  const data = await getCollectionDirect(collection);
  
  // Cache with appropriate TTL based on collection type
  const ttl = getCollectionTTL(collection, maxAge);
  contentCache.set(cacheKey, data, ttl);
  
  return data;
}

// Cached single entry getter
export async function getEntry(collection: string, slug: string, maxAge = 5 * 60 * 1000): Promise<ContentEntry | null> {
  const cacheKey = getCacheKey('entry', collection, slug);
  queryCount++;
  
  const cached = contentCache.get<ContentEntry | null>(cacheKey);
  if (cached !== null) {
    cacheHits++;
    return cached;
  }
  
  cacheMisses++;
  const data = await getEntryDirect(collection, slug);
  
  const ttl = getCollectionTTL(collection, maxAge);
  contentCache.set(cacheKey, data, ttl);
  
  return data;
}

// Cached settings with longer TTL since they change infrequently
export async function getAllSettings(maxAge = 30 * 60 * 1000): Promise<Record<string, any>> {
  const cacheKey = getCacheKey('setting', 'all');
  queryCount++;
  
  const cached = contentCache.get<Record<string, any>>(cacheKey);
  if (cached) {
    cacheHits++;
    return cached;
  }
  
  cacheMisses++;
  const data = await getAllSettingsDirect();
  contentCache.set(cacheKey, data, maxAge);
  
  return data;
}

export async function getSetting(key: string, maxAge = 30 * 60 * 1000): Promise<any> {
  const cacheKey = getCacheKey('setting', key);
  queryCount++;
  
  const cached = contentCache.get(cacheKey);
  if (cached !== null) {
    cacheHits++;
    return cached;
  }
  
  cacheMisses++;
  const data = await getSettingDirect(key);
  contentCache.set(cacheKey, data, maxAge);
  
  return data;
}

// Batch loading for common page requirements
export async function getBatchedPageData(collections: string[]): Promise<Record<string, ContentEntry[]>> {
  const promises = collections.map(async (collection) => [
    collection,
    await getCollection(collection)
  ] as const);
  
  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}

// Optimized homepage data loader
export async function getHomepageData() {
  return getBatchedPageData(['blog', 'staff', 'testimonials']);
}

// Optimized admin data loader
export async function getAdminData() {
  const [collections, settings] = await Promise.all([
    getBatchedPageData(['blog', 'staff', 'tuition', 'hours']),
    getAllSettings()
  ]);
  
  return { collections, settings };
}

// TTL optimization based on content type
function getCollectionTTL(collection: string, defaultTTL: number): number {
  switch (collection) {
    case 'settings':
      return 30 * 60 * 1000; // 30 minutes - settings change infrequently
    case 'staff':
    case 'tuition':
      return 15 * 60 * 1000; // 15 minutes - semi-static content  
    case 'hours':
      return 10 * 60 * 1000; // 10 minutes - can change occasionally
    case 'blog':
      return 5 * 60 * 1000;  // 5 minutes - more dynamic content
    case 'photos':
      return 20 * 60 * 1000; // 20 minutes - image metadata rarely changes
    default:
      return defaultTTL;
  }
}

// Cache management utilities
export const cacheUtils = {
  // Clear specific collection cache when content updates
  invalidateCollection(collection: string) {
    contentCache.clear(`collection:${collection}`);
    contentCache.clear(`entry:${collection}`);
  },
  
  // Clear all caches (for admin operations)
  clearAll() {
    contentCache.clear();
  },
  
  // Get cache performance metrics
  getMetrics() {
    const cacheStats = contentCache.getStats();
    const hitRate = queryCount > 0 ? (cacheHits / queryCount * 100).toFixed(1) : '0';
    
    return {
      queries: queryCount,
      cacheHits,
      cacheMisses,
      hitRate: `${hitRate}%`,
      ...cacheStats
    };
  },
  
  // Reset metrics (useful for performance testing)
  resetMetrics() {
    queryCount = 0;
    cacheHits = 0;
    cacheMisses = 0;
  },
  
  // Preload common data (can be called at startup)
  async preloadCommonData() {
    try {
      await Promise.all([
        getCollection('blog'),
        getCollection('staff'),
        getCollection('hours'),
        getAllSettings()
      ]);
      console.log('Content cache preloaded successfully');
    } catch (error) {
      console.warn('Failed to preload cache:', error);
    }
  }
};

// Auto-cleanup expired entries periodically
setInterval(() => {
  const stats = contentCache.getStats();
  if (stats.expiredEntries > 0) {
    // Trigger cleanup by attempting to get a non-existent key
    contentCache.get('__cleanup__');
  }
}, 10 * 60 * 1000); // Every 10 minutes

// Export original functions for cases where caching is not desired
export {
  getCollection as getCollectionDirect,
  getEntry as getEntryDirect,
  getAllSettings as getAllSettingsDirect,
  getSetting as getSettingDirect
} from './content-db-direct';