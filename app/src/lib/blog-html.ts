/**
 * Blog body HTML sanitizer — the render-time trust boundary for Blog V2 HTML storage (ADR-009).
 *
 * Under HTML storage, `data.body` is TipTap HTML and the render path is
 *   stored HTML → `renderBodyHtml` (DOMPurify STRICT_CONFIG_V2) → `.blog-body`.
 * Render-time sanitization stays the guard: every render re-sanitizes, so a write-path bug or a
 * config tightening can never serve stored XSS. `marked` no longer runs at render time (it survives
 * only inside the one-time markdown→HTML conversion migration).
 *
 * STRICT_CONFIG_V2 = V1 `STRICT_CONFIG` (blog-content.ts `renderPostBody`) + a BOUNDED delta for the
 * TipTap construct set. The `style` attribute stays BANNED (text-align is class-based, tables are
 * `resizable:false`); see `blog-editor-extensions.ts`.
 */
import DOMPurify from 'isomorphic-dompurify';

/** V1 baseline + bounded V2 delta. Used at EVERY blog-body render. */
export const STRICT_CONFIG_V2 = {
  ALLOWED_TAGS: [
    // V1 baseline (blog-content.ts renderPostBody — already includes the table family, del, br):
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'a',
    'ul',
    'ol',
    'li',
    'strong',
    'em',
    'b',
    'i',
    'blockquote',
    'code',
    'pre',
    'img',
    'hr',
    'br',
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    'del',
    // V2 delta:
    'u', // underline (first-class)
    's', // strike (TipTap normalizes <del>/<strike> to <s>)
    'colgroup',
    'col', // table column groups TipTap emits
    // PR B power tools (#114):
    'mark', // highlight — emitted with NO attributes
    'span' // brand text color — survives ONLY with an enumerated brand color class (see ALLOWED_CLASSES); bare otherwise
  ],
  // V1 baseline ['href','src','alt','title'] + V2 delta. NO 'id'. NO 'style' (text-align is class-based;
  // tables resizable:false). 'class'/'target'/'rel' are value-enumerated by the hook below; 'colwidth'
  // is deliberately ABSENT — resizable:false never emits it and ALLOWED_ATTR does no value validation (D1-F3).
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'target', 'rel', 'class', 'colspan', 'rowspan'],
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  // UNCHANGED from V1 — https/mailto/tel/site-relative allowed; NOT https-only (live posts carry
  // mailto:/tel: links — tightening this is forbidden, R3-F1). NOTE: this regexp gates href and
  // non-image src, but DOMPurify accepts `data:` on its default image tags independently of it — the
  // `data:` rejection for src/href is enforced by the enumerateBodyAttrs hook below, not here.
  ALLOWED_URI_REGEXP: /^(?:https:|mailto:|tel:|\/(?![/\\]))/i,
  // Setting ALLOWED_URI_REGEXP makes DOMPurify gate EVERY non-URI-safe attribute's value against it,
  // which would silently drop the structural attributes whose values are not URIs (colspan/rowspan,
  // and rel/target). Mark them URI-safe so the regexp applies only to true URI attributes (href/src);
  // their values are still value-enumerated by the hook below. `class` is already URI-safe by default,
  // listed here for explicitness.
  ADD_URI_SAFE_ATTR: ['class', 'target', 'rel', 'colspan', 'rowspan']
};

/**
 * The ONLY `class` tokens kept on body content: code-block language hints, the four text-align
 * classes, and the four brand text-color classes (PR B #114). Any other class token is dropped.
 * The brand color set must stay in lockstep with `BRAND_TEXT_COLOR_CLASSES` in
 * `blog-editor-extensions.ts` (asserted by the sanitizer matrix test, not imported here — that file
 * pulls in TipTap, which must not reach the SSR render path).
 */
const ALLOWED_CLASSES = new Set([
  'language-js',
  'language-ts',
  'language-python',
  'language-css',
  'language-html',
  'language-sql',
  'language-json',
  'language-xml',
  'language-bash',
  'language-sh',
  'text-left',
  'text-center',
  'text-right',
  'text-justify',
  // Brand text colors (PR B #114):
  'text-forest-canopy',
  'text-moss-green',
  'text-sunlight-gold',
  'text-earth-brown'
]);
const ALLOWED_REL = new Set(['noopener', 'noreferrer', 'nofollow']);
const ALLOWED_TARGET = new Set(['_blank', '_self']);

