/**
 * Health check endpoint for Docker container monitoring
 * Returns a simple 200 OK status to indicate the application is running
 */
import type { APIRoute } from 'astro';
import { queryFirst } from '@lib/db/client';
import { getNetlifyDatabaseUrl } from '@lib/db/env';
import { logServerError } from '@lib/server-logger';

export const GET: APIRoute = async () => {
  const startTime = Date.now();

  try {
    // Throws when neither database URL is set; read at runtime, never inlined into the bundle.
    getNetlifyDatabaseUrl();

    // Quick database ping with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    );

    const queryPromise = queryFirst<{ key: string }>(
      `
        SELECT key
        FROM settings
        LIMIT 1
      `
    );

    const result = await Promise.race([queryPromise, timeoutPromise]);

    return new Response(
      JSON.stringify({
        status: 'healthy',
        database: 'healthy',
        responseTime: Date.now() - startTime,
        hasSettingsRow: Boolean(result),
        timestamp: new Date().toISOString(),
        service: 'spicebush-webapp',
        environment: import.meta.env.MODE || 'production'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  } catch (error) {
    // Public endpoint: keep driver/connection details in server logs only.
    logServerError('Health check failed', error, { route: '/api/health' });
    return new Response(
      JSON.stringify({
        status: 'unhealthy',
        error: 'Database check failed',
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        service: 'spicebush-webapp'
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );
  }
};
