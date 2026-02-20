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
  });
});
