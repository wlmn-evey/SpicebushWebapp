# Coming Soon Settings Migration Scripts

## Date: 2025-07-30

## Summary
Created migration scripts to transfer coming-soon configuration from markdown files to the database settings table, maintaining consistency with the existing key-value pattern.

## Implementation Details

### 1. TypeScript Migration Script
- **Location**: `/scripts/migrate-coming-soon-settings.ts`
- **Purpose**: Programmatic migration that reads markdown files and upserts to database
- **Features**:
  - Reads settings from markdown files in `/src/content/settings/`
  - Performs upserts to handle both new and existing settings
  - Migrates `coming_soon_enabled` to `coming_soon_mode` if it exists
  - Provides detailed logging and verification
  - Can be run with: `npm run migrate:coming-soon`

### 2. SQL Migration File
- **Location**: `/supabase/migrations/20250730_migrate_coming_soon_settings.sql`
- **Purpose**: Direct SQL migration for Supabase migrations system
- **Features**:
  - Uses INSERT ... ON CONFLICT for upsert behavior
  - Migrates all four coming-soon settings
  - Handles the rename from `coming_soon_enabled` to `coming_soon_mode`
  - Includes verification logging

### 3. Settings Being Migrated
From the markdown files in `/src/content/settings/`:
1. `coming_soon_mode` (boolean) - Was `coming_soon_enabled`
2. `coming_soon_launch_date` (string) - Format: YYYY-MM-DD
3. `coming_soon_message` (string) - Custom message for the page
4. `coming_soon_newsletter` (boolean) - Show newsletter signup

## Key Decisions

### 1. Individual Settings vs JSON
- Chose to use individual settings entries (key-value pairs)
- Matches the existing pattern in the `settings` table
- The middleware already expects this format (`coming_soon_enabled`)
- Simpler than JSON for individual boolean/string values

### 2. Migration Strategy
- Created both TypeScript and SQL versions for flexibility
- TypeScript version better for development/testing
- SQL version integrates with Supabase migration system
- Both use upsert pattern to be idempotent

### 3. Backward Compatibility
- Script handles the rename from `coming_soon_enabled` to `coming_soon_mode`
- Preserves existing values during migration
- Only updates if values differ (avoids unnecessary timestamp updates)

## Usage Instructions

### Option 1: TypeScript Migration (Recommended for Development)
```bash
npm run migrate:coming-soon
```

### Option 2: SQL Migration (For Production)
```bash
# Run through Supabase migrations
supabase db push
```

## Next Steps

1. Run the migration in development environment
2. Update components to use the new setting keys consistently
3. Remove the markdown files after successful migration
4. Update any remaining references to `coming_soon_enabled`

## Notes
- The settings table uses TEXT values, not JSON
- Migration is idempotent - safe to run multiple times
- Includes verification step to confirm successful migration
- Maintains the same data structure expected by existing code