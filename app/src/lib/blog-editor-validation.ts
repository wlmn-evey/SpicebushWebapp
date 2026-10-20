/**
 * Client-safe blog authoring rules shared by the editor form (`blog-admin-client.ts`), the TipTap
 * link/image dialogs (`TipTapEditor.tsx`), and the server validator (`validateBlogData` in
 * `blog-content.ts`). One copy of each rule, so a post the client lets through is a post the server
 * accepts — a server `400` redirects to the list and the author loses every unsaved edit.
 *
 * Imports only `blog-html.ts` (the sanitizer's URI regexp + the dependency-free `<img>` alt
 * collector), which the editor island already bundles. It must NOT import `@lib/db` or `marked`.
 * The server stays the source of truth; these are the same predicates run earlier.
 */
import { STRICT_CONFIG_V2, collectHtmlImageAlts } from './blog-html';
import { isFutureScheduledPublishAt } from './blog-publish-schedule';

/** Slug charset + length (read-path trust boundary and write-path validator). */
export const SLUG_REGEX = /^[a-z0-9-_]{1,100}$/;

/** Legacy `YYYY-MM-DD-` slug namespace, reserved for the redirect fallback. */
export const DATE_PREFIXED_SLUG_REGEX = /^\d{4}-\d{2}-\d{2}-/;

/**
 * Featured-image URL scheme: HTTPS absolute OR a single-slash site-relative path that is NOT `//`
 * or `/\` (browsers parse `/\evil.com` as `//evil.com`). R2-F1/F7/R3-F2.
 */
export const IMAGE_SCHEME_REGEX = /^(\/(?![/\\])|https:\/\/)/;

/**
 * HTML `pattern` attribute values. Browsers compile `pattern` with the `v` flag
 * (`^(?:<pattern>)$`), where an unescaped `-` between class members and an unescaped `/` inside a
 * class are SYNTAX ERRORS — and a pattern that fails to compile is silently ignored, so the old
 * `[a-z0-9-_]+` / `(/(?![/\\]).*|https://.*)` gave no client validation at all. These are the same
 * rules with the reserved punctuators escaped (asserted by compiling under `v` in the test).
 */
export const SLUG_PATTERN_ATTR = String.raw`[a-z0-9\-_]+`;
export const IMAGE_URL_PATTERN_ATTR = String.raw`(\/(?![\/\\]).*|https:\/\/.*)`;

// imageAlt quality floors (R1-F37): not filename-like, not a single generic word.
const FILENAME_LIKE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const GENERIC_WORD_REGEX = /^(image|photo|picture)$/i;
export const IMAGE_ALT_MIN = 6;

/** Image description quality bar — callers pass the TRIMMED alt. */
export const isValidImageAlt = (alt: string): boolean =>
  alt.length >= IMAGE_ALT_MIN && !FILENAME_LIKE_REGEX.test(alt) && !GENERIC_WORD_REGEX.test(alt);

/** True when the render-time sanitizer (STRICT_CONFIG_V2) keeps this href. */
export const isSanitizerSafeHref = (url: string): boolean =>
  STRICT_CONFIG_V2.ALLOWED_URI_REGEXP.test(url);

/**
 * True when the sanitizer keeps this `<img src>` AND it is a real image address — https or
 * site-relative only (mailto:/tel: pass the href regexp but are not images; `data:` is rejected by
 * the sanitizer's hook and by `allowBase64:false`).
 */
export const isSanitizerSafeImageSrc = (url: string): boolean =>
  isSanitizerSafeHref(url) && IMAGE_SCHEME_REGEX.test(url);

