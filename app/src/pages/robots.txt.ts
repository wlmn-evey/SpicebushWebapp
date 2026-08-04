import type { APIRoute } from 'astro';
import { getSeoSettings } from '@lib/seo-config';
import { isProductionHostname, resolveSiteOrigin } from '@lib/site-origin';

export const prerender = false;

export const GET: APIRoute = async ({ site, url }) => {
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

  // Only the canonical domain advertises sitemaps. Non-production hosts (deploy previews,
  // branch deploys) stay crawlable on purpose: middleware stamps them with
  // X-Robots-Tag noindex, and Googlebot can only see that header on URLs it may crawl (#127).
  if (isProductionHostname(url.hostname)) {
    lines.push(`Sitemap: ${new URL('/sitemap-index.xml', siteOrigin).toString()}`);
    lines.push(`Sitemap: ${new URL('/sitemap-blog.xml', siteOrigin).toString()}`);
  }

  return new Response(`${lines.join('\n')}\n`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
};
