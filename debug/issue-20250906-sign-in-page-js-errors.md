# Debug Session: Sign-in Page JavaScript Errors
Date: 2025-09-06
Status: Active

## Problem Statement
Multiple JavaScript errors on sign-in page (/auth/sign-in.astro) preventing proper authentication:

1. ReferenceError in supabase-vendor.BaToBm_o.js - "Cannot access uninitialized variable"
2. Clerk SDK error - "r is not a function" when initializing  
3. MIME type error - "'text/html' is not a valid JavaScript MIME type"

## Context
- Project has migrated from Supabase to Clerk for authentication
- Both systems still present in codebase
- One fix already applied: Changed Clerk SignIn from `client:only="react"` to `client:load`

## Symptoms
- Sign-in page failing to load properly
- Supabase vendor bundle loading despite using Clerk
- Clerk component initialization failures
- JavaScript MIME type errors

## Hypotheses
1. **Supabase auto-initialization**: Supabase client is being initialized globally even on Clerk-only pages
2. **Hydration mismatch**: Client-side hydration conflicts between Supabase and Clerk
3. **Bundle loading order**: Dependencies loading in wrong order causing reference errors
4. **Server/client mismatch**: MIME type suggests server-side rendering issues

## Investigation Log

### Test 1: Analyze sign-in page structure
Result: Sign-in page uses Clerk SignIn component with client:load directive
Conclusion: Page structure looks correct, using proper Clerk setup

### Test 2: Examine Supabase initialization
Result: Found supabase.ts creates client immediately on import with no lazy loading
Conclusion: **ROOT CAUSE IDENTIFIED** - Supabase client initializes on every page load even when not needed

### Test 3: Find Supabase import scope  
Result: Many API routes and test files import Supabase, but no global Layout imports found
Conclusion: Supabase should not be loading on sign-in page unless explicitly imported

### Test 4: Check AdminPreviewBar and content-db
Result: AdminPreviewBar uses content-db which uses direct PostgreSQL, not Supabase
Conclusion: AdminPreviewBar is not the culprit for Supabase loading

### Test 5: Check components on sign-in page
Result: Header and Footer don't directly import Supabase, use content-db
Conclusion: Sign-in page components are clean

### Test 6: Analyze Vite build configuration
Result: Found manual chunk for "supabase-vendor" in astro.config.mjs
Conclusion: Bundler is creating separate Supabase chunk that's loading incorrectly

## Root Cause
**Supabase client initialization is eager, not lazy** - The supabase.ts module creates the client immediately on import, causing initialization errors even when the client isn't needed (like on Clerk sign-in pages). The Vite bundler creates a separate "supabase-vendor" chunk that gets loaded inappropriately.