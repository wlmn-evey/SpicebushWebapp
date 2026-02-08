import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';
import { queryFirst } from '@lib/db/client';
import { logServerError, logServerWarn } from '@lib/server-logger';

export const GET: APIRoute = async (context) => {
  try {
    // Check admin authentication via middleware.
    const locals = context.locals as unknown as Record<string, unknown>;
    const userId = locals.userId as string | undefined;
    const isAdmin = locals.isAdmin === true;

    if (!userId || !isAdmin) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get storage stats
    const uploadDir = './public/uploads';
    let totalSize = 0;
    let fileCount = 0;
    
    try {
      const files = await fs.readdir(uploadDir);
      
      for (const file of files) {
        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          totalSize += stats.size;
          fileCount++;
        }
      }
    } catch (error) {
      logServerWarn('Failed to read upload directory for storage stats', {
        route: '/api/storage/stats',
        error
      });
    }
    
    // Also get database stats
    const countRow = await queryFirst<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM media
      `
    );
    
    return new Response(JSON.stringify({
      totalSize,
      fileCount,
      dbCount: countRow?.count || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    logServerError('Storage stats endpoint failed', error, { route: '/api/storage/stats' });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
