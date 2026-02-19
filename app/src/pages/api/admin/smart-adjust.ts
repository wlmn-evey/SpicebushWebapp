import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { getPhotoFramingDefaults } from '@lib/photo-framing-defaults';
import {
  createHeuristicSmartAdjustSuggestion,
  normalizePlacementSuggestion,
  sanitizeSmartAdjustContext,
  type PlacementSuggestion,
  type SmartAdjustContext
} from '@lib/smart-adjust';
import { logServerError } from '@lib/server-logger';

type SmartAdjustRequestBody = {
  slotId?: unknown;
  photoSlug?: unknown;
  pagePath?: unknown;
  context?: unknown;
};

type OpenAiResponsePayload = {
  output_text?: unknown;
  output?: unknown;
  error?: {
    message?: unknown;
  };
};

type GeminiResponsePayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: unknown;
      }>;
    };
  }>;
  error?: {
    message?: unknown;
  };
};

type SmartAdjustProvider = 'gemini' | 'openai' | 'heuristic';

const EMERGENCY_FALLBACK_SUGGESTION: PlacementSuggestion = {
  desktopFocalX: 50,
  desktopFocalY: 50,
  mobileCropX: 0,
  mobileCropY: 0,
  mobileCropWidth: 100,
  mobileCropHeight: 100,
  tabletCropX: 0,
  tabletCropY: 0,
  tabletCropWidth: 100,
  tabletCropHeight: 100
};

const jsonResponse = (payload: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

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

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const roundTenth = (value: number): number => Math.round(value * 10) / 10;

const withContextDimensionFallbacks = (
  context: SmartAdjustContext,
  fallbackNaturalSize: { width: number; height: number }
): SmartAdjustContext => {
  const image = { ...context.image };

  if (image.naturalWidth <= 0) {
    image.naturalWidth = Math.max(1, Math.round(fallbackNaturalSize.width));
  }

  if (image.naturalHeight <= 0) {
    image.naturalHeight = Math.max(1, Math.round(fallbackNaturalSize.height));
  }

  if (image.renderedWidth <= 0 || image.renderedHeight <= 0) {
    const viewportWidth = Math.max(320, context.viewport.width || 0);
    const inferredRatio = viewportWidth >= 1024 ? 1.5 : viewportWidth >= 768 ? 1.4 : 4 / 3;
    const inferredWidth = Math.max(280, Math.min(viewportWidth, 980));
    const inferredHeight = Math.max(180, Math.round(inferredWidth / inferredRatio));

    if (image.renderedWidth <= 0) {
      image.renderedWidth = inferredWidth;
    }
    if (image.renderedHeight <= 0) {
      image.renderedHeight = inferredHeight;
    }
  }

  return {
    ...context,
    image
  };
};

const getSuggestionDelta = (
  baseSuggestion: PlacementSuggestion,
  nextSuggestion: PlacementSuggestion
): { focusShift: number; cropShift: number } => {
  const focusShift = roundTenth(
    Math.hypot(
      nextSuggestion.desktopFocalX - baseSuggestion.desktopFocalX,
      nextSuggestion.desktopFocalY - baseSuggestion.desktopFocalY
    )
  );

  const cropShift = roundTenth(
    Math.max(
      Math.abs(nextSuggestion.mobileCropX - baseSuggestion.mobileCropX),
      Math.abs(nextSuggestion.mobileCropY - baseSuggestion.mobileCropY),
      Math.abs(nextSuggestion.mobileCropWidth - baseSuggestion.mobileCropWidth),
      Math.abs(nextSuggestion.mobileCropHeight - baseSuggestion.mobileCropHeight),
      Math.abs(nextSuggestion.tabletCropX - baseSuggestion.tabletCropX),
      Math.abs(nextSuggestion.tabletCropY - baseSuggestion.tabletCropY),
      Math.abs(nextSuggestion.tabletCropWidth - baseSuggestion.tabletCropWidth),
      Math.abs(nextSuggestion.tabletCropHeight - baseSuggestion.tabletCropHeight)
    )
  );

  return { focusShift, cropShift };
};

const isSuggestionEffectivelyUnchanged = (
  baseSuggestion: PlacementSuggestion,
  nextSuggestion: PlacementSuggestion
): boolean => {
  const delta = getSuggestionDelta(baseSuggestion, nextSuggestion);
  return delta.focusShift < 2.5 && delta.cropShift < 2.5;
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

const parseRequestBody = async (request: Request): Promise<SmartAdjustRequestBody | null> => {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return null;
    }
    return payload as SmartAdjustRequestBody;
  } catch {
    return null;
  }
};

