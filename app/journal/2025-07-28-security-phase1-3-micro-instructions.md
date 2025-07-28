# Security Phase 1.3: Production Deployment Preparation - Micro Instructions
Date: 2025-07-28
Phase: 1.3
Prerequisites: Phase 1.1 and 1.2 complete

## Overview
This phase prepares the application for production deployment by:
1. Removing test pages that expose sensitive information
2. Documenting secure credential management procedures
3. Creating production deployment checklist
4. Verifying production readiness

## MICRO-INSTRUCTION SET 1: Identify and Document Test Pages

### 1.1 List all test pages in the application
**Action**: Run command to find all test pages
```bash
find /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages -name "*test*.astro" -o -name "*test*.ts" | sort
```
**Success Criteria**: Command completes and lists all test files
**Verification**: Output shows list of test files including:
- test-db.astro
- test-focal-points.astro
- photo-test-simple.astro
- test-auth.astro
- test-supabase.astro
- test-direct-db.astro
- api/storage/test-connection.ts

### 1.2 Create test page inventory document
**Action**: Create a markdown file to document test pages
```bash
touch /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-test-pages-inventory.md
```
**Success Criteria**: File created successfully
**Verification**: Run `ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-test-pages-inventory.md`
**Rollback**: `rm /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-test-pages-inventory.md`

### 1.3 Document each test page's purpose
**Action**: Examine first test page
```bash
head -20 /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/test-db.astro
```
**Success Criteria**: Shows first 20 lines of file
**Verification**: Can see the test page content and purpose

## MICRO-INSTRUCTION SET 2: Remove Test Pages

### 2.1 Create backup directory for test pages
**Action**: Create backup directory
```bash
mkdir -p /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/backups/test-pages-$(date +%Y%m%d-%H%M%S)
```
**Success Criteria**: Directory created
**Verification**: Run `ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/backups/`
**Rollback**: Remove the created directory if needed

### 2.2 Backup test-db.astro
**Action**: Copy file to backup
```bash
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/test-db.astro /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/backups/test-pages-$(date +%Y%m%d-%H%M%S)/
```
**Success Criteria**: File copied without errors
**Verification**: Check backup exists with `ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/backups/test-pages-*/test-db.astro`
**Rollback**: Copy file back from backup if needed

### 2.3 Remove test-db.astro
**Action**: Delete the test page
```bash
rm /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/test-db.astro
```
**Success Criteria**: File removed
**Verification**: Run `ls /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages/test-db.astro` - should show "No such file"
**Rollback**: Restore from backup created in step 2.2

### 2.4 Repeat backup and removal for remaining test pages
**Action**: For each test page, backup then remove:
- test-focal-points.astro
- photo-test-simple.astro
- test-auth.astro
- test-supabase.astro
- test-direct-db.astro
- api/storage/test-connection.ts

## MICRO-INSTRUCTION SET 3: Update .gitignore

### 3.1 Check current .gitignore
**Action**: View current .gitignore file
```bash
cat /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.gitignore | grep -E "(test|backup)"
```
**Success Criteria**: Shows relevant lines or no output
**Verification**: Understand current ignore patterns

### 3.2 Add backup directory to .gitignore
**Action**: Append backup directory pattern
```bash
echo -e "\n# Test page backups\nbackups/" >> /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.gitignore
```
**Success Criteria**: Line added to file
**Verification**: Run `tail -3 /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.gitignore`
**Rollback**: Remove the added lines from .gitignore

## MICRO-INSTRUCTION SET 4: Create Production Environment Template

### 4.1 Copy current .env.local to create production template
**Action**: Create production environment template
```bash
cp /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.local /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template
```
**Success Criteria**: File created
**Verification**: Run `ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template`
**Rollback**: `rm /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template`

### 4.2 Remove sensitive values from template
**Action**: Replace password with placeholder
```bash
sed -i.bak 's/DB_READONLY_PASSWORD=.*/DB_READONLY_PASSWORD=YOUR_PRODUCTION_PASSWORD_HERE/' /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template
```
**Success Criteria**: Password replaced with placeholder
**Verification**: Run `grep DB_READONLY_PASSWORD /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template`
**Rollback**: Restore from .bak file

### 4.3 Update host for production
**Action**: Replace localhost with placeholder
```bash
sed -i.bak 's/DB_READONLY_HOST=localhost/DB_READONLY_HOST=YOUR_PRODUCTION_DB_HOST/' /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template
```
**Success Criteria**: Host updated
**Verification**: Run `grep DB_READONLY_HOST /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template`

## MICRO-INSTRUCTION SET 5: Create Deployment Security Checklist

### 5.1 Create deployment checklist file
**Action**: Create new checklist document
```bash
touch /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURITY_DEPLOYMENT_CHECKLIST.md
```
**Success Criteria**: File created
**Verification**: Run `ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURITY_DEPLOYMENT_CHECKLIST.md`
**Rollback**: Remove file if needed

