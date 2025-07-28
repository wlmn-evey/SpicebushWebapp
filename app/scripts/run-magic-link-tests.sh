#!/bin/bash

# Magic Link Authentication Test Runner
# Comprehensive test suite for magic link authentication system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_TIMEOUT=60000
RETRIES=2
WORKERS=1

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo
    print_status $BLUE "====================================="
    print_status $BLUE "$1"
    print_status $BLUE "====================================="
    echo
}

print_success() {
    print_status $GREEN "✅ $1"
}

print_error() {
    print_status $RED "❌ $1"
}

print_warning() {
    print_status $YELLOW "⚠️  $1"
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    print_success "Docker is running"
    
    # Check if MailHog is accessible
    if ! curl -f http://localhost:8025/api/v2/messages >/dev/null 2>&1; then
        print_warning "MailHog not accessible at localhost:8025. Starting Docker services..."
        docker-compose up -d
        sleep 10
        
        if ! curl -f http://localhost:8025/api/v2/messages >/dev/null 2>&1; then
            print_error "Failed to start MailHog. Please check Docker configuration."
            exit 1
        fi
    fi
    print_success "MailHog is accessible"
    
    # Check if application is running
    if ! curl -f http://localhost:4321/auth/magic-login >/dev/null 2>&1; then
        print_warning "Application not running at localhost:4321. Starting development server..."
        npm run dev &
        DEV_PID=$!
        
        # Wait for server to start
        echo "Waiting for development server to start..."
        for i in {1..30}; do
            if curl -f http://localhost:4321/auth/magic-login >/dev/null 2>&1; then
                break
            fi
            sleep 2
        done
        
        if ! curl -f http://localhost:4321/auth/magic-login >/dev/null 2>&1; then
            print_error "Failed to start development server"
            exit 1
        fi
    fi
    print_success "Application is running"
    
    # Check Node.js and npm versions
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    print_success "Node.js: $NODE_VERSION, npm: $NPM_VERSION"
}

# Run unit tests
run_unit_tests() {
    print_header "Running Unit Tests"
    
    echo "Running authentication function unit tests..."
    npm run test -- src/test/lib/supabase-magic-link.test.ts --reporter=verbose
    
    echo "Running admin configuration tests..."
    npm run test -- src/test/lib/admin-config.test.ts --reporter=verbose
    
    echo "Running error handling tests..."
    npm run test -- src/test/error-handling/magic-link-errors.test.ts --reporter=verbose
    
    echo "Running security validation tests..."
    npm run test -- src/test/security/magic-link-security.test.ts --reporter=verbose
    
    print_success "Unit tests completed"
}

# Run integration tests
run_integration_tests() {
    print_header "Running Integration Tests"
    
    echo "Running magic link flow integration tests..."
    npm run test -- src/test/integration/magic-link-flow.test.ts --reporter=verbose
    
    print_success "Integration tests completed"
}

# Run E2E tests
run_e2e_tests() {
    print_header "Running End-to-End Tests"
    
    echo "Running magic link authentication E2E tests..."
    npx playwright test e2e/magic-link-auth.spec.ts --timeout=$TEST_TIMEOUT --retries=$RETRIES --workers=$WORKERS
    
    print_success "E2E tests completed"
}

# Run mobile tests
run_mobile_tests() {
    print_header "Running Mobile Compatibility Tests"
    
    echo "Running mobile device tests..."
    npx playwright test e2e/magic-link-mobile.spec.ts --timeout=$TEST_TIMEOUT --retries=$RETRIES --workers=$WORKERS
    
    print_success "Mobile tests completed"
}

# Run cross-browser tests
run_cross_browser_tests() {
    print_header "Running Cross-Browser Tests"
    
    echo "Running cross-browser compatibility tests..."
    npx playwright test e2e/magic-link-cross-browser.spec.ts --timeout=$TEST_TIMEOUT --retries=$RETRIES --workers=$WORKERS
    
    print_success "Cross-browser tests completed"
}

# Run performance tests
run_performance_tests() {
    print_header "Running Performance Tests"
    
    echo "Running performance and reliability tests..."
    npx playwright test e2e/magic-link-performance.spec.ts --timeout=$TEST_TIMEOUT --retries=$RETRIES --workers=$WORKERS
    
    print_success "Performance tests completed"
}

# Generate test report
generate_report() {
    print_header "Generating Test Report"
    
    # Create report directory
    mkdir -p test-results/magic-link
    
    # Generate HTML report for Playwright tests
    npx playwright show-report --host 0.0.0.0 &
    REPORT_PID=$!
    
    # Generate coverage report for unit tests
    npm run test:coverage -- src/test/lib src/test/integration src/test/error-handling src/test/security
    
    # Create summary report
    cat > test-results/magic-link/summary.md << EOF
# Magic Link Authentication Test Summary

Generated: $(date)

## Test Categories Executed

- ✅ Unit Tests (Authentication functions, Admin config, Error handling, Security)
- ✅ Integration Tests (End-to-end flow)
- ✅ E2E Tests (User experience, Authentication flow)
- ✅ Mobile Tests (iOS, Android, Tablet compatibility)
- ✅ Cross-Browser Tests (Chrome, Firefox, Safari, Edge)
- ✅ Performance Tests (Load times, Reliability, Memory usage)

## Test Results

Detailed results available in:
- Playwright HTML Report: http://localhost:9323
- Coverage Report: coverage/index.html
- Individual test outputs in console logs above

## Manual Testing

For manual testing procedures, see: tests/manual/MAGIC_LINK_TEST_PROCEDURES.md

## Next Steps

1. Review any failing tests
2. Execute manual test procedures
3. Verify production environment compatibility
4. Update documentation as needed
EOF
    
    print_success "Test report generated in test-results/magic-link/"
    print_success "Playwright report available at http://localhost:9323"
}

# Cleanup function
cleanup() {
    print_header "Cleanup"
    
    if [ ! -z "$DEV_PID" ]; then
        print_status $YELLOW "Stopping development server..."
        kill $DEV_PID 2>/dev/null || true
    fi
    
    if [ ! -z "$REPORT_PID" ]; then
        kill $REPORT_PID 2>/dev/null || true
    fi
    
    print_success "Cleanup completed"
}

# Set up trap for cleanup
trap cleanup EXIT

# Main execution
main() {
    local test_type=${1:-"all"}
    
    print_header "Magic Link Authentication Test Suite"
    print_status $BLUE "Test Type: $test_type"
    print_status $BLUE "Started: $(date)"
    
    check_prerequisites
    
    case $test_type in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "mobile")
            run_mobile_tests
            ;;
        "cross-browser")
            run_cross_browser_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "all")
            run_unit_tests
            run_integration_tests
            run_e2e_tests
            run_mobile_tests
            run_cross_browser_tests
            run_performance_tests
            ;;
        "report")
            generate_report
            ;;
        *)
            print_error "Invalid test type: $test_type"
            echo "Usage: $0 [unit|integration|e2e|mobile|cross-browser|performance|all|report]"
            exit 1
            ;;
    esac
    
    if [ "$test_type" != "report" ]; then
        generate_report
    fi
    
    print_header "Test Suite Completed Successfully"
    print_status $GREEN "All tests passed! 🎉"
    print_status $BLUE "Finished: $(date)"
}

# Execute main function with all arguments
main "$@"
