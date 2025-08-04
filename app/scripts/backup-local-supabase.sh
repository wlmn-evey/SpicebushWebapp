#!/bin/bash
# Backup script for local Supabase data
# Usage: ./scripts/backup-local-supabase.sh

set -e

echo "🔐 Backing up local Supabase data..."

# Create backup directory with timestamp
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup environment variables
echo "📋 Backing up environment..."
cp .env.local "$BACKUP_DIR/.env.local.backup" || true

# Backup database
echo "🗄️  Backing up database..."
docker compose exec -T supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  > "$BACKUP_DIR/database.sql"

# Backup auth schema separately for easier debugging
echo "🔑 Backing up auth schema..."
docker compose exec -T supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --schema=auth \
  --no-owner \
  --no-privileges \
  > "$BACKUP_DIR/auth_schema.sql"

# Backup public schema
echo "📊 Backing up public schema..."
docker compose exec -T supabase-db pg_dump \
  -U postgres \
  -d postgres \
  --schema=public \
  --no-owner \
  --no-privileges \
  > "$BACKUP_DIR/public_schema.sql"

# Create restore script
echo "📝 Creating restore script..."
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# Restore script for Supabase backup
# Usage: ./restore.sh

echo "⚠️  This will restore the database backup. Continue? (y/n)"
read -r response
if [[ "$response" != "y" ]]; then
    echo "Cancelled."
    exit 1
fi

# Restore database
echo "Restoring database..."
docker compose exec -T supabase-db psql -U postgres -d postgres < database.sql

echo "✅ Restore complete!"
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# Summary
echo ""
echo "✅ Backup complete!"
echo "📁 Backup location: $BACKUP_DIR"
echo ""
echo "📋 Backup contents:"
ls -la "$BACKUP_DIR"
echo ""
echo "💡 To restore from this backup:"
echo "   cd $BACKUP_DIR && ./restore.sh"