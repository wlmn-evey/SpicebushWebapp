#!/bin/bash

# =================================================================
# 🚀 AUTOMATED NETLIFY TESTING ENVIRONMENT SETUP
# =================================================================
# 
# This script automatically configures the testing site environment
# variables using known production values (safe for testing).
# 
# Site ID: 27a429f4-9a58-4421-bc1f-126d70d81aa1
# URL: https://spicebush-testing.netlify.app
# =================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"

echo -e "${BLUE}🚀 Setting up Testing Environment Variables${NC}"
echo -e "${BLUE}=========================================${NC}"

# Check Netlify CLI
if ! command -v netlify &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Netlify CLI...${NC}"
    npm install -g netlify-cli
fi

# Helper function
set_var() {
    local key=$1
    local value=$2
    echo -e "Setting ${BLUE}${key}${NC}"
    netlify env:set "$key" "$value" --site="$SITE_ID" --silent || echo -e "${RED}Failed to set $key${NC}"
}

echo -e "${BLUE}📝 Configuring non-sensitive variables...${NC}"

# Core site configuration
set_var "PUBLIC_SITE_URL" "https://spicebush-testing.netlify.app"
set_var "PUBLIC_SUPABASE_URL" "https://bgppvtnciiznkwfqjpah.supabase.co"
set_var "ENVIRONMENT" "testing"
set_var "NODE_ENV" "production"
set_var "NODE_VERSION" "20"

# Email configuration  
set_var "EMAIL_FROM" "info@spicebushmontessori.org"
set_var "EMAIL_FROM_NAME" "Spicebush Montessori (Testing)"
set_var "ADMIN_EMAIL" "info@spicebushmontessori.org"

echo ""
echo -e "${YELLOW}⚠️  MANUAL CONFIGURATION REQUIRED${NC}"
echo -e "${YELLOW}The following sensitive variables must be set manually:${NC}"
echo ""
echo -e "Visit: ${BLUE}https://app.netlify.com/sites/spicebush-testing/settings/env${NC}"
echo ""
echo -e "Set these variables with values from production site:"
echo -e "  • PUBLIC_SUPABASE_ANON_KEY"
echo -e "  • PUBLIC_SUPABASE_PUBLIC_KEY (same as ANON_KEY)"
echo -e "  • SUPABASE_SERVICE_ROLE_KEY"  
echo -e "  • DATABASE_URL"
echo -e "  • DIRECT_URL"
echo -e "  • PUBLIC_STRIPE_PUBLISHABLE_KEY"
echo -e "  • STRIPE_SECRET_KEY"
echo -e "  • UNIONE_API_KEY (optional)"
echo ""

echo -e "${GREEN}✅ Basic configuration completed!${NC}"
echo -e "${BLUE}Next: Set sensitive variables manually, then test deployment.${NC}"