const resolvePhotoImageUrl = (
  photoData: Record<string, unknown>,
  photoSlug: string,
  requestUrl: URL
): string | null => {
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
): Promise<{ buffer: Buffer; mimeType: string | null } | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SpicebushSmartAdjust/1.0'
      }
    });

    if (!response.ok) {
      return null;
    }

    const contentTypeHeader = response.headers.get('content-type');
    const mimeType = contentTypeHeader
      ? contentTypeHeader.split(';')[0]?.trim().toLowerCase() ?? null
      : null;

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return null;
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      mimeType
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const buildBaseSuggestion = (
  photoData: Record<string, unknown>,
  slotOverrides: Record<string, unknown>,
  defaults: ReturnType<typeof getPhotoFramingDefaults>
): PlacementSuggestion => {
  const primaryFocalX = toNumber(photoData.primaryFocalX, defaults.primaryFocalX);
  const primaryFocalY = toNumber(photoData.primaryFocalY, defaults.primaryFocalY);

  return normalizePlacementSuggestion(
    {
      desktopFocalX: slotOverrides.desktopFocalX ?? photoData.desktopFocalX ?? primaryFocalX,
      desktopFocalY: slotOverrides.desktopFocalY ?? photoData.desktopFocalY ?? primaryFocalY,
      mobileCropX: slotOverrides.mobileCropX ?? photoData.mobileCropX ?? defaults.mobileCropX,
      mobileCropY: slotOverrides.mobileCropY ?? photoData.mobileCropY ?? defaults.mobileCropY,
      mobileCropWidth: slotOverrides.mobileCropWidth ?? photoData.mobileCropWidth ?? defaults.mobileCropWidth,
      mobileCropHeight: slotOverrides.mobileCropHeight ?? photoData.mobileCropHeight ?? defaults.mobileCropHeight,
      tabletCropX: slotOverrides.tabletCropX ?? photoData.tabletCropX ?? defaults.tabletCropX,
      tabletCropY: slotOverrides.tabletCropY ?? photoData.tabletCropY ?? defaults.tabletCropY,
      tabletCropWidth: slotOverrides.tabletCropWidth ?? photoData.tabletCropWidth ?? defaults.tabletCropWidth,
      tabletCropHeight: slotOverrides.tabletCropHeight ?? photoData.tabletCropHeight ?? defaults.tabletCropHeight
    },
    {
      desktopFocalX: defaults.primaryFocalX,
      desktopFocalY: defaults.primaryFocalY,
      mobileCropX: defaults.mobileCropX,
      mobileCropY: defaults.mobileCropY,
      mobileCropWidth: defaults.mobileCropWidth,
      mobileCropHeight: defaults.mobileCropHeight,
      tabletCropX: defaults.tabletCropX,
      tabletCropY: defaults.tabletCropY,
      tabletCropWidth: defaults.tabletCropWidth,
      tabletCropHeight: defaults.tabletCropHeight
    }
  );
};

