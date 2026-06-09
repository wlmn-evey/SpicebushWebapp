# API Specification

Spicebush Montessori School -- Astro 5 SSR on Netlify.

All endpoints live under `app/src/pages/api/`. Astro file-based routing maps exported
HTTP-method functions (`GET`, `POST`, `PUT`, `DELETE`) to the corresponding methods
on the URL derived from the file path.

---

## Auth Model

Authentication uses magic-link admin sessions. The middleware
(`src/middleware.ts`) validates the `sbms-admin-session` cookie on every request
and populates `locals.userId`, `locals.userEmail`, and `locals.isAdmin`.

### Protected route prefixes (middleware-enforced)

| Prefix              | Gate        |
|---------------------|-------------|
| `/admin`            | Admin only  |
| `/api/admin`        | Admin only  |
| `/api/cms`          | Admin only  |
| `/api/media/upload` | Admin only  |
| `/api/storage/stats`| Admin only  |

Unauthenticated requests to protected API routes receive `401`; authenticated
non-admins receive `403`. Browser requests (Accept: text/html) are redirected to
`/auth/sign-in` instead.

Many admin endpoints also perform a secondary `checkAdminAuth()` call inside the
handler as defense-in-depth.

---

## Public Endpoints

### `GET /api/health`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/health.ts` |

Health check. Pings the database with a 5-second timeout and returns service
status, response time, and environment label. Returns `200` when healthy, `503`
when unhealthy.

---

### `POST /api/contact/submit`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/contact/submit.ts` |

Unified contact form handler for multiple sources: `contact`, `coming-soon`,
`camp`, and `tour`. Accepts `multipart/form-data` or
`application/x-www-form-urlencoded`.

Protections:
- Honeypot field (`bot-field`)
- Minimum submission time check (`submission-started-at`)
- Cloudflare Turnstile CAPTCHA verification
- IP + email rate limiting (via `checkContactSubmissionRateLimit`)

Stores submission in `contact_submissions` table, fires an analytics event, and
sends notification + confirmation emails. Supports both redirect-based (HTML
form) and JSON response modes.

`GET` on this path redirects to `/contact` (logged as a warning).

---

### `POST /api/schedule-tour`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/schedule-tour.ts` |

JSON-only tour scheduling endpoint. Accepts `parentName`, `email`, `phone`,
`childAge`, `preferredTimes`, `questions`.

Same protections as `/api/contact/submit`: honeypot, timing check, Turnstile,
rate limiting. Stores as a contact submission with `tourInterest: true`, fires a
`tour_request_submit` analytics event, and sends notification emails.

---

### `POST /api/analytics/track`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/analytics/track.ts` |

Records a client-side analytics event. JSON body with `eventName` (required,
regex-validated), plus optional `eventCategory`, `pagePath`, `sessionId`, etc.

Returns `204` on success.

**Rate limiting** (P1-3 fix): In-memory IP-based rate limiter -- 100 events per
IP per 60-second window. Returns `429` with `Retry-After: 60` when exceeded.
Resets on cold start (acceptable for serverless).

`GET` returns `405 Method Not Allowed`.

---

### `POST /api/donations/checkout`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/donations/checkout.ts` |

Creates a Stripe Checkout session for one-time or monthly donations. JSON body
with `amount` ($1--$100,000) and `frequency` (`one-time` | `monthly`).

Falls back to a DB-configured external donation link when Stripe keys are
missing or the Stripe API fails. Returns `503` when no payment path is
available.

---

### `GET /api/media/blob/[...key]`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/media/blob/[...key].ts` |

Serves a stored media blob by its storage key. Returns the binary content with
appropriate `Content-Type`, long-lived `Cache-Control`, and `X-Content-Type-Options: nosniff`.

**SVG security headers** (audit fix): SVGs are served with
`Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'` and
`Content-Disposition: attachment` to prevent XSS via uploaded SVGs.

---

### `GET /api/media/render`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/media/render.ts` |

