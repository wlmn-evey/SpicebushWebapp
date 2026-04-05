# Authentication Specification

## Overview

The admin panel uses a custom magic-link authentication flow with database-backed sessions. There is no public user authentication -- only school administrators can log in.

An Auth0 provider abstraction exists as a legacy path but is not active in production. The magic-link flow is the sole active authentication mechanism.

## Auth Flow

1. Admin visits `/auth/sign-in`.
2. Enters their email address into the form.
3. Form POSTs to `/api/auth/request-link`.
4. The endpoint first checks `isAllowedAdminLoginEmail()` -- a hardcoded domain allowlist (`spicebushmontessori.org`, `eveywinters.com`). If the domain is not allowed, the request is rejected with an `invalid-domain` error.
5. `requestAdminMagicLink()` then checks `isAdminEmail()`, which layers configurable allow-lists (ADMIN_EMAILS env var, ADMIN_DOMAINS env var) on top of the hardcoded domain check.
6. Rate limiting is evaluated: max 5 token requests per email within a 5-minute window, counted from the `admin_login_tokens` table.
7. A 32-byte random token is generated, SHA-256 hashed, and the hash is stored in the `admin_login_tokens` table with a 15-minute expiration.
8. A magic-link email is sent via the configured email provider. The link points to `/auth/login?token=<raw-token>` (with an optional `next` param for post-login redirect).
9. Admin clicks the link. The `/auth/login` page calls `consumeAdminMagicLink()`.
10. The system validates the token within a database transaction: hashes the provided token, matches against `admin_login_tokens` where `used_at IS NULL` and `expires_at > now()`. On match, sets `used_at = now()` (single-use enforcement).
11. A new session is created: a fresh 32-byte random token is generated, SHA-256 hashed, and stored in `admin_auth_sessions` with a 12-hour expiration.
12. The raw session token is set as the `sbms-admin-session` cookie.
13. Admin is redirected to the original destination (from the `next` param) or `/admin`.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth/admin-session.ts` | Session lifecycle: magic link request/consume, session create/validate/revoke |
| `src/lib/auth/provider.ts` | Auth provider abstraction (`netlify-magic-link` vs `auth0`) |
| `src/lib/auth/auth0.ts` | Legacy Auth0 provider (login request, code exchange, logout URL) |
| `src/lib/admin-config.ts` | Admin email/domain allow-list checking |
| `src/middleware.ts` | Auth enforcement in request pipeline |
| `src/pages/auth/sign-in.astro` | Sign-in page with email form (or Auth0 button if enabled) |
| `src/pages/auth/login.astro` | Magic link verification endpoint (consumes token, sets cookie) |
| `src/pages/auth/logout.astro` | Logout: revokes session, deletes cookie, redirects |
| `src/pages/auth/callback.astro` | Auth0 OAuth callback (legacy) |
| `src/pages/auth/start.astro` | Auth0 login initiation (legacy) |
| `src/pages/api/auth/request-link.ts` | POST endpoint for requesting a magic link |
| `src/pages/api/auth/check.ts` | GET endpoint to verify current auth status |

## Session Management

### Cookie

- **Name**: `sbms-admin-session`
- **HttpOnly**: true
- **SameSite**: lax (required because magic-link sign-in arrives via cross-site navigation from email clients)
- **Secure**: true when served over HTTPS
- **Max-Age**: 43200 seconds (12 hours, matching `SESSION_TTL_HOURS`)

### Session Storage

Sessions are stored in the `admin_auth_sessions` table. The raw session token is never persisted -- only the SHA-256 hash.

Columns: `id`, `session_hash`, `email`, `ip_address`, `user_agent`, `created_at`, `last_seen_at`, `expires_at`, `revoked_at`.

### Session Touch

To avoid unnecessary writes, `last_seen_at` is only updated if more than 15 minutes have elapsed since the last touch (`SESSION_TOUCH_INTERVAL_MINUTES`).

### Session Validation

On every request, the middleware:

1. Reads the `sbms-admin-session` cookie.
2. Calls `validateAdminSession()` which hashes the token, queries `admin_auth_sessions` for a matching row that is not revoked and not expired.
3. Re-checks `isAdminEmail()` on the session's email. If the email has been removed from the allow-list since the session was created, the session is revoked immediately.
4. Sets `locals.isAdmin`, `locals.userId` (the session row ID), and `locals.userEmail` for downstream use.

### Logout

`/auth/logout` revokes the session in the database (`revoked_at = now()`), deletes the cookie, and redirects to `/auth/sign-in?notice=signed-out`. If Auth0 provider is active, it redirects through Auth0's logout URL first.

## Protected Routes

These route prefixes require a valid admin session:

- `/admin` (and all sub-paths)
- `/api/admin` (and all sub-paths)
- `/api/cms` (and all sub-paths)
- `/api/media/upload`
- `/api/storage/stats`

Route matching uses exact prefix comparison: a pathname must equal the prefix or start with `{prefix}/`.

## Middleware Behavior

The middleware distinguishes between API routes and page routes, and between unauthenticated and unauthorized (authenticated but not admin) requests:

| Condition | API Route | API Route (Accept: text/html) | Page Route |
|-----------|-----------|-------------------------------|------------|
| Unauthenticated | 401 JSON `{"error": "Authentication required"}` | Redirect to `/auth/sign-in?next=...` | Redirect to `/auth/sign-in` |
| Authenticated but not admin | 403 JSON `{"error": "Admin access required"}` | Redirect to `/auth/sign-in?error=not-authorized` | Redirect to `/` |

If authenticated and authorized, the middleware sets locals and proceeds to the coming-soon gate, then the camp mode handler, then page rendering.

## Admin Configuration

### Hardcoded Domain Allowlist (isAllowedAdminLoginEmail)

A non-configurable set of domains that are permitted to even attempt login:

- `spicebushmontessori.org`
- `eveywinters.com`

This acts as a safety net so magic links are never sent to unexpected domains, regardless of ADMIN_EMAILS/ADMIN_DOMAINS configuration.

### Configurable Allow-Lists (isAdminEmail)

Layered on top of the hardcoded domain check:

- **ADMIN_EMAILS**: comma-separated list of explicitly allowed email addresses. Defaults to `admin@spicebushmontessori.org`, `director@spicebushmontessori.org`, `evey@eveywinters.com`.
- **ADMIN_DOMAINS**: comma-separated list of allowed email domains. Defaults to `spicebushmontessori.org`.

Both checks must pass: the email's domain must be in the hardcoded allowlist AND the email must match either the ADMIN_EMAILS list or the ADMIN_DOMAINS list.

### Development Allowlist

In non-production environments (`NODE_ENV !== 'production'`):

- The domain `spicebushmontessori.test` is added to `isAllowedAdminLoginEmail`.
- The email `admin@spicebushmontessori.test` is unconditionally allowed by `isAdminEmail`.

## Security Properties

- **Token hashing**: Both magic-link tokens and session tokens are SHA-256 hashed before storage. Raw tokens are never persisted in the database.
- **Single-use tokens**: Magic-link tokens are marked as used (`used_at`) atomically within a transaction when consumed. A token that has already been used cannot be reused.
- **Token expiration**: Magic-link tokens expire after 15 minutes (`MAGIC_LINK_TTL_MINUTES`). Sessions expire after 12 hours (`SESSION_TTL_HOURS`).
- **Rate limiting**: Per-email rate limit of 5 magic-link requests within a 5-minute window, enforced by counting rows in `admin_login_tokens`.
- **Transactional token consumption**: Token validation and session creation happen within a single database transaction to prevent race conditions.
- **Session revocation on allow-list change**: If an admin's email is removed from the allow-list, their existing session is revoked on the next validation attempt.
- **Open redirect prevention**: The `next` parameter is validated to ensure it starts with `/` and does not start with `//`.

