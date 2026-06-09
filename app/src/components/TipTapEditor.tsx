/**
 * Blog body editor — a TipTap (ProseMirror) React island that stores TipTap HTML (ADR-009).
 *
 * Built in the additive PR (code-present, mounted nowhere rendered); the cutover PR mounts it in the
 * admin add/edit forms in place of the body textarea, in the SAME deploy that converts the 6 posts
 * to HTML and flips the public render — so the editor (HTML) and the render (HTML) are never out of
 * step. On every change it writes `editor.getHTML()` into a hidden form field so the existing form
 * POST carries the body; the server re-sanitizes via `renderBodyHtml` at save AND at every render
 * (render-time sanitization is the trust boundary).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { buildBlogEditorExtensions, BRAND_TEXT_COLORS } from '@lib/blog-editor-extensions';
import { renderBodyHtml } from '@lib/blog-html';

type ImagePick = { src: string; alt: string };

type Props = {
  /** Stored HTML to hydrate the editor with (the post body). */
  initialHtml?: string;
  /** Hidden form field name the HTML is mirrored into so the form POST carries the body. */
  fieldName?: string;
  /**
   * Resolve an image to insert (src + alt). The cutover wiring passes the media-library picker;
   * the default is a minimal URL+alt prompt so the island is usable without the bridge.
   */
  onPickImage?: () => Promise<ImagePick | null>;
};

const defaultPickImage = async (): Promise<ImagePick | null> => {
  const src = window.prompt('Image URL (https:// or /media/…)')?.trim();
  if (!src) return null;
  const alt = window.prompt('Describe the image (alt text)')?.trim() ?? '';
  return { src, alt };
};

type ToolbarButtonProps = {
  onClick: () => void;
  isActive?: boolean;
  label: string;
  children: React.ReactNode;
};

function ToolbarButton({ onClick, isActive = false, label, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      className={`blog-editor-btn${isActive ? ' is-active' : ''}`}
    >
      {children}
    </button>
  );
}

/** Visual separator between toolbar groups (decorative). */
function ToolbarDivider() {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 1,
        alignSelf: 'stretch',
        minHeight: 20,
        background: '#d1d5db',
        margin: '0 2px'
      }}
    />
  );
}

