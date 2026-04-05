# Blog CMS Specification

*GitHub Issue: #33*
*Date: April 5, 2026*

---

## 1. Overview

An in-house blog CMS integrated into the existing admin panel, with AI-assisted writing and SEO tools powered by the school's own Claude API key. Includes a configurable homepage and header ticker for content discovery.

Newsletter functionality is out of scope (deferred to #34).

---

## 2. Data Model

### Blog Posts

Stored in the existing `content` table with `type='blog'`. No new tables needed.

The `data` JSONB column contains:

| Field | Type | Notes |
|-------|------|-------|
| `title` | string | Post title |
| `slug` | string | Auto-generated from title, editable |
| `body` | string | HTML output from TipTap editor |
| `excerpt` | string | Short summary for listings and social cards |
| `featured_image` | string | Media URL or slug from media library |
| `categories` | string[] | e.g., "School Life", "Montessori Philosophy" |
| `tags` | string[] | Freeform labels |
| `author_type` | "staff" \| "virtual" | Real person or virtual identity |
| `author_ref` | string | Staff slug or virtual author key |
| `seo_title` | string | Meta title override (defaults to title) |
| `seo_description` | string | Meta description override (defaults to excerpt) |
| `og_image` | string | OG image override (defaults to featured_image) |
| `published_at` | ISO string \| null | null = no schedule, future = scheduled |
| `reading_time_minutes` | number | Computed on save |

The existing `status` column on `content` handles `draft` / `published` / `archived`.

### Virtual Authors

Stored in the `settings` table under key `blog_virtual_authors` as a JSON array:

```json
[
  {
    "key": "spicebush-official",
    "name": "Spicebush Official",
    "bio": "News and updates from Spicebush Montessori School",
    "avatar": "/images/logo.png"
  }
]
```

Admins manage these in the settings panel. The author selector in the post editor combines staff profiles (from the staff table) and virtual authors into one dropdown.

### Ticker Items

Stored in `settings` under key `ticker_items` as a JSON array:

```json
[
  {
    "headline": "Snow Day Tomorrow — School Closed",
    "url": "/blog/snow-day-update",
    "type": "announcement",
    "expires_at": "2026-01-16T00:00:00Z",
    "order": 0
  }
]
```

Maximum 5 items. Admin UI warns at 3+ items.

---

## 3. Admin Panel

### Blog Dashboard (`/admin/blog`)

List view of all posts following existing admin module patterns (AdminLayout, server-rendered).

**Table columns:** title, author, status (draft / published / archived / scheduled), published date, categories.

**Controls:**
- Sort by date (default newest), status, title
- Filter by status, category, author
- Quick actions per row: edit, archive, delete
- Bulk actions: archive selected, delete selected
- "New Post" button

### Post Editor (`/admin/blog/edit`)

Accessed via "New Post" or clicking an existing post. URL: `/admin/blog/edit?slug=...`

**Main area — TipTap rich text editor (React island):**
- Standard formatting: headings, bold, italic, lists, blockquotes, links
- Inline image insertion from media library
- On text selection: floating AI toolbar (rewrite, simplify, shorten, expand, change tone)
- AI operates on the selection, replaces inline, undo available

**Sidebar panel:**
- Status selector (draft / published / archived)
- Publish date picker (empty = immediate on publish, future = scheduled)
- Author selector (dropdown: staff members + virtual authors)
- Featured image picker (opens existing media library)
- Categories (multi-select from existing + add new inline)
- Tags (freeform tag input with autocomplete from existing tags)
- Excerpt (textarea — or generate with AI button)

**SEO panel (collapsible):**
- Meta title input with character count
  - AI button: generates 2-3 options with rationale (keyword targeting, local search, character optimization)
- Meta description input with character count
  - AI button: generates 2-3 options with rationale (click-through, keyword density, social preview)
- OG image override
  - AI button: suggests which image would perform best for social sharing
- Category/tag suggestions
  - AI button: suggests based on content with SEO reasoning

Each AI suggestion is presented as a selectable option with a brief explanation of its benefit. Admin clicks to accept, or ignores and writes their own.

**AI assistant panel (collapsible):**
- Suggest headline (2-3 options with rationale)
- Generate excerpt from body
- Generate first draft from topic/bullet points
- Suggest categories and tags from content

**Actions:**
- Preview button — opens post as visitors would see it in a new tab
- Save Draft button
- Publish button (or "Schedule" if future date is set)

### Ticker Management (`/admin/ticker`)

**Item list:**
- Ordered list of ticker items, max 5
- Warning message displayed when 3+ items: "Ticker works best with 3 or fewer items — visitors may not see all 5"
- Each item shows: headline, link, type indicator, expiry date
- Drag to reorder
- Add/remove items

**Add item form:**
- Headline text (required)
- Link: browse blog posts, browse announcements, or enter custom URL
- Type: auto-detected from link source (Blog Post, Announcement, Update, Custom)
- Expires at: optional date picker — item auto-removes from public display after this date
- Toggle: enable/disable the entire ticker

**Empty state:** when no items exist or all have expired, ticker sections don't render.

---

## 4. Public Pages

### Blog Listing (`/blog`)

Paginated grid of published posts, newest first.

**Each post card:** featured image, title, excerpt, author name, date, reading time, category badges.

**Filtering:**
- Category filter (click a category to see only those posts)
- Tag filter (click a tag to filter)

**Pagination:** previous/next controls with page numbers.

### Individual Post (`/blog/[slug]`)

**Header:** title, author name + avatar/photo, published date, reading time, category badges.

**Featured image** displayed as hero or top image.

**Body:** rendered HTML from TipTap.

**Social sharing buttons:** Facebook, X/Twitter, email, copy link.

**Author bio block** at bottom: for staff authors, pulls bio and photo from staff table. For virtual authors, uses the bio and avatar from settings.

**Related posts:** 2-3 posts from the same categories, displayed at the bottom.

**Navigation:** "Back to Blog" link.

### RSS Feed (`/blog/rss.xml`)

Standard RSS 2.0 feed with the 20 most recent published posts. Includes title, excerpt, link, author, published date, and categories.

Auto-discoverable via `<link rel="alternate" type="application/rss+xml">` in the site `<head>`.

### Site Navigation

- **Header:** No blog link. Ticker strip (small, rotating) in header area on every page except homepage.
- **Homepage:** Dedicated, more prominent ticker section replaces the header ticker.
- **Footer:** Blog link added to footer navigation.

---

## 5. Ticker Display

### Homepage Ticker Section

- Prominent content section on the homepage (not a thin bar — a visible area)
- Cycles through curated items with auto-advance
- Pauses on hover
- Each item: headline text with type indicator (Blog Post, Announcement, Update), linked

### Header Ticker (All Pages Except Homepage)

- Small strip in the header area (below or above main nav)
- Same content source as homepage ticker
- Compact single-line display, rotates through items
- Subtle — doesn't compete with page content

### Shared Behavior

- One admin-managed list powers both presentations
- Items with `expires_at` in the past are excluded from display
- Type indicators: small visual cue (icon or label) distinguishing content types
- When no active items exist, ticker sections don't render
- Maximum 5 items enforced in admin UI

---

## 6. SEO & Discoverability

**Per-post (managed in editor sidebar):**
- Meta title — editable, defaults to post title, AI-assisted with 2-3 options + rationale
- Meta description — editable, defaults to excerpt, AI-assisted with 2-3 options + rationale
- OG image — defaults to featured image, overridable
- Canonical URL — auto-generated (`/blog/[slug]`), overridable
- JSON-LD Article structured data — auto-generated from post metadata (headline, author, datePublished, dateModified, image, publisher)

**Sitemap:** published blog posts auto-included. Drafts and archived posts excluded.

**RSS:** `/blog/rss.xml` as described in Section 4.

---

## 7. AI Writing & Voice System

### Architecture

All AI features call a single internal service that:
1. Loads the voice configuration (corpus-derived profile, anti-patterns, voice instructions, few-shot examples)
2. Prepends it as system context to every Claude API request
3. Sends the request using the admin's configured Anthropic API key
4. Returns the response to the UI

The Anthropic API key is stored in the `admin_settings` table (`is_sensitive=true`) with application-level encryption before writing to the database. Decrypted only at request time in memory.

### Three AI Interaction Modes

**1. In-editor contextual AI (selection-based):**
- Admin selects text in TipTap → floating toolbar appears
- Actions: rewrite, simplify, shorten, expand, change tone
- AI operates on the selected text only
- Result replaces the selection inline
- Undo available via editor history

**2. Panel-level AI (whole-post actions):**
- Suggest headline: 2-3 options with rationale
- Generate excerpt from post body
- Generate first draft from topic or bullet points
- Suggest categories and tags based on content

**3. SEO AI (per-field in SEO panel):**
- Each SEO input has an AI button
- Generates 2-3 options per field
- Each option includes a brief explanation of its benefit (keyword targeting, local search optimization, social click-through, character length)
- Admin clicks to select or writes their own

### Voice System (`/admin/settings` — AI Voice section)

**Reference Corpus:**
- List of writing samples that shape the AI voice
- Add samples: paste text, paste a URL (system extracts article text), or upload a document
- Remove individual samples
- Seeded at launch with ~20 curated samples from quality Montessori and education writing (real human writing, not AI-generated)
- As the school publishes and edits posts, their published content gradually enters the corpus automatically. Admins can remove any auto-added entry they don't want influencing voice.

**Style Profile (read-only, auto-derived):**
- Displays current targets computed from the corpus: average sentence length, Flesch-Kincaid reading level, personal pronoun ratio, vocabulary range, paragraph length
- Re-computed whenever the corpus changes
- Shown in the admin UI so staff understand what the AI is aiming for

**Anti-Pattern Blocklist:**
- List of AI-isms the system actively avoids
- Seeded with defaults: "delve", "tapestry", "landscape", "it's important to note", excessive em dashes, lists of three adjectives, "whether you're a... or a..." constructions
- Admin can add or remove entries
- System detects these in AI output and rewrites before presenting to the user

**Voice Instructions (structured rule list):**
- Each instruction is a discrete line item (not a freeform textarea)
- Add new rule (text input + add button)
- Delete individual rules
- Drag to reorder (higher rules take precedence if they conflict)
- Examples: "Say 'families' not 'parents'", "Never use 'daycare'", "Use 'guide' not 'teacher' when discussing Montessori philosophy"
- Plain English — no prompt engineering knowledge required

**Few-Shot Example Selection:**
- On each AI request, the system auto-selects 3-5 corpus samples most relevant to the content being written
- Selection is based on topic similarity (categories, keywords)
- These are included as few-shot examples in the prompt

---

## 8. Integration with Existing Systems

**Media library:** blog editor uses the existing media upload and picker for featured images and inline images.

**Staff table:** staff authors pull their name, bio, and photo from the existing staff management system.

**Analytics:** blog post views tracked via the existing `analytics_events` table (`event_name='blog_post_view'`, `page_path='/blog/[slug]'`). View counts displayable per-post in admin dashboard.

**Announcements:** ticker can link to announcements. The announcement system remains separate — the ticker is the bridge between announcements and the blog for public visibility.

**Existing blog content:** the 6 markdown files in `app/src/content/blog/` will be migrated to the `content` table as part of implementation. The Astro content collection blog files can then be removed.

---

## 9. Out of Scope

- Newsletter / subscriber management (deferred to #34)
- Email distribution of blog posts (deferred to #34)
- Mailing list signup forms (deferred to #34)
- Comments on blog posts
- Multi-author collaboration / edit locking
- Blog post versioning / revision history
- Internationalization
