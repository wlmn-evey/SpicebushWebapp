# Security Deployment Checklist

## Pre-Deployment Security Checks

### 1. Environment Variables
- [ ] All production environment variables are set
- [ ] No hardcoded credentials in source code
- [ ] `.env.local` is NOT being deployed
- [ ] Production uses different passwords than development
- [ ] Database credentials use read-only user for frontend

### 2. Test Pages Removed
- [ ] All test pages have been removed from production build
- [ ] Verified no test endpoints exist in API routes
- [ ] Test page backups are stored securely outside deployment

### 3. Database Security
- [ ] Production database has different credentials than development
- [ ] Read-only database user created for frontend queries
- [ ] Write operations restricted to admin API endpoints only
- [ ] Database connection uses SSL in production
- [ ] Connection pooling configured appropriately

### 4. Authentication & Authorization
- [ ] Admin emails configured in environment variables
- [ ] JWT secret is unique and secure (64+ characters)
- [ ] Session management properly configured
- [ ] Password reset flows tested and secure

### 5. Build & Dependencies
- [ ] `npm audit` shows no critical vulnerabilities
- [ ] All dependencies are up to date
- [ ] Production build completes without errors
- [ ] Source maps excluded from production build

## Platform-Specific Checks

### Google Cloud Run
- [ ] Environment variables configured in Cloud Run settings
- [ ] Service account has minimal required permissions
- [ ] Cloud SQL proxy configured for database access
- [ ] Secrets stored in Google Secret Manager
- [ ] Container registry permissions properly set

### Netlify
- [ ] Environment variables set in Netlify dashboard
- [ ] Build command uses production configuration
- [ ] Deploy previews don't expose sensitive data
- [ ] Form submissions configured securely

### Vercel
- [ ] Environment variables configured in project settings
- [ ] Production branch protection enabled
- [ ] Serverless functions have proper authentication

## Post-Deployment Verification

### 1. Security Headers
- [ ] Content-Security-Policy header is set
- [ ] X-Frame-Options prevents clickjacking
- [ ] X-Content-Type-Options set to nosniff
- [ ] Referrer-Policy configured appropriately

### 2. SSL/TLS
- [ ] HTTPS enforced on all pages
- [ ] SSL certificate is valid and not expiring soon
- [ ] HTTP Strict Transport Security (HSTS) enabled
- [ ] No mixed content warnings

### 3. Application Security
- [ ] Admin routes require authentication
- [ ] File upload restrictions in place
- [ ] API rate limiting configured
- [ ] Error messages don't expose sensitive information

### 4. Monitoring
- [ ] Error tracking configured (e.g., Sentry)
- [ ] Security alerts set up
- [ ] Uptime monitoring active
- [ ] Database query performance monitored

## Rollback Plan

### If Issues Occur:
1. **Immediate Actions**
   - [ ] Note the exact error messages
   - [ ] Check application logs
   - [ ] Verify environment variables are set correctly

2. **Quick Rollback**
   - [ ] Redeploy previous known-good version
   - [ ] Restore database from backup if needed
   - [ ] Notify team of rollback

3. **Investigation**
   - [ ] Review deployment logs
   - [ ] Check for missing environment variables
   - [ ] Verify database connectivity
   - [ ] Test locally with production-like settings

## Emergency Contacts

- **Database Issues**: [Database admin contact]
- **Infrastructure**: [DevOps contact]
- **Security Incidents**: [Security team contact]
- **Business Continuity**: [Management contact]

## Sign-off

- [ ] Developer reviewed checklist: _________________ Date: _______
- [ ] Security review completed: _________________ Date: _______
- [ ] Deployment approved by: _________________ Date: _______

---

Last Updated: 2025-07-28
Version: 1.0