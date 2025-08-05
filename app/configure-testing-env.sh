#!/bin/bash

# =================================================================
# 🔧 NETLIFY TESTING SITE ENVIRONMENT CONFIGURATION SCRIPT
# =================================================================
# 
# This script configures all required environment variables for the
# Spicebush Montessori testing site on Netlify.
# 
# Site: https://spicebush-testing.netlify.app
# Site ID: 27a429f4-9a58-4421-bc1f-126d70d81aa1
# 
# Prerequisites:
# 1. Netlify CLI installed: npm install -g netlify-cli
# 2. Authenticated with Netlify: netlify login
# 3. Access to production environment variables for reference
#
# Usage: ./configure-testing-env.sh
# =================================================================

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Site configuration
SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"
SITE_NAME="spicebush-testing"
SITE_URL="https://spicebush-testing.netlify.app"

echo -e "${BLUE}🚀 Configuring Netlify Testing Site Environment Variables${NC}"
echo -e "${BLUE}=======================================================${NC}"
echo ""
echo -e "Site ID: ${YELLOW}${SITE_ID}${NC}"
echo -e "Site URL: ${YELLOW}${SITE_URL}${NC}"
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${RED}❌ Netlify CLI not found. Installing...${NC}"
    npm install -g netlify-cli
fi

# Check if user is authenticated
echo -e "${BLUE}🔐 Checking Netlify authentication...${NC}"
if ! netlify status &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not authenticated with Netlify. Please login:${NC}"
    netlify login
fi

echo -e "${GREEN}✅ Netlify CLI authenticated${NC}"

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    local description=$3
    
    echo -e "Setting ${BLUE}${key}${NC}: ${description}"
    
    if netlify env:set "$key" "$value" --site="$SITE_ID"; then
        echo -e "${GREEN}✅ ${key} configured${NC}"
    else
        echo -e "${RED}❌ Failed to set ${key}${NC}"
        return 1
    fi
}

echo ""
echo -e "${BLUE}📝 Configuring Environment Variables...${NC}"
echo ""

# =================================================================
# CORE INFRASTRUCTURE VARIABLES (CRITICAL)
# =================================================================

echo -e "${YELLOW}🏗️  Core Infrastructure Variables${NC}"

# Site URL
set_env_var "PUBLIC_SITE_URL" "$SITE_URL" "Testing site URL"

# Supabase Configuration
# NOTE: Using production Supabase instance with environment flags
set_env_var "PUBLIC_SUPABASE_URL" "https://bgppvtnciiznkwfqjpah.supabase.co" "Supabase project URL"

# These keys need to be provided - they're sensitive
echo ""
echo -e "${YELLOW}⚠️  The following environment variables require sensitive values:${NC}"
echo -e "${YELLOW}   Please set these manually in the Netlify dashboard or provide them here:${NC}"
echo ""

# Prompt for sensitive values
read -p "Enter PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
if [ ! -z "$SUPABASE_ANON_KEY" ]; then
    set_env_var "PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" "Supabase anonymous key"
fi

read -p "Enter SUPABASE_SERVICE_ROLE_KEY: " SUPABASE_SERVICE_KEY
if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
    set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_KEY" "Supabase service role key"
fi

read -p "Enter DATABASE_URL: " DATABASE_URL
if [ ! -z "$DATABASE_URL" ]; then
    set_env_var "DATABASE_URL" "$DATABASE_URL" "Database connection string"
fi

read -p "Enter DIRECT_URL: " DIRECT_URL
if [ ! -z "$DIRECT_URL" ]; then
    set_env_var "DIRECT_URL" "$DIRECT_URL" "Direct database connection string"
fi

# =================================================================
# PAYMENT PROCESSING (STRIPE)
# =================================================================

echo ""
echo -e "${YELLOW}💳 Payment Processing Variables${NC}"

read -p "Enter PUBLIC_STRIPE_PUBLISHABLE_KEY: " STRIPE_PUB_KEY
if [ ! -z "$STRIPE_PUB_KEY" ]; then
    set_env_var "PUBLIC_STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUB_KEY" "Stripe publishable key"
fi

read -p "Enter STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    set_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" "Stripe secret key"
fi

read -p "Enter STRIPE_WEBHOOK_SECRET (optional): " STRIPE_WEBHOOK_SECRET
if [ ! -z "$STRIPE_WEBHOOK_SECRET" ]; then
    set_env_var "STRIPE_WEBHOOK_SECRET" "$STRIPE_WEBHOOK_SECRET" "Stripe webhook secret"
fi

# =================================================================
# EMAIL SERVICES
# =================================================================

echo ""
echo -e "${YELLOW}📧 Email Service Variables${NC}"

