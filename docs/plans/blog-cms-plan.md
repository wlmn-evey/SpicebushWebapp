# Blog CMS — Implementation Plan

*Spec: `docs/specs/blog-cms.md`*
*GitHub Issue: #33*
*Date: April 5, 2026*

---

## Phase Summary

| Phase | Name | Depends On | Parallel? | Size |
|-------|------|-----------|-----------|------|
| 0 | Prerequisites | — | — | S |
| 1 | Data Foundation & Blog CRUD API | 0 | — | M |
| 2 | Admin Blog Dashboard | 1 | — | S |
| 3 | TipTap Post Editor (no AI) | 1 | With 2 | L |
| 4 | Public Blog Pages | 1, 3 | — | M |
| 5 | Ticker System | 1 | With 2-4 | M |
| 6 | AI Service & Voice System | 0, 1 | With 2-5 | L |
| 7 | AI Editor Integration | 3, 6 | — | M |
| 8 | SEO, Feeds & Content Migration | 4 | With 7 | S |

```
Phase 0 (Prerequisites)
  └── Phase 1 (Data Foundation)
        ├── Phase 2 (Admin Dashboard)
        ├── Phase 3 (TipTap Editor) ───┐
        │                               ├── Phase 4 (Public Pages) → Phase 8 (SEO/Feeds/Migration)
        ├── Phase 5 (Ticker) ──────────┤
        └── Phase 6 (AI Service) ──────┘
                └── Phase 7 (AI Editor) ← needs 3 + 6
```

Phases 2, 3, 5, 6 can run in parallel after Phase 1. Phase 7 gates on 3 + 6. Phase 8 gates on 4.

### Parallelism: Two Implementers Could Split

- **Alpha:** Phases 0, 1, 2, 3, 7 (data + admin + editor track)
- **Bravo:** Phases 4, 5, 8 (public pages + ticker track)
- **Phase 6** (AI service) can be worked by either after Phase 1 completes

---

## Phase 0: Prerequisites

**Goal:** Foundation utilities and configuration needed by later phases.

### Tasks

**B0.1 — Create encryption utility (`app/src/lib/crypto.ts`)**
- New file: `app/src/lib/crypto.ts`
- Exports: `encrypt(plaintext: string): string` and `decrypt(ciphertext: string): string`
- Uses AES-256-GCM via `node:crypto`
- Reads `ADMIN_ENCRYPTION_KEY` from `process.env`
- Storage format: `enc:<iv>:<authTag>:<ciphertext>` (base64)
- Pattern reference: `admin-session.ts` for `node:crypto` imports
- Verify: Unit test with known plaintext → encrypt → decrypt → verify roundtrip

**B0.2 — Add `@anthropic-ai/sdk` and `@extractus/article-extractor` to Rollup externals**
- Modify: `app/astro.config.mjs` line 35
- Add to the `external` array alongside `'resend'`, `'@sendgrid/mail'`, `'postmark'`
- Verify: `npm run build` succeeds without bundling errors

**B0.3 — Register blog in CMS allowed collections**
- Modify: `app/src/pages/api/admin/content.ts` line 6 — add `'blog'` to `ALLOWED_COLLECTIONS`
- Modify: `app/src/pages/api/cms/entry.ts` line 5 — add `'blog'` to `ALLOWED_COLLECTIONS`
- Remove: `'cms_blog'` from `DATABASE_COLLECTIONS` in `app/src/lib/db/content.ts` line 19 (speculative entry, not used)
- Verify: Existing CMS API tests still pass; blog entries can be created via `/api/admin/content`

### Parallelizable
B0.1, B0.2, B0.3 are all independent — can be done simultaneously.

---

## Phase 1: Data Foundation & Blog CRUD API

**Goal:** Blog posts exist in the database, APIs work, seed data is in place.

### Backend Tasks

**B1.1 — Blog query module (`app/src/lib/db/blog.ts`)**
- New file: `app/src/lib/db/blog.ts`
- Functions:
  - `getBlogPosts(opts: { status?, category?, tag?, author?, page?, limit?, sort? }): Promise<{posts, total, pages}>`
  - `getBlogPost(slug: string): Promise<BlogPost | null>` — includes scheduled post logic: `published_at <= NOW()`
  - `getBlogPostForAdmin(slug: string): Promise<BlogPost | null>` — returns regardless of `published_at`
  - `getRelatedPosts(slug: string, categories: string[], limit?: number): Promise<BlogPost[]>`
  - `getBlogCategories(): Promise<string[]>` — distinct categories across all published posts
  - `getBlogTags(): Promise<string[]>` — distinct tags
- Uses `queryRows`/`queryFirst` from `@lib/db/client` (existing pattern)
- Handles pagination with LIMIT/OFFSET
- Handles scheduled posts: `status='published' AND (data->>'published_at' IS NULL OR (data->>'published_at')::timestamptz <= NOW())`
- Depends on: B0.3
- Verify: Unit tests with mocked DB client

**B1.2 — Blog CRUD API routes (`app/src/pages/api/admin/blog.ts`)**
- New file: `app/src/pages/api/admin/blog.ts`
- POST: Create/update blog post (upsert into content table with `type='blog'`)
  - Validates required fields (title, slug, body)
  - Auto-generates slug from title if not provided (via B1.3)
  - Computes `reading_time_minutes` (word count / 200, via B1.3)
  - Sets `author_email` from session
  - Invalidates blog cache after write (via B1.6)