On-the-fly image crop and resize proxy using Sharp. Query parameters:
- `src` -- source image path (must start with `/images/`, `/uploads/`, or `/api/media/blob/`, or be a same-origin/approved absolute URL)
- `x`, `y`, `w`, `h` -- crop region in percentages (0--100)
- `ow`, `oh` -- output pixel dimensions (120--2400)
- `q` -- quality (40--95, default 82)
- `fm` -- output format (`webp` | `jpg` | `png`)

Falls back to passthrough if Sharp is unavailable or transformation fails.
Immutable cache headers on success.

---

### `POST /api/webhooks/stripe`

| Property | Value |
|----------|-------|
| Auth     | Stripe signature (HMAC) |
| File     | `api/webhooks/stripe.ts` |

Stripe webhook receiver. Verifies the `stripe-signature` header using
`STRIPE_WEBHOOK_SECRET` with timing-safe comparison and a 300-second timestamp
tolerance.

Delegates to `handleStripeDonationWebhook()` for donation thank-you email
processing. Returns `503` if the webhook secret is not configured.

**Audit note (P1-2)**: Originally the Netlify form webhook was unauthenticated;
this Stripe webhook now uses proper HMAC signature verification.

---

## Auth Endpoints (`/api/auth/*`)

These are **not** behind the middleware's protected prefix list -- they must be
accessible to unauthenticated users.

### `POST /api/auth/request-link`

| Property | Value |
|----------|-------|
| Auth     | Public |
| File     | `api/auth/request-link.ts` |

Requests a magic-link sign-in email. Accepts form-encoded or JSON body with
`email`. Validates against an allowlist of admin email domains
(`isAllowedAdminLoginEmail`). For disallowed domains: JSON requests receive a
`403` with a domain-specific error message; form requests are redirected with an
`invalid-domain` error query parameter. This is a known enumeration vector
(P3 audit finding) since the response distinguishes allowed from disallowed
domains.

Rejects with `400` if Auth0 provider is enabled (magic links disabled).

---

### `GET /api/auth/check`

| Property | Value |
|----------|-------|
| Auth     | Public (returns auth status) |
| File     | `api/auth/check.ts` |

Returns `{ authenticated: true }` with `200` if the caller has a valid admin
session, `401` if unauthenticated, `403` if authenticated but not admin.

---

## Admin Endpoints (`/api/admin/*`)

All endpoints in this section are protected by the middleware (require valid
admin session + admin email). Most also call `checkAdminAuth()` internally as
defense-in-depth.

### `GET | POST /api/admin/announcements`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/announcements.ts` |

**GET**: Returns all announcement and schedule exception admin data.

**POST**: Action-based dispatch via `body.action`:
- `create-announcement`, `save-announcement`, `delete-announcement`
- `create-exception`, `save-exception`, `delete-exception`
- `save-announcement-email-settings`
- `send-announcement-email-now`
- `schedule-announcement-email-reminder`
- `run-announcement-email-jobs`
- `cancel-announcement-email-job`

Supports both JSON and form-data bodies. Optional `redirectTo` for form-based
workflows (returns 303 redirect with status query param).

---

### `GET | POST /api/admin/camp`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/camp.ts` |

**GET**: Returns camp admin data (seasons, weeks, variants).

**POST**: Action-based dispatch:
- `create-season`, `save-season`
- `create-week`, `save-week`, `delete-week`
- `adjust-seats` (with quick-action presets: `increase` / `decrease`)
- `save-variants`

---

### `GET /api/admin/contact-submissions-export`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/contact-submissions-export.ts` |

Exports contact submissions as CSV. Query parameters: `q` (search), `tour`
(`yes`/`no` filter).

**Audit note (P2-5)**: Hard cap of 5,000 rows per export. CSV values are
sanitized against formula injection (CWE-1236) by prefixing formula-trigger
characters.

---

### `POST | DELETE /api/admin/content`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/content.ts` |

