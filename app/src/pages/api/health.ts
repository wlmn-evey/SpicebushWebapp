/**
 * Health check endpoint for Docker container monitoring
 * Returns a simple 200 OK status to indicate the application is running
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  try {
    // You could add additional health checks here if needed
    // For example, checking database connectivity:
    // const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    // if (!supabaseUrl) {
    //   throw new Error('Supabase URL not configured');
    // }

    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'spicebush-webapp'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};