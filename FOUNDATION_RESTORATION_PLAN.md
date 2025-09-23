# 🛡️ COMPLETE FOUNDATION RESTORATION - ULTRA-GRANULAR CHECKLIST

## ⚠️ CRITICAL GUARD RAILS
**NEVER:**
- ❌ Create new files if similar exists
- ❌ Edit without reading first
- ❌ Modify multiple files at once
- ❌ Skip verification steps
- ❌ Create app/netlify.toml (use root only)

---

## PHASE 1: FIX NETLIFY CONFIGURATION

### 1.1 Document Current State
- [ ] Run `pwd` - record output
- [ ] Run `ls -la ../netlify.toml` - record size
- [ ] Run `ls -la ./netlify.toml` - verify doesn't exist
- [ ] Run `ps aux | grep astro` - count processes

### 1.2 Stop All Dev Servers
- [ ] Check bash c9d221 status
- [ ] Kill bash c9d221 if running
- [ ] Check bash eca1f9 status
- [ ] Kill bash eca1f9 if running
- [ ] Check bash fb31aa status
- [ ] Kill bash fb31aa if running
- [ ] Check bash edad33 status
- [ ] Kill bash edad33 if running
- [ ] Run `ps aux | grep astro` - verify none left

### 1.3 Read Root Config
- [ ] Read line 1 of `../netlify.toml`
- [ ] Read line 2 of `../netlify.toml`
- [ ] Read line 3 of `../netlify.toml`
- [ ] Read line 4 of `../netlify.toml`
- [ ] Read line 5 of `../netlify.toml` - find `base = "app"`
- [ ] Record exact text on line 5

### 1.4 Fix Base Directory
- [ ] Open `../netlify.toml` for editing
- [ ] Navigate to line 5
- [ ] Delete entire line containing `base = "app"`
- [ ] Save file
- [ ] Re-read line 5 - verify it's now `command = "npm run build"`

### 1.5 Fix Functions Directory
- [ ] Read line 83 of `../netlify.toml`
- [ ] Verify says `directory = "netlify/functions"`
- [ ] Edit line 83
- [ ] Change to `directory = "app/netlify/functions"`
- [ ] Save file
- [ ] Re-read line 83 - verify change

### 1.6 Fix Publish Directory
- [ ] Read line 19 of `../netlify.toml`
- [ ] Verify says `publish = "dist"`
- [ ] Change to `publish = "app/dist"`
- [ ] Save file
- [ ] Re-read line 19 - verify change

---

## PHASE 2: COMPLETE AUTHENTICATION MIGRATION

### 2.1 Inventory Auth Files
- [ ] List files: `ls src/lib/auth/`
- [ ] Count total auth files
- [ ] Check for `supabase-auth.ts` existence
- [ ] Check for `clerk-helpers.ts` existence
- [ ] Check for `adapter.ts` existence

### 2.2 Check Current Settings
- [ ] Read `.env.local` - find USE_CLERK_AUTH line
- [ ] Record current USE_CLERK_AUTH value
- [ ] Find USE_REAL_CLERK_VALIDATION line
- [ ] Record current USE_REAL_CLERK_VALIDATION value
- [ ] Find PUBLIC_CLERK_PUBLISHABLE_KEY line
- [ ] Check if it has a value (not empty)

### 2.3 Enable Clerk in .env.local
- [ ] Open `.env.local` for editing
- [ ] Find USE_CLERK_AUTH line
- [ ] Change value to `clerk` (remove quotes)
- [ ] Save file
- [ ] Re-read to verify says `USE_CLERK_AUTH=clerk`

### 2.4 Enable Real Validation
- [ ] Open `.env.local` again
- [ ] Find USE_REAL_CLERK_VALIDATION line
- [ ] Change value to `true`
- [ ] Save file
- [ ] Re-read to verify says `USE_REAL_CLERK_VALIDATION=true`