- DELETE: Delete blog post by slug
- GET: List posts with filtering (for admin dashboard)
- Auth: `checkAdminAuth()` guard (existing pattern from `api/admin/content.ts`)
- Pattern reference: `api/admin/content.ts` for request parsing, auth, and upsert
- Depends on: B0.3, B1.1, B1.3
- Verify: Integration tests for CRUD operations

**B1.3 — Blog post utilities (`app/src/lib/blog-utils.ts`)**
- New file: `app/src/lib/blog-utils.ts`
- Exports:
  - `generateSlug(title: string): string` — lowercase, hyphenated, strip special chars
  - `computeReadingTime(htmlBody: string): number` — strip tags, count words, divide by 200, round up
  - `extractExcerpt(htmlBody: string, maxLength?: number): string` — strip tags, take first N chars at sentence boundary
- Depends on: nothing (standalone)
- Verify: Unit tests for each function with edge cases

**B1.4 — Content migration script**
- New file: `app/scripts/migrate-blog-posts.ts` (or add to `db:seed`)
- Reads 6 markdown files from `app/src/content/blog/`
- Parses frontmatter (use `gray-matter` if available, otherwise regex)
- Converts markdown body to HTML via `marked` (already in project)
- Inserts each post into `content` table with correct field mapping:
  ```
  frontmatter.title       → data.title + content.title
  frontmatter.slug        → content.slug
  frontmatter.date        → data.published_at (ISO string)
  frontmatter.categories  → data.categories
  frontmatter.tags        → data.tags
  frontmatter.featured_image → data.featured_image
  frontmatter.excerpt     → data.excerpt
  frontmatter.seoTitle    → data.seo_title
  frontmatter.seoDescription → data.seo_description
  markdown body (as HTML) → data.body
  ```
- All 6 posts mapped to `author_type='virtual'`, `author_ref='spicebush-official'`
- Idempotent: uses `ON CONFLICT (type, slug) DO UPDATE`
- Depends on: B1.3 (for reading time computation)
- Verify: Run migration, verify 6 rows exist with correct data

**B1.5 — Seed default blog settings**
- Modify: seed script or new migration file
- Seeds into `settings` table:
  - `blog_virtual_authors`: `[{"key":"spicebush-official","name":"Spicebush Official","bio":"News and updates from Spicebush Montessori School","avatar":"/images/logo.png"}]`
  - `ai_anti_patterns`: `["delve","tapestry","landscape","it's important to note","——","whether you're a"]`
  - `ai_voice_instructions`: `[]`
  - `ai_voice_corpus`: `[]`
  - `ticker_items`: `[]`
  - `ticker_enabled`: `true`
- Seeds into `admin_settings` table:
  - `anthropic_api_key` with `is_sensitive=true`, `setting_category='ai'`, empty value
- Depends on: nothing
- Verify: Run seed, verify settings exist

**B1.6 — Blog-specific cache invalidation**
- Modify: `app/src/lib/db/content.ts`
- Add blog-specific invalidation method to `cacheUtils`: `invalidateBlog()` — clears `collection:blog` and all `entry:blog:*` cache keys
- Verify existing `getHomepageData()` (line 251) works correctly with blog posts (it already fetches blog collection)
- Depends on: nothing
- Verify: Cache invalidation clears blog entries; homepage data includes blog posts

**B1.7 — Add `db.blog` to the DB facade**
- Modify: `app/src/lib/db/index.ts`
- Import and expose all functions from `blog.ts` under `db.blog` namespace
- Add TypeScript types for `BlogPost` to `app/src/lib/db/types.ts`
- Depends on: B1.1
- Verify: `import { db } from '@lib/db'; db.blog.getBlogPosts(...)` compiles and works

### Phase 1 Parallelizable Groups
- **Independent:** B1.3, B1.5, B1.6 (can start immediately)
- **After B0.3:** B1.1
- **After B1.1:** B1.2, B1.7
- **After B1.3:** B1.4

---

## Phase 2: Admin Blog Dashboard

**Goal:** Admins can see and manage blog posts from `/admin/blog`.

### Tasks

**F2.1 — Add Blog & Ticker nav items to AdminNav**
- Modify: `app/src/components/AdminNav.astro`
- Add `Blog` link (`/admin/blog`) with `Newspaper` icon from `lucide-astro`, placed after "FAQs" and before "Media"
- Add `Ticker` link (`/admin/ticker`) with `Megaphone` icon
- Follow existing `aria-current` pattern for active state
- `currentPath` matching should handle `/admin/blog` and `/admin/blog/*` (edit page lives under `/admin/blog/edit`)
- Depends on: nothing (can start immediately)
- Verify: Navigate to `/admin/blog` and `/admin/ticker` — nav items highlight correctly

