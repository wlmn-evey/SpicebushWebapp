#!/bin/bash
# configure-netlify-testing-simple.sh - Simple environment setup for testing site

set -e

SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"

# Check prerequisites
command -v npx >/dev/null || { echo "Error: npm/npx not found"; exit 1; }

echo "Configuring Netlify testing site environment..."

# Set non-sensitive variables that are already configured
echo "✓ Basic configuration already set"

# Get production values from .env.production.example as reference
echo ""
echo "You need to set the following sensitive variables."
echo "Get these values from your production Netlify dashboard:"
echo "https://app.netlify.com/sites/spicebush-montessori/settings/env"
echo ""

# Required sensitive variables
echo "Required variables:"
echo "1. PUBLIC_SUPABASE_ANON_KEY (starts with 'eyJ' or 'sb_')"
echo "2. SUPABASE_SERVICE_ROLE_KEY (starts with 'eyJ' or 'sb_')"  
echo "3. DATABASE_URL (postgresql://...)"
echo "4. PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_...)"
echo "5. STRIPE_SECRET_KEY (rk_live_... or sk_live_...)"
echo ""

read -p "Do you have these values ready? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please get the values from production first, then run this script again."
    exit 1
fi

# Prompt and set variables
echo ""
read -s -p "PUBLIC_SUPABASE_ANON_KEY: " ANON_KEY && echo
[ -n "$ANON_KEY" ] && npx netlify env:set PUBLIC_SUPABASE_ANON_KEY "$ANON_KEY" || echo "Skipped"

# Set both versions for compatibility
[ -n "$ANON_KEY" ] && npx netlify env:set PUBLIC_SUPABASE_PUBLIC_KEY "$ANON_KEY" || echo "Skipped"

read -s -p "SUPABASE_SERVICE_ROLE_KEY: " SERVICE_KEY && echo
[ -n "$SERVICE_KEY" ] && npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "$SERVICE_KEY" || echo "Skipped"

read -s -p "DATABASE_URL: " DB_URL && echo
[ -n "$DB_URL" ] && npx netlify env:set DATABASE_URL "$DB_URL" || echo "Skipped"
[ -n "$DB_URL" ] && npx netlify env:set DIRECT_URL "$DB_URL" || echo "Skipped"

read -s -p "PUBLIC_STRIPE_PUBLISHABLE_KEY: " STRIPE_PK && echo
[ -n "$STRIPE_PK" ] && npx netlify env:set PUBLIC_STRIPE_PUBLISHABLE_KEY "$STRIPE_PK" || echo "Skipped"

read -s -p "STRIPE_SECRET_KEY: " STRIPE_SK && echo
[ -n "$STRIPE_SK" ] && npx netlify env:set STRIPE_SECRET_KEY "$STRIPE_SK" || echo "Skipped"

echo ""
echo "✅ Configuration complete!"
echo ""
echo "To deploy the testing site:"
echo "  git push origin testing"
echo ""
echo "Monitor deployment at:"
echo "  https://app.netlify.com/sites/spicebush-testing/deploys"