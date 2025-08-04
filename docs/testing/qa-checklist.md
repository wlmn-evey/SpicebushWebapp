# Manual QA Test Plan - Spicebush Montessori Critical Fixes

## Test Environment Setup
- **Browser Testing**: Chrome, Firefox, Safari, Edge
- **Mobile Testing**: iOS Safari, Android Chrome
- **Screen Readers**: NVDA (Windows), VoiceOver (Mac/iOS)
- **Test Accounts**: 
  - Admin: admin@spicebushmontessori.org
  - Director: director@spicebushmontessori.org
  - Staff: teacher@spicebushmontessori.org
  - Non-admin: parent@gmail.com

## 1. Admin Authorization System

### 1.1 Admin Login Flow
- [ ] Navigate to /admin
- [ ] Verify login form is displayed
- [ ] Test with admin@spicebushmontessori.org - should succeed
- [ ] Test with director@spicebushmontessori.org - should succeed
- [ ] Test with any @spicebushmontessori.org email - should succeed
- [ ] Test with parent@gmail.com - should fail with clear error message
- [ ] Test with empty credentials - should show validation errors
- [ ] Test with malformed email - should show validation error

### 1.2 Session Management
- [ ] Login as admin
- [ ] Refresh page - should remain logged in
- [ ] Open new tab - should be logged in
- [ ] Clear cookies - should be logged out
- [ ] Test session timeout (if implemented)
- [ ] Test logout functionality

### 1.3 Admin Panel Access
- [ ] After login, verify access to admin features
- [ ] Try to access admin URLs directly without login - should redirect
- [ ] Verify no admin UI elements visible to non-admin users

### 1.4 Security Edge Cases
- [ ] Test SQL injection attempts in login form
- [ ] Test XSS attempts in email field
- [ ] Test with very long email addresses
- [ ] Test rapid login attempts (rate limiting)
- [ ] Test concurrent logins from multiple browsers

## 2. Email Standardization

### 2.1 Footer Email Display
- [ ] Check footer shows information@spicebushmontessori.org
- [ ] Click email link - should open mail client with correct address
- [ ] Verify no instances of old email format (info@)
- [ ] Check email displays correctly on mobile devices

### 2.2 Contact Page
- [ ] Navigate to /contact
- [ ] Verify email shows as information@spicebushmontessori.org
- [ ] Test any contact forms use correct email

### 2.3 Site-wide Search
- [ ] Search source for any hardcoded email addresses
- [ ] Verify all use information@spicebushmontessori.org
- [ ] Check email in meta tags and schema markup

## 3. Footer Accessibility

