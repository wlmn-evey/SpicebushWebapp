import type { APIRoute } from 'astro';
import { query, queryRows, queryFirst } from '@lib/db/client';
import { deleteStoredMediaAsset } from '@lib/media-storage';
import { logServerError } from '@lib/server-logger';

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

    const data = await queryRows<{ id: string; filename: string; url: string }>(
      `
        SELECT id, filename, url
        FROM media
      `
    );

    const media = data.map(item => ({
      id: item.id,
      name: item.filename,
      url: item.url,
      path: item.url
    }));

    return new Response(JSON.stringify(media), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logServerError('Failed to fetch media', error, { route: '/api/cms/media' });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async (context) => {
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

    const { id } = await context.request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Photo ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the media record first to get file path for cleanup
    const mediaRecord = await queryFirst<{
      id: string;
      filename: string;
      url: string;
      storage_path: string | null;
      metadata: Record<string, unknown> | null;
    }>(
      `
        SELECT id, filename, url, storage_path, metadata
        FROM media
        WHERE id = $1
        LIMIT 1
      `,
      [id]
    );

    if (!mediaRecord) {
      return new Response(JSON.stringify({ error: 'Photo not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from database
    await query(
      `
        DELETE FROM media
        WHERE id = $1
      `,
      [id]
    );

    await deleteStoredMediaAsset({
      url: mediaRecord.url,
      storagePath: mediaRecord.storage_path,
      metadata: mediaRecord.metadata
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Photo deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logServerError('Failed to delete media', error, { route: '/api/cms/media' });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
