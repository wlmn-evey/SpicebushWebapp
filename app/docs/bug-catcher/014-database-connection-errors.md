---
id: 014
title: "Database Connection Instability"
severity: high
status: open
category: functionality
affected_pages: ["all pages requiring database access"]
related_bugs: [002, 013, 015]
discovered_date: 2025-07-28
environment: [development, production]
browser: all
---

# Bug 014: Database Connection Instability

## Description
The application experiences frequent database connection errors including timeouts, connection pool exhaustion, and authentication failures. This causes intermittent failures throughout the application and contributes to 500 errors.

## Steps to Reproduce
1. Load application under moderate traffic
2. Monitor database connections
3. Observe connection pool exhaustion
4. See timeout errors in logs
5. Authentication tokens expire without renewal

## Expected Behavior
- Stable database connections
- Automatic reconnection on failure
- Connection pooling works efficiently
- Tokens refresh before expiration
- Graceful degradation on database issues

## Actual Behavior
- Connections timeout frequently
- Pool exhaustion under light load
- No automatic reconnection
- Stale authentication tokens
- Application crashes on connection loss

## Connection Analysis
```
Database Connection Issues:
1. Connection Pool
   - Max connections: 10 (too low)
   - No connection reuse
   - Connections not released
   - No idle timeout

2. Authentication
   - JWT tokens expire
   - No refresh mechanism
   - Service key exposed
   - No retry logic

3. Query Performance
   - No query optimization
   - Missing indexes
   - N+1 query problems
   - No caching layer

4. Error Handling
   - Unhandled promise rejections
   - No connection retry
   - Errors bubble to user
   - No circuit breaker

Metrics:
- Average connection time: 2.5s
- Connection failures: 15%
- Pool exhaustion events: 20/hour
- Timeout errors: 50/hour
```

## Affected Files
- `/src/lib/supabase.ts` - Connection logic
- `/src/lib/content-db.ts` - Database queries
- `/src/lib/content-db-direct.ts` - Direct connections
- API route handlers
- Server-side components

## Potential Causes
1. **Poor Connection Management**
   - No connection pooling strategy
   - Connections not properly closed
   - Creating new connections per request

2. **Missing Error Handling**
   - No retry mechanism
   - Synchronous error propagation
   - No fallback strategies

3. **Configuration Issues**
   - Pool size too small
   - Timeout values too short
   - Missing keepalive settings

## Suggested Fixes

### Option 1: Robust Connection Pool Management
```typescript
// src/lib/database-pool.ts
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';

class DatabaseConnectionPool {
  private pool: Pool | null = null;
  private supabaseClient: any = null;
  private connectionRetries = 3;
  private retryDelay = 1000;

  constructor() {
    this.initializePool();
    this.setupHealthCheck();
  }

  private async initializePool() {
    const poolConfig = {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '5'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000,
      query_timeout: 30000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };

    try {
      this.pool = new Pool(poolConfig);
      
      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('Unexpected pool error:', err);
        this.reconnect();
      });

      // Test connection
      await this.pool.query('SELECT 1');
      console.log('Database pool initialized successfully');
    } catch (error) {
      console.error('Failed to initialize pool:', error);
      throw error;
    }
  }

  private async reconnect() {
    console.log('Attempting to reconnect to database...');
    
    // Close existing pool
    if (this.pool) {
      await this.pool.end().catch(() => {});
      this.pool = null;
    }

    // Exponential backoff
    for (let i = 0; i < this.connectionRetries; i++) {
      try {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
        await this.initializePool();
        console.log('Reconnection successful');
        return;
      } catch (error) {
        console.error(`Reconnection attempt ${i + 1} failed:`, error);
      }
    }

    throw new Error('Failed to reconnect after multiple attempts');
  }

  async query(text: string, params?: any[]) {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const start = Date.now();
    
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`Slow query (${duration}ms):`, text);
      }
      
      return result;
    } catch (error: any) {
      // Handle specific errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        await this.reconnect();
        // Retry once after reconnect
        return this.pool!.query(text, params);
      }
      
      throw error;
    }
  }

  async getSupabaseClient() {
    if (!this.supabaseClient) {
      this.supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: true,
            persistSession: false,
            detectSessionInUrl: false
          },
          db: {
            schema: 'public'
          },
          global: {
            headers: {
              'x-application': 'spicebush-webapp'
            }
          }
        }
      );

      // Add auth state listener
      this.supabaseClient.auth.onAuthStateChange((event: any, session: any) => {
        if (event === 'TOKEN_REFRESHED') {
          console.log('Supabase token refreshed');
        }
      });
    }

    return this.supabaseClient;
  }

  private setupHealthCheck() {
    // Periodic health check
    setInterval(async () => {
      try {
        if (this.pool) {
          await this.pool.query('SELECT 1');
        }
      } catch (error) {
        console.error('Health check failed:', error);
        this.reconnect().catch(console.error);
      }
    }, 30000); // Every 30 seconds
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Singleton instance
export const dbPool = new DatabaseConnectionPool();
```

### Option 2: Query Optimization and Caching
```typescript
// src/lib/cached-queries.ts
import { Redis } from 'ioredis';
import { dbPool } from './database-pool';

class CachedQueryManager {
  private redis: Redis;
  private defaultTTL = 3600; // 1 hour

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      }
    });
  }

  async query(
    key: string, 
    queryFn: () => Promise<any>, 
    ttl: number = this.defaultTTL
  ) {
    try {
      // Try cache first
      const cached = await this.redis.get(key);
      if (cached) {
        return JSON.parse(cached);
      }

      // Execute query
      const result = await queryFn();

      // Cache result
      await this.redis.setex(key, ttl, JSON.stringify(result));

      return result;
    } catch (error) {
      console.error('Cache query error:', error);
      // Fallback to direct query
      return queryFn();
    }
  }

  async invalidate(pattern: string) {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

// Usage example
export async function getCollectionCached(collection: string) {
  const cacheKey = `collection:${collection}`;
  
  return cachedQueries.query(
    cacheKey,
    async () => {
      const { rows } = await dbPool.query(
        'SELECT * FROM collections WHERE name = $1 ORDER BY created_at DESC',
        [collection]
      );
      return rows;
    },
    300 // 5 minutes for collection data
  );
}

export const cachedQueries = new CachedQueryManager();
```

### Option 3: Circuit Breaker Pattern
```typescript
// src/lib/circuit-breaker.ts
enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: number;
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000,
    private halfOpenRequests: number = 3
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime! < this.timeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = CircuitState.HALF_OPEN;
      this.successCount = 0;
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenRequests) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.threshold) {
      this.state = CircuitState.OPEN;
      console.error(`Circuit breaker opened after ${this.failureCount} failures`);
    }
  }

  getState() {
    return this.state;
  }
}

// Apply to database operations
const dbCircuitBreaker = new CircuitBreaker();

export async function safeQuery(text: string, params?: any[]) {
  return dbCircuitBreaker.execute(async () => {
    return dbPool.query(text, params);
  });
}
```

## Testing Requirements
1. Stress test with connection pool limits
2. Test automatic reconnection
3. Verify token refresh works
4. Test circuit breaker behavior
5. Monitor query performance
6. Test cache invalidation
7. Simulate network failures

## Related Issues
- Bug #002: Server errors often from DB timeouts
- Bug #013: Docker networking affects DB connections
- Bug #015: Auth failures from expired tokens

## Additional Notes
- Consider read replicas for scaling
- Implement connection pooling best practices
- Add query performance monitoring
- Use prepared statements for security
- Regular database maintenance required
- Consider managed database services