# Contact Page Accessibility Testing - July 30, 2025

## Overview
Creating comprehensive tests to verify accessibility fixes implemented by Elrond for the contact page.

## Accessibility Fixes to Test

### Bug #038: Contact Form Icons Missing Accessibility Labels
- All 20 decorative icon instances should have `aria-hidden="true"`
- Icons affected: User, Mail, Phone, Baby, MessageSquare, Calendar, Send, Clock, MapPin, Heart, AlertCircle, CheckCircle
- Icons should be hidden from screen readers while remaining visually present

### Bug #039: Google Map Embed Missing Text Alternative
- Address section should have `id="school-address"`
- Google Maps iframe should have `aria-describedby="school-address"`
- Creates semantic connection between map and text alternative

## Test Strategy

### 1. Unit Tests (Vitest)
- Test individual icon components for proper aria-hidden attribute
- Verify map iframe has correct aria-describedby
- Check address section has correct id

### 2. Integration Tests (Vitest + Testing Library)
- Test form functionality remains intact
- Verify no visual regressions
- Check WCAG 2.1 Level A compliance

### 3. E2E Tests (Playwright)
- Browser compatibility testing
- Screen reader simulation testing
- Visual regression testing
- Full form submission flow with accessibility checks

### 4. Manual Testing Procedures
- Screen reader testing with NVDA/JAWS/VoiceOver
- Keyboard navigation testing
- Browser DevTools accessibility audit

## Test Files Created
1. `/src/test/accessibility/contact-page-icons.test.ts` - Unit tests for icon accessibility
2. `/src/test/accessibility/contact-page-map.test.ts` - Unit tests for map accessibility
3. `/e2e/contact-page-accessibility.spec.ts` - E2E accessibility tests
4. `/docs/testing/contact-page-accessibility-manual-tests.md` - Manual testing procedures

## Test Implementation Details

### Unit Tests (Vitest)
- **contact-page-icons.test.ts**: Validates all 20 decorative icons have aria-hidden="true"
  - Tests each icon type individually
  - Verifies no icons are missing the attribute
  - Checks attribute value is exactly "true"
  - Counts total icons to match bug report

- **contact-page-map.test.ts**: Validates map accessibility implementation
  - Checks iframe has aria-describedby="school-address"
  - Verifies address section has id="school-address"
  - Tests semantic HTML structure
  - Validates WCAG compliance

### E2E Tests (Playwright)
- **contact-page-accessibility.spec.ts**: Comprehensive browser testing
  - Automated accessibility scans with axe-core
  - Screen reader simulation tests
  - Keyboard navigation verification
  - Cross-browser compatibility (Chrome, Firefox, Safari)
  - Visual regression testing
  - Form functionality with accessibility fixes

### Manual Testing Guide
- **contact-page-accessibility-manual-tests.md**: Step-by-step procedures
  - Screen reader testing (NVDA, JAWS, VoiceOver)
  - Keyboard navigation testing
  - Browser DevTools audits
  - Mobile accessibility testing
  - WCAG 2.1 Level A compliance checklist
  - Cross-browser verification

## Key Testing Points
- All decorative icons must not be announced by screen readers
- Map must have proper text alternative via aria-describedby
- Form functionality must remain intact
- No visual regressions
- WCAG 2.1 Level A compliance maintained