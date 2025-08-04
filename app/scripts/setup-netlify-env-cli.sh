#!/bin/bash

# Netlify Environment Variables Setup Script
# This script uses the Netlify CLI to set environment variables

echo "🚀 Netlify Environment Variables Setup - CLI Version"
echo "===================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo -e "${RED}❌ Netlify CLI is not installed${NC}"
    echo "Install it with: npm install -g netlify-cli"
    echo "Or use: node scripts/setup-netlify-env-vars.js instead"
    exit 1
fi

# Check if logged in
echo -e "${CYAN}Checking Netlify login status...${NC}"
if ! netlify status &> /dev/null; then
    echo -e "${YELLOW}Not logged in to Netlify. Logging in...${NC}"
    netlify login
fi

# Get site info
echo ""
echo -e "${CYAN}Select or link your Netlify site:${NC}"
netlify link

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    local secret=$3
    
    if [ "$secret" = "true" ]; then
        echo -e "${CYAN}Setting ${key}: ***${NC}"
    else
        echo -e "${CYAN}Setting ${key}: ${value}${NC}"
    fi
    
    netlify env:set "$key" "$value" --context production
}

echo ""
echo -e "${GREEN}Setting pre-configured environment variables...${NC}"
echo ""

# Set public Supabase configuration
set_env_var "PUBLIC_SUPABASE_URL" "https://xnzweuepchbfffsegkml.supabase.co" "false"
set_env_var "PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4NjE4NjIsImV4cCI6MjAzNzQzNzg2Mn0.XEJpxUdYoLrtlXokWqETqMhcKFgEQWs2jqATSr6Dv6E" "false"

# Set email configuration
set_env_var "UNIONE_API_KEY" "6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme" "true"
set_env_var "EMAIL_FROM" "noreply@spicebushmontessori.org" "false"
set_env_var "EMAIL_FROM_NAME" "Spicebush Montessori" "false"
set_env_var "UNIONE_REGION" "us" "false"

# Set site configuration
set_env_var "ADMIN_EMAIL" "admin@spicebushmontessori.org" "false"
set_env_var "SITE_URL" "https://spicebushmontessori.org" "false"
set_env_var "NODE_VERSION" "20" "false"

echo ""
echo -e "${YELLOW}Now we need some values from your Supabase dashboard:${NC}"
echo "Go to: https://supabase.com/dashboard → Your Project → Settings"
echo ""

# Get user input for sensitive variables
read -p "Enter your Supabase SERVICE ROLE KEY (starts with eyJ...): " SUPABASE_SERVICE_ROLE_KEY
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ SERVICE ROLE KEY is required${NC}"
    exit 1
fi
set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "true"

echo ""
read -p "Enter your DATABASE_URL (postgresql://...): " DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ DATABASE_URL is required${NC}"
    exit 1
fi
set_env_var "DATABASE_URL" "$DATABASE_URL" "true"

echo ""
read -p "Enter your DIRECT_URL (press Enter to use same as DATABASE_URL): " DIRECT_URL
if [ -z "$DIRECT_URL" ]; then
    DIRECT_URL="$DATABASE_URL"
fi
set_env_var "DIRECT_URL" "$DIRECT_URL" "true"

echo ""
echo -e "${GREEN}✅ All environment variables have been set!${NC}"
echo ""
echo "You can view them with: netlify env:list"
echo ""
echo -e "${CYAN}Next steps:${NC}"
echo "1. Trigger a new deployment: netlify deploy --prod"
echo "2. Or push a commit to trigger automatic deployment"
echo "3. Monitor the build at: netlify open"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Keep your service role key and database URLs secret!"
echo "- Use different values for staging vs production"
echo "- Your site will be available at your Netlify URL"
echo ""
echo -e "${GREEN}✨ Setup complete!${NC}"