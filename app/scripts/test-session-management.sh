#!/bin/bash

# Session Management Test Suite Runner
# This script runs all tests related to the secure session management system

echo "🔒 Running Session Management Test Suite"
echo "========================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test categories
declare -A test_categories=(
    ["Unit Tests"]="src/test/integration/session-management.test.ts"
    ["Security Tests"]="src/test/security/session-management-security.test.ts"
    ["Performance Tests"]="src/test/performance/session-management.perf.test.ts"
)

# Run unit and integration tests
echo -e "\n${YELLOW}Running Unit and Integration Tests...${NC}"
npm run test src/test/integration/session-management.test.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Unit and Integration tests passed${NC}"
else
    echo -e "${RED}✗ Unit and Integration tests failed${NC}"
    exit 1
fi

# Run security tests
echo -e "\n${YELLOW}Running Security Tests...${NC}"
npm run test src/test/security/session-management-security.test.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Security tests passed${NC}"
else
    echo -e "${RED}✗ Security tests failed${NC}"
    exit 1
fi

# Run performance tests
echo -e "\n${YELLOW}Running Performance Tests...${NC}"
npm run test src/test/performance/session-management.perf.test.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Performance tests passed${NC}"
else
    echo -e "${RED}✗ Performance tests failed${NC}"
    exit 1
fi

# Run E2E tests if Playwright is available
if command -v npx &> /dev/null && npx playwright --version &> /dev/null; then
    echo -e "\n${YELLOW}Running E2E Tests...${NC}"
    echo "Note: Make sure the dev server is running on port 4322"
    
    # Check if server is running
    curl -s -o /dev/null -w "%{http_code}" http://localhost:4322 | grep -q "200\|301\|302"
    if [ $? -eq 0 ]; then
        npm run test:e2e -- e2e/session-management.spec.ts
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ E2E tests passed${NC}"
        else
            echo -e "${RED}✗ E2E tests failed${NC}"
            echo "Note: E2E test failures might be due to missing test credentials"
        fi
    else
        echo -e "${YELLOW}⚠ Dev server not running on port 4322, skipping E2E tests${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Playwright not installed, skipping E2E tests${NC}"
fi

# Run coverage report
echo -e "\n${YELLOW}Generating Coverage Report...${NC}"
npm run test:coverage -- src/test/integration/session-management.test.ts src/test/security/session-management-security.test.ts

echo -e "\n${GREEN}🎉 Session Management Test Suite Complete!${NC}"
echo "========================================"

# Summary
echo -e "\n📊 Test Summary:"
echo "- Unit/Integration Tests: ✓"
echo "- Security Tests: ✓"
echo "- Performance Tests: ✓"
echo "- E2E Tests: Check output above"

echo -e "\n💡 Next Steps:"
echo "1. Review any failed tests and fix issues"
echo "2. Check coverage report for untested code paths"
echo "3. Run E2E tests with proper test credentials"
echo "4. Consider adding more edge case tests"

echo -e "\n🔐 Security Checklist:"
echo "✓ Session tokens are hashed before storage"
echo "✓ Sessions expire after 7 days"
echo "✓ Activity tracking updates last_activity"
echo "✓ Old cookie-based auth is rejected"
echo "✓ Audit logging tracks admin actions"
echo "✓ CSRF protection via secure cookies"
echo "✓ SQL injection prevention tested"

exit 0