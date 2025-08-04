#!/bin/bash

# Netlify Environment Variables Setup Script
# Sets all required environment variables for Spicebush Montessori

NETLIFY_TOKEN="nfp_ka3Q8G61s46RXFfNN3P8RdzHVx4TaHH98262"

echo "🚀 Setting Netlify Environment Variables"
echo "========================================"
echo ""
echo "Please enter your Netlify Site ID:"
echo "(You can find this in Netlify Dashboard → Site Configuration → General)"
read -p "Site ID: " SITE_ID

if [ -z "$SITE_ID" ]; then
    echo "❌ Site ID is required"
    exit 1
fi

echo ""
echo "Now I need your Supabase credentials from the dashboard:"
echo "(Go to: https://supabase.com/dashboard/project/xnzweuepchbfffsegkml/settings/api)"
echo ""
read -p "SUPABASE_SERVICE_ROLE_KEY: " SERVICE_ROLE_KEY
read -p "DATABASE_URL: " DATABASE_URL  
read -p "DIRECT_URL: " DIRECT_URL

echo ""
echo "🔧 Setting environment variables..."
echo ""

# Function to set environment variable
set_env_var() {
    local key=$1
    local value=$2
    
    response=$(curl -s -X PUT \
        -H "Authorization: Bearer $NETLIFY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"key\":\"$key\",\"value\":\"$value\"}" \
        "https://api.netlify.com/api/v1/accounts/sites/$SITE_ID/env/$key")
    
    if [ $? -eq 0 ]; then
        echo "✅ Set $key"
    else
        echo "❌ Failed to set $key"
    fi
}

# Set all environment variables
set_env_var "PUBLIC_SUPABASE_URL" "https://xnzweuepchbfffsegkml.supabase.co"
set_env_var "PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuendldWVwY2hiZmZmc2Vna21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjE4NjE4NjIsImV4cCI6MjAzNzQzNzg2Mn0.XEJpxUdYoLrtlXokWqETqMhcKFgEQWs2jqATSr6Dv6E"
set_env_var "SUPABASE_SERVICE_ROLE_KEY" "$SERVICE_ROLE_KEY"
set_env_var "DATABASE_URL" "$DATABASE_URL"
set_env_var "DIRECT_URL" "$DIRECT_URL"
set_env_var "UNIONE_API_KEY" "6w7qcex9tztza1y9g4fmezdc7zc1t4xcnwr1ihme"
set_env_var "EMAIL_FROM" "noreply@spicebushmontessori.org"
set_env_var "EMAIL_FROM_NAME" "Spicebush Montessori"
set_env_var "UNIONE_REGION" "us"
set_env_var "ADMIN_EMAIL" "admin@spicebushmontessori.org"
set_env_var "SITE_URL" "https://spicebushmontessori.org"
set_env_var "NODE_VERSION" "20"

echo ""
echo "✨ Environment variables have been set!"
echo ""
echo "🎯 Next Steps:"
echo "1. Go to your Netlify dashboard"
echo "2. Trigger a new deployment"
echo "3. Verify your site is working"
echo ""
echo "🎉 Your site should be ready for production!"