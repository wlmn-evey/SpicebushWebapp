import type { APIRoute } from 'astro';
import { getPublishedPosts, renderBlogSitemapXml } from '@lib/blog-content';
import { resolveSiteOrigin } from '@lib/site-origin';

export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  const body = renderBlogSitemapXml(posts, resolveSiteOrigin(site));
  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=300'
    }
  });
};