const getRuntimeEnvValue = (key: string): string => {
  const runtimeEnv = (typeof process !== 'undefined' && process.env) ? process.env : undefined;
  const value = runtimeEnv?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

const extractOpenAiResponseText = (payload: OpenAiResponsePayload): string => {
  if (typeof payload.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text.trim();
  }

  if (!Array.isArray(payload.output)) {
    return '';
  }

  const textSegments: string[] = [];

  payload.output.forEach((item) => {
    const outputItem = asRecord(item);
    const content = outputItem.content;
    if (!Array.isArray(content)) return;

    content.forEach((contentPart) => {
      const part = asRecord(contentPart);
      const text = part.text;
      if (typeof text === 'string' && text.trim().length > 0) {
        textSegments.push(text.trim());
      }
    });
  });

  return textSegments.join('\n').trim();
};

const extractGeminiResponseText = (payload: GeminiResponsePayload): string => {
  if (!Array.isArray(payload.candidates)) {
    return '';
  }

  const textSegments: string[] = [];

  payload.candidates.forEach((candidate) => {
    const parts = candidate.content?.parts;
    if (!Array.isArray(parts)) return;

    parts.forEach((part) => {
      if (typeof part?.text === 'string' && part.text.trim().length > 0) {
        textSegments.push(part.text.trim());
      }
    });
  });

  return textSegments.join('\n').trim();
};

const buildSmartAdjustPrompt = (
  baseSuggestion: PlacementSuggestion,
  context: SmartAdjustContext
): string => [
  'Return JSON with keys:',
  'desktopFocalX, desktopFocalY, mobileCropX, mobileCropY, mobileCropWidth, mobileCropHeight, tabletCropX, tabletCropY, tabletCropWidth, tabletCropHeight.',
  'Rules:',
  '- coordinates are percentages from 0 to 100.',
  '- crop width/height must be 10 to 100.',
  '- crop x <= (100 - crop width), crop y <= (100 - crop height).',
  '- prioritize the true subject of the image and avoid empty background areas.',
  '- avoid overlap regions where text/buttons cover the image.',
  '- preserve composition close to current placement unless that causes empty-space framing or overlap.',
  `Current placement: ${JSON.stringify(baseSuggestion)}`,
  `Context: ${JSON.stringify(context)}`
].join('\n');

const tryParseJsonText = (text: string): Record<string, unknown> | null => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;

  const tryParse = (candidate: string): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) return direct;

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  if (fencedMatch?.[1]) {
    const fenced = tryParse(fencedMatch[1]);
    if (fenced) return fenced;
  }

  const firstBrace = trimmed.indexOf('{');
  if (firstBrace < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < trimmed.length; i += 1) {
    const char = trimmed[i];

    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (char === '\\') {
        escaped = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const candidate = trimmed.slice(firstBrace, i + 1);
        const parsed = tryParse(candidate);
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return null;
};

const requestOpenAiSuggestion = async (
  apiKey: string,
  model: string,
  baseSuggestion: PlacementSuggestion,
  context: SmartAdjustContext,
  imageUrl: string | null
): Promise<PlacementSuggestion> => {
  const promptText = buildSmartAdjustPrompt(baseSuggestion, context);
  const userContent: Array<{ type: 'input_text' | 'input_image'; text?: string; image_url?: string }> = [
    {
      type: 'input_text',
      text: promptText
    }
  ];

  if (imageUrl) {
    userContent.push({
      type: 'input_image',
      image_url: imageUrl
    });
  }

  const requestPayload = {
    model,
    temperature: 0.2,
    input: [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'You generate image placement values for a website CMS. Return only a JSON object with numeric values. Do not include prose.'
          }
        ]
      },
      {
        role: 'user',
        content: userContent
      }
    ]
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => ({})) as OpenAiResponsePayload;

    if (!response.ok) {
      const errorMessage = typeof payload.error?.message === 'string'
        ? payload.error.message
        : 'Smart Adjust AI request failed';
      throw new Error(errorMessage);
    }

    const responseText = extractOpenAiResponseText(payload);
    const parsed = tryParseJsonText(responseText);
    if (!parsed) {
      throw new Error('Smart Adjust AI response was not valid JSON');
    }

    return normalizePlacementSuggestion(parsed, baseSuggestion);
  } finally {
    clearTimeout(timeoutId);
  }
};

