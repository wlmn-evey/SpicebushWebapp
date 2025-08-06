#!/bin/bash

# Netlify Deployment Diagnostic Script
# This script identifies configuration issues causing automatic deployment failures

echo "🔍 NETLIFY DEPLOYMENT DIAGNOSTIC REPORT"
echo "========================================"
echo "Date: $(date)"
echo ""

# Check current directory and git status
echo "📂 PROJECT STATUS:"
echo "Current directory: $(pwd)"
echo "Git branch: $(git branch --show-current)"
echo "Git status:"
git status --porcelain
echo ""

# Check Netlify configuration files
echo "📋 CONFIGURATION FILES:"
echo ""

if [ -f "netlify.toml" ]; then
    echo "✅ ROOT netlify.toml exists"
    echo "   Build base: $(grep -A5 '\[build\]' netlify.toml | grep 'base' || echo 'Not specified')"
    echo "   Build command: $(grep -A5 '\[build\]' netlify.toml | grep 'command' || echo 'Not specified')"
    echo "   Publish directory: $(grep -A5 '\[build\]' netlify.toml | grep 'publish' || echo 'Not specified')"
else
    echo "❌ ROOT netlify.toml missing"
fi

if [ -f "app/netlify.toml" ]; then
    echo "⚠️  APP netlify.toml exists (potential conflict)"
else
    echo "✅ No conflicting app/netlify.toml"
fi

echo ""

# Check package.json and dependencies
echo "📦 PACKAGE CONFIGURATION:"
if [ -f "app/package.json" ]; then
    echo "✅ app/package.json exists"
    echo "   Build script: $(grep -A1 '"build"' app/package.json | tail -n1 | sed 's/.*": "//' | sed 's/".*//')"
    echo "   Node version from .nvmrc: $(cat app/.nvmrc 2>/dev/null || echo 'Not specified')"
else
    echo "❌ app/package.json missing"
fi
echo ""

# Check Astro configuration
echo "🚀 ASTRO CONFIGURATION:"
if [ -f "app/astro.config.mjs" ]; then
    echo "✅ astro.config.mjs exists"
    echo "   Adapter: $(grep 'adapter:' app/astro.config.mjs || echo 'Not specified')"
    echo "   Output mode: $(grep 'output:' app/astro.config.mjs || echo 'Not specified')"
else
    echo "❌ astro.config.mjs missing"
fi
echo ""

# Test local build
echo "🔨 LOCAL BUILD TEST:"
cd app 2>/dev/null || { echo "❌ Cannot access app directory"; exit 1; }

echo "Running npm install..."
if npm install --silent 2>/dev/null; then
    echo "✅ npm install successful"
else
    echo "❌ npm install failed"
    exit 1
fi

echo "Running build..."
if npm run build > /dev/null 2>&1; then
    echo "✅ Local build successful"
    echo "   Dist directory size: $(du -sh dist 2>/dev/null | cut -f1 || echo 'Unknown')"
else
    echo "❌ Local build failed"
    echo "Build output:"
    npm run build
    exit 1
fi

# Check Netlify CLI functionality
echo ""
echo "🌐 NETLIFY CLI STATUS:"
cd .. # Return to root
if command -v netlify >/dev/null 2>&1; then
    echo "✅ Netlify CLI installed"
    netlify status 2>/dev/null | grep -E "(Current project|Project Id)" || echo "Not linked to project"
else
    echo "⚠️  Netlify CLI not globally installed"
    echo "   Using npx netlify instead"
    npx netlify status 2>/dev/null | grep -E "(Current project|Project Id)" || echo "Not linked to project"
fi

echo ""
echo "🚨 POTENTIAL ISSUES IDENTIFIED:"
echo ""

# Check for common issues
issues_found=0

# Issue 1: Multiple netlify.toml files
if [ -f "netlify.toml" ] && [ -f "app/netlify.toml" ]; then
    echo "❌ CONFLICT: Multiple netlify.toml files detected"
    echo "   Solution: Remove app/netlify.toml (conflicting configuration)"
    ((issues_found++))
fi

# Issue 2: Node version mismatch
root_node=$(grep 'NODE_VERSION' netlify.toml 2>/dev/null | head -n1 | sed 's/.*= "//' | sed 's/".*//')
app_node=$(cat app/.nvmrc 2>/dev/null)
if [ -n "$root_node" ] && [ -n "$app_node" ] && [ "$root_node" != "$app_node" ]; then
    echo "❌ NODE VERSION MISMATCH:"
    echo "   netlify.toml specifies: $root_node"
    echo "   .nvmrc specifies: $app_node"
    echo "   Solution: Align versions or remove one specification"
    ((issues_found++))
fi

# Issue 3: Missing environment variables (check against memory)
if ! grep -q "PUBLIC_SUPABASE_ANON_KEY" netlify.toml 2>/dev/null; then
    echo "⚠️  Missing critical environment variables in Netlify dashboard"
    echo "   Required: PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, etc."
    echo "   Solution: Add missing variables in Netlify dashboard"
    ((issues_found++))
fi

if [ $issues_found -eq 0 ]; then
    echo "✅ No obvious configuration issues detected"
    echo ""
    echo "🔍 NEXT STEPS:"
    echo "1. Check Netlify build logs for specific error details"
    echo "2. Verify all required environment variables are set"
    echo "3. Test automatic deployment with a simple commit"
else
    echo ""
    echo "🔧 RECOMMENDED ACTIONS:"
    echo "1. Fix the issues listed above"
    echo "2. Test local build with: cd app && npm run build"
    echo "3. Trigger new deployment after fixes"
fi

echo ""
echo "📋 DIAGNOSTIC COMPLETE"
echo "=============================="