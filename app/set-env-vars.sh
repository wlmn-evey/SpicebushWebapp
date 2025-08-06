#\!/bin/bash

# Set environment variables for Netlify testing site
echo "Setting up environment variables for Netlify..."

# Export values from .env.hosted
export SUPABASE_URL="https://xnzweuepchbfffsegkml.supabase.co"
export SUPABASE_ANON_KEY="sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN"
export SUPABASE_SERVICE_KEY="sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd"

# Use the deploy method with environment variables
echo "Deploying with environment variables..."
npx netlify deploy --build \
  --env PUBLIC_SUPABASE_URL="$SUPABASE_URL" \
  --env PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY" \
  --env SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_KEY" \
  --env PUBLIC_SITE_URL="https://spicebush-testing.netlify.app" \
  --prod

echo "Deployment triggered with environment variables\!"
