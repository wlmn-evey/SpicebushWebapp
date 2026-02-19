import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { query, queryFirst } from '@lib/db/client';
import { handleMediaUpload } from '@lib/media-storage';
import { getPhotoFramingDefaults } from '@lib/photo-framing-defaults';
import { logServerError } from '@lib/server-logger';

type AiFillBody = {
  slotId?: unknown;
  photoSlug?: unknown;
  breakpoint?: unknown;
  targetWidth?: unknown;
  targetHeight?: unknown;
};

type GeminiImageResponsePayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
        inlineData?: {
          data?: unknown;
          mimeType?: unknown;
        };
      }>;
    };
  }>;
  error?: {
    message?: unknown;
  };
};

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const jsonResponse = (payload: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const roundTenth = (value: number): number => Math.round(value * 10) / 10;

const asRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const asString = (value: unknown, fallback = ''): string => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const normalizeToken = (value: string): string => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9-_]+/g, '-')
  .replace(/-{2,}/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

const normalizeBreakpoint = (value: unknown): Breakpoint => {
  const raw = asString(value, 'desktop').toLowerCase();
  if (raw === 'mobile') return 'mobile';
  if (raw === 'tablet') return 'tablet';
  return 'desktop';
};

const parseBody = async (request: Request): Promise<AiFillBody | null> => {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    return payload as AiFillBody;
  } catch {
    return null;
  }
};

