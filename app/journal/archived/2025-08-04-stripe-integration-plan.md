# Stripe Payment Integration - Architectural Plan
**Date:** 2025-08-04
**Project:** Spicebush Montessori Website
**Branch:** testing
**Stripe Restricted Key:** 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

## Executive Summary

This document outlines the comprehensive plan for integrating Stripe payment processing into the Spicebush Montessori website. The integration will enable secure payment collection for donations, tuition payments, enrollment applications, and other school-related fees.

## Current State Analysis

### Existing Forms Requiring Payment Integration

1. **Donation Forms** (Already partially integrated)
   - `/src/components/DonationForm.tsx` - Basic Stripe integration exists
   - `/src/components/SimplifiedDonationForm.tsx` - Enhanced version with giving levels
   - API endpoint exists: `/api/donations/create-payment-intent.ts`
   - Status: Needs production key configuration and testing

2. **Tour Scheduling Form**
   - `/src/pages/admissions/schedule-tour.astro`
   - Currently free, may need deposit option
   - API endpoint exists: `/api/schedule-tour.ts` (needs creation)

3. **Tuition Management System**
   - `/src/pages/admin/tuition/` - Admin interface exists
   - `/src/pages/admissions/tuition-calculator.astro` - Calculator exists
   - No payment collection currently implemented

4. **Missing Forms (Need Creation)**
   - Enrollment Application Form (with application fee)
   - Tuition Payment Form (monthly/annual payments)
   - After-School Program Registration
   - Summer Camp Registration

### Current Infrastructure

