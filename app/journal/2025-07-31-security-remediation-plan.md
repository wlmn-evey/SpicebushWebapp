# Security Remediation Plan - July 31, 2025

## Executive Summary

This plan addresses critical security vulnerabilities identified in the security validation report. The issues are prioritized by risk level and dependency, with immediate focus on removing hardcoded credentials from source code.

## Current Security Posture

**Risk Level: CRITICAL**

### Critical Issues:
1. **Hardcoded Credentials in Source Code** (2 files)
2. **Pre-commit Hooks Not Functioning** (allows credential commits)
3. **Tracked .env.test File** (should be untracked)
4. **Git History Contains Credentials** (144 instances)
5. **Gitleaks Configuration Broken** (syntax/integration issues)

## Remediation Architecture

### Phase 1: Immediate Credential Removal (Priority: CRITICAL)
Remove all hardcoded credentials from source code to prevent immediate exposure.

### Phase 2: Git Security Hardening (Priority: HIGH)
Fix pre-commit hooks and gitleaks to prevent future credential commits.

### Phase 3: Repository Cleanup (Priority: HIGH)
Clean git history and untrack sensitive files.

### Phase 4: Validation & Documentation (Priority: MEDIUM)
Verify all fixes and document security procedures.

## Detailed Task Breakdown

### Phase 1: Immediate Credential Removal

#### Task 1.1: Remove Hardcoded Supabase URL from Admin Settings
**File**: `/app/src/pages/admin/settings.astro`
**Line**: 567
**Current**: `value="https://ixztvxrnvdahpthcoymx.supabase.co"`
**Solution**: Replace with environment variable reference
```astro
value={import.meta.env.PUBLIC_SUPABASE_URL || ''}
```

#### Task 1.2: Remove Fallback Credential from Middleware
**File**: `/app/src/middleware.ts`
**Line**: 10
**Current**: Contains hardcoded JWT as fallback
**Solution**: Remove fallback, throw error if env var missing
```typescript
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseKey) {
  throw new Error('PUBLIC_SUPABASE_ANON_KEY environment variable is required');
}
```

#### Task 1.3: Audit and Fix Script Files
**Directory**: `/app/scripts/`
**Files**: Multiple files with credential patterns
**Solution**: Replace all hardcoded values with environment references

### Phase 2: Git Security Hardening

#### Task 2.1: Debug Pre-commit Hook Execution
**Steps**:
1. Verify hook permissions: `chmod +x .git/hooks/pre-commit`
2. Add debug logging to hook script
3. Test with intentional credential commit
4. Fix path/execution issues

#### Task 2.2: Simplify Gitleaks Configuration
**File**: `/app/.gitleaks.toml`
**Solution**: Use minimal configuration with default rules
```toml
[extend]
useDefault = true

[[allowlist]]
paths = [
  ".env.example",
  ".env.template",
  "**/*.test.js",
  "**/*.test.ts"
]
```

#### Task 2.3: Integrate Gitleaks with Pre-commit
**Solution**: Update pre-commit hook to properly invoke gitleaks
```bash
#!/bin/bash
if ! command -v gitleaks &> /dev/null; then
    echo "Error: gitleaks not installed"
    exit 1
fi

gitleaks detect --source . --verbose
if [ $? -ne 0 ]; then
    echo "Commit blocked: Potential secrets detected"
    exit 1
fi
```

### Phase 3: Repository Cleanup

#### Task 3.1: Untrack .env.test File
**Commands**:
```bash
git rm --cached .env.test
echo ".env.test" >> .gitignore
git add .gitignore
git commit -m "chore: untrack .env.test file"
```

#### Task 3.2: Clean Git History (Deferred)
**Note**: This requires coordination with team and should be done after all other fixes
**Tool**: BFG Repo-Cleaner or git-filter-repo
**Target**: Remove all 144 instances of credentials from history

### Phase 4: Validation & Documentation

#### Task 4.1: Run Comprehensive Security Audit
**Script**: `/app/scripts/security-audit.js`
**Expected**: All checks should pass

#### Task 4.2: Test Pre-commit Hooks
**Test Cases**:
1. Attempt to commit file with obvious credential
2. Attempt to commit file with subtle credential pattern
3. Verify legitimate commits still work

#### Task 4.3: Update Security Documentation
**File**: Create `/app/docs/SECURITY.md`
**Content**: Document all security procedures and credential management

## Implementation Sequence

### Micro-Task Order (Following User's Workflow):

1. **Remove hardcoded Supabase URL** (Task 1.1)
   - Highest risk, easiest fix
   - No dependencies

2. **Remove middleware fallback credential** (Task 1.2)
   - High risk, simple fix
   - No dependencies

3. **Untrack .env.test file** (Task 3.1)
   - Quick win, prevents further exposure
   - No dependencies

4. **Fix pre-commit hook permissions** (Task 2.1)
   - Enables protection for future commits
   - Required before testing

5. **Simplify gitleaks configuration** (Task 2.2)
   - Removes complexity
   - Required for hook integration

6. **Update pre-commit hook script** (Task 2.3)
   - Completes hook functionality
   - Depends on tasks 4 & 5

7. **Audit script files** (Task 1.3)
   - Lower priority but still critical
   - Can be done incrementally

8. **Run security validation** (Task 4.1)
   - Verifies all fixes
   - Should show all green

## Success Criteria

### Phase 1 Complete When:
- No hardcoded credentials in source code
- All credential references use environment variables
- Security audit shows no credential issues

### Phase 2 Complete When:
- Pre-commit hook blocks credential commits
- Gitleaks runs without errors
- Test commits with credentials are rejected

### Phase 3 Complete When:
- .env.test is untracked
- Git history is clean (deferred)

### Phase 4 Complete When:
- All security checks pass
- Documentation is complete
- Team is trained on procedures

## Risk Mitigation

1. **Before Starting**: Create backup branch
2. **During Changes**: Test each change individually
3. **After Completion**: Rotate all potentially exposed credentials
4. **Long Term**: Implement monitoring for credential usage

## Next Immediate Action

**Start with Task 1.1**: Remove the hardcoded Supabase URL from `/app/src/pages/admin/settings.astro`

This is the most critical and visible credential that needs immediate removal.

---

Created: 2025-07-31 23:25:00
Author: Claude (Project Architect)
Status: READY FOR IMPLEMENTATION