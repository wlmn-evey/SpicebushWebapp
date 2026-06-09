/**
 * Pure share-link builder for the public post page (Phase 3 PR3). Given the ABSOLUTE canonical post
 * URL and the post title, returns the share-intent hrefs for X, Facebook, and email. Both the URL and
 * the title are `encodeURIComponent`-escaped so a `&`, `?`, space, or `#` in either can't break out of
 * the query string. View-less and fully unit-testable; the named `<a>` anchors work without JS (only
 * the separate copy-link button needs the clipboard API).
 */
export type ShareLinks = {
  /** X / Twitter web intent (prefilled text + url). */
  x: string;
  /** Facebook sharer (url only — FB ignores prefilled text). */
  facebook: string;
  /** `mailto:` with the title as subject and the title + url as the body. */
  email: string;
};

export function buildShareLinks(url: string, title: string): ShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    email: `mailto:?subject=${t}&body=${encodeURIComponent(`${title}\n\n${url}`)}`
  };
}
