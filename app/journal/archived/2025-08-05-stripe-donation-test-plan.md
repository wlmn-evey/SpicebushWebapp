# Stripe Donation Form Test Plan
**Date**: August 5, 2025
**Author**: Elrond, Software Architect

## Test Plan for SimplifiedDonationForm

### 1. Manual Testing Checklist

#### Pre-Production Testing (with test keys)
- [ ] Load donation page at `/donate`
- [ ] Verify form renders with all giving levels
- [ ] Test amount selection:
  - [ ] Click each giving level ($25, $50, $100, $250, $500)
  - [ ] Verify "Most Popular" badge on $100 option
  - [ ] Enter custom amount (test $1, $999, $10000)
- [ ] Test frequency toggle:
  - [ ] Switch between One-Time and Monthly
  - [ ] Verify amount display updates with "/mo" suffix
- [ ] Test designation dropdown:
  - [ ] Select each option
  - [ ] Verify all options are visible
- [ ] Test donor information:
  - [ ] Fill in valid information
  - [ ] Test anonymous donation checkbox
  - [ ] Verify name fields disable when anonymous
  - [ ] Verify email remains required
- [ ] Test payment with test card:
  - [ ] Use 4242 4242 4242 4242 (success)
  - [ ] Use 4000 0000 0000 0002 (decline)
  - [ ] Verify error messages display correctly
- [ ] Test form validation:
  - [ ] Submit with empty fields
  - [ ] Submit with invalid email
  - [ ] Submit with names < 2 characters
- [ ] Test success flow:
  - [ ] Complete successful donation
  - [ ] Verify redirect to thank you page
  - [ ] Verify donation ID displays
  - [ ] Check browser back button behavior

#### Production Testing (with live keys)
- [ ] Make $1 test donation
- [ ] Verify in Stripe Dashboard
- [ ] Check email receipt
- [ ] Verify thank you page
- [ ] Test social sharing links

### 2. Automated E2E Test Suite

```typescript
// e2e/simplified-donation-form.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Simplified Donation Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/donate');
  });

  test('should load donation page with form', async ({ page }) => {
    await expect(page).toHaveTitle(/Donate.*Spicebush Montessori/);
    await expect(page.locator('h1')).toContainText('Support Our Mission');
    await expect(page.locator('h3:text("Choose Your Gift Amount")')).toBeVisible();
  });

  test('should select giving levels', async ({ page }) => {
    // Test each giving level button
    const levels = ['25', '50', '100', '250', '500'];
    for (const amount of levels) {
      await page.click(`button:has-text("$${amount}")`);
      // Verify button gets selected state (border color change)
      const button = page.locator(`button:has-text("$${amount}")`);
      await expect(button).toHaveClass(/border-forest-canopy/);
    }
  });

  test('should toggle between one-time and monthly', async ({ page }) => {
    await page.click('button:has-text("Monthly Gift")');
    await expect(page.locator('button:has-text("Monthly Gift")')).toHaveClass(/bg-forest-canopy/);
    
    // Select amount and verify /mo suffix
    await page.click('button:has-text("$100")');
    await expect(page.locator('text=$100/mo')).toBeVisible();
  });

  test('should handle custom amount', async ({ page }) => {
    await page.fill('input[placeholder="Enter amount"]', '75');
    // Verify custom amount deselects preset buttons
    const buttons = page.locator('button[class*="border-forest-canopy"]');
    await expect(buttons).toHaveCount(0);
  });

  test('should handle anonymous donation', async ({ page }) => {
    await page.check('input#anonymous');
    await expect(page.locator('input#firstName')).toBeDisabled();
    await expect(page.locator('input#lastName')).toBeDisabled();
    await expect(page.locator('input#email')).not.toBeDisabled();
  });

  test('should validate required fields', async ({ page }) => {
    // Select amount
    await page.click('button:has-text("$100")');
    
    // Try invalid email
    await page.fill('input#email', 'invalid-email');
    await expect(page.locator('input#email')).toHaveAttribute('aria-invalid', 'true');
    
    // Fill valid data
    await page.fill('input#firstName', 'Test');
    await page.fill('input#lastName', 'Donor');
    await page.fill('input#email', 'test@example.com');
    
    // Submit button should be enabled
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).not.toBeDisabled();
  });

  test('should show Stripe Elements card field', async ({ page }) => {
    // Wait for Stripe to load
    await page.waitForSelector('.StripeElement', { timeout: 10000 });
    await expect(page.locator('.StripeElement')).toBeVisible();
  });

  test('should display security information', async ({ page }) => {
    await expect(page.locator('text=Your payment information is secure and encrypted')).toBeVisible();
    await expect(page.locator('text=tax-deductible')).toBeVisible();
  });
});
```

### 3. API Testing

```javascript
// Test payment intent creation
const testPaymentIntent = async () => {
  const response = await fetch('/api/donations/create-payment-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: 10000, // $100 in cents
      donationType: 'one-time',
      designation: 'general',
      donor: {
        firstName: 'Test',
        lastName: 'Donor',
        email: 'test@example.com',
        anonymous: false
      },
      message: 'Test donation'
    })
  });
  
  const data = await response.json();
  console.assert(data.clientSecret, 'Client secret should be returned');
  console.assert(data.donationId, 'Donation ID should be returned');
};
```

### 4. Webhook Testing

```bash
# Using Stripe CLI for local testing
stripe listen --forward-to localhost:4321/api/webhooks/stripe

# In another terminal, trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger customer.subscription.created
```

### 5. Security Testing

- [ ] Verify HTTPS only in production
- [ ] Test with invalid API keys
- [ ] Attempt XSS in form fields
- [ ] Test SQL injection in message field
- [ ] Verify card details never logged
- [ ] Check for PCI compliance
- [ ] Test rate limiting (if implemented)

### 6. Performance Testing

- [ ] Measure form load time
- [ ] Test Stripe Elements initialization speed
- [ ] Verify no memory leaks with repeated form submissions
- [ ] Test with slow network conditions
- [ ] Measure API response times

### 7. Browser Compatibility

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### 8. Accessibility Testing

- [ ] Keyboard navigation through entire form
- [ ] Screen reader compatibility
- [ ] Color contrast verification
- [ ] Focus indicators visible
- [ ] Error messages announced
- [ ] Form labels properly associated

### 9. Edge Cases

- [ ] $0 donation attempt
- [ ] Negative amount attempt
- [ ] Very large amount ($1,000,000)
- [ ] Special characters in name fields
- [ ] International characters
- [ ] Network disconnection during submission
- [ ] Browser back after successful payment
- [ ] Multiple rapid submissions

### 10. Monitoring Setup

Post-deployment:
- [ ] Set up Stripe webhook monitoring
- [ ] Configure error alerting
- [ ] Track conversion rates
- [ ] Monitor payment success rates
- [ ] Set up daily donation reports

## Test Execution Priority

1. **Critical Path** (Must pass before production):
   - Basic form functionality
   - Payment processing with test card
   - Webhook receipt
   - Thank you page redirect

2. **High Priority**:
   - Form validation
   - Anonymous donations
   - Monthly donations
   - Error handling

3. **Medium Priority**:
   - Browser compatibility
   - Performance metrics
   - Accessibility compliance

4. **Low Priority**:
   - Edge cases
   - International support
   - Advanced security testing

---
*May your tests be as thorough as the roots of the ancient trees, and your code as resilient as mithril.*