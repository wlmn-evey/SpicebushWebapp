import { describe, expect, it } from 'vitest';
import { buildShareLinks } from './blog-share';

describe('buildShareLinks', () => {
  const url = 'https://spicebushmontessori.org/blog/nurturing-growth-gardening-program';
  const title = 'Nurturing Growth: Our Gardening Program';

  it('builds X / Facebook / email intents from the absolute url + title', () => {
    const links = buildShareLinks(url, title);
    expect(links.x).toBe(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
    );
    expect(links.facebook).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    );
    expect(links.email.startsWith('mailto:?subject=')).toBe(true);
  });

  it('percent-encodes the url AND title so query-breaking chars cannot escape', () => {
    const trickyUrl = 'https://example.com/p?a=1&b=2#frag';
    const trickyTitle = 'Tom & Jerry: 100% fun? yes!';
    const links = buildShareLinks(trickyUrl, trickyTitle);
    // No raw separators leak into the query string beyond the ones we placed.
    expect(links.x).toContain(encodeURIComponent(trickyUrl));
    expect(links.x).toContain(encodeURIComponent(trickyTitle));
    expect(links.x).not.toContain('a=1&b=2'); // the raw url query is escaped, not appended
    expect(links.facebook).toContain(encodeURIComponent(trickyUrl));
    expect(links.facebook).not.toContain('#frag');
    // Email body carries the title and the url, both escaped.
    expect(links.email).toContain(encodeURIComponent(trickyTitle));
    expect(links.email).toContain(encodeURIComponent(`${trickyTitle}\n\n${trickyUrl}`));
  });
});
