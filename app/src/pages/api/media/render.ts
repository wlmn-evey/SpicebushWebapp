import type { APIRoute } from 'astro';
import sharp from 'sharp';

const ALLOWED_RELATIVE_PREFIXES = ['/images/', '/uploads/', '/api/media/blob/'];

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const parsePercent = (value: string | null, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

const parseIntRange = (
  value: string | null,
  min: number,
  max: number
): number | null => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return null;
  return clamp(parsed, min, max);
};

const parseQuality = (value: string | null): number => {
  const parsed = parseIntRange(value, 40, 95);
  return parsed ?? 82;
};

const isAllowedAbsoluteHost = (hostname: string, requestHostname: string): boolean =>
  hostname === requestHostname
  || hostname === 'spicebushmontessori.org'
  || (hostname.endsWith('.netlify.app') && hostname.includes('spicebush'));

const resolveSourceUrl = (rawSrc: string, requestUrl: URL): URL | null => {
  if (!rawSrc) return null;
  const src = rawSrc.trim();
  if (!src) return null;

  if (src.startsWith('/')) {
    const allowed = ALLOWED_RELATIVE_PREFIXES.some((prefix) => src.startsWith(prefix));
    if (!allowed) {
      return null;
    }
    if (src.startsWith('/api/media/render')) {
      return null;
    }
    return new URL(src, requestUrl.origin);
  }

  try {
    const absolute = new URL(src);
    if (absolute.protocol !== 'https:') {
      return null;
    }
    if (!isAllowedAbsoluteHost(absolute.hostname, requestUrl.hostname)) {
      return null;
    }
    return absolute;
  } catch {
    return null;
  }
};

type OutputFormat = 'webp' | 'jpg' | 'png';

const parseFormat = (value: string | null): OutputFormat => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'jpg' || normalized === 'jpeg') return 'jpg';
  if (normalized === 'png') return 'png';
  return 'webp';
};

const contentTypeForFormat = (format: OutputFormat): string => {
  if (format === 'jpg') return 'image/jpeg';
  if (format === 'png') return 'image/png';
  return 'image/webp';
};

const fetchImage = async (sourceUrl: URL): Promise<{ buffer: Buffer; contentType: string } | null> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(sourceUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpicebushImageRender/1.0'
      }
    });

    if (!response.ok) {
      return null;
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (!contentType.startsWith('image/')) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return null;
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const GET: APIRoute = async ({ request, url }) => {
  const srcParam = url.searchParams.get('src') ?? '';
  const sourceUrl = resolveSourceUrl(srcParam, new URL(request.url));
  if (!sourceUrl) {
    return new Response(JSON.stringify({ error: 'Invalid source image URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const rawCropWidth = clamp(parsePercent(url.searchParams.get('w'), 100), 10, 100);
  const rawCropHeight = clamp(parsePercent(url.searchParams.get('h'), 100), 10, 100);
  const cropX = clamp(parsePercent(url.searchParams.get('x'), 0), 0, 100 - rawCropWidth);
  const cropY = clamp(parsePercent(url.searchParams.get('y'), 0), 0, 100 - rawCropHeight);

  const outputWidth = parseIntRange(url.searchParams.get('ow'), 120, 2400);
  const outputHeight = parseIntRange(url.searchParams.get('oh'), 120, 2400);
  const quality = parseQuality(url.searchParams.get('q'));
  const format = parseFormat(url.searchParams.get('fm'));

  const image = await fetchImage(sourceUrl);
  if (!image) {
    return new Response(JSON.stringify({ error: 'Source image not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const probe = sharp(image.buffer).rotate();
    const metadata = await probe.metadata();
    const sourceWidth = metadata.width ?? 0;
    const sourceHeight = metadata.height ?? 0;

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid source image dimensions' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const cropWidthPx = Math.max(1, Math.round((rawCropWidth / 100) * sourceWidth));
    const cropHeightPx = Math.max(1, Math.round((rawCropHeight / 100) * sourceHeight));
    const cropXMax = Math.max(0, sourceWidth - cropWidthPx);
    const cropYMax = Math.max(0, sourceHeight - cropHeightPx);
    const cropXPx = clamp(Math.round((cropX / 100) * sourceWidth), 0, cropXMax);
    const cropYPx = clamp(Math.round((cropY / 100) * sourceHeight), 0, cropYMax);

    let pipeline = sharp(image.buffer)
      .rotate()
      .extract({
        left: cropXPx,
        top: cropYPx,
        width: cropWidthPx,
        height: cropHeightPx
      });

    if (outputWidth || outputHeight) {
      pipeline = pipeline.resize({
        width: outputWidth ?? undefined,
        height: outputHeight ?? undefined,
        fit: 'cover',
        withoutEnlargement: true
      });
    }

    if (format === 'jpg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
    } else if (format === 'png') {
      pipeline = pipeline.png({
        compressionLevel: 9
      });
    } else {
      pipeline = pipeline.webp({ quality });
    }

    const output = await pipeline.toBuffer();
    const headers = new Headers();
    headers.set('Content-Type', contentTypeForFormat(format));
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');

    // Expose effective parameters to simplify field debugging in QA.
    headers.set(
      'X-SB-Render-Crop',
      `${cropX.toFixed(1)},${cropY.toFixed(1)},${rawCropWidth.toFixed(1)},${rawCropHeight.toFixed(1)}`
    );
    headers.set('X-SB-Render-Source', `${sourceWidth}x${sourceHeight}`);

    return new Response(new Uint8Array(output), {
      status: 200,
      headers
    });
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to transform image' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
