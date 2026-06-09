// @vitest-environment node
//
// Pinned to the NODE environment on purpose: `renderBodyHtml` runs in Netlify's node SSR runtime in
// production, where `isomorphic-dompurify` uses its bundled jsdom. vitest's default jsdom environment
// sanitizes some table-cell attributes differently, so testing the sanitizer there would not be
// faithful to production. In node, `@tiptap/html` serializes via happy-dom (installed) and DOMPurify
// matches production behavior.
import { describe, it, expect } from 'vitest';
import { generateHTML, generateJSON } from '@tiptap/html';
import DOMPurify from 'isomorphic-dompurify';
import { renderBodyHtml, collectHtmlImageAlts } from './blog-html';
import { buildBlogEditorExtensions } from './blog-editor-extensions';

// Real TipTap emission for an input: parse to ProseMirror JSON then re-serialize through the EXACT
// configured extension set (D1-F10) — the sanitizer is tested against what the editor truly emits,
// not hand-authored strings that could drift from it.
const tiptapHtml = (inputHtml: string): string => {
  const exts = buildBlogEditorExtensions();
  return generateHTML(generateJSON(inputHtml, exts), exts);
};

describe('renderBodyHtml — TipTap construct survival (D1-F10, generated from the real extension set)', () => {
  it('keeps StarterKit + underline/strike/code/list/blockquote/codeblock/hr constructs', () => {
    const out = renderBodyHtml(
      tiptapHtml(
        '<h2>Heading</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s> <code>c</code></p>' +
          '<ul><li>item</li></ul><ol><li>one</li></ol><blockquote><p>quote</p></blockquote>' +
          '<pre><code class="language-ts">const x = 1;</code></pre><hr>'
      )
    );
    expect(out).toContain('<h2>Heading</h2>');
    expect(out).toContain('<strong>b</strong>');
    expect(out).toContain('<u>u</u>');
    expect(out).toContain('<s>s</s>');
    expect(out).toContain('<blockquote>');
    expect(out).toContain('<ul>');
    expect(out).toContain('<ol>');
    expect(out).toContain('language-ts');
    expect(out).toMatch(/<hr\s*\/?>/);
  });

  it('keeps class-based text-align and NEVER emits inline style', () => {
    const out = renderBodyHtml(
      tiptapHtml('<p class="text-center">c</p><h3 class="text-right">r</h3>')
    );
    expect(out).toContain('class="text-center"');
    expect(out).toContain('class="text-right"');
    expect(out).not.toContain('style=');
  });

  it('keeps the table family + colspan/rowspan, drops the editor min-width style and any colwidth', () => {
    const out = renderBodyHtml(
      tiptapHtml('<table><tbody><tr><th>h</th><td colspan="2">d</td></tr></tbody></table>')
    );
    expect(out).toContain('<table>');
    expect(out).toMatch(/<th\b/);
    expect(out).toContain('colspan="2"');
    expect(out).not.toContain('style=');
    expect(out).not.toContain('min-width');
    expect(out).not.toContain('colwidth');
  });

  it('preserves a link href; any emitted target/rel stay within the enumerated allowlist', () => {
    const out = renderBodyHtml(tiptapHtml('<p><a href="https://example.com">link</a></p>'));
    expect(out).toContain('href="https://example.com"');
    const target = /target="([^"]*)"/.exec(out);
    if (target) expect(['_blank', '_self']).toContain(target[1]);
    const rel = /rel="([^"]*)"/.exec(out);
    if (rel) {
      for (const token of rel[1].split(/\s+/)) {
        expect(['noopener', 'noreferrer', 'nofollow']).toContain(token);
      }
    }
  });

  it('keeps a TipTap block image (src+alt); a data:/base64 image is dropped at the editor level', () => {
    const out = renderBodyHtml(
      tiptapHtml('<p>x</p><img src="/media/photo.png" alt="A child planting"><p>y</p>')
    );
    expect(out).toContain('src="/media/photo.png"');
    expect(out).toContain('alt="A child planting"');
    // allowBase64:false → the editor never even produces a data: image node.
    expect(tiptapHtml('<img src="data:image/png;base64,AAA" alt="x">')).not.toContain('data:');
  });
});

