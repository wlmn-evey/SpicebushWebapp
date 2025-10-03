interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export class CacheStore {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + ttlMs
    });
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  entries(): CacheEntry<unknown>[] {
    return Array.from(this.cache.values());
  }

  size(): number {
    return this.cache.size;
  }
}

export function calculateCacheStats(store: CacheStore) {
  const now = Date.now();
  let validEntries = 0;
  let expiredEntries = 0;

  for (const entry of store.entries()) {
    if (now > entry.expiry) {
      expiredEntries++;
    } else {
      validEntries++;
    }
  }

  return {
    totalEntries: store.size(),
    validEntries,
    expiredEntries,
    memoryUsage: store.size() * 100 // rough estimate
  };
}
