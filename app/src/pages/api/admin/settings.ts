import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { queryRows, query } from '@lib/db/client';

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const parseRedirectPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const parseValue = (raw: unknown): unknown => {
  if (typeof raw !== 'string') return raw;
  const trimmed = raw.trim();
  if (trimmed === '') return '';
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed === 'null') return null;
  if (!Number.isNaN(Number(trimmed)) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
};

export const GET: APIRoute = async ({ locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  try {
    const data = await queryRows<{ key: string; value: unknown }>(
      `
        SELECT key, value
        FROM settings
        ORDER BY key ASC
      `
    );
    const settings: Record<string, unknown> = {};
    data?.forEach((row) => {
      settings[row.key] = row.value;
    });

    return jsonResponse(settings);
  } catch {
    return jsonResponse({ error: 'Failed to load settings' }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const contentType = request.headers.get('content-type') ?? '';
  const updates: Record<string, unknown> = {};
  let redirectTo: string | null = null;

  if (contentType.includes('application/json')) {
    try {
      const json = await request.json();
      if (!json || typeof json !== 'object' || Array.isArray(json)) {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
      }
      Object.assign(updates, json as Record<string, unknown>);
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }
  } else {
    try {
      const formData = await request.formData();
      const singleKey = String(formData.get('key') ?? '').trim();
      const singleValue = formData.get('value');
      redirectTo = parseRedirectPath(formData.get('redirectTo'));

      if (singleKey) {
        updates[singleKey] = parseValue(singleValue);
      } else {
        for (const [key, value] of formData.entries()) {
          if (key === 'redirectTo' || key === 'key' || key === 'value') continue;
          updates[key] = parseValue(value);
        }
      }
    } catch {
      return jsonResponse({ error: 'Invalid form body' }, 400);
    }
  }

  const keys = Object.keys(updates);
  if (keys.length === 0) {
    return jsonResponse({ error: 'No settings provided' }, 400);
  }

  try {
    for (const key of keys) {
      const normalizedKey = key.trim();
      if (!/^[a-zA-Z0-9_]+$/.test(normalizedKey)) {
        return jsonResponse({ error: `Invalid setting key: ${normalizedKey}` }, 400);
      }

      await query(
        `
          INSERT INTO settings (key, value, updated_at)
          VALUES ($1, $2::jsonb, $3)
          ON CONFLICT (key)
          DO UPDATE SET
            value = EXCLUDED.value,
            updated_at = EXCLUDED.updated_at
        `,
        [
          normalizedKey,
          JSON.stringify(updates[key]),
          new Date().toISOString()
        ]
      );
    }

    if (redirectTo) {
      return new Response(null, {
        status: 303,
        headers: { Location: redirectTo }
      });
    }

    return jsonResponse({ success: true, updated: keys });
  } catch {
    return jsonResponse({ error: 'Failed to update settings' }, 500);
  }
};
