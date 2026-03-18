-- Migration 014: Retention cleanup for expired auth tokens, sessions, and old analytics
-- Removes auth rows expired for more than 30 days and analytics events older than 12 months.

DELETE FROM admin_login_tokens
WHERE expires_at < NOW() - INTERVAL '30 days';

DELETE FROM admin_auth_sessions
WHERE expires_at < NOW() - INTERVAL '30 days';

DELETE FROM analytics_events
WHERE created_at < NOW() - INTERVAL '12 months';
