# 🛑 Configuration Rules - READ BEFORE MAKING CHANGES

## The Golden Rule: ONE Configuration Only

**There is exactly ONE way to run this project:**
```bash
docker compose up -d
```

## Why These Rules Exist

We previously had 6 different Docker configurations:
- `docker-compose.yml` ✅ (The ONLY one to use)
- `docker-compose.simple.yml` ❌ (Archived - incompatible)
- `docker-compose.working.yml` ❌ (Archived - doesn't work with Supabase client)
- `docker-compose.test.yml` ❌ (Archived - no database)
- `docker-compose.fixed.yml` ❌ (Archived - duplicate)
- `docker-compose.override.yml` ❌ (Archived - causes confusion)

This created:
- Confusion about which to use
- Incompatible database connections
- Maintenance nightmares
- Wasted debugging time

## Rules for Future Development

### 1. NEVER Create New Docker Configurations
- No "simplified" versions
- No "quick" alternatives
- No "test" configurations
- No "local" variants

### 2. The App REQUIRES Full Supabase
- The app uses Supabase client library
- This requires the full Supabase API
- PostgREST alone is NOT enough
- Direct PostgreSQL will NOT work

### 3. If Something Doesn't Work
1. Fix the main `docker-compose.yml`
2. Document the issue in `/app/journal/`
3. Do NOT create an alternative configuration

### 4. The Current Setup IS Simple
Starting the project is already just two commands:
```bash
cp .env.example .env.local
docker compose up -d
```

You cannot make it simpler than this!

## Enforcement

These rules are enforced by:
1. Archived configurations are in `/docker/archived-configs/`
2. `CLAUDE.md` includes strict instructions
3. Package.json scripts only reference the main configuration
4. This file serves as a reminder

## If You're Reading This Because...

### "I want to create a lighter setup"
**Don't.** The app requires Supabase. Use the main configuration.

### "The main setup is too heavy"
**Fix it.** Optimize the existing configuration rather than creating alternatives.

### "I just need PostgreSQL"
**You don't.** The app uses Supabase-specific features. It won't work with just PostgreSQL.

### "I found an archived configuration"
**Leave it there.** It's archived because it doesn't work properly.

## The Path Forward

1. Use `docker-compose.yml`
2. If it breaks, fix it
3. If it's slow, optimize it
4. If it's complex, document it
5. But NEVER create alternatives

Remember: **Configuration proliferation is the enemy of maintainability!**