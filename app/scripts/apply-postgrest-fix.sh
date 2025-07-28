#!/bin/bash

echo "Applying PostgREST role fix..."

# Apply the SQL fix
PGPASSWORD=your-super-secret-and-long-postgres-password psql \
  -h localhost \
  -p 54322 \
  -U postgres \
  -d postgres \
  -f scripts/fix-postgrest-roles.sql

if [ $? -eq 0 ]; then
  echo "✅ Role permissions fixed successfully"
  echo ""
  echo "Next step: Restart PostgREST container"
  echo "Run: docker compose restart supabase-rest"
else
  echo "❌ Failed to apply role fix"
  exit 1
fi