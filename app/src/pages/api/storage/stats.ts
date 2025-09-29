import type { APIRoute } from 'astro';
import fs from 'fs/promises';
import path from 'path';

export const GET: APIRoute = async (context) => {
  try {
    // Check admin authentication via Clerk middleware
    // @ts-ignore - locals is dynamic
    const userId = context.locals.userId;

    if (!userId) {
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
      console.error('Error reading upload directory:', error);
    }
    
    // Also get database stats
    const { supabase } = await import('@lib/supabase');
    const { count } = await supabase
      .from('media')
      .select('*', { count: 'exact', head: true });
    
    return new Response(JSON.stringify({
      totalSize,
      fileCount,
      dbCount: count || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Storage stats error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};