**F2.2 — Blog dashboard list page**
- New file: `app/src/pages/admin/blog.astro`
- Import `AdminLayout`, use `title="Blog Posts"`
- In frontmatter: fetch blog posts via `db.blog.getBlogPosts()` with URL params for filtering/sorting
- Parse `?status=`, `?category=`, `?author=`, `?sort=` from URL params
- Render table with columns: Title (linked to edit), Author name, Status badge (green=published, amber=draft, blue=scheduled, gray=archived), Published date, Categories (as small badges)
- Status badge coloring follows `admin/announcements.astro` pattern
- Filter controls above table: status dropdown, category dropdown, author dropdown
- Sort toggle on column headers (date default descending, title alpha, status)
- Quick actions per row: "Edit" link, "Archive" button (inline form POST), "Delete" button (with `data-confirm`)
- Bulk action bar: checkbox per row, "Archive Selected" and "Delete Selected" (visible when checkboxes checked)
- "New Post" primary button (top-right, links to `/admin/blog/edit`)
- Empty state: "No blog posts yet. Create your first post." with CTA button
- Flash messages via `?saved=` and `?error=` URL params (existing pattern)
- Depends on: F2.1, Phase 1 (B1.1, B1.2)
- Verify: Page renders with posts, filters work, sort works, quick actions work, flash messages appear

---

## Phase 3: TipTap Post Editor (Core — No AI)

**Goal:** Admins can write and edit posts with a full rich text editor.

### Tasks

**F3.1 — Install TipTap dependencies**
- Modify: `app/package.json`
- Install: `@tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-bubble-menu @tiptap/extension-placeholder @tiptap/extension-character-count`
- Note: Link extension is already in StarterKit — no separate install
- Add TipTap to Rollup manual chunks in `astro.config.mjs`:
  ```js
  if (id.includes('tiptap') || id.includes('prosemirror')) return 'editor-vendor';
  ```
- Depends on: nothing
- Verify: `npm install` succeeds, `npm run build` still passes

**F3.2 — Investigate media picker reusability (EARLY — potential blocker)**
- Read: `app/src/pages/admin/media.astro` to determine if the media browser/picker can be extracted as a reusable component
- If the picker is inline in `media.astro`, extract a shared `MediaPicker` component that can be used from the blog editor
- The TipTap Image extension is render-only — `editor.commands.setImage({ src })` just sets a URL. The media library picker integration is custom bridging work.
- Depends on: nothing
- Verify: MediaPicker component can be imported and rendered from a different admin page

**F3.3 — Blog editor Astro page (shell)**
- New file: `app/src/pages/admin/blog/edit.astro`
- Import `AdminLayout`, title = "Edit Post" or "New Post" depending on slug
- Read `?slug=` from URL params; if present, fetch post via `db.blog.getBlogPostForAdmin(slug)`
- If slug provided but not found, return 404
- Fetch supporting data in parallel (`Promise.all`):
  - Staff list: `db.content.getCollection('staff')`
  - Virtual authors: `db.content.getSetting('blog_virtual_authors')`
  - Existing categories: `db.blog.getBlogCategories()`
  - Existing tags: `db.blog.getBlogTags()`
- Serialize all data as JSON props to React island
- Render: `<BlogPostEditor client:only="react" post={postData} staff={staffList} virtualAuthors={virtualAuthors} categories={categories} tags={tags} />`
- Depends on: Phase 1 (blog DB methods)
- Verify: Page loads at `/admin/blog/edit` (new) and `/admin/blog/edit?slug=test` (existing). React island hydrates.

**F3.4 — TipTap editor core component**
- New file: `app/src/components/blog/BlogPostEditor.tsx`
- **CRITICAL:** Use `client:only="react"` (NOT `client:load`). TipTap requires DOM APIs and cannot be server-rendered. Pass `immediatelyRender: false` to `useEditor` hook.
- Two-column layout: left = title + editor, right = sidebar panels
- TipTap setup with `useEditor` hook:
  - Extensions: `StarterKit`, `Image`, `Placeholder.configure({ placeholder: 'Start writing...' })`, `CharacterCount`, `BubbleMenu` (placeholder for AI, wired in Phase 7)
  - `immediatelyRender: false` (required for SSR-safe hydration)
- Toolbar above editor: heading levels (H2, H3, H4), bold, italic, bullet list, ordered list, blockquote, link insert, image insert (opens media picker)
- Editor content area with Tailwind Typography `prose` classes
- Title input: large text input, auto-generates slug (debounced) shown as editable slug field below
- Component props type:
  ```typescript
  type BlogPostEditorProps = {
    post?: BlogPostData | null;  // null = new post
    staff: StaffMember[];
    virtualAuthors: VirtualAuthor[];
    categories: string[];
    tags: string[];
  };
  ```
- State management: local React state (no external library). `isDirty` flag for unsaved navigation warning (`beforeunload`). Auto-save draft every 30 seconds if dirty.
- Save actions: "Save Draft" (POST with `status: 'draft'`), "Publish" / "Schedule" (POST with `status: 'published'`), "Preview" (opens `/blog/preview?slug=...` in new tab). All show loading state, handle errors.
- BubbleMenu supports multiple instances via `pluginKey` — useful for separate formatting vs AI menus.
- Depends on: F3.1, F3.3
- Verify: Editor renders, typing works, toolbar formatting works, save draft POSTs correctly

**F3.5 — Editor sidebar panels**
- New files (or sub-components within BlogPostEditor):
  - `app/src/components/blog/panels/MetadataPanel.tsx`
  - `app/src/components/blog/panels/SeoPanel.tsx`
