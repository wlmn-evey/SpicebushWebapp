# Direct PostgreSQL Coming-Soon Migration

## Date: 2025-07-30

## Context
The Supabase auth was having issues, so we created a direct PostgreSQL version of the coming-soon migration script, following the successful pattern used for the hours migration.

## Implementation Details

### Script: `/scripts/migrate-coming-soon-direct-pg.js`

The script:
1. **Bypasses Supabase Auth**: Connects directly to PostgreSQL on localhost:54322
2. **Handles Key Renaming**: Automatically renames `coming_soon_enabled` to `coming_soon_mode` if it exists
3. **Processes All Settings Files**:
   - coming-soon-mode.md
   - coming-soon-launch-date.md
   - coming-soon-message.md
   - coming-soon-newsletter.md
4. **Uses Upsert Pattern**: Ensures idempotent migrations with ON CONFLICT DO UPDATE
5. **Provides Detailed Logging**: Shows progress, results, and verification

### Key Features
- Direct connection using pg module
- No authentication dependencies
- Clear progress indicators
- Error handling with appropriate exit codes
- Verification step to confirm migration success

### Connection Details
```javascript
const client = new Client({
  host: 'localhost',
  port: 54322,
  database: 'postgres',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'your-super-secret-and-long-postgres-password'
});
```

### Usage
```bash
# Set password in environment if different from default
export POSTGRES_PASSWORD="your-actual-password"

# Run the migration
node scripts/migrate-coming-soon-direct-pg.js
```

## Related Files
- Original TypeScript version: `/scripts/migrate-coming-soon-settings.ts`
- Hours migration (template): `/scripts/migrate-hours-to-cms.js`
- Settings markdown files: `/src/content/settings/coming-soon-*.md`

## Notes
- This approach proved necessary due to Supabase auth issues
- The pattern follows the successful hours migration exactly
- The script is idempotent and can be run multiple times safely