const getRuntimeEnvValue = (key: string): string => {
  const runtimeEnv = (typeof process !== 'undefined' && process.env) ? process.env : undefined;
  const value = runtimeEnv?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

const gallerySubcategories = new Set([
  'art',
  'classroom',
  'events',
  'group',
  'individual',
  'materials',
  'outdoor',
  'practical'
]);

const resolvePhotoImageUrl = (
  photoData: Record<string, unknown>,
  photoSlug: string,
  requestUrl: URL
): string => {
  const sourceUrl = asString(photoData.sourceUrl);
  if (sourceUrl) {
    return sourceUrl;
  }

  const category = asString(photoData.category, 'gallery');
  const optimizedFilename = asString(photoData.optimizedFilename, `${photoSlug}.webp`);
  const basePath = gallerySubcategories.has(category)
    ? `/images/optimized/gallery/${category}`
    : `/images/optimized/${category}`;

  return `${requestUrl.origin}${basePath}/${optimizedFilename}`;
};

const fetchImageBuffer = async (
  imageUrl: string
): Promise<{ buffer: Buffer; mimeType: string }> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpicebushAiFill/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Source image fetch failed (${response.status})`);
    }

    const contentTypeHeader = response.headers.get('content-type');
    const mimeType = contentTypeHeader
      ? contentTypeHeader.split(';')[0]?.trim().toLowerCase() ?? 'image/jpeg'
      : 'image/jpeg';

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Source image is empty');
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const normalizeCrop = (
  xInput: unknown,
  yInput: unknown,
  widthInput: unknown,
  heightInput: unknown,
  defaults: CropRect
): CropRect => {
  const width = clamp(toNumber(widthInput, defaults.width), 10, 100);
  const height = clamp(toNumber(heightInput, defaults.height), 10, 100);
  const x = clamp(toNumber(xInput, defaults.x), 0, 100 - width);
  const y = clamp(toNumber(yInput, defaults.y), 0, 100 - height);
  return {
    x: roundTenth(x),
    y: roundTenth(y),
    width: roundTenth(width),
    height: roundTenth(height)
  };
};

const deriveAspectAwareCrop = (
  sourceAspect: number,
  focusX: number,
  focusY: number,
  targetWidth: number,
  targetHeight: number
): CropRect => {
  const targetAspect = targetHeight > 0 ? targetWidth / targetHeight : sourceAspect;
  if (!Number.isFinite(targetAspect) || targetAspect <= 0 || !Number.isFinite(sourceAspect) || sourceAspect <= 0) {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100
    };
  }

  let cropWidth = 100;
  let cropHeight = 100;
  if (targetAspect > sourceAspect) {
    cropHeight = clamp((sourceAspect / targetAspect) * 100, 10, 100);
  } else if (targetAspect < sourceAspect) {
    cropWidth = clamp((targetAspect / sourceAspect) * 100, 10, 100);
  }

  const x = clamp(focusX - (cropWidth / 2), 0, 100 - cropWidth);
  const y = clamp(focusY - (cropHeight / 2), 0, 100 - cropHeight);

  return {
    x: roundTenth(x),
    y: roundTenth(y),
    width: roundTenth(cropWidth),
    height: roundTenth(cropHeight)
  };
};

const resolveTargetSize = (
  slotData: Record<string, unknown>,
  breakpoint: Breakpoint,
  requestedWidth: number,
  requestedHeight: number
): { width: number; height: number } => {
  const widthKey = breakpoint === 'mobile'
    ? 'mobileTargetWidth'
    : breakpoint === 'tablet'
      ? 'tabletTargetWidth'
      : 'desktopTargetWidth';
  const heightKey = breakpoint === 'mobile'
    ? 'mobileTargetHeight'
    : breakpoint === 'tablet'
      ? 'tabletTargetHeight'
      : 'desktopTargetHeight';

  const fallback = breakpoint === 'mobile'
    ? { width: 640, height: 480 }
    : breakpoint === 'tablet'
      ? { width: 960, height: 640 }
      : { width: 1280, height: 853 };

  const width = Math.round(clamp(
    toNumber(requestedWidth, toNumber(slotData[widthKey], fallback.width)),
    180,
    2200
  ));
  const height = Math.round(clamp(
    toNumber(requestedHeight, toNumber(slotData[heightKey], fallback.height)),
    120,
    2200
  ));

  return { width, height };
};

const extractGeminiImage = (payload: GeminiImageResponsePayload): { buffer: Buffer; mimeType: string } | null => {
  if (!Array.isArray(payload.candidates)) {
    return null;
  }

  for (const candidate of payload.candidates) {
    const parts = candidate.content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const part of parts) {
      const data = part.inlineData?.data;
      if (typeof data !== 'string' || data.trim().length === 0) continue;

      const mimeTypeRaw = part.inlineData?.mimeType;
      const mimeType = typeof mimeTypeRaw === 'string' && mimeTypeRaw.trim().length > 0
        ? mimeTypeRaw.trim().toLowerCase()
        : 'image/png';

      try {
        return {
          buffer: Buffer.from(data, 'base64'),
          mimeType
        };
      } catch {
        return null;
      }
    }
  }

  return null;
};

const requestGeminiAiFill = async (
  apiKey: string,
  model: string,
  image: { buffer: Buffer; mimeType: string },
  targetSize: { width: number; height: number },
  breakpoint: Breakpoint
): Promise<{ buffer: Buffer; mimeType: string }> => {
  const prompt = [
    'Edit this school photo.',
    `Output exactly ${targetSize.width}x${targetSize.height} pixels.`,
    `This variant is for ${breakpoint} layout.`,
    'Keep the original people and objects natural and recognizable.',
    'Expand the scene naturally where needed so the frame has no empty bars.',
    'No text, no logos, no borders, no watermarks.',
    'Photorealistic only.'
  ].join(' ');

  const attemptModes: Array<{ includeModalities: boolean; includeImageConfig: boolean }> = [
    { includeModalities: true, includeImageConfig: true },
    { includeModalities: true, includeImageConfig: false },
    { includeModalities: false, includeImageConfig: false }
  ];

  const errors: string[] = [];

  for (const mode of attemptModes) {
    const generationConfig: Record<string, unknown> = {
      temperature: 0.2
    };

    if (mode.includeModalities) {
      generationConfig.responseModalities = ['IMAGE', 'TEXT'];
    }

    if (mode.includeImageConfig) {
      generationConfig.imageConfig = {
        aspectRatio: `${targetSize.width}:${targetSize.height}`
      };
    }

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.buffer.toString('base64')
              }
            }
          ]
        }
      ],
      generationConfig
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );

      const parsed = await response.json().catch(() => ({})) as GeminiImageResponsePayload;
      if (!response.ok) {
        const message = typeof parsed.error?.message === 'string'
          ? parsed.error.message
          : `Gemini request failed (${response.status})`;
        errors.push(message);
        continue;
      }

      const extracted = extractGeminiImage(parsed);
      if (extracted) {
        return extracted;
      }

      errors.push('Gemini response did not include an edited image.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini request failed';
      errors.push(message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error(errors.join(' | ') || 'Gemini image edit failed');
};

const normalizeGeneratedImage = async (
  image: { buffer: Buffer; mimeType: string },
  targetSize: { width: number; height: number }
): Promise<Buffer> => {
  const processed = await sharp(image.buffer)
    .rotate()
    .resize(targetSize.width, targetSize.height, {
      fit: 'cover',
      position: 'center'
    })
    .webp({ quality: 88 })
    .toBuffer();

  return processed;
};

export const POST: APIRoute = async ({ request, locals, url }) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin || !auth.session) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const body = await parseBody(request);
  if (!body) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const slotId = normalizeToken(asString(body.slotId));
  const photoSlug = normalizeToken(asString(body.photoSlug));
  const breakpoint = normalizeBreakpoint(body.breakpoint);

  if (!slotId || !photoSlug) {
    return jsonResponse({ error: 'slotId and photoSlug are required' }, 400);
  }

  const geminiKey = getRuntimeEnvValue('GEMINI_API_KEY');
  if (!geminiKey) {
    return jsonResponse({ error: 'Gemini API key is not configured' }, 400);
  }

  const geminiModel = getRuntimeEnvValue('GEMINI_IMAGE_MODEL')
    || getRuntimeEnvValue('GEMINI_MODEL')
    || 'gemini-2.5-flash-image-preview';

  try {
    const [photoRow, slotRow] = await Promise.all([
      queryFirst<{ slug: string; data: Record<string, unknown> }>(
        `
          SELECT slug, data
          FROM content
          WHERE type = 'photos' AND slug = $1 AND status = 'published'
          LIMIT 1
        `,
        [photoSlug]
      ),
      queryFirst<{ slug: string; title: string | null; data: Record<string, unknown> }>(
        `
          SELECT slug, title, data
          FROM content
          WHERE type = 'media-slots' AND slug = $1
          LIMIT 1
        `,
        [slotId]
      )
    ]);

    if (!photoRow?.data) {
      return jsonResponse({ error: 'Photo not found' }, 404);
    }

    const photoData = asRecord(photoRow.data);
    const slotData = asRecord(slotRow?.data);

    const originalWidth = Math.max(1, Math.round(toNumber(photoData.originalWidth, 1280)));
    const originalHeight = Math.max(1, Math.round(toNumber(photoData.originalHeight, 800)));
    const sourceAspect = originalWidth / originalHeight;
    const category = asString(photoData.category, 'gallery');
    const defaults = getPhotoFramingDefaults({
      category,
      width: originalWidth,
      height: originalHeight,
      slug: photoSlug
    });

    const targetSize = resolveTargetSize(
      slotData,
      breakpoint,
      toNumber(body.targetWidth, 0),
      toNumber(body.targetHeight, 0)
    );

    const crop = (() => {
      if (breakpoint === 'mobile') {
        return normalizeCrop(
          slotData.mobileCropX ?? photoData.mobileCropX,
          slotData.mobileCropY ?? photoData.mobileCropY,
          slotData.mobileCropWidth ?? photoData.mobileCropWidth,
          slotData.mobileCropHeight ?? photoData.mobileCropHeight,
          {
            x: defaults.mobileCropX,
            y: defaults.mobileCropY,
            width: defaults.mobileCropWidth,
            height: defaults.mobileCropHeight
          }
        );
      }

      if (breakpoint === 'tablet') {
        return normalizeCrop(
          slotData.tabletCropX ?? photoData.tabletCropX,
          slotData.tabletCropY ?? photoData.tabletCropY,
          slotData.tabletCropWidth ?? photoData.tabletCropWidth,
          slotData.tabletCropHeight ?? photoData.tabletCropHeight,
          {
            x: defaults.tabletCropX,
            y: defaults.tabletCropY,
            width: defaults.tabletCropWidth,
            height: defaults.tabletCropHeight
          }
        );
      }

      const focusX = clamp(toNumber(slotData.desktopFocalX, toNumber(photoData.desktopFocalX, defaults.primaryFocalX)), 0, 100);
      const focusY = clamp(toNumber(slotData.desktopFocalY, toNumber(photoData.desktopFocalY, defaults.primaryFocalY)), 0, 100);
      return deriveAspectAwareCrop(sourceAspect, focusX, focusY, targetSize.width, targetSize.height);
    })();

    const sourceImageUrl = resolvePhotoImageUrl(photoData, photoSlug, new URL(url));
    const sourceImage = await fetchImageBuffer(sourceImageUrl);

    const sourceProbe = sharp(sourceImage.buffer).rotate();
    const sourceMeta = await sourceProbe.metadata();
    const sourceWidth = sourceMeta.width ?? 0;
    const sourceHeight = sourceMeta.height ?? 0;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return jsonResponse({ error: 'Invalid source image' }, 400);
    }

    const cropWidthPx = Math.max(1, Math.round((crop.width / 100) * sourceWidth));
    const cropHeightPx = Math.max(1, Math.round((crop.height / 100) * sourceHeight));
    const cropXPx = clamp(Math.round((crop.x / 100) * sourceWidth), 0, Math.max(0, sourceWidth - cropWidthPx));
    const cropYPx = clamp(Math.round((crop.y / 100) * sourceHeight), 0, Math.max(0, sourceHeight - cropHeightPx));

    const baseFrame = await sharp(sourceImage.buffer)
      .rotate()
      .extract({
        left: cropXPx,
        top: cropYPx,
        width: cropWidthPx,
        height: cropHeightPx
      })
      .png()
      .toBuffer();

    const geminiResult = await requestGeminiAiFill(
      geminiKey,
      geminiModel,
      {
        buffer: baseFrame,
        mimeType: 'image/png'
      },
      targetSize,
      breakpoint
    );

    const normalizedResult = await normalizeGeneratedImage(geminiResult, targetSize);
    const generatedFileName = `${slotId}-${breakpoint}-ai-fill-${Date.now()}.webp`;
    const generatedUpload = await handleMediaUpload(
      {
        buffer: normalizedResult,
        originalname: generatedFileName,
        mimetype: 'image/webp',
        size: normalizedResult.length
      },
      auth.session.userEmail || auth.session.userId
    );

    if (!generatedUpload.success) {
      return jsonResponse({ error: generatedUpload.error || 'Failed to store generated image' }, 500);
    }

    const breakpointConfig = breakpoint === 'mobile'
      ? {
        urlKey: 'aiFillMobileUrl',
        widthKey: 'mobileTargetWidth',
        heightKey: 'mobileTargetHeight'
      }
      : breakpoint === 'tablet'
        ? {
          urlKey: 'aiFillTabletUrl',
          widthKey: 'tabletTargetWidth',
          heightKey: 'tabletTargetHeight'
        }
        : {
          urlKey: 'aiFillDesktopUrl',
          widthKey: 'desktopTargetWidth',
          heightKey: 'desktopTargetHeight'
        };

    const nextSlotData = {
      ...slotData,
      slotId,
      photoSlug,
      [breakpointConfig.urlKey]: generatedUpload.url,
      [breakpointConfig.widthKey]: targetSize.width,
      [breakpointConfig.heightKey]: targetSize.height,
      aiFillLastUpdatedAt: new Date().toISOString(),
      aiFillLastBreakpoint: breakpoint
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
        'media-slots',
        slotId,
        slotRow?.title || `Media Slot: ${slotId}`,
        JSON.stringify(nextSlotData),
        'published',
        auth.session.userEmail || null,
        new Date().toISOString()
      ]
    );

    db.cache.invalidateCollection('media-slots');

    return jsonResponse({
      success: true,
      slotId,
      photoSlug,
      breakpoint,
      targetSize,
      url: generatedUpload.url
    });
  } catch (error) {
    logServerError('AI fill endpoint failed', error, {
      route: '/api/admin/media/ai-fill',
      slotId,
      photoSlug,
      breakpoint,
      model: geminiModel
    });

    const message = error instanceof Error && error.message.trim().length > 0
      ? error.message
      : 'AI fill failed';
    return jsonResponse({ error: message }, 500);
  }
};