### 3.1 Color Contrast Testing
- [ ] Use browser dev tools to verify contrast ratios
- [ ] Light-stone (#e8dcc6) on forest-canopy (#2d3e0f) - should be ≥4.5:1
- [ ] Sunlight-gold (#ff8800) headings - should be ≥3:1
- [ ] Test with Windows High Contrast mode
- [ ] Test with dark mode browser extensions

### 3.2 Keyboard Navigation
- [ ] Tab through all footer links
- [ ] Verify focus indicators are visible
- [ ] Check tab order is logical
- [ ] Test with screen reader

### 3.3 Screen Reader Testing
- [ ] All links have descriptive text
- [ ] Social media links have aria-labels
- [ ] Heading hierarchy is correct
- [ ] Lists are properly marked up

### 3.4 Mobile Accessibility
- [ ] Touch targets are at least 44x44 pixels
- [ ] Text remains readable when zoomed to 200%
- [ ] No horizontal scrolling at any zoom level

## 4. Hours Widget - Friday Display

### 4.1 Friday Hours Display
- [ ] Verify Friday shows 7:30 AM - 3:00 PM
- [ ] Check "Closes at 3:00 PM" message appears
- [ ] Verify ⏰ emoji displays correctly
- [ ] No aftercare bar shown for Friday
- [ ] Compare with Mon-Thu which should show aftercare

### 4.2 Visual Hour Bars
- [ ] Friday bar should be shorter than Mon-Thu
- [ ] Colors should match legend:
  - Before care: moss-green (#7a8450)
  - Regular hours: forest-canopy (#2d3e0f)
  - After care: sunlight-gold (#ff8800)
- [ ] Current time indicator (red line) displays correctly

### 4.3 Responsive Design
- [ ] Test on mobile - bars should remain proportional
- [ ] Legend should be visible and readable
- [ ] Time ranges should not overlap or truncate

### 4.4 Data Loading States
- [ ] Check loading message appears briefly
- [ ] Verify graceful fallback if database unavailable
- [ ] No console errors during loading

## 5. Console Log Verification

### 5.1 Browser Console Checks
- [ ] Open dev tools on each page
- [ ] No console.log() statements
- [ ] No console.debug() statements
- [ ] No console.info() statements
- [ ] console.error() only for legitimate errors
- [ ] console.warn() only for important warnings

### 5.2 Production Build Testing
- [ ] Build site with `npm run build`
- [ ] Serve production build
- [ ] Verify no debug logs in production
- [ ] Check source maps don't expose sensitive info

## 6. Cross-Browser Testing

### 6.1 Desktop Browsers
- [ ] **Chrome**: All features work correctly
- [ ] **Firefox**: All features work correctly
- [ ] **Safari**: All features work correctly
- [ ] **Edge**: All features work correctly

### 6.2 Mobile Browsers
- [ ] **iOS Safari**: Test on iPhone and iPad
- [ ] **Android Chrome**: Test on various screen sizes
- [ ] **Samsung Internet**: If significant user base

### 6.3 Browser-Specific Issues
- [ ] CSS Grid/Flexbox layouts render correctly
- [ ] JavaScript features have proper polyfills
- [ ] Font rendering is acceptable
- [ ] Animations perform smoothly

## 7. Performance Testing

### 7.1 Page Load Performance
- [ ] Homepage loads in < 3 seconds on 3G
- [ ] Time to Interactive < 5 seconds
- [ ] No layout shifts after initial load
- [ ] Images are optimized and lazy-loaded

### 7.2 Runtime Performance
- [ ] Hours widget updates smoothly
- [ ] No jank during scrolling
- [ ] Animations run at 60fps
- [ ] Memory usage remains stable

## 8. Security Verification

### 8.1 Authentication Security
- [ ] HTTPS enforced on all pages
- [ ] Secure cookies with proper flags
- [ ] No sensitive data in localStorage
- [ ] API keys not exposed in client code

### 8.2 Input Validation
- [ ] All forms validate on client and server
- [ ] File uploads restricted by type/size
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities

## 9. Integration Testing

### 9.1 Supabase Integration
- [ ] Authentication works with real Supabase
- [ ] Hours data loads from database
- [ ] Error handling for network issues
- [ ] Graceful degradation when offline

### 9.2 Email System
- [ ] Contact forms send to correct address
- [ ] Email notifications work properly
- [ ] Bounce handling configured
- [ ] SPF/DKIM records verified

## 10. Regression Testing

### 10.1 Existing Features
- [ ] Navigation menu works correctly
- [ ] All pages load without errors
- [ ] Forms submit successfully
- [ ] Images and assets load properly

### 10.2 Critical User Paths
- [ ] Parent can view school information
- [ ] Parent can access tuition calculator
- [ ] Parent can find contact information
- [ ] Admin can access admin panel

## Test Execution Log

| Date | Tester | Browser/Device | Issues Found | Status |
|------|---------|----------------|--------------|---------|
|      |         |                |              |         |

## Issue Tracking

### Critical Issues (P0)
- [ ] Issue description, steps to reproduce, impact

### High Priority (P1)
- [ ] Issue description, steps to reproduce, impact

### Medium Priority (P2)
- [ ] Issue description, steps to reproduce, impact

### Low Priority (P3)
- [ ] Issue description, steps to reproduce, impact

## Sign-off Criteria

- [ ] All P0 and P1 issues resolved
- [ ] All test cases pass on primary browsers
- [ ] Accessibility audit passes WCAG 2.1 AA
- [ ] Performance metrics meet targets
- [ ] Security scan shows no vulnerabilities
- [ ] Stakeholder approval received

## Notes
- Document any deviations from test plan
- Note any environmental issues
- Record any workarounds needed
- List any known issues going to production