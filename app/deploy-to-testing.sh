#!/bin/bash

set -e  # Exit on any error

echo "🚀 Deploying to Netlify Testing Site"
echo "======================================"

# Check if we're on the testing branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "testing" ]; then
    echo "⚠️  Warning: You are on branch '$CURRENT_BRANCH', not 'testing'"
    echo "   Switch to testing branch first: git checkout testing"
    read -p "   Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ Deployment cancelled"
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes"
    read -p "   Commit changes first? (Y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "   Please commit your changes and run this script again"
        echo "   git add . && git commit -m 'your commit message'"
        exit 1
    fi
fi

# Check if .env.testing.template exists
if [ ! -f ".env.testing.template" ]; then
    echo "❌ .env.testing.template not found!"
    echo "   This file contains the environment variables needed for testing"
    exit 1
fi

# Pre-build validation
echo "🔍 Running pre-deployment checks..."

# Check for required files
REQUIRED_FILES=("package.json" "astro.config.mjs" "netlify.toml")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Required file missing: $file"
        exit 1
    fi
done

echo "✅ Pre-deployment checks passed"

# Build the site
echo "📦 Building site..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    echo "   Check the build output above for errors"
    echo "   Common issues:"
    echo "   - Missing environment variables"
    echo "   - TypeScript errors"
    echo "   - Missing dependencies"
    exit 1
fi

echo "✅ Build successful"

# Check if dist directory was created
if [ ! -d "dist" ]; then
    echo "❌ Build output directory 'dist' not found"
    exit 1
fi

# Push to testing branch
echo "📤 Pushing to testing branch..."
git push origin testing

if [ $? -ne 0 ]; then
    echo "❌ Push failed"
    echo "   Check your git configuration and network connectivity"
    exit 1
fi

echo "✅ Pushed to testing branch"
echo ""
echo "🎉 Deployment initiated!"
echo ""
echo "📋 Next Steps:"
echo "   1. Check deployment status at:"
echo "      https://app.netlify.com/projects/spicebush-testing/deploys"
echo ""
echo "   2. If build fails, check environment variables:"
echo "      - Site Settings > Environment Variables"
echo "      - Use values from .env.testing.template"
echo ""
echo "   3. Testing site will be available at:"
echo "      https://spicebush-testing.netlify.app"
echo ""
echo "⏱️  Deployment usually takes 2-3 minutes"
echo ""
echo "🐛 If deployment fails:"
echo "   - Check Netlify build logs for specific errors"
echo "   - Verify all environment variables are set"
echo "   - Ensure Stripe test keys are used (not production)"