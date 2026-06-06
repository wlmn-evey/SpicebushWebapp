import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { query } from '@lib/db/client';
import { normalizeBlogData, validateBlogData } from '@lib/blog-content';

const ALLOWED_COLLECTIONS = new Set([
  'hours',
  'staff',
  'tuition',
  'settings',
  'school-info',
  'photos',
  'faq',
  'testimonials',
  'media-slots',
  'blog'
]);

type ContentPayload = {
  collection: string;
  slug: string;
  title?: string;
  status?: string;
  data?: Record<string, unknown>;
  dataJson?: string;
  baseDataJson?: string;
  redirectTo?: string;
  createOnly?: boolean;
  action?: string;
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
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
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
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

const parseLineList = (value: FormDataEntryValue): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split(/\n/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
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

    // `_raw` suffix: store the raw string, skipping parseSimpleValue coercion + trim.
    // The blog form uses data.body_raw / data.excerpt_raw; the parser's trim is restored
    // by normalizeBlogData (R2-F8).
    if (dataKey.endsWith('_raw')) {
      data[dataKey.slice(0, -4)] = typeof value === 'string' ? value : '';
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
    redirectTo: String(formData.get('redirectTo') ?? ''),
    createOnly: parseBooleanValue(formData.get('createOnly'), false),
    action: String(formData.get('action') ?? '')
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
  // Reject any control character (CR/LF included) so a redirectTo can never carry a
  // header-splitting payload regardless of which response branch sets the Location header
  // (defense-in-depth — the success branch sets Location directly, unnormalized). R2-F1.
  // eslint-disable-next-line no-control-regex -- intentionally matching control chars to reject them
  if (/[\x00-\x1f]/.test(value)) return null;
  // Reject backslash-leading paths (`/\evil.com`) that browsers resolve off-site as `//evil.com`.
  return /^\/(?![/\\])/.test(value) ? value : null;
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

const parseBooleanValue = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
};

const normalizeFaqData = (data: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...data };
  const sectionValue =
    typeof normalized.section_title === 'string' ? normalized.section_title.trim() : '';
  const customSectionValue =
    typeof normalized.section_title_custom === 'string'
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

  const listStyle =
    typeof normalized.list_style === 'string' ? normalized.list_style.trim().toLowerCase() : '';
  if (listStyle === 'ordered' || listStyle === 'unordered' || listStyle === 'none') {
    normalized.list_style = listStyle;
  } else {
    normalized.list_style = 'none';
  }

  if (Array.isArray(normalized.bullets)) {
    normalized.bullets = normalized.bullets
      .map(bullet => (typeof bullet === 'string' ? bullet.trim() : ''))
      .filter(bullet => bullet.length > 0);
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

const normalizeTestimonialsData = (data: Record<string, unknown>): Record<string, unknown> => {
  const normalized: Record<string, unknown> = { ...data };

  const rating = parseIntegerValue(normalized.rating);
  normalized.rating = rating === null ? 5 : Math.min(Math.max(rating, 1), 5);

  const displayOrder = parseIntegerValue(normalized.display_order);
  if (displayOrder !== null) {
    normalized.display_order = Math.max(1, displayOrder);
  } else if (normalized.display_order === undefined) {
    normalized.display_order = 999;
  }

  normalized.featured = parseBooleanValue(normalized.featured, false);
  normalized.active = parseBooleanValue(normalized.active, true);
  normalized.show_on_homepage = parseBooleanValue(normalized.show_on_homepage, true);
  normalized.show_on_coming_soon = parseBooleanValue(
    normalized.show_on_coming_soon,
    parseBooleanValue(normalized.featured, false)
  );

  const normalizeCategoryToken = (value: unknown): string => {
    if (typeof value !== 'string') return '';
    const normalizedCategory = value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-{2,}/g, '-')
      .replace(/^-+|-+$/g, '');
    return normalizedCategory;
  };

  const normalizedCategoryList = (() => {
    const categories: string[] = [];
    const pushCategory = (value: unknown) => {
      const token = normalizeCategoryToken(value);
      if (token.length > 0 && !categories.includes(token)) {
        categories.push(token);
      }
    };

    if (Array.isArray(normalized.categories)) {
      normalized.categories.forEach(value => pushCategory(value));
    } else if (typeof normalized.categories === 'string') {
      normalized.categories
        .split(/[\n,]/)
        .map(value => value.trim())
        .forEach(value => pushCategory(value));
    }

    pushCategory(normalized.category);

    return categories.length > 0 ? categories : ['general'];
  })();

  normalized.categories = normalizedCategoryList;
  normalized.category = normalizedCategoryList[0];

  const yearsAtSpicebush = parseIntegerValue(normalized.yearsAtSpicebush);
  if (yearsAtSpicebush !== null) {
    normalized.yearsAtSpicebush = Math.max(0, yearsAtSpicebush);
  }

  if (typeof normalized.body === 'string') {
    normalized.body = normalized.body.trim();
  }

  if (typeof normalized.author === 'string') {
    normalized.author = normalized.author.trim();
  }

  if (typeof normalized.authorTitle === 'string') {
    normalized.authorTitle = normalized.authorTitle.trim();
  }

  if (typeof normalized.relationship === 'string') {
    normalized.relationship = normalized.relationship.trim();
  }

  if (typeof normalized.childAge === 'string') {
    normalized.childAge = normalized.childAge.trim();
  }

  if (typeof normalized.date === 'string') {
    normalized.date = normalized.date.trim();
  }

  if (typeof normalized.authorPhoto === 'string') {
    normalized.authorPhoto = normalized.authorPhoto.trim();
  }

  if (typeof normalized.authorPhotoSlug === 'string') {
    normalized.authorPhotoSlug = normalized.authorPhotoSlug.trim();
  }

  return normalized;
};

const responseByFormat = (
  redirectTo: string | null,
  payload: Record<string, unknown>,
  status = 200
) => {
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

  // Defense-in-depth CSRF check (SameSite=Lax remains the primary defense). Rejects only on
  // positive cross-site evidence — fails open when both headers are absent. Hardens ALL admin
  // collection POSTs, not just blog.
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (
    (origin && origin !== requestOrigin) ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) {
    return new Response(JSON.stringify({ error: 'Cross-site request rejected' }), {
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
  let status = payload.status?.trim() || 'published';
  const redirectTo = parseRedirectPath(payload.redirectTo);
  // Coerce defensively regardless of source (R2-F2 work order §6 Change 5): the form path
  // already coerced via parseFormDataPayload, but the JSON path passes the body through
  // untouched, so a JSON `createOnly: "false"` (string) would be truthy and wrongly take the
  // insert-only DO NOTHING branch — turning an edit into a 400 collision.
  const createOnly = parseBooleanValue(payload.createOnly, false);

  if (!collection || !ALLOWED_COLLECTIONS.has(collection)) {
    return responseByFormat(redirectTo, { error: 'Collection is not allowed' }, 400);
  }

  if (!slug || !/^[a-z0-9-_]+$/.test(slug)) {
    return responseByFormat(
      redirectTo,
      { error: 'Slug must contain only lowercase letters, numbers, hyphen, or underscore' },
      400
    );
  }

  // Form-based delete: `action=delete` runs the same DELETE as the standalone DELETE export and
  // responds via responseByFormat (HTML form posts get a 303). No data parse needed.
  if (payload.action === 'delete') {
    try {
      await query(
        `
          DELETE FROM content
          WHERE type = $1 AND slug = $2
        `,
        [collection, slug]
      );

      db.cache.invalidateCollection(collection);

      return responseByFormat(redirectTo, { success: true, collection, slug });
    } catch {
      return responseByFormat(redirectTo, { error: 'Failed to delete content' }, 500);
    }
  }

  const rawData = parseDataPayload(payload);
  if (!rawData) {
    return responseByFormat(redirectTo, { error: 'Content data must be a JSON object' }, 400);
  }

  let data = rawData;
  if (collection === 'faq') {
    data = normalizeFaqData(rawData);
  } else if (collection === 'testimonials') {
    data = normalizeTestimonialsData(rawData);
  } else if (collection === 'blog') {
    data = normalizeBlogData(rawData);
  }

  if (collection === 'blog') {
    // Pass payload.status (RAW form value, BEFORE the `|| 'published'` default at the `status`
    // local above) so blog status omission is a 400, never a silent publish. The default stays
    // untouched for all other collections (R2-F2). `{ ...data, slug }` lets validateBlogData see
    // the slug for the date-prefix/shape check; `slug` is NEVER persisted into the JSONB data.
    const error = validateBlogData({ ...data, slug }, title, payload.status);
    if (error) return responseByFormat(redirectTo, { error }, 400);
    // Canonicalize to the validated lowercase status. validateBlogData accepts status
    // case-insensitively; the SQL read filter is exact `status = 'published'`, so storing
    // 'Published' verbatim would make the post silently invisible on the public site.
    status = (payload.status as string).trim().toLowerCase();
  }

  if (collection === 'faq') {
    const sectionTitle = typeof data.section_title === 'string' ? data.section_title.trim() : '';
    const question = typeof data.question === 'string' ? data.question.trim() : '';
    const answer = typeof data.answer === 'string' ? data.answer.trim() : '';

    if (!sectionTitle || !question || !answer) {
      return responseByFormat(
        redirectTo,
        { error: 'FAQ entries require section, question, and answer' },
        400
      );
    }
  }

  if (collection === 'testimonials') {
    const author = typeof data.author === 'string' ? data.author.trim() : '';
    const body = typeof data.body === 'string' ? data.body.trim() : '';

    if (!author || !body) {
      return responseByFormat(
        redirectTo,
        { error: 'Testimonial entries require an author and quote' },
        400
      );
    }
  }

  const upsertValues = [
    collection,
    slug,
    title,
    JSON.stringify(data),
    status,
    session.userEmail ?? null,
    new Date().toISOString()
  ];

  try {
    if (createOnly) {
      // Insert-only: a conflicting (type, slug) is left untouched and reported as a collision.
      const result = await query(
        `
          INSERT INTO content (type, slug, title, data, status, author_email, updated_at)
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
          ON CONFLICT (type, slug) DO NOTHING
        `,
        upsertValues
      );

      if (result.rowCount === 0) {
        return responseByFormat(
          redirectTo,
          {
            error:
              'A post with this address already exists — change the address or edit the existing post.'
          },
          400
        );
      }
    } else {
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
        upsertValues
      );
    }

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
    slug = String(body.slug ?? '')
      .trim()
      .toLowerCase();
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
