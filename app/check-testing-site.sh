#!/bin/bash

echo "🔍 Checking Testing Site Status"
echo "=============================="
echo ""

# Check if site responds
echo "Testing: https://spicebush-testing.netlify.app"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://spicebush-testing.netlify.app)

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Site is LIVE! (HTTP $HTTP_STATUS)"
    echo ""
    echo "Next steps:"
    echo "1. Visit https://spicebush-testing.netlify.app"
    echo "2. Check that all pages load correctly"
    echo "3. Test the donation form"
    echo "4. Verify admin functions work"
else
    echo "❌ Site is NOT accessible (HTTP $HTTP_STATUS)"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check deployment status at:"
    echo "   https://app.netlify.com/sites/spicebush-testing/deploys"
    echo ""
    echo "2. Ensure environment variables are set:"
    echo "   https://app.netlify.com/sites/spicebush-testing/settings/env"
    echo ""
    echo "3. Required variables:"
    echo "   - PUBLIC_SUPABASE_URL"
    echo "   - PUBLIC_SUPABASE_ANON_KEY"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - DATABASE_URL"
    echo "   - PUBLIC_STRIPE_PUBLISHABLE_KEY"
    echo "   - STRIPE_SECRET_KEY"
fi