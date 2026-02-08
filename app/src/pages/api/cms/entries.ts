import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { queryRows } from '@lib/db/client';

const ALLOWED_COLLECTIONS = new Set(['hours', 'staff', 'tuition', 'settings', 'school-info']);

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

export const GET: APIRoute = async ({ url, locals }) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const collection = String(url.searchParams.get('collection') ?? '').trim();
  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return jsonResponse({ error: 'Collection is not allowed' }, 400);
  }

  try {
    const data = await queryRows<{
      type: string;
      slug: string;
      title: string | null;
      status: string | null;
      data: Record<string, unknown>;
    }>(
      `
        SELECT type, slug, title, data, status, updated_at
        FROM content
        WHERE type = $1
        ORDER BY updated_at DESC
      `,
      [collection]
    );
    const entries = (data ?? []).map((entry) => ({
      collection: entry.type,
      slug: entry.slug,
      title: entry.title,
      status: entry.status,
      data: entry.data
    }));

    return jsonResponse({ entries });
  } catch {
    return jsonResponse({ error: 'Failed to fetch entries' }, 500);
  }
};
