#!/bin/bash

echo "🚀 Deploying to Netlify Testing Site"
echo "======================================"

# Build the site
echo "📦 Building site..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"

# Push to testing branch
echo "📤 Pushing to testing branch..."
git push origin testing

if [ $? -ne 0 ]; then
    echo "❌ Push failed"
    exit 1
fi

echo "✅ Pushed to testing branch"
echo ""
echo "🎉 Deployment initiated!"
echo "📍 Check deployment status at:"
echo "   https://app.netlify.com/projects/spicebush-testing/deploys"
echo ""
echo "🌐 Testing site will be available at:"
echo "   https://spicebush-testing.netlify.app"
echo ""
echo "⏱️  Deployment usually takes 2-3 minutes"