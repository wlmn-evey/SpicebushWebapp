/**
 * Direct PostgreSQL connection for content queries
 * This bypasses PostgREST authentication complexity for read operations
 * Updated to use environment variables for security
 */
import pg from 'pg';
const { Client } = pg;

// Types to match Astro Content Collections structure
export interface ContentEntry<T = any> {
  id: string;
  slug: string;
  collection: string;
  data: T;
  body?: string;
}

// Get environment variables - support both Astro and Node.js environments
const getEnvVar = (key: string): string | undefined => {
  // In Astro environment (build/dev/prod)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }
  // In Node.js environment (tests, scripts)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Load configuration from environment variables
const config = {
  host: getEnvVar('DB_READONLY_HOST') || 'localhost',
  port: parseInt(getEnvVar('DB_READONLY_PORT') || '54322'),
  database: getEnvVar('DB_READONLY_DATABASE') || 'postgres',
  user: getEnvVar('DB_READONLY_USER'),
  password: getEnvVar('DB_READONLY_PASSWORD'),
  // Add timeouts for production safety
  connectionTimeoutMillis: 5000,
  query_timeout: 30000
};

// Validate required environment variables
if (!config.user) {
  throw new Error('DB_READONLY_USER environment variable is required');
}
if (!config.password) {
  throw new Error('DB_READONLY_PASSWORD environment variable is required');
}

// Single reusable connection
const client = new Client(config);

let connected = false;

async function ensureConnected() {
  if (!connected) {
    try {
      await client.connect();
      connected = true;
    } catch (error) {
      console.error('Database connection error - check environment variables');
      throw new Error('Unable to connect to content database');
    }
  }
}

// Get all entries from a collection
export async function getCollection(collection: string): Promise<ContentEntry[]> {
  await ensureConnected();
  
  try {
    const result = await client.query(
      'SELECT * FROM content WHERE type = $1 AND status = $2 ORDER BY created_at DESC',
      [collection, 'published']
    );
    
    return result.rows.map(row => ({
      id: row.slug,
      slug: row.slug,
      collection: row.type,
      data: { ...row.data, title: row.title },
      body: row.data?.body || ''
    }));
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error);
    return [];
  }
}

// Get a single entry by collection and slug
export async function getEntry(collection: string, slug: string): Promise<ContentEntry | null> {
  await ensureConnected();
  
  try {
    const result = await client.query(
      'SELECT * FROM content WHERE type = $1 AND slug = $2 AND status = $3 LIMIT 1',
      [collection, slug, 'published']
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.slug,
      slug: row.slug,
      collection: row.type,
      data: { ...row.data, title: row.title },
      body: row.data?.body || ''
    };
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
  await ensureConnected();
  
  try {
    const result = await client.query(
      'SELECT value FROM settings WHERE key = $1 LIMIT 1',
      [key]
    );
    
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (connected) {
    await client.end();
    connected = false;
  }
  process.exit();
});