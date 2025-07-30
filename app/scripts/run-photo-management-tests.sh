#!/bin/bash

# Photo Management System - Comprehensive Test Runner
# This script runs all tests for the photo management system

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
UNIT_TESTS_PASSED=false
INTEGRATION_TESTS_PASSED=false
E2E_TESTS_PASSED=false
PERFORMANCE_TESTS_PASSED=false

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Photo Management System - Test Suite${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# Function to print section headers
print_section() {
    echo -e "${YELLOW}→ $1${NC}"
    echo "----------------------------------------"
}

# Function to print success message
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error message
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to print info message
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Must be run from the project root directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
fi

# Parse command line arguments
RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=true
RUN_PERFORMANCE=false
COVERAGE=false
WATCH=false
VERBOSE=false
QUICK=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --unit-only)
            RUN_UNIT=true
            RUN_INTEGRATION=false
            RUN_E2E=false
            RUN_PERFORMANCE=false
            shift
            ;;
        --integration-only)
            RUN_UNIT=false
            RUN_INTEGRATION=true
            RUN_E2E=false
            RUN_PERFORMANCE=false
            shift
            ;;
        --e2e-only)
            RUN_UNIT=false
            RUN_INTEGRATION=false
            RUN_E2E=true
            RUN_PERFORMANCE=false
            shift
            ;;
        --performance)
            RUN_PERFORMANCE=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --watch)
            WATCH=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --quick)
            QUICK=true
            RUN_INTEGRATION=false
            RUN_E2E=false
            RUN_PERFORMANCE=false
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --unit-only      Run only unit tests"
            echo "  --integration-only Run only integration tests"
            echo "  --e2e-only      Run only end-to-end tests"
            echo "  --performance   Include performance tests"
            echo "  --coverage      Generate coverage report"
            echo "  --watch         Run tests in watch mode"
            echo "  --verbose       Show detailed output"
            echo "  --quick         Run only unit tests (fast feedback)"
            echo "  --help          Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for available options"
            exit 1
            ;;
    esac
done

# Start timestamp
START_TIME=$(date +%s)

print_info "Starting photo management system test suite..."
print_info "Configuration:"
echo "  - Unit Tests: $([ "$RUN_UNIT" = true ] && echo "✅" || echo "❌")"
echo "  - Integration Tests: $([ "$RUN_INTEGRATION" = true ] && echo "✅" || echo "❌")"
echo "  - E2E Tests: $([ "$RUN_E2E" = true ] && echo "✅" || echo "❌")"
echo "  - Performance Tests: $([ "$RUN_PERFORMANCE" = true ] && echo "✅" || echo "❌")"
echo "  - Coverage: $([ "$COVERAGE" = true ] && echo "✅" || echo "❌")"
echo ""

# Set up test environment
export NODE_ENV=test
export DATABASE_URL="${DATABASE_URL:-postgresql://test_user:test_pass@localhost:5432/spicebush_test}"

# Create test directories if they don't exist
mkdir -p test-uploads
mkdir -p test-results
mkdir -p coverage

