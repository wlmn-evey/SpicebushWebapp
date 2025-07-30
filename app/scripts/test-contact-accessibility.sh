#!/bin/bash

# Contact Page Accessibility Test Runner
# Runs all automated tests for the contact page accessibility fixes

echo "🧪 Contact Page Accessibility Test Suite"
echo "======================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run a test and track results
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running: $test_name${NC}"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name passed${NC}\n"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ $test_name failed${NC}\n"
        ((TESTS_FAILED++))
    fi
}

# Unit Tests
echo "📋 Unit Tests"
echo "-------------"
run_test "Icon Accessibility Tests" "npm run test src/test/accessibility/contact-page-icons.test.ts"
run_test "Map Accessibility Tests" "npm run test src/test/accessibility/contact-page-map.test.ts"

# Integration Tests
echo "🔄 Integration Tests"
echo "-------------------"
run_test "Contact Form Integration" "npm run test src/test/integration/contact-form.integration.test.ts"

# E2E Tests
echo "🌐 E2E Tests"
echo "------------"
run_test "Contact Page Accessibility E2E" "npm run test:e2e e2e/contact-page-accessibility.spec.ts"
run_test "Contact Form E2E" "npm run test:e2e e2e/contact-form.spec.ts"

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! The accessibility fixes are working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
fi