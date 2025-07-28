#!/bin/bash

# Database connection details
DB_HOST="localhost"
DB_PORT="5432"
DB_NAME="spicebush_dev"
DB_USER="postgres"
DB_PASSWORD="postgres"

echo "Applying database migrations..."

# Create migrations tracking table if it doesn't exist
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);"

# Apply each migration in order
for migration in supabase/migrations/*.sql; do
    filename=$(basename "$migration")
    echo "Checking migration: $filename"
    
    # Check if migration has already been applied
    result=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$filename';")
    
    if [ "$result" -eq 0 ]; then
        echo "Applying migration: $filename"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration"
        
        if [ $? -eq 0 ]; then
            # Record successful migration
            PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (version) VALUES ('$filename');"
            echo "Migration applied successfully: $filename"
        else
            echo "ERROR: Failed to apply migration: $filename"
            exit 1
        fi
    else
        echo "Migration already applied: $filename"
    fi
done

echo "All migrations applied successfully!"

# Show created tables
echo -e "\nCreated tables:"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "\dt"