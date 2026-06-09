import { describe, expect, it, vi } from 'vitest';
import { initBlogAdmin } from '@lib/blog-admin-client';
import { BLOG_FORM_FIELDS } from '@lib/blog-form-fields';

// vitest's `environment: 'jsdom'` is global (vitest.config.ts:22) — no per-file docblock needed.

type FormKind = 'add' | 'edit';

interface BuildOptions {
  kind: FormKind;
  status?: string; // initial status select value
  imageValue?: string; // initial image URL value
}

/**
 * Build a blog form into a fresh Document and return both. Mirrors the markup blog.astro renders:
 * the field `name`s come from BLOG_FORM_FIELDS so the test pins the same contract the page uses.
 */
function buildDoc(options: BuildOptions, existingSlugs: string[] = []): { doc: Document } {
  const doc = document.implementation.createHTMLDocument('blog-admin');

  const slugContainer = doc.createElement('div');
  slugContainer.setAttribute('data-existing-slugs', JSON.stringify(existingSlugs));
  doc.body.appendChild(slugContainer);

  const form = doc.createElement('form');
  form.setAttribute('data-blog-form', '');
  if (options.kind === 'add') form.setAttribute('data-new-blog-form', '');

  const title = doc.createElement('input');
  title.setAttribute('name', BLOG_FORM_FIELDS.title);
  title.required = true;
  form.appendChild(title);

  const slug = doc.createElement('input');
  slug.setAttribute('name', BLOG_FORM_FIELDS.slug);
  slug.required = true;
  form.appendChild(slug);

  const status = doc.createElement('select');
  status.setAttribute('name', BLOG_FORM_FIELDS.status);
  const draftOpt = doc.createElement('option');
  draftOpt.value = 'draft';
  draftOpt.textContent = 'Draft';
  const publishedOpt = doc.createElement('option');
  publishedOpt.value = 'published';
  publishedOpt.textContent = 'Published';
  status.append(draftOpt, publishedOpt);
  status.value = options.status ?? 'draft';
  form.appendChild(status);

  const date = doc.createElement('input');
  date.type = 'date';
  date.setAttribute('name', BLOG_FORM_FIELDS.date);
  form.appendChild(date);

  const excerpt = doc.createElement('textarea');
  excerpt.setAttribute('name', BLOG_FORM_FIELDS.excerptRaw);
  form.appendChild(excerpt);

  const body = doc.createElement('textarea');
  body.setAttribute('name', BLOG_FORM_FIELDS.bodyRaw);
  form.appendChild(body);

  const image = doc.createElement('input');
  image.setAttribute('name', BLOG_FORM_FIELDS.image);
  image.value = options.imageValue ?? '';
  form.appendChild(image);

  const imageAlt = doc.createElement('input');
  imageAlt.setAttribute('name', BLOG_FORM_FIELDS.imageAlt);
  form.appendChild(imageAlt);

  doc.body.appendChild(form);
  return { doc };
}

const field = (doc: Document, name: string): HTMLInputElement | HTMLTextAreaElement =>
  doc.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement;

describe('initBlogAdmin — conditional required', () => {
  it('sets required on excerpt/date at init for a published edit-form, with NO events (R2-F9)', () => {
    const { doc } = buildDoc({ kind: 'edit', status: 'published' });
    initBlogAdmin(doc);

    expect(field(doc, BLOG_FORM_FIELDS.excerptRaw).required).toBe(true);
    expect(field(doc, BLOG_FORM_FIELDS.date).required).toBe(true);
  });

  it('leaves excerpt/date optional at init for a draft form', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' });
    initBlogAdmin(doc);

    expect(field(doc, BLOG_FORM_FIELDS.excerptRaw).required).toBe(false);
    expect(field(doc, BLOG_FORM_FIELDS.date).required).toBe(false);
  });

  it('sets required on publish-fields when status flips to published via change', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' });
    initBlogAdmin(doc);

    const status = doc.querySelector(`[name="${BLOG_FORM_FIELDS.status}"]`) as HTMLSelectElement;
    status.value = 'published';
    status.dispatchEvent(new Event('change'));

    expect(field(doc, BLOG_FORM_FIELDS.excerptRaw).required).toBe(true);
    expect(field(doc, BLOG_FORM_FIELDS.date).required).toBe(true);
  });

  it('clears required on publish-fields when status reverts to draft', () => {
    const { doc } = buildDoc({ kind: 'edit', status: 'published' });
    initBlogAdmin(doc);

    const status = doc.querySelector(`[name="${BLOG_FORM_FIELDS.status}"]`) as HTMLSelectElement;
    status.value = 'draft';
    status.dispatchEvent(new Event('change'));

    expect(field(doc, BLOG_FORM_FIELDS.excerptRaw).required).toBe(false);
    expect(field(doc, BLOG_FORM_FIELDS.date).required).toBe(false);
  });

  it('blocks a publish submit with an empty editor body, allows a non-empty one (R3-F10 submit-time guard)', () => {
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    const { doc } = buildDoc({ kind: 'edit', status: 'published' });
    initBlogAdmin(doc);
    const form = doc.querySelector('form[data-blog-form]') as HTMLFormElement;

    // Empty editor (TipTap emits "<p></p>" for an empty doc) → submit is blocked.
    field(doc, BLOG_FORM_FIELDS.bodyRaw).value = '<p></p>';
    const blocked = new Event('submit', { cancelable: true });
    form.dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);

    // Non-empty body → submit proceeds.
    field(doc, BLOG_FORM_FIELDS.bodyRaw).value = '<p>Real content.</p>';
    const allowed = new Event('submit', { cancelable: true });
    form.dispatchEvent(allowed);
    expect(allowed.defaultPrevented).toBe(false);
  });

  it('requires imageAlt when an image value is set, releases it when cleared', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' });
    initBlogAdmin(doc);

    const image = doc.querySelector(`[name="${BLOG_FORM_FIELDS.image}"]`) as HTMLInputElement;
    image.value = 'https://example.com/x.jpg';
    image.dispatchEvent(new Event('input'));
    expect(field(doc, BLOG_FORM_FIELDS.imageAlt).required).toBe(true);

    image.value = '';
    image.dispatchEvent(new Event('input'));
    expect(field(doc, BLOG_FORM_FIELDS.imageAlt).required).toBe(false);
  });

  it('requires imageAlt at init when the image field starts non-empty (edit-form)', () => {
    const { doc } = buildDoc({ kind: 'edit', status: 'draft', imageValue: '/images/seed.jpg' });
    initBlogAdmin(doc);
    expect(field(doc, BLOG_FORM_FIELDS.imageAlt).required).toBe(true);
  });
});