- **Metadata Panel:**
  - Status selector: `<select>` with draft/published/archived
  - Publish date picker: `<input type="datetime-local">` — empty = immediate, future = scheduled. Show "Scheduled for [date]" indicator
  - Author selector: `<select>` combining staff ("Staff — [Name]") and virtual authors ("Virtual — [Name]"). Default to first virtual author for new posts
  - Featured image picker: thumbnail preview + "Choose Image" button → opens MediaPicker modal → stores media URL
  - Categories: multi-select with checkboxes for existing + "Add new category" text input
  - Tags: freeform text input with autocomplete dropdown from existing tags, rendered as removable chips
  - Excerpt: `<textarea>` (max ~300 chars) with character count. Leave `{/* AI button slot */}` comment for Phase 7
- **SEO Panel (collapsible, default collapsed):**
  - Meta title: `<input>` with live character count (target 50-60 chars, green/amber/red indicator). Defaults to post title
  - Meta description: `<textarea>` with live character count (target 150-160 chars). Defaults to excerpt
  - OG image: same picker as featured image, defaults to featured image
  - Leave `{/* AI button slot */}` comments next to each field for Phase 7
- Depends on: F3.4
- Verify: All fields render, accept input, values included in save payload. Character counts live. Media picker works.

**F3.6 — Blog post preview page**
- New file: `app/src/pages/blog/preview.astro`
- Check admin auth — redirect to sign-in if not admin
- Read `?slug=` param, fetch post from DB (including drafts)
- Render with same layout/styles as future public post page
- Show yellow "Preview" banner: "This is a preview. This post is not yet published."
- Extract shared `BlogPostContent.astro` component for reuse in Phase 4's public post page
- Depends on: F3.4 (need posts to preview)
- Verify: Navigate from editor "Preview" button — new tab shows post with preview banner

### Phase 3 Dependencies
```
F3.1 (install TipTap) ─┐
F3.2 (media picker) ────┤
F3.3 (Astro shell) ─────┼── F3.4 (editor core) → F3.5 (sidebar) → F3.6 (preview)
```

---

## Phase 4: Public Blog Pages

**Goal:** Visitors can read the blog.

### Tasks

**F4.1 — Blog listing page**
- New file: `app/src/pages/blog/index.astro` — replaces the current `blog.astro` 301 redirect
- Remove/replace: `app/src/pages/blog.astro` (the redirect)
- Use main `Layout.astro` (not AdminLayout), include Header and Footer
- Fetch published posts via `db.blog.getPublishedBlogPosts({ page, category, tag })` from URL params
- Post card grid: responsive (1 col mobile, 2 col md, 3 col lg)
  - Each card: featured image (with fallback placeholder), title (linked), excerpt (truncated), author name, date, reading time, category badges
  - Brand styling: `bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow`
- Category filter bar: horizontal scroll on mobile, active category highlighted
- Pagination: "Previous" / "Next" with page numbers, disabled at boundaries
- Empty state: "No blog posts yet. Check back soon!"
- Page-level SEO: title, description, keywords props on Layout
- Depends on: Phase 1 (blog DB queries)
- Verify: Page renders at `/blog`, posts display, category filter works, pagination works

**F4.2 — Individual blog post page**
- New file: `app/src/pages/blog/[slug].astro`
- Use `Layout.astro`, include Header and Footer
- Fetch post by slug; if not found or not published (including scheduled-future), return 404
- Reuse `BlogPostContent.astro` from F3.6
- Header: title (h1), author block (avatar + name), date, reading time badge, category badges (linked to `/blog?category=...`)
- Featured image: full-width hero with `aspect-ratio` container (prevents CLS)
- Body: rendered HTML in `prose` container with brand styling overrides
- Social sharing (below body): Facebook, X/Twitter, Email, Copy link. Use `navigator.share` where available, fallback to platform URLs. Inline `<script>` for copy link (no React)
- Author bio block (below sharing): bordered card. Staff → photo/name/bio from staff table. Virtual → avatar/name/bio from settings
- Related posts: 2-3 posts sharing same categories (exclude current). If none, show latest 3. Horizontal smaller cards.
- "Back to Blog" link at top and bottom
- SEO: use `seo_title`/`seo_description`/`og_image` overrides in Layout props. JSON-LD slot for Phase 8.
- Depends on: F4.1, Phase 1
- Verify: Post renders, all sections display, social sharing works, related posts appear, 404 for bad slugs

**F4.3 — Footer and layout integration**
- Modify: `app/src/components/Footer.astro` — add "Blog" link to navigation
- Modify: `app/src/layouts/Layout.astro` — add RSS auto-discovery `<link>` in `<head>`: `<link rel="alternate" type="application/rss+xml" title="Spicebush Montessori Blog" href="/blog/rss.xml" />`
- Depends on: F4.1
- Verify: Footer shows "Blog" link on all pages. Page source has RSS link.

**B4.1 — Public blog JSON API (optional)**
- New file: `app/src/pages/api/blog/posts.ts`
- GET endpoint for potential client-side filtering/pagination
- Calls `db.blog.getPublishedBlogPosts()` with query params
- Returns JSON with posts, pagination info
- Depends on: B1.1
- Verify: Pagination, filtering, scheduled post exclusion

**B4.2 — RSS feed endpoint**
- New file: `app/src/pages/blog/rss.xml.ts` (Astro API route returning XML)
- Fetches 20 most recent published posts
- Generates RSS 2.0 XML: title, link, description (excerpt), author, pubDate, category
- Sets `Content-Type: application/xml`
- Note: `@astrojs/rss` is designed for static — this needs a custom endpoint for SSR
- Depends on: B1.1
- Verify: RSS output validates against RSS 2.0 spec

