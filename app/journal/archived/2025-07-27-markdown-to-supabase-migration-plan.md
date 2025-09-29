# Migration Plan: Markdown to Supabase Database

## Date: July 27, 2025

## Project: Spicebush Montessori Website Migration

## Overview
Architecting a migration strategy to move content from Astro Content Collections (markdown files) to Supabase database storage to enable CMS functionality.

## Current State Analysis

### Content Structure
- **Location**: `/src/content/` directory
- **Format**: Markdown files with YAML frontmatter
- **Access**: Via Astro's `getCollection()` API
- **Content Types**:
  - Blog posts (6 files)
  - Staff profiles (3 files)
  - Announcements (0 files currently)
  - Events (0 files currently)
  - Tuition programs/rates (14 files)
  - School hours (7 files)
  - Testimonials (3 files)
  - Photos metadata (100+ files)
  - School info (1 file)
  - Settings (8 files)
  - Coming soon config (1 file)

### Database Schema
- **Tables**: Already created via migration `20250727_cms_tables.sql`
- **Structure**: JSONB content field for flexible storage
- **Auth**: RLS policies in place
- **Naming**: All tables prefixed with `cms_`

## Migration Strategy

### Phase 1: Migration Scripts Development
1. Create TypeScript migration scripts for each content type
2. Parse markdown frontmatter and body content
3. Transform to match database schema
4. Handle special cases (tuition with programs vs rates)
5. Preserve all metadata and relationships

### Phase 2: Database Population
1. Run migration scripts in development first
2. Verify data integrity
3. Create backup of markdown files
4. Execute migration to production
5. Verify all content migrated correctly

### Phase 3: Update Site Queries
1. Create Supabase query functions to replace `getCollection()`
2. Update all page components to use database queries
3. Maintain same data structure for minimal component changes
4. Add error handling and fallbacks
5. Test all pages thoroughly

### Phase 4: Media Handling
1. Images remain in public/images directory (no change)
2. Update image paths in database if needed
3. Ensure all image references work correctly

### Phase 5: Rollback Plan
1. Keep markdown files as backup
2. Create database export after migration
3. Document rollback procedures
4. Test rollback in development

## Technical Details

### Content Transformation Map
- Markdown frontmatter → JSONB content field
- Markdown body → content.body in JSONB
- File slug → slug column
- Timestamps → created_at/updated_at

### Special Considerations
1. **Tuition**: Split between programs and rates (type field)
2. **Photos**: Large volume, batch processing needed
3. **Settings**: Key-value pairs, different structure
4. **Coming Soon**: Single config file to settings table

## Next Steps
1. Create migration script templates
2. Test with sample data
3. Review with team
4. Schedule migration window