describe('initBlogAdmin — slug collision (add-form)', () => {
  it('sets custom validity + renders an inline alert when the slug collides', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' }, ['existing-post']);
    initBlogAdmin(doc);

    const slug = doc.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`) as HTMLInputElement;
    slug.value = 'existing-post';
    slug.dispatchEvent(new Event('input'));

    expect(slug.validationMessage.length).toBeGreaterThan(0);
    const alert = doc.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent ?? '').toContain('already exists');
  });

  it('clears custom validity and removes the alert when the slug changes to a free value', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' }, ['existing-post']);
    initBlogAdmin(doc);

    const slug = doc.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`) as HTMLInputElement;
    slug.value = 'existing-post';
    slug.dispatchEvent(new Event('input'));
    expect(doc.querySelector('[role="alert"]')).not.toBeNull();

    slug.value = 'a-free-slug';
    slug.dispatchEvent(new Event('input'));
    expect(slug.validationMessage).toBe('');
    expect(doc.querySelector('[role="alert"]')).toBeNull();
  });

  it('does not re-create/churn the alert node on a same-state (still-colliding) input', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' }, ['existing-post']);
    initBlogAdmin(doc);

    const slug = doc.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`) as HTMLInputElement;
    slug.value = 'existing-post';
    slug.dispatchEvent(new Event('input'));
    const firstAlert = doc.querySelector('[role="alert"]');
    expect(firstAlert).not.toBeNull();

    // Still colliding (same value) — fire input again; the node must be the SAME reference.
    slug.dispatchEvent(new Event('input'));
    const secondAlert = doc.querySelector('[role="alert"]');
    expect(secondAlert).toBe(firstAlert);
  });

  it('does nothing for an edit-form (no slug autofill / collision wiring)', () => {
    const { doc } = buildDoc({ kind: 'edit', status: 'draft' }, ['existing-post']);
    initBlogAdmin(doc);

    const slug = doc.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`) as HTMLInputElement;
    slug.value = 'existing-post';
    slug.dispatchEvent(new Event('input'));
    expect(slug.validationMessage).toBe('');
    expect(doc.querySelector('[role="alert"]')).toBeNull();
  });
});

describe('initBlogAdmin — slug autofill (add-form)', () => {
  it('slugifies the title into the slug input until the slug is manually edited', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' });
    initBlogAdmin(doc);

    const title = doc.querySelector(`[name="${BLOG_FORM_FIELDS.title}"]`) as HTMLInputElement;
    const slug = doc.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`) as HTMLInputElement;

    title.value = 'Nurturing Growth!';
    title.dispatchEvent(new Event('input'));
    expect(slug.value).toBe('nurturing-growth');

    // User manually edits the slug — autofill stops.
    slug.value = 'my-custom-slug';
    slug.dispatchEvent(new Event('input'));
    title.value = 'Something Else';
    title.dispatchEvent(new Event('input'));
    expect(slug.value).toBe('my-custom-slug');
  });

  it('fires the collision warning when the auto-generated slug collides (R2-F12)', () => {
    const { doc } = buildDoc({ kind: 'add', status: 'draft' }, ['nurturing-growth']);
    initBlogAdmin(doc);

    const title = doc.querySelector(`[name="${BLOG_FORM_FIELDS.title}"]`) as HTMLInputElement;
    const slug = doc.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`) as HTMLInputElement;

    // Typing the title autofills a slug that collides with an existing post; the collision check
    // must fire even though no `input` event was dispatched on the slug itself.
    title.value = 'Nurturing Growth!';
    title.dispatchEvent(new Event('input'));

    expect(slug.value).toBe('nurturing-growth');
    expect(slug.validationMessage.length).toBeGreaterThan(0);
    const alert = doc.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent ?? '').toContain('already exists');
  });
});

describe('initBlogAdmin — error flash focus (R3-F22)', () => {
  it('focuses the error flash once when present', () => {
    const doc = document.implementation.createHTMLDocument('flash');
    const flash = doc.createElement('p');
    flash.setAttribute('data-error-flash', '');
    flash.setAttribute('role', 'alert');
    flash.setAttribute('tabindex', '-1');
    doc.body.appendChild(flash);

    // A detached createHTMLDocument has no defaultView, so jsdom does not move activeElement on
    // .focus(); assert the behavioral contract (focus() invoked once on the flash) via a spy.
    const focusSpy = vi.spyOn(flash, 'focus');
    initBlogAdmin(doc);
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw when no error flash is present', () => {
    const doc = document.implementation.createHTMLDocument('no-flash');
    expect(() => initBlogAdmin(doc)).not.toThrow();
  });
});
