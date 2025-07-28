# Secure Credential Management Guide

## Overview

This guide provides best practices for managing credentials securely in the Spicebush Montessori web application across different environments.

## Password Requirements

### Minimum Standards
- **Length**: At least 32 characters for system accounts
- **Complexity**: Mix of uppercase, lowercase, numbers, and symbols
- **Uniqueness**: Never reuse passwords across environments
- **Generation**: Use cryptographically secure methods

### Password Generation

```bash
# Generate secure password (32 characters)
openssl rand -base64 32

# Generate secure password (64 characters for extra security)
openssl rand -base64 48

# Alternative using /dev/urandom
LC_ALL=C tr -dc 'A-Za-z0-9!@#$%^&*()' < /dev/urandom | head -c 32; echo
```

## Environment-Specific Credentials

### Development (Local)
- Store in `.env.local` (gitignored)
- Use development-specific passwords
- Can use simpler passwords for ease of development
- Never use production credentials

### Staging
- Store in deployment platform's environment settings
- Use production-like security standards
- Different credentials than production
- Test credential rotation procedures here

### Production
- Use platform-specific secret management
- Implement principle of least privilege
- Regular rotation schedule (90 days recommended)
- Monitor for unauthorized access

## Platform-Specific Storage

### Google Cloud Run

1. **Google Secret Manager** (Recommended)
```bash
# Create a secret
gcloud secrets create db-readonly-password --data-file=-

# Grant access to Cloud Run service
gcloud secrets add-iam-policy-binding db-readonly-password \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

# Reference in Cloud Run
gcloud run deploy spicebush-app \
  --set-secrets="DB_READONLY_PASSWORD=db-readonly-password:latest"
```

2. **Environment Variables** (Alternative)
```bash
gcloud run deploy spicebush-app \
  --set-env-vars="DB_READONLY_USER=spicebush_readonly" \
  --set-env-vars="DB_READONLY_HOST=/cloudsql/PROJECT:REGION:INSTANCE"
```

### Netlify

1. **Environment Variables**
   - Set in Netlify Dashboard > Site Settings > Environment Variables
   - Use different values for production vs. preview deployments
   - Enable "Sensitive variable" option for passwords

2. **Netlify CLI**
```bash
# Set environment variable
netlify env:set DB_READONLY_PASSWORD "your-secure-password" --context production
```

### Vercel

1. **Project Settings**
   - Navigate to Project Settings > Environment Variables
   - Add variables with appropriate environment scope
   - Mark sensitive values as "Sensitive"

2. **Vercel CLI**
```bash
vercel env add DB_READONLY_PASSWORD production
```

## Database Credentials

### Read-Only User Setup
```sql
-- Create read-only user
CREATE USER spicebush_readonly WITH PASSWORD 'secure-generated-password';

-- Grant connect permission
GRANT CONNECT ON DATABASE postgres TO spicebush_readonly;

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO spicebush_readonly;

-- Grant select on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO spicebush_readonly;

-- Grant select on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO spicebush_readonly;
```

### Connection String Format
```
postgresql://username:password@host:port/database?sslmode=require
```

## Credential Rotation

### Rotation Schedule
- **High-risk credentials**: 30 days
- **Database passwords**: 90 days
- **API keys**: 180 days
- **JWT secrets**: 1 year

### Rotation Process
1. Generate new credential
2. Update in secret management system
3. Deploy application with new credential
4. Verify application functionality
5. Disable old credential
6. Document rotation in changelog

## Security Best Practices

### DO:
- ✅ Use unique passwords for each environment
- ✅ Store credentials in platform secret managers
- ✅ Use read-only database users for frontend
- ✅ Implement least-privilege access
- ✅ Monitor access logs
- ✅ Use SSL/TLS for all connections
- ✅ Rotate credentials regularly
- ✅ Use environment variables, not hardcoded values

### DON'T:
- ❌ Commit credentials to version control
- ❌ Share credentials via email or chat
- ❌ Use production credentials in development
- ❌ Store credentials in application code
- ❌ Use default or weak passwords
- ❌ Grant unnecessary permissions
- ❌ Log credentials in application logs

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Verify user has correct permissions
   - Check connection string format
   - Ensure SSL mode matches database configuration

2. **"Environment variable not found"**
   - Verify variable name matches exactly
   - Check deployment platform configuration
   - Ensure build process includes environment variables

3. **"Invalid credentials"**
   - Verify password doesn't contain special characters that need escaping
   - Check for trailing whitespace
   - Ensure credentials match environment

### Debug Commands

```bash
# Test database connection
psql "postgresql://user:pass@host:port/db?sslmode=require" -c "SELECT 1"

# Verify environment variables (never in production!)
env | grep DB_READONLY

# Check user permissions
psql -U admin_user -c "\du spicebush_readonly"
```

## Emergency Procedures

### Credential Compromise
1. **Immediate**: Disable compromised credential
2. **Generate**: Create new secure credential
3. **Update**: Deploy with new credential
4. **Audit**: Review access logs for unauthorized use
5. **Notify**: Inform security team and stakeholders
6. **Document**: Record incident and response

### Lost Credentials
1. **Verify**: Check secret management system
2. **Recover**: Use backup authentication method
3. **Reset**: Generate new credentials if unrecoverable
4. **Update**: Deploy and test new credentials
5. **Document**: Update credential documentation

---

Last Updated: 2025-07-28
Version: 1.0