const requestGeminiSuggestion = async (
  apiKey: string,
  model: string,
  baseSuggestion: PlacementSuggestion,
  context: SmartAdjustContext,
  imageData: { buffer: Buffer; mimeType: string | null } | null
): Promise<PlacementSuggestion> => {
  const MAX_INLINE_IMAGE_BYTES = 2_000_000;
  const promptText = buildSmartAdjustPrompt(baseSuggestion, context);
  const imagePart = (
    imageData?.buffer
    && imageData.buffer.length > 0
    && imageData.buffer.length <= MAX_INLINE_IMAGE_BYTES
  ) ? {
      inlineData: {
        mimeType: imageData.mimeType || 'image/jpeg',
        data: imageData.buffer.toString('base64')
      }
    } : null;

  const timeoutMs = (() => {
    const raw = getRuntimeEnvValue('SMART_ADJUST_GEMINI_TIMEOUT_MS');
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 8000 && parsed <= 55000) {
      return parsed;
    }
    return 24000;
  })();

  const fallbackModel = getRuntimeEnvValue('GEMINI_FALLBACK_MODEL') || 'gemini-2.0-flash';
  const isAbortError = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return message.includes('aborted') || message.includes('timeout') || message.includes('timed out');
  };

  const runGemini = async (
    targetModel: string,
    includeImage: boolean,
    requestTimeoutMs: number
  ): Promise<PlacementSuggestion> => {
    const parts: Array<Record<string, unknown>> = [
      {
        text: promptText
      }
    ];
    if (includeImage && imagePart) {
      parts.push(imagePart);
    }

    const payload = {
      systemInstruction: {
        parts: [
          {
            text: 'You generate image placement values for a website CMS. Return only a JSON object with numeric values.'
          }
        ]
      },
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent`,
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

      const responsePayload = await response.json().catch(() => ({})) as GeminiResponsePayload;
      if (!response.ok) {
        const errorMessage = typeof responsePayload.error?.message === 'string'
          ? responsePayload.error.message
          : `Smart Adjust Gemini request failed (${response.status})`;
        throw new Error(errorMessage);
      }

      const responseText = extractGeminiResponseText(responsePayload);
      const parsed = tryParseJsonText(responseText);
      if (!parsed) {
        throw new Error('Smart Adjust Gemini response was not valid JSON');
      }

      return normalizePlacementSuggestion(parsed, baseSuggestion);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  try {
    return await runGemini(model, true, timeoutMs);
  } catch (firstError) {
    if (!isAbortError(firstError)) {
      throw firstError;
    }

    try {
      return await runGemini(model, false, Math.max(10000, Math.round(timeoutMs * 0.75)));
    } catch (secondError) {
      if (!isAbortError(secondError) || fallbackModel === model) {
        throw secondError;
      }
      return runGemini(fallbackModel, false, Math.max(10000, Math.round(timeoutMs * 0.7)));
    }
  }
};

const resolveSmartAdjustProvider = (
  requestedRaw: string,
  hasGeminiKey: boolean,
  hasOpenAiKey: boolean
): SmartAdjustProvider => {
  const requested = requestedRaw.trim().toLowerCase();
  if (requested === 'gemini') return hasGeminiKey ? 'gemini' : 'heuristic';
  if (requested === 'openai') return hasOpenAiKey ? 'openai' : 'heuristic';
  if (requested === 'heuristic') return 'heuristic';

  if (hasGeminiKey) return 'gemini';
  if (hasOpenAiKey) return 'openai';
  return 'heuristic';
};

const enforcePortraitLandscapeFocus = (
  suggestion: PlacementSuggestion,
  context: SmartAdjustContext
): PlacementSuggestion => {
  const naturalWidth = context.image.naturalWidth;
  const naturalHeight = context.image.naturalHeight;
  const renderedWidth = context.image.renderedWidth;
  const renderedHeight = context.image.renderedHeight;

  if (naturalWidth <= 0 || naturalHeight <= 0 || renderedWidth <= 0 || renderedHeight <= 0) {
    return suggestion;
  }

  // If there are overlap regions, trust the model's placement to avoid covered areas.
  if (context.overlapRegions.length > 0) {
    return suggestion;
  }

  const naturalRatio = naturalWidth / naturalHeight;
  const renderedRatio = renderedWidth / renderedHeight;
  if (naturalRatio >= 0.95 || renderedRatio <= 1.2) {
    return suggestion;
  }

  const portraitSeverity = clamp((1 - naturalRatio) / 0.45, 0, 1);
  const landscapeSeverity = clamp((renderedRatio - 1.2) / 0.8, 0, 1);
  const minDesktopY = clamp(
    68 + (portraitSeverity * 8) + (landscapeSeverity * 8),
    68,
    82
  );

  if (suggestion.desktopFocalY >= minDesktopY) {
    return suggestion;
  }

  const desktopFocalY = roundTenth(minDesktopY);
  const toAdjustedCropY = (height: number): number => {
    const cropHeight = clamp(height, 10, 100);
    return roundTenth(clamp(desktopFocalY - (cropHeight / 2), 0, 100 - cropHeight));
  };

  return {
    ...suggestion,
    desktopFocalY,
    mobileCropY: toAdjustedCropY(suggestion.mobileCropHeight),
    tabletCropY: toAdjustedCropY(suggestion.tabletCropHeight)
  };
};

const formatErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message.trim().length > 0
    ? error.message
    : fallback;

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin || !auth.session) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const body = await parseRequestBody(request);
  if (!body) {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const slotId = normalizeToken(asString(body.slotId));
  const photoSlug = normalizeToken(asString(body.photoSlug));

  if (!slotId || !photoSlug) {
    return jsonResponse({ error: 'slotId and photoSlug are required' }, 400);
  }

  try {
    const photoEntry = await db.content.getEntry('photos', photoSlug);
    if (!photoEntry?.data) {
      return jsonResponse({ error: 'Photo not found' }, 404);
    }

    const photoData = asRecord(photoEntry.data);
    const category = asString(photoData.category, 'gallery');
    const width = Math.max(1, Math.round(toNumber(photoData.originalWidth, 1280)));
    const height = Math.max(1, Math.round(toNumber(photoData.originalHeight, 800)));
    const defaults = getPhotoFramingDefaults({
      category,
      width,
      height,
      slug: photoEntry.slug
    });

    const slotEntry = await db.content.getEntry('media-slots', slotId);
    const slotData = slotEntry?.data ? asRecord(slotEntry.data) : {};

    const baseSuggestion = buildBaseSuggestion(photoData, slotData, defaults);
    const context = withContextDimensionFallbacks(
      sanitizeSmartAdjustContext(body.context),
      { width, height }
    );
    if (typeof body.pagePath === 'string' && body.pagePath.trim().length > 0 && context.pagePath === '/') {
      context.pagePath = body.pagePath.trim().slice(0, 180);
    }

    const imageUrl = resolvePhotoImageUrl(photoData, photoEntry.slug, new URL(request.url));
    const imageData = imageUrl ? await fetchImageBuffer(imageUrl) : null;

    const geminiKey = getRuntimeEnvValue('GEMINI_API_KEY');
    const openAiApiKey = getRuntimeEnvValue('OPENAI_API_KEY');
    const codexApiKey = getRuntimeEnvValue('CODEX_API_KEY');
    // For explicit OpenAI mode, prioritize OPENAI_API_KEY over legacy CODEX_API_KEY.
    const openAiKey = openAiApiKey || codexApiKey;
    const provider = resolveSmartAdjustProvider(
      getRuntimeEnvValue('SMART_ADJUST_PROVIDER') || 'auto',
      geminiKey.length > 0,
      openAiKey.length > 0
    );
    const geminiModel = getRuntimeEnvValue('GEMINI_MODEL') || 'gemini-2.5-flash';
    const openAiModel = getRuntimeEnvValue('SMART_ADJUST_MODEL') || 'gpt-4.1-mini';

    let suggestion: PlacementSuggestion | null = null;
    let source: 'gemini' | 'openai' | 'heuristic' = 'heuristic';
    const warnings: string[] = [];
    const attemptedProviders: string[] = [];

    const tryGemini = async (): Promise<boolean> => {
      if (!geminiKey) {
        warnings.push('Gemini key is not configured.');
        return false;
      }

      attemptedProviders.push('gemini');
      try {
        suggestion = await requestGeminiSuggestion(geminiKey, geminiModel, baseSuggestion, context, imageData);
        source = 'gemini';
        return true;
      } catch (error) {
        const reason = formatErrorMessage(error, 'Gemini suggestion failed');
        warnings.push(`Gemini failed: ${reason}`);
        logServerError('Smart adjust Gemini fallback triggered', error, {
          route: '/api/admin/smart-adjust',
          slotId,
          photoSlug,
          model: geminiModel
        });
        return false;
      }
    };

    const tryOpenAi = async (): Promise<boolean> => {
      if (!openAiKey) {
        warnings.push('OpenAI key is not configured.');
        return false;
      }

      attemptedProviders.push('openai');
      try {
        suggestion = await requestOpenAiSuggestion(openAiKey, openAiModel, baseSuggestion, context, imageUrl);
        source = 'openai';
        return true;
      } catch (error) {
        const reason = formatErrorMessage(error, 'OpenAI suggestion failed');
        warnings.push(`OpenAI failed: ${reason}`);
        logServerError('Smart adjust OpenAI fallback triggered', error, {
          route: '/api/admin/smart-adjust',
          slotId,
          photoSlug,
          model: openAiModel
        });
        return false;
      }
    };

    if (provider === 'gemini') {
      if (!(await tryGemini())) {
        await tryOpenAi();
      }
    } else if (provider === 'openai') {
      if (!(await tryOpenAi())) {
        await tryGemini();
      }
    } else if (provider !== 'heuristic') {
      // Should never happen, but preserve predictable fallback behavior.
      await tryGemini();
      if (!suggestion) {
        await tryOpenAi();
      }
    }

    if (!suggestion) {
      suggestion = createHeuristicSmartAdjustSuggestion(baseSuggestion, context);
      source = 'heuristic';
      warnings.push('Heuristic placement used because AI providers were unavailable or failed.');
    }

    suggestion = enforcePortraitLandscapeFocus(suggestion, context);

    if (source !== 'heuristic' && isSuggestionEffectivelyUnchanged(baseSuggestion, suggestion)) {
      const heuristicRefinement = enforcePortraitLandscapeFocus(
        createHeuristicSmartAdjustSuggestion(baseSuggestion, context),
        context
      );

      if (!isSuggestionEffectivelyUnchanged(baseSuggestion, heuristicRefinement)) {
        suggestion = heuristicRefinement;
        warnings.push(
          'AI placement matched the current framing, so a heuristic refinement was applied to produce a visible adjustment.'
        );
      } else {
        warnings.push('AI placement matched the current framing.');
      }
    }

    const delta = getSuggestionDelta(baseSuggestion, suggestion);

    const responsePayload: Record<string, unknown> = {
      success: true,
      source,
      suggestion,
      changed: delta.focusShift >= 2.5 || delta.cropShift >= 2.5,
      delta,
      attemptedProviders
    };

    if (warnings.length > 0) {
      responsePayload.warning = warnings.join(' ');
    }

    return jsonResponse(responsePayload);
  } catch (error) {
    logServerError('Smart adjust endpoint failed', error, {
      route: '/api/admin/smart-adjust',
      slotId,
      photoSlug
    });

    return jsonResponse({
      success: true,
      source: 'heuristic',
      warning: 'Smart Adjust hit a server error and used emergency fallback placement.',
      suggestion: EMERGENCY_FALLBACK_SUGGESTION
    });
  }
};