describe('renderBodyHtml — V1 trust-boundary properties hold (hostile inputs)', () => {
  it('strips the style attribute on every element', () => {
    const out = renderBodyHtml(
      '<p style="text-align:center;color:red">x</p><table style="min-width:75px"><tbody><tr><td style="x">y</td></tr></tbody></table>'
    );
    expect(out).not.toContain('style=');
    expect(out).toContain('x');
  });

  it('enumerates the class allowlist — keeps allowed tokens, drops the rest and fully-disallowed classes', () => {
    expect(renderBodyHtml('<p class="text-center danger sneaky">x</p>')).toContain(
      'class="text-center"'
    );
    expect(renderBodyHtml('<p class="text-center danger sneaky">x</p>')).not.toContain('danger');
    // No allowlisted token at all → the class attribute is dropped entirely.
    const dropped = renderBodyHtml('<p class="utility-abuse">x</p>');
    expect(dropped).not.toContain('class=');
    expect(dropped).toContain('>x</p>');
  });

  it('enumerates rel and restricts target', () => {
    const out = renderBodyHtml(
      '<p><a href="https://x.com" target="_top" rel="external noopener">l</a></p>'
    );
    expect(out).not.toContain('_top'); // target not in {_blank,_self} → dropped
    expect(out).toContain('noopener'); // kept
    expect(out).not.toContain('external'); // dropped
  });

  it('never keeps id, data-*, or aria-* attributes', () => {
    const out = renderBodyHtml('<p id="x" data-evil="1" aria-label="y">t</p>');
    expect(out).not.toContain('id=');
    expect(out).not.toContain('data-evil');
    expect(out).not.toContain('aria-label');
  });

  it('applies the V1 body URI policy — https/mailto/tel/site-relative kept, javascript: stripped (R3-F1, NOT https-only)', () => {
    expect(renderBodyHtml('<p><a href="mailto:hi@spicebush.org">m</a></p>')).toContain(
      'mailto:hi@spicebush.org'
    );
    expect(renderBodyHtml('<p><a href="tel:+15555551234">t</a></p>')).toContain('tel:+15555551234');
    expect(renderBodyHtml('<p><a href="/about">a</a></p>')).toContain('href="/about"');
    expect(renderBodyHtml('<p><a href="https://x.com">h</a></p>')).toContain(
      'href="https://x.com"'
    );
    const js = renderBodyHtml('<p><a href="javascript:alert(1)">x</a></p>');
    expect(js).not.toContain('javascript');
    // backslash-aware: /\evil.com resolves off-site as //evil.com → must be rejected
    expect(renderBodyHtml('<p><a href="/\\evil.com">x</a></p>')).not.toContain('evil.com');
  });

  it('strips data: URIs on img src — DOMPurify leaks them past ALLOWED_URI_REGEXP; the hook closes it', () => {
    expect(
      renderBodyHtml('<img src="data:image/svg+xml,<svg onload=alert(1)>" alt="x">')
    ).not.toContain('data:');
    expect(
      renderBodyHtml('<img src="data:text/html,<script>alert(1)</script>" alt="x">')
    ).not.toContain('data:');
    // Legitimate https / site-relative image sources still survive.
    expect(renderBodyHtml('<img src="https://cdn.example.com/x.png" alt="ok">')).toContain(
      'src="https://cdn.example.com/x.png"'
    );
    expect(renderBodyHtml('<img src="/media/x.png" alt="ok">')).toContain('src="/media/x.png"');
  });

  it('removes scripts, event handlers, and iframes', () => {
    expect(renderBodyHtml('<p>ok</p><script>alert(1)</script>')).not.toContain('alert');
    expect(renderBodyHtml('<img src="https://x/y.png" onerror="alert(1)">')).not.toContain(
      'onerror'
    );
    expect(renderBodyHtml('<iframe src="https://evil"></iframe><p>ok</p>')).not.toContain(
      '<iframe'
    );
  });

  it('keeps <br> (D1-F5) and the new u/s/colgroup/col tags', () => {
    expect(renderBodyHtml('<p>a<br>b</p>')).toMatch(/<br\s*\/?>/);
    expect(renderBodyHtml('<u>u</u><s>s</s>')).toContain('<u>u</u>');
    expect(
      renderBodyHtml('<table><colgroup><col></colgroup><tbody><tr><td>x</td></tr></tbody></table>')
    ).toContain('<col');
  });

  it('drops a non-allowlisted table-cell attribute (colwidth) while keeping colspan/rowspan (D1-F3)', () => {
    const out = renderBodyHtml(
      '<table><tbody><tr><td colwidth="100,200" colspan="2" rowspan="1">d</td></tr></tbody></table>'
    );
    expect(out).not.toContain('colwidth');
    expect(out).toContain('colspan="2"');
    expect(out).toContain('rowspan="1"');
  });

  it('returns "" for empty/non-string input', () => {
    expect(renderBodyHtml('')).toBe('');
    expect(renderBodyHtml(undefined as unknown as string)).toBe('');
  });
});

describe('renderBodyHtml — hook isolation (D1-F1, add→sanitize→remove)', () => {
  it('removes the enumeration hook after sanitizing, so it cannot leak onto a later sanitize call', () => {
    // Run the body sanitizer (which registers and must remove the class-enumeration hook)…
    renderBodyHtml('<p class="text-center danger">x</p>');
    // …then a separate sanitize that allows `class` must see the RAW value — proving the hook is gone.
    const after = DOMPurify.sanitize('<p class="danger-not-enumerated">y</p>', {
      ALLOWED_TAGS: ['p'],
      ALLOWED_ATTR: ['class']
    });
    expect(after).toContain('class="danger-not-enumerated"');
  });
});

describe('collectHtmlImageAlts (R2-F4 — HTML-aware alt walk)', () => {
  it('returns one entry per <img> with src and alt, distinguishing missing vs empty alt', () => {
    const imgs = collectHtmlImageAlts(
      '<p><img src="/a.png" alt="A child planting seedlings"></p><img src="/b.png" alt=""><img src="/c.png">'
    );
    expect(imgs).toEqual([
      { src: '/a.png', alt: 'A child planting seedlings' },
      { src: '/b.png', alt: '' },
      { src: '/c.png', alt: null }
    ]);
  });

  it('returns [] for bodies with no images or non-string input', () => {
    expect(collectHtmlImageAlts('<p>no images here</p>')).toEqual([]);
    expect(collectHtmlImageAlts(undefined as unknown as string)).toEqual([]);
  });
});
