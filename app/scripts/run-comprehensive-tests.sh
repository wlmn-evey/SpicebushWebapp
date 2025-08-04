#!/bin/bash

# Comprehensive Test Runner for SpicebushWebapp
# This script runs all test suites in priority order and generates reports

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🧪 Starting Comprehensive Test Suite${NC}"
echo -e "${BLUE}====================================${NC}"
echo "Timestamp: $TIMESTAMP"
echo ""

# Function to run a test suite
run_test_suite() {
  local suite_name=$1
  local project=$2
  local critical=$3
  
  echo -e "${YELLOW}🧪 Running $suite_name...${NC}"
  
  if npx playwright test --project="$project" --reporter=json --reporter=html; then
    echo -e "${GREEN}✅ $suite_name passed!${NC}"
    return 0
  else
    echo -e "${RED}❌ $suite_name failed!${NC}"
    if [ "$critical" = "true" ]; then
      echo -e "${RED}Critical test failed! Stopping test run.${NC}"
      exit 1
    fi
    return 1
  fi
}

# Check environment
ENVIRONMENT="${1:-local}"
echo "Environment: $ENVIRONMENT"

if [ "$ENVIRONMENT" = "docker" ]; then
  echo -e "${BLUE}📦 Running in Docker environment${NC}"
  export E2E_BASE_URL=http://localhost:4321
  export DOCKER_ENV=true
  
  # Check if Docker is running
  if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Docker is not running! Please start Docker first.${NC}"
    exit 1
  fi
  
  # Start Docker services
  echo "Starting Docker services..."
  docker-compose up -d
  
  # Wait for services to be ready
  echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
  npx wait-on http://localhost:4321 -t 60000 || {
    echo -e "${RED}Services failed to start!${NC}"
    docker-compose logs
    exit 1
  }
elif [ "$ENVIRONMENT" = "staging" ]; then
  echo -e "${BLUE}🌐 Running against staging environment${NC}"
  export E2E_BASE_URL="${STAGING_URL:-https://staging.spicebushmontessori.org}"
elif [ "$ENVIRONMENT" = "production" ]; then
  echo -e "${BLUE}🚀 Running against production environment${NC}"
  export E2E_BASE_URL="${PRODUCTION_URL:-https://spicebushmontessori.org}"
  echo -e "${YELLOW}⚠️  WARNING: Running tests against production!${NC}"
  read -p "Are you sure? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Install dependencies if needed
if [ ! -d "node_modules/@playwright" ]; then
  echo "Installing Playwright..."
  npm ci
  npx playwright install --with-deps
fi

# Run test suites in priority order
FAILED_TESTS=0

# 1. Critical Path Tests (Must Pass)
run_test_suite "Critical Path Tests" "critical" true || ((FAILED_TESTS++))

# 2. Docker Environment Tests (if in Docker)
if [ "$ENVIRONMENT" = "docker" ]; then
  run_test_suite "Docker Environment Tests" "docker-validation" false || ((FAILED_TESTS++))
fi

# 3. Cross-Browser Tests
echo -e "${YELLOW}🌐 Running Cross-Browser Tests...${NC}"
for browser in chromium firefox webkit; do
  run_test_suite "$browser Tests" "$browser" false || ((FAILED_TESTS++))
done

# 4. Mobile Tests
run_test_suite "Mobile Chrome Tests" "mobile-chrome" false || ((FAILED_TESTS++))
run_test_suite "Mobile Safari Tests" "mobile-safari" false || ((FAILED_TESTS++))

# 5. Accessibility Tests
run_test_suite "Accessibility Tests" "accessibility" false || ((FAILED_TESTS++))

# 6. Performance Tests
run_test_suite "Performance Tests" "performance" false || ((FAILED_TESTS++))

# Generate consolidated report
echo -e "${BLUE}📊 Generating Test Reports...${NC}"

# Create summary
cat > "$TEST_RESULTS_DIR/summary-$TIMESTAMP.txt" << EOF
Test Execution Summary
======================
Date: $(date)
Environment: $ENVIRONMENT
Total Test Suites Run: 9
Failed Test Suites: $FAILED_TESTS

EOF

# Show HTML report
if command -v open &> /dev/null; then
  echo -e "${BLUE}📊 Opening HTML report...${NC}"
  npx playwright show-report
elif command -v xdg-open &> /dev/null; then
  xdg-open "$TEST_RESULTS_DIR/html-report/index.html"
fi

# Cleanup Docker if needed
if [ "$ENVIRONMENT" = "docker" ] && [ "${KEEP_DOCKER:-false}" != "true" ]; then
  echo -e "${BLUE}🧹 Cleaning up Docker environment...${NC}"
  docker-compose down
fi

# Final result
echo ""
echo -e "${BLUE}======================================${NC}"
if [ $FAILED_TESTS -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED_TESTS test suite(s) failed!${NC}"
  echo -e "See ${TEST_RESULTS_DIR}/summary-$TIMESTAMP.txt for details"
  exit 1
fi