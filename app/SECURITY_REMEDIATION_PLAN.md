# Security Remediation Plan

## Critical Issues Found

### 1. Hardcoded Credentials in Current Files

#### Test Files with Demo/Test Credentials
- `tests/auth/integration.test.ts` - Contains demo Supabase anon key
- `tests/quick-auth-check.js` - Contains demo Supabase anon key
- `e2e/magic-link-comprehensive.spec.ts` - Contains demo Supabase anon key
- `tests/readonly-user-production-test.js` - Contains hardcoded password

**Action**: These appear to be test/demo credentials but should still use environment variables

#### Scripts with Hardcoded URLs
- `scripts/setup-hosted-supabase.js` - Contains specific Supabase URL
- `scripts/import-via-sql-editor.js` - Contains project-specific URL

**Action**: Update to use environment variables exclusively

### 2. Git History Contains Sensitive Data
- 144 potential sensitive data occurrences found in git history
- Need to clean history to remove any committed credentials

## Remediation Steps

### Phase 1: Clean Current Files (Immediate)

1. **Update Test Files**
   ```bash
   # Replace hardcoded demo keys with environment variables
   # Update all test files to use process.env
   ```

2. **Update Migration Scripts**
   ```bash
   # Remove hardcoded URLs from scripts
   # Ensure all scripts use environment variables
   ```

3. **Create Pre-commit Hook**
   ```bash
   # Install pre-commit hooks to prevent future credential commits
   npm install --save-dev husky
   npm install --save-dev git-secrets
   ```

### Phase 2: Clean Git History (Careful Planning Required)

1. **Backup Current Repository**
   ```bash
   # Create full backup before history rewrite
   git clone --mirror . ../SpicebushWebapp-backup
   ```

2. **Use BFG Repo-Cleaner**
   ```bash
   # Download BFG Repo-Cleaner
   # Create patterns file for sensitive data
   # Run BFG to clean history
   ```

3. **Force Push Clean History**
   ```bash
   # Coordinate with team
   # Force push cleaned history
   # Have team re-clone repository
   ```

### Phase 3: Implement Security Best Practices

1. **Environment Management**
   - Use `.env.local` for local development
   - Use CI/CD environment variables for deployment
   - Document all required variables in `.env.example`

2. **Secrets Management**
   - Consider using Google Secret Manager for production
   - Implement credential rotation schedule
   - Use least-privilege database users

3. **Monitoring**
   - Set up alerts for credential exposure
   - Regular security audits
   - Monitor for unauthorized access

## Files to Update Immediately

1. `/tests/readonly-user-production-test.js` - Remove hardcoded password
2. `/scripts/setup-hosted-supabase.js` - Remove hardcoded URL
3. `/scripts/import-via-sql-editor.js` - Remove hardcoded project ID
4. All test files with demo credentials - Use environment variables

## Pre-commit Hook Configuration

Create `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run security audit
npm run security:audit

# Check for common credential patterns
git diff --staged --name-only | xargs grep -E "(password|secret|key|token).*=" | grep -v ".env.example" && {
  echo "❌ Potential credential found in staged files!"
  exit 1
}
```

## Timeline

- **Today**: Clean current files, remove hardcoded values
- **This Week**: Implement pre-commit hooks, update documentation
- **Next Week**: Plan and execute git history cleaning (coordinate with team)

## Success Criteria

1. No hardcoded credentials in any source files
2. All sensitive configuration via environment variables
3. Clean git history with no exposed credentials
4. Pre-commit hooks preventing future issues
5. Clear documentation for all developers