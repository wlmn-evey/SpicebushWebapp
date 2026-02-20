import { db } from '@lib/db';

export const SEO_GLOBAL_KEY = 'seo_global';
export const SEO_PAGE_OVERRIDES_KEY = 'seo_page_overrides';

const FALLBACK_SITE_ORIGIN = 'https://spicebushmontessori.org';
const FALLBACK_DEFAULT_TITLE = 'Spicebush Montessori School';
const FALLBACK_DEFAULT_DESCRIPTION =
  'Spicebush Montessori School provides individualized, inclusive Montessori education for children ages 3-6. Welcoming all learners with accessible tuition and neurodiversity support.';
const FALLBACK_DEFAULT_KEYWORDS =
  'Montessori school, inclusive preschool, neurodiversity education, accessible tuition, early childhood education';
const FALLBACK_OG_IMAGE_PATH = '/SpicebushLogo-03.png';

const MAX_TITLE_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 320;
const MAX_KEYWORDS_LENGTH = 512;

export type TwitterCardType = 'summary' | 'summary_large_image';

export type SeoManagedPage = {
  path: string;
  label: string;
  note?: string;
};

export const SEO_MANAGED_PAGES: SeoManagedPage[] = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
  { path: '/programs', label: 'Programs' },
  { path: '/admissions', label: 'Admissions' },
  { path: '/admissions/tuition-calculator', label: 'Tuition Calculator' },
  { path: '/contact', label: 'Contact' },
  { path: '/our-principles', label: 'Our Principles' },
  { path: '/policies', label: 'Policies' },
  { path: '/privacy-policy', label: 'Privacy Policy' },
  { path: '/non-discrimination-policy', label: 'Non-Discrimination Policy' },
  { path: '/accessibility', label: 'Accessibility' },
  { path: '/resources/faq', label: 'FAQ' },
  { path: '/resources/events', label: 'Events' },
  { path: '/resources/parent-resources', label: 'Parent Resources' },
  {
    path: '/coming-soon',
    label: 'Coming Soon',
    note: 'Usually set to no-index while the site is in coming-soon mode.'
  },
  {
    path: '/camp',
    label: 'Camp',
    note: 'Primary summer camp page; set metadata seasonally when camp mode is active.'
  },
  {
    path: '/camp-coming-soon',
    label: 'Camp Coming Soon',
    note: 'Usually set to no-index while camp mode is inactive.'
  },
  {
    path: '/contact-success',
    label: 'Contact Success',
    note: 'Usually set to no-index because it is a post-submit page.'
  },
  {
    path: '/donate',
    label: 'Donate',
    note: 'Keep indexable only if this page is part of your public acquisition flow.'
  }
];

export type SeoGlobalSettings = {
  defaultTitle: string;
  titleSuffix: string;
  defaultDescription: string;
  defaultKeywords: string;
  ogImageUrl: string;
  twitterCard: TwitterCardType;
  siteNoIndex: boolean;
  robotsDisallowPaths: string[];
};

export type SeoPageOverride = {
  path: string;
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImageUrl: string;
  noIndex: boolean;
};

export type SeoSettings = {
  global: SeoGlobalSettings;
  pageOverrides: Record<string, SeoPageOverride>;
};

export type ResolveSeoMetadataInput = {
  pathname: string;
  title: string;
  description: string;
  keywords: string;
  site?: URL | string;
};

export type ResolvedSeoMetadata = {
  title: string;
  description: string;
  keywords: string;
  canonicalUrl: string;
  ogImageUrl: string;
  twitterCard: TwitterCardType;
  noIndex: boolean;
  robotsContent: string;
};

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const limitLength = (value: string, max: number): string => {
  if (value.length <= max) return value;
  return value.slice(0, max).trim();
};

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'on'].includes(normalized);
  }
  return false;
};

const parseTwitterCard = (value: unknown): TwitterCardType => {
  const normalized = asTrimmedString(value).toLowerCase();
  return normalized === 'summary' ? 'summary' : 'summary_large_image';
};

const normalizePathname = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }

  const [withoutHash] = trimmed.split('#');
  const [withoutQuery] = withoutHash.split('?');
  const collapsed = withoutQuery.replace(/\/{2,}/g, '/');
  if (!collapsed) return '/';
  if (collapsed === '/') return '/';

  return collapsed.endsWith('/') ? collapsed.slice(0, -1) : collapsed;
};

