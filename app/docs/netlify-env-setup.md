# Netlify Environment Variables Setup

## Required Variables

### Supabase (Database)
- **PUBLIC_SUPABASE_URL**: `https://[project-ref].supabase.co`
  - Find in: Supabase Dashboard → Settings → API → Project URL
  
- **PUBLIC_SUPABASE_ANON_KEY**: `eyJ...` (long string)
  - Find in: Supabase Dashboard → Settings → API → anon public

- **SUPABASE_SERVICE_ROLE_KEY**: `eyJ...` (long string)  
  - Find in: Supabase Dashboard → Settings → API → service_role

### Site Configuration
- **PUBLIC_SITE_URL**: `https://spicebush-testing.netlify.app`

### Email Service (Optional for now)
- **UNIONE_API_KEY**: Get from client
- **UNIONE_REGION**: `us`
- **EMAIL_FROM**: `noreply@spicebushmontessori.org`
- **EMAIL_FROM_NAME**: `Spicebush Montessori`

## How to Add in Netlify

1. Go to: https://app.netlify.com
2. Select: spicebush-testing site
3. Navigate: Site configuration → Environment variables
4. Click: "Add a variable"
5. Add each variable with exact key names
6. Deploy: Trigger new build after adding all

## Verification

After adding variables, you can verify they're working by:
1. Triggering a new deployment
2. Checking the health endpoint: https://spicebush-testing.netlify.app/api/health
3. The response should show `"database": "healthy"` if properly configured