/**
 * The single source of truth for the Blog V2 TipTap extension set (ADR-009 HTML storage).
 *
 * Imported by BOTH the editor island (client, PR3) and the sanitizer matrix test (CI) so the test
 * exercises the EXACT construct set the editor emits (D1-F10) — hand-authored fixtures could drift
 * from TipTap's real output. Pure config: no React, importable in vitest (jsdom + happy-dom).
 *
 * Two deliberate hardening choices so the render-time sanitizer (`blog-html.ts`) can keep the
 * `style` attribute fully banned:
 *   - Text alignment is CLASS-BASED via {@link ClassTextAlign} (stock TextAlign emits inline
 *     `style="text-align:…"`, which the sanitizer would strip — silently losing the alignment).
 *   - Tables are `resizable: false`, so no `colwidth` attribute is produced (D1-F3). TipTap still
 *     emits an inline `min-width` style on the table/cols, but the sanitizer strips it; the visible
 *     result is an unstyled, allowlisted `<table>`/`<col>`.
 * Headings are restricted to h2–h6 (the public render demotes h1 and the sanitizer omits h1).
 */
import { StarterKit } from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import type { Extensions } from '@tiptap/core';

/** The four alignments the editor supports, mapped to the enumerated sanitizer-allowlisted classes. */
const ALIGNMENT_TO_CLASS: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
  justify: 'text-justify'
};
const CLASS_TO_ALIGNMENT: Record<string, string> = {
  'text-left': 'left',
  'text-center': 'center',
  'text-right': 'right',
  'text-justify': 'justify'
};

/**
 * Text alignment rendered as a `class` (`text-left|center|right|justify`), never the inline `style`
 * the stock TextAlign emits — so STRICT_CONFIG_V2 can keep `style` banned. Overrides BOTH render
 * (emit the class) and parse (read it back) for a clean editor round-trip; style-based alignment on
 * pasted content is intentionally not honored (class-based is the only path).
 */
export const ClassTextAlign = TextAlign.extend({
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (element: HTMLElement): string | null => {
              for (const cls of Array.from(element.classList)) {
                if (CLASS_TO_ALIGNMENT[cls]) return CLASS_TO_ALIGNMENT[cls];
              }
              return null;
            },
            renderHTML: (attributes: Record<string, unknown>): Record<string, string> => {
              const alignment = attributes.textAlign;
              const cls = typeof alignment === 'string' ? ALIGNMENT_TO_CLASS[alignment] : undefined;
              return cls ? { class: cls } : {};
            }
          }
        }
      }
    ];
  }
});

/**
 * Build the configured Blog V2 editor extension set. Call (rather than export a frozen array) so the
 * island and the test each get an independent instance — TipTap extensions hold per-editor state.
 */
export function buildBlogEditorExtensions(): Extensions {
  return [
    StarterKit.configure({ heading: { levels: [2, 3, 4, 5, 6] } }),
    ClassTextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell
  ];
}
