import type { APIRoute } from 'astro';
import { getNetlifyBlobByPath, mediaStorageUtils } from '@lib/media-storage';

export const GET: APIRoute = async ({ params }) => {
  const rawKey = typeof params.key === 'string' ? params.key : '';
  const decodedKey = mediaStorageUtils.decodeBlobPath(rawKey);

  if (!decodedKey) {
    return new Response(JSON.stringify({ error: 'Missing blob key' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const blob = await getNetlifyBlobByPath(decodedKey);
  if (!blob) {
    return new Response(JSON.stringify({ error: 'Blob not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = new Headers();
  headers.set('Content-Type', blob.contentType);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  if (blob.etag) {
    headers.set('ETag', blob.etag);
  }

  return new Response(blob.data, {
    status: 200,
    headers
  });
};
