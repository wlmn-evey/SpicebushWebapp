import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import { buildBlogEditorExtensions, shouldAutoLinkBlogUrl } from './blog-editor-extensions';
import { renderBodyHtml } from './blog-html';

let editor: Editor | null = null;
afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('blog editor Link configuration (sanitizer-compatible links)', () => {
  it('uses https as the default protocol for scheme-less links (StarterKit default is http)', () => {
    editor = new Editor({ extensions: buildBlogEditorExtensions() });
    const link = editor.extensionManager.extensions.find(ext => ext.name === 'link');
    expect(link?.options.defaultProtocol).toBe('https');
  });

  it('an autolink-style scheme-less href survives the render-time sanitizer once prefixed', () => {
    // linkify prefixes the defaultProtocol: with 'https' the result is kept, with 'http' it vanished.
    expect(renderBodyHtml('<p><a href="https://example.com">example.com</a></p>')).toContain(
      'href="https://example.com"'
    );
    expect(renderBodyHtml('<p><a href="http://example.com">example.com</a></p>')).not.toContain(
      'href='
    );
  });
});

describe('shouldAutoLinkBlogUrl', () => {
  it('never autolinks explicit http: URLs (their href would be stripped at render)', () => {
    expect(shouldAutoLinkBlogUrl('http://example.com')).toBe(false);
    expect(shouldAutoLinkBlogUrl('HTTP://example.com/x')).toBe(false);
  });

  it('keeps TipTap default behaviour otherwise', () => {
    expect(shouldAutoLinkBlogUrl('https://example.com')).toBe(true);
    expect(shouldAutoLinkBlogUrl('mailto:a@b.org')).toBe(true);
    expect(shouldAutoLinkBlogUrl('example.com')).toBe(true);
    expect(shouldAutoLinkBlogUrl('www.example.org/path')).toBe(true);
    expect(shouldAutoLinkBlogUrl('localhost')).toBe(false);
    expect(shouldAutoLinkBlogUrl('192.168.0.1')).toBe(false);
  });
});