---

## Phase 5: Ticker System

**Goal:** Configurable ticker on homepage and header.

### Backend Tasks

**B5.1 — Ticker data helpers**
- New file: `app/src/lib/ticker.ts` (or add to `content.ts`)
- Function: `getActiveTickerItems(): Promise<TickerItem[]>`
  - Reads `ticker_items` from settings
  - Filters out items where `expires_at` is in the past
  - Returns ordered list
- Used by both homepage and header components (Astro server-side)
- Depends on: Phase 1 (settings API)
- Verify: Unit test with mock settings including expired and active items

**B5.2 — Ticker CRUD API route**
- New file: `app/src/pages/api/admin/ticker.ts`
- POST actions:
  - `action: 'get'` — returns current ticker items + enabled state
  - `action: 'save'` — save reordered/modified ticker items (max 5 enforced)
  - `action: 'add'` — add a ticker item (reject if already 5)
  - `action: 'remove'` — remove a ticker item by index
  - `action: 'toggle'` — enable/disable ticker
- Stores in `settings` table under `ticker_items` and `ticker_enabled` keys
- Validates: max 5 items, required headline, valid URL format
- Auth: `checkAdminAuth()` guard
- Depends on: Phase 1
- Verify: CRUD operations, max-5 enforcement

### Frontend Tasks

**F5.1 — Ticker admin page**
- New file: `app/src/pages/admin/ticker.astro`
- Use `AdminLayout`, title = "Ticker Management"
- Enable/disable toggle: form POST to `/api/admin/ticker` with `action: 'toggle'`
- Item list: ordered, showing headline, link, type badge, expiry date
  - Drag-to-reorder: small React island (`TickerReorder.tsx`) or vanilla HTML Drag and Drop API
  - Each item has "Edit" and "Remove" buttons
  - Warning banner at 3+ items: "Ticker works best with 3 or fewer items — visitors may not see all 5" (amber)
  - Max 5: hide "Add Item" button at capacity
- Add/edit form: headline (required), link source (tabs: Blog Post dropdown / Announcement dropdown / Custom URL), type auto-set from source, expiry date picker (optional)
- Empty state: "No ticker items. Add your first item to display a ticker on the site."
- Flash messages via URL params
- Depends on: F2.1 (nav link), B5.2
- Verify: Items can be added/edited/removed/reordered. Max 5 enforced. Warning at 3+.

**F5.2 — Homepage ticker component**
- New file: `app/src/components/HomepageTicker.astro`
- Fetch via `getActiveTickerItems()`, if empty or ticker disabled → render nothing
- Layout: prominent content section (not thin bar). Card/banner area with brand styling (`bg-forest-canopy/5` or similar, `rounded-xl`)
- Each item: headline text (linked), type indicator (icon or colored label)
- Behavior: auto-advance every 5 seconds, pause on hover/focus. Vanilla JS `<script>` (no React island needed)
- `aria-live="polite"` for screen reader announcements
- Transition: fade/slide animation, respect `prefers-reduced-motion`
- Navigation dots or arrows for manual control
- Modify: `app/src/pages/index.astro` — insert `<HomepageTicker />` in appropriate position
- Depends on: B5.1, F5.1 (items must exist)
- Verify: Homepage shows ticker, auto-cycles, pauses on hover, no render when empty, reduced motion respected

**F5.3 — Header ticker strip**
- New file: `app/src/components/HeaderTicker.astro`
- Same data source as HomepageTicker
- Layout: thin horizontal strip, small font (`text-xs`/`text-sm`), single line. `bg-forest-canopy` with white text or similar
- Rotates through items every 4-5 seconds, pause on hover. Vanilla JS animation.
- `prefers-reduced-motion`: show first item statically
- Conditional: only on non-homepage pages. Check `Astro.url.pathname !== '/'` in Header
- Position: above main nav, below announcement bar (least disruptive to existing header)
- Modify: `app/src/components/Header.astro` — add `<HeaderTicker />`
- Depends on: B5.1, F5.2 (shared pattern)
- Verify: Strip appears on `/about`, `/contact` etc. but NOT homepage. Rotates. No render when empty.

---

## Phase 6: AI Service & Voice System

**Goal:** AI infrastructure works, voice system is configurable.

### Backend Tasks

**B6.1 — Admin settings facade (`app/src/lib/db/admin-settings.ts`)**
- New file: `app/src/lib/db/admin-settings.ts`
- Functions: `getAdminSetting(key)` / `setAdminSetting(key, value, opts)` / `deleteAdminSetting(key)`
- Auto-encrypt via `@lib/crypto.ts` when writing rows with `is_sensitive=true`
- Auto-decrypt when reading sensitive rows
- Add `db.adminSettings` to facade in `index.ts`
- Note: `admin_settings` table already exists (migration 001) with `is_sensitive` column. No new migration.
- Depends on: B0.1 (crypto utility)
- Verify: Store/retrieve encrypted value, verify roundtrip

