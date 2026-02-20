import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { query } from '@lib/db/client';
import {
  SEO_MANAGED_PAGES,
  SEO_PAGE_OVERRIDES_KEY,
  isEmptyPageOverride,
  normalizeSeoPagePath,
  parseSeoPageOverrides,
  type SeoPageOverride
} from '@lib/seo-config';
import { logServerError } from '@lib/server-logger';

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

type PageSignals = {
  title: string;
  metaDescription: string;
  headings: string[];
  textSnippet: string;
};

type SuggestedSeoFields = {
  title: string;
  description: string;
  keywords: string;
  noIndex: boolean;
  canonicalUrl: string;
};

const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = 24000;
const MAX_HTML_ANALYSIS_CHARS = 9000;
const MAX_TEXT_SNIPPET_CHARS = 3500;

const asString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const asBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  }
  return false;
};

const limitLength = (value: string, max: number): string => {
  if (value.length <= max) return value;
  return value.slice(0, max).trim();
};

const parseRedirectPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  return value;
};

const jsonResponse = (payload: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const getRuntimeEnvValue = (key: string): string => {
  const runtimeEnv = typeof process !== 'undefined' ? process.env : undefined;
  const runtimeValue = runtimeEnv?.[key];
  if (typeof runtimeValue === 'string' && runtimeValue.trim().length > 0) {
    return runtimeValue.trim();
  }

  const meta = import.meta as unknown;
  if (meta && typeof meta === 'object' && 'env' in (meta as Record<string, unknown>)) {
    const candidate = (meta as { env?: unknown }).env;
    if (candidate && typeof candidate === 'object') {
      const importEnv = candidate as Record<string, string | undefined>;
      const importValue = importEnv[key];
      if (typeof importValue === 'string' && importValue.trim().length > 0) {
        return importValue.trim();
      }
    }
  }

  return '';
};

const toRedirectWithQuery = (redirectTo: string, key: string, value: string): string => {
  const separator = redirectTo.includes('?') ? '&' : '?';
  return `${redirectTo}${separator}${key}=${encodeURIComponent(value)}`;
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

const tryParseJsonText = (text: string): Record<string, unknown> | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

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
        return tryParse(trimmed.slice(firstBrace, i + 1));
      }
    }
  }

  return null;
};

const extractFirstMatch = (html: string, regex: RegExp): string => {
  const match = html.match(regex);
  if (!match?.[1]) return '';
  return match[1].trim();
};

const stripTags = (html: string): string => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim();

const extractPageSignals = (html: string): PageSignals => {
  const title = extractFirstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDescription = extractFirstMatch(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/i
  );

  const headingMatches = Array.from(
    html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)
  );
  const headings = headingMatches
    .map((match) => stripTags(match[1] ?? ''))
    .filter(Boolean)
    .slice(0, 8)
    .map((heading) => limitLength(heading, 140));

  const mainMatch = extractFirstMatch(html, /<main[^>]*>([\s\S]*?)<\/main>/i);
  const bodyMatch = extractFirstMatch(html, /<body[^>]*>([\s\S]*?)<\/body>/i);
  const textSource = mainMatch || bodyMatch || html;
  const textSnippet = limitLength(stripTags(textSource), MAX_TEXT_SNIPPET_CHARS);

  return {
    title: limitLength(title, 180),
    metaDescription: limitLength(metaDescription, 320),
    headings,
    textSnippet
  };
};

