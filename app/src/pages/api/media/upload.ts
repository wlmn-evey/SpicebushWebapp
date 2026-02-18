import path from 'path';
import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { handleMediaUpload, validateFile } from '@lib/media-storage';
import { errorResponse } from '@lib/api-utils';
import { query, queryFirst } from '@lib/db/client';
import { logServerError } from '@lib/server-logger';
import { getPhotoFramingDefaults } from '@lib/photo-framing-defaults';

const PHOTO_CATEGORIES = new Set([
  'homepage',
  'about',
  'programs',
  'admissions',
  'gallery',
  'teachers',
  'blog',
  'art',
  'classroom',
  'events',
  'group',
  'individual',
  'materials',
  'outdoor',
  'practical'
]);

const parseBoolean = (value: FormDataEntryValue | null): boolean => {
  if (typeof value !== 'string') {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const slugify = (value: string): string => value
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const isValidSlug = (slug: string): boolean => /^[a-z0-9-_]+$/.test(slug);

const inferFormat = (mimeType: string, filename: string): 'webp' | 'jpg' | 'png' => {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'image/webp') return 'webp';
  if (normalized === 'image/png') return 'png';

  const ext = path.extname(filename).toLowerCase();
  if (ext === '.webp') return 'webp';
  if (ext === '.png') return 'png';
  return 'jpg';
};

const toAspectRatio = (width: number | null, height: number | null): string => {
  if (!width || !height || width <= 0 || height <= 0) {
    return '3:2';
  }

  let a = Math.round(width);
  let b = Math.round(height);

  while (b !== 0) {
    const t = b;
    b = a % b;
    a = t;
  }

  const gcd = a || 1;
  return `${Math.round(width / gcd)}:${Math.round(height / gcd)}`;
};

const getBaseTitle = (fileName: string): string => {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, '');
  const normalized = withoutExtension.replace(/[-_]+/g, ' ').trim();
  return normalized.length > 0 ? normalized : 'Uploaded photo';
};

const resolveCategory = (rawValue: string): string => {
  const normalized = rawValue.trim().toLowerCase();
  if (!normalized) return 'gallery';
  return normalized;
};

const ensureUniquePhotoSlug = async (baseSlug: string): Promise<string> => {
  let candidate = baseSlug;
  let suffix = 2;

  for (let attempts = 0; attempts < 500; attempts += 1) {
    const existing = await queryFirst<{ slug: string }>(
      `
        SELECT slug
        FROM content
        WHERE type = 'photos' AND slug = $1
        LIMIT 1
      `,
      [candidate]
    );

    if (!existing) {
      return candidate;
    }

    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  throw new Error('Unable to generate unique photo slug');
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { isAuthenticated, isAdmin, session, user } = await checkAdminAuth({ locals });

    if (!isAuthenticated || !isAdmin || !session) {
      return errorResponse('Unauthorized', 401);
    }

    const userId = user?.email || session.userEmail || session.userId;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validation = await validateFile({
      mimetype: file.type,
      size: file.size
    });

    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const createPhotoEntry = parseBoolean(formData.get('createPhotoEntry'));

    const requestedTitle = String(formData.get('title') ?? '').trim();
    const requestedSlug = String(formData.get('slug') ?? '').trim().toLowerCase();
    const requestedCategory = resolveCategory(String(formData.get('category') ?? 'gallery'));

    if (createPhotoEntry && !PHOTO_CATEGORIES.has(requestedCategory)) {
      return new Response(JSON.stringify({ error: 'Invalid photo category' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (requestedSlug && !isValidSlug(requestedSlug)) {
      return new Response(JSON.stringify({ error: 'Slug must contain only lowercase letters, numbers, hyphen, or underscore' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await handleMediaUpload(
      {
        buffer,
        originalname: file.name,
        mimetype: file.type,
        size: file.size
      },
      userId
    );

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let photoSlug: string | null = null;

    if (createPhotoEntry) {
      const baseTitle = requestedTitle || getBaseTitle(file.name);
      const slugSeed = requestedSlug || slugify(baseTitle) || `photo-${Date.now()}`;
      const uniqueSlug = await ensureUniquePhotoSlug(slugSeed);

      const width = result.width ?? 1200;
      const height = result.height ?? 800;
      const format = inferFormat(result.mimeType, result.originalFilename);
      const optimizedFilename = path.basename(result.url);
      const framingDefaults = getPhotoFramingDefaults({
        category: requestedCategory,
        width,
        height,
        slug: uniqueSlug
      });

      const photoData: Record<string, unknown> = {
        title: baseTitle,
        sourceUrl: result.url,
        originalFilename: result.originalFilename,
        optimizedFilename,
        category: requestedCategory,
        originalWidth: width,
        originalHeight: height,
        aspectRatio: toAspectRatio(width, height),
        format,
        primaryFocalX: framingDefaults.primaryFocalX,
        primaryFocalY: framingDefaults.primaryFocalY,
        primaryFocalWeight: 10,
        primaryFocalDescription: framingDefaults.primaryFocalDescription,
        mobileCropX: framingDefaults.mobileCropX,
        mobileCropY: framingDefaults.mobileCropY,
        mobileCropWidth: framingDefaults.mobileCropWidth,
        mobileCropHeight: framingDefaults.mobileCropHeight,
        tabletCropX: framingDefaults.tabletCropX,
        tabletCropY: framingDefaults.tabletCropY,
        tabletCropWidth: framingDefaults.tabletCropWidth,
        tabletCropHeight: framingDefaults.tabletCropHeight,
        altText: baseTitle,
        seoKeywords: [],
        contextualDescription: `${baseTitle} uploaded from the admin media manager`,
        usedOn: [],
        primaryUse: requestedCategory,
        hasHumanFaces: false,
        hasChildren: false,
        hasMonressoriMaterials: false,
        dominantColors: [],
        lighting: 'natural',
        activity: 'Uncategorized',
        setting: 'classroom',
        compressed: false,
        hasWebP: format === 'webp',
        hasSrcSet: false,
        lazyLoad: true,
        priority: false
      };

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
          'photos',
          uniqueSlug,
          baseTitle,
          JSON.stringify(photoData),
          'published',
          session.userEmail ?? null,
          new Date().toISOString()
        ]
      );

      db.cache.invalidateCollection('photos');
      photoSlug = uniqueSlug;
    }

    return new Response(JSON.stringify({
      success: true,
      url: result.url,
      mediaId: result.mediaId,
      storagePath: result.storagePath,
      provider: result.provider,
      width: result.width,
      height: result.height,
      mimeType: result.mimeType,
      originalFilename: result.originalFilename,
      photoSlug,
      message: photoSlug ? 'File uploaded and photo entry created' : 'File uploaded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logServerError('Media upload endpoint failed', error, { route: '/api/media/upload' });
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
