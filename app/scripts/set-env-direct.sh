#!/bin/bash

# Netlify Environment Variables Setup Script
# Uses Netlify CLI to set all required environment variables

echo "Setting Netlify environment variables..."
echo "========================================="

# Set all environment variables
npx netlify env:set PUBLIC_SUPABASE_URL "https://xnzweuepchbfffsegkml.supabase.co" --context production
npx netlify env:set PUBLIC_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzMzE3NDQsImV4cCI6MjA0NTkwNzc0NH0.qMScf8b6LJCcG0_M2AWQZOmAjJwcd4DdMhX69a0sVK0" --context production
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMDMzMTc0NCwiZXhwIjoyMDQ1OTA3NzQ0fQ.uPFaOqYbMIxqBDQsWLFCmFLI9xmuxlD7QZm1a9YN5vg" --context production --secret
npx netlify env:set PUBLIC_SITE_URL "https://spicebush-testing.netlify.app" --context production
npx netlify env:set UNIONE_API_KEY "6rtwau1npm9161y9g4fmezdc7zpbx8phthop6rsa" --context production --secret
npx netlify env:set UNIONE_REGION "us" --context production
npx netlify env:set EMAIL_FROM "noreply@spicebushmontessori.org" --context production
npx netlify env:set EMAIL_FROM_NAME "Spicebush Montessori School" --context production
npx netlify env:set EMAIL_SERVICE "unione" --context production

echo ""
echo "✅ Environment variables set!"
echo "Now deploying to apply changes..."
echo ""

# Trigger a new deployment
npx netlify deploy --build --prod

echo ""
echo "🚀 Deployment triggered!"
echo "Check status at: https://app.netlify.com/sites/spicebush-testing/deploys"