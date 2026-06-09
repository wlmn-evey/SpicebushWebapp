import type { APIRoute } from 'astro';
import { getPublishedPosts, renderBlogRssXml } from '@lib/blog-content';
import { resolveSiteOrigin } from '@lib/site-origin';

// Static route — takes precedence over the dynamic `/blog/[slug]` for the exact path `/blog/rss.xml`.
export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublishedPosts();
  const body = renderBlogRssXml(posts, resolveSiteOrigin(site));
  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
};
