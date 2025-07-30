#!/bin/bash

# Accessibility Fixes Test Suite
# Comprehensive testing of the four critical accessibility fixes:
# Bug 036: Contact form validation accessibility
# Bug 037: Honeypot field screen reader invisibility  
# Bug 006: Complete alt text audit
# Bug 017: Heading hierarchy structure

set -e

echo "🎯 Testing Critical Accessibility Fixes"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    echo "$(print_status $BLUE "📋 $1")"
    echo "----------------------------------------"
}

# Check if the development server is running
check_server() {
    print_header "Checking Development Server"
    
    if curl -s http://localhost:4321 > /dev/null; then
        print_status $GREEN "✅ Development server is running on localhost:4321"
    else
        print_status $YELLOW "⚠️  Starting development server..."
        npm run dev &
        SERVER_PID=$!
        
        # Wait for server to start
        for i in {1..30}; do
            if curl -s http://localhost:4321 > /dev/null; then
                print_status $GREEN "✅ Development server started"
                break
            fi
            sleep 1
            echo -n "."
        done
        
        if ! curl -s http://localhost:4321 > /dev/null; then
            print_status $RED "❌ Failed to start development server"
            exit 1
        fi
    fi
    echo ""
}

# Install dependencies if needed
check_dependencies() {
    print_header "Checking Dependencies"
    
    if [ ! -d "node_modules" ]; then
        print_status $YELLOW "📦 Installing dependencies..."
        npm install
    fi
    
    if [ ! -d "node_modules/@playwright" ]; then
        print_status $YELLOW "🎭 Installing Playwright..."
        npx playwright install
    fi
    
    print_status $GREEN "✅ Dependencies ready"
    echo ""
}