- **Framework:** Astro with TypeScript
- **Database:** Supabase (PostgreSQL)
- **Styling:** Tailwind CSS
- **Existing Stripe Dependencies:** @stripe/stripe-js, @stripe/react-stripe-js
- **Environment:** .env file exists but missing Stripe production keys

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Components                      │
├───────────────┬────────────────┬────────────────────────────┤
│ Donation Form │ Enrollment Form │ Tuition Payment Portal    │
└───────┬───────┴────────┬───────┴────────────┬───────────────┘
        │                │                     │
        └────────────────┼─────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   API Gateway       │
              │  /api/payments/*    │
              └──────────┬──────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
    ┌────▼─────┐  ┌─────▼──────┐  ┌────▼─────┐
    │  Stripe  │  │  Supabase  │  │  Email   │
    │    API   │  │  Database  │  │  Service │
    └──────────┘  └────────────┘  └──────────┘
```

### Component Interaction Flow

1. **Payment Initiation**
   - User fills form → Frontend validates → API creates payment intent
   - Stripe Elements collects card details → Confirms payment
   - Webhook processes result → Database updated → Email sent

2. **Subscription Management** (for recurring tuition)
   - Customer created/retrieved → Subscription created
   - Payment method saved → Recurring billing automated
   - Parent portal for management → Update/cancel options

### Data Models

#### Payments Table (Supabase)
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_payment_intent_id TEXT UNIQUE,
  type TEXT NOT NULL, -- 'donation', 'tuition', 'enrollment', 'program'
  amount INTEGER NOT NULL, -- in cents
  status TEXT NOT NULL, -- 'pending', 'processing', 'succeeded', 'failed'
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Enrollments Table
```sql
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID REFERENCES payments(id),
  child_name TEXT NOT NULL,
  child_birthdate DATE NOT NULL,
  parent_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  program_type TEXT NOT NULL,
  start_date DATE,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'waitlisted'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### Tuition Subscriptions Table
```sql
CREATE TABLE tuition_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT NOT NULL,
  student_id UUID,
  amount INTEGER NOT NULL, -- monthly amount in cents
  status TEXT NOT NULL, -- 'active', 'paused', 'cancelled'
  next_payment_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Implementation Roadmap

### Phase 1: Foundation & Security (Week 1)

#### Micro-Tasks:

1. **Task 1.1: Environment Configuration**
   - Add Stripe production keys to .env
   - Create .env.example with placeholders
   - Update environment type definitions
   - Test key loading in development

2. **Task 1.2: Database Schema Setup**
   - Create payments table migration
   - Create enrollments table migration
   - Create tuition_subscriptions table migration
   - Add indexes for performance

3. **Task 1.3: Stripe Service Module**
   - Create `/src/lib/stripe-server.ts` for server-side operations
   - Create `/src/lib/stripe-client.ts` for client-side initialization
   - Add type definitions for Stripe objects
   - Create error handling utilities

4. **Task 1.4: Security Middleware**
   - Create webhook signature verification
   - Add CORS configuration for Stripe
   - Implement rate limiting for payment endpoints
   - Add input sanitization

### Phase 2: Core Payment APIs (Week 1-2)

#### Micro-Tasks:

5. **Task 2.1: Payment Intent API**
   - Create `/api/payments/create-intent.ts`
   - Add amount validation and limits
   - Implement metadata handling
   - Add error responses

6. **Task 2.2: Webhook Handler**
   - Create `/api/webhooks/stripe.ts`
   - Handle payment_intent.succeeded event
   - Handle payment_intent.failed event
   - Log events to database

7. **Task 2.3: Payment Status API**
   - Create `/api/payments/status/[id].ts`
   - Implement payment lookup
   - Add authorization checks
   - Return formatted status

8. **Task 2.4: Receipt Generation**
   - Create receipt template
   - Add PDF generation utility
   - Implement email receipt sender
   - Store receipt references

### Phase 3: Enrollment System (Week 2)

#### Micro-Tasks:

9. **Task 3.1: Enrollment Form Component**
   - Create `/src/components/EnrollmentForm.tsx`
   - Add multi-step form flow
   - Implement form validation
   - Add progress indicator

10. **Task 3.2: Enrollment API**
    - Create `/api/enrollment/submit.ts`
    - Add application fee processing
    - Save enrollment data
    - Send confirmation emails

11. **Task 3.3: Enrollment Management**
    - Create admin list view
    - Add approval workflow
    - Implement waitlist logic
    - Add status notifications

12. **Task 3.4: Document Upload**
    - Add file upload for medical forms
    - Implement secure storage
    - Add file type validation
    - Create download endpoints

### Phase 4: Tuition Payment Portal (Week 2-3)

#### Micro-Tasks:

13. **Task 4.1: Tuition Payment Form**
    - Create `/src/components/TuitionPaymentForm.tsx`
    - Add payment schedule options
    - Implement autopay setup
    - Add payment method management

14. **Task 4.2: Subscription Management API**
    - Create `/api/tuition/create-subscription.ts`
    - Add subscription update endpoint
    - Implement pause/resume logic
    - Add cancellation handling

15. **Task 4.3: Parent Portal Page**
    - Create `/parents/payment-portal.astro`
    - Add payment history view
    - Show upcoming payments
    - Add download receipts option

16. **Task 4.4: Payment Reminders**
    - Create reminder email templates
    - Add scheduled job for reminders
    - Implement grace period logic
    - Add late fee handling

### Phase 5: Admin Dashboard (Week 3)

#### Micro-Tasks:

17. **Task 5.1: Payment Dashboard**
    - Create `/admin/payments/index.astro`
    - Add revenue charts
    - Show payment metrics
    - Add export functionality

18. **Task 5.2: Transaction Management**
    - Add refund interface
    - Create adjustment tools
    - Implement dispute handling
    - Add audit logging

19. **Task 5.3: Reporting Tools**
    - Create financial reports
    - Add donor reports
    - Implement tax receipts
    - Add custom date ranges

20. **Task 5.4: Settings Management**
    - Add Stripe key configuration UI
    - Create fee structure settings
    - Add email template editor
    - Implement test mode toggle

### Phase 6: Testing & Quality Assurance (Week 3-4)

#### Micro-Tasks:

21. **Task 6.1: Unit Tests**
    - Test payment calculations
    - Test validation logic
    - Test error handling
    - Test data transformations

22. **Task 6.2: Integration Tests**
    - Test Stripe API calls
    - Test database operations
    - Test email sending
    - Test webhook processing

23. **Task 6.3: End-to-End Tests**
    - Test donation flow
    - Test enrollment flow
    - Test tuition payment flow
    - Test refund process

24. **Task 6.4: Security Audit**
    - Review PCI compliance
    - Test input validation
    - Check for SQL injection
    - Verify HTTPS enforcement

### Phase 7: Deployment & Monitoring (Week 4)

#### Micro-Tasks:

25. **Task 7.1: Production Setup**
    - Configure production Stripe account
    - Set up webhook endpoints
    - Configure environment variables
    - Enable production mode

26. **Task 7.2: Monitoring Setup**
    - Add payment analytics
    - Set up error alerts
    - Configure uptime monitoring
    - Add performance tracking

27. **Task 7.3: Documentation**
    - Create user guides
    - Document admin procedures
    - Add troubleshooting guide
    - Create API documentation

28. **Task 7.4: Launch Preparation**
    - Test with small group
    - Train staff on system
    - Create announcement
    - Plan rollout schedule

## Security Considerations

### PCI Compliance
- Never store card details directly
- Use Stripe Elements for card collection
- Implement HTTPS everywhere
- Regular security updates

### Data Protection
- Encrypt sensitive data at rest
- Use secure session management
- Implement proper access controls
- Regular security audits

### Error Handling
- Never expose internal errors to users
- Log errors securely
- Implement retry logic for failures
- Provide clear user feedback

## Testing Strategy

### Test Coverage Requirements
- Unit tests: 80% code coverage
- Integration tests: All API endpoints
- E2E tests: Critical user journeys
- Security tests: OWASP top 10

### Test Environments
1. **Development:** Local Stripe test mode
2. **Staging:** Test Stripe account with fake data
3. **Production:** Live Stripe with real transactions

### Test Data
- Use Stripe test cards for development
- Create test customer accounts
- Simulate various payment scenarios
- Test edge cases and errors

## API Specifications

### Payment Intent Creation
```typescript
POST /api/payments/create-intent
{
  type: 'donation' | 'tuition' | 'enrollment' | 'program',
  amount: number, // in cents
  currency: 'usd',
  metadata: {
    customerId?: string,
    description: string,
    [key: string]: any
  }
}

Response:
{
  clientSecret: string,
  paymentId: string,
  amount: number,
  status: string
}
```

### Webhook Processing
```typescript
POST /api/webhooks/stripe
Headers: {
  'stripe-signature': string
}
Body: Stripe Event Object

Processing:
1. Verify signature
2. Parse event type
3. Update database
4. Send notifications
5. Return 200 OK
```

## Success Metrics

### Technical Metrics
- Payment success rate > 95%
- API response time < 200ms
- Zero security breaches
- 99.9% uptime

### Business Metrics
- Increased donation conversions
- Reduced administrative burden
- Faster enrollment processing
- Improved parent satisfaction

## Risk Mitigation

### Technical Risks
- **API Downtime:** Implement retry logic and queuing
- **Payment Failures:** Clear error messages and support
- **Data Loss:** Regular backups and audit logs
- **Security Breach:** Regular audits and monitoring

### Business Risks
- **User Adoption:** Provide training and support
- **Compliance Issues:** Regular legal review
- **Financial Disputes:** Clear policies and procedures
- **Integration Complexity:** Phased rollout approach

## Next Steps

1. Review and approve this plan
2. Set up development environment
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews
5. Coordinate with school administration

## Resources Required

### Technical Resources
- Stripe production account
- SSL certificate
- Email service (SendGrid/Postmark)
- Error monitoring (Sentry)

### Human Resources
- Frontend developer
- Backend developer
- QA tester
- Project manager
- School administrator liaison

## Conclusion

This comprehensive plan provides a structured approach to integrating Stripe payment processing into the Spicebush Montessori website. The phased implementation allows for incremental progress while maintaining system stability. Each micro-task is designed to be completed independently and reviewed before moving forward.

The architecture prioritizes security, scalability, and user experience while ensuring compliance with payment processing standards. Regular testing and monitoring will ensure system reliability and performance.