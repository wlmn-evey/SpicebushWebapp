#!/bin/bash
# Export data for migration to hosted Supabase
# Usage: ./scripts/export-for-migration.sh

set -e

echo "📤 Exporting data for migration..."

# Create export directory
EXPORT_DIR="exports/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EXPORT_DIR"

# Export only data (no schema) excluding migration tracking tables
echo "🗄️  Exporting data only (no schema)..."
docker compose exec -T supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --data-only \
  --exclude-table='_prisma_migrations' \
  --exclude-table='schema_migrations' \
  --exclude-table='auth.schema_migrations' \
  --exclude-table='supabase_migrations.schema_migrations' \
  --exclude-schema='supabase_functions' \
  > "$EXPORT_DIR/data-only.sql"

# Create a summary of what's being migrated
echo "📊 Creating migration summary..."
docker compose exec -T supabase-db psql -U postgres -d postgres << EOF > "$EXPORT_DIR/migration-summary.txt"
-- Table row counts
SELECT 'Settings records:' as info, count(*) from public.settings;
SELECT 'Hours records:' as info, count(*) from public.hours;
SELECT 'Programs records:' as info, count(*) from public.programs;
SELECT 'Auth users:' as info, count(*) from auth.users;
EOF

echo ""
echo "✅ Export complete!"
echo "📁 Export location: $EXPORT_DIR"
echo ""
echo "📋 Export contents:"
ls -la "$EXPORT_DIR"
echo ""
cat "$EXPORT_DIR/migration-summary.txt"
echo ""
echo "💡 Next: Import data-only.sql to hosted Supabase SQL editor"