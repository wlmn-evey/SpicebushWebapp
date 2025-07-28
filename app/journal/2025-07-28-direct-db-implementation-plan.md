# Direct Database Connection Implementation Plan
Date: 2025-07-28
Author: Claude (Project Architect)
Purpose: Step-by-step guide to implement direct database connections for frontend reads

## Overview

This plan implements Option 1 from the architecture plan - bypassing PostgREST for read operations while maintaining it for admin writes. This provides an immediate fix for the authentication issues blocking the website.

## Implementation Steps

### Step 1: Create Read-Only Database User

```sql
-- Connect to database as superuser
-- docker exec -it app-supabase-db-1 psql -U postgres

-- Create read-only user
CREATE USER frontend_reader WITH PASSWORD 'spicebush-readonly-2025';

-- Grant connection privileges
GRANT CONNECT ON DATABASE postgres TO frontend_reader;

-- Grant schema access
GRANT USAGE ON SCHEMA public TO frontend_reader;

-- Grant read access to tables
GRANT SELECT ON public.content TO frontend_reader;
GRANT SELECT ON public.settings TO frontend_reader;

-- Ensure future tables are readable
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO frontend_reader;
```

### Step 2: Install PostgreSQL Client

```json
// package.json - add dependency
"dependencies": {
  "pg": "^8.11.3"
}
```

### Step 3: Create Direct Database Adapter

```typescript
// src/lib/content-db-direct.ts
import { Pool } from 'pg';
import type { ContentEntry } from './content-db';

// Create connection pool
const pool = new Pool({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'frontend_reader',
  password: process.env.DB_READONLY_PASSWORD || 'spicebush-readonly-2025',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Transform database row to ContentEntry format
function transformToContentEntry(row: any): ContentEntry {
  return {
    id: row.slug,
    slug: row.slug,
    collection: row.type,
    data: {
      ...row.data,
      title: row.title
    },
    body: row.data?.body || ''
  };
}

// Get all entries from a collection
export async function getCollection(collection: string): Promise<ContentEntry[]> {
  try {
    const query = `
      SELECT * FROM content 
      WHERE type = $1 AND status = 'published'
      ORDER BY created_at DESC
    `;
    const result = await pool.query(query, [collection]);
    return result.rows.map(transformToContentEntry);
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error);
    return [];
  }
}

// Get a single entry
export async function getEntry(collection: string, slug: string): Promise<ContentEntry | null> {
  try {
    const query = `
      SELECT * FROM content 
      WHERE type = $1 AND slug = $2
      LIMIT 1
    `;
    const result = await pool.query(query, [collection, slug]);
    
    if (result.rows.length === 0) return null;
    return transformToContentEntry(result.rows[0]);
  } catch (error) {
    console.error(`Error fetching ${collection}/${slug}:`, error);
    return null;
  }
}

// Get entries by filter
export async function getEntries(collection: string, filter: (entry: ContentEntry) => boolean): Promise<ContentEntry[]> {
  const entries = await getCollection(collection);
  return entries.filter(filter);
}

// Settings helpers
export async function getSetting(key: string): Promise<any> {
  try {
    const query = 'SELECT value FROM settings WHERE key = $1';
    const result = await pool.query(query, [key]);
    
    if (result.rows.length === 0) return null;
    return result.rows[0].value;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
}

export async function getAllSettings(): Promise<Record<string, any>> {
  try {
    const query = 'SELECT key, value FROM settings';
    const result = await pool.query(query);
    
    const settings: Record<string, any> = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    
    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
}

// Special helpers
export async function getSchoolInfo(): Promise<ContentEntry | null> {
  return getEntry('school-info', 'general');
}

export async function getComingSoonConfig(): Promise<ContentEntry | null> {
  return getEntry('coming-soon', 'config');
}

// Cleanup function
export async function closePool() {
  await pool.end();
}
```

### Step 4: Update Import Strategy

```typescript
// src/lib/content-db-switch.ts
// Smart switching between Supabase and direct connection

const USE_DIRECT_DB = import.meta.env.USE_DIRECT_DB === 'true' || true; // Default to direct for now

if (USE_DIRECT_DB) {
  // Use direct database connection
  export * from './content-db-direct';
} else {
  // Use Supabase/PostgREST
  export * from './content-db';
}
```

### Step 5: Environment Configuration

```bash
# .env.local - add these lines
DB_READONLY_PASSWORD=spicebush-readonly-2025
USE_DIRECT_DB=true
```

### Step 6: Update Components

1. Replace imports in all components:
   ```typescript
   // Before
   import { getCollection, getEntry } from '../lib/content-db';
   
   // After
   import { getCollection, getEntry } from '../lib/content-db-switch';
   ```

2. Or create an alias in tsconfig.json:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/content-db": ["./src/lib/content-db-switch"]
       }
     }
   }
   ```

### Step 7: Test Each Component

1. Homepage components:
   - RecentBlogPosts
   - Testimonials
   - FeaturedTeachers

2. Dynamic pages:
   - Blog listing
   - Individual blog posts
   - Staff pages

3. Site-wide components:
   - Header (hours)
   - Footer (contact info)
   - Coming soon check

### Step 8: Performance Optimization

```typescript
// Add simple caching layer
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

export async function getCollectionCached(collection: string): Promise<ContentEntry[]> {
  const cacheKey = `collection:${collection}`;
  const cached = cache.get(cacheKey);
  
  if (cached && cached.timestamp > Date.now() - CACHE_TTL) {
    return cached.data;
  }
  
  const data = await getCollection(collection);
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

## Testing Checklist

- [ ] Create read-only database user
- [ ] Install pg package
- [ ] Create content-db-direct.ts
- [ ] Create content-db-switch.ts
- [ ] Update .env.local
- [ ] Test homepage loads
- [ ] Test blog pages load
- [ ] Test admin panel still writes
- [ ] Verify no authentication errors
- [ ] Check page load performance

## Rollback Plan

If direct connection causes issues:

1. Set `USE_DIRECT_DB=false` in .env.local
2. Restart development server
3. Debug PostgREST issues separately

## Success Metrics

1. No "permission denied" errors
2. All pages display content
3. Page load time < 2 seconds
4. Admin panel continues to function

## Next Steps

Once working:
1. Monitor for connection pool issues
2. Add proper error handling
3. Implement request-level caching
4. Consider static generation for most content
5. Document for future maintainers