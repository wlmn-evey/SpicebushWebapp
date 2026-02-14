import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { query } from '@lib/db/client';

const ALLOWED_COLLECTIONS = new Set(['hours', 'staff', 'tuition', 'settings', 'school-info', 'photos', 'faq']);

type ContentPayload = {
  collection: string;
  slug: string;
  title?: string;
  status?: string;
  data?: Record<string, unknown>;
  dataJson?: string;
  baseDataJson?: string;
  redirectTo?: string;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const parseSimpleValue = (value: string): unknown => {
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase();

  if (normalized === 'true' || normalized === 'on' || normalized === 'yes') return true;
  if (normalized === 'false' || normalized === 'off' || normalized === 'no') return false;
  if (normalized === 'null') return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
    || (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }

  return trimmed;
};

const parseFormValue = (value: FormDataEntryValue): unknown => {
  if (typeof value !== 'string') {
    return value.name;
  }
  return parseSimpleValue(value);
};

const parseCsvList = (value: FormDataEntryValue): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const parseLineList = (value: FormDataEntryValue): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split(/\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const parseFormDataPayload = (formData: FormData): ContentPayload => {
  const data: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('data.')) continue;

    const dataKey = key.slice(5).trim();
    if (!dataKey) continue;

    if (dataKey.endsWith('_csv')) {
      data[dataKey.slice(0, -4)] = parseCsvList(value);
      continue;
    }

    if (dataKey.endsWith('_lines')) {
      data[dataKey.slice(0, -6)] = parseLineList(value);
      continue;
    }

    data[dataKey] = parseFormValue(value);
  }

  return {
    collection: String(formData.get('collection') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    title: String(formData.get('title') ?? ''),
    status: String(formData.get('status') ?? ''),
    data: Object.keys(data).length > 0 ? data : undefined,
    dataJson: String(formData.get('dataJson') ?? ''),
    baseDataJson: String(formData.get('baseDataJson') ?? ''),
    redirectTo: String(formData.get('redirectTo') ?? '')
  };
};

const parseJsonObject = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim();
  if (!trimmed) return {};

  try {
    const parsed = JSON.parse(trimmed);
    if (!isObjectRecord(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const parseRedirectPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const parseBody = async (request: Request): Promise<ContentPayload | null> => {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    try {
      const parsed = await request.json();
      if (!isObjectRecord(parsed)) {
        return null;
      }
      return parsed as ContentPayload;
    } catch {
      return null;
    }
  }

  try {
    const formData = await request.formData();
    return parseFormDataPayload(formData);
  } catch {
    return null;
  }
};

const parseDataPayload = (payload: ContentPayload): Record<string, unknown> | null => {
  const merged: Record<string, unknown> = {};

  if (typeof payload.baseDataJson === 'string' && payload.baseDataJson.trim().length > 0) {
    const baseData = parseJsonObject(payload.baseDataJson);
    if (!baseData) {
      return null;
    }
    Object.assign(merged, baseData);
  }

  if (typeof payload.dataJson === 'string' && payload.dataJson.trim().length > 0) {
    const rawData = parseJsonObject(payload.dataJson);
    if (!rawData) {
      return null;
    }
    Object.assign(merged, rawData);
  }

  if (payload.data !== undefined) {
    if (!isObjectRecord(payload.data)) {
      return null;
    }
    Object.assign(merged, payload.data);
  }

  return merged;
};

const parseIntegerValue = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const normalizeFaqData = (data: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...data };
  const sectionValue = typeof normalized.section_title === 'string' ? normalized.section_title.trim() : '';
  const customSectionValue = typeof normalized.section_title_custom === 'string'
    ? normalized.section_title_custom.trim()
    : '';

  if (sectionValue === '__new__') {
    if (customSectionValue.length > 0) {
      normalized.section_title = customSectionValue;
    } else {
      delete normalized.section_title;
    }
  } else if (sectionValue.length > 0) {
    normalized.section_title = sectionValue;
  }

  delete normalized.section_title_custom;

  const listStyle = typeof normalized.list_style === 'string' ? normalized.list_style.trim().toLowerCase() : '';
  if (listStyle === 'ordered' || listStyle === 'unordered' || listStyle === 'none') {
    normalized.list_style = listStyle;
  } else {
    normalized.list_style = 'none';
  }

  if (Array.isArray(normalized.bullets)) {
    normalized.bullets = normalized.bullets
      .map((bullet) => (typeof bullet === 'string' ? bullet.trim() : ''))
      .filter((bullet) => bullet.length > 0);
  }

  const sectionOrder = parseIntegerValue(normalized.section_order);
  if (sectionOrder !== null) {
    normalized.section_order = Math.max(1, sectionOrder);
  }

  const itemOrder = parseIntegerValue(normalized.item_order);
  if (itemOrder !== null) {
    normalized.item_order = Math.max(1, itemOrder);
  }

  return normalized;
};

const responseByFormat = (redirectTo: string | null, payload: Record<string, unknown>, status = 200) => {
  if (redirectTo) {
    if (status >= 400) {
      const errorValue = typeof payload.error === 'string' ? payload.error : 'Request failed';
      const targetUrl = new URL(redirectTo, 'http://localhost');
      targetUrl.searchParams.set('error', errorValue);
      return new Response(null, {
        status: 303,
        headers: {
          Location: `${targetUrl.pathname}${targetUrl.search}`
        }
      });
    }

    return new Response(null, {
      status: 303,
      headers: {
        Location: redirectTo
      }
    });
  }

  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, isAdmin, session } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin || !session) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const payload = await parseBody(request);
  if (!payload) {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const collection = payload.collection?.trim();
  const slug = payload.slug?.trim().toLowerCase();
  const title = payload.title?.trim() || null;
  const status = payload.status?.trim() || 'published';
  const redirectTo = parseRedirectPath(payload.redirectTo);

  if (!collection || !ALLOWED_COLLECTIONS.has(collection)) {
    return responseByFormat(redirectTo, { error: 'Collection is not allowed' }, 400);
  }

  if (!slug || !/^[a-z0-9-_]+$/.test(slug)) {
    return responseByFormat(redirectTo, { error: 'Slug must contain only lowercase letters, numbers, hyphen, or underscore' }, 400);
  }

  const rawData = parseDataPayload(payload);
  if (!rawData) {
    return responseByFormat(redirectTo, { error: 'Content data must be a JSON object' }, 400);
  }

  const data = collection === 'faq' ? normalizeFaqData(rawData) : rawData;

  if (collection === 'faq') {
    const sectionTitle = typeof data.section_title === 'string' ? data.section_title.trim() : '';
    const question = typeof data.question === 'string' ? data.question.trim() : '';
    const answer = typeof data.answer === 'string' ? data.answer.trim() : '';

    if (!sectionTitle || !question || !answer) {
      return responseByFormat(redirectTo, { error: 'FAQ entries require section, question, and answer' }, 400);
    }
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

    db.cache.invalidateCollection(collection);

    return responseByFormat(redirectTo, {
      success: true,
      collection,
      slug
    });
  } catch {
    return responseByFormat(redirectTo, { error: 'Failed to save content' }, 500);
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let collection = '';
  let slug = '';

  try {
    const body = await request.json();
    collection = String(body.collection ?? '').trim();
    slug = String(body.slug ?? '').trim().toLowerCase();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!ALLOWED_COLLECTIONS.has(collection) || !slug) {
    return new Response(JSON.stringify({ error: 'Collection and slug are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await query(
      `
        DELETE FROM content
        WHERE type = $1 AND slug = $2
      `,
      [collection, slug]
    );

    db.cache.invalidateCollection(collection);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to delete content' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
