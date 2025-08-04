#!/bin/bash
# Run Communications API Tests

echo "==============================================="
echo "Running Admin Communications API Tests"
echo "==============================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Change to the app directory
cd "$(dirname "$0")/../.." || exit 1

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Install test dependencies if needed
if ! npm list vitest &>/dev/null; then
    echo -e "${YELLOW}Installing test dependencies...${NC}"
    npm install --save-dev vitest @vitest/ui
fi

# Run the tests
echo -e "${GREEN}Running communications API tests...${NC}"
npx vitest run tests/admin/communications-api.test.ts --reporter=verbose

# Check the exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi

echo ""
echo "==============================================="
echo "Test Summary:"
echo "==============================================="

# Run with coverage if requested
if [ "$1" == "--coverage" ]; then
    echo -e "${GREEN}Running with coverage...${NC}"
    npx vitest run tests/admin/communications-api.test.ts --coverage
fi