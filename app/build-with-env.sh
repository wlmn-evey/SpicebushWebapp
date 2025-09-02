#!/bin/bash

# Exit on any error
set -e

# Build script that ensures environment variables are set
echo "🔧 Building with environment variables..."
echo "Node version: $(node --version)"
echo "NPM version: $(npm --version)"

# Supabase Configuration
# Note: Supabase now uses sb_ prefixed keys instead of JWT tokens
export PUBLIC_SUPABASE_URL="https://xnzweuepchbfffsegkml.supabase.co"

# Production Supabase keys (new format)
export PUBLIC_SUPABASE_ANON_KEY="sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN"
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd"

export PUBLIC_SITE_URL="https://spicebush-testing.netlify.app"

# For backward compatibility
export PUBLIC_SUPABASE_PUBLIC_KEY="$PUBLIC_SUPABASE_ANON_KEY"

# Unione.io Email Configuration
export UNIONE_API_KEY="6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme"
export UNIONE_REGION="us"
export EMAIL_SERVICE="unione"
export EMAIL_FROM="noreply@spicebushmontessori.org"
export EMAIL_FROM_NAME="Spicebush Montessori School"

echo "✅ Environment variables set:"
echo "  PUBLIC_SUPABASE_URL: ${PUBLIC_SUPABASE_URL:0:30}..."
echo "  PUBLIC_SUPABASE_ANON_KEY: ${PUBLIC_SUPABASE_ANON_KEY:0:20}..."
echo "  PUBLIC_SITE_URL: $PUBLIC_SITE_URL"
echo ""

# Run the build
echo "📦 Installing dependencies..."
echo "Using npm flags: --legacy-peer-deps"

# Use npm ci for faster, more reliable installs on CI
if [ -f "package-lock.json" ]; then
    echo "Using npm ci for clean install..."
    npm ci --legacy-peer-deps || {
        echo "⚠️ npm ci failed, falling back to npm install..."
        npm install --legacy-peer-deps
    }
else
    echo "No package-lock.json found, using npm install..."
    npm install --legacy-peer-deps
fi

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build complete!"