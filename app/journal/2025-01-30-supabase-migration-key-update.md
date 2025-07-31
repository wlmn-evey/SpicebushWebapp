# Supabase Migration - Key Naming Update
Date: 2025-01-30

## Important Update: Supabase Key Naming Convention

Supabase has updated their terminology for API keys:

### Old Naming:
- `SUPABASE_ANON_KEY` - Anonymous/public key for client-side use
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for server-side use

### New Naming:
- `SUPABASE_PUBLIC_KEY` - Public key for client-side use (formerly anon key)
- `SUPABASE_SECRET_KEY` - Secret key for server-side use (formerly service role key)

## Impact on Migration:

1. **Environment Variables** - Need to update naming:
   - `PUBLIC_SUPABASE_ANON_KEY` → `PUBLIC_SUPABASE_PUBLIC_KEY`
   - Service role key → Secret key

2. **Scripts** - Update verification and migration scripts to use new terminology

3. **Documentation** - Update all references to use current naming

## Security Notes:
- **Public Key**: Safe to expose in client-side code, used for Row Level Security (RLS)
- **Secret Key**: Must never be exposed client-side, bypasses RLS, server-only

This change is cosmetic but important for clarity and following current Supabase documentation.