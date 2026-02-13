#!/bin/bash
# configure-netlify-testing-simple.sh - Simple environment setup for testing site

set -e

command -v npx >/dev/null || { echo "Error: npm/npx not found"; exit 1; }

echo "Configuring Netlify testing site environment for Netlify DB + admin auth..."
echo ""
echo "Required variables:"
echo "1. NETLIFY_DATABASE_URL (postgres://... with sslmode=require)"
echo "2. PUBLIC_SITE_URL (testing site URL)"
echo "3. AUTH_PROVIDER (auth0 or netlify-magic-link)"
echo ""
echo "Optional variables:"
echo "- ADMIN_EMAILS (comma-separated explicit allow-list)"
echo "- ADMIN_DOMAINS (comma-separated allow-list domains)"
echo "- For auth0: AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET"
echo "- For magic-link: EMAIL_SERVICE and provider API key"
echo ""

read -p "Do you have the required values ready? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Collect the required values and run this script again."
    exit 1
fi

echo ""
read -s -p "NETLIFY_DATABASE_URL: " DB_URL && echo
[ -n "$DB_URL" ] && npx netlify env:set NETLIFY_DATABASE_URL "$DB_URL" || echo "Skipped"
[ -n "$DB_URL" ] && npx netlify env:set DATABASE_URL "$DB_URL" || echo "Skipped"

read -p "PUBLIC_SITE_URL: " SITE_URL
[ -n "$SITE_URL" ] && npx netlify env:set PUBLIC_SITE_URL "$SITE_URL" || echo "Skipped"

read -p "AUTH_PROVIDER [auth0]: " AUTH_PROVIDER
AUTH_PROVIDER=${AUTH_PROVIDER:-auth0}
npx netlify env:set AUTH_PROVIDER "$AUTH_PROVIDER"

read -p "ADMIN_EMAILS (optional): " ADMIN_EMAILS
[ -n "$ADMIN_EMAILS" ] && npx netlify env:set ADMIN_EMAILS "$ADMIN_EMAILS" || echo "Skipped"

read -p "ADMIN_DOMAINS (optional): " ADMIN_DOMAINS
[ -n "$ADMIN_DOMAINS" ] && npx netlify env:set ADMIN_DOMAINS "$ADMIN_DOMAINS" || echo "Skipped"

if [[ "$AUTH_PROVIDER" == "auth0" ]]; then
    read -p "AUTH0_DOMAIN (required): " AUTH0_DOMAIN
    [ -n "$AUTH0_DOMAIN" ] && npx netlify env:set AUTH0_DOMAIN "$AUTH0_DOMAIN" || echo "Skipped"

    read -p "AUTH0_CLIENT_ID (required): " AUTH0_CLIENT_ID
    [ -n "$AUTH0_CLIENT_ID" ] && npx netlify env:set AUTH0_CLIENT_ID "$AUTH0_CLIENT_ID" || echo "Skipped"

    read -s -p "AUTH0_CLIENT_SECRET (required): " AUTH0_CLIENT_SECRET && echo
    [ -n "$AUTH0_CLIENT_SECRET" ] && npx netlify env:set AUTH0_CLIENT_SECRET "$AUTH0_CLIENT_SECRET" || echo "Skipped"

    read -p "AUTH0_CALLBACK_URL (optional): " AUTH0_CALLBACK_URL
    [ -n "$AUTH0_CALLBACK_URL" ] && npx netlify env:set AUTH0_CALLBACK_URL "$AUTH0_CALLBACK_URL" || echo "Skipped"

    read -p "AUTH0_AUDIENCE (optional): " AUTH0_AUDIENCE
    [ -n "$AUTH0_AUDIENCE" ] && npx netlify env:set AUTH0_AUDIENCE "$AUTH0_AUDIENCE" || echo "Skipped"
else
    read -p "EMAIL_SERVICE (optional, e.g. resend): " EMAIL_SERVICE
    [ -n "$EMAIL_SERVICE" ] && npx netlify env:set EMAIL_SERVICE "$EMAIL_SERVICE" || echo "Skipped"

    if [[ "$EMAIL_SERVICE" == "resend" ]]; then
        read -s -p "RESEND_API_KEY (optional): " RESEND_API_KEY && echo
        [ -n "$RESEND_API_KEY" ] && npx netlify env:set RESEND_API_KEY "$RESEND_API_KEY" || echo "Skipped"
    fi

    if [[ "$EMAIL_SERVICE" == "sendgrid" ]]; then
        read -s -p "SENDGRID_API_KEY (optional): " SENDGRID_API_KEY && echo
        [ -n "$SENDGRID_API_KEY" ] && npx netlify env:set SENDGRID_API_KEY "$SENDGRID_API_KEY" || echo "Skipped"
    fi

    if [[ "$EMAIL_SERVICE" == "postmark" ]]; then
        read -s -p "POSTMARK_SERVER_TOKEN (optional): " POSTMARK_SERVER_TOKEN && echo
        [ -n "$POSTMARK_SERVER_TOKEN" ] && npx netlify env:set POSTMARK_SERVER_TOKEN "$POSTMARK_SERVER_TOKEN" || echo "Skipped"
    fi
fi

echo ""
echo "Configuration complete."
echo "Deploy testing with: git push origin testing"
