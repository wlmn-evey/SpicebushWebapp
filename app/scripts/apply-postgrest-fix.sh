#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if POSTGRES_PASSWORD is set
if [ -z "$POSTGRES_PASSWORD" ]; then
  echo "❌ Error: POSTGRES_PASSWORD environment variable is not set"
  echo "Please ensure your .env file contains POSTGRES_PASSWORD or export it before running this script"
  exit 1
fi

echo "Applying PostgREST role fix..."

# Create a temporary file with the password substituted
TEMP_SQL=$(mktemp)
sed "s/\${POSTGRES_PASSWORD}/$POSTGRES_PASSWORD/g" scripts/fix-postgrest-roles.sql > "$TEMP_SQL"

# Apply the SQL fix using environment variable
PGPASSWORD=$POSTGRES_PASSWORD psql \
  -h localhost \
  -p 54322 \
  -U postgres \
  -d postgres \
  -f "$TEMP_SQL"

# Capture the exit code
EXIT_CODE=$?

# Clean up temporary file
rm -f "$TEMP_SQL"

# Check the exit code
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ Role permissions fixed successfully"
  echo ""
  echo "Next step: Restart PostgREST container"
  echo "Run: docker compose restart supabase-rest"
else
  echo "❌ Failed to apply role fix"
  exit 1
fi