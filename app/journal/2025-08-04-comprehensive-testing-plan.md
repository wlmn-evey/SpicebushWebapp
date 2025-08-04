# Comprehensive Testing Plan for Spicebush Testing Site

**Date**: August 4, 2025  
**Site URL**: https://spicebush-testing.netlify.app  
**Purpose**: Complete functional, security, and performance testing before production deployment

## Executive Summary

This testing plan provides a systematic approach to validate the Spicebush Montessori testing site, with special emphasis on:
- Stripe payment processing (live keys configured)
- Free tour scheduling functionality
- Database operations via Supabase
- Email notifications via Unione.io
- Overall site reliability and user experience

## 1. Functional Testing

### 1.1 Donation Form Testing (`/donate`)

#### Test Case: DF-001 - Basic Donation Flow
**Objective**: Verify complete donation processing flow  
**Prerequisites**: Valid payment card, test email address  
**Steps**:
1. Navigate to https://spicebush-testing.netlify.app/donate
2. Select a donation amount ($25 preset)
3. Choose "One-Time Gift"
4. Enter donor information:
   - First Name: Test
   - Last Name: Donor
   - Email: test@example.com
5. Enter card details: 4242 4242 4242 4242, any future date, any CVC
6. Click "Donate $25"
7. Wait for processing

**Expected Results**:
- Payment processes successfully
- Redirect to `/donate/thank-you` page
- Thank you message displays with donation ID
- Receipt email sent to provided address
- Transaction appears in Stripe Dashboard

#### Test Case: DF-002 - Monthly Recurring Donation
**Objective**: Verify recurring donation setup  
**Steps**:
1. Navigate to donation page
2. Select "Monthly Gift" option
3. Choose $50 amount
4. Complete donor and payment information
5. Submit form

**Expected Results**:
- Monthly subscription created in Stripe
- Confirmation page shows recurring status
- Email confirms monthly donation setup

#### Test Case: DF-003 - Anonymous Donation
**Objective**: Test anonymous donation feature  
**Steps**:
1. Check "Make this donation anonymous"
2. Verify name fields become disabled
3. Enter email only
4. Complete payment

**Expected Results**:
- Name fields properly disabled
- Payment processes with "Anonymous Donor" label
- Email still receives receipt

#### Test Case: DF-004 - Custom Amount Entry
**Objective**: Validate custom donation amounts  
**Steps**:
1. Enter custom amount: $123.45
2. Complete donation

**Expected Results**:
- Custom amount accepted
- Correct amount charged
- Proper display on confirmation

#### Test Case: DF-005 - Fund Designation
**Objective**: Test donation designation options  
**Steps**:
1. Select each designation option:
   - General Fund
   - Scholarship Fund
   - Garden & Nature Program
   - Montessori Materials
   - Teacher Development
2. Verify selection saved with donation

**Expected Results**:
- All designations selectable
- Choice reflected in confirmation
- Data stored in system

### 1.2 Tour Scheduling Form Testing (`/schedule-tour`)

#### Test Case: TS-001 - Basic Tour Scheduling
**Objective**: Verify free tour scheduling (no payment)  
**Steps**:
1. Navigate to https://spicebush-testing.netlify.app/schedule-tour
2. Fill parent information:
   - Name: Test Parent
   - Email: parent@example.com
   - Phone: 555-0100
3. Fill child information:
   - Child Name: Test Child
   - Age: 4 years old
4. Select tour preferences:
   - Date: Tomorrow's date
   - Time: Morning slot
5. Submit form

**Expected Results**:
- No payment requested
- Success message displays
- Confirmation email sent
- Data stored in database

#### Test Case: TS-002 - Optional Fields
**Objective**: Test form with optional questions  
**Steps**:
1. Fill all required fields
2. Add question in optional field
3. Submit

**Expected Results**:
- Form submits successfully
- Question captured in system

#### Test Case: TS-003 - Date Validation
**Objective**: Verify date picker constraints  
**Steps**:
1. Try to select past date
2. Select future date

