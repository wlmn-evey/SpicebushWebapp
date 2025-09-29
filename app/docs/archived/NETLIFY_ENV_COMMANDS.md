# Netlify Environment Variables - Manual Setup

## Instructions
Since the CLI is having issues, you can set these manually in the Netlify dashboard:

1. Go to: https://app.netlify.com/sites/spicebush-testing/configuration/env
2. Click "Add a variable" for each one below
3. After adding all, trigger a new deployment

## Variables to Add

### Database Configuration (Required)
```
PUBLIC_SUPABASE_URL = https://xnzweuepchbfffsegkml.supabase.co
PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMzE3NDQsImV4cCI6MjA0NTkwNzc0NH0.qMScf8b6LJCcG0_M2AWQZOmAjJwcd4DdMhX69a0sVK0
SUPABASE_SERVICE_ROLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDMzMTc0NCwiZXhwIjoyMDQ1OTA3NzQ0fQ.uPFaOqYbMIxqBDQsWLFCmFLI9xmuxlD7QZm1a9YN5vg
```

### Site Configuration
```
PUBLIC_SITE_URL = https://spicebush-testing.netlify.app
```

### Email Service (Needs Valid API Key)
```
# ⚠️ NOTE: Both API keys tested are invalid
# Tested keys that don't work:
# - 6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme (invalid)
# - 6rtwau1npm9161y9g4fmezdc7zpbx8phthop6rsa (invalid)
UNIONE_API_KEY = 6rtwau1npm9161y9g4fmezdc7zpbx8phthop6rsa  # INVALID - needs valid key from Unione.io account
UNIONE_REGION = us
EMAIL_FROM = noreply@spicebushmontessori.org
EMAIL_FROM_NAME = Spicebush Montessori School
EMAIL_SERVICE = unione
```

## Verification
After setting these and redeploying:
1. Visit: https://spicebush-testing.netlify.app/api/health
2. Should see: `"database": "healthy"`

## Alternative: Use Netlify CLI locally
If you want to try the CLI approach:
```bash
# Install CLI globally with proper permissions
curl -o- https://raw.githubusercontent.com/netlify/cli/main/install.sh | bash

# Then run these commands:
netlify login
netlify link --name spicebush-testing
netlify env:set PUBLIC_SUPABASE_URL "https://xnzweuepchbfffsegkml.supabase.co"
netlify env:set PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMzE3NDQsImV4cCI6MjA0NTkwNzc0NH0.qMScf8b6LJCcG0_M2AWQZOmAjJwcd4DdMhX69a0sVK0"
netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDMzMTc0NCwiZXhwIjoyMDQ1OTA3NzQ0fQ.uPFaOqYbMIxqBDQsWLFCmFLI9xmuxlD7QZm1a9YN5vg" --secret
netlify env:set PUBLIC_SITE_URL "https://spicebush-testing.netlify.app"
netlify env:set UNIONE_API_KEY "6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme" --secret
netlify env:set UNIONE_REGION "us"
netlify env:set EMAIL_FROM "noreply@spicebushmontessori.org"
netlify env:set EMAIL_FROM_NAME "Spicebush Montessori School"
netlify env:set EMAIL_SERVICE "unione"

# Then deploy
netlify deploy --build --prod
```