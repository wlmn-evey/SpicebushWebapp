import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettingMock } = vi.hoisted(() => ({
  getSettingMock: vi.fn()
}));

vi.mock('@lib/db', () => ({
  db: {
    content: {
      getSetting: getSettingMock
    }
  }
}));

import {
  SEO_GLOBAL_KEY,
  SEO_PAGE_OVERRIDES_KEY,
  isEmptyPageOverride,
  normalizeSeoPagePath,
  parseSeoGlobalSettings,
  parseSeoPageOverrides,
  resolveSeoMetadata
} from './seo-config';

describe('seo config helpers', () => {
  beforeEach(() => {
    getSettingMock.mockReset();
  });

  it('parses and normalizes global SEO settings', () => {
    const parsed = parseSeoGlobalSettings(
      {
        defaultTitle: 'Spicebush Montessori',
        titleSuffix: 'School',
        defaultDescription: 'Montessori in Glen Mills',
        defaultKeywords: 'montessori, glen mills',
        ogImageUrl: '/images/hero.png',
        twitterCard: 'summary',
        siteNoIndex: true,
        robotsDisallowPaths: ['/admin', '/private-page']
      },
      'https://spicebushmontessori.org'
    );

    expect(parsed.defaultTitle).toBe('Spicebush Montessori');
    expect(parsed.twitterCard).toBe('summary');
    expect(parsed.siteNoIndex).toBe(true);
    expect(parsed.ogImageUrl).toBe('https://spicebushmontessori.org/images/hero.png');
    expect(parsed.robotsDisallowPaths).toContain('/private-page');
  });

  it('parses page overrides from object map and drops empty values', () => {
    const parsed = parseSeoPageOverrides({
      '/contact/': {
        title: 'Contact Us',
        description: 'Talk to the team',
        noIndex: false
      },
      '/about': {
        title: '',
        description: '',
        keywords: '',
        canonicalUrl: '',
        ogImageUrl: '',
        noIndex: false
      }
    });

    expect(parsed['/contact']).toBeDefined();
    expect(parsed['/contact']?.path).toBe('/contact');
    expect(parsed['/about']).toBeUndefined();
  });

  it('normalizes route paths for SEO controls', () => {
    expect(normalizeSeoPagePath('/contact/')).toBe('/contact');
    expect(normalizeSeoPagePath('/')).toBe('/');
    expect(normalizeSeoPagePath('contact')).toBeNull();
    expect(normalizeSeoPagePath('//contact')).toBeNull();
  });

  it('detects empty page overrides correctly', () => {
    expect(
      isEmptyPageOverride({
        path: '/contact',
        title: '',
        description: '',
        keywords: '',
        canonicalUrl: '',
        ogImageUrl: '',
        noIndex: false
      })
    ).toBe(true);

    expect(
      isEmptyPageOverride({
        path: '/contact',
        title: 'Contact',
        description: '',
        keywords: '',
        canonicalUrl: '',
        ogImageUrl: '',
        noIndex: false
      })
    ).toBe(false);
  });

  it('resolves metadata with page override and global no-index', async () => {
    getSettingMock.mockImplementation(async (key: string) => {
      if (key === SEO_GLOBAL_KEY) {
        return {
          defaultTitle: 'Spicebush Montessori School',
          titleSuffix: 'Spicebush',
          defaultDescription: 'Default description',
          defaultKeywords: 'default, keywords',
          ogImageUrl: '/default-og.png',
          twitterCard: 'summary_large_image',
          siteNoIndex: true,
          robotsDisallowPaths: ['/admin', '/api']
        };
      }

      if (key === SEO_PAGE_OVERRIDES_KEY) {
        return {
          '/contact': {
            title: 'Contact',
            description: 'Reach out to admissions',
            keywords: 'contact, admissions',
            canonicalUrl: '/contact',
            ogImageUrl: '/contact-og.png',
            noIndex: false
          }
        };
      }

      return null;
    });

    const metadata = await resolveSeoMetadata({
      pathname: '/contact',
      title: 'Contact fallback',
      description: 'fallback description',
      keywords: 'fallback keywords',
      site: 'https://spicebushmontessori.org'
    });

    expect(metadata.title).toBe('Contact | Spicebush');
    expect(metadata.description).toBe('Reach out to admissions');
    expect(metadata.keywords).toBe('contact, admissions');
    expect(metadata.canonicalUrl).toBe('https://spicebushmontessori.org/contact');
    expect(metadata.ogImageUrl).toBe('https://spicebushmontessori.org/contact-og.png');
    expect(metadata.noIndex).toBe(true);
    expect(metadata.robotsContent).toBe('noindex, nofollow');
    expect(metadata.googlebotContent).toBe('noindex, nofollow');
  });

  describe('robots three-state (index / soft noindex,follow / hard noindex,nofollow)', () => {
    // A plain, indexable global config (no site-wide kill switch) with no per-page overrides — the
    // realistic shape for blog list / category / tag routes.
    const mockIndexableConfig = () => {
      getSettingMock.mockImplementation(async (key: string) => {
        if (key === SEO_GLOBAL_KEY) {
          return {
            defaultTitle: 'Spicebush Montessori School',
            titleSuffix: 'Spicebush',
            defaultDescription: 'Default description',
            defaultKeywords: 'default, keywords',
            ogImageUrl: '/default-og.png',
            twitterCard: 'summary_large_image',
            siteNoIndex: false,
            robotsDisallowPaths: []
          };
        }
        if (key === SEO_PAGE_OVERRIDES_KEY) return {};
        return null;
      });
    };

    // A per-page DB override that hard-noindexes one path (the other hard source besides siteNoIndex).
    const mockHardOverrideConfig = () => {
      getSettingMock.mockImplementation(async (key: string) => {
        if (key === SEO_GLOBAL_KEY) {
          return {
            defaultTitle: 'Spicebush Montessori School',
            titleSuffix: 'Spicebush',
            defaultDescription: 'Default description',
            defaultKeywords: 'default, keywords',
            ogImageUrl: '/default-og.png',
            twitterCard: 'summary_large_image',
            siteNoIndex: false,
            robotsDisallowPaths: []
          };
        }
        if (key === SEO_PAGE_OVERRIDES_KEY) {
          return { '/blog': { title: 'Blog', noIndex: true } };
        }
        return null;
      });
    };

    // The site-wide kill switch — the other (more catastrophic) hard-noindex source besides a
    // per-page override.
    const mockKillSwitchConfig = () => {
      getSettingMock.mockImplementation(async (key: string) => {
        if (key === SEO_GLOBAL_KEY) {
          return {
            defaultTitle: 'Spicebush Montessori School',
            titleSuffix: 'Spicebush',
            defaultDescription: 'Default description',
            defaultKeywords: 'default, keywords',
            ogImageUrl: '/default-og.png',
            twitterCard: 'summary_large_image',
            siteNoIndex: true,
            robotsDisallowPaths: []
          };
        }
        if (key === SEO_PAGE_OVERRIDES_KEY) return {};
        return null;
      });
    };

    const resolve = (overrides: { pathname?: string; softNoIndex?: boolean } = {}) =>
      resolveSeoMetadata({
        pathname: overrides.pathname ?? '/blog/page/2',
        title: 'List',
        description: 'desc',
        keywords: 'kw',
        site: 'https://spicebushmontessori.org',
        softNoIndex: overrides.softNoIndex
      });

    it('default (no softNoIndex, indexable page) → index,follow and NO googlebot tag', async () => {
      mockIndexableConfig();
      const metadata = await resolve();
      expect(metadata.noIndex).toBe(false);
      expect(metadata.robotsContent).toBe('index, follow');
      expect(metadata.googlebotContent).toBeNull();
    });

    it('softNoIndex on an otherwise-indexable page → soft noindex,follow on BOTH tags', async () => {
      mockIndexableConfig();
      const metadata = await resolve({ softNoIndex: true });
      // `noIndex` reports HARD noindex only, so it stays false for a soft request…
      expect(metadata.noIndex).toBe(false);
      // …but the rendered robots/googlebot both carry the crawl-but-don't-index directive.
      expect(metadata.robotsContent).toBe('noindex, follow');
      expect(metadata.googlebotContent).toBe('noindex, follow');
    });

    it('INVERSE: a hard per-page noindex BEATS a soft request — stays noindex,nofollow', async () => {
      mockHardOverrideConfig();
      const metadata = await resolve({ pathname: '/blog', softNoIndex: true });
      expect(metadata.noIndex).toBe(true);
      expect(metadata.robotsContent).toBe('noindex, nofollow');
      expect(metadata.googlebotContent).toBe('noindex, nofollow');
    });

    it('INVERSE: the site-wide kill switch BEATS a soft request — stays noindex,nofollow', async () => {
      mockKillSwitchConfig();
      const metadata = await resolve({ softNoIndex: true });
      expect(metadata.noIndex).toBe(true);
      expect(metadata.robotsContent).toBe('noindex, nofollow');
      expect(metadata.googlebotContent).toBe('noindex, nofollow');
    });

    it('googlebotContent can never disagree with robotsContent', async () => {
      mockIndexableConfig();
      for (const softNoIndex of [undefined, true]) {
        const metadata = await resolve({ softNoIndex });
        if (metadata.robotsContent.startsWith('noindex')) {
          expect(metadata.googlebotContent).toBe(metadata.robotsContent);
        } else {
          expect(metadata.googlebotContent).toBeNull();
        }
      }
    });
  });
});
