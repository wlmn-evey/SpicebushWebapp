/**
 * Client behavior for `/admin/blog` (R2-F36 + R4-F7). Trimmed to faq.astro's complexity class:
 * conditional-`required` toggling, add-form slug autofill, and a blocking slug-collision check.
 *
 * Deliberately CUT (R4-F7): body-image-alt scanner, imageAlt filename/generic-word predicate,
 * backslash-URL tail check. `minlength`/`pattern` on imageAlt/image are declarative in the page
 * markup, NOT set here. The server (`validateBlogData`) remains the source of truth.
 *
 * `initBlogAdmin(doc)` takes an optional Document so jsdom unit tests can pass a constructed one.
 */
import { BLOG_FORM_FIELDS } from '@lib/blog-form-fields';

const COLLISION_MESSAGE =
  'A post with this address already exists — choose a different address or edit the existing post.';

const slugify = (value: string): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Wire conditional-`required` state for one blog form. Runs once at init (computing state from the
 * INITIAL field values — R2-F9), then re-runs on status `change` and image-URL `input`.
 */
function initConditionalRequired(form: HTMLFormElement): void {
  const statusSelect = form.querySelector(`[name="${BLOG_FORM_FIELDS.status}"]`);
  const excerpt = form.querySelector(`[name="${BLOG_FORM_FIELDS.excerptRaw}"]`);
  const body = form.querySelector(`[name="${BLOG_FORM_FIELDS.bodyRaw}"]`);
  const date = form.querySelector(`[name="${BLOG_FORM_FIELDS.date}"]`);
  const image = form.querySelector(`[name="${BLOG_FORM_FIELDS.image}"]`);
  const imageAlt = form.querySelector(`[name="${BLOG_FORM_FIELDS.imageAlt}"]`);

  const setRequired = (el: Element | null, required: boolean): void => {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      el.required = required;
    }
  };

  const syncPublishRequired = (): void => {
    const publishing =
      statusSelect instanceof HTMLSelectElement && statusSelect.value === 'published';
    setRequired(excerpt, publishing);
    setRequired(body, publishing);
    setRequired(date, publishing);
  };

  const syncImageAltRequired = (): void => {
    const hasImage = image instanceof HTMLInputElement && image.value.trim().length > 0;
    setRequired(imageAlt, hasImage);
  };

  if (statusSelect instanceof HTMLSelectElement) {
    statusSelect.addEventListener('change', syncPublishRequired);
  }
  if (image instanceof HTMLInputElement) {
    image.addEventListener('input', syncImageAltRequired);
  }

  // Initial state from the rendered values, NO events required (R2-F9).
  syncPublishRequired();
  syncImageAltRequired();
}

/**
 * Slug autofill from the title (add-form only). Mirrors faq.astro:776-796 — slugify the title into
 * the slug input on `input`, stopping once the user manually edits the slug. No date prefix.
 */
function initSlugAutofill(form: HTMLFormElement): void {
  const title = form.querySelector(`[name="${BLOG_FORM_FIELDS.title}"]`);
  const slug = form.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`);
  if (!(title instanceof HTMLInputElement) || !(slug instanceof HTMLInputElement)) return;

  title.addEventListener('input', () => {
    if (slug.dataset.manual === 'true') return;
    const normalized = slugify(title.value);
    if (normalized.length > 0) {
      slug.value = normalized.slice(0, 100);
    }
  });

  slug.addEventListener('input', () => {
    slug.dataset.manual = 'true';
  });
}

/**
 * Blocking slug-collision check (R2-F12 / R2-F30) on the add-form. Reads the server-rendered slug
 * list from `[data-existing-slugs]`; mutates the inline `role="alert"` ONLY on state transition.
 */
function initSlugCollision(doc: Document, form: HTMLFormElement): void {
  const slug = form.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`);
  if (!(slug instanceof HTMLInputElement)) return;

  const listContainer = doc.querySelector('[data-existing-slugs]');
  let existing: string[] = [];
  if (listContainer instanceof HTMLElement && listContainer.dataset.existingSlugs) {
    try {
      const parsed: unknown = JSON.parse(listContainer.dataset.existingSlugs);
      if (Array.isArray(parsed)) {
        existing = parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      existing = [];
    }
  }

  const alertId = 'blog-slug-collision-alert';
  let inCollision = false;

  const showAlert = (): void => {
    if (doc.getElementById(alertId)) return;
    const alert = doc.createElement('p');
    alert.id = alertId;
    alert.setAttribute('role', 'alert');
    alert.className = 'mt-1 text-sm text-red-800';
    alert.textContent = COLLISION_MESSAGE;
    slug.insertAdjacentElement('afterend', alert);
    const describedBy = slug.getAttribute('aria-describedby');
    slug.setAttribute('aria-describedby', describedBy ? `${describedBy} ${alertId}` : alertId);
  };

  const hideAlert = (): void => {
    const alert = doc.getElementById(alertId);
    if (alert) alert.remove();
    const describedBy = slug.getAttribute('aria-describedby');
    if (describedBy) {
      const next = describedBy
        .split(/\s+/)
        .filter(token => token && token !== alertId)
        .join(' ');
      if (next) {
        slug.setAttribute('aria-describedby', next);
      } else {
        slug.removeAttribute('aria-describedby');
      }
    }
  };

  const evaluate = (): void => {
    const collision = existing.includes(slug.value.trim());
    if (collision === inCollision) return; // mutate ONLY on state transition (R2-F30)
    inCollision = collision;
    if (collision) {
      showAlert();
      slug.setCustomValidity(COLLISION_MESSAGE);
    } else {
      hideAlert();
      slug.setCustomValidity('');
    }
  };

  slug.addEventListener('input', evaluate);
  evaluate();
}

/**
 * Error-flash focus init (R3-F22). Focus the error flash once, then strip `?error=` from the URL so
 * a reload/back does not re-focus stale state. Guarded for jsdom's partial location/history.
 */
function initErrorFlashFocus(doc: Document): void {
  const flash = doc.querySelector('[data-error-flash]');
  if (!(flash instanceof HTMLElement)) return;
  flash.focus();

  try {
    const loc = doc.defaultView?.location;
    const hist = doc.defaultView?.history;
    if (loc && hist && typeof hist.replaceState === 'function') {
      const url = new URL(loc.href);
      if (url.searchParams.has('error')) {
        url.searchParams.delete('error');
        hist.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
      }
    }
  } catch {
    // jsdom may lack a usable location/history; the focus already happened, so swallow.
  }
}

export function initBlogAdmin(doc: Document = document): void {
  const forms = doc.querySelectorAll('[data-blog-form]');
  forms.forEach(form => {
    if (!(form instanceof HTMLFormElement)) return;
    initConditionalRequired(form);
    if (form.hasAttribute('data-new-blog-form')) {
      initSlugAutofill(form);
      initSlugCollision(doc, form);
    }
  });

  initErrorFlashFocus(doc);
}
