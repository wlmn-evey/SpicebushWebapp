import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSeoSettingsMock } = vi.hoisted(() => ({
  getSeoSettingsMock: vi.fn()
}));

vi.mock('@lib/seo-config', () => ({
  getSeoSettings: getSeoSettingsMock
}));

import { GET } from './robots.txt';

type RobotsContext = Parameters<typeof GET>[0];

const requestRobots = async (requestUrl: string): Promise<string> => {
  const context = {
    site: new URL('https://spicebushmontessori.org'),
    url: new URL(requestUrl)
  } as unknown as RobotsContext;
  const response = await GET(context);
  return response.text();
};

describe('GET /robots.txt', () => {
  beforeEach(() => {
    getSeoSettingsMock.mockReset();
    getSeoSettingsMock.mockResolvedValue({
      global: {
        siteNoIndex: false,
        robotsDisallowPaths: ['/admin', '/api']
      },
      pageOverrides: {}
    });
  });

  it('advertises sitemaps on the production hostname', async () => {
    const body = await requestRobots('https://spicebushmontessori.org/robots.txt');

    expect(body).toContain('Allow: /');
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Sitemap: https://spicebushmontessori.org/sitemap-index.xml');
    expect(body).toContain('Sitemap: https://spicebushmontessori.org/sitemap-blog.xml');
  });

  it('omits sitemaps but keeps crawl rules on non-production hostnames', async () => {
    const body = await requestRobots(
      'https://deploy-preview-7--spicebush-testing.netlify.app/robots.txt'
    );

    // Crawl stays allowed so Googlebot can see the middleware X-Robots-Tag noindex (#127).
    expect(body).toContain('Allow: /');
    expect(body).toContain('Disallow: /admin');
    expect(body).not.toContain('Sitemap:');
  });

  it('serves a full disallow when the site-wide noindex kill switch is on', async () => {
    getSeoSettingsMock.mockResolvedValue({
      global: { siteNoIndex: true, robotsDisallowPaths: ['/admin'] },
      pageOverrides: {}
    });

    const body = await requestRobots('https://spicebushmontessori.org/robots.txt');
    expect(body).toContain('Disallow: /');
    expect(body).not.toContain('Allow: /');
  });
});
