# Debug Session: Netlify npm install failure
Date: 2025-08-05
Status: Active
Deployment ID: 68924bca733d9400086f2c86

## Problem Statement
npm install is failing on Netlify deployment with error "dependency_installation script returned non-zero exit code: 1"

## Symptoms
- Netlify deployment fails during dependency installation phase
- Error code 1 from npm install process
- Site ID: 27a429f4-9a58-4421-bc1f-126d70d81aa1
- Deploy ID: 68924bca733d9400086f2c86

## Hypotheses
1. Incompatible dependencies with Node.js version 20
2. Missing or corrupted package-lock.json
3. Private package or authentication issues
4. Memory/resource constraints on Netlify build environment
5. Conflicting peer dependencies
6. Platform-specific dependencies (darwin vs linux)

## Investigation Log

### Test 1: Get Netlify deployment details
Result: Deployment failing during "Install dependencies" stage with npm install exit code 1
- Deployment ID: 68924bca733d9400086f2c86
- Site: spicebush-testing (testing branch)
- Error: "dependency_installation script returned non-zero exit code: 1"

### Test 2: Check for conflicting Sharp versions
Result: Multiple sharp versions detected
- astro@5.12.7 uses sharp@0.33.5
- sharp@0.34.3 directly installed
- netlify-cli@23.1.1 uses sharp@0.34.3 via ipx@3.1.1
Conclusion: Version conflicts likely causing npm install failures

### Test 3: Security audit check
Result: 12 vulnerabilities found (6 moderate, 6 high)
- High severity: trim package vulnerability in decap-cms-widget-markdown chain
- Moderate: esbuild vulnerabilities in vitest chain
Conclusion: Vulnerabilities may cause install failures, but secondary to Sharp conflicts

### Test 4: Configuration analysis
Result: Recent commit f1156e10 modified netlify.toml configuration
- Removed base directory from app/netlify.toml
- Root netlify.toml correctly specifies base = "app"
- Configuration appears correct
Conclusion: Configuration is not the issue

### Test 5: Local npm install reproduction
Result: **ROOT CAUSE IDENTIFIED** - Peer dependency conflict
```
npm error ERESOLVE unable to resolve dependency tree
Could not resolve dependency:
peer react@"^18.0.0" from @testing-library/react@14.3.1
```
Error: React 19.1.1 installed but @testing-library/react@14.3.1 requires React ^18.0.0
Conclusion: This is the exact cause of the Netlify npm install failure

## Root Cause
React 19.1.1 is installed but @testing-library/react@14.2.1 only supports React ^18.0.0, causing npm install to fail with ERESOLVE error during dependency resolution.

## Solution
### Step 1: Update @testing-library/react to version that supports React 19
Agent: code-maintenance-specialist
Instructions: Update package.json to use @testing-library/react@^16.3.0 which supports React ^18.0.0 || ^19.0.0

### Step 2: Clean install verification
Agent: debugging-specialist  
Instructions: Verify the fix by running `npm ci` to ensure clean install works

### Step 3: Deploy to Netlify
Agent: deployment-specialist
Instructions: Commit the package.json changes and trigger new Netlify deployment

## Verification
- [x] npm install completes without ERESOLVE errors
- [x] Local build succeeds (npm run build completed in 17.54s)
- [ ] Netlify deployment succeeds through dependency installation stage
- [ ] Testing site builds and deploys successfully

## Fix Applied
Updated `/app/package.json`:
```json
"@testing-library/react": "^16.3.0"  // was "^14.2.1"
```

### Test Results
1. **npm install**: ✅ SUCCESS - No ERESOLVE errors, warnings about Decap CMS but they're non-blocking
2. **npm run build**: ✅ SUCCESS - Build completed in 17.54s with no errors
3. **Ready for deployment**: ✅ Changes committed and ready for Netlify