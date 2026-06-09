# ADR-011: Dedicated blog editor pages over the single-page accordion dashboard

**Date**: 2026-06-09
**Status**: Accepted (supersedes the R3-F15 "keep-accordion" choice recorded in `docs/specs/blog.md`)

## Context

The Blog V2 admin (`/admin/blog`) shipped as a single ~1,086-line page built from nested `<details>`
accordions: list + create + edit all stacked on one page, the TipTap editor buried inside an
accordion (and the metadata buried in further accordions nested inside it), and link/image insertion
driven by raw `window.prompt()` boxes. During the V2 build the owner explicitly chose to keep the
per-post accordion edit forms over a scannable table (recorded as **R3-F15**). In use, the owner
found the result "strange" — nothing is visible until expanded, which is the opposite of the WYSIWYG
experience TipTap can provide (issue **#114**).

The editor *component* (`TipTapEditor.tsx`) is capable; the problem is the page that wraps it. We
workshopped the direction with the owner, who chose: a **dedicated editor page** layout, a **polished
+ expanded toolset**, **in-editor dialogs + a live side-by-side preview**, and a **brand-only color
palette**.

## Decision

Split the admin into a **list page** and **dedicated editor pages**, delivered across three PRs:

- **PR A (this ADR's first increment).** `/admin/blog` becomes a clean, scannable list (four
  lifecycle groups, bulk + per-row actions, a New Post button). The authoring form moves to dedicated
  routes `/admin/blog/new` and `/admin/blog/edit/[slug]`, sharing one component
  `app/src/components/admin/BlogEditorForm.astro` — title + TipTap body in the main column, **all
  metadata in an always-visible sidebar**. The form-POST contract to `/api/admin/content` (field
  names, hidden inputs, `createOnly`/`baseDataJson`, `redirectTo`, validation, upload widget, flash
  logic) is **preserved exactly**; only the layout changes, so the backend, the client module
  (`blog-admin-client.ts`), and every R-numbered behavior carry over unchanged.
- **PR B.** Polish + power tools (grouped/labeled/sticky toolbar, undo/redo, horizontal rule,
  word/character count, in-editor link & image dialogs wired to `/admin/media`), plus **highlight**
  (`<mark>`) and **brand-palette text colors** (class-based). The only new XSS surface is bounded:
  `<mark>` + the brand color/highlight classes added to `STRICT_CONFIG_V2` (`blog-html.ts`) and the
  extensions→sanitizer matrix test; `style`/`id` stay banned (ADR-009's render-time sanitization
  remains the trust boundary).
- **PR C.** A live side-by-side preview pane (rendered through the same `renderBodyHtml` the public
  page uses) replacing the Edit/Preview toggle, plus a responsive/accessibility pass.

This reverses **R3-F15**: the scannable list the owner previously declined is now the chosen design,
because the dedicated editor makes the per-row accordion redundant.

## Consequences

- **Better authoring UX**: a focused, fully-visible editing surface (WordPress/Ghost-style) instead
  of nested disclosures; the list is scannable at a glance.
- **No backend or data change**: the redesign is UI-only against the existing endpoint. Slug
  immutability, scheduled publishing, image-alt validation, and the four-state lifecycle are
  untouched.
- **Bounded new security surface** (PR B only): two new construct types in the render-time sanitizer,
  each covered by the matrix test. The write path still stores raw editor HTML; sanitize-at-render
  stays the sole trust boundary (per ADR-009 / `docs/specs/blog.md`).
- **Editing URL changes**: editing now happens at `/admin/blog/edit/[slug]` rather than an inline
  accordion. After a save the owner returns to the list with the existing status-aware flash (the
  redirect targets are unchanged).
- **Deferred**: a taxonomy (categories/tags) editor remains out of scope; the sidebar shows existing
  categories/tags read-only and the values are still carried losslessly via `baseDataJson`.
