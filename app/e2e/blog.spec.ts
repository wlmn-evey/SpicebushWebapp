/**
 * Blog V1 — public `/blog` + SEO E2E spec (plan §12 tests 18-24, 26, 27).
 *
 * Gate command (PINNED): `npx playwright test e2e/blog.spec.ts --project=chromium`.
 * The repo defines 7 projects with `fullyParallel: true` and no `webServer`; an unpinned
 * run executes the authoring-flow test 7× against the single DB. Pin to chromium AND
 * `test.skip` test 24 for non-chromium projects.
 *
 * ROLLOUT NOTE: clean-slug rows (`nurturing-growth-gardening-program`, …) exist only after
 * migration 015 is applied at rollout, and prod-origin canonical/OG assertions require
 * `PUBLIC_SITE_URL=https://spicebushmontessori.org` in the build env (also a rollout step).
 * Tests 18/19/22/27, the legacy→clean 301 in 20, and 24's clean-slug paths are therefore the
 * ROLLOUT/manual gate — they are written so they compile and run, but go green only post-rollout.
 * DB/origin-independent tests (21, 23, 26, the bad-slug/date-miss branches of 20) pass locally.
 */

import { test, expect } from '@playwright/test';

const PINNED_SLUG = 'nurturing-growth-gardening-program';
const PINNED_LEGACY_SLUG = '2024-05-20-nurturing-growth-gardening-program';
const PINNED_IMAGE = '/images/blog/feature-image-wf-flame-lily-1.webp';

// The AA-passing non-link metadata color is `text-earth-brown/80`. earth-brown = #2E2E2E
// (rgb 46,46,46) per tailwind.config.mjs; the `/80` opacity makes getComputedStyle().color
// compute to exactly `rgba(46, 46, 46, 0.8)` (~6.4:1 on white). A POSITIVE assertion against
// this value catches a regression to a failing token (e.g. text-earth-brown/70 → rgba(...,0.7),
// or text-gray-400 → rgb(156,163,175)), which a denylist-only check would silently pass.
const EARTH_BROWN_80_COLOR = 'rgba(46, 46, 46, 0.8)';

// `.blog-body a` pinned link color: forest-canopy #3E6D51 = rgb(62, 109, 81), 5.98:1 on white.
const PINNED_LINK_COLOR = 'rgb(62, 109, 81)';

/** Resolve the origin asserted in canonical/OG/sitemap `<loc>` strings. */
function resolveExpectedOrigin(): string {
  const base = process.env.E2E_BASE_URL || 'https://spicebush-testing.netlify.app';
  return new URL(base).origin;
}

