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
import { localInputToUtcIso, utcIsoToLocalInput } from './blog-publish-schedule';

const COLLISION_MESSAGE =
  'A post with this address already exists — choose a different address or edit the existing post.';

// Statuses that must satisfy the full publish gate at save time (R1-F1): published goes live now,
// scheduled goes live unattended — both need excerpt + date + body.
const PUBLISHING_STATUSES = new Set(['published', 'scheduled']);

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
  const date = form.querySelector(`[name="${BLOG_FORM_FIELDS.date}"]`);
  const image = form.querySelector(`[name="${BLOG_FORM_FIELDS.image}"]`);
  const imageAlt = form.querySelector(`[name="${BLOG_FORM_FIELDS.imageAlt}"]`);
  const publishedAtLocal = form.querySelector(`[name="${BLOG_FORM_FIELDS.publishedAtLocal}"]`);
  const publishedAtHidden = form.querySelector(`[name="${BLOG_FORM_FIELDS.publishedAt}"]`);
  const scheduleGroup = form.querySelector('[data-schedule-group]');

  const setRequired = (el: Element | null, required: boolean): void => {
    if (
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement
    ) {
      el.required = required;
    }
  };

  const currentStatus = (): string =>
    statusSelect instanceof HTMLSelectElement ? statusSelect.value : '';

  const syncPublishRequired = (): void => {
    const status = currentStatus();
    const publishing = PUBLISHING_STATUSES.has(status);
    const scheduled = status === 'scheduled';
    setRequired(excerpt, publishing);
    setRequired(date, publishing);
    // Lockstep visibility + `required` for the schedule control: a hidden-but-`required` field makes
    // the form silently unsubmittable ("an invalid form control is not focusable"). So the datetime
    // is required ONLY while its group is shown (scheduled). The markup carries no static `required`.
    setRequired(publishedAtLocal, scheduled);
    if (scheduleGroup instanceof HTMLElement) {
      scheduleGroup.hidden = !scheduled;
    }
  };

  const syncImageAltRequired = (): void => {
    const hasImage = image instanceof HTMLInputElement && image.value.trim().length > 0;
    setRequired(imageAlt, hasImage);
  };

  // Pre-fill the visible datetime-local from the stored UTC `publishedAt` (edit form) so the owner
  // sees the LOCAL time they picked, not raw UTC. Offset is read from the stored instant (DST-aware).
  if (
    publishedAtLocal instanceof HTMLInputElement &&
    publishedAtHidden instanceof HTMLInputElement &&
    publishedAtLocal.value.trim().length === 0 &&
    publishedAtHidden.value.trim().length > 0
  ) {
    const iso = publishedAtHidden.value.trim();
    const localValue = utcIsoToLocalInput(iso, new Date(iso).getTimezoneOffset());
    if (localValue) publishedAtLocal.value = localValue;
  }

  // Body moved from a <textarea> to the TipTap island's hidden field, and `required` does NOT apply
  // to a hidden input — so the publish-time "body required" guard moves to a SUBMIT-TIME check
  // (R3-F10). The server (validateBlogData) stays the source of truth; this is immediate feedback.
  // The field is queried at submit time because the island hydrates after init.
  const isEditorEmpty = (html: string): boolean =>
    html
      .replace(/<p>\s*<\/p>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim().length === 0;

  form.addEventListener('submit', event => {
    const status = currentStatus();
    const publishing = PUBLISHING_STATUSES.has(status);

    // Scheduled: write the zone-attached UTC-Z instant into the hidden persisted field from the
    // owner's local pick. An empty pick stays empty so the server rejects it with the readiness
    // message rather than this client silently inventing a time.
    if (
      status === 'scheduled' &&
      publishedAtLocal instanceof HTMLInputElement &&
      publishedAtHidden instanceof HTMLInputElement
    ) {
      const local = publishedAtLocal.value.trim();
      publishedAtHidden.value = local
        ? localInputToUtcIso(local, new Date(local).getTimezoneOffset())
        : '';
    }

    // Two-gesture reconciliation (R2-F19): Published + a FUTURE picked time would silently
    // publish-now. Make it an explicit, OVERRIDABLE choice (confirm), never a silent surprise.
    if (
      status === 'published' &&
      publishedAtLocal instanceof HTMLInputElement &&
      publishedAtLocal.value.trim().length > 0
    ) {
      const when = new Date(publishedAtLocal.value.trim()).getTime();
      if (!Number.isNaN(when) && when > Date.now()) {
        const proceed = window.confirm(
          'You picked a future date and time, but the status is Published — this publishes the post NOW, not at that time. Choose Scheduled if you want it to go live later. Publish now anyway?'
        );
        if (!proceed) {
          event.preventDefault();
          return;
        }
      }
    }

    // Body-required guard, now covering scheduled as well as published.
    if (!publishing) return;
    const bodyField = form.querySelector(`[name="${BLOG_FORM_FIELDS.bodyRaw}"]`);
    const value =
      bodyField instanceof HTMLInputElement || bodyField instanceof HTMLTextAreaElement
        ? bodyField.value
        : '';
    if (isEditorEmpty(value)) {
      event.preventDefault();
      window.alert('Body is required to publish.');
    }
  });

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
 *
 * `onAutofill` is invoked after the slug value is written programmatically so the caller can re-run
 * the collision check (R2-F12). We deliberately do NOT dispatch an `input` event on the slug here:
 * that would trip the manual-edit listener below (`dataset.manual='true'`) and stop autofill.
 */
function initSlugAutofill(form: HTMLFormElement, onAutofill?: () => void): void {
  const title = form.querySelector(`[name="${BLOG_FORM_FIELDS.title}"]`);
  const slug = form.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`);
  if (!(title instanceof HTMLInputElement) || !(slug instanceof HTMLInputElement)) return;

  title.addEventListener('input', () => {
    if (slug.dataset.manual === 'true') return;
    const normalized = slugify(title.value);
    if (normalized.length > 0) {
      slug.value = normalized.slice(0, 100);
      onAutofill?.();
    }
  });

  slug.addEventListener('input', () => {
    slug.dataset.manual = 'true';
  });
}

/**
 * Blocking slug-collision check (R2-F12 / R2-F30) on the add-form. Reads the server-rendered slug
 * list from `[data-existing-slugs]`; mutates the inline `role="alert"` ONLY on state transition.
 *
 * Returns the `evaluate` callback so the title-autofill handler can re-run the check after it
 * programmatically writes the slug (R2-F12 — an auto-generated colliding slug must warn too).
 * Returns `null` when there is no usable slug input to wire.
 */
function initSlugCollision(doc: Document, form: HTMLFormElement): (() => void) | null {
  const slug = form.querySelector(`[name="${BLOG_FORM_FIELDS.slug}"]`);
  if (!(slug instanceof HTMLInputElement)) return null;

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

  return evaluate;
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

/**
 * Bulk-action confirmation (R4-F14). The toolbar's Archive/Delete buttons carry the action; this
 * adds a COUNT-AWARE, irreversibility-naming confirm on click (a static `data-confirm` can't count
 * the live selection). Preventing the click's default stops the submit, so a cancelled confirm — or
 * an empty selection — never POSTs. Runs on click (not the form's submit) so `event.submitter`
 * support is not required, and uses `stopImmediatePropagation` on cancel so the shared loading-state
 * handler cannot disable the button after a cancel (belt-and-suspenders with `data-no-loading`).
 */
function initBulkActions(doc: Document): void {
  const bulkForm = doc.querySelector('[data-bulk-blog-form]');
  if (!(bulkForm instanceof HTMLFormElement)) return;

  const countChecked = (): number => doc.querySelectorAll('input[name="slugs"]:checked').length;

  bulkForm.querySelectorAll('button[data-bulk-action]').forEach(button => {
    button.addEventListener('click', event => {
      const action = button instanceof HTMLElement ? button.dataset.bulkAction : '';
      const count = countChecked();
      if (count === 0) {
        event.preventDefault();
        event.stopImmediatePropagation();
        window.alert('Tick the box next to at least one post first.');
        return;
      }
      const noun = count === 1 ? 'post' : 'posts';
      const message =
        action === 'delete'
          ? `Delete ${count} ${noun}? This cannot be undone.`
          : `Archive ${count} ${noun}? They will be hidden from the public but kept — you can restore them.`;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    });
  });
}

export function initBlogAdmin(doc: Document = document): void {
  const forms = doc.querySelectorAll('[data-blog-form]');
  forms.forEach(form => {
    if (!(form instanceof HTMLFormElement)) return;
    initConditionalRequired(form);
    if (form.hasAttribute('data-new-blog-form')) {
      // Wire collision first so autofill can re-run the check after writing the slug (R2-F12).
      const evaluateCollision = initSlugCollision(doc, form);
      initSlugAutofill(form, evaluateCollision ?? undefined);
    }
  });

  initBulkActions(doc);
  initErrorFlashFocus(doc);
}