type AttrHookEvent = { attrName: string; attrValue: string; keepAttr: boolean };

/**
 * Value-enumerate the `class`/`rel`/`target` attributes that `ALLOWED_ATTR` admits by name only:
 * keep just the allowlisted tokens, drop the attribute entirely if nothing survives. Without this
 * hook, `class` would be an unrestricted attribute (a vector for CSS-injection / utility-class abuse).
 */
function enumerateBodyAttrs(_node: Element, event: AttrHookEvent): void {
  if (event.attrName === 'class') {
    const kept = (event.attrValue || '').split(/\s+/).filter(token => ALLOWED_CLASSES.has(token));
    if (kept.length) event.attrValue = kept.join(' ');
    else event.keepAttr = false;
  } else if (event.attrName === 'rel') {
    const kept = (event.attrValue || '').split(/\s+/).filter(token => ALLOWED_REL.has(token));
    if (kept.length) event.attrValue = kept.join(' ');
    else event.keepAttr = false;
  } else if (event.attrName === 'target') {
    if (!ALLOWED_TARGET.has(event.attrValue)) event.keepAttr = false;
  } else if (event.attrName === 'src' || event.attrName === 'href') {
    // DOMPurify accepts `data:` URIs on its default DATA_URI_TAGS (img/source/…) regardless of
    // ALLOWED_URI_REGEXP, so the regexp alone does NOT enforce the documented no-`data:` body policy
    // on images. Reject `data:` here — the one place the regexp cannot reach. Not script-executable
    // (an <img> renders a data: SVG in secure static mode), but off-policy: arbitrary inline blobs
    // (storage abuse) and off-allowlist image content. href `data:` is already stripped by the
    // regexp; covering it here too is harmless defense-in-depth.
    if (/^\s*data:/i.test(event.attrValue || '')) event.keepAttr = false;
  }
}

/**
 * The SINGLE blog-body sanitize entry point. Registers the enumeration hook, sanitizes, and removes
 * the hook in a `finally` — add → sanitize → remove (D1-F1). `isomorphic-dompurify` exposes one
 * shared DOMPurify singleton whose `addHook` mutates a GLOBAL hook list; scoping the hook to this
 * call prevents it (a) detaching from this path on a future refactor and (b) leaking onto the author
 * bio path, which sanitizes with the stricter V1 `STRICT_CONFIG`.
 */
export function renderBodyHtml(html: string): string {
  if (typeof html !== 'string' || html.length === 0) return '';
  DOMPurify.addHook('uponSanitizeAttribute', enumerateBodyAttrs as never);
  try {
    return DOMPurify.sanitize(html, STRICT_CONFIG_V2);
  } finally {
    DOMPurify.removeHook('uponSanitizeAttribute');
  }
}

/**
 * HTML-aware body-image alt collector (R2-F4, ACTIVE under HTML storage). The markdown-token walk in
 * `collectBodyImageAlts` does not see `<img>` tags, which TipTap/AI HTML bodies now contain. Returns
 * one entry per `<img>` with its `src` and `alt` (`null` when the attribute is absent, `''` when
 * empty). Dependency-free (regex over well-formed img tags) so it runs in SSR + tests; this is an
 * advisory quality gate, NOT the trust boundary (render-time sanitization is).
 */
export function collectHtmlImageAlts(html: string): Array<{ src: string; alt: string | null }> {
  const images: Array<{ src: string; alt: string | null }> = [];
  if (typeof html !== 'string') return images;
  const imgTag = /<img\b[^>]*>/gi;
  const readAttr = (tag: string, name: string): string | null => {
    const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i').exec(tag);
    return match ? (match[1] ?? match[2] ?? '') : null;
  };
  let match: RegExpExecArray | null;
  while ((match = imgTag.exec(html)) !== null) {
    const tag = match[0];
    images.push({ src: readAttr(tag, 'src') ?? '', alt: readAttr(tag, 'alt') });
  }
  return images;
}