# Run accessibility compliance tests
run_accessibility_tests() {
    print_header "Bug 036: Contact Form Validation - Screen Reader Accessibility"
    
    print_status $BLUE "🔍 Testing aria-live announcements for validation errors..."
    npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 036" --reporter=list
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Contact form validation accessibility tests passed"
    else
        print_status $RED "❌ Contact form validation accessibility tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    print_header "Bug 037: Honeypot Field - Screen Reader Invisibility"
    
    print_status $BLUE "🕳️  Testing honeypot field is hidden from assistive technology..."
    npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 037" --reporter=list
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Honeypot field invisibility tests passed"
    else
        print_status $RED "❌ Honeypot field invisibility tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    print_header "Bug 006: Alt Text Audit - All Images"
    
    print_status $BLUE "🖼️  Testing descriptive alt text on all images..."
    npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 006" --reporter=list
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Alt text audit tests passed"
    else
        print_status $RED "❌ Alt text audit tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
    
    print_header "Bug 017: Heading Hierarchy - Proper Structure"
    
    print_status $BLUE "📑 Testing H1→H2→H3 heading hierarchy..."
    npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 017" --reporter=list
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Heading hierarchy tests passed"
    else
        print_status $RED "❌ Heading hierarchy tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Run WCAG compliance tests
run_wcag_tests() {
    print_header "WCAG 2.1 Level A Compliance"
    
    print_status $BLUE "♿ Testing WCAG Level A requirements..."
    npx playwright test e2e/accessibility-compliance-test.spec.ts -g "WCAG 2.1 Level A" --reporter=list
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ WCAG 2.1 Level A compliance tests passed"
    else
        print_status $RED "❌ WCAG 2.1 Level A compliance tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Run screen reader automation tests
run_screen_reader_tests() {
    print_header "Screen Reader Compatibility"
    
    print_status $BLUE "🔊 Testing screen reader automation..."
    npx playwright test e2e/screen-reader-automation.spec.ts --reporter=list
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Screen reader automation tests passed"
    else
        print_status $RED "❌ Screen reader automation tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Run mobile accessibility tests
run_mobile_tests() {
    print_header "Mobile Accessibility"
    
    print_status $BLUE "📱 Testing mobile accessibility features..."
    npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Mobile Accessibility" --reporter=list
    
    if [ $? -eq 0 ]; then
        print_status $GREEN "✅ Mobile accessibility tests passed"
    else
        print_status $RED "❌ Mobile accessibility tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Run existing form validation tests to ensure no regression
run_regression_tests() {
    print_header "Regression Testing - Existing Form Validation"
    
    print_status $BLUE "🔄 Testing existing form validation functionality..."
    
    if [ -f "src/test/accessibility/form-validation-accessibility.test.ts" ]; then
        npx vitest src/test/accessibility/form-validation-accessibility.test.ts --reporter=verbose
        
        if [ $? -eq 0 ]; then
            print_status $GREEN "✅ Form validation regression tests passed"
        else
            print_status $RED "❌ Form validation regression tests failed"
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    else
        print_status $YELLOW "⚠️  Form validation accessibility tests not found, skipping regression test"
    fi
    echo ""
}

# Generate test report
generate_report() {
    print_header "Accessibility Test Report"
    
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    local report_file="accessibility-test-report-$(date +%Y%m%d-%H%M%S).md"
    
    cat > $report_file << EOF
# Accessibility Fixes Test Report

**Generated:** $timestamp  
**Test Suite:** Critical Accessibility Fixes Validation

## Summary

This report validates the implementation of four critical accessibility fixes:

### ✅ Bug 036: Contact Form Validation Accessibility
- **Status:** $([ $FAILED_TESTS -eq 0 ] && echo "PASSED" || echo "NEEDS REVIEW")
- **Description:** Contact form validation with accessible error messages
- **Features Tested:**
  - aria-live announcements for validation errors
  - Proper aria-invalid and aria-describedby relationships
  - Screen reader compatible error messaging

### ✅ Bug 037: Honeypot Field Screen Reader Invisibility
- **Status:** $([ $FAILED_TESTS -eq 0 ] && echo "PASSED" || echo "NEEDS REVIEW")
- **Description:** Honeypot field hidden from screen readers
- **Features Tested:**
  - aria-hidden="true" on honeypot container
  - tabindex="-1" to prevent keyboard focus
  - Visual invisibility maintained

### ✅ Bug 006: Complete Alt Text Audit
- **Status:** $([ $FAILED_TESTS -eq 0 ] && echo "PASSED" || echo "NEEDS REVIEW")
- **Description:** All images have descriptive alt text
- **Features Tested:**
  - Descriptive alt text across all site pages
  - Educational context preserved in descriptions
  - No missing alt attributes

### ✅ Bug 017: Heading Hierarchy Structure
- **Status:** $([ $FAILED_TESTS -eq 0 ] && echo "PASSED" || echo "NEEDS REVIEW")
- **Description:** Proper H1 → H2 → H3 structure
- **Features Tested:**
  - Only one H1 per page
  - Logical heading hierarchy throughout site
  - Screen reader navigation compatibility

## WCAG 2.1 Level A Compliance

- **Keyboard Navigation:** $([ $FAILED_TESTS -eq 0 ] && echo "✅ COMPLIANT" || echo "⚠️ REVIEW NEEDED")
- **Screen Reader Support:** $([ $FAILED_TESTS -eq 0 ] && echo "✅ COMPLIANT" || echo "⚠️ REVIEW NEEDED")
- **Focus Management:** $([ $FAILED_TESTS -eq 0 ] && echo "✅ COMPLIANT" || echo "⚠️ REVIEW NEEDED")
- **Color Contrast:** $([ $FAILED_TESTS -eq 0 ] && echo "✅ COMPLIANT" || echo "⚠️ REVIEW NEEDED")

## Recommendations

1. **For Production:** All critical accessibility fixes are implemented and tested
2. **For Maintenance:** Run this test suite before any form-related deployments
3. **For Enhancement:** Consider implementing WCAG 2.1 Level AA features

## Test Commands

To run individual test suites:

\`\`\`bash
# Contact form validation
npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 036"

# Honeypot field invisibility  
npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 037"

# Alt text audit
npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 006"

# Heading hierarchy
npx playwright test e2e/accessibility-compliance-test.spec.ts -g "Bug 017"

# Full WCAG compliance
npx playwright test e2e/accessibility-compliance-test.spec.ts -g "WCAG"

# Screen reader automation
npx playwright test e2e/screen-reader-automation.spec.ts
\`\`\`

---

*Report generated by Accessibility Test Suite v1.0*
EOF
    
    print_status $GREEN "📄 Test report generated: $report_file"
    echo ""
}

# Main execution
main() {
    local FAILED_TESTS=0
    
    print_status $BLUE "🚀 Starting Accessibility Fixes Test Suite"
    echo ""
    
    # Run all test phases
    check_dependencies
    check_server
    run_accessibility_tests
    run_wcag_tests
    run_screen_reader_tests
    run_mobile_tests
    run_regression_tests
    
    # Generate final report
    generate_report
    
    # Final status
    print_header "Final Results"
    
    if [ $FAILED_TESTS -eq 0 ]; then
        print_status $GREEN "🎉 All accessibility tests passed!"
        print_status $GREEN "✅ WCAG 2.1 Level A compliance achieved"
        print_status $GREEN "✅ Critical accessibility fixes verified"
        echo ""
        print_status $BLUE "🚢 Ready for production deployment"
        exit 0
    else
        print_status $RED "❌ $FAILED_TESTS test suite(s) failed"
        print_status $YELLOW "⚠️  Please review failed tests before deployment"
        exit 1
    fi
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        print_status $YELLOW "🧹 Cleaning up development server..."
        kill $SERVER_PID 2>/dev/null || true
    fi
}

# Set up cleanup on exit
trap cleanup EXIT

# Run main function
main "$@"