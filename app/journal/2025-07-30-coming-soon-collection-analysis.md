# Coming Soon Collection Analysis

## Date: 2025-07-30

## Summary
Analyzed the coming-soon collection structure to understand its current implementation and prepare for database migration.

## Current Structure

### 1. File-based Content
- Single markdown file: `/src/content/coming-soon/config.md`
- Contains frontmatter configuration for the coming-soon page

### 2. Collection Schema (from content/config.ts)
```typescript
const comingSoonCollection = defineCollection({
  type: 'content',
  schema: z.object({
    enabled: z.boolean().default(false),
    launchDate: z.coerce.date(),
    headline: z.string(),
    message: z.string(),
    showNewsletter: z.boolean().default(false),
    newsletterHeading: z.string().optional(),
    newsletterText: z.string().optional(),
    showContact: z.boolean().default(false),
    showSocial: z.boolean().default(false),
    backgroundImage: z.string().optional()
  })
});
```

### 3. Current Data Fields
From the config.md file:
- `enabled`: boolean (currently true)
- `launchDate`: date (2025-02-01)
- `headline`: string ("We're updating our site")
- `message`: string (enrollment info message)
- `showNewsletter`: boolean (false)
- `newsletterHeading`: string ("Stay Updated")
- `newsletterText`: string (subscription message)
- `showContact`: boolean (false)
- `showSocial`: boolean (false)
- `backgroundImage`: string (empty)

## Current Usage

### 1. Middleware Integration
- The middleware (`src/middleware.ts`) checks for coming soon mode
- Currently uses the `settings` table with key `coming_soon_enabled`
- Does NOT use the coming-soon collection data directly

### 2. Fallback Pattern
- Components like `AdminPreviewBar.astro` try database first
- Falls back to checking `getEntry('coming-soon', 'config')` if database fails
- This suggests a hybrid approach during migration

### 3. Database Tables
Multiple settings tables exist:
- `settings` table (simple key-value)
- `cms_settings` table (JSON values)
- `admin_settings` table (with categories)
- `tuition_settings` table (tuition-specific)

## Migration Considerations

### 1. Data Structure
The coming-soon collection has more fields than just the enabled flag currently stored in settings. Need to decide:
- Store all fields in a dedicated coming_soon table
- Or store as JSON in the existing settings table
- Or create individual settings entries for each field

### 2. Compatibility
- Need to maintain backward compatibility during migration
- The fallback pattern in AdminPreviewBar suggests gradual migration approach
- Middleware only checks enabled status, not other fields

### 3. Missing Implementation
- The coming-soon pages don't actually use the collection data
- They appear to be hardcoded currently
- Full implementation would need to read and display all the configuration fields

## Recommendations

1. Create a dedicated `coming_soon` table with all fields from the schema
2. Migrate the existing `coming_soon_enabled` setting to the new table's `enabled` field
3. Update pages to actually use the configuration data
4. Remove the markdown file after successful migration
5. Update middleware to use the new table structure