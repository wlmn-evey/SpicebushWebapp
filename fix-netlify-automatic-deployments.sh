#!/bin/bash

# Definitive Fix for Netlify Automatic Deployment Failures
# This script implements the complete solution to make automatic deployments work

set -e  # Exit on any error

echo "🔧 FIXING NETLIFY AUTOMATIC DEPLOYMENTS"
echo "======================================="
echo "Date: $(date)"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"
SITE_NAME="spicebush-testing"

echo -e "${BLUE}📋 PHASE 1: Environment Variable Configuration${NC}"
echo "=============================================="

# Read the memory file to get the required environment variables
cat << 'EOF'

CRITICAL MISSING ENVIRONMENT VARIABLES:
Based on the deployment analysis, these variables are required but missing:

1. PUBLIC_SUPABASE_ANON_KEY - Database access key
2. SUPABASE_SERVICE_ROLE_KEY - Admin database access
3. DATABASE_URL - PostgreSQL connection string (optional)
4. DIRECT_URL - Direct database connection (optional)
5. PUBLIC_STRIPE_PUBLISHABLE_KEY - Payment processing
6. STRIPE_SECRET_KEY - Payment processing
7. UNIONE_API_KEY - Email service (optional)

EOF

echo ""
echo -e "${YELLOW}⚠️  MANUAL ACTION REQUIRED:${NC}"
echo "Please add these environment variables in Netlify dashboard:"
echo "1. Go to: https://app.netlify.com/projects/spicebush-testing"
echo "2. Navigate to: Site Settings > Environment Variables"
echo "3. Add the missing variables with their correct values"
echo ""
echo "Alternatively, use the Netlify CLI to set them:"
echo ""

# Generate CLI commands to set environment variables
cat << 'EOF'
# Example commands (replace with actual values):
npx netlify env:set PUBLIC_SUPABASE_URL "https://bgppvtnciiznkwfqjpah.supabase.co"
npx netlify env:set PUBLIC_SUPABASE_ANON_KEY "your-anon-key-here"
npx netlify env:set SUPABASE_SERVICE_ROLE_KEY "your-service-role-key-here"
npx netlify env:set PUBLIC_STRIPE_PUBLISHABLE_KEY "pk_live_or_test_key_here"
npx netlify env:set STRIPE_SECRET_KEY "sk_live_or_test_key_here"
EOF

echo ""
echo -e "${BLUE}📋 PHASE 2: Build Configuration Optimization${NC}"
echo "============================================="

# Fix the netlify.toml publish directory issue
echo "Updating netlify.toml with explicit publish directory..."

# Create optimized netlify.toml
cat > netlify.toml << 'EOF'
# Netlify Configuration for Spicebush Testing Site
# This configuration ensures automatic deployments work correctly

[build]
  # Base directory for the build (where the actual app files are located)
  base = "app"
  
  # Build command with explicit error handling
  command = "npm install --legacy-peer-deps && npm run build"
  
  # Directory to deploy (Astro outputs to dist/)
  publish = "dist"
  
  # Node version and other environment settings
  [build.environment]
    NODE_VERSION = "20"
    NODE_OPTIONS = "--max_old_space_size=4096"
    NPM_FLAGS = "--legacy-peer-deps"

# Testing branch context - ensures proper environment setup
[context.testing]
  [context.testing.environment]
    NODE_ENV = "production"
    ENVIRONMENT = "testing"

# Branch deploy context (all other branches)
[context.branch-deploy]
  [context.branch-deploy.environment]
    NODE_ENV = "development"

# Deploy preview context
[context.deploy-preview]
  [context.deploy-preview.environment]
    NODE_ENV = "development"

# Production context
[context.production]
  [context.production.environment]
    NODE_ENV = "production"
    ENVIRONMENT = "production"

# Headers for security and performance
[[headers]]
  for = "/*"
  [headers.values]
    # Security headers
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    
    # Content Security Policy (includes Stripe domains)
    Content-Security-Policy = """
      default-src 'self'; 
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com; 
      style-src 'self' 'unsafe-inline'; 
      img-src 'self' data: https:; 
      font-src 'self' data:; 
      connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; 
      frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com
    """
    
    # HSTS (enable for production with HTTPS)
    Strict-Transport-Security = "max-age=31536000; includeSubDomains"

# Cache optimization for static assets
[[headers]]
  for = "/_astro/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

# 404 page handling
[[redirects]]
  from = "/*"
  to = "/404"
  status = 404

# Functions directory (if using Netlify Functions)
[functions]
  directory = "netlify/functions"
  
# Build plugins for enhanced functionality
[[plugins]]
  package = "@netlify/plugin-functions-install-core"

