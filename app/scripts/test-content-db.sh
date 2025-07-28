#!/bin/bash

# Test script for content-db-direct implementation
set -e

echo "🧪 Testing Direct PostgreSQL Content Database Implementation"
echo "=========================================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests with status
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -e "\n${YELLOW}Running: ${test_name}${NC}"
    if eval "$test_command"; then
        echo -e "${GREEN}✅ ${test_name} passed${NC}"
        return 0
    else
        echo -e "${RED}❌ ${test_name} failed${NC}"
        return 1
    fi
}

# Check if database is running
echo "Checking database connection..."
if ! docker compose ps | grep -q "postgres.*running"; then
    echo -e "${RED}Error: PostgreSQL container is not running${NC}"
    echo "Please start the database with: docker compose up -d postgres"
    exit 1
fi

# Run unit tests
echo -e "\n${YELLOW}1. Unit Tests${NC}"
echo "Testing mocked database interactions..."
run_test "Unit tests" "npm run test -- src/test/lib/content-db-direct.test.ts"

# Run integration tests (if TEST_DB is set)
if [ "$TEST_DB" = "true" ]; then
    echo -e "\n${YELLOW}2. Integration Tests${NC}"
    echo "Testing real database connections..."
    run_test "Integration tests" "TEST_DB=true npm run test -- src/test/integration/content-db-direct.integration.test.ts"
else
    echo -e "\n${YELLOW}2. Integration Tests${NC}"
    echo "⏭️  Skipping integration tests (set TEST_DB=true to run)"
fi

# Run E2E tests if requested
if [ "$RUN_E2E" = "true" ]; then
    echo -e "\n${YELLOW}3. End-to-End Tests${NC}"
    echo "Testing in real browser environment..."
    
    # Ensure dev server is running
    if ! curl -s http://localhost:4321 > /dev/null; then
        echo "Starting development server..."
        npm run dev &
        DEV_PID=$!
        sleep 10  # Wait for server to start
    fi
    
    run_test "E2E tests" "npm run test:e2e -- e2e/content-db-direct.spec.ts"
    
    # Stop dev server if we started it
    if [ ! -z "$DEV_PID" ]; then
        kill $DEV_PID 2>/dev/null || true
    fi
else
    echo -e "\n${YELLOW}3. End-to-End Tests${NC}"
    echo "⏭️  Skipping E2E tests (set RUN_E2E=true to run)"
fi

# Test coverage report
echo -e "\n${YELLOW}4. Test Coverage${NC}"
if [ "$COVERAGE" = "true" ]; then
    echo "Generating coverage report..."
    run_test "Coverage report" "npm run test:coverage -- src/test/lib/content-db-direct.test.ts"
else
    echo "⏭️  Skipping coverage report (set COVERAGE=true to generate)"
fi

# Manual verification checklist
echo -e "\n${YELLOW}5. Manual Verification Checklist${NC}"
echo "Please verify the following manually:"
echo "  [ ] Navigate to /test-direct-db and verify all content types load"
echo "  [ ] Check /blog page shows blog posts"
echo "  [ ] Check individual blog post pages load correctly"
echo "  [ ] Verify teacher information displays on relevant pages"
echo "  [ ] Test that settings (like coming-soon mode) work correctly"
echo "  [ ] Monitor browser console for any errors"
echo "  [ ] Check network tab for failed database queries"

# Summary
echo -e "\n${YELLOW}========== Test Summary ==========${NC}"
echo "Unit tests: ✅"
if [ "$TEST_DB" = "true" ]; then
    echo "Integration tests: ✅"
else
    echo "Integration tests: ⏭️  (skipped)"
fi
if [ "$RUN_E2E" = "true" ]; then
    echo "E2E tests: ✅"
else
    echo "E2E tests: ⏭️  (skipped)"
fi

echo -e "\n${GREEN}Testing complete!${NC}"
echo "Run with TEST_DB=true RUN_E2E=true COVERAGE=true for full test suite"