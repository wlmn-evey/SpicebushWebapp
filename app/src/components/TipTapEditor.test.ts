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

// Built at runtime so the no-script-url lint rule doesn't flag the hostile fixture.
const SCRIPT_URL = ['javascript', 'alert(1)'].join(':');

// Tell React this is an act()-aware environment (silences the "not configured" warnings).
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom has no layout: ProseMirror's scrollIntoView (run by the dialog commands' `.focus()`) calls
// getClientRects/getBoundingClientRect. Stub them to empty geometry so those commands can run.
const emptyRect = { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
for (const proto of [Element.prototype, Range.prototype] as unknown as Array<
  Record<string, unknown>
>) {
  proto.getClientRects ??= () => Object.assign([], { item: () => null });
  proto.getBoundingClientRect ??= () => ({ ...emptyRect, toJSON: () => emptyRect });
}

const FIELD = 'data.body_raw';

let container: HTMLFormElement;
let root: Root;

/** TipTap exposes the Editor on its ProseMirror root element (`dom.editor = this`). */
const editorOn = (form: HTMLElement): Editor => {
  const surface = form.querySelector('.blog-editor-surface') as
    (HTMLElement & { editor?: Editor }) | null;
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

/** True when the leave-page guard would prompt (the beforeunload handler called preventDefault). */
const leaveWouldPrompt = (): boolean => {
  const ev = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(ev);
  return ev.defaultPrevented;
};

/** Set a React-controlled input's value the way a user edit does (native setter + bubbling input). */
const typeInto = async (input: HTMLInputElement, value: string) => {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    setter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const clickButton = async (root: ParentNode, label: string) => {
  const button = Array.from(root.querySelectorAll('button')).find(
    b => b.getAttribute('aria-label') === label || b.textContent?.trim() === label
  );
  if (!button) throw new Error(`button ${label} not found`);
  await act(async () => {
    button.click();
  });
};

describe('TipTapEditor unsaved-changes guard', () => {
  it('a form-level edit (e.g. the title) arms the leave-page warning, not only body edits', async () => {
    await mount('<p>Body.</p>');
    const title = document.createElement('input');
    title.name = 'title';
    container.appendChild(title);
    expect(leaveWouldPrompt()).toBe(false);

    await act(async () => {
      title.value = 'New title';
      title.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(leaveWouldPrompt()).toBe(true);
  });

  it('keeps the warning armed when a validator cancels the submit; clears it when the save proceeds', async () => {
    await mount('<p>Body.</p>');
    const editor = editorOn(container);
    await act(async () => {
      editor.commands.setContent('<p>Edited.</p>');
    });
    await settle();
    expect(leaveWouldPrompt()).toBe(true);

    // A client validator (blog-admin-client.ts) rejects the save → still dirty.
    container.addEventListener('submit', e => e.preventDefault(), { once: true });
    await act(async () => {
      container.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    await settle();
    expect(leaveWouldPrompt()).toBe(true);

    // An accepted submit → the redirect after the POST must not prompt.
    await act(async () => {
      container.dispatchEvent(new Event('submit', { cancelable: true }));
    });
    await settle();
    expect(leaveWouldPrompt()).toBe(false);
  });
});

describe('TipTapEditor link/image dialogs only accept sanitizer-safe addresses', () => {
  it('link: upgrades http:// to https:// with a visible note and stores the https href', async () => {
    await mount('<p>Read more here.</p>');
    const editor = editorOn(container);
    await act(async () => {
      editor.commands.selectAll();
    });
    await clickButton(container, 'Insert link');
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await typeInto(
      dialog.querySelector('input[type="text"]') as HTMLInputElement,
      'http://example.com/x'
    );
    expect(dialog.textContent).toContain('Will be saved as https://example.com/x');

    await clickButton(dialog, 'Add');
    await settle();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(hiddenValue(container)).toContain('href="https://example.com/x"');
    expect(hiddenValue(container)).not.toContain('http://');
  });

  it('link: refuses an address the sanitizer would strip, with an inline error, and keeps the dialog open', async () => {
    await mount('<p>Text.</p>');
    await act(async () => {
      editorOn(container).commands.selectAll();
    });
    await clickButton(container, 'Insert link');
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await typeInto(dialog.querySelector('input[type="text"]') as HTMLInputElement, SCRIPT_URL);
    await clickButton(dialog, 'Add');
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(dialog.querySelector('[role="alert"]')?.textContent).toMatch(/https:\/\//);
    expect(hiddenValue(container)).not.toContain('href=');
  });

  it('image: refuses a non-image scheme and upgrades http:// on insert', async () => {
    await mount('<p>Text.</p>');
    await clickButton(container, 'Insert image');
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const [urlInput, altInput] = Array.from(
      dialog.querySelectorAll('input[type="text"]')
    ) as HTMLInputElement[];
    await typeInto(altInput, 'Children planting seedlings');

    await typeInto(urlInput, 'mailto:a@b.org');
    await clickButton(dialog, 'Insert');
    expect(dialog.querySelector('[role="alert"]')).not.toBeNull();
    expect(hiddenValue(container)).not.toContain('<img');

    await typeInto(urlInput, 'http://cdn.example.org/kids.jpg');
    await clickButton(dialog, 'Insert');
    await settle();
    expect(hiddenValue(container)).toContain('src="https://cdn.example.org/kids.jpg"');
  });
});