const resolveSiteOrigin = (site?: URL | string): string => {
  if (site instanceof URL) return site.origin;

  if (typeof site === 'string') {
    try {
      return new URL(site).origin;
    } catch {
      // fall through to env/fallback
    }
  }

  if (typeof process !== 'undefined' && typeof process.env.PUBLIC_SITE_URL === 'string') {
    try {
      return new URL(process.env.PUBLIC_SITE_URL).origin;
    } catch {
      // fall through to fallback
    }
  }

  return FALLBACK_SITE_ORIGIN;
};

const toAbsoluteUrl = (value: string, siteOrigin: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return new URL(trimmed).toString();
    }

    if (trimmed.startsWith('/')) {
      return new URL(trimmed, siteOrigin).toString();
    }
  } catch {
    return '';
  }

  return '';
};

const parseRobotsDisallowPaths = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map(entry => asTrimmedString(entry))
      .map(entry => normalizePathname(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\n]/)
      .map(entry => entry.trim())
      .map(entry => normalizePathname(entry))
      .filter((entry): entry is string => Boolean(entry));
  }

  return [];
};

const uniquePaths = (paths: string[]): string[] => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  paths.forEach(path => {
    if (!seen.has(path)) {
      seen.add(path);
      ordered.push(path);
    }
  });
  return ordered;
};

const defaultGlobal = (siteOrigin: string): SeoGlobalSettings => ({
  defaultTitle: FALLBACK_DEFAULT_TITLE,
  titleSuffix: '',
  defaultDescription: FALLBACK_DEFAULT_DESCRIPTION,
  defaultKeywords: FALLBACK_DEFAULT_KEYWORDS,
  ogImageUrl: toAbsoluteUrl(FALLBACK_OG_IMAGE_PATH, siteOrigin),
  twitterCard: 'summary_large_image',
  siteNoIndex: false,
  robotsDisallowPaths: ['/admin', '/api']
});

export const parseSeoGlobalSettings = (value: unknown, site?: URL | string): SeoGlobalSettings => {
  const siteOrigin = resolveSiteOrigin(site);
  const defaults = defaultGlobal(siteOrigin);

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaults;
  }

  const candidate = value as Record<string, unknown>;
  const defaultTitle =
    limitLength(asTrimmedString(candidate.defaultTitle), MAX_TITLE_LENGTH) || defaults.defaultTitle;
  const titleSuffix = limitLength(asTrimmedString(candidate.titleSuffix), MAX_TITLE_LENGTH);
  const defaultDescription =
    limitLength(asTrimmedString(candidate.defaultDescription), MAX_DESCRIPTION_LENGTH) ||
    defaults.defaultDescription;
  const defaultKeywords =
    limitLength(asTrimmedString(candidate.defaultKeywords), MAX_KEYWORDS_LENGTH) ||
    defaults.defaultKeywords;
  const ogImageCandidate = asTrimmedString(candidate.ogImageUrl);
  const ogImageUrl = toAbsoluteUrl(ogImageCandidate, siteOrigin) || defaults.ogImageUrl;
  const twitterCard = parseTwitterCard(candidate.twitterCard);
  const siteNoIndex = parseBoolean(candidate.siteNoIndex);
  const robotsDisallowPaths = uniquePaths([
    ...defaults.robotsDisallowPaths,
    ...parseRobotsDisallowPaths(candidate.robotsDisallowPaths)
  ]);

  return {
    defaultTitle,
    titleSuffix,
    defaultDescription,
    defaultKeywords,
    ogImageUrl,
    twitterCard,
    siteNoIndex,
    robotsDisallowPaths
  };
};

const normalizePageOverride = (path: string, value: unknown): SeoPageOverride | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const normalizedPath = normalizePathname(path);
  if (!normalizedPath) return null;

  const candidate = value as Record<string, unknown>;

  return {
    path: normalizedPath,
    title: limitLength(asTrimmedString(candidate.title), MAX_TITLE_LENGTH),
    description: limitLength(asTrimmedString(candidate.description), MAX_DESCRIPTION_LENGTH),
    keywords: limitLength(asTrimmedString(candidate.keywords), MAX_KEYWORDS_LENGTH),
    canonicalUrl: asTrimmedString(candidate.canonicalUrl),
    ogImageUrl: asTrimmedString(candidate.ogImageUrl),
    noIndex: parseBoolean(candidate.noIndex)
  };
};