### 5.2 Write checklist header
**Action**: Add header to checklist
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURITY_DEPLOYMENT_CHECKLIST.md << 'EOF'
# Security Deployment Checklist

## Pre-Deployment Security Checks

### Database Security
- [ ] Verify read-only database user is configured
- [ ] Confirm production database password is unique and strong
- [ ] Ensure database connection uses SSL/TLS
- [ ] Verify database host is not publicly accessible

### Environment Variables
- [ ] All sensitive values removed from source code
- [ ] Production environment variables configured in deployment platform
- [ ] No test/development credentials in production config
- [ ] PUBLIC_ prefixed variables contain no sensitive data

### Test Pages and Debug Features
- [ ] All test pages removed from production build
- [ ] Debug endpoints disabled or removed
- [ ] Development-only features disabled
- [ ] Error messages don't expose system details

### Access Control
- [ ] Admin routes require authentication
- [ ] API endpoints have proper authorization
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled where appropriate

## Deployment Platform Security

### Netlify Specific
- [ ] Environment variables set in Netlify dashboard
- [ ] Deploy previews don't contain production data
- [ ] Custom domain configured with HTTPS
- [ ] Security headers configured in netlify.toml

### Docker Deployment
- [ ] Secrets passed as environment variables, not build args
- [ ] Container runs as non-root user
- [ ] Minimal base image used
- [ ] No sensitive files in Docker image

## Post-Deployment Verification

### Functional Testing
- [ ] Database connections work with read-only user
- [ ] No write operations attempted on read-only connections
- [ ] Admin panel accessible only to authorized users
- [ ] All features work without test pages

### Security Testing
- [ ] No sensitive information in page source
- [ ] No exposed debug information in errors
- [ ] HTTPS enforced on all pages
- [ ] Security headers properly set

## Rollback Plan
- [ ] Previous deployment version documented
- [ ] Rollback procedure tested
- [ ] Database rollback plan if schema changed
- [ ] Communication plan for issues
EOF
```
**Success Criteria**: File created with checklist content
**Verification**: Run `head -20 /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURITY_DEPLOYMENT_CHECKLIST.md`

## MICRO-INSTRUCTION SET 6: Create Secure Credential Management Guide

### 6.1 Create credential management documentation
**Action**: Create credential guide file
```bash
touch /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURE_CREDENTIAL_MANAGEMENT.md
```
**Success Criteria**: File created
**Verification**: Run `ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURE_CREDENTIAL_MANAGEMENT.md`

### 6.2 Write credential management guide
**Action**: Add content to guide
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURE_CREDENTIAL_MANAGEMENT.md << 'EOF'
# Secure Credential Management Guide

## Overview
This guide outlines best practices for managing database and API credentials in production.

## Production Database Credentials

### Read-Only User Setup
The application uses a read-only database user to minimize security risks.

#### Required Environment Variables:
- `DB_READONLY_USER`: The read-only username
- `DB_READONLY_PASSWORD`: Strong password for read-only user
- `DB_READONLY_HOST`: Production database host
- `DB_READONLY_PORT`: Database port (typically 5432)
- `DB_READONLY_DATABASE`: Database name

### Password Requirements
- Minimum 32 characters
- Mix of uppercase, lowercase, numbers, and symbols
- No dictionary words or patterns
- Unique to this application
- Rotated every 90 days

### Credential Storage Options

#### 1. Netlify Environment Variables (Recommended)
1. Go to Netlify Dashboard > Site Settings > Environment Variables
2. Add each variable with production values
3. Variables are encrypted at rest
4. Accessible only during build process

#### 2. Cloud Secret Management
For enhanced security, consider:
- AWS Secrets Manager
- Google Secret Manager
- Azure Key Vault
- HashiCorp Vault

#### 3. CI/CD Integration
Store credentials in CI/CD platform:
- GitHub Secrets
- GitLab CI/CD Variables
- CircleCI Environment Variables

## Credential Rotation Procedure

### Quarterly Rotation Steps:
1. Generate new password meeting requirements
2. Create new read-only user with new password
3. Update deployment platform with new credentials
4. Deploy application with new credentials
5. Verify connectivity
6. Remove old database user

### Emergency Rotation:
If credentials are compromised:
1. Immediately revoke compromised user access
2. Create new credentials
3. Deploy with new credentials
4. Audit database logs for unauthorized access
5. Document incident

## Security Best Practices

### DO:
- Use different credentials for each environment
- Enable database SSL/TLS connections
- Monitor database access logs
- Use IP allowlisting where possible
- Implement principle of least privilege
- Document who has access to credentials

### DON'T:
- Store credentials in source code
- Share credentials via email or chat
- Use the same password across environments
- Grant more permissions than needed
- Log credentials in application logs
- Commit .env files to version control

## Compliance Considerations

### Data Protection:
- Credentials are considered sensitive data
- Must be encrypted in transit and at rest
- Access should be logged and audited
- Regular reviews of who has access

### Audit Trail:
Maintain records of:
- Credential creation dates
- Rotation history
- Access logs
- Authorization changes

## Troubleshooting

### Connection Issues:
1. Verify environment variables are set
2. Check database firewall rules
3. Confirm SSL/TLS requirements
4. Test with psql client
5. Review application logs

### Permission Errors:
1. Verify read-only permissions:
   ```sql
   SELECT * FROM pg_roles WHERE rolname = 'spicebush_readonly';
   ```
2. Check specific table permissions
3. Ensure no write operations attempted

## Contact Information
- Database Administrator: [Contact]
- Security Team: [Contact]
- DevOps Lead: [Contact]
EOF
```
**Success Criteria**: File created with guide content
**Verification**: Run `wc -l /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/SECURE_CREDENTIAL_MANAGEMENT.md` - should show ~100+ lines

