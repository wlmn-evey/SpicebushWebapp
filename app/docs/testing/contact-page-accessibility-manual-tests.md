# Contact Page Accessibility Manual Testing Guide

## Overview
This guide provides step-by-step procedures for manually testing the accessibility fixes implemented on the contact page. These tests verify Bug #038 (decorative icons) and Bug #039 (Google Map text alternative).

## Prerequisites
- Screen reader software (NVDA, JAWS, or VoiceOver)
- Multiple browsers (Chrome, Firefox, Safari, Edge)
- Browser developer tools
- Keyboard (no mouse for keyboard testing)

## Test Procedures

### 1. Screen Reader Testing

#### 1.1 Decorative Icons (Bug #038)
**Objective**: Verify that decorative icons are not announced by screen readers.

**NVDA/JAWS (Windows):**
1. Open the contact page in Chrome or Firefox
2. Start NVDA (Insert + Q) or JAWS (Insert + J)
3. Navigate to the contact page hero section
4. Listen for announcement of "Let's Connect" heading
5. **Expected**: No icon or image announcement before/after the heading
6. Press Tab to navigate through the page
7. **Expected**: Focus moves directly between interactive elements, skipping icons

**VoiceOver (macOS):**
1. Open the contact page in Safari
2. Start VoiceOver (Cmd + F5)
3. Use VoiceOver navigation (Control + Option + Arrow keys)
4. Navigate through each section
5. **Expected**: Icons are not announced at any point
6. Test form fields
7. **Expected**: Labels are announced without icon descriptions

**Test Locations:**
- Hero section (MessageSquare icon)
- Contact method cards (Phone, Mail, MapPin icons)
- Form field labels (User, Mail, Phone, Baby, MessageSquare, Calendar icons)
- Section headers (Send, Clock, Heart, AlertCircle icons)
- Submit button (Send icon)
- Alert messages (CheckCircle, AlertCircle icons)

#### 1.2 Google Map Text Alternative (Bug #039)
**Objective**: Verify proper text alternative for the embedded map.

**Steps:**
1. Navigate to "Find Us" section with screen reader
2. When reaching the map iframe
3. **Expected**: Screen reader announces "Spicebush Montessori School Location Map"
4. **Expected**: Screen reader indicates additional description available
5. Continue navigation to address section
6. **Expected**: Address section is announced with full address details

### 2. Keyboard Navigation Testing

**Objective**: Ensure full keyboard accessibility without mouse.

**Steps:**
1. Load contact page
2. Press Tab repeatedly to navigate
3. **Expected Tab Order:**
   - Skip to main content link
   - Header navigation items
   - Form fields in order (Name → Email → Phone → Child Age → Subject → Message)
   - Tour interest checkbox
   - Submit button
   - Contact method links
   - Additional information links
   - Map section links

**Verification Points:**
- No focus on decorative icons
- All interactive elements reachable
- Visible focus indicators
- Logical tab order
- No keyboard traps

### 3. Browser DevTools Accessibility Audit

**Chrome DevTools:**
1. Open contact page
2. Press F12 to open DevTools
3. Go to "Lighthouse" tab
4. Select "Accessibility" category only
5. Run audit
6. **Expected**: Score of 95+ with no critical issues

**Firefox Accessibility Inspector:**
1. Open contact page
2. Press F12 to open Developer Tools
3. Select "Accessibility" tab
4. Check the accessibility tree
5. **Expected**: Icons show as hidden from accessibility tree
6. **Expected**: Map iframe shows proper name and description

### 4. Visual Verification

**Objective**: Ensure accessibility fixes don't affect visual appearance.

**Steps:**
1. Compare page appearance before and after fixes
2. Verify all icons are still visually present
3. Check icon colors and positioning
4. Verify form layout unchanged
5. Check map display and sizing

**Checklist:**
- [ ] Hero icon visible and centered
- [ ] Contact card icons visible in colored circles
- [ ] Form field icons inline with labels
- [ ] Section header icons properly aligned
- [ ] Submit button icon visible
- [ ] Map displays correctly
- [ ] No layout shifts or broken styles

### 5. Form Functionality Testing

**Objective**: Verify form works correctly with accessibility fixes.

**Steps:**
1. Fill out form with valid data
2. Submit form
3. **Expected**: Redirects to success page
4. Go back and test validation
5. Submit empty form
6. **Expected**: Validation errors appear
7. **Expected**: Screen reader announces errors
8. Fix errors and resubmit
9. **Expected**: Form submits successfully

### 6. Responsive Accessibility Testing

**Mobile Devices:**
1. Test on actual mobile devices or responsive mode
2. Verify touch targets are adequate (44x44px minimum)
3. Test with mobile screen readers (TalkBack/VoiceOver)
4. Verify icons don't interfere with touch interaction

**Breakpoints to Test:**
- Mobile: 320px, 375px, 414px
- Tablet: 768px, 1024px
- Desktop: 1280px, 1440px, 1920px

### 7. Cross-Browser Testing

Test in each browser:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

**For each browser verify:**
1. Icons have aria-hidden="true"
2. Map has proper aria-describedby
3. Form validation works
4. No console errors
5. Consistent behavior

### 8. WCAG 2.1 Compliance Checklist

**Level A Requirements:**
- [ ] 1.1.1 Non-text Content - Map has text alternative via aria-describedby
- [ ] 1.3.1 Info and Relationships - Form structure preserved
- [ ] 2.1.1 Keyboard - All functionality keyboard accessible
- [ ] 2.4.1 Bypass Blocks - Skip to main content works
- [ ] 3.3.1 Error Identification - Form errors identified
- [ ] 4.1.1 Parsing - Valid HTML markup
- [ ] 4.1.2 Name, Role, Value - All controls properly labeled

### 9. Performance Impact Testing

**Steps:**
1. Run Lighthouse performance audit before and after
2. Compare metrics:
   - First Contentful Paint
   - Time to Interactive
   - Total Blocking Time
3. **Expected**: No significant performance degradation

### 10. Automated Test Verification

**Run test suites:**
```bash
# Unit tests
npm run test src/test/accessibility/contact-page-icons.test.ts
npm run test src/test/accessibility/contact-page-map.test.ts

# E2E tests
npm run test:e2e e2e/contact-page-accessibility.spec.ts
```

## Reporting Issues

If any test fails:
1. Document the specific test case
2. Note the browser and assistive technology used
3. Take screenshots if applicable
4. Record screen reader output if relevant
5. File issue with:
   - Test case reference
   - Expected vs actual behavior
   - Steps to reproduce
   - Environment details

## Sign-off Checklist

Before approving the accessibility fixes:

**Functional Testing:**
- [ ] All decorative icons hidden from screen readers
- [ ] Map has proper text alternative
- [ ] Form fully functional
- [ ] No visual regressions

**Accessibility Testing:**
- [ ] Tested with at least 2 screen readers
- [ ] Keyboard navigation complete
- [ ] Browser audits pass
- [ ] WCAG 2.1 Level A compliant

**Cross-platform Testing:**
- [ ] Tested in 4 major browsers
- [ ] Tested on mobile devices
- [ ] Tested at multiple screen sizes

**Sign-off:**
- Tester Name: ________________
- Date: ________________
- Environment: ________________
- Results: [ ] PASS [ ] FAIL

## Notes
- Focus on user experience, not just technical compliance
- Test with actual assistive technology users if possible
- Consider edge cases and error conditions
- Verify fixes work for all user groups