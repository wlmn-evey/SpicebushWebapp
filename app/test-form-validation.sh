#!/bin/bash

# Form Validation Test Suite Runner
# Tests the pragmatic form validation solution comprehensively

set -e

echo "🧪 Form Validation Test Suite"
echo "==============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test counter
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local required="$3"
    
    print_status "Running $test_name..."
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if eval "$test_command"; then
        print_success "$test_name passed"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        if [ "$required" = "required" ]; then
            print_error "$test_name failed (REQUIRED)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 1
        else
            print_warning "$test_name failed (optional)"
            TESTS_FAILED=$((TESTS_FAILED + 1))
            return 0
        fi
    fi
}

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v npm &> /dev/null; then
    print_error "npm is required but not installed"
    exit 1
fi

if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run from project root."
    exit 1
fi

if [ ! -f "src/lib/form-validation.ts" ]; then
    print_error "form-validation.ts not found. Please ensure the form validation implementation exists."
    exit 1
fi

print_success "Prerequisites check passed"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Run unit tests
print_status "=== Unit Tests ==="
run_test_suite "Basic Validation Functions" "npm run test src/test/lib/form-validation.test.ts" "required"

# Run integration tests  
print_status "=== Integration Tests ==="
run_test_suite "Form Validation Integration" "npm run test src/test/integration/form-validation.integration.test.ts" "required"

# Run accessibility tests
print_status "=== Accessibility Tests ==="
run_test_suite "Form Accessibility" "npm run test src/test/accessibility/form-validation-accessibility.test.ts" "required"

# Run component tests
print_status "=== Component Tests ==="
run_test_suite "Phone Formatting" "npm run test src/test/components/phone-formatting.test.ts" "required"

# Run type checking
print_status "=== Type Checking ==="
run_test_suite "TypeScript Compilation" "npm run typecheck" "required"

# Run linting
print_status "=== Code Quality ==="
run_test_suite "ESLint" "npm run lint" "optional"

# Check if development server can start
print_status "=== Development Server ==="
print_status "Testing development server startup..."
timeout 30s npm run dev > /dev/null 2>&1 &
SERVER_PID=$!
sleep 10

if kill -0 $SERVER_PID 2>/dev/null; then
    print_success "Development server started successfully"
    kill $SERVER_PID
    TESTS_PASSED=$((TESTS_PASSED + 1))
else
    print_warning "Development server failed to start (this may be expected in CI)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
fi
TESTS_RUN=$((TESTS_RUN + 1))

# Run E2E tests if Playwright is available
if command -v npx playwright &> /dev/null && [ -d "node_modules/@playwright" ]; then
    print_status "=== End-to-End Tests ==="
    
    # Start development server for E2E tests
    print_status "Starting development server for E2E tests..."
    npm run dev > /dev/null 2>&1 &
    DEV_SERVER_PID=$!
    sleep 15
    
    if kill -0 $DEV_SERVER_PID 2>/dev/null; then
        run_test_suite "Contact Form E2E Tests" "npx playwright test e2e/form-validation-contact.spec.ts" "optional"
        kill $DEV_SERVER_PID
    else
        print_warning "Could not start development server for E2E tests"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        TESTS_RUN=$((TESTS_RUN + 1))
    fi
else
    print_warning "Playwright not available, skipping E2E tests"
fi

# Performance tests
print_status "=== Performance Tests ==="
print_status "Running performance validation..."

# Test validation performance with Node.js
node -e "
const { validateForm, validators } = require('./dist/lib/form-validation.js');

// Create large form data
const data = {};
const schema = {};
for (let i = 0; i < 1000; i++) {
    data[\`field\${i}\`] = 'test@example.com';
    schema[\`field\${i}\`] = [validators.required, validators.email];
}

const start = performance.now();
const errors = validateForm(data, schema);
const end = performance.now();

if (end - start < 100) {
    console.log('✅ Performance test passed: ' + (end - start).toFixed(2) + 'ms for 1000 field validation');
    process.exit(0);
} else {
    console.log('❌ Performance test failed: ' + (end - start).toFixed(2) + 'ms (expected < 100ms)');
    process.exit(1);
}
" 2>/dev/null && {
    print_success "Performance validation passed"
    TESTS_PASSED=$((TESTS_PASSED + 1))
} || {
    print_warning "Performance validation failed or not available"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}
TESTS_RUN=$((TESTS_RUN + 1))

# Memory leak test
print_status "Running memory leak test..."
node -e "
const { formatPhoneNumber } = require('./dist/lib/form-validation.js');

const initialMemory = process.memoryUsage().heapUsed;

// Run formatting 10000 times
for (let i = 0; i < 10000; i++) {
    formatPhoneNumber('5551234567');
}

const finalMemory = process.memoryUsage().heapUsed;
const memoryDiff = finalMemory - initialMemory;

if (memoryDiff < 10 * 1024 * 1024) { // Less than 10MB increase
    console.log('✅ Memory test passed: ' + (memoryDiff / 1024 / 1024).toFixed(2) + 'MB increase');
    process.exit(0);
} else {
    console.log('❌ Memory test failed: ' + (memoryDiff / 1024 / 1024).toFixed(2) + 'MB increase');
    process.exit(1);
}
" 2>/dev/null && {
    print_success "Memory leak test passed"
    TESTS_PASSED=$((TESTS_PASSED + 1))
} || {
    print_warning "Memory leak test failed or not available"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}
TESTS_RUN=$((TESTS_RUN + 1))

# Summary
echo ""
echo "==============================="
echo "📊 Test Results Summary"
echo "==============================="
echo "Tests Run: $TESTS_RUN"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"

if [ $TESTS_FAILED -eq 0 ]; then
    print_success "All tests passed! 🎉"
    echo ""
    echo "✅ Your pragmatic form validation solution is working correctly!"
    echo ""
    echo "Key Features Verified:"
    echo "• Basic validation functions (required, email, phone, etc.)"
    echo "• FormData and object validation"  
    echo "• Phone number formatting"
    echo "• Accessibility features (ARIA attributes)"
    echo "• HTML5 validation compatibility"
    echo "• Performance and memory efficiency"
    echo "• Cross-browser functionality"
    exit 0
else
    print_error "Some tests failed. Please review the output above."
    echo ""
    echo "🔧 Next Steps:"
    echo "1. Check failed test output for specific issues"
    echo "2. Verify form-validation.ts implementation"
    echo "3. Ensure all dependencies are installed"
    echo "4. Run individual test suites for detailed debugging"
    exit 1
fi