#!/bin/bash

# Auth Migration Rollback Script
# Purpose: Quickly rollback to Supabase authentication if issues occur

echo "🔄 Auth Migration Rollback Script"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from app directory"
    exit 1
fi

# Function to update environment variable
rollback_env() {
    echo "📝 Setting USE_CLERK_AUTH=supabase in environment files..."
    
    # Update .env.local if it exists
    if [ -f ".env.local" ]; then
        if grep -q "USE_CLERK_AUTH" .env.local; then
            sed -i.bak 's/USE_CLERK_AUTH=.*/USE_CLERK_AUTH=supabase/' .env.local
            echo "✅ Updated .env.local"
        else
            echo "USE_CLERK_AUTH=supabase" >> .env.local
            echo "✅ Added to .env.local"
        fi
    fi
    
    # Update .env if it exists
    if [ -f ".env" ]; then
        if grep -q "USE_CLERK_AUTH" .env; then
            sed -i.bak 's/USE_CLERK_AUTH=.*/USE_CLERK_AUTH=supabase/' .env
            echo "✅ Updated .env"
        else
            echo "USE_CLERK_AUTH=supabase" >> .env
            echo "✅ Added to .env"
        fi
    fi
}

# Function to restore from backup
restore_backup() {
    echo "📦 Checking for auth backup..."
    
    if [ -d "backup/auth-supabase" ]; then
        echo "✅ Found backup directory"
        echo "Would you like to restore from backup? (y/n)"
        read -r response
        
        if [[ "$response" == "y" ]]; then
            echo "🔄 Restoring auth files from backup..."
            # List of files to restore
            cp -v backup/auth-supabase/supabase.ts src/lib/supabase.ts 2>/dev/null
            cp -v backup/auth-supabase/callback.astro src/pages/auth/callback.astro 2>/dev/null
            cp -v backup/auth-supabase/AuthForm.astro src/components/AuthForm.astro 2>/dev/null
            echo "✅ Files restored from backup"
        fi
    else
        echo "⚠️  No backup found at backup/auth-supabase"
    fi
}

# Function to update Netlify
update_netlify() {
    echo ""
    echo "🌐 Netlify Update Required"
    echo "=========================="
    echo "Please update the following in Netlify dashboard:"
    echo "1. Go to: https://app.netlify.com/sites/spicebush-testing/settings/env"
    echo "2. Set USE_CLERK_AUTH = supabase"
    echo "3. Trigger a new deployment"
    echo ""
    echo "Or use CLI:"
    echo "npx netlify env:set USE_CLERK_AUTH supabase"
    echo "npx netlify deploy --trigger"
}

# Main execution
echo "🚨 This will rollback authentication to Supabase"
echo "Continue? (y/n)"
read -r confirm

if [[ "$confirm" != "y" ]]; then
    echo "❌ Rollback cancelled"
    exit 0
fi

# Execute rollback steps
rollback_env
restore_backup
update_netlify

echo ""
echo "✅ Rollback steps completed!"
echo ""
echo "Next steps:"
echo "1. Restart development server: npm run dev"
echo "2. Test authentication works with Supabase"
echo "3. Update Netlify environment variable"
echo "4. Deploy to production when ready"
echo ""
echo "To re-enable Clerk, set USE_CLERK_AUTH=clerk"