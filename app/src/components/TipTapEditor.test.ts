/**
 * Regression test for #132: the TipTap island's hidden `data.body_raw` field must track the editor
 * content across re-renders. The previous uncontrolled `defaultValue` + imperative `ref.value` write
 * was reverted by React on every re-render (for `type="hidden"`, `.value` IS the `value` attribute),
 * so the POSTed body was always the INITIAL html — '' for a new post, the untouched original for
 * an edit. Renders the real island under jsdom and drives the real editor.
 */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';
import type { Editor } from '@tiptap/core';
import TipTapEditor from '@components/TipTapEditor';

// Tell React this is an act()-aware environment (silences the "not configured" warnings).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const FIELD = 'data.body_raw';

let container: HTMLFormElement;
let root: Root;

/** TipTap exposes the Editor on its ProseMirror root element (`dom.editor = this`). */
const editorOn = (form: HTMLElement): Editor => {
  const surface = form.querySelector('.blog-editor-surface') as
    | (HTMLElement & { editor?: Editor })
    | null;
  if (!surface?.editor) throw new Error('editor not mounted');
  return surface.editor;
};

const hiddenValue = (form: HTMLElement): string =>
  (form.querySelector(`input[name="${FIELD}"]`) as HTMLInputElement).value;

/** Flush React effects + TipTap's deferred `create` (a setTimeout(0)) + the resulting re-render. */
const settle = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 20));
  });
};

async function mount(initialHtml?: string) {
  container = document.createElement('form');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(TipTapEditor, { fieldName: FIELD, initialHtml }));
  });
  await settle();
}

afterEach(async () => {
  await act(async () => {
    root.unmount();
  });
  container.remove();
});

describe('TipTapEditor hidden body field (#132)', () => {
  it('mirrors typed content into the hidden field and keeps it across the re-renders each update triggers', async () => {
    await mount();
    const editor = editorOn(container);
    expect(hiddenValue(container)).toBe('<p></p>'); // empty doc, as TipTap serialises it

    await act(async () => {
      editor.commands.setContent('<p>Hello from a phone.</p>');
    });
    await settle(); // onUpdate → setCounts/setIsDirty re-render (this is what used to wipe it)
    expect(hiddenValue(container)).toBe('<p>Hello from a phone.</p>');

    await act(async () => {
      editor.commands.insertContentAt(editor.state.doc.content.size, '<p>Second paragraph.</p>');
    });
    await settle();
    expect(hiddenValue(container)).toBe('<p>Hello from a phone.</p><p>Second paragraph.</p>');
  });

  it('edit mode: the hidden field carries the EDITED body, not the original', async () => {
    await mount('<p>ORIGINAL body text.</p>');
    const editor = editorOn(container);
    expect(hiddenValue(container)).toBe('<p>ORIGINAL body text.</p>');

    await act(async () => {
      editor.commands.setContent('<p>EDITED body text.</p>');
    });
    await settle();
    expect(hiddenValue(container)).toBe('<p>EDITED body text.</p>');
    // And the form would POST the edit.
    expect(new FormData(container).get(FIELD)).toBe('<p>EDITED body text.</p>');
  });
});