const fetchPageSignals = async (pagePath: string, requestUrl: URL): Promise<PageSignals> => {
  const targetUrl = new URL(pagePath, requestUrl.origin);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/html',
        'User-Agent': 'SpicebushSeoAssistant/1.0'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Fetch failed with status ${response.status}`);
    }

    const finalPath = normalizeSeoPagePath(new URL(response.url).pathname);
    const normalizedTargetPath = normalizeSeoPagePath(pagePath);
    if (finalPath !== normalizedTargetPath) {
      throw new Error(`Page redirected to ${finalPath ?? 'unknown path'}`);
    }

    const html = await response.text();
    const limitedHtml = limitLength(html, MAX_HTML_ANALYSIS_CHARS);
    return extractPageSignals(limitedHtml);
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseKeywords = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter(Boolean)
      .slice(0, 12);
  }
  if (typeof value === 'string') {
    return value
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  return [];
};

const sanitizeSuggestedFields = (
  path: string,
  siteOrigin: string,
  suggestion: Record<string, unknown>
): SuggestedSeoFields => {
  const title = limitLength(asString(suggestion.title), 160);
  const description = limitLength(asString(suggestion.description), 320);
  const keywordsList = parseKeywords(suggestion.keywords);
  const keywords = limitLength(keywordsList.join(', '), 512);
  const noIndex = asBoolean(suggestion.noIndex);

  const canonicalPathCandidate = normalizeSeoPagePath(asString(suggestion.canonicalPath)) || path;
  const canonicalUrl = canonicalPathCandidate === path
    ? ''
    : new URL(canonicalPathCandidate, siteOrigin).toString();

  return {
    title,
    description,
    keywords,
    noIndex,
    canonicalUrl
  };
};

const buildGeminiPrompt = (
  pagePath: string,
  pageLabel: string,
  signals: PageSignals,
  existingOverride: SeoPageOverride | undefined
): string => [
  'You are an SEO specialist for a Montessori school website.',
  'Analyze the page context and return only JSON.',
  'Return JSON keys: title, description, keywords, noIndex, canonicalPath, rationale.',
  'Rules:',
  '- title: 45-65 chars, clear and local-intent friendly.',
  '- description: 130-160 chars, compelling and specific.',
  '- keywords: array of 5-12 keyword phrases.',
  '- noIndex: true only for utility pages (for example post-submit pages).',
  '- canonicalPath: normally same as input path.',
  '- avoid keyword stuffing and avoid claims not grounded in the page content.',
  `Target path: ${pagePath}`,
  `Page label: ${pageLabel}`,
  `Current override: ${JSON.stringify(existingOverride ?? null)}`,
  `Current title tag: ${signals.title}`,
  `Current meta description: ${signals.metaDescription}`,
  `Headings: ${JSON.stringify(signals.headings)}`,
  `Content snippet: ${signals.textSnippet}`
].join('\n');

const requestGeminiSuggestion = async (
  apiKey: string,
  model: string,
  prompt: string
): Promise<Record<string, unknown>> => {
  const payload = {
    systemInstruction: {
      parts: [
        {
          text: 'Return only a valid JSON object and no markdown.'
        }
      ]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json'
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

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

    const responsePayload = await response.json().catch(() => ({})) as GeminiResponsePayload;
    if (!response.ok) {
      const errorMessage = typeof responsePayload.error?.message === 'string'
        ? responsePayload.error.message
        : `Gemini request failed (${response.status})`;
      throw new Error(errorMessage);
    }

    const responseText = extractGeminiResponseText(responsePayload);
    const parsed = tryParseJsonText(responseText);
    if (!parsed) {
      throw new Error('Gemini response was not valid JSON');
    }

    return parsed;
  } finally {
    clearTimeout(timeoutId);
  }
};

const upsertPageOverrides = async (pageOverrides: Record<string, SeoPageOverride>) => {
  await query(
    `
      INSERT INTO settings (key, value, updated_at)
      VALUES ($1, $2::jsonb, $3)
      ON CONFLICT (key)
      DO UPDATE SET
        value = EXCLUDED.value,
        updated_at = EXCLUDED.updated_at
    `,
    [SEO_PAGE_OVERRIDES_KEY, JSON.stringify(pageOverrides), new Date().toISOString()]
  );
  db.cache.invalidateSettings();
};

const runWithConcurrency = async <T, R>(
  items: T[],
  maxConcurrent: number,
  worker: (item: T) => Promise<R>
): Promise<Array<PromiseSettledResult<R>>> => {
  const results: Array<PromiseSettledResult<R>> = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= items.length) return;

      try {
        const value = await worker(items[currentIndex]);
        results[currentIndex] = { status: 'fulfilled', value };
      } catch (reason) {
        results[currentIndex] = { status: 'rejected', reason };
      }
    }
  };

  const workerCount = Math.max(1, Math.min(maxConcurrent, items.length));
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
};

const applyGeminiForPage = async (
  pagePath: string,
  requestUrl: URL,
  apiKey: string,
  model: string,
  pageOverrides: Record<string, SeoPageOverride>
): Promise<SeoPageOverride> => {
  const managedPage = SEO_MANAGED_PAGES.find((page) => page.path === pagePath);
  if (!managedPage) {
    throw new Error('Page is not in managed SEO list');
  }

  const existingOverride = pageOverrides[pagePath];
  const signals = await fetchPageSignals(pagePath, requestUrl);
  const prompt = buildGeminiPrompt(pagePath, managedPage.label, signals, existingOverride);
  const suggestion = await requestGeminiSuggestion(apiKey, model, prompt);
  const suggestedFields = sanitizeSuggestedFields(pagePath, requestUrl.origin, suggestion);

  const nextOverride: SeoPageOverride = {
    path: pagePath,
    title: suggestedFields.title,
    description: suggestedFields.description,
    keywords: suggestedFields.keywords,
    canonicalUrl: suggestedFields.canonicalUrl,
    ogImageUrl: existingOverride?.ogImageUrl ?? '',
    noIndex: suggestedFields.noIndex
  };

  if (isEmptyPageOverride(nextOverride)) {
    throw new Error('Gemini returned an empty SEO recommendation');
  }

  return nextOverride;
};

export const POST: APIRoute = async ({ request, locals, url }) => {
  const auth = await checkAdminAuth({ locals });
  if (!auth.isAuthenticated || !auth.isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  const geminiApiKey = getRuntimeEnvValue('GEMINI_API_KEY');
  if (!geminiApiKey) {
    return new Response(null, {
      status: 303,
      headers: { Location: '/admin/seo?error=gemini_key_missing' }
    });
  }

  const formData = await request.formData();
  const action = asString(formData.get('action'));
  const redirectTo = parseRedirectPath(formData.get('redirectTo')) || '/admin/seo';
  const model = getRuntimeEnvValue('GEMINI_MODEL') || GEMINI_DEFAULT_MODEL;

  try {
    const pageOverrides = parseSeoPageOverrides(await db.content.getSetting(SEO_PAGE_OVERRIDES_KEY));
    const baseUrl = new URL(url.toString());

    if (action === 'apply-page') {
      const pagePath = normalizeSeoPagePath(asString(formData.get('path')));
      if (!pagePath || !SEO_MANAGED_PAGES.some((page) => page.path === pagePath)) {
        return new Response(null, {
          status: 303,
          headers: { Location: toRedirectWithQuery(redirectTo, 'error', 'invalid_page_path') }
        });
      }

      const nextOverride = await applyGeminiForPage(pagePath, baseUrl, geminiApiKey, model, pageOverrides);
      pageOverrides[pagePath] = nextOverride;
      await upsertPageOverrides(pageOverrides);

      return new Response(null, {
        status: 303,
        headers: {
          Location: toRedirectWithQuery(redirectTo, 'saved', `seo_gemini_page_${pagePath}`)
        }
      });
    }

    if (action === 'apply-all') {
      const sourceOverrides = { ...pageOverrides };
      const settled = await runWithConcurrency(
        SEO_MANAGED_PAGES,
        4,
        async (page): Promise<{ path: string; override: SeoPageOverride }> => {
          const nextOverride = await applyGeminiForPage(
            page.path,
            baseUrl,
            geminiApiKey,
            model,
            sourceOverrides
          );
          return { path: page.path, override: nextOverride };
        }
      );

      let applied = 0;
      let failed = 0;

      settled.forEach((result, index) => {
        const page = SEO_MANAGED_PAGES[index];
        if (result.status === 'fulfilled') {
          pageOverrides[result.value.path] = result.value.override;
          applied += 1;
        } else {
          failed += 1;
          logServerError('Gemini SEO recommendation failed for page', result.reason, {
            route: '/api/admin/seo/gemini-suggest',
            pagePath: page.path
          });
        }
      });

      if (applied === 0) {
        return new Response(null, {
          status: 303,
          headers: { Location: toRedirectWithQuery(redirectTo, 'error', 'gemini_all_failed') }
        });
      }

      await upsertPageOverrides(pageOverrides);

      const withSaved = toRedirectWithQuery(redirectTo, 'saved', `seo_gemini_all_${applied}_${failed}`);
      if (failed > 0) {
        return new Response(null, {
          status: 303,
          headers: { Location: toRedirectWithQuery(withSaved, 'error', 'gemini_partial_failure') }
        });
      }

      return new Response(null, {
        status: 303,
        headers: { Location: withSaved }
      });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch (error) {
    logServerError('Gemini SEO recommendation request failed', error, {
      route: '/api/admin/seo/gemini-suggest'
    });

    return new Response(null, {
      status: 303,
      headers: { Location: toRedirectWithQuery(redirectTo, 'error', 'gemini_request_failed') }
    });
  }
};