/** Extract a single meta tag's `content` from an HTML string. */
function metaContent(
  html: string,
  key: string,
  attr: 'name' | 'property' = 'property'
): string | null {
  const re = new RegExp(`<meta[^>]*${attr}=["']${key}["'][^>]*content=["']([^"']*)["']`, 'i');
  const alt = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${key}["']`, 'i');
  const m = html.match(re) ?? html.match(alt);
  return m ? m[1] : null;
}

test.describe('Blog V1 — public routes + SEO', () => {
  // Test 18 — GET /blog
  test('18: GET /blog returns 200 with H1 "Blog" and ≥6 post links (AA metadata contrast)', async ({
    page
  }) => {
    const response = await page.goto('/blog');
    expect(response?.status(), 'GET /blog must be 200 (not redirected to /contact)').toBe(200);
    expect(page.url(), 'must stay on /blog, not land on /contact').toContain('/blog');

    await expect(page.locator('h1')).toHaveText('Blog');

    // Count only post-DETAIL links (R4-F10 lockstep): PR2 added /blog/category/ and /blog/tag/
    // discovery chips that also start with /blog/, so exclude them to keep ">=6 posts" honest.
    const postLinks = page.locator(
      'a[href^="/blog/"]:not([href*="/category/"]):not([href*="/tag/"]):not([href*="/page/"])'
    );
    expect(await postLinks.count(), 'at least 6 published posts').toBeGreaterThanOrEqual(6);
    await expect(
      page.locator(`a[href="/blog/${PINNED_SLUG}"]`),
      'pinned gardening post link present'
    ).toHaveCount(1);

    // PR2 discovery surface: post cards carry category (and tag) chip links so visitors can browse
    // by taxonomy. At least one category chip must render.
    expect(
      await page.locator('a[href^="/blog/category/"]').count(),
      'category discovery chips present'
    ).toBeGreaterThanOrEqual(1);

    // R4-F18 metadata-contrast pin (POSITIVE assertion): the date/byline/excerpt text must compute
    // to text-earth-brown/80 (rgba(46,46,46,0.8), ~6.4:1), NOT a failing token. The byline <p>
    // (parent of <time>) carries the text-earth-brown/80 class.
    const metaText = page.locator('article p:has(time)').first();
    const color = await metaText.evaluate(el => window.getComputedStyle(el).color);
    expect(color, `metadata color must be the AA earth-brown/80 token, got ${color}`).toBe(
      EARTH_BROWN_80_COLOR
    );
  });

  // Test 19 — GET /blog/{clean slug}
  test('19: GET /blog/<clean slug> renders post + full per-post SEO meta', async ({ request }) => {
    const origin = resolveExpectedOrigin();
    const res = await request.get(`/blog/${PINNED_SLUG}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    expect(html, 'post title present').toContain('Gardening Program');
    expect(html.length, 'body content present').toBeGreaterThan(1000);

    const description = metaContent(html, 'description', 'name');
    expect(description, 'meta description non-empty').toBeTruthy();
    expect((description ?? '').length).toBeGreaterThan(0);

    expect(metaContent(html, 'og:type')).toBe('article');

    // Prod-origin assertions (ROLLOUT-gated when PUBLIC_SITE_URL!=prod).
    const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i)?.[1];
    expect(canonical?.startsWith(origin), `canonical ${canonical} on expected origin`).toBe(true);
    expect(metaContent(html, 'og:url')?.startsWith(origin)).toBe(true);

    const ogImage = metaContent(html, 'og:image');
    expect(ogImage?.startsWith(origin)).toBe(true);
    expect(ogImage).toContain(PINNED_IMAGE);

    // twitter:image must be the post's featured image (prod origin), NOT the global default.
    const twitterImage = metaContent(html, 'twitter:image');
    expect(twitterImage).toContain(PINNED_IMAGE);
    expect(twitterImage).not.toContain('SpicebushLogo');

    expect(metaContent(html, 'og:image:alt'), 'og:image:alt present').toBeTruthy();
    expect(
      metaContent(html, 'twitter:image:alt', 'name'),
      'twitter:image:alt present'
    ).toBeTruthy();
    expect(metaContent(html, 'article:published_time'), 'article:published_time ISO').toMatch(
      /^\d{4}-\d{2}-\d{2}T/
    );

    // R2-F16: robots = index,follow on the post AND no googlebot-noindex tag.
    expect(metaContent(html, 'robots', 'name')?.toLowerCase()).toContain('index');
    expect(/<meta[^>]*name=["']googlebot["'][^>]*noindex/i.test(html)).toBe(false);

    // PR3 post-page surfaces (render-present; the copy-link CLICK is client-JS, browser-only).
    // Share section with NAMED anchors (R3-F23) + the copy-link button + its aria-live status region.
    expect(html, 'share section heading').toContain('Share this post');
    expect(html, 'named share anchor').toContain(
      'aria-label="Share on Facebook (opens in a new tab)"'
    );
    expect(html, 'copy-link button').toContain('id="copy-link-btn"');
    expect(/aria-live=["']polite["']/i.test(html), 'copy-link status is a polite live region').toBe(
      true
    );
    // Related posts: the pinned post shares categories (Education/Nature/Programs) with others, so the
    // section renders and links a DIFFERENT published post.
    expect(html, 'related posts heading').toContain('Related posts');
    expect(
      /<a[^>]*href=["']\/blog\/(?!nurturing-growth-gardening-program)[a-z0-9-]+["']/i.test(html),
      'related section links another post'
    ).toBe(true);
    // Post's own taxonomy chips (discovery parity with the index cards).
    expect(html, 'taxonomy chips on post').toMatch(/href=["']\/blog\/category\/[a-z0-9-]+["']/i);

    // PR4 PR2: Article JSON-LD (R1-F29) — extract every ld+json block, find the BlogPosting one, and
    // confirm it JSON.parses (the inline-script escapes are JSON-valid) with the required fields.
    const ldBlocks = [
      ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
    ].map(m => {
      try {
        return JSON.parse(m[1]);
      } catch {
        return null;
      }
    });
    const articleLd = ldBlocks.find(o => o && o['@type'] === 'BlogPosting');
    expect(articleLd, 'BlogPosting JSON-LD present and valid JSON').toBeTruthy();
    expect(articleLd.headline.length, 'headline <= 110 (R4-F17)').toBeLessThanOrEqual(110);
    expect(articleLd.datePublished, 'datePublished ISO').toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(articleLd.dateModified, 'dateModified ISO (R3-F18)').toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(articleLd.author['@type']).toBe('Organization');
    expect(articleLd.publisher['@type']).toBe('Organization');
    expect(articleLd.mainEntityOfPage['@id']?.startsWith(origin)).toBe(true);
    // The org block still coexists (R2-F24).
    expect(
      ldBlocks.some(o => o && o['@type'] === 'EducationalOrganization'),
      'org JSON-LD still present alongside the article block'
    ).toBe(true);
    // RSS auto-discovery + article:modified_time.
    expect(html, 'RSS auto-discovery link').toContain('type="application/rss+xml"');
    expect(metaContent(html, 'article:modified_time'), 'article:modified_time ISO').toMatch(
      /^\d{4}-\d{2}-\d{2}T/
    );

    // Same robots discipline on /blog index.
    const indexHtml = await (await request.get('/blog')).text();
    expect(metaContent(indexHtml, 'robots', 'name')?.toLowerCase()).toContain('index');
    expect(/<meta[^>]*name=["']googlebot["'][^>]*noindex/i.test(indexHtml)).toBe(false);
  });

  // Test 20 — 404 / legacy-redirect matrix
  test('20: 404 + legacy-redirect matrix', async ({ request }) => {
    // Unknown slug → branded 404 (builder-verify of §2.2 step 4).
    const missing = await request.get('/blog/this-does-not-exist', { maxRedirects: 0 });
    expect(missing.status()).toBe(404);
    const missingHtml = await missing.text();
    expect(missingHtml, 'branded 404 markup renders').toContain('Page Not Found');

    // Date-prefixed legacy slug → 301 → clean slug (ROLLOUT-gated: needs the clean target row).
    const legacy = await request.get(`/blog/${PINNED_LEGACY_SLUG}`, { maxRedirects: 0 });
    expect(legacy.status()).toBe(301);
    expect(legacy.headers()['location']).toBe(`/blog/${PINNED_SLUG}`);

    // Date-prefixed unknown slug → 404, NOT a redirect (pins the fallback miss branch).
    const dateMiss = await request.get('/blog/2024-01-01-nonexistent', { maxRedirects: 0 });
    expect(dateMiss.status(), 'date-prefixed miss must 404, not redirect').toBe(404);
  });

  // Test 21 — resources 301s
  test('21: /resources/blog and /resources/blog/<slug> 301 to canonical paths', async ({
    request
  }) => {
    const idx = await request.get('/resources/blog', { maxRedirects: 0 });
    expect(idx.status()).toBe(301);
    expect(idx.headers()['location']).toBe('/blog');

    const post = await request.get(`/resources/blog/${PINNED_SLUG}`, { maxRedirects: 0 });
    expect(post.status()).toBe(301);
    // Assert the 301 only — no "no intermediate hop" assertion (dropped with the page revert).
    expect(post.headers()['location']).toBe(`/blog/${PINNED_SLUG}`);
  });

  // Test 22 — GET /sitemap-blog.xml
  test('22: /sitemap-blog.xml returns XML with exact slashless <loc> forms, no drafts', async ({
    request
  }) => {
    const origin = resolveExpectedOrigin();
    const res = await request.get('/sitemap-blog.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/xml');
    const xml = await res.text();

    // EXACT slashless <loc> strings (assert exact, not substring-with-slash).
    expect(xml).toContain(`<loc>${origin}/blog</loc>`);
    expect(xml).toContain(`<loc>${origin}/blog/${PINNED_SLUG}</loc>`);

    const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]);
    const postLocs = locs.filter(l => l.startsWith(`${origin}/blog/`));
    expect(postLocs.length, '≥6 post URLs').toBeGreaterThanOrEqual(6);
    for (const loc of locs) {
      expect(loc.startsWith(origin), `loc ${loc} on expected origin`).toBe(true);
      expect(loc.endsWith('/'), `no trailing-slash variant in ${loc}`).toBe(false);
    }
    // No draft slug present (drafts never reach the published read path).
    expect(xml).not.toContain('e2e-flow-');
  });

  // Test 23 — footer + robots
  test('23: footer link navigates to /blog and robots.txt advertises the blog sitemap', async ({
    page,
    request
  }) => {
    const origin = resolveExpectedOrigin();
    await page.goto('/');
    const footerBlogLink = page.locator('footer a[href="/blog"]').first();
    await expect(footerBlogLink).toHaveCount(1);
    await footerBlogLink.click();
    await expect(page).toHaveURL(/\/blog$/);

    const robots = await request.get('/robots.txt');
    expect(robots.status()).toBe(200);
    const body = await robots.text();
    expect(body).toContain(`Sitemap: ${origin}/sitemap-blog.xml`);
  });

  // Test 24 — Authoring flow (request-context, authenticated, chromium-only)
  test('24: admin authoring flow — draft invisibility, no-op round-trip, delete', async ({
    request
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'authoring flow is chromium-only (single shared DB)'
    );
    test.skip(
      !process.env.E2E_ADMIN_SESSION,
      'E2E_ADMIN_SESSION required for the authenticated authoring flow'
    );

    const sessionCookie = `sbms-admin-session=${process.env.E2E_ADMIN_SESSION}`;
    const origin = resolveExpectedOrigin();
    const projectName = testInfo.project.name;
    const slug = `e2e-flow-${projectName}-${testInfo.workerIndex}-${Date.now()}`;
    const bodyRaw =
      '## E2E heading\n\nA paragraph with **bold** text and a [link](https://example.com).';

    const postContent = (form: Record<string, string>, accept = 'text/html') =>
      request.post('/api/admin/content', {
        headers: { Cookie: sessionCookie, Accept: accept, Origin: origin },
        form
      });

    // Pre-step: orphan-sweep any leftover e2e-flow-% drafts from prior interrupted runs.
    const sweep = await request.get('/admin/blog', { headers: { Cookie: sessionCookie } });
    const sweepHtml = await sweep.text();
    for (const m of sweepHtml.matchAll(/e2e-flow-[a-z0-9-]+/g)) {
      await postContent({ collection: 'blog', slug: m[0], action: 'delete' });
    }

    try {
      // 1. Create a DRAFT (createOnly) and assert it is invisible to every public surface.
      const create = await postContent({
        collection: 'blog',
        slug,
        title: 'E2E Flow Draft',
        status: 'draft',
        createOnly: 'true',
        'data.body_raw': bodyRaw,
        'data.excerpt_raw': 'An E2E draft excerpt.'
      });
      expect([200, 303]).toContain(create.status());

      const draftView = await request.get(`/blog/${slug}`, { maxRedirects: 0 });
      expect(draftView.status(), 'draft must 404 on the public post page').toBe(404);

      const indexHtml = await (await request.get('/blog')).text();
      expect(indexHtml, 'draft slug absent from /blog index').not.toContain(slug);

      const sitemapXml = await (await request.get('/sitemap-blog.xml')).text();
      expect(sitemapXml, 'draft slug absent from sitemap').not.toContain(slug);

      const draftDateView = await request.get(`/blog/2099-01-01-${slug}`, { maxRedirects: 0 });
      expect(draftDateView.status(), 'date-prefixed draft target must 404, not redirect').toBe(404);

      // 2. No-op edit round-trip (R2-F8): re-extract the rendered body_raw, assert byte-identity.
      const adminPage1 = await (
        await request.get('/admin/blog', { headers: { Cookie: sessionCookie } })
      ).text();
      const extracted1 = extractTextareaValue(adminPage1, slug, 'data.body_raw');
      expect(extracted1, 'posted body round-trips byte-identical').toBe(bodyRaw);

      await postContent({
        collection: 'blog',
        slug,
        title: 'E2E Flow Draft',
        status: 'draft',
        'data.body_raw': extracted1 ?? bodyRaw,
        'data.excerpt_raw': 'An E2E draft excerpt.'
      });

      const adminPage2 = await (
        await request.get('/admin/blog', { headers: { Cookie: sessionCookie } })
      ).text();
      const extracted2 = extractTextareaValue(adminPage2, slug, 'data.body_raw');
      expect(extracted2, 're-submit must not accrete whitespace').toBe(extracted1);

      // 3. publish→200 transition: asserted ONLY in the post-deploy (rollout) run (R4-F24).
      // Gated on E2E_POST_DEPLOY so a crash between publish and cleanup can't strand a public
      // published row during the pre-merge build context.
      if (process.env.E2E_POST_DEPLOY === '1') {
        await postContent({
          collection: 'blog',
          slug,
          title: 'E2E Flow Draft',
          status: 'published',
          'data.body_raw': bodyRaw,
          'data.excerpt_raw': 'An E2E draft excerpt.',
          'data.date': '2099-01-01'
        });
        const published = await request.get(`/blog/${slug}`, { maxRedirects: 0 });
        expect(published.status()).toBe(200);
      }
    } finally {
      // Delete and verify removal via the UNCACHED admin surface (R4-F25), NOT the public 404.
      const del = await postContent({ collection: 'blog', slug, action: 'delete' });
      expect([200, 303]).toContain(del.status());
      const adminAfter = await (
        await request.get('/admin/blog', { headers: { Cookie: sessionCookie } })
      ).text();
      expect(adminAfter, 'slug removed per the uncached admin surface').not.toContain(slug);
    }
  });

  // Test 26 — auth gates
  test('26: admin/blog + content endpoint auth gates (real middleware)', async ({
    request,
    baseURL
  }) => {
    const siteOrigin = new URL(baseURL ?? 'http://localhost:4321').origin;
    // Unauthenticated GET /admin/blog → redirect to sign-in.
    const adminGet = await request.get('/admin/blog', {
      maxRedirects: 0,
      headers: { Accept: 'text/html' }
    });
    expect([301, 302, 303, 307, 308]).toContain(adminGet.status());
    expect(adminGet.headers()['location']).toContain('/auth/sign-in');

    // POST /api/admin/content with NO cookie, JSON → 401 (middleware runs first).
    const jsonPost = await request.post('/api/admin/content', {
      maxRedirects: 0,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      data: { collection: 'blog', slug: 'unauthed' }
    });
    expect(jsonPost.status()).toBe(401);

    // Same POST with Accept: text/html and a same-site Origin → 302 to /auth/sign-in.
    // The Origin header is REQUIRED here: browsers always send it on form POSTs, but
    // Playwright's APIRequestContext does not — and without it Astro's built-in CSRF
    // protection (security.checkOrigin) rejects form-content-type POSTs with a 403
    // ("Cross-site POST form submissions are forbidden") before the middleware ever runs.
    // Verified against prod 2026-06-06.
    // NOTE: middleware's toSignInRedirect uses context.redirect() with no status → Astro
    // default 302 (verified), NOT 303 as the work-order prose states.
    const htmlPost = await request.post('/api/admin/content', {
      maxRedirects: 0,
      headers: { Accept: 'text/html', Origin: siteOrigin },
      form: { collection: 'blog', slug: 'unauthed' }
    });
    expect(htmlPost.status()).toBe(302);
    expect(htmlPost.headers()['location']).toContain('/auth/sign-in');

    // Defense-in-depth pin: the same form POST with NO Origin header is rejected by Astro's
    // built-in CSRF layer (403) before any application code runs.
    const originlessPost = await request.post('/api/admin/content', {
      maxRedirects: 0,
      headers: { Accept: 'text/html' },
      form: { collection: 'blog', slug: 'unauthed' }
    });
    expect(originlessPost.status()).toBe(403);
  });

  // Test 27 — .blog-body a deterministic pin
  test('27: .blog-body a computed color is forest-canopy with underline', async ({ page }) => {
    await page.goto(`/blog/${PINNED_SLUG}`);
    const bodyLinks = page.locator('.blog-body a');
    expect(await bodyLinks.count(), 'at least one body link').toBeGreaterThan(0);

    const link = bodyLinks.first();
    const color = await link.evaluate(el => window.getComputedStyle(el).color);
    expect(color).toBe(PINNED_LINK_COLOR);

    const decoration = await link.evaluate(el =>
      window.getComputedStyle(el).getPropertyValue('text-decoration-line')
    );
    expect(decoration).toContain('underline');
  });

  // Test 28 — Phase-6 ticker safety: inert until enabled, and the site-wide skip-to-main link.
  test('28: ticker is inert by default + skip-to-main link present site-wide', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.status(), 'homepage 200').toBe(200);

    // INERT: with the ticker disabled (default), neither the header strip nor the homepage section
    // renders anything — no visible change to the live site until the owner opts in.
    expect(await page.locator('.js-ticker').count(), 'ticker renders nothing while disabled').toBe(
      0
    );

    // R4-F18 skip link — present on the homepage AND a non-homepage page, targeting #main-content.
    const skip = page.locator('a[href="#main-content"]');
    await expect(skip, 'skip link on homepage').toHaveCount(1);
    await expect(page.locator('#main-content'), 'main landmark present').toHaveCount(1);

    await page.goto('/about');
    await expect(
      page.locator('a[href="#main-content"]'),
      'skip link site-wide (non-homepage)'
    ).toHaveCount(1);
  });
});

/**
 * Extract a named field's textarea value for a given slug from the rendered /admin/blog HTML,
 * HTML-unescaping the content so the comparison is against the raw posted body.
 * Returns null when the field is not found (so the caller's assertion fails loudly).
 */
function extractTextareaValue(html: string, slug: string, field: string): string | null {
  // The admin page renders one editor block per post; scope the search to the slug's block.
  const slugIdx = html.indexOf(slug);
  if (slugIdx === -1) return null;
  const block = html.slice(Math.max(0, slugIdx - 4000), slugIdx + 8000);
  const re = new RegExp(`<textarea[^>]*name=["']${field}["'][^>]*>([\\s\\S]*?)</textarea>`, 'i');
  const m = block.match(re);
  if (!m) return null;
  return htmlUnescape(m[1]);
}

function htmlUnescape(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}