### 2.5 Update Netlify Config Auth
- [ ] Read line 31 of `../netlify.toml`
- [ ] Verify current value of USE_CLERK_AUTH
- [ ] Change to `USE_CLERK_AUTH = "clerk"`
- [ ] Save file
- [ ] Re-read line 31 to verify

### 2.6 Update Netlify Validation
- [ ] Read line 32 of `../netlify.toml`
- [ ] Verify current value of USE_REAL_CLERK_VALIDATION
- [ ] Change to `USE_REAL_CLERK_VALIDATION = "true"`
- [ ] Save file
- [ ] Re-read line 32 to verify

### 2.7 Remove Supabase Auth Code
- [ ] Check if `src/lib/auth/supabase-auth.ts` exists
- [ ] If exists, run `git mv src/lib/auth/supabase-auth.ts deprecated/`
- [ ] Check if `src/pages/api/auth/supabase/` exists
- [ ] If exists, run `git mv src/pages/api/auth/supabase/ deprecated/`
- [ ] Verify files moved, not deleted

---

## PHASE 3: CLEAN ENVIRONMENT VARIABLES

### 3.1 List All Env Files
- [ ] Run `ls -la .env*`
- [ ] Count number of .env files
- [ ] Record each filename
- [ ] Check for .env.production
- [ ] Check for .env.development

### 3.2 Check .env.local for Duplicates
- [ ] Run `grep "^PUBLIC_SUPABASE_URL" .env.local | wc -l`
- [ ] Record count (should be 1)
- [ ] Run `grep "^PUBLIC_SUPABASE_ANON_KEY" .env.local | wc -l`
- [ ] Record count (should be 1)
- [ ] Run `grep "^USE_CLERK_AUTH" .env.local | wc -l`
- [ ] Record count (should be 1)

### 3.3 Remove First Duplicate (if any)
- [ ] If duplicate found, note line numbers
- [ ] Open .env.local
- [ ] Navigate to first occurrence
- [ ] Delete that line only
- [ ] Save file
- [ ] Re-run grep to verify now only 1

### 3.4 Consolidate to .env.example
- [ ] Open .env.example
- [ ] Check each variable has example value
- [ ] Add any missing variables from .env.local
- [ ] Use placeholder values (xxx or example.com)
- [ ] Save .env.example

### 3.5 Remove Extra Env Files
- [ ] Check if .env exists (without .local)
- [ ] If exists, check if it has unique values
- [ ] If no unique values, delete .env
- [ ] Check if .env.development exists
- [ ] If redundant, delete it

---

## PHASE 4: FIX BUILD PIPELINE

### 4.1 Test TypeScript
- [ ] Run `npx tsc --noEmit`
- [ ] Count number of errors
- [ ] Note first error file and line
- [ ] If >10 errors, stop here
- [ ] If <10 errors, continue

### 4.2 Fix First TypeScript Error
- [ ] Read the file with first error
- [ ] Identify the issue
- [ ] Make minimal fix (add type annotation)
- [ ] Save file
- [ ] Run `npx tsc --noEmit` again
- [ ] Verify that error is gone

### 4.3 Test Build Command
- [ ] Run `npm run build`
- [ ] Watch for first error
- [ ] If error, note exact message
- [ ] If success, check exit code is 0
- [ ] Check `dist/` directory created

### 4.4 Verify Build Output
- [ ] Run `ls dist/` 
- [ ] Check for index.html
- [ ] Check for _astro/ directory
- [ ] Count total files
- [ ] Check total size with `du -sh dist/`

### 4.5 Clean Build Artifacts
- [ ] Run `rm -rf dist/`
- [ ] Run `rm -rf .astro/`
- [ ] Verify directories removed
- [ ] Ready for fresh build

---

## PHASE 5: DATABASE ACCESS PATTERNS

### 5.1 Check Supabase Config
- [ ] Read `src/lib/supabase.ts`
- [ ] Find createClient call
- [ ] Verify uses env variables
- [ ] Check for error handling
- [ ] Note if using anon or service key

