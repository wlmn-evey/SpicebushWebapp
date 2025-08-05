#!/bin/bash

# =================================================================
# 🔧 COMPLETE TESTING ENVIRONMENT CONFIGURATION
# =================================================================
# This script completes the environment variable setup for the
# testing site by adding the remaining sensitive variables.
# 
# Prerequisites: Run this after the basic setup is complete
# =================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Site configuration
ACCOUNT_ID="68796db47d5552b20850ba0a"
SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"

echo -e "${BLUE}🔧 Completing Testing Environment Configuration${NC}"
echo -e "${BLUE}=============================================${NC}"
echo ""

# Function to set environment variable via API
set_env_var() {
    local key=$1
    local value=$2
    local is_secret=${3:-false}
    
    echo -e "Setting ${BLUE}${key}${NC}..."
    
    local secret_flag=""
    if [ "$is_secret" = "true" ]; then
        secret_flag=', "is_secret": true'
    fi
    
    if npx netlify api createEnvVars --data="{
        \"account_id\": \"$ACCOUNT_ID\",
        \"site_id\": \"$SITE_ID\",
        \"body\": [{
            \"key\": \"$key\",
            \"values\": [{\"value\": \"$value\", \"context\": \"all\"}]
            $secret_flag
        }]
    }" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${key} configured${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to set ${key}${NC}"
        return 1
    fi
}

echo -e "${YELLOW}📝 This script will prompt for sensitive environment variables.${NC}"
echo -e "${YELLOW}You can find these values in the production Netlify dashboard.${NC}"
echo ""
echo -e "${BLUE}Production dashboard: https://app.netlify.com/sites/spicebush-montessori/settings/env${NC}"
echo ""

# Prompt for each required variable
echo -e "${YELLOW}🔐 Enter Supabase Configuration:${NC}"
echo ""

read -p "PUBLIC_SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
if [ ! -z "$SUPABASE_ANON_KEY" ]; then
    set_env_var "PUBLIC_SUPABASE_ANON_KEY" "$SUPABASE_ANON_KEY" false
    # Set compatibility alias
    set_env_var "PUBLIC_SUPABASE_PUBLIC_KEY" "$SUPABASE_ANON_KEY" false
fi

read -s -p "SUPABASE_SERVICE_ROLE_KEY (hidden): " SUPABASE_SERVICE_KEY
echo ""
if [ ! -z "$SUPABASE_SERVICE_KEY" ]; then
    set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_KEY" true
fi

read -s -p "DATABASE_URL (hidden): " DATABASE_URL
echo ""
if [ ! -z "$DATABASE_URL" ]; then
    set_env_var "DATABASE_URL" "$DATABASE_URL" true
fi

read -s -p "DIRECT_URL (hidden): " DIRECT_URL
echo ""
if [ ! -z "$DIRECT_URL" ]; then
    set_env_var "DIRECT_URL" "$DIRECT_URL" true
fi

echo ""
echo -e "${YELLOW}💳 Enter Stripe Configuration:${NC}"
echo ""

read -p "PUBLIC_STRIPE_PUBLISHABLE_KEY: " STRIPE_PUB_KEY
if [ ! -z "$STRIPE_PUB_KEY" ]; then
    set_env_var "PUBLIC_STRIPE_PUBLISHABLE_KEY" "$STRIPE_PUB_KEY" false
fi

read -s -p "STRIPE_SECRET_KEY (hidden): " STRIPE_SECRET_KEY
echo ""
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    set_env_var "STRIPE_SECRET_KEY" "$STRIPE_SECRET_KEY" true
fi

echo ""
echo -e "${YELLOW}📧 Enter Email Service Configuration (Optional):${NC}"
echo ""

read -s -p "UNIONE_API_KEY (optional, hidden): " UNIONE_API_KEY
echo ""
if [ ! -z "$UNIONE_API_KEY" ]; then
    set_env_var "UNIONE_API_KEY" "$UNIONE_API_KEY" true
    set_env_var "EMAIL_SERVICE" "unione" false
fi

echo ""
echo -e "${GREEN}🎉 Environment Configuration Complete!${NC}"
echo ""

# Show current configuration
echo -e "${BLUE}📋 Current Environment Variables:${NC}"
npx netlify api getEnvVars --data="{\"account_id\": \"$ACCOUNT_ID\", \"site_id\": \"$SITE_ID\"}" | jq -r '.[].key' | sort

echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo -e "1. ${YELLOW}Test the deployment:${NC}"
echo -e "   npx netlify deploy --prod"
echo ""
echo -e "2. ${YELLOW}Or push to trigger auto-deployment:${NC}"
echo -e "   git push origin testing"
echo ""
echo -e "3. ${YELLOW}Monitor deployment:${NC}"
echo -e "   https://app.netlify.com/projects/spicebush-testing/deploys"
echo ""
echo -e "4. ${YELLOW}Test the site:${NC}"
echo -e "   https://spicebush-testing.netlify.app"
echo ""

echo -e "${GREEN}✅ Setup completed successfully!${NC}"