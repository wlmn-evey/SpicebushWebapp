-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin sessions table for secure session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_token VARCHAR(64) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Create indexes for fast session lookups
CREATE INDEX idx_sessions_token ON admin_sessions(session_token) WHERE is_active = true;
CREATE INDEX idx_sessions_expires ON admin_sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_sessions_user ON admin_sessions(user_id) WHERE is_active = true;

-- Create admin audit log table
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES admin_sessions(id) ON DELETE SET NULL,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(100),
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for audit queries
CREATE INDEX idx_audit_user ON admin_audit_log(user_email, created_at DESC);
CREATE INDEX idx_audit_action ON admin_audit_log(action, created_at DESC);
CREATE INDEX idx_audit_resource ON admin_audit_log(resource_type, resource_id, created_at DESC);

-- Enable RLS
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_sessions
-- Only the session owner can read their own sessions
CREATE POLICY "Users can read own sessions" ON admin_sessions
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Service role can manage all sessions (for cleanup, validation, etc.)
CREATE POLICY "Service role can manage sessions" ON admin_sessions
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- RLS Policies for admin_audit_log  
-- Admins can read audit logs if they have an active session
CREATE POLICY "Admins can read audit logs" ON admin_audit_log
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM admin_sessions 
      WHERE admin_sessions.user_id = auth.uid() 
      AND admin_sessions.is_active = true
      AND admin_sessions.expires_at > now()
    )
  );

-- Service role can manage audit logs
CREATE POLICY "Service role can manage audit logs" ON admin_audit_log
  FOR ALL 
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  UPDATE admin_sessions 
  SET is_active = false 
  WHERE expires_at < now() 
  AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions (skip if role doesn't exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    GRANT SELECT ON admin_sessions TO authenticated;
    GRANT SELECT ON admin_audit_log TO authenticated;
  END IF;
END
$$;

-- Add comment documentation
COMMENT ON TABLE admin_sessions IS 'Secure session management for admin users';
COMMENT ON TABLE admin_audit_log IS 'Audit trail for all admin actions';
COMMENT ON COLUMN admin_sessions.session_token IS 'SHA-256 hashed session token';
COMMENT ON COLUMN admin_sessions.last_activity IS 'Updated every 15 minutes of activity';
COMMENT ON COLUMN admin_audit_log.details IS 'Additional context about the action in JSON format';