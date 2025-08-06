#!/bin/bash

# Netlify Build Script with Enhanced Error Handling
# This script provides better error reporting for failed deployments

set -e  # Exit on any error

echo "🚀 Starting Netlify build process..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"
echo "Working directory: $(pwd)"

# Check critical environment variables
echo ""
echo "🔍 Checking environment variables..."
MISSING_VARS=()

# Check public variables
if [ -z "$PUBLIC_SUPABASE_URL" ]; then
    MISSING_VARS+=("PUBLIC_SUPABASE_URL")
fi

if [ -z "$PUBLIC_SUPABASE_ANON_KEY" ]; then
    MISSING_VARS+=("PUBLIC_SUPABASE_ANON_KEY")
fi

if [ -z "$PUBLIC_SITE_URL" ]; then
    MISSING_VARS+=("PUBLIC_SITE_URL")
fi

# Check private variables
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    MISSING_VARS+=("SUPABASE_SERVICE_ROLE_KEY")
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo "❌ MISSING CRITICAL ENVIRONMENT VARIABLES:"
    printf '%s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please add these variables in Netlify dashboard:"
    echo "Site Settings > Environment Variables"
    exit 1
fi

echo "✅ All critical environment variables are present"
echo ""

# Install dependencies with retry logic
echo "📦 Installing dependencies..."
RETRY_COUNT=0
MAX_RETRIES=3

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if npm install --legacy-peer-deps; then
        echo "✅ Dependencies installed successfully"
        break
    else
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo "❌ Install failed (attempt $RETRY_COUNT/$MAX_RETRIES)"
        if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
            echo "❌ Failed to install dependencies after $MAX_RETRIES attempts"
            exit 1
        fi
        echo "Retrying in 5 seconds..."
        sleep 5
    fi
done

# Build the application
echo ""
echo "🏗️  Building application..."
if npm run build; then
    echo "✅ Build completed successfully"
    echo "📊 Build output size: $(du -sh dist | cut -f1)"
else
    echo "❌ Build failed"
    echo ""
    echo "🔍 Debugging information:"
    echo "- Node.js version: $(node --version)"
    echo "- NPM version: $(npm --version)"
    echo "- Package.json scripts:"
    grep -A 10 '"scripts"' package.json
    exit 1
fi

echo ""
echo "🎉 Build process completed successfully!"