// A scheme-less host such as `example.com`, `www.example.org/path?x=1`, `example.com:8443`: dotted
// labels ending in an alphabetic TLD. A trailing file extension (`page.html`, `photo.jpg`) is NOT a
// host — that is a relative path the author meant, so it is rejected rather than "upgraded".
const BARE_HOST_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?::\d+)?(?:[/?#]\S*)?$/i;
const FILE_EXTENSION_HOST_REGEX =
  /^[^/?#:]*\.(?:html?|php|aspx?|jpe?g|png|gif|webp|svg|pdf)(?:[/?#:]|$)/i;

export type EditorUrlResult =
  { ok: true; url: string; note?: string } | { ok: false; error: string };

/**
 * Normalize a URL typed into the link/image dialog to one the sanitizer will keep, or explain why
 * it can't. `http://…`, protocol-relative `//…`, and bare hosts (`example.com`) are UPGRADED to
 * `https://…` with a `note` the dialog shows; anything else the sanitizer would strip is an error.
 * Without this, an `http:` link/image was accepted by the editor and then silently vanished from the
 * published page (the sanitizer drops it).
 */
export function normalizeEditorUrl(raw: string, kind: 'link' | 'image'): EditorUrlResult {
  const value = raw.trim();
  const isSafe = kind === 'image' ? isSanitizerSafeImageSrc : isSanitizerSafeHref;
  if (value === '') {
    return {
      ok: false,
      error: kind === 'image' ? 'Enter the image address.' : 'Enter an address.'
    };
  }
  if (isSafe(value)) return { ok: true, url: value };

  let upgraded: string | null = null;
  if (/^http:\/\//i.test(value)) upgraded = `https://${value.slice('http://'.length)}`;
  else if (/^\/\/[^/\\]/.test(value)) upgraded = `https:${value}`;
  else if (BARE_HOST_REGEX.test(value) && !FILE_EXTENSION_HOST_REGEX.test(value))
    upgraded = `https://${value}`;

  if (upgraded && isSafe(upgraded)) {
    return {
      ok: true,
      url: upgraded,
      note: `Will be saved as ${upgraded} — only secure (https://) addresses are allowed.`
    };
  }
  return {
    ok: false,
    error:
      kind === 'image'
        ? 'Use an image address starting with https:// or / (an image on this site, e.g. /media/…).'
        : 'Use an address starting with https://, mailto:, tel:, or / (a page on this site).'
  };
}

export type BlogFormSnapshot = {
  status: string;
  /** The editable slug (new posts only); `null` when the form has no editable slug (edit mode). */
  slug: string | null;
  image: string;
  imageAlt: string;
  /** Body HTML from the editor's hidden field. */
  body: string;
  /** The zone-attached UTC instant the client wrote for a scheduled save ('' when none). */
  publishedAt: string;
};

/**
 * Pre-submit mirror of the `validateBlogData` rules most likely to bounce a save — slug shape, the
 * featured-image scheme/description, every body image's description, and "scheduled time in the
 * past". Returns a plain-language error or `null`. Native constraint validation (required/pattern/
 * minlength) still runs first for the cheap checks; the server remains the source of truth.
 */
export function validateBlogFormSnapshot(
  snapshot: BlogFormSnapshot,
  now: number = Date.now()
): string | null {
  const status = snapshot.status.trim().toLowerCase();
  const publishing = status === 'published' || status === 'scheduled';

  if (snapshot.slug !== null) {
    const slug = snapshot.slug.trim();
    if (!SLUG_REGEX.test(slug)) {
      return 'Web address must be 1–100 characters of lowercase letters, numbers, hyphens, or underscores.';
    }
    if (DATE_PREFIXED_SLUG_REGEX.test(slug)) {
      return "Web address can't start with a date (YYYY-MM-DD-) — dates are added automatically.";
    }
  }

  const image = snapshot.image.trim();
  const imageAlt = snapshot.imageAlt.trim();
  if (image && !IMAGE_SCHEME_REGEX.test(image)) {
    return 'Featured image address must start with https:// or / (an image on this site).';
  }
  if (image && imageAlt && !isValidImageAlt(imageAlt)) {
    return 'Featured image description must describe the picture — at least 6 characters, not a file name, and not just "photo", "image", or "picture".';
  }

  if (!publishing) return null;

  if (image && !imageAlt) {
    return 'Add a featured image description before publishing.';
  }
  const weakBodyImage = collectHtmlImageAlts(snapshot.body).some(
    img => !isValidImageAlt((img.alt ?? '').trim())
  );
  if (weakBodyImage) {
    return 'Every image in the post needs a description (at least 6 characters, not a file name or just "photo"). Click the image in the editor, delete it, and re-insert it with a description.';
  }
  if (
    status === 'scheduled' &&
    snapshot.publishedAt &&
    !isFutureScheduledPublishAt(snapshot.publishedAt, now)
  ) {
    return 'The "Go live on" time is in the past — pick a later time, or set Status to Published to publish now.';
  }
  return null;
}
