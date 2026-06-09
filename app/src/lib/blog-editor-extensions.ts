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
import Image from '@tiptap/extension-image';
import { Mark, mergeAttributes, type Extensions } from '@tiptap/core';

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
 * Highlight mark → a bare `<mark>` with NO attributes (PR B / #114). A custom Mark rather than
 * `@tiptap/extension-highlight` so we add zero dependencies and emit nothing the sanitizer must
 * value-check: `<mark>` is added to `STRICT_CONFIG_V2.ALLOWED_TAGS` and carries no attrs.
 */
export const Highlight = Mark.create({
  name: 'highlight',
  parseHTML() {
    return [{ tag: 'mark' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      toggleHighlight:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name)
    };
  }
});

/**
 * Brand text color — a class-based `<span>` mark (PR B / #114). The owner picked a fixed on-brand
 * palette; each color is an ENUMERATED class (`text-forest-canopy|moss-green|sunlight-gold|earth-brown`)
 * never an inline `style` (which stays banned). The sanitizer admits `<span>` only with these
 * allowlisted class tokens, so a `<span>` can never carry anything but a brand color.
 */
export const BRAND_TEXT_COLORS = [
  { key: 'forest', label: 'Forest canopy', class: 'text-forest-canopy' },
  { key: 'moss', label: 'Moss green', class: 'text-moss-green' },
  { key: 'gold', label: 'Sunlight gold', class: 'text-sunlight-gold' },
  { key: 'earth', label: 'Earth brown', class: 'text-earth-brown' }
] as const;

/** The exact class tokens the sanitizer must allow on `<span>` — keep in lockstep with `blog-html.ts`. */
export const BRAND_TEXT_COLOR_CLASSES = BRAND_TEXT_COLORS.map(c => c.class);

const COLOR_KEY_TO_CLASS: Record<string, string> = Object.fromEntries(
  BRAND_TEXT_COLORS.map(c => [c.key, c.class])
);
const CLASS_TO_COLOR_KEY: Record<string, string> = Object.fromEntries(
  BRAND_TEXT_COLORS.map(c => [c.class, c.key])
);

export const BrandTextColor = Mark.create({
  name: 'brandTextColor',
  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element: HTMLElement): string | null => {
          for (const cls of Array.from(element.classList)) {
            if (CLASS_TO_COLOR_KEY[cls]) return CLASS_TO_COLOR_KEY[cls];
          }
          return null;
        },
        renderHTML: (attributes: Record<string, unknown>): Record<string, string> => {
          const key = attributes.color;
          const cls = typeof key === 'string' ? COLOR_KEY_TO_CLASS[key] : undefined;
          return cls ? { class: cls } : {};
        }
      }
    };
  },
  parseHTML() {
    // Only claim a <span> that already carries a brand color class — never absorb arbitrary spans.
    return [
      {
        tag: 'span',
        getAttrs: (element: HTMLElement | string): false | Record<string, never> => {
          if (typeof element === 'string') return false;
          for (const cls of Array.from(element.classList)) {
            if (CLASS_TO_COLOR_KEY[cls]) return {};
          }
          return false;
        }
      }
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setBrandTextColor:
        (color: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { color }),
      unsetBrandTextColor:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name)
    };
  }
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    highlight: {
      toggleHighlight: () => ReturnType;
    };
    brandTextColor: {
      setBrandTextColor: (color: string) => ReturnType;
      unsetBrandTextColor: () => ReturnType;
    };
  }
}

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
    TableCell,
    // Block images. allowBase64:false rejects data:/base64 at the editor level too, mirroring the
    // render-time sanitizer's data: block (blog-html.ts) — images must be real URLs (media library
    // or site-relative paths), never inline blobs.
    Image.configure({ inline: false, allowBase64: false }),
    // PR B power tools (#114): bare <mark> highlight + class-based brand text color. Both emit only
    // sanitizer-allowlisted output (mark with no attrs; span with an enumerated brand color class).
    Highlight,
    BrandTextColor
  ];
}
