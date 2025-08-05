# Environment Variables Configuration

## Required Environment Variables

### Public Variables (Client-side safe)
- `PUBLIC_SITE_URL` - Site domain (e.g., https://spicebushmontessori.org)
- `PUBLIC_SUPABASE_URL` - Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY` or `PUBLIC_SUPABASE_PUBLIC_KEY` - Supabase public key (INCONSISTENCY DETECTED)
- `PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

### Private Variables (Server-side only)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `DATABASE_URL` - Direct database connection string
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret

### Optional Services
- `SENDGRID_API_KEY` - SendGrid email service
- `UNIONE_API_KEY` - Unione email service
- `POSTMARK_SERVER_TOKEN` - Postmark email service
- `RESEND_API_KEY` - Resend email service
- `EMAIL_SERVICE` - Preferred email provider
- `EMAIL_FROM` - Default sender email
- `EMAIL_FROM_NAME` - Default sender name
- `ADMIN_EMAILS` - Admin email addresses (comma-separated)
- `ADMIN_DOMAINS` - Admin email domains (comma-separated)

### Database Connection (Optional)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`

## Environment Variable Issues Identified

### Naming Inconsistencies
1. **Supabase Key Naming**: Code uses both `PUBLIC_SUPABASE_ANON_KEY` and `PUBLIC_SUPABASE_PUBLIC_KEY`
   - `src/lib/supabase.ts` attempts both: `PUBLIC_SUPABASE_PUBLIC_KEY || PUBLIC_SUPABASE_ANON_KEY`
   - `src/middleware.ts` attempts both: `PUBLIC_SUPABASE_ANON_KEY || PUBLIC_SUPABASE_PUBLIC_KEY`
   - `.env.example` shows: `PUBLIC_SUPABASE_PUBLIC_KEY`
   - `netlify.toml` lists: `PUBLIC_SUPABASE_ANON_KEY`

### Missing Variables in Testing
- Testing site only has `PUBLIC_SITE_URL` configured
- All other required variables are missing, causing build failures

## Current Environment Configuration
- **Production**: All variables configured in Netlify
- **Testing**: Only `PUBLIC_SITE_URL` configured
- **Local**: Uses `.env.local` (copied from `.env.example`)