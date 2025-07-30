# Session Management Testing Guide

## Overview

This document describes the comprehensive test suite for the secure session management system that replaced the insecure cookie-based authentication.

## Test Coverage

### 1. Unit and Integration Tests (`src/test/integration/session-management.test.ts`)

These tests verify the core functionality of the session management system:

#### Session Creation
- ✓ Creates new sessions on login with secure tokens
- ✓ Handles session creation failures gracefully
- ✓ Sets session expiry to exactly 7 days from creation
- ✓ Stores hashed tokens in the database (never plain text)

#### Session Validation
- ✓ Validates active sessions successfully
- ✓ Rejects expired sessions
- ✓ Rejects inactive sessions
- ✓ Updates last activity when threshold (15 minutes) is exceeded
- ✓ Skips activity update when within threshold

#### Session Invalidation
- ✓ Invalidates individual sessions on logout
- ✓ Handles invalidation errors gracefully
- ✓ Invalidates all user sessions when needed

#### Audit Logging
- ✓ Logs admin actions with full context
- ✓ Continues operation even if audit logging fails

#### Integration with Auth Check
- ✓ Authenticates users with valid session cookies
- ✓ Creates new sessions for authenticated users without sessions
- ✓ Clears invalid session cookies
- ✓ Rejects non-admin users

### 2. Security Tests (`src/test/security/session-management-security.test.ts`)

These tests ensure the system is secure against common attacks:

#### Token Security
- ✓ Generates cryptographically secure tokens
- ✓ Properly hashes tokens before storage
- ✓ Never stores plain tokens in database

#### Session Hijacking Protection
- ✓ Tracks IP addresses for anomaly detection
- ✓ Records user agents for security monitoring

#### Session Fixation Protection
- ✓ Invalidates pre-existing sessions on new login
- ✓ Issues new tokens after authentication

#### Timing Attack Prevention
- ✓ Uses constant-time token comparison

#### CSRF Protection
- ✓ Sets appropriate cookie security flags (httpOnly, sameSite)

#### Privilege Escalation Prevention
- ✓ Prevents non-admin users from creating admin sessions
- ✓ Validates admin email on every request

#### SQL Injection Prevention
- ✓ Safely handles malicious input in tokens

#### Audit Trail Security
- ✓ Logs security-relevant events
- ✓ Prevents sensitive data exposure in logs

### 3. Performance Tests (`src/test/performance/session-management.perf.test.ts`)

These tests ensure the system performs well under load:

#### Session Operations
- ✓ Creates sessions in under 10ms average
- ✓ Handles 50 concurrent session creations efficiently
- ✓ Validates sessions in under 2ms average
- ✓ Performs faster when no activity update needed

#### Authentication Performance
- ✓ Full auth checks complete in under 5ms average
- ✓ Token hashing in under 0.1ms

#### Stress Testing
- ✓ Handles 200 concurrent validations gracefully
- ✓ Maintains performance under high load
- ✓ No memory leaks during repeated operations

### 4. End-to-End Tests (`e2e/session-management.spec.ts`)

These tests verify the system works correctly in a real browser:

#### Session Lifecycle
- ✓ Creates secure session cookies on admin login
- ✓ Denies session creation for non-admin users
- ✓ Allows access to admin pages with valid session
- ✓ Redirects to login with invalid session
- ✓ Updates activity on navigation

#### Logout Functionality
- ✓ Invalidates session on logout
- ✓ Prevents reuse of invalidated sessions

#### Security Features
- ✓ Rejects old cookie-based authentication
- ✓ Protects against session fixation
- ✓ Handles concurrent sessions correctly

#### Middleware Integration
- ✓ Admins bypass coming soon mode
- ✓ Non-admins redirected when coming soon enabled

## Running Tests

### Quick Test
```bash
# Run all session management tests
./scripts/test-session-management.sh
```

### Individual Test Suites
```bash
# Unit and Integration tests
npm run test src/test/integration/session-management.test.ts

# Security tests
npm run test src/test/security/session-management-security.test.ts

# Performance tests
npm run test src/test/performance/session-management.perf.test.ts

# E2E tests (requires dev server on port 4322)
npm run test:e2e -- e2e/session-management.spec.ts
```

### Coverage Report
```bash
npm run test:coverage -- src/test/integration/session-management.test.ts src/test/security/session-management-security.test.ts
```

## Test Environment Setup

### Prerequisites
1. Node.js and npm installed
2. Dev server running on port 4322 (for E2E tests)
3. Test admin credentials in environment variables (for E2E tests)

### Environment Variables for E2E Tests
```bash
export ADMIN_TEST_PASSWORD="your-test-password"
```

## Security Verification Checklist

When running tests, verify:

1. **Old Authentication Rejected**: The old `sbms-admin-auth=true` cookie no longer grants access
2. **Token Security**: All tokens are hashed with SHA-256 before storage
3. **Session Expiry**: Sessions expire after exactly 7 days
4. **Activity Tracking**: Last activity updates every 15 minutes
5. **Audit Logging**: All admin actions are logged with context
6. **Cookie Security**: Cookies have httpOnly and sameSite flags set
7. **Session Isolation**: Each login creates a unique session

## Troubleshooting

### Common Issues

1. **E2E Tests Fail**: Ensure dev server is running on port 4322
2. **Auth Tests Fail**: Check test admin credentials are correct
3. **Performance Tests Slow**: Close other applications to free resources
4. **Coverage Low**: Add tests for uncovered edge cases

### Debug Mode

Run tests with verbose output:
```bash
npm run test -- --reporter=verbose src/test/integration/session-management.test.ts
```

## Continuous Integration

Add to your CI pipeline:
```yaml
- name: Run Session Management Tests
  run: |
    npm run test src/test/integration/session-management.test.ts
    npm run test src/test/security/session-management-security.test.ts
    npm run test src/test/performance/session-management.perf.test.ts
```

## Future Improvements

Consider adding tests for:
1. Session rotation on privilege changes
2. Geographic anomaly detection
3. Rate limiting for failed validations
4. Session analytics and reporting
5. Multi-factor authentication integration