Generic content upsert/delete for allowed collections: `hours`, `staff`,
`tuition`, `settings`, `school-info`, `photos`, `faq`, `testimonials`,
`media-slots`, `blog`.

**POST**: Upserts a content entry by `(collection, slug)`. Slug is validated
(`[a-z0-9-_]+`). Supports `dataJson`, `baseDataJson`, and `data.*` form fields.
Collection-specific normalization for `faq`, `testimonials`, and `blog`.

**DELETE**: Removes a content entry by `(collection, slug)`.

Invalidates the relevant cache namespace on success.

**Origin check (defense-in-depth CSRF)**: every POST is rejected with `403`
("Cross-site request rejected") when the `Origin` header is present and does not
match the request origin, OR when `Sec-Fetch-Site: cross-site` is sent. The check
**fails open** when both headers are absent (rejecting only on positive cross-site
evidence). `SameSite=Lax` cookies remain the primary CSRF defense; this hardens all
admin collection POSTs.

**`_raw` field suffix**: a `data.*_raw` form field bypasses `parseSimpleValue`
type-coercion (and the implicit trim) and is stored as the raw string under the
key with `_raw` stripped (e.g. `data.body_raw` → `data.body`). Used by the blog
form for `data.body_raw` and `data.excerpt_raw`; follows the existing `_csv` /
`_lines` convention.

