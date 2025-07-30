# Settings Management Test Suite

This directory contains comprehensive tests for the settings management implementation, covering API endpoints, form validation, audit logging, and browser functionality.

## Test Files

### API Tests
- **`settings-api.test.js`** - Tests REST API endpoints for GET/POST operations
- **`settings-validation.test.js`** - Tests data validation and type handling
- **`settings-audit.test.js`** - Tests audit logging functionality

### Browser Tests
- **`settings-browser.test.js`** - End-to-end browser tests using Playwright

## Prerequisites

1. **Development server running** on port 4322
2. **Admin authentication** - You'll need to update the `mockAuthCookie` variable in test files with a valid admin session cookie
3. **Node.js dependencies** - Install test dependencies:

```bash
cd tests
npm install
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All API Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# API functionality tests
npm run test:api

# Form validation tests  
npm run test:validation

# Audit logging tests
npm run test:audit

# Browser/UI tests
npm run test:browser
```

### Run All Tests (API + Browser)
```bash
npm run test:all
```

### Development Mode
```bash
# Watch mode for API tests
npm run test:watch

# Test coverage report
npm run test:coverage
```

## Test Coverage

### 1. API Endpoint Testing (`settings-api.test.js`)
- ✅ Authentication handling (401 responses)
- ✅ GET endpoint returns proper JSON structure
- ✅ POST endpoint accepts and saves data
- ✅ Boolean value handling (true/false conversion)
- ✅ Decimal precision preservation
- ✅ Multiple setting updates in single request
- ✅ Response structure validation
- ✅ Error handling for invalid requests

### 2. Data Validation Testing (`settings-validation.test.js`)
- ✅ School year format validation (YYYY-YYYY pattern)
- ✅ Discount rate boundary testing (0.00 to 1.00)
- ✅ Date format validation (ISO date strings)
- ✅ Boolean value conversion (true/false/"true"/"false")
- ✅ Text field handling (empty strings, special characters, long text)
- ✅ Data type consistency across save/load cycles
- ✅ Edge case handling (negative numbers, invalid formats)

### 3. Audit Logging Testing (`settings-audit.test.js`)
- ✅ Audit log creation for setting changes
- ✅ Multiple audit logs for batch updates
- ✅ IP address capture from request headers
- ✅ User session information logging
- ✅ Timestamp accuracy
- ✅ Error resilience (settings save even if audit fails)
- ✅ Performance impact assessment
- ✅ Concurrent update handling

### 4. Browser/UI Testing (`settings-browser.test.js`)
- ✅ Page loading and rendering
- ✅ Form field visibility and accessibility
- ✅ Save button state management (disabled/enabled)
- ✅ Form submission and success feedback
- ✅ Toggle switch functionality
- ✅ Input validation (numbers, dates, patterns) 
- ✅ Form reset functionality
- ✅ Loading states during submission
- ✅ Error handling and user feedback
- ✅ Form state persistence
- ✅ Special character handling
- ✅ Mobile responsiveness
- ✅ Accessibility compliance

## Authentication Setup

Before running tests, you need to set up authentication:

1. **Log into your admin panel** in a browser
2. **Open browser dev tools** and go to Application/Storage > Cookies
3. **Copy the session cookie value**
4. **Update the `mockAuthCookie` variable** in each test file:

```javascript
const mockAuthCookie = 'your-actual-session-cookie-here';
```

Alternatively, you can set an environment variable:

```bash
export TEST_AUTH_COOKIE="your-session-cookie"
```

## Expected Test Results

### Passing Scenarios
- All API endpoints should return appropriate status codes
- Form data should persist correctly across save/load cycles
- Validation should work for all input types
- UI should provide appropriate feedback for all user actions
- Audit logs should be created for all setting changes

### Expected Warnings
Some tests may show warnings about:
- Original settings not being fetchable (normal for first run)
- Network timeouts (adjust timeout in jest.setup.js if needed)

## Troubleshooting

### Tests Failing Due to Authentication
- Verify your admin session cookie is valid and not expired
- Make sure you're using the correct cookie name for your auth system
- Check that the admin authentication endpoints are working

### Browser Tests Not Running
- Ensure Playwright browsers are installed: `npx playwright install`
- Verify the development server is running on port 4322
- Check that the settings page URL is accessible

### API Tests Timing Out
- Increase timeout in `jest.setup.js` if your server is slow
- Check that your database connections are working properly
- Verify the Supabase configuration is correct

### Database/Audit Issues
- Ensure your `audit_logs` table exists and is accessible
- Verify the AuditLogger class is working correctly
- Check database permissions for the test user

## Extending Tests

To add new tests:

1. **API Tests** - Add to existing `describe` blocks or create new ones
2. **Validation Tests** - Add specific validation scenarios for new fields
3. **Browser Tests** - Add new UI interaction tests
4. **Audit Tests** - Add tests for new audit scenarios

Example new test:
```javascript
test('should handle new setting field', async () => {
  const testUpdate = {
    new_setting_field: 'test value'
  };
  
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': mockAuthCookie
    },
    body: JSON.stringify(testUpdate)
  });
  
  expect(response.status).toBe(200);
});
```

## Production Testing

For production verification:
1. Run the browser tests against your production URL
2. Update the `baseURL` in `playwright.config.js`
3. Use production admin credentials
4. Consider running tests against a staging environment first