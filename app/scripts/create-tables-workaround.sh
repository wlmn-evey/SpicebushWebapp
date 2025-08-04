#!/bin/bash
# Alternative approach: Use PostgreSQL directly

echo "🚀 Creating tables in hosted Supabase..."

# Database connection string components
HOST="xnzweuepchbfffsegkml.supabase.co"
PORT="5432"
DB="postgres"
USER="postgres"
PASS="${SUPABASE_DB_PASSWORD}"

if [ -z "$PASS" ]; then
  echo "❌ Missing SUPABASE_DB_PASSWORD environment variable"
  echo "   Please set the database password you created when setting up Supabase"
  exit 1
fi

# Create the SQL command
SQL=$(cat <<'EOF'
-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    key text PRIMARY KEY,
    value text,
    updated_at timestamp with time zone DEFAULT now()
);

-- Create admin tables
CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_token text UNIQUE NOT NULL,
    user_id uuid,
    user_email text,
    created_at timestamp with time zone DEFAULT now(),
    last_activity timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    ip_address text,
    user_agent text,
    is_active boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id uuid,
    user_email text,
    action text,
    resource_type text,
    resource_id text,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now()
);

-- Grant permissions
GRANT ALL ON public.settings TO anon, authenticated;
GRANT ALL ON public.admin_sessions TO anon, authenticated;
GRANT ALL ON public.admin_audit_log TO anon, authenticated;

-- Import settings data
INSERT INTO public.settings (key, value, updated_at) VALUES
('site_message', '', '2025-07-30T14:49:05.065064+00'),
('coming_soon_mode', 'false', '2025-07-30T18:18:07.564229+00'),
('coming_soon_message', 'We''re preparing something special for you. Our new website will launch soon with exciting features and resources for families interested in Montessori education.', '2025-07-30T18:18:07.569524+00'),
('coming_soon_newsletter', 'true', '2025-07-30T18:18:07.571021+00'),
('coming_soon_launch_date', 'Fall 2025', '2025-07-30T18:18:07.566875+00'),
('school_phone', '(484) 202-0712', '2025-07-30T19:12:52.244166+00'),
('school_email', 'information@spicebushmontessori.org', '2025-07-30T19:12:52.250003+00'),
('school_address_street', '827 Concord Road', '2025-07-30T19:12:52.252366+00'),
('school_address_city', 'Glen Mills', '2025-07-30T19:12:52.256+00'),
('school_address_state', 'PA', '2025-07-30T19:12:52.257604+00'),
('school_address_zip', '19342', '2025-07-30T19:12:52.259086+00'),
('school_facebook', 'https://www.facebook.com/spicebushmontessori', '2025-07-30T19:12:52.260547+00'),
('school_instagram', 'https://www.instagram.com/spicebushmontessori/', '2025-07-30T19:12:52.262017+00'),
('newsletter_enabled', 'true', '2025-07-30T14:49:05.076621+00'),
('analytics_enabled', 'false', '2025-07-30T14:49:05.078152+00'),
('hours_display_format', 'detailed', '2025-07-30T15:19:17.811614+00'),
('tour_scheduling_enabled', 'true', '2025-07-30T14:49:05.075098+00')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value, 
    updated_at = EXCLUDED.updated_at;
EOF
)

# Execute using psql
echo "$SQL" | PGPASSWORD="$PASS" psql -h "$HOST" -p "$PORT" -U "$USER" -d "$DB"

if [ $? -eq 0 ]; then
  echo "✅ Tables created and data imported successfully!"
else
  echo "❌ Failed to create tables"
fi