import type { APIRoute } from 'astro';
import { checkAdminAuth } from '@lib/admin-auth-check';
import { db } from '@lib/db';
import { query } from '@lib/db/client';
import {
  SEO_GLOBAL_KEY,
  SEO_PAGE_OVERRIDES_KEY,
  isEmptyPageOverride,
  normalizeSeoPagePath,
  parseSeoGlobalSettings,
  parseSeoPageOverrides,
  type SeoPageOverride
} from '@lib/seo-config';

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

const parseDisallowPaths = (value: unknown): string[] => {
  const text = asString(value);
  if (!text) return [];

  const normalized = text
    .split(/[,\n]/)
    .map(line => normalizeSeoPagePath(line))
    .filter((line): line is string => Boolean(line));

  return Array.from(new Set(normalized));
};

const sanitizePageOverride = (
  path: string,
  candidate: Partial<SeoPageOverride>
): SeoPageOverride => ({
  path,
  title: asString(candidate.title),
  description: asString(candidate.description),
  keywords: asString(candidate.keywords),
  canonicalUrl: asString(candidate.canonicalUrl),
  ogImageUrl: asString(candidate.ogImageUrl),
  noIndex: asBoolean(candidate.noIndex)
});

const upsertSetting = async (key: string, value: unknown) => {
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
};

const withSavedQuery = (redirectTo: string, savedKey: string) => {
  const separator = redirectTo.includes('?') ? '&' : '?';
  return `${redirectTo}${separator}saved=${encodeURIComponent(savedKey)}`;
};

const withErrorQuery = (redirectTo: string, errorCode: string) => {
  const separator = redirectTo.includes('?') ? '&' : '?';
  return `${redirectTo}${separator}error=${encodeURIComponent(errorCode)}`;
};

const ensurePublicPagePath = (path: string): boolean =>
  !path.startsWith('/admin') && !path.startsWith('/api');

export const GET: APIRoute = async ({ locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  try {
    const [rawGlobal, rawPageOverrides] = await Promise.all([
      db.content.getSetting(SEO_GLOBAL_KEY),
      db.content.getSetting(SEO_PAGE_OVERRIDES_KEY)
    ]);

    return jsonResponse({
      global: parseSeoGlobalSettings(rawGlobal),
      pageOverrides: parseSeoPageOverrides(rawPageOverrides)
    });
  } catch {
    return jsonResponse({ error: 'Failed to load SEO config' }, 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const { isAuthenticated, isAdmin } = await checkAdminAuth({ locals });
  if (!isAuthenticated || !isAdmin) {
    return jsonResponse({ error: 'Admin access required' }, 403);
  }

  try {
    const formData = await request.formData();
    const action = asString(formData.get('action'));
    const redirectTo = parseRedirectPath(formData.get('redirectTo'));

    if (action === 'save-global') {
      const previous = parseSeoGlobalSettings(await db.content.getSetting(SEO_GLOBAL_KEY));
      const global = {
        ...previous,
        defaultTitle: asString(formData.get('defaultTitle')) || previous.defaultTitle,
        titleSuffix: asString(formData.get('titleSuffix')),
        defaultDescription:
          asString(formData.get('defaultDescription')) || previous.defaultDescription,
        defaultKeywords: asString(formData.get('defaultKeywords')) || previous.defaultKeywords,
        ogImageUrl: asString(formData.get('ogImageUrl')) || previous.ogImageUrl,
        twitterCard:
          asString(formData.get('twitterCard')) === 'summary' ? 'summary' : 'summary_large_image',
        siteNoIndex: asBoolean(formData.get('siteNoIndex')),
        robotsDisallowPaths: parseDisallowPaths(formData.get('robotsDisallowPaths'))
      };

      await upsertSetting(SEO_GLOBAL_KEY, global);
      db.cache.invalidateSettings();

      if (redirectTo) {
        return new Response(null, {
          status: 303,
          headers: { Location: withSavedQuery(redirectTo, 'seo_global') }
        });
      }

      return jsonResponse({ success: true, saved: 'seo_global' });
    }

    if (action === 'save-page' || action === 'clear-page') {
      const rawPath = asString(formData.get('path'));
      const normalizedPath = normalizeSeoPagePath(rawPath);

      if (!normalizedPath || !ensurePublicPagePath(normalizedPath)) {
        if (redirectTo) {
          return new Response(null, {
            status: 303,
            headers: { Location: withErrorQuery(redirectTo, 'invalid_page_path') }
          });
        }
        return jsonResponse({ error: 'Invalid page path' }, 400);
      }

      const pageOverrides = parseSeoPageOverrides(
        await db.content.getSetting(SEO_PAGE_OVERRIDES_KEY)
      );

      if (action === 'clear-page') {
        delete pageOverrides[normalizedPath];
      } else {
        const nextOverride = sanitizePageOverride(normalizedPath, {
          path: normalizedPath,
          title: asString(formData.get('title')),
          description: asString(formData.get('description')),
          keywords: asString(formData.get('keywords')),
          canonicalUrl: asString(formData.get('canonicalUrl')),
          ogImageUrl: asString(formData.get('ogImageUrl')),
          noIndex: asBoolean(formData.get('noIndex'))
        });

        if (isEmptyPageOverride(nextOverride)) {
          delete pageOverrides[normalizedPath];
        } else {
          pageOverrides[normalizedPath] = nextOverride;
        }
      }

      await upsertSetting(SEO_PAGE_OVERRIDES_KEY, pageOverrides);
      db.cache.invalidateSettings();

      if (redirectTo) {
        return new Response(null, {
          status: 303,
          headers: { Location: withSavedQuery(redirectTo, `seo_page_${normalizedPath}`) }
        });
      }

      return jsonResponse({ success: true, saved: normalizedPath });
    }

    return jsonResponse({ error: 'Unknown action' }, 400);
  } catch {
    return jsonResponse({ error: 'Failed to update SEO settings' }, 500);
  }
};