**B6.2 — Claude API service (`app/src/lib/ai/claude-service.ts`)**
- New file: `app/src/lib/ai/claude-service.ts`
- Single service that:
  1. Loads Anthropic API key from `admin_settings` (decrypt via B6.1)
  2. Loads voice config (corpus profile, anti-patterns, voice instructions, few-shot examples)
  3. Assembles system prompt with voice context
  4. Calls Claude API via `@anthropic-ai/sdk`
  5. Post-processes response (anti-pattern detection and rewrite)
  6. Returns result
- Exports: `callClaude(opts: { action, content, selection?, context?, tone? }): Promise<AIResponse>`
- Model selection: Haiku for inline edits (`rewrite`, `simplify`, `shorten`, `expand`, `tone`), Sonnet for generation (`headline`, `excerpt`, `draft`, `seo`)
- Error handling: 401 (invalid key → "API key is invalid"), 429/529 (rate limited → retry with backoff, show "AI is busy"), timeout (30s AbortController)
- SDK has built-in auto-retry (2 retries with exponential backoff for 429/500/529) — may not need custom retry
- Streaming support for draft generation (2000+ tokens). Not worth it for inline rewrites.
- Pattern reference: `gemini-suggest.ts` for overall AI request/response/error pattern
- Depends on: B0.1, B0.2, B6.1, B6.3, B6.5
- Verify: Unit tests with mocked HTTP responses

**B6.3 — Voice corpus storage and management (`app/src/lib/ai/voice-corpus.ts`)**
- New file: `app/src/lib/ai/voice-corpus.ts`
- Corpus stored in `settings` table under key `ai_voice_corpus` as JSON array:
  ```json
  [{"id":"uuid","source":"manual|url|published","text":"...","title":"...","addedAt":"ISO","url":"..."}]
  ```
- Functions:
  - `getCorpus(): Promise<CorpusSample[]>`
  - `addCorpusSample(sample: {text, title?, source, url?}): Promise<void>`
  - `removeCorpusSample(id: string): Promise<void>`
  - `getAutoCorpusCandidates(): Promise<BlogPost[]>` — published posts not yet in corpus
- Auto-add on publish: when a post transitions to `published`, add body text to corpus (caller can opt out)
- Depends on: Phase 1
- Verify: CRUD operations on corpus samples

**B6.4 — Style profile computation (`app/src/lib/ai/style-profile.ts`)**
- New file: `app/src/lib/ai/style-profile.ts`
- Exports: `computeStyleProfile(texts: string[]): StyleProfile`
- `StyleProfile` type: `{ avgSentenceLength, fleschKincaidGrade, personalPronounRatio, vocabularyRange, avgParagraphLength }`
- Implementation:
  - Strip HTML tags (reuse `stripTags` pattern from `gemini-suggest.ts`)
  - Flesch-Kincaid: use `text-readability-ts` npm package
  - Pronoun ratio: regex `\b(I|we|us|our|you|your|they|them|my|me)\b` case-insensitive / total words (~20 lines custom)
  - Vocabulary range: unique words / total words (type-token ratio, ~10 lines custom)
  - Paragraph length: split on `\n\n`, count words per paragraph, average (~10 lines custom)
- Caches result in `settings` under `ai_style_profile` — recomputed on corpus change only, not on every AI request
- Depends on: B6.3
- Verify: Unit tests with known text samples and expected metrics

**B6.5 — Few-shot example selection**
- Add to: `app/src/lib/ai/voice-corpus.ts` (or separate file)
- Function: `selectFewShotExamples(postCategories: string[], postKeywords: string[], limit?: number): Promise<CorpusSample[]>`
- Selection logic:
  1. Score each corpus sample by keyword/category overlap with current post
  2. Return top 3-5 by score
  3. Fallback: if no category match, return most recent samples
- Called by Claude service before each request to assemble prompt
- Depends on: B6.3
- Verify: Unit test with mock corpus, verify selection ranking

**B6.6 — AI API routes**
- New file: `app/src/pages/api/admin/blog/ai.ts`
- POST endpoint with `action` field dispatching to operations:
  - `action: 'rewrite'` / `'simplify'` / `'shorten'` / `'expand'` / `'tone'` — inline text transformations
  - `action: 'headline'` — 2-3 headline options from body
  - `action: 'excerpt'` — excerpt from body
  - `action: 'draft'` — draft from topic/bullets
  - `action: 'seo_title'` / `'seo_description'` / `'seo_tags'` / `'seo_og_image'` — SEO suggestions
- Request: `{ action, content, selection?, context?, tone? }`
- Response: `{ success, results: [{text, rationale?}], error? }`
- Auth: `checkAdminAuth()` guard
- Rate limit: in-memory per-session, max 10 requests/minute
- Depends on: B6.2
- Verify: Integration tests for each action type with mocked Claude service

**B6.7 — URL text extraction API route**
- New file: `app/src/pages/api/admin/blog/extract-url.ts`
- POST: accepts `{ url }`, fetches URL, extracts article text
- Uses `@extractus/article-extractor`
- Returns `{ success, title, text, wordCount }`
- Rate limit: 1 request per 5 seconds per session
- Error handling: timeout (15s), extraction failure, invalid URL
- Risk: paywalled/JS-heavy sites won't extract. Show warning, fallback to manual paste.
- Auth: `checkAdminAuth()` guard
- Depends on: B0.2
- Verify: Integration test with a known public URL

