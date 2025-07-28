# Family Portal Removal Analysis

Date: 2025-07-18

## Overview
Analysis of family portal and dashboard features that need to be removed to make the app admin-only.

## Files That Need Modification or Removal

### 1. Pages to Remove
- `/app/src/pages/dashboard.astro` - The entire family dashboard page

### 2. Authentication Files to Modify
- `/app/src/pages/auth/login.astro` - Currently references "family portal" in meta description
- `/app/src/pages/auth/register.astro` - Currently references "family account" in meta description
- `/app/src/components/AuthForm.astro` - Contains logic that redirects to `/dashboard` for non-admin users (lines 305-306, 321)
- `/app/src/components/AuthNav.astro` - Contains a link to `/dashboard` (line 43)

### 3. Admin Files with Family References
- `/app/src/pages/admin/users.astro` - Contains references to "family accounts", "family profiles", etc. This entire page seems focused on managing family users

### 4. Documentation Files (No action needed unless explicitly requested)
- Various markdown files contain references to family portal but these are documentation

## Key Changes Required

### 1. Remove Dashboard Page
- Delete `/app/src/pages/dashboard.astro`

### 2. Update Authentication Flow
- In `AuthForm.astro`:
  - Remove the redirect to `/dashboard` for non-admin users (lines 305-306)
  - Update line 321 to not redirect to `/dashboard` after password update
  - Consider what to do with non-admin users (perhaps show an error or redirect to home)

### 3. Update Navigation
- In `AuthNav.astro`:
  - Remove the "Dashboard" link (lines 42-49)
  - Keep only the "Sign Out" option for authenticated users

### 4. Update Auth Pages
- Update meta descriptions in login/register pages to remove family-specific language

### 5. Admin User Management
- The `/app/src/pages/admin/users.astro` page needs significant rework as it's currently focused on managing family accounts

## Authentication Logic Notes
- The app currently distinguishes between admin and family users
- Admin users are redirected to `/admin`
- Family users are redirected to `/dashboard`
- With dashboard removal, non-admin users should either:
  1. Be prevented from logging in
  2. Be shown an error message
  3. Be redirected to a different page (like home)

## Next Steps
1. Delete the dashboard page
2. Update authentication redirects
3. Remove dashboard links from navigation
4. Update user management page to focus on admin users only
5. Update meta descriptions to remove family-specific language