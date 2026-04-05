# Blog CMS — Implementation Plan

*Spec: `docs/specs/blog-cms.md`*
*GitHub Issue: #33*
*Date: April 5, 2026*

---

## Phase Summary

| Phase | Name | Depends On | Parallel? | Size |
|-------|------|-----------|-----------|------|
| 1 | Data Foundation & Blog CRUD API | — | — | M |
| 2 | Admin Blog Dashboard | 1 | — | S |
| 3 | TipTap Post Editor (no AI) | 1 | With 2 | L |
| 4 | Public Blog Pages | 1, 3 | — | M |
| 5 | Ticker System | 1 | With 2-4 | M |
| 6 | AI Service & Voice System | 1 | With 2-5 | L |
| 7 | AI Editor Integration | 3, 6 | — | M |
| 8 | SEO, Feeds & Content Migration | 4 | With 7 | S |

```
Phase 1 (Data Foundation)
  ├── Phase 2 (Admin Dashboard)
  ├── Phase 3 (TipTap Editor) ───┐
  │                               ├── Phase 4 (Public Pages) → Phase 8 (SEO/Feeds/Migration)
  ├── Phase 5 (Ticker) ──────────┤
  └── Phase 6 (AI Service) ──────┘
          └── Phase 7 (AI Editor) ← needs 3 + 6
```

Phases 2, 3, 5, 6 can run in parallel after Phase 1. Phase 7 gates on 3 + 6. Phase 8 gates on 4.

---

## Phase 1: Data Foundation & Blog CRUD API

**Goal:** Blog posts exist in the database, APIs work, seed data is in place.

### Tasks

1. **Add blog types and constants**
   - TypeScript types for blog post JSONB schema (matching spec Section 2)
   - Add to `app/src/lib/db/types.ts`

2. **Create blog DB module (`app/src/lib/db/blog.ts`)**
   - `getBlogPosts(options)` — paginated, filterable by status/category/author, sortable
   - `getBlogPost(slug)` — single post by slug
   - `getPublishedBlogPosts(options)` — public query with scheduled post logic: `status='published' AND (published_at IS NULL OR published_at <= NOW())`
   - `createBlogPost(data)` / `updateBlogPost(slug, data)` / `deleteBlogPost(slug)`
   - `getBlogCategories()` / `getBlogTags()` — distinct values from existing posts
   - Reading time computation utility

3. **Add `db.blog` to the DB facade** (`app/src/lib/db/index.ts`)

4. **Add `'blog'` to `ALLOWED_COLLECTIONS`** in both:
   - `app/src/pages/api/cms/entry.ts`
   - `app/src/pages/api/admin/content.ts`
   - Remove `'cms_blog'` from `DATABASE_COLLECTIONS` in `content.ts`

5. **Blog API routes**
   - `app/src/pages/api/admin/blog.ts` — POST/PUT/DELETE for CRUD
   - GET for list with filters (status, category, author, sort, pagination)

6. **Seed virtual authors**
   - Add `blog_virtual_authors` to settings table with default "Spicebush Official" entry
   - Add to `db:seed` script

7. **Seed AI defaults**
   - Add `ai_anti_patterns` to settings with default blocklist
   - Add `ai_voice_instructions` to settings (empty array)
   - Add `ai_voice_corpus` to settings (empty array — curated samples added in Phase 6)

### Verify
- Unit tests for blog DB queries
- API endpoint tests for CRUD operations
- `npm run typecheck && npm run lint -- --max-warnings=0`

---

## Phase 2: Admin Blog Dashboard

**Goal:** Admins can see and manage blog posts from `/admin/blog`.

### Tasks

1. **Blog dashboard page** (`app/src/pages/admin/blog.astro`)
   - AdminLayout, server-rendered (follows `announcements.astro` pattern)
   - Table: title, author, status (badge), published date, categories
   - Sort by date (default), status, title via URL params
   - Filter by status, category, author via URL params
   - Quick actions: edit link, archive, delete with confirmation
   - Bulk actions: archive selected, delete selected
   - "New Post" button → `/admin/blog/edit`

2. **Add "Blog" to admin nav** in `AdminNav.astro`

3. **Add "Ticker" to admin nav** (for Phase 5)

