#!/bin/bash

echo "🔧 Setting up Netlify Environment Variables for Magic Link"
echo ""

# Check if we have the required values in .env.local
if [ -f .env.local ]; then
    echo "✅ Found .env.local file"
    
    # Extract values
    SUPABASE_URL=$(grep "PUBLIC_SUPABASE_URL=" .env.local | cut -d '=' -f2)
    SUPABASE_ANON_KEY=$(grep "PUBLIC_SUPABASE_ANON_KEY=" .env.local | cut -d '=' -f2)
    SERVICE_ROLE_KEY=$(grep "SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d '=' -f2)
    DATABASE_URL=$(grep "DATABASE_URL=" .env.local | cut -d '=' -f2)
    DIRECT_URL=$(grep "DIRECT_URL=" .env.local | cut -d '=' -f2)
    
    echo ""
    echo "📋 Found the following values:"
    echo "  PUBLIC_SUPABASE_URL: ${SUPABASE_URL:0:30}..."
    echo "  PUBLIC_SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
    echo "  SUPABASE_SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY:0:20}..."
    echo ""
    
    echo "🚀 Setting environment variables in Netlify..."
    echo ""
    
    # Set the variables
    if [ -n "$SUPABASE_URL" ]; then
        echo "Setting PUBLIC_SUPABASE_URL..."
        npx netlify env:set PUBLIC_SUPABASE_URL "$SUPABASE_URL" --context all
    fi
    
    if [ -n "$SUPABASE_ANON_KEY" ]; then
        echo "Setting PUBLIC_SUPABASE_ANON_KEY..."
        npx netlify env:set PUBLIC_SUPABASE_ANON_KEY "$SUPABASE_ANON_KEY" --context all
    fi
    
    if [ -n "$SERVICE_ROLE_KEY" ]; then
        echo "Setting SUPABASE_SERVICE_ROLE_KEY..."
        npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "$SERVICE_ROLE_KEY" --context all
    fi
    
    if [ -n "$DATABASE_URL" ]; then
        echo "Setting DATABASE_URL..."
        npx netlify env:set DATABASE_URL "$DATABASE_URL" --context all
    fi
    
    if [ -n "$DIRECT_URL" ]; then
        echo "Setting DIRECT_URL..."
        npx netlify env:set DIRECT_URL "$DIRECT_URL" --context all
    fi
    
    # Set the site URL for testing
    echo "Setting PUBLIC_SITE_URL for testing environment..."
    npx netlify env:set PUBLIC_SITE_URL "https://spicebush-testing.netlify.app" --context all
    
    echo ""
    echo "✅ Environment variables set!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Trigger a new deployment: git commit --allow-empty -m 'Trigger deployment' && git push"
    echo "2. Or use Netlify dashboard to trigger a deploy"
    echo "3. Test magic link at: https://spicebush-testing.netlify.app/auth/magic-login"
    
else
    echo "❌ .env.local file not found!"
    echo ""
    echo "Please create .env.local with your Supabase credentials:"
    echo ""
    echo "PUBLIC_SUPABASE_URL=https://your-project.supabase.co"
    echo "PUBLIC_SUPABASE_ANON_KEY=your-anon-key"
    echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key"
    echo "DATABASE_URL=your-database-url"
    echo "DIRECT_URL=your-direct-url"
fi