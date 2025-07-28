#!/bin/bash

# Authentication System Test Runner
# This script runs comprehensive tests for the authentication system

set -e

echo "🔐 Starting Authentication System Tests"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if environment is ready
check_environment() {
    echo -e "${YELLOW}Checking environment...${NC}"
    
    # Check if Node is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed${NC}"
        exit 1
    fi
    
    # Check if npm packages are installed
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}Installing dependencies...${NC}"
        npm install
    fi
    
    # Check if Supabase is running
    if ! curl -s http://localhost:54321/rest/v1/ > /dev/null; then
        echo -e "${RED}❌ Supabase is not running. Please start it with 'npx supabase start'${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Environment check passed${NC}"
}

# Run unit tests
run_unit_tests() {
    echo -e "\n${YELLOW}Running Unit Tests...${NC}"
    npm run test:unit -- tests/auth/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Unit tests passed${NC}"
    else
        echo -e "${RED}❌ Unit tests failed${NC}"
        return 1
    fi
}

# Run integration tests
run_integration_tests() {
    echo -e "\n${YELLOW}Running Integration Tests...${NC}"
    npm run test -- tests/auth/integration.test.ts
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Integration tests passed${NC}"
    else
        echo -e "${RED}❌ Integration tests failed${NC}"
        return 1
    fi
}

# Run E2E tests
run_e2e_tests() {
    echo -e "\n${YELLOW}Running E2E Tests...${NC}"
    
    # Start dev server in background
    echo "Starting development server..."
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    echo "Waiting for server to be ready..."
    sleep 10
    
    # Run Playwright tests
    npx playwright test e2e/auth-flow.spec.ts
    E2E_RESULT=$?
    
    # Stop dev server
    kill $DEV_PID
    
    if [ $E2E_RESULT -eq 0 ]; then
        echo -e "${GREEN}✅ E2E tests passed${NC}"
    else
        echo -e "${RED}❌ E2E tests failed${NC}"
        return 1
    fi
}

# Test authentication endpoints directly
test_auth_endpoints() {
    echo -e "\n${YELLOW}Testing Authentication Endpoints...${NC}"
    
    # Test login endpoint
    echo "Testing login endpoint..."
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:54321/auth/v1/token?grant_type=password \
        -H "Content-Type: application/json" \
        -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA" \
        -d '{
            "email": "evey@eveywinters.com",
            "password": "gcb4uvd*pvz*ZGD_hta"
        }')
    
    if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
        echo -e "${GREEN}✅ Login endpoint working${NC}"
    else
        echo -e "${RED}❌ Login endpoint failed${NC}"
        echo "Response: $LOGIN_RESPONSE"
        return 1
    fi
    
    # Extract access token
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    
    # Test user endpoint with token
    echo "Testing user endpoint..."
    USER_RESPONSE=$(curl -s http://localhost:54321/auth/v1/user \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOuoJeHxjNa-NEHl7qWa00fNKZdJ9rHxs9eA")
    
    if echo "$USER_RESPONSE" | grep -q "evey@eveywinters.com"; then
        echo -e "${GREEN}✅ User endpoint working${NC}"
    else
        echo -e "${RED}❌ User endpoint failed${NC}"
        echo "Response: $USER_RESPONSE"
        return 1
    fi
}

# Generate test report
generate_report() {
    echo -e "\n${YELLOW}Generating Test Report...${NC}"
    
    REPORT_FILE="tests/auth-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > "$REPORT_FILE" << EOF
# Authentication System Test Report

**Date:** $(date)
**Environment:** Development

## Test Summary

### Unit Tests
- Admin configuration tests: ✅ Passed
- Supabase client tests: ✅ Passed
- Authorization logic tests: ✅ Passed

### Integration Tests
- Login flow: ✅ Passed
- Session management: ✅ Passed
- Error handling: ✅ Passed

### E2E Tests
- Browser login flow: ✅ Passed
- Admin access control: ✅ Passed
- Coming soon mode integration: ✅ Passed

### API Tests
- Authentication endpoints: ✅ Passed
- Token validation: ✅ Passed

## Test Credentials Used
- Email: evey@eveywinters.com
- Password: [REDACTED]

## Recommendations
1. All tests passing - authentication system is ready for use
2. Consider adding more test users for different roles
3. Implement automated security scanning
4. Add performance benchmarks for auth operations

## Next Steps
- Monitor authentication logs in production
- Set up alerts for failed login attempts
- Implement rate limiting for production
EOF

    echo -e "${GREEN}✅ Test report generated: $REPORT_FILE${NC}"
}

# Main execution
main() {
    echo "Starting at $(date)"
    
    check_environment
    
    # Run all test suites
    FAILED=0
    
    run_unit_tests || FAILED=1
    run_integration_tests || FAILED=1
    run_e2e_tests || FAILED=1
    test_auth_endpoints || FAILED=1
    
    if [ $FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 All authentication tests passed!${NC}"
        generate_report
        echo -e "${GREEN}✅ Authentication system is ready for use${NC}"
    else
        echo -e "\n${RED}❌ Some tests failed. Please check the output above.${NC}"
        exit 1
    fi
    
    echo -e "\nCompleted at $(date)"
}

# Run main function
main