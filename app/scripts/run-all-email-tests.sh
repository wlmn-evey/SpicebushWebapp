#!/bin/bash

# Email Service Test Runner
# Runs all email-related tests and generates a report

echo "======================================"
echo "Spicebush Email Service Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to run a test and check result
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    echo "Command: $test_command"
    echo "--------------------------------------"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        ((PASSED++))
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        ((FAILED++))
    fi
    echo ""
}

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# 1. Run unit tests
run_test "Email Service Unit Tests" "npm run test -- src/test/integration/email-service.test.ts"

# 2. Run E2E tests (if Playwright is set up)
if [ -f "playwright.config.ts" ]; then
    run_test "Email Service E2E Tests" "npm run test:e2e -- e2e/email-service-complete.spec.ts"
else
    echo -e "${YELLOW}Skipping E2E tests (Playwright not configured)${NC}"
    echo ""
fi

# 3. Check email service configuration
echo -e "${YELLOW}Checking Email Service Configuration${NC}"
echo "--------------------------------------"
node scripts/test-email-service.js --check-only 2>/dev/null || {
    echo -e "${YELLOW}Run 'node scripts/test-email-service.js' for interactive configuration test${NC}"
}
echo ""

# 4. Run existing email-related tests
if [ -f "e2e/magic-link-auth.spec.ts" ]; then
    run_test "Magic Link Auth E2E Test" "npm run test:e2e -- e2e/magic-link-auth.spec.ts"
fi

if [ -f "e2e/contact-form.spec.ts" ]; then
    run_test "Contact Form E2E Test" "npm run test:e2e -- e2e/contact-form.spec.ts"
fi

if [ -f "e2e/tour-scheduling-verification.spec.ts" ]; then
    run_test "Tour Scheduling E2E Test" "npm run test:e2e -- e2e/tour-scheduling-verification.spec.ts"
fi

# Generate summary
echo "======================================"
echo "Test Summary"
echo "======================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed! ✅${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run interactive email test: node scripts/test-email-functionality.js"
    echo "2. Check email delivery in your inbox"
    echo "3. Verify email formatting and links"
    echo "4. Test in production environment"
exitcode=0
else
    echo -e "${RED}Some tests failed. Please check the output above.${NC}"
    exitcode=1
fi

echo ""
echo "For detailed email testing, run:"
echo "  node scripts/test-email-functionality.js"
echo ""

exit $exitcode