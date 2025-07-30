# Newsletter Management Testing Guide

This guide provides comprehensive instructions for verifying the newsletter management implementation.

## Overview

The newsletter management system includes:
- Public newsletter signup component (3 variants)
- API endpoints for subscription management
- Admin interface for managing subscribers
- Database operations for data persistence

## Automated Tests

### Running All Tests
```bash
cd app
./tests/newsletter/run-newsletter-tests.sh
```

### Running Individual Test Suites

#### 1. API Endpoint Tests
```bash
npm run test tests/newsletter/api-endpoints.test.ts
```

Tests coverage:
- Newsletter subscription endpoint (`/api/newsletter/subscribe`)
- Admin newsletter endpoint (`/api/admin/newsletter`)
- Authentication requirements
- Error handling
- Data validation

#### 2. Database Operation Tests
```bash
npm run test tests/newsletter/database-operations.test.ts
```

Tests coverage:
- `subscribeToNewsletter()` function
- `unsubscribeFromNewsletter()` function
- `getNewsletterSubscribers()` function
- `getNewsletterStats()` function
- `logNewsletterSignup()` function
- Error handling and edge cases

#### 3. Component Browser Tests
```bash
# Start dev server first
npm run dev

# In another terminal
npx playwright test tests/newsletter/newsletter-component.test.ts
```

Tests coverage:
- Newsletter signup form functionality
- Three component variants (footer, card, inline)
- Form validation
- Success/error messaging
- Responsive design
- Accessibility

#### 4. Admin Interface Tests
```bash
# With dev server running
npx playwright test tests/newsletter/admin-interface.test.ts
```

Tests coverage:
- Authentication requirements
- Statistics display
- Subscriber list and filtering
- Search functionality
- Export to CSV
- Unsubscribe functionality

## Manual Testing Checklist

### 1. Newsletter Signup Component

#### Footer Variant
1. Navigate to any page on the site
2. Scroll to the footer
3. Verify newsletter signup section is visible
4. Test email signup:
   - Enter valid email → Should show success message
   - Enter same email again → Should show "already subscribed" message
   - Enter invalid email → Should show validation error
   - Leave empty and submit → Should show required field error

#### Card Variant (if implemented on any page)
1. Navigate to page with card variant
2. Verify all fields are visible (first name, last name, email)
3. Test form submission with all fields
4. Verify styling matches design

#### Inline Variant (if implemented on any page)
1. Navigate to page with inline variant
2. Verify compact layout
3. Test form submission
4. Verify responsive behavior

### 2. API Endpoints

#### Subscribe Endpoint
```bash
# Test successful subscription
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test duplicate subscription
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test invalid email
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email"}'
```

#### Admin Endpoint (requires authentication)
```bash
# Get statistics
curl http://localhost:4321/api/admin/newsletter?action=stats \
  -H "Cookie: sb-auth-token=YOUR_AUTH_TOKEN"

# Get subscribers
curl http://localhost:4321/api/admin/newsletter \
  -H "Cookie: sb-auth-token=YOUR_AUTH_TOKEN"

# Export CSV
curl http://localhost:4321/api/admin/newsletter?action=export \
  -H "Cookie: sb-auth-token=YOUR_AUTH_TOKEN" \
  -o subscribers.csv
```

### 3. Admin Interface

1. **Authentication**
   - Navigate to `/admin/newsletter` without logging in
   - Should redirect to login page
   - Log in as admin
   - Should access newsletter management

2. **Statistics Dashboard**
   - Verify 4 stat cards display:
     - Total Subscribers
     - Active Subscribers
     - Last 30 Days signups
     - Unsubscribed count
   - Numbers should match database

3. **Subscriber List**
   - Verify table shows subscriber details
   - Test status filter (Active/Unsubscribed/All)
   - Test type filter (All Types/General/Parents/Staff)
   - Verify pagination if many subscribers

4. **Search Functionality**
   - Search by email
   - Search by name
   - Verify real-time filtering

5. **Export Function**
   - Click "Export to CSV" button
   - Verify file downloads
   - Open CSV and verify format
   - Check data accuracy

6. **Unsubscribe Function**
   - Click unsubscribe button on a subscriber
   - Confirm in dialog
   - Verify subscriber status changes
   - Check success notification

### 4. Database Verification

Connect to the database and verify:

```sql
-- Check subscribers table
SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 10;

-- Check statistics
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active,
  COUNT(CASE WHEN subscription_status = 'unsubscribed' THEN 1 END) as unsubscribed
FROM newsletter_subscribers;

-- Check signup logs
SELECT * FROM newsletter_signup_logs ORDER BY created_at DESC LIMIT 10;

-- Check type breakdown
SELECT subscription_type, COUNT(*) 
FROM newsletter_subscribers 
WHERE subscription_status = 'active' 
GROUP BY subscription_type;
```

### 5. Error Scenarios

1. **Network Errors**
   - Disconnect network while submitting form
   - Should show appropriate error message

2. **Server Errors**
   - Stop the server and try to submit
   - Should handle gracefully

3. **Database Errors**
   - If possible, simulate database connection issue
   - Should show user-friendly error

### 6. Performance Testing

1. **Load Time**
   - Newsletter component should not slow page load
   - Admin interface should load quickly

2. **Large Dataset**
   - Test with 1000+ subscribers
   - Verify pagination works
   - Check export performance

### 7. Security Testing

1. **SQL Injection**
   - Try SQL injection in email field
   - Should be properly sanitized

2. **XSS Prevention**
   - Try entering `<script>alert('XSS')</script>` in fields
   - Should be escaped properly

3. **Authentication**
   - Verify admin endpoints require authentication
   - Check session handling

## Troubleshooting

### Common Issues

1. **Tests fail with "Module not found"**
   - Run `npm install` to ensure dependencies are installed
   - Check import paths in test files

2. **Playwright tests fail**
   - Ensure dev server is running (`npm run dev`)
   - Check browser installation: `npx playwright install`

3. **Database connection errors**
   - Verify DATABASE_URL in `.env`
   - Check database is running
   - Run migrations if needed

4. **Authentication issues in tests**
   - Ensure test uses proper mock authentication
   - Check cookie handling in tests

## Reporting Issues

When reporting test failures:
1. Include full error message
2. Specify which test suite failed
3. Note any recent changes
4. Include environment details (OS, Node version, etc.)

## Next Steps

After all tests pass:
1. Deploy to staging environment
2. Run smoke tests on staging
3. Monitor for any errors
4. Deploy to production with confidence