**Expected Results**:
- Past dates disabled
- Only future dates selectable

### 1.3 Navigation and Pages

#### Test Case: NAV-001 - All Pages Load
**Objective**: Verify all pages load without errors  
**Test All Pages**:
- Home: `/`
- About: `/about`
- Programs: `/programs`
- Admissions: `/admissions`
- Donate: `/donate`
- Contact: `/contact`
- Schedule Tour: `/schedule-tour`
- Blog: `/blog`
- Policies: `/policies`
- Privacy Policy: `/privacy-policy`

**Expected Results**: Each page loads with no 404/500 errors

### 1.4 Contact Form Testing

#### Test Case: CF-001 - Basic Contact Submission
**Objective**: Test contact form functionality  
**Steps**:
1. Navigate to `/contact`
2. Fill all fields
3. Submit form

**Expected Results**:
- Success message displays
- Email notification sent
- Data stored in database

## 2. Payment Processing Verification

### 2.1 Stripe Integration Tests

#### Test Case: PAY-001 - Live Key Validation
**Objective**: Confirm production Stripe keys are active  
**Steps**:
1. Make $1 test donation
2. Check Stripe Dashboard (https://dashboard.stripe.com/payments)

**Expected Results**:
- Payment appears in live mode
- Transaction details correct

#### Test Case: PAY-002 - Payment Failure Handling
**Objective**: Test declined card behavior  
**Steps**:
1. Use test card: 4000 0000 0000 0002 (decline)
2. Attempt donation

**Expected Results**:
- Clear error message displays
- Form remains filled
- User can retry with different card

#### Test Case: PAY-003 - 3D Secure Authentication
**Objective**: Test cards requiring authentication  
**Steps**:
1. Use test card: 4000 0025 0000 3155
2. Complete 3D Secure prompt

**Expected Results**:
- Authentication prompt appears
- Payment completes after authentication

## 3. Database Operations

### 3.1 Supabase Integration

#### Test Case: DB-001 - Data Persistence
**Objective**: Verify data saves to Supabase  
**Steps**:
1. Submit tour scheduling form
2. Check Supabase dashboard for record

**Expected Results**:
- Record appears in database
- All fields populated correctly

#### Test Case: DB-002 - Settings Retrieval
**Objective**: Test dynamic content loading  
**Steps**:
1. Check hours display on site
2. Verify against database values

**Expected Results**:
- Hours match database
- Content loads without delay

## 4. Email Service Testing

### 4.1 Unione.io Integration

#### Test Case: EMAIL-001 - Donation Receipt
**Objective**: Verify donation receipts sent  
**Steps**:
1. Complete donation with valid email
2. Check inbox for receipt

**Expected Results**:
- Email arrives within 5 minutes
- Contains correct donation details
- Proper formatting

#### Test Case: EMAIL-002 - Tour Confirmation
**Objective**: Test tour scheduling emails  
**Steps**:
1. Schedule tour
2. Check for confirmation email

**Expected Results**:
- Confirmation email sent
- Contains tour details
- Contact information included

#### Test Case: EMAIL-003 - Contact Form Notification
**Objective**: Verify contact form emails  
**Steps**:
1. Submit contact form
2. Check admin receives notification

**Expected Results**:
- Admin notified of new contact
- User receives confirmation

## 5. Performance Testing

### 5.1 Page Load Speed

#### Test Case: PERF-001 - Homepage Load Time
**Objective**: Measure homepage performance  
**Tools**: Google PageSpeed Insights, GTmetrix  
**Steps**:
1. Test URL: https://spicebush-testing.netlify.app
2. Record metrics

**Expected Results**:
- Load time < 3 seconds
- PageSpeed score > 70
- No blocking resources

#### Test Case: PERF-002 - Image Optimization
**Objective**: Verify images are optimized  
**Steps**:
1. Check Network tab for image sizes
2. Verify lazy loading implemented

**Expected Results**:
- Images < 200KB each
- WebP format used
- Lazy loading active

### 5.2 Form Response Times

#### Test Case: PERF-003 - Form Submission Speed
**Objective**: Measure form processing time  
**Steps**:
1. Time donation form submission
2. Time tour form submission

**Expected Results**:
- Response within 3 seconds
- Loading indicators display

## 6. Security Verification

### 6.1 Payment Security

#### Test Case: SEC-001 - PCI Compliance
**Objective**: Verify secure payment handling  
**Steps**:
1. Inspect donation form
2. Verify card details not logged
3. Check HTTPS on payment pages

**Expected Results**:
- All payment pages use HTTPS
- Card data handled by Stripe only
- No sensitive data in logs

#### Test Case: SEC-002 - API Key Security
**Objective**: Confirm keys properly secured  
**Steps**:
1. View page source
2. Check for exposed secret keys
3. Verify only public keys visible

**Expected Results**:
- Only publishable key in frontend
- Secret keys server-side only

### 6.2 Form Security

#### Test Case: SEC-003 - CSRF Protection
**Objective**: Verify CSRF tokens present  
**Steps**:
1. Inspect form submissions
2. Check for CSRF tokens

**Expected Results**:
- CSRF protection active
- Tokens validated server-side

#### Test Case: SEC-004 - Input Validation
**Objective**: Test form input sanitization  
**Steps**:
1. Try SQL injection: `'; DROP TABLE users;--`
2. Try XSS: `<script>alert('XSS')</script>`

**Expected Results**:
- Inputs properly sanitized
- No code execution
- Safe error handling

## 7. Mobile Responsiveness

### 7.1 Device Testing

#### Test Case: MOB-001 - iPhone Testing
**Objective**: Test on iOS devices  
**Devices**: iPhone 12/13/14  
**Test Areas**:
- Navigation menu
- Donation form
- Tour scheduling
- Touch targets

**Expected Results**:
- Responsive layout
- Forms usable
- Buttons tappable (44px minimum)

#### Test Case: MOB-002 - Android Testing
**Objective**: Test on Android devices  
**Devices**: Samsung Galaxy, Pixel  
**Test Same Areas as MOB-001**

#### Test Case: MOB-003 - Tablet Testing
**Objective**: Verify tablet experience  
**Devices**: iPad, Android tablets  
**Expected Results**:
- Proper scaling
- No horizontal scroll
- Touch-friendly interface

## 8. Accessibility Testing

### 8.1 WCAG Compliance

#### Test Case: ACC-001 - Screen Reader Testing
**Objective**: Verify screen reader compatibility  
**Tools**: NVDA, JAWS, VoiceOver  
**Steps**:
1. Navigate site with screen reader
2. Complete donation form
3. Schedule tour

**Expected Results**:
- All content readable
- Forms navigable
- Proper ARIA labels

#### Test Case: ACC-002 - Keyboard Navigation
**Objective**: Test keyboard-only navigation  
**Steps**:
1. Navigate using Tab key only
2. Complete forms with keyboard
3. Test escape/enter keys

**Expected Results**:
- All interactive elements reachable
- Visible focus indicators
- Logical tab order

#### Test Case: ACC-003 - Color Contrast
**Objective**: Verify WCAG contrast ratios  
**Tools**: WAVE, axe DevTools  
**Expected Results**:
- Text contrast > 4.5:1
- Large text > 3:1
- No color-only information

## 9. Error Handling

### 9.1 Form Validation

#### Test Case: ERR-001 - Required Field Validation
**Objective**: Test empty field handling  
**Steps**:
1. Submit forms with empty required fields
2. Check error messages

**Expected Results**:
- Clear error messages
- Fields highlighted
- Focus moves to error

#### Test Case: ERR-002 - Invalid Input Handling
**Objective**: Test invalid data  
**Steps**:
1. Enter invalid email format
2. Enter letters in number fields
3. Enter past dates

**Expected Results**:
- Appropriate error messages
- Form doesn't submit
- User can correct errors

### 9.2 Network Errors

#### Test Case: ERR-003 - Offline Handling
**Objective**: Test offline behavior  
**Steps**:
1. Disconnect network
2. Try form submission

**Expected Results**:
- Graceful error message
- No data loss
- Retry option available

#### Test Case: ERR-004 - Timeout Handling
**Objective**: Test slow network  
**Steps**:
1. Simulate slow 3G
2. Submit forms

**Expected Results**:
- Loading indicators show
- Timeout message if needed
- Can retry submission

## 10. Cross-Browser Testing

### 10.1 Browser Compatibility

#### Test Case: BROWSER-001 - Chrome
**Version**: Latest stable  
**Test all major features**

#### Test Case: BROWSER-002 - Firefox
**Version**: Latest stable  
**Test all major features**

#### Test Case: BROWSER-003 - Safari
**Version**: Latest stable  
**Test all major features**

#### Test Case: BROWSER-004 - Edge
**Version**: Latest stable  
**Test all major features**

**Expected Results for All Browsers**:
- Consistent appearance
- All features functional
- No console errors

## Test Execution Schedule

### Phase 1: Critical Path (Day 1)
- [ ] Basic donation flow (DF-001)
- [ ] Tour scheduling (TS-001)
- [ ] Payment verification (PAY-001)
- [ ] All pages load (NAV-001)

### Phase 2: Payment & Security (Day 1-2)
- [ ] All payment test cases
- [ ] Security verification
- [ ] Database operations

### Phase 3: Communication (Day 2)
- [ ] Email testing
- [ ] Contact form testing

### Phase 4: Quality & Performance (Day 2-3)
- [ ] Performance testing
- [ ] Mobile responsiveness
- [ ] Accessibility testing
- [ ] Cross-browser testing

### Phase 5: Edge Cases (Day 3)
- [ ] Error handling
- [ ] Network conditions
- [ ] Stress testing

## Success Criteria

The site is ready for production when:
1. ✅ All critical path tests pass
2. ✅ Donation processing works with live keys
3. ✅ Tour scheduling submits without payment
4. ✅ Emails are received
5. ✅ No security vulnerabilities found
6. ✅ Performance meets targets
7. ✅ Mobile experience is smooth
8. ✅ Accessibility standards met
9. ✅ Works in all major browsers
10. ✅ Error handling is graceful

## Issue Tracking

Document any issues found using this format:

### Issue Template
**ID**: [TEST-XXX]  
**Severity**: Critical/High/Medium/Low  
**Test Case**: [Reference]  
**Description**: [What happened]  
**Steps to Reproduce**: [How to recreate]  
**Expected**: [What should happen]  
**Actual**: [What actually happened]  
**Screenshot/Video**: [If applicable]  
**Environment**: [Browser, device, etc.]  

## Verification Checklist

### Pre-Production Deployment
- [ ] All critical tests passed
- [ ] High/Critical issues resolved
- [ ] Stripe webhook configured
- [ ] Email service verified
- [ ] Database backups configured
- [ ] SSL certificate active
- [ ] Environment variables set
- [ ] Error monitoring enabled
- [ ] Analytics configured
- [ ] Legal pages reviewed

## Contact Information

**Testing Lead**: [Your Name]  
**Stripe Dashboard**: https://dashboard.stripe.com  
**Supabase Dashboard**: [Your Supabase URL]  
**Netlify Dashboard**: https://app.netlify.com  
**Emergency Contact**: (336) 766-1214  

## Notes

- Use test card 4242 4242 4242 4242 for successful payments
- Document all issues immediately
- Take screenshots of any errors
- Save browser console logs when issues occur
- Test during different times of day
- Consider testing with actual small donation ($1) to verify live system

---

This comprehensive testing plan ensures thorough validation of the Spicebush testing site before production deployment. Execute systematically and document all findings.