# Contact Form Test Guide

## Overview
This guide provides instructions for testing the simplified contact form implementation that uses Netlify Forms with a webhook backup.

## Test Files Created

### 1. E2E Tests: `/e2e/contact-form.spec.ts`
Comprehensive Playwright tests covering:
- Form submission flow and success redirect
- Form validation (required fields, email/phone format)
- Honeypot spam protection
- Success page functionality
- Mobile responsiveness
- Cross-browser compatibility
- Additional features (contact cards, hours widget, etc.)

### 2. Unit Tests: `/src/pages/api/webhooks/netlify-form.test.ts`
Unit tests for the webhook endpoint covering:
- Request validation
- Form data processing
- Error handling
- Data transformation
- Various Netlify payload formats

## Running the Tests

### E2E Tests (Playwright)

```bash
# Run all contact form tests
npm run test:e2e -- contact-form.spec.ts

# Run tests in headed mode (see browser)
npm run test:e2e -- contact-form.spec.ts --headed

# Run specific test
npm run test:e2e -- contact-form.spec.ts -g "should successfully submit form"

# Run tests in specific browser
npm run test:e2e -- contact-form.spec.ts --project=chromium
npm run test:e2e -- contact-form.spec.ts --project=firefox
npm run test:e2e -- contact-form.spec.ts --project=webkit

# Run mobile tests only
npm run test:e2e -- contact-form.spec.ts --project="Mobile Chrome"
npm run test:e2e -- contact-form.spec.ts --project="Mobile Safari"

# Generate HTML report
npm run test:e2e -- contact-form.spec.ts --reporter=html
```

### Unit Tests (Vitest)

```bash
# Run webhook unit tests
npm run test -- netlify-form.test.ts

# Run with coverage
npm run test:coverage -- netlify-form.test.ts

# Run in watch mode
npm run test:watch -- netlify-form.test.ts
```

## Manual Testing Checklist

### Form Submission Flow
- [ ] Fill all required fields and submit
- [ ] Verify redirect to `/contact-success`
- [ ] Check success message displays
- [ ] Test browser back button behavior

### Form Validation
- [ ] Try submitting with empty required fields
- [ ] Test invalid email formats
- [ ] Test phone number formatting (automatically formats to (XXX) XXX-XXXX)
- [ ] Verify red border appears on invalid fields
- [ ] Check validation clears when fields are corrected

### Honeypot Protection
- [ ] Inspect form HTML for hidden honeypot field
- [ ] Verify `data-netlify-honeypot="bot-field"` attribute exists
- [ ] Confirm honeypot field is not visible to users

### Success Page
- [ ] Navigate directly to `/contact-success`
- [ ] Verify all content displays correctly
- [ ] Test "Back to Home" button
- [ ] Test "Call Us" button (should open phone app)

### Mobile Testing
- [ ] Test on actual mobile devices if possible
- [ ] Check form fields are easily tappable
- [ ] Verify keyboard behavior (email/phone keyboards)
- [ ] Test landscape and portrait orientations
- [ ] Check submit button is full width on mobile

### Error Scenarios
- [ ] Test with JavaScript disabled (form should still work via Netlify)
- [ ] Test slow network conditions
- [ ] Test form submission during page navigation

### Cross-Browser Testing
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers (iOS Safari, Chrome Android)

## Webhook Testing (Manual)

Since Netlify Forms handles the primary submission, the webhook is a backup. To test:

1. Configure Netlify webhook in site settings
2. Submit a form
3. Check Supabase database for stored submission
4. Verify all fields are saved correctly

## Common Issues and Solutions

### Issue: Form doesn't redirect after submission
- Check that `action="/contact-success"` is set on the form
- Verify the success page exists and is accessible
- Check browser console for JavaScript errors

### Issue: Validation styling not appearing
- Ensure JavaScript is enabled
- Check that validation script is loading
- Verify CSS classes are correctly applied

### Issue: Phone formatting not working
- Check that the phone input event listener is attached
- Verify the formatting regex is correct
- Test with various phone number formats

### Issue: Webhook not receiving data
- Verify webhook URL is correctly configured in Netlify
- Check Supabase credentials are set in environment
- Review webhook logs for errors

## Performance Considerations

- Form should be interactive within 1 second
- Validation should provide instant feedback
- Phone formatting should not lag while typing
- Success page should load quickly after submission

## Accessibility Testing

- [ ] Form works with keyboard navigation only
- [ ] Screen readers announce form labels correctly
- [ ] Error messages are announced to screen readers
- [ ] Focus management works correctly
- [ ] Color contrast meets WCAG standards