### Verify
- Navigate to `/admin/blog`, see seed data
- Sort and filter work
- Quick actions (archive, delete) update the list
- Auth required (redirect to sign-in if unauthenticated)

---

## Phase 3: TipTap Post Editor (Core — No AI)

**Goal:** Admins can write and edit posts with a rich text editor.

### Tasks

1. **Install TipTap packages**
   ```
   @tiptap/react @tiptap/starter-kit @tiptap/pm
   @tiptap/extension-image @tiptap/extension-bubble-menu
   ```
   Note: Link extension is included in StarterKit — no separate install needed.

2. **Add TipTap to Rollup manual chunks** in `astro.config.mjs`
   ```js
   if (id.includes('tiptap') || id.includes('prosemirror')) return 'editor-vendor';
   ```

3. **Investigate media picker reusability** (EARLY — potential blocker)
   - Check if existing media picker in `admin/media.astro` can be extracted as a shared component
   - If inline, extract `MediaPicker` component first

4. **Editor React island** (`app/src/components/blog/BlogPostEditor.tsx`)
   - `client:only="react"` (NOT `client:load` — TipTap needs DOM, can't SSR)
   - TipTap with: headings, bold, italic, lists, blockquotes, links
   - Inline image insertion via media picker
   - Bubble menu placeholder (wired to AI in Phase 7)

5. **Editor page** (`app/src/pages/admin/blog/edit.astro`)
   - Loads post data from `?slug=` param (or empty for new post)
   - Passes data as props to React island

6. **Sidebar panel** (within React island)
   - Status selector (draft/published/archived)
   - Publish date picker
   - Author selector (staff + virtual authors)
   - Featured image picker
   - Categories multi-select + add new
   - Tags freeform with autocomplete
   - Excerpt textarea

7. **SEO panel** (collapsible, manual fields only — AI buttons added in Phase 7)
   - Meta title + character count
   - Meta description + character count
   - OG image override

8. **Actions:** Save Draft, Publish/Schedule, Preview

9. **Preview route** (`app/src/pages/blog/preview.astro`) — admin-only, renders draft as public would see it

### Verify
- Create a post with rich text, images, metadata
- Save draft, reload, content persists
- Publish, verify status change
- Schedule for future date, verify it stays draft publicly
- Preview works for authenticated admins

---

## Phase 4: Public Blog Pages

**Goal:** Visitors can read the blog.

### Tasks

1. **Blog listing** (`app/src/pages/blog/index.astro`) — replaces current 301 redirect
   - Paginated grid of published posts, newest first
   - Post cards: featured image, title, excerpt, author, date, reading time, category badges
   - Category and tag filter controls
   - Pagination (previous/next, page numbers)

2. **Blog post page** (`app/src/pages/blog/[slug].astro`)
   - Header: title, author + avatar, date, reading time, categories
   - Featured image hero
   - HTML body from TipTap
   - Social sharing: Facebook, X, email, copy link
   - Author bio block (staff → staff table, virtual → settings)
   - Related posts (2-3 from same categories)
   - "Back to Blog" link

3. **Add blog link to footer** in `Footer.astro`

4. **Remove legacy blog redirect** from `blog.astro` and `blog/[slug].astro`

### Verify
- `/blog` shows published posts, not drafts or future-scheduled
- Individual posts render correctly
- Category/tag filtering works
- Social sharing buttons work
- Author bio shows correctly for both staff and virtual authors
- Footer link present

---

## Phase 5: Ticker System

**Goal:** Configurable ticker on homepage and header.

### Tasks

1. **Ticker API** (`app/src/pages/api/admin/ticker.ts`)
   - GET/POST for ticker items in settings table (`ticker_items` key)
   - Max 5 items enforcement
   - Expiry filtering

2. **Ticker admin page** (`app/src/pages/admin/ticker.astro`)
   - Ordered list, drag to reorder (small React island or `@dnd-kit/core`)
   - Add item: headline, link browser (posts/announcements/custom URL), type auto-detect, expiry date
   - Warning at 3+ items
   - Enable/disable toggle

3. **Homepage ticker component** (`app/src/components/HomepageTicker.astro`)
   - Prominent section, auto-advance, pause on hover
   - Type indicators (Blog Post, Announcement, Update)

4. **Header ticker component** (`app/src/components/HeaderTicker.astro`)
   - Compact strip, rotates through items
   - Rendered on all pages except homepage (conditional in `Layout.astro`)

5. **Shared ticker logic**
   - Filter expired items, empty-state handling (don't render)

### Verify
- Admin can manage ticker items (add, remove, reorder, set expiry)
- Warning appears at 3 items
- Homepage shows prominent ticker
- Other pages show header strip
- Expired items auto-hide
- Empty ticker = no render

---

## Phase 6: AI Service & Voice System

**Goal:** AI infrastructure works, voice system is configurable.

### Tasks

1. **Encryption utility** (`app/src/lib/crypto.ts`)
   - `encrypt(plaintext)` / `decrypt(ciphertext)` using AES-256-GCM
   - Key from `ADMIN_ENCRYPTION_KEY` env var
   - Storage format: `enc:<iv>:<authTag>:<ciphertext>` (base64)

2. **Admin settings facade** (`app/src/lib/db/admin-settings.ts`)
   - `getAdminSetting(key)` / `setAdminSetting(key, value, opts)` 
   - Auto-encrypt/decrypt when `is_sensitive=true`
   - Add `db.adminSettings` to facade

3. **API key management UI** in `/admin/settings`
   - Masked display, set/update/clear Anthropic API key
   - Stored via admin settings facade with `is_sensitive=true`

4. **Add `@anthropic-ai/sdk` to Rollup externals** in `astro.config.mjs`

5. **AI service layer** (`app/src/lib/ai/`)
   - `service.ts` — loads voice config, assembles system prompt, calls Claude API
   - `voice.ts` — corpus management, prompt assembly from corpus + rules + anti-patterns
   - `prompts.ts` — prompt templates for each action type (rewrite, headline, excerpt, draft, SEO)
   - `style-profile.ts` — compute readability metrics from corpus texts
   - Model selection: Haiku for inline edits, Sonnet for longer generations
   - Error handling: 401 (invalid key), 429/529 (rate limited), timeout (30s AbortController)
   - Streaming support for draft generation

6. **AI API routes** (`app/src/pages/api/admin/ai/`)
   - `POST /api/admin/ai/generate` — general AI endpoint (action type + context)
   - `POST /api/admin/ai/rewrite` — inline text transformation
   - `GET/POST /api/admin/ai/voice` — voice config CRUD

7. **Voice system admin UI** (new section in `/admin/settings`)
   - Reference corpus: list view, add (paste text / paste URL / upload), remove
   - URL extraction: use `@extractus/article-extractor` (add to Rollup externals)
   - Style profile display (read-only computed metrics)
   - Anti-pattern blocklist: list with add/remove
   - Voice instructions: ordered list with add/remove/drag-to-reorder

8. **Seed curated corpus** — ~20 writing samples from quality Montessori/education content

9. **Auto-corpus integration** — published blog posts auto-enter corpus, admin can remove

### Verify
- API key stored encrypted, decrypted at request time
- AI service returns responses with voice styling applied
- Anti-patterns detected and rewritten in output
- Voice instructions reflected in AI output
- Style profile computes and displays correctly
- URL extraction works for common article sites
- Graceful degradation when API key not set (AI features hidden/disabled)

---

## Phase 7: AI Editor Integration

**Goal:** All AI features live in the post editor.

### Tasks

1. **TipTap AI bubble menu extension**
   - On text selection → floating toolbar: rewrite, simplify, shorten, expand, change tone
   - Calls `/api/admin/ai/rewrite` with selected text + full post context
   - Replaces selection inline, undo via editor history
   - Loading state while AI responds

2. **AI assistant panel** (collapsible in editor sidebar)
   - Suggest headline: 2-3 options as selectable cards with rationale
   - Generate excerpt from body
   - Generate first draft from topic/bullet points
   - Suggest categories/tags from content

3. **SEO AI buttons** (added to Phase 3's SEO panel)
   - Meta title: AI generates 2-3 options with keyword/search rationale
   - Meta description: 2-3 options with CTR reasoning
   - Category/tag suggestions with SEO context
   - Each option is a selectable card with explanation

4. **Anti-pattern post-processing** — AI output checked against blocklist before presenting

### Verify
- Select text → floating toolbar appears → rewrites work
- Panel actions generate useful suggestions
- SEO suggestions include rationale
- Voice styling consistent across all AI modes
- Undo works after AI replacement
- Graceful handling when AI service is unavailable

---

## Phase 8: SEO, Feeds & Content Migration

**Goal:** RSS, structured data, sitemap, and legacy content migrated.

### Tasks

1. **RSS feed** (`app/src/pages/blog/rss.xml.ts`)
   - Custom Astro endpoint generating RSS 2.0 XML
   - 20 most recent published posts
   - Auto-discovery `<link>` tag in site `<head>`

2. **JSON-LD Article structured data** on `/blog/[slug]`
   - headline, author, datePublished, dateModified, image, publisher

3. **Sitemap integration** — ensure published blog posts are dynamically included

4. **Content migration script** (`app/scripts/migrate-blog-posts.ts`)
   - Parse 6 markdown files from `app/src/content/blog/`
   - Convert markdown → HTML via `marked`
   - Insert into content table with `type='blog'`
   - Map frontmatter to JSONB schema, compute reading time
   - Set author to "Spicebush Official" virtual author

5. **Cleanup**
   - Remove `app/src/content/blog/` directory
   - Update `app/src/content/config.ts` (remove blog schema)

6. **Analytics integration**
   - Track `blog_post_view` events via existing analytics system
   - Display view counts per-post in admin dashboard

### Verify
- RSS feed validates (W3C Feed Validator)
- JSON-LD validates (Google Rich Results Test)
- Migrated posts appear correctly on public blog
- Old blog slugs still work (same slugs preserved)
- Sitemap includes blog posts
- Analytics events fire on post views

---

## New Dependencies

| Package | Purpose | License | Rollup External? |
|---------|---------|---------|-------------------|
| `@tiptap/react` | Editor React binding | MIT | No (client) |
| `@tiptap/starter-kit` | Core extensions (includes Link) | MIT | No (client) |
| `@tiptap/pm` | ProseMirror peer dep | MIT | No (client) |
| `@tiptap/extension-image` | Images | MIT | No (client) |
| `@tiptap/extension-bubble-menu` | Floating AI toolbar | MIT | No (client) |
| `@anthropic-ai/sdk` | Claude API | MIT | **Yes** |
| `@extractus/article-extractor` | URL text extraction | MIT | **Yes** |
| `text-readability-ts` | FK grade, sentence stats | MIT | No (server) |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Media picker not reusable as component | Phase 3 scope grows | Investigate early in Phase 3, extract if needed |
| TipTap image extension needs custom bridge to media picker | Phase 3 complexity | Budget extra time, prototype early |
| Encryption key loss = unrecoverable API key | AI features break | Document in runbook, key in Netlify env vars |
| URL extraction fails on paywalled/JS-heavy sites | Corpus gaps | Fallback: manual text paste always available |
| `type='blog'` vs `type='cms_blog'` confusion | Query bugs | Clean up `cms_blog` in Phase 1, standardize on `blog` |
| Scheduled posts need custom query logic | Posts appear early/late | Blog-specific query with `published_at <= NOW()` check |
| TipTap can't be SSR'd | Hydration errors | Use `client:only="react"` not `client:load`; pass `immediatelyRender: false` to `useEditor` |
| Anti-pattern detection false positives | Good writing rejected | Admin can remove entries from blocklist |

---

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Blog storage | Existing `content` table | No new tables, existing patterns, sufficient for scale |
| Editor | TipTap (MIT core) | React-native, extensible, mature, free |
| Editor island | `client:only="react"` | TipTap needs DOM, can't SSR |
| AI models | Haiku (inline), Sonnet (generation) | Cost/quality tradeoff — ~$0.15-0.50/month |
| Scheduled publishing | Check on request (no cron) | `published_at <= NOW()` in query — simplest approach |
| API key encryption | AES-256-GCM, app-level | Existing `is_sensitive` column, no DB crypto needed |
| Voice corpus bootstrap | Curated external samples | Existing site content was outsourced, not authentic |
| Newsletter | Deferred to #34 | Build blog first, integrate external service later |
