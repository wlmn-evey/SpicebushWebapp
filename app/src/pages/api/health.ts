/**
 * Health check endpoint for Docker container monitoring
 * Returns a simple 200 OK status to indicate the application is running
 */
import type { APIRoute } from 'astro';
import { supabase } from '@lib/supabase';

export const GET: APIRoute = async () => {
  const startTime = Date.now();
  
  try {
    // Check if Supabase is configured
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('Supabase URL not configured');
    }
    
    // Quick database ping with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database timeout')), 5000)
    );
    
    const queryPromise = supabase
      .from('settings')
      .select('id')
      .limit(1)
      .single();
    
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    if ('error' in result && result.error) {
      // Database query failed but app is running
      return new Response(JSON.stringify({
        status: 'degraded',
        database: 'unhealthy',
        error: result.error.message,
        responseTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        service: 'spicebush-webapp'
      }), {
        status: 200, // Return 200 since app is running
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    return new Response(JSON.stringify({
      status: 'healthy',
      database: 'healthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      service: 'spicebush-webapp',
      environment: import.meta.env.MODE || 'production'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      service: 'spicebush-webapp'
    }), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
};