# Site metadata for better error tracking
[template.metadata]
  name = "Spicebush Montessori Testing Site"
  description = "Astro-based school website with Supabase backend"
EOF

echo -e "${GREEN}✅ Updated netlify.toml with optimized configuration${NC}"

echo ""
echo -e "${BLUE}📋 PHASE 3: Build Script Hardening${NC}"
echo "=================================="

# Create a more robust build script for Netlify
mkdir -p scripts
cat > scripts/netlify-build.sh << 'EOF'
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
EOF

chmod +x scripts/netlify-build.sh

# Update netlify.toml to use the enhanced build script
sed -i.bak 's/command = "npm install --legacy-peer-deps && npm run build"/command = ".\/scripts\/netlify-build.sh"/' netlify.toml

echo -e "${GREEN}✅ Created enhanced build script with error handling${NC}"

echo ""
echo -e "${BLUE}📋 PHASE 4: Environment Variable Validation${NC}"
echo "==========================================="

# Create environment validation script
cat > scripts/validate-env.js << 'EOF'
#!/usr/bin/env node

// Environment Variable Validation Script
// This ensures all required variables are present before building

const requiredVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'PUBLIC_SITE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const optionalVars = [
  'PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY',
  'UNIONE_API_KEY',
  'EMAIL_FROM',
  'EMAIL_FROM_NAME',
  'ADMIN_EMAIL'
];

console.log('🔍 Environment Variable Validation');
console.log('==================================');

let missingRequired = [];
let missingOptional = [];

// Check required variables
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingRequired.push(varName);
    console.log(`❌ MISSING REQUIRED: ${varName}`);
  } else {
    const maskedValue = value.length > 10 ? 
      value.substring(0, 8) + '...' + value.substring(value.length - 4) : 
      '***';
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

// Check optional variables
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    missingOptional.push(varName);
    console.log(`⚠️  MISSING OPTIONAL: ${varName}`);
  } else {
    const maskedValue = value.length > 10 ? 
      value.substring(0, 8) + '...' + value.substring(value.length - 4) : 
      '***';
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

console.log('\n📊 Summary:');
console.log(`Required variables: ${requiredVars.length - missingRequired.length}/${requiredVars.length}`);
console.log(`Optional variables: ${optionalVars.length - missingOptional.length}/${optionalVars.length}`);

if (missingRequired.length > 0) {
  console.log('\n❌ BUILD CANNOT PROCEED');
  console.log('Missing required environment variables:');
  missingRequired.forEach(varName => console.log(`  - ${varName}`));
  console.log('\nAdd these in Netlify dashboard: Site Settings > Environment Variables');
  process.exit(1);
}

if (missingOptional.length > 0) {
  console.log('\n⚠️  Some optional features may not work:');
  missingOptional.forEach(varName => console.log(`  - ${varName}`));
}

console.log('\n✅ Environment validation passed!');
EOF

chmod +x scripts/validate-env.js

echo -e "${GREEN}✅ Created environment validation script${NC}"

echo ""
echo -e "${BLUE}📋 PHASE 5: Test and Deploy${NC}"
echo "=========================="

# Test the configuration locally first
echo "Testing configuration locally..."
cd app

if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Local build test successful${NC}"
else
    echo -e "${RED}❌ Local build test failed${NC}"
    echo "Fix local build issues before proceeding"
    exit 1
fi

cd ..

echo ""
echo -e "${BLUE}📋 PHASE 6: Final Setup Instructions${NC}"
echo "===================================="

echo -e "${GREEN}🎉 AUTOMATIC DEPLOYMENT FIX COMPLETE!${NC}"
echo ""
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo "1. Add missing environment variables in Netlify dashboard"
echo "2. Commit and push these configuration changes"
echo "3. Monitor the next automatic deployment"
echo ""
echo -e "${BLUE}Manual commands to set environment variables:${NC}"
echo "npx netlify env:set PUBLIC_SUPABASE_ANON_KEY \"your-key-here\""
echo "npx netlify env:set SUPABASE_SERVICE_ROLE_KEY \"your-key-here\""
echo "npx netlify env:set PUBLIC_STRIPE_PUBLISHABLE_KEY \"your-key-here\""
echo "npx netlify env:set STRIPE_SECRET_KEY \"your-key-here\""
echo ""
echo -e "${BLUE}Validate configuration:${NC}"
echo "node scripts/validate-env.js"
echo ""
echo -e "${BLUE}Test deployment:${NC}"
echo "npx netlify deploy --build --prod"
echo ""
echo -e "${BLUE}Monitor deployments:${NC}"
echo "https://app.netlify.com/projects/spicebush-testing"

echo ""
echo "🔧 DEPLOYMENT FIX IMPLEMENTATION COMPLETE"
echo "========================================="