# Magic Link Authentication Manual Testing Procedures

**Version:** 1.0  
**Date:** 2025-07-27  
**Purpose:** Comprehensive manual testing guide for magic link authentication system  
**Scope:** Complete magic link flow from request to admin dashboard access  

## Table of Contents

1. [Pre-Test Setup](#pre-test-setup)
2. [Core Magic Link Flow Testing](#core-magic-link-flow-testing)
3. [Security Testing](#security-testing)
4. [Error Scenario Testing](#error-scenario-testing)
5. [Mobile Device Testing](#mobile-device-testing)
6. [Cross-Browser Testing](#cross-browser-testing)
7. [Performance Testing](#performance-testing)
8. [Production Verification](#production-verification)
9. [Test Data and Accounts](#test-data-and-accounts)
10. [Troubleshooting Guide](#troubleshooting-guide)

## Pre-Test Setup

### Environment Preparation

1. **Development Environment**
   - Ensure Docker containers are running: `docker-compose up`
   - Verify MailHog is accessible at http://localhost:8025
   - Confirm Supabase is connected and accessible
   - Check that environment variables are properly configured

2. **Test Accounts**
   - Admin email: `evey@eveywinters.com`
   - Test admin: `admin@spicebushmontessori.org`
   - Non-admin: `parent@example.com`
   - Invalid: `invalid-email-format`

3. **Browser Setup**
   - Clear all cookies and local storage
   - Disable browser password manager for accurate testing
   - Enable developer tools for debugging
   - Test in private/incognito mode when specified

4. **Network Conditions**
   - Test on fast connection (WiFi/Ethernet)
   - Test on slow connection (simulated 3G)
   - Test with intermittent connectivity

## Core Magic Link Flow Testing

### Test Case ML-001: Basic Magic Link Request

**Objective:** Verify basic magic link functionality works correctly

**Prerequisites:**
- Clean browser state (no existing sessions)
- MailHog running and accessible
- Development environment active

**Steps:**
1. Navigate to http://localhost:4321/auth/magic-login
2. Verify page loads correctly with:
   - Spicebush logo displayed
   - "Welcome Back" heading
   - "no password needed" subtitle
   - Email input field with placeholder
   - "Send Magic Link" button with sparkle icon
   - "Use password instead" link

3. Enter valid admin email: `evey@eveywinters.com`
4. Click "Send Magic Link" button
5. Observe loading state:
   - Button becomes disabled
   - Loading spinner appears
   - Button text changes

6. Wait for success message:
   - Success message appears
   - Email address is displayed correctly
   - Form is hidden
   - "Didn't receive it? Send again" button visible

7. Check MailHog (http://localhost:8025):
   - Email received within 30 seconds
   - Subject line contains "Confirm your signup"
   - Email contains magic link URL
   - URL format: `/auth/update-password?type=magiclink&token=...`

**Expected Results:**
✅ Page loads without errors  
✅ Form submits successfully  
✅ Loading states display correctly  
✅ Success message shows with correct email  
✅ Magic link email received in MailHog  
✅ Email contains properly formatted magic link  

**Actual Results:** ________________

**Pass/Fail:** ___________

---

### Test Case ML-002: Magic Link Authentication

**Objective:** Verify clicking magic link completes authentication

**Prerequisites:**
- Completed Test Case ML-001
- Magic link email received

**Steps:**
1. Open latest email in MailHog
2. Copy the magic link URL from email content
3. Open new browser tab and paste the magic link URL
4. Observe redirect behavior:
   - Initial page: `/auth/update-password?type=magiclink&token=...`
   - Shows "Processing Magic Link..." with loading animation
   - Automatically redirects to `/auth/callback`

5. On callback page, observe authentication flow:
   - "Signing you in..." message with spinner
   - Transitions to "Success!" message
   - "Redirecting to admin dashboard..." text
   - Automatic redirect to `/admin`

6. Verify admin dashboard access:
   - URL shows `/admin`
   - "Admin Dashboard" heading visible
   - Navigation menu includes admin sections
   - User can access admin features

7. Check browser cookies:
   - `sbms-admin-auth=true` cookie set
   - Cookie path is `/`
   - Cookie has appropriate expiration

**Expected Results:**
✅ Magic link redirects correctly through update-password  
✅ Callback page processes authentication  
✅ Success states display properly  
✅ Redirects to admin dashboard  
✅ Admin interface is accessible  
✅ Admin cookie is set correctly  

**Actual Results:** ________________

**Pass/Fail:** ___________

---

### Test Case ML-003: Session Persistence

**Objective:** Verify authenticated session persists across browser actions

**Prerequisites:**
- Completed successful authentication (ML-002)
- Currently on admin dashboard

**Steps:**
1. **Page Reload Test:**
   - Refresh the admin dashboard page
   - Verify still authenticated and on `/admin`
   - Check that admin navigation is visible

2. **New Tab Test:**
   - Open new tab
   - Navigate to `/admin/settings`
   - Verify immediate access without authentication prompt

3. **Direct URL Test:**
   - Navigate to `/admin/tuition`
   - Verify access granted
   - Navigate to `/admin/teachers`
   - Verify access granted

4. **Coming Soon Bypass Test:**
   - Navigate to home page `/`
   - Verify coming soon mode is bypassed
   - Look for admin preview bar
   - Verify admin navigation is accessible

5. **Session Duration Test:**
   - Wait 5 minutes
   - Try accessing `/admin`
   - Verify session is still active

**Expected Results:**
✅ Session persists through page refreshes  
✅ Session works across browser tabs  
✅ Direct admin URLs are accessible  
✅ Coming soon mode is bypassed for admin  
✅ Session remains active for reasonable duration  

**Actual Results:** ________________

**Pass/Fail:** ___________

---

### Test Case ML-004: Logout Functionality

**Objective:** Verify logout clears session and restricts access

**Prerequisites:**
- Active authenticated session
- On admin dashboard

**Steps:**
1. **Locate Logout:**
   - Find "Sign Out" button in admin interface
   - Verify button is clearly visible

2. **Perform Logout:**
   - Click "Sign Out" button
   - Observe any confirmation dialogs
   - Wait for logout to complete

3. **Verify Logout Redirect:**
   - Check current URL (should not be `/admin`)
   - Verify redirected to appropriate page

4. **Test Access Restriction:**
   - Try to navigate to `/admin`
   - Verify redirected to login page
   - Try to access `/admin/settings`
   - Verify access denied

5. **Verify Cookie Cleanup:**
   - Check browser developer tools
   - Verify `sbms-admin-auth` cookie is cleared or set to false

6. **Test Coming Soon Mode:**
   - Navigate to home page `/`
   - Verify coming soon page is displayed
   - Verify no admin navigation visible

**Expected Results:**
✅ Logout button is accessible  
✅ Logout completes successfully  
✅ Redirected away from admin area  
✅ Admin pages are no longer accessible  
✅ Admin cookie is cleared  
✅ Coming soon mode is active for non-admin  

**Actual Results:** ________________

**Pass/Fail:** ___________

## Security Testing

### Test Case SEC-001: Non-Admin Email Rejection

**Objective:** Verify non-admin users cannot authenticate

**Steps:**
1. Navigate to magic login page
2. Enter non-admin email: `parent@example.com`
3. Submit magic link request
4. Verify email is sent (check MailHog)
5. Click magic link from email
6. Observe authentication flow:
   - Should reach callback page
   - Should show "Access denied" error
   - Should not redirect to admin dashboard

**Expected Results:**
✅ Magic link is sent  
✅ Callback shows access denied error  
✅ No admin access granted  
✅ Clear error message displayed  

---

### Test Case SEC-002: Input Validation

**Objective:** Test form handles malicious inputs safely

**Steps:**
1. Test XSS attempts in email field:
   - `<script>alert('xss')</script>@example.com`
   - `javascript:alert('xss')@example.com`
   - `><img src=x onerror=alert('xss')>@example.com`

2. Test injection attempts:
   - `admin@spicebushmontessori.org<script>location.href='http://evil.com'</script>`
   - `admin@example.com%0D%0ABcc: attacker@evil.com`

3. Verify for each input:
   - No JavaScript execution occurs
   - Form validation rejects invalid formats
   - Page remains functional
   - No sensitive data exposed in URLs

**Expected Results:**
✅ No XSS execution  
✅ Invalid inputs rejected  
✅ Page remains stable  
✅ No data leakage  

---

### Test Case SEC-003: Rate Limiting

**Objective:** Verify rate limiting prevents abuse

**Steps:**
1. Send 6 magic link requests rapidly with same email
2. Observe rate limiting behavior:
   - First 5 requests should succeed
   - 6th request should be rejected or delayed
   - Error message should indicate rate limiting

3. Wait 15 minutes and try again
4. Verify rate limit resets

**Expected Results:**
✅ Rate limiting activates after 5 requests  
✅ Clear rate limit error message  
✅ Rate limit resets after time window  

## Error Scenario Testing

### Test Case ERR-001: Expired Magic Link

**Objective:** Test handling of expired magic links

**Steps:**
1. Request magic link
2. Wait for link expiration (1 hour) OR modify token to be invalid
3. Click expired magic link
4. Verify error handling:
   - Shows "Invalid or expired magic link" error
   - Provides "Request new link" button
   - Button links back to magic login page

**Expected Results:**
✅ Clear error message for expired links  
✅ Recovery option provided  
✅ Recovery link functions correctly  

---

### Test Case ERR-002: Network Failure Handling

**Objective:** Test graceful handling of network issues

**Steps:**
1. Navigate to magic login page
2. Disconnect network/WiFi
3. Try to submit magic link request
4. Verify error handling:
   - Shows network error message
   - Form remains usable
   - No JavaScript errors in console

5. Reconnect network
6. Retry submission
7. Verify recovery works

**Expected Results:**
✅ Network errors handled gracefully  
✅ Clear error messaging  
✅ Form recovery after network restoration  

---

### Test Case ERR-003: Malformed URLs

**Objective:** Test handling of invalid magic link URLs

**Steps:**
1. Try accessing callback with missing parameters:
   - `/auth/callback`
   - `/auth/callback?type=magiclink`
   - `/auth/callback?token=abc123`

2. Try accessing with invalid parameters:
   - `/auth/callback?type=invalid&token=abc123`
   - `/auth/callback?type=magiclink&token=<script>alert('xss')</script>`

3. Verify error handling for each case

**Expected Results:**
✅ Invalid URLs handled safely  
✅ No JavaScript execution  
✅ Appropriate error messages  

## Mobile Device Testing

### Test Case MOB-001: iPhone Testing

**Objective:** Verify mobile functionality on iOS devices

**Test Devices:**
- iPhone 12/13 (iOS 15+)
- iPhone SE (iOS 14+)

**Steps:**
1. **Magic Login Page:**
   - Navigate to magic login page
   - Verify responsive layout
   - Check touch target sizes (min 44px)
   - Test email keyboard appears
   - Verify logo and text are properly sized

2. **Form Interaction:**
   - Tap email input field
   - Enter email using mobile keyboard
   - Tap submit button
   - Verify loading states
   - Check success message visibility

3. **Email App Integration:**
   - Open email app (Mail, Gmail, etc.)
   - Find magic link email
   - Tap magic link
   - Verify opens in same browser session
   - Complete authentication flow

4. **Admin Interface:**
   - Verify admin dashboard is mobile-friendly
   - Test navigation on mobile
   - Check touch targets for admin controls
   - Test logout functionality

**Expected Results:**
✅ Responsive design works properly  
✅ Touch targets are appropriately sized  
✅ Email integration works  
✅ Authentication flow completes  
✅ Admin interface is usable  

---

### Test Case MOB-002: Android Testing

**Objective:** Verify mobile functionality on Android devices

**Test Devices:**
- Samsung Galaxy S21 (Android 11+)
- Google Pixel 5 (Android 12+)

**Steps:**
[Similar to MOB-001 but with Android-specific considerations]

1. Test with Chrome browser
2. Test with Samsung Internet (if available)
3. Verify email app integration (Gmail, Outlook)
4. Test autofill functionality
5. Verify back button behavior

**Expected Results:**
✅ Works across Android browsers  
✅ Email integration functions  
✅ Autofill works correctly  
✅ Navigation behaves properly  

---

### Test Case MOB-003: Tablet Testing

**Objective:** Verify functionality on tablet devices

**Test Devices:**
- iPad (iOS)
- Android tablet

**Steps:**
1. Test in portrait orientation
2. Test in landscape orientation
3. Verify layout adapts properly
4. Test touch interactions
5. Verify keyboard handling

**Expected Results:**
✅ Layout adapts to tablet screen sizes  
✅ Both orientations work properly  
✅ Touch interactions are responsive  

## Cross-Browser Testing

### Test Case BROWSER-001: Chrome Testing

**Objective:** Verify compatibility with Google Chrome

**Test Versions:**
- Chrome 120+ (current)
- Chrome 115+ (previous major version)

**Steps:**
1. Complete full magic link flow
2. Test with Chrome extensions enabled/disabled
3. Test in incognito mode
4. Verify developer tools show no errors
5. Test autofill functionality
6. Verify cookie handling

**Expected Results:**
✅ Full functionality in Chrome  
✅ No console errors  
✅ Incognito mode works  
✅ Extensions don't interfere  

---

### Test Case BROWSER-002: Safari Testing

**Objective:** Verify compatibility with Safari

**Test Versions:**
- Safari 16+ (macOS)
- Safari 15+ (iOS)

**Steps:**
1. Test desktop Safari on macOS
2. Test mobile Safari on iOS
3. Verify Intelligent Tracking Prevention compatibility
4. Test private browsing mode
5. Check for webkit-specific issues

**Expected Results:**
✅ Safari desktop compatibility  
✅ Safari mobile compatibility  
✅ Private browsing works  
✅ No webkit-specific issues  

---

### Test Case BROWSER-003: Firefox Testing

**Objective:** Verify compatibility with Mozilla Firefox

**Test Versions:**
- Firefox 120+ (current)
- Firefox ESR (current)

**Steps:**
1. Complete full magic link flow
2. Test with Enhanced Tracking Protection
3. Test in private window
4. Verify cookie handling
5. Check for Firefox-specific issues

**Expected Results:**
✅ Full Firefox compatibility  
✅ Enhanced Tracking Protection works  
✅ Private browsing functions  
✅ No Firefox-specific issues  

---

### Test Case BROWSER-004: Edge Testing

**Objective:** Verify compatibility with Microsoft Edge

**Test Versions:**
- Edge 120+ (Chromium-based)

**Steps:**
1. Test standard Edge functionality
2. Test with Microsoft security features
3. Verify InPrivate browsing
4. Test autofill integration

**Expected Results:**
✅ Full Edge compatibility  
✅ Security features don't interfere  
✅ InPrivate mode works  
✅ Autofill functions properly  

## Performance Testing

### Test Case PERF-001: Page Load Performance

**Objective:** Verify acceptable page load times

**Steps:**
1. **Magic Login Page Load:**
   - Clear browser cache
   - Navigate to `/auth/magic-login`
   - Measure time to interactive
   - Target: < 3 seconds on fast connection

2. **Callback Page Performance:**
   - Click magic link
   - Measure authentication processing time
   - Target: < 10 seconds end-to-end

3. **Admin Dashboard Load:**
   - Measure redirect and load time
   - Target: < 5 seconds to usable admin interface

**Measurement Tools:**
- Browser developer tools (Network, Performance tabs)
- Lighthouse audit
- WebPageTest (if available)

**Expected Results:**
✅ Magic login loads in < 3 seconds  
✅ Authentication completes in < 10 seconds  
✅ Admin dashboard loads in < 5 seconds  
✅ Lighthouse score > 80  

---

### Test Case PERF-002: Slow Network Performance

**Objective:** Verify functionality under slow network conditions

**Steps:**
1. Enable network throttling (Chrome DevTools)
2. Set to "Slow 3G" (100 KB/s)
3. Complete magic link flow
4. Measure performance degradation
5. Verify functionality remains intact

**Expected Results:**
✅ Page loads within 10 seconds on slow 3G  
✅ Form submission works despite slow network  
✅ Loading states provide good feedback  
✅ No timeouts or failures  

## Production Verification

### Test Case PROD-001: Production Environment Test

**Objective:** Verify magic link works in production environment

**Prerequisites:**
- Access to production or staging environment
- Valid production admin email address
- Production email delivery configured

**Steps:**
1. **Environment Check:**
   - Verify production URL is accessible
   - Check HTTPS is enforced
   - Verify proper SSL certificate

2. **Magic Link Flow:**
   - Navigate to production magic login
   - Enter production admin email
   - Submit magic link request
   - Check actual email delivery (not MailHog)
   - Click production magic link
   - Complete authentication

3. **Security Verification:**
   - Verify secure cookie settings
   - Check HTTPS enforcement
   - Verify CSP headers
   - Test rate limiting

4. **Performance Check:**
   - Measure production load times
   - Verify CDN functionality (if applicable)
   - Test from different geographic locations

**Expected Results:**
✅ Production environment accessible  
✅ HTTPS properly configured  
✅ Email delivery works  
✅ Authentication flow completes  
✅ Security headers present  
✅ Performance acceptable  

---

### Test Case PROD-002: Coming Soon Mode Integration

**Objective:** Verify coming soon mode works with magic link auth

**Steps:**
1. **Enable Coming Soon Mode:**
   - Access admin settings
   - Enable coming soon mode
   - Verify setting is saved

2. **Test Public Access:**
   - Log out of admin
   - Navigate to home page
   - Verify coming soon page displays
   - Test that non-auth pages redirect

3. **Test Admin Bypass:**
   - Complete magic link authentication
   - Navigate to home page
   - Verify admin sees actual site
   - Check for admin preview bar

4. **Test Admin Access:**
   - Verify admin pages remain accessible
   - Test admin functionality
   - Verify settings can disable coming soon mode

**Expected Results:**
✅ Coming soon mode activates properly  
✅ Public users see coming soon page  
✅ Admin users bypass coming soon mode  
✅ Admin preview bar visible  
✅ Admin functionality remains accessible  

## Test Data and Accounts

### Admin Test Accounts

| Email | Purpose | Environment |
|-------|---------|-------------|
| `evey@eveywinters.com` | Primary admin | All |
| `admin@spicebushmontessori.org` | School admin | All |
| `director@spicebushmontessori.org` | Director account | All |
| `admin@spicebushmontessori.test` | Dev testing | Development only |

### Non-Admin Test Accounts

| Email | Purpose |
|-------|----------|
| `parent@example.com` | Non-admin user |
| `teacher@otherschool.org` | Different domain |
| `student@university.edu` | Non-school email |

### Invalid Test Inputs

| Input | Purpose |
|-------|----------|
| `not-an-email` | Invalid format |
| `<script>alert('xss')</script>@example.com` | XSS attempt |
| `admin@fake-spicebushmontessori.org` | Subdomain attack |
| `` (empty) | Empty input |
| `admin@spicebushmontessori.org<script>` | Injection attempt |

## Troubleshooting Guide

### Common Issues and Solutions

#### Magic Link Email Not Received

**Symptoms:**
- Form submits successfully
- Success message appears
- No email in MailHog (development) or inbox (production)

**Troubleshooting Steps:**
1. Check MailHog is running: `docker-compose ps`
2. Verify Supabase email configuration
3. Check Supabase dashboard for email logs
4. Verify environment variables are set
5. Check email doesn't exist in spam folder (production)

#### Authentication Callback Fails

**Symptoms:**
- Magic link clicked
- Redirected to callback page
- Shows "Invalid or expired magic link" error

**Troubleshooting Steps:**
1. Check URL parameters are present
2. Verify token format in email
3. Check Supabase session configuration
4. Verify admin email is in allowed list
5. Check browser console for JavaScript errors

#### Admin Access Denied

**Symptoms:**
- Magic link authentication succeeds
- User authenticated but gets "Access denied"
- Cannot reach admin dashboard

**Troubleshooting Steps:**
1. Verify email is in admin configuration
2. Check `isAdminEmail()` function logic
3. Verify admin cookie is set
4. Check middleware configuration
5. Verify case-sensitivity of email

#### Session Not Persisting

**Symptoms:**
- Authentication succeeds initially
- Page refresh loses authentication
- Admin access lost after navigation

**Troubleshooting Steps:**
1. Check cookie settings and expiration
2. Verify Supabase session configuration
3. Check for JavaScript errors clearing storage
4. Verify cookie domain and path settings
5. Test in different browsers

#### Mobile Issues

**Symptoms:**
- Magic link doesn't work on mobile
- Email app doesn't redirect properly
- Touch interactions not responsive

**Troubleshooting Steps:**
1. Test in mobile browser directly
2. Verify responsive CSS is loading
3. Check viewport meta tag
4. Test touch target sizes
5. Verify email app integration

### Performance Issues

**Symptoms:**
- Pages load slowly
- Form submission times out
- Authentication takes too long

**Troubleshooting Steps:**
1. Check network connection speed
2. Monitor browser developer tools
3. Verify server/service performance
4. Check for JavaScript errors
5. Test with caching disabled

### Debugging Tools

1. **Browser Developer Tools:**
   - Network tab for request monitoring
   - Console for JavaScript errors
   - Application tab for cookie/storage inspection

2. **MailHog Interface:**
   - View sent emails
   - Inspect email content
   - Verify delivery timing

3. **Supabase Dashboard:**
   - Auth logs
   - User management
   - Email settings

4. **Docker Logs:**
   ```bash
   docker-compose logs app
   docker-compose logs mailhog
   ```

## Test Execution Checklist

### Before Testing
- [ ] Environment is properly set up
- [ ] All services are running
- [ ] Test accounts are configured
- [ ] Browser is prepared (cookies cleared, etc.)

### During Testing
- [ ] Record actual results for each test case
- [ ] Note any deviations from expected behavior
- [ ] Capture screenshots of issues
- [ ] Monitor browser console for errors

### After Testing
- [ ] Document all issues found
- [ ] Categorize issues by severity
- [ ] Create bug reports for failures
- [ ] Update test procedures if needed
- [ ] Clean up test data

## Test Report Template

```
Test Execution Report
Date: [Date]
Tester: [Name]
Environment: [Dev/Staging/Prod]
Browser: [Browser + Version]
Device: [Desktop/Mobile]

Test Cases Executed: X/Y
Passed: X
Failed: Y
Skipped: Z

Critical Issues:
- [Issue description]

Minor Issues:
- [Issue description]

Performance Notes:
- [Performance observations]

Recommendations:
- [Next steps]
```

---

**End of Manual Testing Procedures**

For questions or issues with these procedures, contact the development team or refer to the project documentation.