### 5.2 Test Environment Variables
- [ ] Run `echo $PUBLIC_SUPABASE_URL`
- [ ] Verify not empty
- [ ] Run `echo $PUBLIC_SUPABASE_ANON_KEY`
- [ ] Verify not empty
- [ ] Check format is correct (not "undefined")

### 5.3 Find Database Calls
- [ ] Run `grep -r "supabase.from" src/`
- [ ] Count number of database calls
- [ ] List first 3 files using database
- [ ] Check if using consistent patterns

### 5.4 Check for Direct SQL
- [ ] Run `grep -r "SELECT.*FROM" src/`
- [ ] Should find 0 results (using Supabase client)
- [ ] Run `grep -r "INSERT INTO" src/`
- [ ] Should find 0 results
- [ ] Document any found

### 5.5 Verify RLS Policies
- [ ] Check if migrations/ directory exists
- [ ] Count migration files
- [ ] Check latest migration date
- [ ] Note if RLS mentioned in migrations

---

## PHASE 6: COMPLETE LOGIN PAGE FIX

### 6.1 Check Git Status First
- [ ] Run `git status`
- [ ] Check if `src/pages/auth/sign-in.astro` modified
- [ ] Check if changes are staged
- [ ] Note other modified files

### 6.2 Read Current Login Page
- [ ] Read first 10 lines of `src/pages/auth/sign-in.astro`
- [ ] Check if Header imported
- [ ] Check if Footer imported
- [ ] Check line with `<Layout`
- [ ] Check if `<Header />` exists after Layout

### 6.3 Verify Components Added
- [ ] Search for `<Header />` in file
- [ ] Verify it's on line 13
- [ ] Search for `<Footer />` in file
- [ ] Verify it's on line 40
- [ ] Check indentation is correct

### 6.4 Check Client Directive
- [ ] Find `<SignIn` component line
- [ ] Check if has `client:load` attribute
- [ ] Verify on line 23
- [ ] Check no typos in attribute

### 6.5 Stage Changes
- [ ] Run `git add src/pages/auth/sign-in.astro`
- [ ] Run `git status`
- [ ] Verify file is staged
- [ ] Check no .env files staged

### 6.6 Commit Changes
- [ ] Run `git commit -m "fix: Add Header/Footer to sign-in page"`
- [ ] Check commit succeeded
- [ ] Run `git log -1` to verify
- [ ] Record commit hash

---

## PHASE 7: SECURITY HARDENING

### 7.1 Check for Exposed Secrets
- [ ] Run `grep -r "sk_test" src/`
- [ ] Should return 0 results
- [ ] Run `grep -r "sk_live" src/`
- [ ] Should return 0 results
- [ ] Run `grep -r "service_role" src/`
- [ ] Should return 0 results

### 7.2 Verify Gitignore
- [ ] Read `.gitignore`
- [ ] Check for `.env` entry
- [ ] Check for `.env.local` entry
- [ ] Check for `*.local` entry
- [ ] Check for `dist/` entry

### 7.3 Check Staged Files
- [ ] Run `git diff --staged`
- [ ] Scan for any API keys
- [ ] Scan for any passwords
- [ ] Verify no secrets visible

### 7.4 Add Security Headers
- [ ] Check `../netlify.toml` has [[headers]] section
- [ ] Verify X-Frame-Options present
- [ ] Verify X-Content-Type-Options present
- [ ] Verify X-XSS-Protection present
- [ ] All security headers confirmed

### 7.5 Rate Limiting Check
- [ ] Search for rate limit middleware
- [ ] Run `grep -r "rateLimit" src/`
- [ ] Note if any rate limiting exists
- [ ] Add TODO if missing

---

## PHASE 8: CODE CLEANUP

### 8.1 Run Linter
- [ ] Run `npm run lint`
- [ ] Count total warnings
- [ ] Count total errors
- [ ] Note most common issue
- [ ] Stop if >50 errors

