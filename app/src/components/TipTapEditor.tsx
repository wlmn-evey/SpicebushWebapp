/**
 * Blog body editor — a TipTap (ProseMirror) React island that stores TipTap HTML (ADR-009;
 * redesigned to dedicated editor pages + a richer toolset in ADR-011 / #114).
 *
 * On every change it writes `editor.getHTML()` into a hidden form field so the existing form POST
 * carries the body; the server re-sanitizes via `renderBodyHtml` at render — render-time
 * sanitization is the trust boundary. Links/images are inserted via accessible in-editor dialogs
 * (no browser prompts), and a live side-by-side preview renders through the SAME `renderBodyHtml`
 * the public page uses.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import { buildBlogEditorExtensions, BRAND_TEXT_COLORS } from '@lib/blog-editor-extensions';
import { renderBodyHtml } from '@lib/blog-html';

type Props = {
  /** Stored HTML to hydrate the editor with (the post body). */
  initialHtml?: string;
  /** Hidden form field name the HTML is mirrored into so the form POST carries the body. */
  fieldName?: string;
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

type EditorDialogProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Accessible modal: role=dialog + aria-modal, autofocus the first field, Esc/backdrop close, a
 *  Tab focus-trap, and focus returned to the trigger on close. Replaces window.prompt (PR C). */
function EditorDialog({ title, onClose, children }: EditorDialogProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = (): HTMLElement[] =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'input, button, textarea, select, a[href]'
        ) ?? []
      );
    focusables()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const list = focusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl"
      >
        <h2 className="mb-3 text-base font-semibold text-earth-brown">{title}</h2>
        {children}
      </div>
    </div>
  );
}

type LinkDialogProps = {
  initialUrl: string;
  initialNewTab: boolean;
  onSubmit: (url: string, newTab: boolean) => void;
  onRemove: () => void;
  onClose: () => void;
};

