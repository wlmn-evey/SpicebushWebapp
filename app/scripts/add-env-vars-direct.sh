#\!/bin/bash

echo "🔧 Setting Netlify Environment Variables"
echo ""
echo "Since the CLI is having issues, here's a direct approach:"
echo ""

# Get auth token
AUTH_TOKEN=$(cat ~/.netlify/config.json 2>/dev/null | jq -r '.users[0].auth.token // empty')

if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ No Netlify auth token found. Please run: npx netlify login"
    exit 1
fi

SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"
API_BASE="https://api.netlify.com/api/v1"

echo "✅ Found auth token"
echo "📍 Site ID: $SITE_ID"
echo ""

# Function to add environment variable
add_env_var() {
    local key=$1
    local value=$2
    
    echo "Setting $key..."
    
    # Using the v1 API endpoint for environment variables
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        "$API_BASE/sites/$SITE_ID/env/$key" \
        -d "{\"value\": \"$value\"}")
    
    if echo "$response" | grep -q "error"; then
        # Try to update if it already exists
        response=$(curl -s -X PUT \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            "$API_BASE/sites/$SITE_ID/env/$key" \
            -d "{\"value\": \"$value\"}")
    fi
    
    if echo "$response" | grep -q "$key"; then
        echo "✅ $key set successfully"
    else
        echo "❌ Failed to set $key: $response"
    fi
}

# Set the environment variables
add_env_var "PUBLIC_SUPABASE_URL" "https://xnzweuepchbfffsegkml.supabase.co"
add_env_var "PUBLIC_SUPABASE_ANON_KEY" "sb_publishable_3Ja6qCU9VfJ-V68G63ZZNQ_Yc2wBvEN"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "sb_secret_eNcOoXgv1AtzKfklcvjh7g_I5LUpOWd"
add_env_var "PUBLIC_SITE_URL" "https://spicebush-testing.netlify.app"

echo ""
echo "✅ Environment variable setup complete\!"
echo ""
echo "📋 Next steps:"
echo "1. Verify in Netlify dashboard: https://app.netlify.com/projects/spicebush-testing/configuration/env"
echo "2. Trigger a new deployment: git push origin testing"
echo "3. Test magic link: https://spicebush-testing.netlify.app/auth/magic-login"
