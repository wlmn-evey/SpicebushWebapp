/**
 * One-time markdown→HTML body conversion for the Blog V2 cutover (ADR-009 §5.4).
 *
 * Each legacy post's markdown body is rendered through the V1 pipeline and then sanitized by the V2
 * sanitizer to produce the steady-state HTML form. The conversion is gated by **rendered-output
 * equivalence**: the V2 render of the converted HTML must be byte-equal (after a bounded, enumerated
 * normalization that may NEVER add or drop an element) to the V1 markdown render — so content is
 * preserved, not silently altered. The conversion SCRIPT (scripts/convert-blog-to-html.mjs) snapshots
 * each row's markdown into `data.bodyMarkdownBackup` BEFORE overwriting and aborts the row on any
 * inequivalence; rollback re-writes the backup (scripts/revert-blog-to-markdown.mjs).
 */
import { renderMarkdownToHtml } from './blog-content';
import { renderBodyHtml } from './blog-html';

/**
 * The rendered-output-equivalence normalization (ADR-009 §5.4). The ONLY transforms applied to BOTH
 * sides before byte-comparison: (1) trim trailing newlines; (2) collapse insignificant inter-tag
 * whitespace (`>   <` → `><`); (3) normalize void-element self-closing form (`<hr/>` → `<hr>`). It
 * MUST NEVER add or drop an element, so it cannot launder content loss.
 */
export function normalizeForEquivalence(html: string): string {
  return html
    .replace(/\n+$/g, '')
    .replace(/>[ \t\r\n]+</g, '><')
    .replace(/\s*\/>/g, '>');
}

export type ConversionResult = {
  /** The steady-state HTML to store in `data.body`. */
  html: string;
  /** True when the V2 render of `html` is rendered-output-equivalent to the V1 markdown render. */
  equivalent: boolean;
  /** The V1 markdown render, retained for diffing a failed gate. */
  markdownRender: string;
};

/**
 * Convert a legacy markdown body to its steady-state HTML form and check rendered-output equivalence.
 * `html` is `renderBodyHtml(renderMarkdownToHtml(markdown))` — a fixed point of the steady-state
 * render path (`renderBodyHtml(html) === html`), so the public render is stable after the cutover.
 */
export function convertMarkdownBodyToHtml(markdown: string): ConversionResult {
  const markdownRender = renderMarkdownToHtml(markdown);
  const html = renderBodyHtml(markdownRender);
  const equivalent = normalizeForEquivalence(html) === normalizeForEquivalence(markdownRender);
  return { html, equivalent, markdownRender };
}