function LinkDialog({ initialUrl, initialNewTab, onSubmit, onRemove, onClose }: LinkDialogProps) {
  const [url, setUrl] = useState(initialUrl);
  const [newTab, setNewTab] = useState(initialNewTab);
  return (
    <EditorDialog title={initialUrl ? 'Edit link' : 'Add link'} onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={event => {
          event.preventDefault();
          onSubmit(url, newTab);
        }}
      >
        <label className="block text-sm font-medium">
          Link address
          <input
            type="text"
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="https://… , mailto:… , tel:… , or /page"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={newTab}
            onChange={event => setNewTab(event.target.checked)}
          />
          Open in a new tab
        </label>
        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          {initialUrl && (
            <button
              type="button"
              onClick={onRemove}
              className="mr-auto rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Remove link
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-earth-brown hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-forest-canopy px-4 py-2 text-sm font-semibold text-white hover:bg-moss-green"
          >
            {initialUrl ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </EditorDialog>
  );
}

type ImageDialogProps = {
  onSubmit: (url: string, alt: string) => void;
  onClose: () => void;
};

function ImageDialog({ onSubmit, onClose }: ImageDialogProps) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');
  const canInsert = url.trim() !== '' && alt.trim().length >= 6;
  return (
    <EditorDialog title="Insert image" onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={event => {
          event.preventDefault();
          if (canInsert) onSubmit(url, alt);
        }}
      >
        <label className="block text-sm font-medium">
          Image address
          <input
            type="text"
            value={url}
            onChange={event => setUrl(event.target.value)}
            placeholder="/media/… or https://…"
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>
        <p className="text-xs text-earth-brown/70">
          Upload images at{' '}
          <a
            href="/admin/media"
            target="_blank"
            rel="noopener"
            className="font-medium text-forest-canopy hover:underline"
          >
            Media (opens in a new tab)
          </a>
          , then paste the address here.
        </p>
        <label className="block text-sm font-medium">
          Description (alt text)
          <input
            type="text"
            value={alt}
            onChange={event => setAlt(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
          />
          <span className="mt-1 block text-xs text-earth-brown/70">
            Required — describe what's in the picture (at least 6 characters).
          </span>
        </label>
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-earth-brown hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canInsert}
            className="rounded-lg bg-forest-canopy px-4 py-2 text-sm font-semibold text-white hover:bg-moss-green disabled:cursor-not-allowed disabled:opacity-50"
          >
            Insert
          </button>
        </div>
      </form>
    </EditorDialog>
  );
}

export default function TipTapEditor({ initialHtml = '', fieldName = 'bodyRaw' }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  const [dialog, setDialog] = useState<'link' | 'image' | null>(null);
  const [linkInitial, setLinkInitial] = useState({ url: '', newTab: false });
  const hiddenRef = useRef<HTMLInputElement | null>(null);
  // Mirror showPreview into a ref so the (created-once) editor onUpdate can refresh the live preview
  // without being recreated on every toggle.
  const showPreviewRef = useRef(false);

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
      if (showPreviewRef.current) setPreviewHtml(renderBodyHtml(editor.getHTML()));
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

  useEffect(() => {
    showPreviewRef.current = showPreview;
  }, [showPreview]);

  const togglePreview = useCallback(() => {
    setShowPreview(prev => {
      const next = !prev;
      // Faithful preview: render the CURRENT editor HTML through the same renderBodyHtml the public
      // page uses (NOT the editor canvas, NOT .prose which is unstyled here).
      if (next && editor) setPreviewHtml(renderBodyHtml(editor.getHTML()));
      return next;
    });
  }, [editor]);

  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const attrs = editor.getAttributes('link');
    setLinkInitial({
      url: typeof attrs.href === 'string' ? attrs.href : '',
      newTab: attrs.target === '_blank'
    });
    setDialog('link');
  }, [editor]);

  const applyLink = useCallback(
    (url: string, newTab: boolean) => {
      if (!editor) return;
      const trimmed = url.trim();
      if (trimmed === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run();
      } else {
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: trimmed, target: newTab ? '_blank' : null })
          .run();
      }
      setDialog(null);
    },
    [editor]
  );

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setDialog(null);
  }, [editor]);

  const applyImage = useCallback(
    (url: string, alt: string) => {
      if (!editor) return;
      editor.chain().focus().setImage({ src: url.trim(), alt: alt.trim() }).run();
      setDialog(null);
    },
    [editor]
  );

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
        <ToolbarButton
          label="Insert link"
          isActive={editor.isActive('link')}
          onClick={openLinkDialog}
        >
          🔗
        </ToolbarButton>
        <ToolbarButton label="Insert image" onClick={() => setDialog('image')}>
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
          label={showPreview ? 'Hide live preview' : 'Show live preview'}
          isActive={showPreview}
          onClick={togglePreview}
        >
          {showPreview ? 'Hide' : 'Preview'}
        </ToolbarButton>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1" style={{ flexBasis: '20rem' }}>
          <EditorContent editor={editor} />
          <p style={{ marginTop: 6, fontSize: '0.75rem', color: '#6b6256', textAlign: 'right' }}>
            {counts.words} {counts.words === 1 ? 'word' : 'words'} · {counts.chars} characters
          </p>
        </div>
        {showPreview && (
          <div className="min-w-0 flex-1" style={{ flexBasis: '20rem' }} aria-label="Live preview">
            <p
              style={{ margin: '0 0 6px', fontSize: '0.75rem', fontWeight: 600, color: '#6b6256' }}
            >
              Live preview
            </p>
            {/* previewHtml is sanitized by renderBodyHtml — the same render-time guard the public page uses. */}
            <div
              className="blog-body blog-editor-preview"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        )}
      </div>

      {dialog === 'link' && (
        <LinkDialog
          initialUrl={linkInitial.url}
          initialNewTab={linkInitial.newTab}
          onSubmit={applyLink}
          onRemove={removeLink}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === 'image' && <ImageDialog onSubmit={applyImage} onClose={() => setDialog(null)} />}
    </div>
  );
}