export default function TipTapEditor({
  initialHtml = '',
  fieldName = 'bodyRaw',
  onPickImage = defaultPickImage
}: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const hiddenRef = useRef<HTMLInputElement | null>(null);

  const syncHidden = useCallback((editor: Editor) => {
    if (hiddenRef.current) hiddenRef.current.value = editor.getHTML();
  }, []);

  const updateCounts = useCallback((editor: Editor) => {
    // Use getText with a block separator: doc.textContent joins blocks with an EMPTY separator, so
    // "<p>hello</p><p>world</p>" would collapse to "helloworld" and undercount as one word.
    const text = editor.getText({ blockSeparator: ' ' });
    const trimmed = text.trim();
    setCounts({ words: trimmed ? trimmed.split(/\s+/).length : 0, chars: text.length });
  }, []);

  const editor = useEditor({
    extensions: buildBlogEditorExtensions(),
    content: initialHtml,
    // Astro hydrates this island after SSR; rendering the editor on the server adds nothing.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'blog-editor-surface',
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Post body'
      }
    },
    onCreate: ({ editor }) => {
      syncHidden(editor);
      updateCounts(editor);
    },
    onUpdate: ({ editor }) => {
      syncHidden(editor);
      updateCounts(editor);
      setIsDirty(true);
    }
  });

  // Unsaved-changes guard (R2-F20) — distinct from autosave, which stays out of scope.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Submitting the owning form is a save, not a navigation-away — clear the dirty flag so the
  // beforeunload guard does not fire on the redirect that follows a successful POST.
  useEffect(() => {
    const form = hiddenRef.current?.form ?? null;
    if (!form) return;
    const onSubmit = () => setIsDirty(false);
    form.addEventListener('submit', onSubmit);
    return () => form.removeEventListener('submit', onSubmit);
  }, [editor]);

  const togglePreview = useCallback(() => {
    setShowPreview(prev => {
      const next = !prev;
      // Faithful preview: render the CURRENT editor HTML through the same renderBodyHtml the public
      // page uses (NOT the editor canvas, NOT .prose which is unstyled here).
      if (next && editor) setPreviewHtml(renderBodyHtml(editor.getHTML()));
      return next;
    });
  }, [editor]);

  const insertLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window
      .prompt('Link URL (https://, mailto:, tel:, or /path)', previous ?? '')
      ?.trim();
    if (url === undefined) return; // cancelled
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const insertImage = useCallback(async () => {
    if (!editor) return;
    const pick = await onPickImage();
    if (!pick) return;
    editor.chain().focus().setImage({ src: pick.src, alt: pick.alt }).run();
  }, [editor, onPickImage]);

  if (!editor) return null;

  return (
    <div className="blog-editor">
      <input type="hidden" name={fieldName} ref={hiddenRef} defaultValue={initialHtml} />

      <div className="blog-editor-toolbar" role="toolbar" aria-label="Text formatting">
        {/* History */}
        <ToolbarButton label="Undo" onClick={() => editor.chain().focus().undo().run()}>
          ↶
        </ToolbarButton>
        <ToolbarButton label="Redo" onClick={() => editor.chain().focus().redo().run()}>
          ↷
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inline text */}
        <ToolbarButton
          label="Bold"
          isActive={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          isActive={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          isActive={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <u>U</u>
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          isActive={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <s>S</s>
        </ToolbarButton>
        <ToolbarButton
          label="Highlight"
          isActive={editor.isActive('highlight')}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <mark>H</mark>
        </ToolbarButton>
        <select
          aria-label="Text color"
          value={(editor.getAttributes('brandTextColor').color as string) || ''}
          onChange={e => {
            const value = e.target.value;
            if (value) editor.chain().focus().setBrandTextColor(value).run();
            else editor.chain().focus().unsetBrandTextColor().run();
          }}
          style={{
            font: 'inherit',
            fontSize: '0.8125rem',
            padding: '0.25rem 0.4rem',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: 'white',
            cursor: 'pointer'
          }}
        >
          <option value="">Color</option>
          {BRAND_TEXT_COLORS.map(color => (
            <option key={color.key} value={color.key}>
              {color.label}
            </option>
          ))}
        </select>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          label="Heading 2"
          isActive={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          isActive={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          label="Heading 4"
          isActive={editor.isActive('heading', { level: 4 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        >
          H4
        </ToolbarButton>

        <ToolbarDivider />

        {/* Blocks */}
        <ToolbarButton
          label="Bullet list"
          isActive={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          • List
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          isActive={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          label="Quote"
          isActive={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          &ldquo; &rdquo;
        </ToolbarButton>
        <ToolbarButton
          label="Code block"
          isActive={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          {'</>'}
        </ToolbarButton>
        <ToolbarButton
          label="Horizontal line"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          ―
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          label="Align left"
          isActive={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
        >
          ⇤
        </ToolbarButton>
        <ToolbarButton
          label="Align center"
          isActive={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
        >
          ↔
        </ToolbarButton>
        <ToolbarButton
          label="Align right"
          isActive={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
        >
          ⇥
        </ToolbarButton>

        <ToolbarDivider />

        {/* Insert */}
        <ToolbarButton label="Insert link" isActive={editor.isActive('link')} onClick={insertLink}>
          🔗
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={insertImage}>
          🖼
        </ToolbarButton>
        <ToolbarButton
          label="Insert table"
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
        >
          ▦
        </ToolbarButton>

        <ToolbarDivider />

        {/* View */}
        <ToolbarButton
          label={showPreview ? 'Back to editing' : 'Preview as visitor'}
          isActive={showPreview}
          onClick={togglePreview}
        >
          {showPreview ? 'Edit' : 'Preview'}
        </ToolbarButton>
      </div>

      {showPreview ? (
        // previewHtml is sanitized by renderBodyHtml — the same render-time guard the public page uses.
        <div
          className="blog-body blog-editor-preview"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}

      {!showPreview && (
        <p style={{ marginTop: 6, fontSize: '0.75rem', color: '#6b6256', textAlign: 'right' }}>
          {counts.words} {counts.words === 1 ? 'word' : 'words'} · {counts.chars} characters
        </p>
      )}
    </div>
  );
}
