// @vitest-environment node
//
// Node env (like the sanitizer matrix): renderBodyHtml runs in Netlify's node runtime in production,
// where isomorphic-dompurify's bundled jsdom sanitizes faithfully; vitest's default jsdom differs.
import { describe, it, expect } from 'vitest';
import { convertMarkdownBodyToHtml, normalizeForEquivalence } from './blog-conversion';
import { renderBodyHtml } from './blog-html';

// Representative V1 markdown constructs. Each must convert with rendered-output equivalence (the V2
// render of the converted HTML byte-equals the V1 markdown render after the §5.4 normalization).
const FIXTURES: Record<string, string> = {
  headings: '# Title\n\n## Section\n\nSome body text here.',
  emphasis: 'Text with **bold**, *italic*, and `inline code`.',
  lists: '- one\n- two\n- three\n\n1. first\n2. second',
  links:
    '[email](mailto:hi@spicebush.org), [call](tel:+15555551234), [about](/about), [ext](https://example.com)',
  codeblock: '```\nconst x = 1;\n```',
  blockquote: '> A short quote from a parent.',
  table: '| Day | Hours |\n| --- | --- |\n| Mon | 9-3 |\n| Tue | 9-3 |',
  hardbreak: 'line one  \nline two',
  image: '![A child planting seedlings in the garden](/media/garden.png)'
};

describe('blog markdown→HTML conversion (rendered-output equivalence, ADR-009 §5.4)', () => {
  for (const [name, markdown] of Object.entries(FIXTURES)) {
    it(`converts "${name}" with rendered-output equivalence`, () => {
      const { html, equivalent, markdownRender } = convertMarkdownBodyToHtml(markdown);
      expect(equivalent, `inequivalent:\n V1: ${markdownRender}\n V2: ${html}`).toBe(true);
      // The converted HTML is a FIXED POINT of the steady-state render path, so the public render is
      // stable after the cutover.
      expect(normalizeForEquivalence(renderBodyHtml(html))).toBe(normalizeForEquivalence(html));
    });
  }

  it('preserves a hard break as <br> (D1-F5)', () => {
    expect(convertMarkdownBodyToHtml('line one  \nline two').html).toMatch(/<br\s*\/?>/);
  });

  it('preserves mailto/tel/site-relative links through conversion (NOT https-only, R3-F1)', () => {
    const { html } = convertMarkdownBodyToHtml('[m](mailto:a@b.com) [t](tel:+15555551234) [r](/x)');
    expect(html).toContain('mailto:a@b.com');
    expect(html).toContain('tel:+15555551234');
    expect(html).toContain('href="/x"');
  });

  it('preserves a body image and its alt through conversion', () => {
    const { html } = convertMarkdownBodyToHtml('![Children reading together](/media/read.png)');
    expect(html).toContain('src="/media/read.png"');
    expect(html).toContain('alt="Children reading together"');
  });

  it('normalizeForEquivalence never adds or drops an element', () => {
    // Only whitespace/void-form changes; tag count is invariant.
    const input = '<h2>A</h2>\n  <p>b</p>\n<hr/>\n';
    const out = normalizeForEquivalence(input);
    expect(out).toBe('<h2>A</h2><p>b</p><hr>');
    expect((out.match(/</g) || []).length).toBe((input.match(/</g) || []).length);
  });
});