export const isEmptyPageOverride = (override: SeoPageOverride): boolean =>
  !override.title &&
  !override.description &&
  !override.keywords &&
  !override.canonicalUrl &&
  !override.ogImageUrl &&
  !override.noIndex;

export const parseSeoPageOverrides = (value: unknown): Record<string, SeoPageOverride> => {
  const parsed: Record<string, SeoPageOverride> = {};

  if (!value || typeof value !== 'object') {
    return parsed;
  }

  if (Array.isArray(value)) {
    value.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const candidate = entry as Record<string, unknown>;
      const path = asTrimmedString(candidate.path);
      const normalized = normalizePageOverride(path, candidate);
      if (normalized && !isEmptyPageOverride(normalized)) {
        parsed[normalized.path] = normalized;
      }
    });

    return parsed;
  }

  Object.entries(value as Record<string, unknown>).forEach(([path, entry]) => {
    const normalized = normalizePageOverride(path, entry);
    if (normalized && !isEmptyPageOverride(normalized)) {
      parsed[normalized.path] = normalized;
    }
  });

  return parsed;
};

const applyTitleSuffix = (title: string, suffix: string): string => {
  const cleanTitle = title.trim();
  const cleanSuffix = suffix.trim();

  if (!cleanSuffix) return cleanTitle;

  const titleLower = cleanTitle.toLowerCase();
  const suffixLower = cleanSuffix.toLowerCase();
  if (titleLower.endsWith(suffixLower)) return cleanTitle;

  return `${cleanTitle} | ${cleanSuffix}`;
};

const pickFirstNonEmpty = (...values: string[]): string => {
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return '';
};

const normalizeResolvedPath = (pathname: string): string => normalizePathname(pathname) ?? '/';

export const getSeoSettings = async (site?: URL | string): Promise<SeoSettings> => {
  const [rawGlobal, rawPageOverrides] = await Promise.all([
    db.content.getSetting(SEO_GLOBAL_KEY),
    db.content.getSetting(SEO_PAGE_OVERRIDES_KEY)
  ]);

  return {
    global: parseSeoGlobalSettings(rawGlobal, site),
    pageOverrides: parseSeoPageOverrides(rawPageOverrides)
  };
};

export const resolveSeoMetadata = async ({
  pathname,
  title,
  description,
  keywords,
  site
}: ResolveSeoMetadataInput): Promise<ResolvedSeoMetadata> => {
  const siteOrigin = resolveSiteOrigin(site);
  const seoSettings = await getSeoSettings(siteOrigin);
  const normalizedPath = normalizeResolvedPath(pathname);

  const override = seoSettings.pageOverrides[normalizedPath];
  const resolvedTitle = applyTitleSuffix(
    pickFirstNonEmpty(override?.title ?? '', title, seoSettings.global.defaultTitle),
    seoSettings.global.titleSuffix
  );

  const resolvedDescription = pickFirstNonEmpty(
    override?.description ?? '',
    description,
    seoSettings.global.defaultDescription
  );

  const resolvedKeywords = pickFirstNonEmpty(
    override?.keywords ?? '',
    keywords,
    seoSettings.global.defaultKeywords
  );

  const canonicalUrl =
    toAbsoluteUrl(override?.canonicalUrl ?? '', siteOrigin) ||
    new URL(normalizedPath, siteOrigin).toString();

  const ogImageUrl =
    toAbsoluteUrl(override?.ogImageUrl ?? '', siteOrigin) ||
    seoSettings.global.ogImageUrl ||
    toAbsoluteUrl(FALLBACK_OG_IMAGE_PATH, siteOrigin);

  const noIndex = seoSettings.global.siteNoIndex || Boolean(override?.noIndex);

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: resolvedKeywords,
    canonicalUrl,
    ogImageUrl,
    twitterCard: seoSettings.global.twitterCard,
    noIndex,
    robotsContent: noIndex ? 'noindex, nofollow' : 'index, follow'
  };
};

export const normalizeSeoPagePath = (value: string): string | null => normalizePathname(value);
