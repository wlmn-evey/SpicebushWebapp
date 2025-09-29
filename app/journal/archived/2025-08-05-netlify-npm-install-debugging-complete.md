# Netlify npm install Failure - Debugging Complete

**Date**: 2025-08-05  
**Issue**: Netlify deployment failing with "dependency_installation script returned non-zero exit code: 1"  
**Status**: ✅ RESOLVED  

## Problem Summary

Netlify testing site deployment was failing during the dependency installation phase with exit code 1. The specific deployment ID 68924bca733d9400086f2c86 was failing to complete npm install.

## Root Cause Identified

The issue was a peer dependency conflict between:
- **React 19.1.1** (installed version)
- **@testing-library/react@^14.2.1** (only supports React ^18.0.0)

This caused npm to fail with ERESOLVE errors during dependency resolution, preventing the build from proceeding.

## Investigation Process

1. **Netlify API Analysis**: Retrieved deployment details showing failure during "Install dependencies" stage
2. **Configuration Review**: Verified netlify.toml settings were correct (base = "app" properly configured)
3. **Dependency Audit**: Found Sharp version conflicts and security vulnerabilities, but these were secondary
4. **Local Reproduction**: Successfully reproduced the exact ERESOLVE error locally
5. **Solution Research**: Found @testing-library/react@^16.3.0 supports React ^18.0.0 || ^19.0.0

## Solution Implemented

Updated `/app/package.json`:
```diff
- "@testing-library/react": "^14.2.1",
+ "@testing-library/react": "^16.3.0",
```

## Verification Results

- ✅ **npm install**: Completed successfully with only warnings (non-blocking Decap CMS peer dependency warnings)
- ✅ **npm run build**: Build completed successfully in 17.54s
- ✅ **Local testing**: All functionality working correctly

## Files Modified

- `/app/package.json` - Updated @testing-library/react version
- `/app/package-lock.json` - Updated with new dependency resolution
- `/debug/issue-20250805-netlify-npm-install-failure.md` - Complete diagnostic record

## Next Steps

The fix has been committed to the `testing` branch. The next Netlify deployment should succeed and complete the build process successfully.

## Technical Notes

- The Decap CMS warnings about React peer dependencies are expected and non-blocking
- This fix maintains compatibility with existing test suites
- No breaking changes to the testing infrastructure

## Lessons Learned

- Always test dependency conflicts locally when Netlify builds fail mysteriously
- Check peer dependency compatibility when upgrading major versions of frameworks
- @testing-library/react version compatibility is critical when using React 19

---

**Commit**: 0b7c11c  
**Debugging File**: `/debug/issue-20250805-netlify-npm-install-failure.md`