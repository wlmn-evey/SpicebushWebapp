import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { query, queryFirst } from '@lib/db/client';

const ALLOWED_COLLECTIONS = new Set(['hours', 'staff', 'tuition', 'settings', 'school-info', 'faq', 'testimonials']);

type EntryPayload = {
  collection?: string;
  type?: string;
  slug?: string;
  title?: string;
  status?: string;
  data?: Record<string, unknown>;
  dataJson?: string;
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const parseCollection = (payload: EntryPayload, url: URL): string =>
  String(payload.collection ?? payload.type ?? url.searchParams.get('collection') ?? '').trim();

const parseSlug = (payload: EntryPayload, url: URL): string =>
  String(payload.slug ?? url.searchParams.get('slug') ?? '').trim().toLowerCase();

const parseData = (payload: EntryPayload): Record<string, unknown> | null => {
  if (payload.data && typeof payload.data === 'object') return payload.data;
  if (typeof payload.dataJson === 'string') {
    if (payload.dataJson.trim() === '') return {};
    try {
      const parsed = JSON.parse(payload.dataJson);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  return {};
};

const parseRequestPayload = async (request: Request): Promise<EntryPayload | null> => {
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    return {
      collection: String(formData.get('collection') ?? ''),
      type: String(formData.get('type') ?? ''),
      slug: String(formData.get('slug') ?? ''),
      title: String(formData.get('title') ?? ''),
      status: String(formData.get('status') ?? ''),
      dataJson: String(formData.get('dataJson') ?? '')
    };
  } catch {
    return null;
  }
};

const requireAdmin = async (locals: Record<string, unknown>) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin || !auth.session) {
    return null;
  }
  return auth.session;
};

export const GET: APIRoute = async ({ url, locals }) => {
  const session = await requireAdmin(locals as unknown as Record<string, unknown>);
  if (!session) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const collection = String(url.searchParams.get('collection') ?? '').trim();
  const slug = String(url.searchParams.get('slug') ?? '').trim().toLowerCase();

  if (!ALLOWED_COLLECTIONS.has(collection) || !slug) {
    return jsonResponse({ error: 'Collection and slug are required' }, 400);
  }

  try {
    const data = await queryFirst<{
      type: string;
      slug: string;
      title: string | null;
      status: string | null;
      data: Record<string, unknown>;
    }>(
      `
        SELECT type, slug, title, data, status, updated_at
        FROM content
        WHERE type = $1 AND slug = $2
        LIMIT 1
      `,
      [collection, slug]
    );

    if (!data) {
      return jsonResponse({ entry: null });
    }

    return jsonResponse({
      entry: {
        collection: data.type,
        slug: data.slug,
        title: data.title,
        status: data.status,
        data: data.data
      }
    });
  } catch {
    return jsonResponse({ error: 'Failed to fetch entry' }, 500);
  }
};

export const POST: APIRoute = async ({ request, url, locals }) => {
  const session = await requireAdmin(locals as unknown as Record<string, unknown>);
  if (!session) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const payload = await parseRequestPayload(request);
  if (!payload) {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const collection = parseCollection(payload, url);
  const slug = parseSlug(payload, url);
  const data = parseData(payload);
  const title = payload.title?.trim() || null;
  const status = payload.status?.trim() || 'published';

  if (!ALLOWED_COLLECTIONS.has(collection)) {
    return jsonResponse({ error: 'Collection is not allowed' }, 400);
  }

  if (!slug || !/^[a-z0-9-_]+$/.test(slug)) {
    return jsonResponse({ error: 'Invalid slug format' }, 400);
  }

  if (!data) {
    return jsonResponse({ error: 'dataJson must be a JSON object' }, 400);
  }

  try {
    await query(
      `
        INSERT INTO content (type, slug, title, data, status, author_email, updated_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
        ON CONFLICT (type, slug)
        DO UPDATE SET
          title = EXCLUDED.title,
          data = EXCLUDED.data,
          status = EXCLUDED.status,
          author_email = EXCLUDED.author_email,
          updated_at = EXCLUDED.updated_at
      `,
      [
        collection,
        slug,
        title,
        JSON.stringify(data),
        status,
        session.userEmail ?? null,
        new Date().toISOString()
      ]
    );

    return jsonResponse({ success: true, collection, slug });
  } catch {
    return jsonResponse({ error: 'Failed to save entry' }, 500);
  }
};

export const PUT = POST;

export const DELETE: APIRoute = async ({ request, url, locals }) => {
  const session = await requireAdmin(locals as unknown as Record<string, unknown>);
  if (!session) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const payload = await parseRequestPayload(request);
  const collection = payload ? parseCollection(payload, url) : String(url.searchParams.get('collection') ?? '').trim();
  const slug = payload ? parseSlug(payload, url) : String(url.searchParams.get('slug') ?? '').trim().toLowerCase();

  if (!ALLOWED_COLLECTIONS.has(collection) || !slug) {
    return jsonResponse({ error: 'Collection and slug are required' }, 400);
  }

  try {
    await query(
      `
        DELETE FROM content
        WHERE type = $1 AND slug = $2
      `,
      [collection, slug]
    );

    return jsonResponse({ success: true });
  } catch {
    return jsonResponse({ error: 'Failed to delete entry' }, 500);
  }
};