**B6.8 — Voice settings API routes**
- New file: `app/src/pages/api/admin/blog/voice.ts`
- POST with action dispatch:
  - `'get_corpus'` / `'add_corpus_sample'` / `'remove_corpus_sample'`
  - `'get_style_profile'`
  - `'get_anti_patterns'` / `'update_anti_patterns'`
  - `'get_voice_instructions'` / `'update_voice_instructions'`
  - `'get_api_key_status'` — returns whether key is configured (NOT the key itself)
  - `'set_api_key'` — encrypt and store
- Adding/removing corpus samples triggers style profile recomputation
- Auth: `checkAdminAuth()` guard
- Depends on: B6.1, B6.3, B6.4
- Verify: Integration tests for each action

### Frontend Tasks

**F6.1 — API key management UI**
- Modify: `/admin/settings` page
- New section: "AI Configuration"
- Masked display of key status ("Configured" / "Not configured")
- Set/update: password input + save button
- Clear: "Remove API Key" button with confirmation
- Depends on: B6.8
- Verify: Set key, page shows "Configured". Clear, shows "Not configured".

**F6.2 — Voice system admin UI**
- New section in `/admin/settings` (or new page `/admin/settings/ai-voice`)
- **Reference Corpus:** list of samples with title, source, word count, added date. "Add Sample" form: paste text / paste URL (triggers extraction via B6.7) / upload. Remove button per sample.
- **Style Profile:** read-only display of computed metrics (avg sentence length, FK grade, pronoun ratio, vocabulary range, paragraph length). "Recompute" button.
- **Anti-Pattern Blocklist:** list with add/remove. Seeded defaults visible. Each entry is a discrete line item.
- **Voice Instructions:** ordered list with add (text input + add button), remove, drag-to-reorder. Each instruction is a discrete line item, not a textarea.
- Depends on: B6.8, F6.1
- Verify: All CRUD operations work. Style profile displays after corpus has samples. Instructions reorder correctly.

### Phase 6 Dependency Chain
```
B0.1 (crypto) → B6.1 (admin settings facade) → B6.8 (voice API) → F6.1, F6.2
B0.2 (externals) → B6.7 (URL extraction)
Phase 1 → B6.3 (corpus) → B6.4 (style profile)
                         → B6.5 (few-shot selection)
B6.1 + B6.3 + B6.5 → B6.2 (Claude service) → B6.6 (AI API routes)
```

---

## Phase 7: AI Editor Integration

**Goal:** All three AI interaction modes live in the post editor.

### Tasks

**F7.1 — AI floating toolbar (in-editor contextual AI)**
- New file: `app/src/components/blog/ai/AiFloatingToolbar.tsx`
- TipTap `BubbleMenu` extension that renders when text is selected
- Use separate `pluginKey` from formatting bubble menu
- Buttons: "Rewrite", "Simplify", "Shorten", "Expand", "Change Tone" (tone opens sub-menu: professional, casual, warm, authoritative)
- On click: sends selected text + action to `/api/admin/blog/ai` with `action: 'rewrite'` etc.
- Loading: button shows spinner, toolbar stays open
- Response: replaces selected text in editor. Editor undo stack captures as single operation
- Error: brief message in toolbar, auto-dismiss after 3s
- Positioning: TipTap's `BubbleMenu` auto-positions near selection
- Depends on: F3.4 (TipTap editor), B6.6 (AI API routes)
- Verify: Select text → toolbar → action → loading → replacement. Ctrl+Z undoes.

**F7.2 — AI Assistant panel in editor sidebar**
- New file: `app/src/components/blog/panels/AiAssistantPanel.tsx`
- Collapsible panel in sidebar (below SEO panel)
- **Suggest Headline:** button → sends body → returns 2-3 options as selectable cards with rationale → "Use This" sets title field
- **Generate Excerpt:** button → sends body → returns excerpt → "Use This" sets excerpt field
- **Generate First Draft:** text input for topic/bullets → "Generate" → loading → preview of draft → "Insert into Editor" (at cursor or replace all if empty)
- **Suggest Categories & Tags:** button → analyzes body → checklist of suggestions with rationale → "Apply Selected" adds to fields
- Each action: loading spinner, error handling (toast), re-triggerable
- Depends on: F3.5 (sidebar), B6.6 (AI API)
- Verify: Each button triggers API call, loading states, results display, "Use This" / "Apply" update editor state

**F7.3 — SEO AI buttons**
- Modify: `app/src/components/blog/panels/SeoPanel.tsx`
- Add AI button (sparkle/wand icon) next to each SEO field
- Shared `AiSuggestionsPopover` sub-component:
  ```typescript
  type AiSuggestion = { value: string; rationale: string; };
  ```
  Renders as list of clickable options with rationale text
- **Meta title AI:** sends title + body → 2-3 options with rationale ("Targets 'Montessori preschool' keyword, 58 chars")
- **Meta description AI:** sends body → 2-3 options with CTR/keyword rationale
- **OG image AI:** suggests best image from post/media with rationale
- **Category/tag SEO:** suggests based on content with SEO reasoning, checklist + "Apply Selected"
- Depends on: F3.5 (SEO panel), B6.6 (AI API)
- Verify: AI buttons appear, click triggers generation, options display with rationale, selecting populates field

---

## Phase 8: SEO, Feeds & Content Migration

**Goal:** RSS, structured data, sitemap, legacy content migrated and cleaned up.

### Tasks

