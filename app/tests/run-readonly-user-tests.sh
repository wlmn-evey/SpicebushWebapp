#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running Read-Only Database User Production Tests${NC}"
echo "=================================================="

# Check if Docker containers are running
echo -e "\n${YELLOW}Checking Docker containers...${NC}"
if ! docker ps | grep -q "supabase-db"; then
    echo -e "${RED}Error: Database container is not running${NC}"
    echo "Please start the containers with: docker-compose up -d"
    exit 1
fi

echo -e "${GREEN}✓ Database container is running${NC}"

# Run the production tests
echo -e "\n${YELLOW}Running production security tests...${NC}"
npm test tests/readonly-user-production-test.js

PROD_TEST_EXIT_CODE=$?

# Run the pg client tests
echo -e "\n${YELLOW}Running pg client integration tests...${NC}"
npm test tests/readonly-user-pg-client-test.js

PG_TEST_EXIT_CODE=$?

# Summary
echo -e "\n${YELLOW}Test Summary${NC}"
echo "============"

if [ $PROD_TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Production security tests passed${NC}"
else
    echo -e "${RED}✗ Production security tests failed${NC}"
fi

if [ $PG_TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ pg client integration tests passed${NC}"
else
    echo -e "${RED}✗ pg client integration tests failed${NC}"
fi

# Overall result
if [ $PROD_TEST_EXIT_CODE -eq 0 ] && [ $PG_TEST_EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed! The read-only user is production-ready.${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed. Please review the output above.${NC}"
    exit 1
fi