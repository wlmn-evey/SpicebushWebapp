/**
 * Dependency-free "is this blog body empty?" predicate, shared by the client submit guard
 * (`blog-admin-client.ts`) and the server validator (`validateBlogData` in `blog-content.ts`) so
 * the two can never disagree — the server is the source of truth, the client is immediate
 * feedback (R3-F10). Importable from the browser bundle: no `marked`, no DOMPurify, no DB.
 *
 * A TipTap editor with nothing typed emits `<p></p>` — non-empty as a string, empty as content.
 * Strip tags, collapse entity/whitespace noise, and call the result empty unless the body carries
 * an image (an image-only post is still content). Legacy markdown bodies have no tags and pass
 * through the same rule unchanged (#132).
 */
export function isBlogBodyEmpty(body: unknown): boolean {
  if (typeof body !== 'string') return true;
  if (/<img\b/i.test(body)) return false;
  const text = body
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;|\u00a0/gi, ' ')
    .trim();
  return text.length === 0;
}