# Set testing-specific email configuration
set_env_var "EMAIL_FROM" "info@spicebushmontessori.org" "Email sender address"
set_env_var "EMAIL_FROM_NAME" "Spicebush Montessori (Testing)" "Email sender name (testing)"

read -p "Enter UNIONE_API_KEY (optional): " UNIONE_API_KEY
if [ ! -z "$UNIONE_API_KEY" ]; then
    set_env_var "UNIONE_API_KEY" "$UNIONE_API_KEY" "Unione email service API key"
    set_env_var "EMAIL_SERVICE" "unione" "Email service provider"
fi

# =================================================================
# ADMINISTRATIVE CONFIGURATION
# =================================================================

echo ""
echo -e "${YELLOW}👥 Administrative Variables${NC}"

set_env_var "ADMIN_EMAIL" "info@spicebushmontessori.org" "Administrator email address"
set_env_var "ENVIRONMENT" "testing" "Environment identifier"

# Optional: Additional admin emails
read -p "Enter additional ADMIN_EMAILS (comma-separated, optional): " ADMIN_EMAILS
if [ ! -z "$ADMIN_EMAILS" ]; then
    set_env_var "ADMIN_EMAILS" "$ADMIN_EMAILS" "Additional administrator emails"
fi

# =================================================================
# BUILD AND DEPLOYMENT CONFIGURATION
# =================================================================

echo ""
echo -e "${YELLOW}🔧 Build Configuration Variables${NC}"

set_env_var "NODE_ENV" "production" "Node environment for testing"
set_env_var "NODE_VERSION" "20" "Node.js version"

# =================================================================
# COMPATIBILITY VARIABLES
# =================================================================

echo ""
echo -e "${YELLOW}🔄 Compatibility Variables${NC}"

# For compatibility with existing code that might use both names
if [ ! -z "$SUPABASE_ANON_KEY" ]; then
    set_env_var "PUBLIC_SUPABASE_PUBLIC_KEY" "$SUPABASE_ANON_KEY" "Supabase public key (compatibility alias)"
fi

# =================================================================
# VERIFICATION AND COMPLETION
# =================================================================

echo ""
echo -e "${BLUE}🔍 Verifying Configuration...${NC}"

# List all environment variables to verify
echo ""
echo -e "${BLUE}📋 Current Environment Variables:${NC}"
netlify env:list --site="$SITE_ID"

echo ""
echo -e "${GREEN}🎉 Environment Variable Configuration Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. ${YELLOW}Trigger a new deployment:${NC}"
echo -e "   netlify deploy --site=$SITE_ID --prod"
echo ""
echo -e "2. ${YELLOW}Or push to testing branch to trigger auto-deployment:${NC}"
echo -e "   git push origin testing"
echo ""
echo -e "3. ${YELLOW}Verify the deployment:${NC}"
echo -e "   ${SITE_URL}"
echo ""
echo -e "4. ${YELLOW}Configure Stripe webhook endpoint:${NC}"
echo -e "   Endpoint: ${SITE_URL}/api/webhooks/stripe"
echo -e "   Events: payment_intent.succeeded, payment_intent.failed"
echo ""

# =================================================================
# OPTIONAL: IMMEDIATE DEPLOYMENT
# =================================================================

echo -e "${BLUE}🚀 Deploy Now?${NC}"
read -p "Would you like to trigger a deployment now? (y/N): " DEPLOY_NOW

if [[ $DEPLOY_NOW =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}🚀 Triggering deployment...${NC}"
    
    if netlify deploy --site="$SITE_ID" --prod; then
        echo ""
        echo -e "${GREEN}🎉 Deployment triggered successfully!${NC}"
        echo -e "${BLUE}Check deployment status:${NC} https://app.netlify.com/projects/spicebush-testing/deploys"
        echo -e "${BLUE}Testing site:${NC} ${SITE_URL}"
    else
        echo ""
        echo -e "${RED}❌ Deployment failed. Check the logs above.${NC}"
        echo -e "${YELLOW}You can try again with:${NC} netlify deploy --site=$SITE_ID --prod"
    fi
else
    echo ""
    echo -e "${YELLOW}⏭️  Deployment skipped. You can deploy later using:${NC}"
    echo -e "   netlify deploy --site=$SITE_ID --prod"
fi

echo ""
echo -e "${GREEN}✅ Configuration script completed successfully!${NC}"
echo ""
echo -e "${BLUE}📚 For troubleshooting, see:${NC}"
echo -e "   - /app/journal/2025-08-05-netlify-testing-deployment-architectural-plan.md"
echo -e "   - /app/DEBUGGING_QUICK_REFERENCE.md"
echo ""