#!/bin/bash

# Newsletter Management Test Suite Runner
# This script runs all tests for the newsletter management feature

echo "========================================="
echo "Newsletter Management Test Suite"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: This script must be run from the app directory${NC}"
    exit 1
fi

# Function to run a test suite
run_test_suite() {
    local test_name=$1
    local test_command=$2
    
    echo -e "${YELLOW}Running $test_name...${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✓ $test_name passed${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ $test_name failed${NC}"
        echo ""
        return 1
    fi
}

# Track failures
FAILED=0

# 1. Run Unit Tests (API endpoints and database operations)
run_test_suite "API Endpoint Tests" "npm run test tests/newsletter/api-endpoints.test.ts" || ((FAILED++))
run_test_suite "Database Operation Tests" "npm run test tests/newsletter/database-operations.test.ts" || ((FAILED++))

# 2. Run Component Tests (if in development environment)
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}Starting development server for component tests...${NC}"
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    sleep 5
    
    # Run Playwright tests
    run_test_suite "Newsletter Component Tests" "npx playwright test tests/newsletter/newsletter-component.test.ts" || ((FAILED++))
    run_test_suite "Admin Interface Tests" "npx playwright test tests/newsletter/admin-interface.test.ts" || ((FAILED++))
    
    # Stop development server
    kill $DEV_PID
else
    echo -e "${YELLOW}Skipping component tests in production environment${NC}"
fi

# 3. Run Integration Tests (manual verification checklist)
echo ""
echo "========================================="
echo "Manual Integration Tests Checklist"
echo "========================================="
echo ""
echo "Please verify the following manually:"
echo ""
echo "1. Newsletter Signup Component:"
echo "   □ Footer newsletter signup is visible on all pages"
echo "   □ Email validation works (try invalid emails)"
echo "   □ Success message appears after signup"
echo "   □ Error message appears for duplicate emails"
echo "   □ Form resets after successful submission"
echo ""
echo "2. API Endpoints:"
echo "   □ POST /api/newsletter/subscribe accepts new signups"
echo "   □ Handles resubscription of unsubscribed users"
echo "   □ Returns appropriate error messages"
echo ""
echo "3. Admin Interface (/admin/newsletter):"
echo "   □ Requires authentication"
echo "   □ Shows correct statistics"
echo "   □ Lists subscribers with filters"
echo "   □ Search functionality works"
echo "   □ Export to CSV downloads file"
echo "   □ Unsubscribe functionality works with confirmation"
echo ""
echo "4. Database Operations:"
echo "   □ Subscribers are saved to newsletter_subscribers table"
echo "   □ Signup attempts are logged"
echo "   □ Unsubscribe updates status correctly"
echo "   □ Statistics queries return accurate data"
echo ""
echo "5. Error Handling:"
echo "   □ Invalid email addresses are rejected"
echo "   □ Database errors show user-friendly messages"
echo "   □ Network errors are handled gracefully"
echo ""

# Summary
echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All automated tests passed!${NC}"
    echo ""
    echo "Please complete the manual integration tests above to ensure"
    echo "the newsletter management system is working correctly."
else
    echo -e "${RED}$FAILED test suite(s) failed${NC}"
    echo ""
    echo "Please fix the failing tests before proceeding with manual testing."
    exit 1
fi

echo ""
echo "Test run completed at $(date)"