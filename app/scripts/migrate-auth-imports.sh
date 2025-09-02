#!/bin/bash

# Migration script to update auth imports to use adapter pattern
# This script updates imports throughout the codebase to use the new auth adapter

echo "🔄 Starting auth import migration..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from app directory"
    exit 1
fi

# Backup current state
echo "📦 Creating backup..."
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# Function to update imports in a file
update_imports() {
    local file=$1
    echo "  Updating: $file"
    
    # Update direct supabase imports to use auth adapter
    sed -i.bak "s|from '@lib/supabase'|from '@lib/auth'|g" "$file"
    sed -i.bak "s|from '.*lib/supabase'|from '@lib/auth'|g" "$file"
    
    # Update auth object references
    sed -i.bak "s|supabase\.auth\.|auth\.|g" "$file"
    
    # Update admin auth check imports
    sed -i.bak "s|from '@lib/admin-auth-check'|from '@lib/admin-auth-check-adapter'|g" "$file"
    
    # Clean up backup files
    rm -f "${file}.bak"
}

# Update TypeScript/JavaScript files
echo "📝 Updating TypeScript/JavaScript files..."
find src -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) | while read file; do
    if grep -q "from.*supabase\|admin-auth-check" "$file"; then
        update_imports "$file"
    fi
done

# Update Astro files
echo "📝 Updating Astro files..."
find src -type f -name "*.astro" | while read file; do
    if grep -q "from.*supabase\|admin-auth-check" "$file"; then
        update_imports "$file"
    fi
done

# Update specific files that need special handling
echo "🔧 Applying special updates..."

# Update the main middleware file
if [ -f "src/middleware.ts" ]; then
    echo "  Updating middleware..."
    cp src/middleware-adapter.ts src/middleware.ts
fi

# Update the main admin auth check
if [ -f "src/lib/admin-auth-check.ts" ]; then
    echo "  Updating admin auth check..."
    cp src/lib/admin-auth-check-adapter.ts src/lib/admin-auth-check.ts
fi

# Update API routes
echo "🔧 Updating API routes..."
if [ -f "src/pages/api/auth/send-magic-link.ts" ]; then
    cp src/pages/api/auth/send-magic-link-adapter.ts src/pages/api/auth/send-magic-link.ts
fi

# Create a migration log
echo "📄 Creating migration log..."
cat > migration-log.md << EOF
# Auth Migration Log
Date: $(date)

## Files Updated
$(find src -type f \( -name "*.ts" -o -name "*.js" -o -name "*.astro" \) | xargs grep -l "@lib/auth\|admin-auth-check-adapter" | wc -l) files updated

## Import Changes
- \`@lib/supabase\` → \`@lib/auth\`
- \`@lib/admin-auth-check\` → \`@lib/admin-auth-check-adapter\`
- \`supabase.auth.*\` → \`auth.*\`

## Special Updates
- Middleware updated to use adapter pattern
- Admin auth check updated to use adapter
- API routes updated to use auth adapter

## Backup Location
src.backup.$(date +%Y%m%d_%H%M%S)/
EOF

echo "✅ Migration complete!"
echo ""
echo "📋 Summary:"
echo "  - Imports updated to use auth adapter"
echo "  - Backup created in src.backup.*/"
echo "  - Migration log created in migration-log.md"
echo ""
echo "⚠️  Next steps:"
echo "  1. Test the application with USE_CLERK_AUTH=clerk"
echo "  2. Test the application with USE_CLERK_AUTH=supabase"
echo "  3. Run the test suite: npm test"
echo "  4. If issues arise, restore from backup: mv src.backup.* src/"