# Content Verification Testing Guide

This guide explains the automated content verification test suite designed to ensure factual information accuracy across the SpicebushWebapp.

## Overview

The content verification test suite catches discrepancies in business information, tuition details, staff information, and ensures consistency across all pages. These tests help maintain trust and reliability by automatically detecting content errors that could confuse users or undermine the site's credibility.

## Test Suite Components

### 1. Core Content Verification Tests
**File**: `src/test/content-verification/content-verification.test.ts`

Validates:
- Business information consistency (phone, email, address)
- Hours information accuracy and formatting
- Staff information completeness and correctness
- Tuition and program information accuracy
- Cross-page consistency of factual data
- Data integrity and format validation

### 2. Database vs Display Alignment Tests
**File**: `src/test/content-verification/database-display-alignment.test.ts`

Verifies:
- Content stored in database matches displayed content
- Proper formatting for display readiness
- Consistent data structures across content types
- Settings alignment with content data

### 3. Cross-Page Consistency Tests
**File**: `src/test/content-verification/cross-page-consistency.test.ts`

Ensures:
- Identical contact information across all references
- Consistent school year across all content types
- Extended care hours consistency
- Staff information consistency
- Pricing relationship consistency

### 4. End-to-End Content Verification
**File**: `e2e/content-verification-e2e.spec.ts`

Tests the complete pipeline from database to browser:
- Contact information display across pages
- Hours information display consistency
- Staff information rendering
- Program and tuition information display
- Form and interactive element consistency
- Meta information and accessibility

## Configuration

### Test Configuration
**File**: `src/test/content-verification/content-verification.config.ts`

Central configuration for all test expectations:
- Business information constants
- Staff expectations and validation patterns
- Hours and scheduling information
- Tuition and pricing ranges
- Data validation patterns
- Error thresholds

**Update this file when site content changes to keep tests current.**

## Running the Tests

### Quick Start
```bash
# Run all content verification tests
npm run test:content-verification

# Run with continuous watching
npm run test:content-verification:watch

# Run complete suite including E2E tests
npm run test:content-verification:full
```

### Individual Test Suites
```bash
# Core content verification
npm run test:content-verification:unit

# Database-display alignment
npm run test:content-verification:alignment

# Cross-page consistency
npm run test:content-verification:consistency

# End-to-end browser tests
npm run test:content-verification:e2e

# All unit tests without E2E
npm run test:content-verification:all
```

### Test Runner Script
```bash
# Run comprehensive test suite
node scripts/run-content-verification-tests.js

# Include E2E tests (requires dev server)
node scripts/run-content-verification-tests.js --include-e2e
```

## What the Tests Verify

### Business Information Consistency
- ✅ Phone number format: `(484) 202-0712`
- ✅ Email address: `information@spicebushmontessori.org`
- ✅ Complete address with all components
- ✅ Social media URL consistency
- ✅ Ages served: `3 to 6 years`
- ✅ School year format: `2025-2026`
- ✅ Extended care hours: `5:30 PM`

### Staff Information Correctness
- ✅ Complete staff profiles with all required fields
- ✅ Proper photo paths and formats
- ✅ Consistent role titles and formatting
- ✅ Valid start years (not before school founding)
- ✅ Proper display ordering

### Hours Information Accuracy
- ✅ Complete 7-day weekly schedule
- ✅ Proper time format (12-hour with AM/PM)
- ✅ Consistent extended care messaging
- ✅ Correct day-of-week ordering

### Tuition and Program Information
- ✅ Complete program offerings with valid details
- ✅ Tuition rates within reasonable ranges
- ✅ Matching program IDs between programs and rates
- ✅ Consistent school year across all tuition data
- ✅ Proper extended care pricing relationships

### Cross-Page Consistency
- ✅ Identical contact information everywhere
- ✅ Consistent extended care hours across references
- ✅ Uniform school year usage
- ✅ Matching staff information across displays
- ✅ Pricing relationship consistency

## Test Environment Requirements

### For Unit and Integration Tests
- Node.js environment with project dependencies
- Database connection (for integration tests)
- Environment variables properly configured

### For End-to-End Tests
- Development server running on port 4321
- Browser automation environment (Playwright)
- All site pages accessible

## Updating Tests When Content Changes

### 1. Update Configuration
When business information changes, update:
```typescript
// src/test/content-verification/content-verification.config.ts
export const CONTENT_VERIFICATION_CONFIG = {
  BUSINESS_INFO: {
    PHONE: '(XXX) XXX-XXXX',        // Update phone number
    EMAIL: 'new@email.com',          // Update email
    SCHOOL_YEAR: '2026-2027',        // Update school year
    // ... other updates
  }
};
```

### 2. Update E2E Test Constants
```typescript
// e2e/content-verification-e2e.spec.ts
const EXPECTED_DATA = {
  PHONE: '(XXX) XXX-XXXX',          // Match config updates
  EMAIL: 'new@email.com',           // Match config updates
  // ... other updates
};
```

### 3. Add New Content Types
To verify new content types:

1. Add validation rules to the config
2. Extend the core verification test
3. Update cross-page consistency checks
4. Add E2E verification for new content

## Troubleshooting

### Common Test Failures

**Database Connection Issues**
```bash
# Check database environment variables
echo $DB_READONLY_HOST
echo $DB_READONLY_USER

# Test database connection
npm run test:quickactions
```

**Content Format Mismatches**
- Check that content files match expected structure
- Verify frontmatter fields are correctly named
- Ensure data types match expectations

**E2E Test Failures**
```bash
# Start development server first
npm run dev

# Then run E2E tests in another terminal
npm run test:content-verification:e2e
```

**Inconsistent Content Across Pages**
- Review content files for consistency
- Check that templates use the same data sources
- Verify component props are correctly passed

### Debug Mode
```bash
# Run tests with detailed output
npm run test:content-verification -- --reporter=verbose

# Run specific test file with debugging
npm run test:content-verification:unit -- --reporter=verbose
```

## Integration with CI/CD

### GitHub Actions Integration
Add to your workflow:
```yaml
- name: Run Content Verification Tests
  run: npm run test:content-verification:all

- name: Run E2E Content Verification
  run: |
    npm run dev &
    sleep 10
    npm run test:content-verification:e2e
```

### Pre-deployment Checks
Run before deploying:
```bash
# Quick verification
npm run test:content-verification

# Full verification including browser tests
npm run test:content-verification:full
```

## Benefits

### Automatic Content Quality Assurance
- Catches typos and formatting errors
- Ensures consistent information across all pages
- Validates business information accuracy
- Prevents pricing and program detail mistakes

### Trust and Reliability
- Maintains consistent contact information
- Ensures accurate program and tuition details
- Prevents user confusion from inconsistent data
- Builds confidence in site reliability

### Development Efficiency
- Catches content errors early in development
- Provides clear feedback on what needs fixing
- Reduces manual content review time
- Prevents embarrassing content mistakes in production

## Maintenance

### Regular Updates
- Review and update test expectations when content changes
- Add new verification rules as site grows
- Update configuration when business information changes
- Extend tests to cover new content types

### Performance Monitoring
- Tests should complete within reasonable time limits
- Monitor for flaky tests and improve reliability
- Optimize database queries in verification tests
- Balance comprehensive coverage with execution speed

---

For questions or issues with content verification testing, refer to the project documentation or contact the development team.