**`createOnly` flag**: when truthy, the upsert becomes insert-only
(`INSERT … ON CONFLICT (type, slug) DO NOTHING`) and the result `rowCount` is
checked. A conflict (`rowCount === 0`) returns `400` ("A post with this address
already exists…") and leaves the existing row untouched. When falsy, the normal
`ON CONFLICT … DO UPDATE` upsert runs. Used by the blog add-form to prevent
silently overwriting an existing post.

**Form-based delete (`action=delete`)**: a POST carrying `action=delete` runs the
same DELETE as the standalone `DELETE` export (allowlist + slug check + cache
invalidation) and responds via the shared response helper, so HTML form posts
receive a `303` redirect (with `redirectTo`) rather than a JSON body.

**`parseRedirectPath` hardening**: the `redirectTo` validator rejects
backslash-leading paths (`/\evil.com`) that browsers resolve off-site as
`//evil.com` — regex `^\/(?![/\\])`. It also rejects any value containing a
control character (`\x00`–`\x1f`, CR/LF included) so a `redirectTo` can never
carry a header-splitting payload regardless of which response branch sets the
`Location` header (defense-in-depth). A rejected `redirectTo` falls back to a JSON
response (no `303` to the unsafe path).

**Blog explicit-status requirement**: blog POSTs must carry a `status` of `draft`,
`published`, `scheduled`, or `archived` **explicitly** (Phase-2 four-state
lifecycle). A missing / empty / whitespace-only / unknown status is a `400`
("Status must be Draft, Published, Scheduled, or Archived"), checked first against
the raw form value — never silently defaulted to `published`. The
`status || 'published'` default still applies to all other collections. The
validated status is stored **lowercased** so a mixed-case input (e.g. `Published`)
cannot pass validation yet stay invisible behind the exact `status = 'published'`
read filter. A `scheduled` save additionally requires a future, zone-explicit
`data.publishedAt` (shared format contract in `blog-publish-schedule.ts`); a
`scheduled` post passes the full publish gate at save time.

---

### `GET | POST /api/admin/donations`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/donations.ts` |

**GET**: Returns donation admin data (templates, settings, recent events, jobs).

**POST**: Action-based dispatch:
- `save-donation-thank-you-settings`
- `save-donation-template` (keys: `one-time`, `recurring-start`, `recurring-renewal`)
- `send-donation-thank-you-now`
- `schedule-donation-email-reminder`, `schedule-donation-default-reminder`
- `run-donation-email-jobs`
- `cancel-donation-email-job`

---

### `GET | POST /api/admin/preview-mode`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/preview-mode.ts` |

Toggles the `sbms-preview-mode` cookie for admin coming-soon preview.

Accepts `mode` (`site` | `coming-soon`) and `redirect` via query params or form
body. Setting mode to `site` sets a 12-hour secure cookie; `coming-soon` deletes
it. Both `GET` and `POST` are handled identically.

---

### `GET | POST /api/admin/settings`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/settings.ts` |

**GET**: Returns all settings as a key-value map.

**POST**: Upserts one or more settings. Accepts JSON body (keys as object
properties) or form-data (single `key`/`value` pair, or multiple named fields).
Keys must match `[a-zA-Z0-9_]+`. Invalidates settings cache on success.

---

### `POST /api/admin/smart-adjust`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/smart-adjust.ts` |

AI-powered image placement suggestion. JSON body with `slotId`, `photoSlug`, and
optional `context` (viewport dimensions, overlap regions, etc.).

Provider cascade: Gemini (preferred) -> OpenAI -> heuristic fallback. Fetches
the actual image for vision-model analysis. Enforces portrait/landscape focal
point rules post-suggestion.

Always returns `200` with a suggestion (falls back to emergency defaults on
unrecoverable error) to ensure the admin UI never blocks.

---

### `GET | POST /api/admin/seo/ad-spend`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/seo/ad-spend.ts` |

**GET**: Returns ad spend summary, campaign value rows, and recent entries.
Query param `window` accepts `7`, `30`, or `90` days.

**POST**: Creates or deletes ad spend entries. Supports:
- JSON body with `entries` array for bulk insert
- Form-data with `csvData` for CSV import
- Form-data with individual fields for single entry
- Form-data with `action=delete` and `entryId` for deletion

---

### `GET | POST /api/admin/seo/config`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/seo/config.ts` |

**GET**: Returns global SEO settings and per-page overrides.

**POST**: Action-based dispatch:
- `save-global` -- updates default title, description, keywords, OG image,
  twitter card, noindex, robots disallow paths
- `save-page` / `clear-page` -- manages per-page SEO overrides (validates path
  is not `/admin` or `/api`)

---

### `POST /api/admin/seo/gemini-suggest`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/admin/seo/gemini-suggest.ts` |

Uses Gemini AI to generate SEO metadata suggestions for managed pages.

Actions:
- `apply-page` -- generates suggestion for a single page path
- `apply-all` -- generates suggestions for all managed pages (4 concurrent
  workers)

Self-fetches the target page HTML to extract signals (title, meta description,
headings, text snippet). Requires `GEMINI_API_KEY` environment variable.
Redirects to `/admin/seo` with status query params.

---

## CMS Endpoints (`/api/cms/*`)

All protected by middleware (admin only).

### `GET /api/cms/entries`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/cms/entries.ts` |

Lists content entries for a given `collection` (query param). Returns paginated
results with `total`, `page`, `pageSize`.

**Audit note (P2-4)**: Previously had no pagination. Now uses
`normalizePage` / `normalizePageSize` helpers with server-side defaults and caps.

---

### `GET | POST | PUT | DELETE /api/cms/entry`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/cms/entry.ts` |

Single content entry CRUD.

- **GET**: Fetches one entry by `collection` + `slug` query params.
- **POST / PUT**: Upserts an entry (PUT is aliased to POST). Accepts JSON or
  form-data.
- **DELETE**: Deletes an entry by `collection` + `slug` (from body or query
  params).

Allowed collections: `hours`, `staff`, `tuition`, `settings`, `school-info`,
`faq`, `testimonials`, `photos`, `media-slots`.

---

### `GET | DELETE /api/cms/media`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/cms/media.ts` |

- **GET**: Lists all media records (id, filename, url).
- **DELETE**: Deletes a media record by `id` (JSON body). Removes from both
  the database and the backing storage provider.

---

### `GET | PUT /api/cms/settings/[key]`

| Property | Value |
|----------|-------|
| Auth     | Admin only |
| File     | `api/cms/settings/[key].ts` |

- **GET**: Returns a single setting by key (dynamic route param). Key validated
  against `[a-zA-Z0-9_]+`. Returns `404` if not found.
- **PUT**: Upserts a single setting. JSON body is stored as the value.

---

## Media Endpoints (`/api/media/*`)

### `POST /api/media/upload`

| Property | Value |
|----------|-------|
| Auth     | Admin only (middleware + handler) |
| File     | `api/media/upload.ts` |

Multipart file upload. Validates file type and size via `validateFile()`.
Optionally creates a `photos` content entry when `createPhotoEntry` is set,
auto-generating framing defaults and a unique slug.

Accepted form fields: `file` (required), `title`, `slug`, `category`,
`createPhotoEntry`.

---

### `GET /api/media/blob/[...key]`

See [Public Endpoints](#get-apimediablobkey) above. This is publicly accessible
(no auth required).

### `GET /api/media/render`

See [Public Endpoints](#get-apimediarender) above. This is publicly accessible
(no auth required).

---

## Storage Endpoints (`/api/storage/*`)

### `GET /api/storage/stats`

| Property | Value |
|----------|-------|
| Auth     | Admin only (middleware + handler) |
| File     | `api/storage/stats.ts` |

Returns disk storage stats (`totalSize`, `fileCount` from `./public/uploads`)
and database media count (`dbCount`).

---

## Email Endpoints (`/api/email/*`)

### `GET | POST /api/email/send`

| Property | Value |
|----------|-------|
| Auth     | Admin only (handler-enforced, not in middleware prefix list) |
| File     | `api/email/send.ts` |

**POST**: Sends an email via the configured email service. JSON body with `to`,
`subject`, and `text` or `html` (required). Optional `from`, `fromName`,
`replyTo`.

**Audit note (P2-2)**: Error responses previously leaked internal error details.
Now returns generic `"Failed to send email"` on failure, with a separate
`"Internal error"` details field that does not expose provider specifics.

**GET**: Returns email service status -- which providers are configured and the
preferred provider.

**Note**: This endpoint is NOT in the middleware's protected prefix list but
enforces admin auth in the handler itself.

---

### `GET /api/test-email`

| Property | Value |
|----------|-------|
| Auth     | Admin only (handler-enforced) |
| File     | `api/test-email.ts` |

Sends a test email to a specified address (query param `email`, defaults to the
admin's email or `information@spicebushmontessori.org`). Returns send result,
provider info, and service status.

**Note**: Like `/api/email/send`, this is not in the middleware prefix list but
enforces admin auth in the handler.

---

## Audit Findings Summary

| ID   | Severity | Endpoint                              | Finding                                              | Status |
|------|----------|---------------------------------------|------------------------------------------------------|--------|
| P1-2 | P1       | `/api/webhooks/stripe`                | Netlify form webhook was unauthenticated              | Fixed -- HMAC signature verification added |
| P1-3 | P1       | `/api/analytics/track`                | No rate limiting on analytics endpoint                | Fixed -- IP-based rate limiter (100/min)   |
| P2-2 | P2       | `/api/email/send`                     | Error details leaked provider internals               | Fixed -- generic error messages            |
| P2-4 | P2       | `/api/cms/entries`                    | CMS entries listing had no pagination                 | Fixed -- server-side pagination added      |
| P2-5 | P2       | `/api/admin/contact-submissions-export` | Contact export returned unbounded results           | Fixed -- hard cap at 5,000 rows            |

---

## Endpoints Not in Middleware Protected List

The following endpoints enforce admin auth in their handlers but are **not**
covered by the middleware's `PROTECTED_PREFIXES` array:

- `/api/email/send` (GET + POST)
- `/api/test-email` (GET)

These rely solely on `checkAdminAuth()` in the handler. If handler-level auth
were accidentally removed, these would become publicly accessible. Consider
adding `/api/email` and `/api/test-email` to the middleware prefix list for
defense-in-depth.