### Known Audit Findings

- **P3**: Development backdoor exists tied to `NODE_ENV` (`admin@spicebushmontessori.test` bypasses all checks in non-production).
- **P3**: Email enumeration is possible via the `/api/auth/request-link` response -- the `invalid-domain` error reveals whether a domain is in the allowlist. (The JSON response for allowed emails uses a generic message to partially mitigate this.)

## Auth Provider Abstraction

`src/lib/auth/provider.ts` exports `getAdminAuthProvider()` which returns either `netlify-magic-link` or `auth0`.

Provider selection logic:
1. If `AUTH_PROVIDER` env var is set to `netlify-magic-link` or `auth0`, use that value.
2. If `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` are all present, use `auth0`.
3. Otherwise, default to `netlify-magic-link`.

The Auth0 provider code in `src/lib/auth/auth0.ts` is fully implemented (login request creation, authorization code exchange with PKCE/nonce validation via `jose`, logout URL construction) but is not active in production. It is residual from a prior migration (P3-13 audit finding).

When Auth0 is active, the sign-in page shows a "Continue with Auth0" button instead of the email form. The Auth0 flow goes through `/auth/start` -> Auth0 authorize -> `/auth/callback` -> session creation via `createAdminSession()`.

## Database Tables

- **admin_login_tokens** -- one-time magic link tokens (columns: email, token_hash, requested_ip, user_agent, created_at, expires_at, used_at)
- **admin_auth_sessions** -- active and historical sessions (columns: id, session_hash, email, ip_address, user_agent, created_at, last_seen_at, expires_at, revoked_at)

See `specs/data-model.md` for full schema details.

## Constants Reference

| Constant | Value | Location |
|----------|-------|----------|
| `MAGIC_LINK_TTL_MINUTES` | 15 | admin-session.ts |
| `MAGIC_LINK_RATE_LIMIT_WINDOW_MINUTES` | 5 | admin-session.ts |
| `MAGIC_LINK_RATE_LIMIT_MAX` | 5 | admin-session.ts |
| `SESSION_TTL_HOURS` | 12 | admin-session.ts |
| `SESSION_TOUCH_INTERVAL_MINUTES` | 15 | admin-session.ts |
| `ADMIN_SESSION_COOKIE_NAME` | `sbms-admin-session` | admin-session.ts |
| `AUTH0_STATE_TTL_SECONDS` | 600 (10 min) | auth0.ts |