**B8.1 — RSS feed endpoint**
- New file: `app/src/pages/blog/rss.xml.ts`
- Custom Astro API route generating RSS 2.0 XML
- 20 most recent published posts
- Auto-discovery `<link>` tag already added in F4.3
- Verify: W3C Feed Validator passes

**B8.2 — JSON-LD Article structured data**
- Modify: `app/src/pages/blog/[slug].astro`
- Add `<script type="application/ld+json">` with: headline, author (name), datePublished, dateModified, image, publisher (name, logo)
- Verify: Google Rich Results Test validates

**B8.3 — Sitemap integration**
- Ensure published blog posts are dynamically included in sitemap
- Blog posts are database-driven (not file-based), so may need custom sitemap source for `@astrojs/sitemap`
- Drafts and archived posts excluded
- Verify: Sitemap includes blog post URLs

**B8.4 — Run content migration**
- Execute migration script from B1.4 against production/staging
- Verify 6 posts migrated correctly with preserved slugs
- Verify: migrated posts appear on public blog with correct content

**F8.1 — Legacy cleanup**
- Remove: `app/src/content/blog/` directory (all 6 markdown files)
- Modify: `app/src/content/config.ts` — remove blog Zod schema
- Remove: old `app/src/pages/blog.astro` redirect (if not already replaced in Phase 4)
- Verify: build succeeds, no broken references

**F8.2 — Analytics integration**
- Modify: `app/src/pages/blog/[slug].astro` — add `blog_post_view` analytics event (using existing analytics tracking pattern)
- Modify: `app/src/pages/admin/blog.astro` — display view counts per-post in dashboard table (from `db.analytics`)
- Verify: Events fire on post views, counts visible in admin

---

## New Dependencies

| Package | Purpose | License | Rollup External? |
|---------|---------|---------|-------------------|
| `@tiptap/react` | Editor React binding | MIT | No (client) |
| `@tiptap/starter-kit` | Core extensions (includes Link) | MIT | No (client) |
| `@tiptap/pm` | ProseMirror peer dep | MIT | No (client) |
| `@tiptap/extension-image` | Images | MIT | No (client) |
| `@tiptap/extension-bubble-menu` | Floating AI toolbar | MIT | No (client) |
| `@tiptap/extension-placeholder` | Placeholder text | MIT | No (client) |
| `@tiptap/extension-character-count` | Word/char counting | MIT | No (client) |
| `@anthropic-ai/sdk` | Claude API | MIT | **Yes** |
| `@extractus/article-extractor` | URL text extraction | MIT | **Yes** |
| `text-readability-ts` | FK grade, sentence stats | MIT | No (server) |

**Total: 10 packages. All MIT. No paid dependencies.**

TipTap + ProseMirror adds ~150-200KB gzipped (client-side, admin-only, isolated in `editor-vendor` chunk).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Media picker not reusable as component | Phase 3 scope grows | Investigate early (F3.2), extract if needed |
| TipTap image extension needs custom bridge to media picker | Phase 3 complexity | Budget extra time, prototype early. Image extension is render-only — `setImage({src})` just sets URL. Bridging is the custom work. |
| Encryption key loss = unrecoverable API key | AI features break | Document in runbook, key in Netlify env vars |
| URL extraction fails on paywalled/JS-heavy sites | Corpus gaps | Fallback: manual text paste always available. Show warning on extraction failure. |
| `type='blog'` vs `type='cms_blog'` confusion | Query bugs | Clean up `cms_blog` in B0.3, standardize on `blog` |
| Scheduled posts need custom query logic | Posts appear early/late | Blog-specific query with `published_at <= NOW()` in B1.1 |
| TipTap can't be SSR'd | Hydration errors | Use `client:only="react"` not `client:load`; pass `immediatelyRender: false` to `useEditor` |
| Anti-pattern detection false positives | Good writing rejected | Admin can remove entries from blocklist |
| RSS in SSR mode | `@astrojs/rss` designed for static | Custom API endpoint generating XML (B8.1) |
| Bundle size from TipTap + ProseMirror | Slow admin page load | Isolated in `editor-vendor` chunk, admin-only, no public impact |
| No existing AI/LLM code in codebase | No patterns to follow | Gemini SEO integration uses raw `fetch` — Claude SDK will be first SDK-based AI feature |

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Blog storage | Existing `content` table | No new tables, existing patterns, sufficient for lifetime at 1 post/month |
| Editor | TipTap (MIT core) | React-native, extensible, mature, free |
| Editor island | `client:only="react"` | TipTap needs DOM, can't SSR |
| AI models | Haiku (inline), Sonnet (generation) | Cost/quality tradeoff — ~$0.50/month at 4 posts |
| Scheduled publishing | Check on request (no cron) | `published_at <= NOW()` in query — simplest approach |
| API key encryption | AES-256-GCM, app-level | Existing `admin_settings.is_sensitive` column, no DB crypto needed |
| Voice corpus bootstrap | Curated external samples | Existing site content was outsourced, not authentic |
| Newsletter | Deferred to #34 | Build blog first, integrate external service later |
| Post versioning | Deferred to #36 | Add after core blog launches and usage patterns emerge |
| Ticker strip position | Above main nav, below announcement bar | Least disruptive to existing header layout |
| Drag-to-reorder | Vanilla HTML DnD or small React island | Keep it simple, admin-only |
