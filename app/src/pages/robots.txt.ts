import type { APIRoute } from 'astro';
import { getSeoSettings } from '@lib/seo-config';

export const prerender = false;

const resolveSiteOrigin = (site?: URL): string => {
  if (site?.origin) return site.origin;

  if (typeof process !== 'undefined' && typeof process.env.PUBLIC_SITE_URL === 'string') {
    try {
      return new URL(process.env.PUBLIC_SITE_URL).origin;
    } catch {
      // fall through to fallback
    }
  }

  return 'https://spicebushmontessori.org';
};

export const GET: APIRoute = async ({ site }) => {
  const siteOrigin = resolveSiteOrigin(site);
  const seoSettings = await getSeoSettings(siteOrigin);

  const lines: string[] = ['User-agent: *'];

  if (seoSettings.global.siteNoIndex) {
    lines.push('Disallow: /');
  } else {
    lines.push('Allow: /');

    const disallowPaths = Array.from(new Set(seoSettings.global.robotsDisallowPaths));
    disallowPaths.forEach(path => {
      lines.push(`Disallow: ${path}`);
    });
  }

  lines.push(`Sitemap: ${new URL('/sitemap-index.xml', siteOrigin).toString()}`);

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
};
