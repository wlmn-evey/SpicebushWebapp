# PostgREST Authentication Fix - Quick Summary

## The Problem
- Frontend cannot read from database: "permission denied to set role 'anon'"
- PostgREST authentication is blocking all content queries
- Website shows no content despite data being in database

## Recommended Solution: Direct Database Connection

### Why This Approach?
1. **Immediate Fix**: Gets website working today
2. **Simpler**: No complex authentication layers
3. **Reliable**: Direct PostgreSQL is battle-tested
4. **Maintainable**: School staff can understand it

### Quick Implementation

1. **Create Read-Only User** (in database):
```bash
docker exec -it app-supabase-db-1 psql -U postgres -c "
CREATE USER frontend_reader WITH PASSWORD 'spicebush-readonly-2025';
GRANT CONNECT ON DATABASE postgres TO frontend_reader;
GRANT USAGE ON SCHEMA public TO frontend_reader;
GRANT SELECT ON public.content TO frontend_reader;
GRANT SELECT ON public.settings TO frontend_reader;"
```

2. **Install PostgreSQL Client**:
```bash
npm install pg
```

3. **Create Direct Connection Module** (`src/lib/content-db-direct.ts`):
- Copy from implementation plan
- Uses connection pool
- Same API as current content-db.ts

4. **Update Environment** (`.env.local`):
```env
DB_READONLY_PASSWORD=spicebush-readonly-2025
USE_DIRECT_DB=true
```

5. **Switch Import** (minimal code changes):
- Create `content-db-switch.ts` that chooses implementation
- Update imports or use path alias

## Alternative Solutions (If Needed)

### Option A: Fix PostgREST (Complex)
- Rebuild Docker images with proper authenticator role
- Debug JWT token configuration
- Fix role permissions in database
- More complex, same result

### Option B: Simple API Layer
- Create Express API for database queries
- Add caching layer
- More control but more code

### Option C: Hybrid Approach
- Keep static content in markdown
- Use database for dynamic content only
- Best for version control

## Testing Checklist
- [ ] Homepage shows recent blog posts
- [ ] Blog pages load correctly
- [ ] Staff/teacher pages display
- [ ] Hours show in header/footer
- [ ] Admin panel can still update content
- [ ] No authentication errors in console

## Long-Term Considerations

1. **Monitor Performance**: Watch connection pool usage
2. **Add Caching**: Implement query result caching
3. **Static Generation**: Consider pre-building pages
4. **Documentation**: Keep it simple for future maintainers

## If Something Goes Wrong

1. Check database user was created correctly
2. Verify password in .env.local
3. Ensure port 54322 is accessible
4. Fall back to markdown files if needed

## Key Takeaway

The full Supabase stack with PostgREST is powerful but overly complex for a school website. A direct database connection provides the same functionality with fewer moving parts and is much easier to debug and maintain.