# Clean up previous test results
rm -rf test-results/*
if [ "$COVERAGE" = true ]; then
    rm -rf coverage/*
fi

# Function to run unit tests
run_unit_tests() {
    print_section "Running Unit Tests"
    
    if [ "$COVERAGE" = true ]; then
        COVERAGE_FLAG="--coverage"
    else
        COVERAGE_FLAG=""
    fi
    
    if [ "$WATCH" = true ]; then
        WATCH_FLAG="--watch"
    else
        WATCH_FLAG=""
    fi
    
    VERBOSE_FLAG=""
    if [ "$VERBOSE" = true ]; then
        VERBOSE_FLAG="--verbose"
    fi
    
    if npm run test:unit -- $COVERAGE_FLAG $WATCH_FLAG $VERBOSE_FLAG; then
        print_success "Unit tests passed"
        UNIT_TESTS_PASSED=true
    else
        print_error "Unit tests failed"
        return 1
    fi
}

# Function to run integration tests
run_integration_tests() {
    print_section "Running Integration Tests"
    
    # Check if test database is available
    if ! pg_isready -h localhost -p 5432 -q 2>/dev/null; then
        print_error "Test database not available. Please start PostgreSQL."
        return 1
    fi
    
    VERBOSE_FLAG=""
    if [ "$VERBOSE" = true ]; then
        VERBOSE_FLAG="--verbose"
    fi
    
    if npm run test:integration -- $VERBOSE_FLAG; then
        print_success "Integration tests passed"
        INTEGRATION_TESTS_PASSED=true
    else
        print_error "Integration tests failed"
        return 1
    fi
}

# Function to run E2E tests
run_e2e_tests() {
    print_section "Running End-to-End Tests"
    
    # Check if Playwright browsers are installed
    if [ ! -d "node_modules/@playwright/test" ]; then
        print_info "Installing Playwright..."
        npx playwright install --with-deps
    fi
    
    # Start the application in background
    print_info "Starting application for E2E tests..."
    npm run build > /dev/null 2>&1
    npm run preview > /dev/null 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    print_info "Waiting for server to start..."
    timeout 30 bash -c 'until curl -s http://localhost:3000 > /dev/null; do sleep 1; done' || {
        print_error "Server failed to start within 30 seconds"
        kill $SERVER_PID 2>/dev/null || true
        return 1
    }
    
    print_success "Server is ready"
    
    # Run E2E tests
    E2E_FLAGS=""
    if [ "$VERBOSE" = true ]; then
        E2E_FLAGS="$E2E_FLAGS --reporter=list"
    fi
    
    # Run photo management specific E2E tests
    if npx playwright test admin-photo-management.spec.ts admin-photo-upload.spec.ts photo-management-comprehensive.spec.ts $E2E_FLAGS; then
        print_success "E2E tests passed"
        E2E_TESTS_PASSED=true
    else
        print_error "E2E tests failed"
        kill $SERVER_PID 2>/dev/null || true
        return 1
    fi
    
    # Clean up server
    kill $SERVER_PID 2>/dev/null || true
    print_info "Server stopped"
}

# Function to run performance tests
run_performance_tests() {
    print_section "Running Performance Tests"
    
    VERBOSE_FLAG=""
    if [ "$VERBOSE" = true ]; then
        VERBOSE_FLAG="--verbose"
    fi
    
    if npm run test:performance -- $VERBOSE_FLAG; then
        print_success "Performance tests passed"
        PERFORMANCE_TESTS_PASSED=true
    else
        print_error "Performance tests failed"
        return 1
    fi
}

# Run tests based on configuration
FAILED_TESTS=()

if [ "$RUN_UNIT" = true ]; then
    if ! run_unit_tests; then
        FAILED_TESTS+=("Unit")
    fi
    echo ""
fi

if [ "$RUN_INTEGRATION" = true ]; then
    if ! run_integration_tests; then
        FAILED_TESTS+=("Integration")
    fi
    echo ""
fi

if [ "$RUN_E2E" = true ]; then
    if ! run_e2e_tests; then
        FAILED_TESTS+=("E2E")
    fi
    echo ""
fi

if [ "$RUN_PERFORMANCE" = true ]; then
    if ! run_performance_tests; then
        FAILED_TESTS+=("Performance")
    fi
    echo ""
fi

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))
MINUTES=$((EXECUTION_TIME / 60))
SECONDS=$((EXECUTION_TIME % 60))

# Print summary
print_section "Test Summary"
echo "Execution time: ${MINUTES}m ${SECONDS}s"
echo ""

if [ "$RUN_UNIT" = true ]; then
    if [ "$UNIT_TESTS_PASSED" = true ]; then
        print_success "Unit Tests: PASSED"
    else
        print_error "Unit Tests: FAILED"
    fi
fi

if [ "$RUN_INTEGRATION" = true ]; then
    if [ "$INTEGRATION_TESTS_PASSED" = true ]; then
        print_success "Integration Tests: PASSED"
    else
        print_error "Integration Tests: FAILED"
    fi
fi

if [ "$RUN_E2E" = true ]; then
    if [ "$E2E_TESTS_PASSED" = true ]; then
        print_success "E2E Tests: PASSED"
    else
        print_error "E2E Tests: FAILED"
    fi
fi

if [ "$RUN_PERFORMANCE" = true ]; then
    if [ "$PERFORMANCE_TESTS_PASSED" = true ]; then
        print_success "Performance Tests: PASSED"
    else
        print_error "Performance Tests: FAILED"
    fi
fi

echo ""

# Show coverage report location if generated
if [ "$COVERAGE" = true ] && [ -d "coverage" ]; then
    print_info "Coverage report generated in ./coverage/index.html"
fi

# Show test results location
if [ -d "test-results" ] && [ "$(ls -A test-results)" ]; then
    print_info "Test results saved in ./test-results/"
fi

# Final result
if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    print_success "All tests passed! 🎉"
    echo ""
    print_info "Photo management system is ready for production"
    exit 0
else
    print_error "Some tests failed: ${FAILED_TESTS[*]}"
    echo ""
    print_info "Please review the errors above and fix the issues"
    exit 1
fi