## MICRO-INSTRUCTION SET 7: Verify Production Readiness

### 7.1 Check for hardcoded credentials
**Action**: Search for potential hardcoded secrets
```bash
grep -r "password\|secret\|key" /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src --include="*.ts" --include="*.js" --include="*.astro" | grep -v "process.env" | grep -v "import.meta.env"
```
**Success Criteria**: No hardcoded credentials found
**Verification**: Review any results for actual credentials

### 7.2 Verify environment variable usage
**Action**: Find all environment variable references
```bash
grep -r "process.env\|import.meta.env" /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src --include="*.ts" --include="*.js" --include="*.astro" | grep "DB_"
```
**Success Criteria**: Shows proper environment variable usage
**Verification**: All database configs use environment variables

### 7.3 Test build without test pages
**Action**: Run build to ensure no dependencies on test pages
```bash
cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && npm run build
```
**Success Criteria**: Build completes successfully
**Verification**: No errors related to missing test pages

## MICRO-INSTRUCTION SET 8: Create Phase Completion Report

### 8.1 Create completion report
**Action**: Create phase 1.3 completion report
```bash
touch /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-security-phase1-3-complete.md
```
**Success Criteria**: File created
**Verification**: Run `ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-security-phase1-3-complete.md`

### 8.2 Document completion status
**Action**: Add completion summary
```bash
cat > /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-security-phase1-3-complete.md << 'EOF'
# Security Phase 1.3: Production Deployment Preparation Complete

## Summary
Phase 1.3 has been completed successfully. The application is now ready for production deployment with proper security measures in place.

## Tasks Completed
1. ✅ Identified and removed all test pages
2. ✅ Created production environment template
3. ✅ Documented secure credential management
4. ✅ Created deployment security checklist
5. ✅ Verified no hardcoded credentials
6. ✅ Tested build without test pages

## Files Removed
- /src/pages/test-db.astro
- /src/pages/test-focal-points.astro
- /src/pages/photo-test-simple.astro
- /src/pages/test-auth.astro
- /src/pages/test-supabase.astro
- /src/pages/test-direct-db.astro
- /src/pages/api/storage/test-connection.ts

## Documentation Created
- /docs/deployment/SECURITY_DEPLOYMENT_CHECKLIST.md
- /docs/deployment/SECURE_CREDENTIAL_MANAGEMENT.md
- /.env.production.template
- /journal/2025-07-28-test-pages-inventory.md

## Next Steps
1. Deploy to production using deployment checklist
2. Configure production environment variables
3. Verify all security measures are active
4. Monitor for any security issues

## Security Status
- ✅ No hardcoded credentials in source
- ✅ Read-only database access enforced
- ✅ Test pages removed
- ✅ Production deployment guide complete
- ✅ Credential management documented
EOF
```
**Success Criteria**: Report created with summary
**Verification**: Run `cat /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/journal/2025-07-28-security-phase1-3-complete.md`

## Verification Commands Summary
After completing all steps, run these verification commands:

1. Verify no test pages remain:
   ```bash
   find /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/src/pages -name "*test*"
   ```

2. Verify documentation created:
   ```bash
   ls -la /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/docs/deployment/S*.md
   ```

3. Verify environment template:
   ```bash
   cat /Users/eveywinters/CascadeProjects/SpicebushWebapp/app/.env.production.template
   ```

4. Verify build still works:
   ```bash
   cd /Users/eveywinters/CascadeProjects/SpicebushWebapp/app && npm run build
   ```

## Rollback Procedures
If any issues occur:
1. Test pages are backed up in `/app/backups/test-pages-[timestamp]/`
2. .gitignore changes can be reverted
3. Documentation files can be removed
4. Environment templates can be deleted

## Success Criteria for Phase 1.3
- All test pages removed and backed up
- Production deployment documentation complete
- Secure credential management guide available
- No hardcoded credentials in codebase
- Application builds successfully without test pages
- Ready for production deployment