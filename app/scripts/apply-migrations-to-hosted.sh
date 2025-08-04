#!/bin/bash

# Apply migrations to hosted Supabase instance
# This script applies all SQL migrations in order to the hosted database

echo "=================================================="
echo "🚀 Applying migrations to hosted Supabase instance"
echo "=================================================="
echo ""

# Source the hosted environment variables
if [ -f ".env.hosted" ]; then
    export $(cat .env.hosted | grep -v '^#' | xargs)
else
    echo "❌ Error: .env.hosted file not found!"
    echo "   Please ensure you have the hosted environment configuration."
    exit 1
fi

# Database connection details from environment
DB_HOST="${DB_HOST}"
DB_PORT="${DB_PORT}"
DB_USER="${DB_USER}"
DB_PASSWORD="${DB_PASSWORD}"
DB_DATABASE="${DB_DATABASE}"

# Verify we have all required connection details
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_DATABASE" ]; then
    echo "❌ Error: Missing required database connection details!"
    echo "   Please check your .env.hosted file contains:"
    echo "   - DB_HOST"
    echo "   - DB_PORT"
    echo "   - DB_USER"
    echo "   - DB_PASSWORD"
    echo "   - DB_DATABASE"
    exit 1
fi

echo "📊 Database connection details:"
echo "   Host: $DB_HOST"
echo "   Port: $DB_PORT"
echo "   Database: $DB_DATABASE"
echo "   User: $DB_USER"
echo ""

# Test database connection
echo "🔍 Testing database connection..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "SELECT version();" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ Error: Unable to connect to the database!"
    echo "   Please verify your connection details and network access."
    exit 1
fi

echo "✅ Database connection successful!"
echo ""

# Create migrations tracking table if it doesn't exist
echo "📝 Creating migrations tracking table..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "⚠️  Warning: Could not create schema_migrations table (might already exist)"
fi

# Check which migrations have already been applied
echo "🔍 Checking existing migrations..."
EXISTING_MIGRATIONS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -t -c "SELECT version FROM schema_migrations;" 2>/dev/null | tr -d ' ')

# Apply each migration in order
MIGRATIONS_DIR="supabase/migrations"
APPLIED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

echo ""
echo "📂 Processing migrations from: $MIGRATIONS_DIR"
echo "=================================================="

for migration in $MIGRATIONS_DIR/*.sql; do
    if [ -f "$migration" ]; then
        filename=$(basename "$migration")
        
        # Check if migration has already been applied
        if echo "$EXISTING_MIGRATIONS" | grep -q "^$filename$"; then
            echo "⏭️  Skipping (already applied): $filename"
            ((SKIPPED_COUNT++))
        else
            echo "📋 Applying migration: $filename"
            
            # Apply the migration
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -f "$migration" > /tmp/migration_output.log 2>&1
            
            if [ $? -eq 0 ]; then
                # Record successful migration
                PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "INSERT INTO schema_migrations (version) VALUES ('$filename');" > /dev/null 2>&1
                echo "✅ Successfully applied: $filename"
                ((APPLIED_COUNT++))
            else
                echo "❌ Failed to apply: $filename"
                echo "   Error details:"
                cat /tmp/migration_output.log | head -20
                ((FAILED_COUNT++))
                
                # Ask if we should continue
                read -p "   Continue with remaining migrations? (y/n): " -n 1 -r
                echo
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    break
                fi
            fi
            echo ""
        fi
    fi
done

# Clean up temp file
rm -f /tmp/migration_output.log

echo "=================================================="
echo "📊 Migration Summary:"
echo "   ✅ Applied: $APPLIED_COUNT"
echo "   ⏭️  Skipped: $SKIPPED_COUNT"
echo "   ❌ Failed: $FAILED_COUNT"
echo "=================================================="

# Verify critical tables exist
echo ""
echo "🔍 Verifying critical tables..."

CRITICAL_TABLES=(
    "settings"
    "content"
    "admin_sessions"
    "communications"
    "newsletter_subscribers"
)

MISSING_TABLES=()

for table in "${CRITICAL_TABLES[@]}"; do
    TABLE_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null | tr -d ' ')
    
    if [ "$TABLE_EXISTS" = "t" ]; then
        echo "✅ Table exists: $table"
    else
        echo "❌ Table missing: $table"
        MISSING_TABLES+=($table)
    fi
done

echo ""

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    echo "✅ All critical tables are present!"
else
    echo "⚠️  Warning: Some critical tables are missing:"
    for table in "${MISSING_TABLES[@]}"; do
        echo "   - $table"
    done
    echo ""
    echo "   This may indicate that some migrations failed to apply."
fi

# Show current database schema
echo ""
echo "📋 Current database schema:"
echo "=================================================="
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_DATABASE -c "\dt public.*" 2>/dev/null | head -30

echo ""
echo "🎉 Migration process complete!"

if [ $FAILED_COUNT -gt 0 ]; then
    echo ""
    echo "⚠️  Some migrations failed. Please review the errors above."
    echo "   You may need to manually fix issues before retrying."
    exit 1
fi

if [ $APPLIED_COUNT -gt 0 ]; then
    echo ""
    echo "✅ Successfully applied $APPLIED_COUNT new migrations!"
fi

echo ""
echo "💡 Next steps:"
echo "   1. Test the application with the updated database"
echo "   2. Verify all features are working correctly"
echo "   3. Check application logs for any database errors"