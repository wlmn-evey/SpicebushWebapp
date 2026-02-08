import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { queryFirst, query } from '@lib/db/client';

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const normalizeKey = (value: string | undefined): string => (value ?? '').trim();

const validateKey = (key: string): boolean => /^[a-zA-Z0-9_]+$/.test(key);

const requireAdmin = async (locals: Record<string, unknown>) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return false;
  }
  return true;
};

export const GET: APIRoute = async ({ params, locals }) => {
  if (!(await requireAdmin(locals as unknown as Record<string, unknown>))) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const key = normalizeKey(params.key);
  if (!validateKey(key)) {
    return jsonResponse({ error: 'Invalid setting key' }, 400);
  }

  try {
    const data = await queryFirst<{ key: string; value: unknown }>(
      `
        SELECT key, value
        FROM settings
        WHERE key = $1
        LIMIT 1
      `,
      [key]
    );
    if (!data) {
      return jsonResponse({ error: 'Setting not found' }, 404);
    }

    return jsonResponse(data as unknown as Record<string, unknown>);
  } catch {
    return jsonResponse({ error: 'Failed to fetch setting' }, 500);
  }
};

export const PUT: APIRoute = async ({ params, request, locals }) => {
  if (!(await requireAdmin(locals as unknown as Record<string, unknown>))) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const key = normalizeKey(params.key);
  if (!validateKey(key)) {
    return jsonResponse({ error: 'Invalid setting key' }, 400);
  }

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  try {
    await query(
      `
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2::jsonb, $3)
        ON CONFLICT (key)
        DO UPDATE SET
          value = EXCLUDED.value,
          updated_at = EXCLUDED.updated_at
      `,
      [key, JSON.stringify(value), new Date().toISOString()]
    );

    return jsonResponse({ key, value });
  } catch {
    return jsonResponse({ error: 'Failed to update setting' }, 500);
  }
};