### 8.2 Fix Unused Imports
- [ ] Run `npx eslint --fix src/ --ext .ts,.tsx,.js,.jsx`
- [ ] Check how many files fixed
- [ ] Run `git diff` to see changes
- [ ] Verify only import changes

### 8.3 Remove Console Logs
- [ ] Run `grep -r "console.log" src/`
- [ ] Count occurrences
- [ ] For each: determine if needed
- [ ] Remove only debug logs
- [ ] Keep error logs

### 8.4 Archive Old Files
- [ ] Create `deprecated/` if doesn't exist
- [ ] Find files with .old or .bak extension
- [ ] Move each to deprecated/
- [ ] Find files with TODO-DELETE comments
- [ ] Move to deprecated/

### 8.5 Final Verification
- [ ] Run `npm run build`
- [ ] Verify builds successfully
- [ ] Run `npm run lint`
- [ ] Verify <20 warnings
- [ ] All cleanup complete

---

## PHASE 9: FINAL DEPLOYMENT

### 9.1 Commit All Changes
- [ ] Run `git add ../netlify.toml`
- [ ] Run `git commit -m "fix: Configuration for remote deployment"`
- [ ] Run `git add .env.example`
- [ ] Run `git commit -m "docs: Update environment variables"`

### 9.2 Push to Testing
- [ ] Run `git push origin testing`
- [ ] Watch for push errors
- [ ] Note any rejected commits
- [ ] Verify push succeeded

### 9.3 Monitor Netlify Build
- [ ] Open https://app.netlify.com/sites/spicebush-testing
- [ ] Click on Deploys tab
- [ ] Watch latest build
- [ ] Wait for "Published" status
- [ ] Note build time

### 9.4 Test Deployed Site
- [ ] Visit https://spicebush-testing.netlify.app
- [ ] Check homepage loads
- [ ] Visit /auth/sign-in
- [ ] Verify Header visible
- [ ] Verify Footer visible
- [ ] Click email input field
- [ ] Type test text
- [ ] Verify input works

### 9.5 Document Success
- [ ] Create journal/2025-09-05-foundation-restoration.md
- [ ] List all fixes applied
- [ ] Note any remaining issues
- [ ] Record deployment URL
- [ ] Mark restoration complete

---

## IF ANYTHING BREAKS

### Immediate Actions
- [ ] STOP immediately
- [ ] Run `git status`
- [ ] Run `git diff` 
- [ ] Revert single file: `git checkout -- filename`
- [ ] Document what broke
- [ ] Try alternative approach

### After Each Phase
- [ ] Test dev server still works
- [ ] Test build still works
- [ ] Commit working changes before next phase
- [ ] Tag commit with phase number

---

## COMPLETION METRICS

**Total checkboxes: 200+ individual atomic actions**

Each checkbox represents:
- A single, verifiable action
- Takes less than 30 seconds
- Has clear success criteria
- Can be rolled back independently

## NOTES FOR IMPLEMENTATION

1. **Never skip verification steps** - they prevent cascading failures
2. **One change at a time** - easier to identify what breaks
3. **Read before editing** - prevents assumptions
4. **Commit after each phase** - provides restore points
5. **Document everything** - helps future debugging

## EXPECTED OUTCOMES

After completing all phases:
- ✅ Netlify configuration resolved
- ✅ Authentication fully migrated to Clerk
- ✅ Environment variables consolidated
- ✅ Build pipeline stable
- ✅ Database patterns standardized
- ✅ Login page functional
- ✅ Security hardened
- ✅ Code cleaned up
- ✅ Successfully deployed to testing

## TIME ESTIMATE

- Phase 1: 15 minutes
- Phase 2: 20 minutes
- Phase 3: 10 minutes
- Phase 4: 15 minutes
- Phase 5: 10 minutes
- Phase 6: 10 minutes
- Phase 7: 10 minutes
- Phase 8: 15 minutes
- Phase 9: 10 minutes

**Total: ~2 hours** (with careful verification)

---

*This plan was created on 2025-09-05 to restore the Spicebush Montessori web application to a solid foundation following architectural review findings.*