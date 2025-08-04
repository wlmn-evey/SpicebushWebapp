# Simplified Stripe Integration Plan

## Current State Assessment
- **Working**: SimplifiedDonationForm.tsx with Stripe Elements
- **Working**: API endpoint at `/api/donations/create-payment-intent.ts`
- **Available**: Stripe restricted key provided by client
- **Needs**: Production readiness and enrollment form

## Architecture Overview

### Phase 1: Production-Ready Donation Form (1-2 Days)
**Goal**: Deploy existing donation form to production with minimal changes

### Phase 2: Enrollment Form (1 Day)
**Goal**: Copy donation form pattern for $50 enrollment fee

### Phase 3: Testing & Deployment (1 Day)
**Goal**: Verify everything works in production

## Micro-Tasks for Junior Developer

### Day 1: Production Readiness (4-6 hours)

#### Task 1.1: Environment Variables Setup (30 minutes)
```
1. Add to .env.local:
   STRIPE_SECRET_KEY=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
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[get_from_stripe_dashboard]
   
2. Add to Netlify environment variables (same keys)

3. Test locally with test keys first:
   STRIPE_SECRET_KEY=sk_test_[test_key]
   PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_[test_key]
```

#### Task 1.2: Add Error Logging (45 minutes)
```typescript
// In create-payment-intent.ts, add simple logging:
- Log successful donations to console
- Log errors with details
- Add timestamp and amount
```

#### Task 1.3: Create Thank You Page (1 hour)
```
1. Copy contact-success.astro to donate/thank-you.astro
2. Change message to "Thank you for your donation!"
3. Add donation ID display if passed in URL
4. Add link back to homepage
```

#### Task 1.4: Add Webhook Handler (1.5 hours)
```typescript
// Create /api/webhooks/stripe.ts
- Verify webhook signature
- Log completed payments
- Send email receipt (if email service is setup)
- Update donation in database (optional for now)
```

#### Task 1.5: Test Donation Flow (1 hour)
```
1. Test with Stripe test card: 4242 4242 4242 4242
2. Verify payment shows in Stripe dashboard
3. Check thank you page redirect works
4. Verify email receipt (if implemented)
```

### Day 2: Enrollment Form (4-5 hours)

#### Task 2.1: Copy Donation Form (30 minutes)
```
1. Copy SimplifiedDonationForm.tsx to EnrollmentForm.tsx
2. Remove giving levels and frequency toggle
3. Set fixed amount to $50
4. Change button text to "Pay $50 Enrollment Fee"
```

#### Task 2.2: Simplify Form Fields (1 hour)
```typescript
// In EnrollmentForm.tsx:
- Keep parent name fields
- Add child name field
- Add child birthdate field
- Keep email field
- Remove designation dropdown
- Remove anonymous checkbox
- Remove message field
```

#### Task 2.3: Create Enrollment API Endpoint (1 hour)
```
1. Copy create-payment-intent.ts to enrollment-payment.ts
2. Set fixed amount to 5000 (cents)
3. Update metadata to include child info
4. Change description to "Enrollment Fee"
```

#### Task 2.4: Create Enrollment Page (45 minutes)
```
1. Create /enrollment.astro page
2. Import EnrollmentForm component
3. Add simple header explaining the $50 fee
4. Add what happens next after payment
```

#### Task 2.5: Test Enrollment Flow (1 hour)
```
1. Test form submission
2. Verify $50 payment in Stripe
3. Check metadata includes child info
4. Verify thank you redirect
```

### Day 3: Final Testing & Deployment (3-4 hours)

#### Task 3.1: Switch to Live Mode (30 minutes)
```
1. Get live publishable key from Stripe dashboard
2. Update environment variables
3. Remove test mode warnings from forms
```

#### Task 3.2: End-to-End Testing (1.5 hours)
```
Test Checklist:
□ Donation form loads without errors
□ Can select different amounts
□ Form validation works
□ Payment processes successfully
□ Thank you page displays
□ Enrollment form works
□ Both forms work on mobile
```

#### Task 3.3: Deploy to Production (1 hour)
```
1. Commit all changes
2. Push to main branch
3. Verify Netlify deployment
4. Test live forms with small amount
```

#### Task 3.4: Documentation (1 hour)
```
Create simple README with:
- How to view payments in Stripe
- How to download donation reports
- How to test forms
- Troubleshooting common issues
```

## What We're NOT Building
- Custom admin dashboard (use Stripe dashboard)
- PDF generation (Stripe sends receipts)
- Subscription management UI (use Stripe customer portal)
- Complex reporting (export from Stripe)
- Database storage (optional, can add later)
- Email campaigns (separate from donations)

## Success Criteria
1. Donation form accepts payments in production
2. Enrollment form collects $50 fee
3. School can see all payments in Stripe dashboard
4. Donors receive email receipts from Stripe
5. Forms work on mobile devices

## Code Patterns to Follow

### Form Component Pattern
```typescript
// Keep it simple like SimplifiedDonationForm:
- Single component file
- Built-in validation
- Clear error messages
- Loading states
- Success feedback
```

### API Endpoint Pattern
```typescript
// Like create-payment-intent.ts:
- Check for required environment variables
- Validate input data
- Create Stripe payment intent
- Return client secret
- Log errors
```

### Styling Pattern
```typescript
// Use existing Tailwind classes:
- forest-canopy for primary buttons
- earth-brown for headings
- Standard form field styles
- Existing responsive utilities
```

## Testing Commands
```bash
# Local testing
npm run dev
# Open http://localhost:4321/donate

# Test build
npm run build

# Deploy
git push origin main
# Netlify auto-deploys
```

## Stripe Dashboard Tasks
1. Add webhook endpoint: https://yoursite.com/api/webhooks/stripe
2. Configure email receipts in Stripe
3. Set up customer portal for recurring donors
4. Review test payments before going live

## Timeline Summary
- **Day 1**: 4-6 hours - Make donation form production-ready
- **Day 2**: 4-5 hours - Create enrollment form
- **Day 3**: 3-4 hours - Testing and deployment
- **Total**: 11-15 hours of focused work

## Next Steps After Launch
Once these basics are working, the school can consider:
1. Adding tuition payment plans (Stripe Payment Links)
2. Database integration for donor records
3. Automated thank you emails
4. Donation thermometer widget
5. Recurring donation management portal

This plan focuses on getting working payment collection in place quickly using proven patterns from the existing code.