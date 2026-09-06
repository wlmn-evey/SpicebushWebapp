import { describe, expect, it } from 'vitest';
import { isBlogBodyEmpty } from '@lib/blog-body-text';

describe('isBlogBodyEmpty (#132 — shared client/server empty-body rule)', () => {
  it('treats the empty-editor markup TipTap emits as empty', () => {
    expect(isBlogBodyEmpty('')).toBe(true);
    expect(isBlogBodyEmpty('<p></p>')).toBe(true);
    expect(isBlogBodyEmpty('<p></p><p></p>')).toBe(true);
    expect(isBlogBodyEmpty('<p> </p><p><br></p>')).toBe(true);
    expect(isBlogBodyEmpty('<p>&nbsp;</p>')).toBe(true);
    expect(isBlogBodyEmpty('<h2></h2><ul><li><p></p></li></ul>')).toBe(true);
    expect(isBlogBodyEmpty('   \n\t ')).toBe(true);
  });

  it('treats real text as content, in HTML or legacy markdown', () => {
    expect(isBlogBodyEmpty('<p>Real content.</p>')).toBe(false);
    expect(isBlogBodyEmpty('<p></p><p>x</p>')).toBe(false);
    expect(isBlogBodyEmpty('Plain **markdown** body')).toBe(false);
  });

  it('treats an image-only body as content', () => {
    expect(isBlogBodyEmpty('<img src="/media/x.jpg" alt="Children planting seedlings">')).toBe(
      false
    );
    expect(isBlogBodyEmpty('<p><IMG src="/x.png" alt="Garden beds"></p>')).toBe(false);
  });

  it('treats non-strings as empty', () => {
    expect(isBlogBodyEmpty(undefined)).toBe(true);
    expect(isBlogBodyEmpty(null)).toBe(true);
    expect(isBlogBodyEmpty(42)).toBe(true);
  });
});
