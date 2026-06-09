-- Phase-2 lifecycle (R4-F2): enforce the blog four-state status set at the storage layer as
-- defense-in-depth behind validateBlogData's whitelist AND behind the exact-match
-- `WHERE status = 'published'` public read filter. This documents the canonical blog state set
-- authoritatively and stops both the widened validateBlogData path and the separate
-- `action=archive` path from ever persisting an unexpected blog status string.
--
-- TYPE-SCOPED, not table-wide: `content.status` is SHARED across all content types
-- (blog/faq/hours/media-slots/photos/school-info/staff/testimonials/tuition), every one of which
-- uses only 'published' today. A table-wide `status IN (4 blog states)` CHECK would couple every
-- content type to the BLOG lifecycle and would break a future non-blog status. The
-- `type <> 'blog' OR ...` form constrains ONLY blog rows and leaves every other type unconstrained.
-- All existing blog rows are 'published' (a member of the set), so the constraint validates
-- immediately without rewriting any data.
--
-- Idempotent: guarded on pg_constraint so a re-run (or out-of-band manual apply) is a no-op. The
-- migration runner also tracks applied versions in schema_migrations, so this normally runs once.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_blog_status_check'
  ) THEN
    ALTER TABLE content
      ADD CONSTRAINT content_blog_status_check
      CHECK (type <> 'blog' OR status IN ('draft', 'published', 'scheduled', 'archived'));
  END IF;
END $$;
