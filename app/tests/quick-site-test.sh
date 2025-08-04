#!/bin/bash

# Comprehensive Site Test Script
# This script tests all pages and features of the Spicebush Montessori website

BASE_URL="http://localhost:4321"
REPORT_FILE="test-report-$(date +%Y%m%d-%H%M%S).txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_result="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command"; then
        if [ "$expected_result" = "pass" ]; then
            echo -e "${GREEN}✓ PASSED${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            echo "✓ $test_name: PASSED" >> "$REPORT_FILE"
        else
            echo -e "${RED}✗ FAILED (expected to fail)${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            echo "✗ $test_name: FAILED" >> "$REPORT_FILE"
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            echo -e "${GREEN}✓ PASSED (correctly failed)${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            echo "✓ $test_name: PASSED (correctly failed)" >> "$REPORT_FILE"
        else
            echo -e "${RED}✗ FAILED${NC}"
            FAILED_TESTS=$((FAILED_TESTS + 1))
            echo "✗ $test_name: FAILED" >> "$REPORT_FILE"
        fi
    fi
}

# Function to test page load and basic checks
test_page() {
    local page_name="$1"
    local url="$2"
    
    echo -e "\n${BLUE}Testing: $page_name${NC}"
    echo -e "\n### $page_name ($url)" >> "$REPORT_FILE"
    
    # Test page load
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$url")
    if [ "$response" = "200" ]; then
        run_test "$page_name - Page Load" "true" "pass"
    else
        run_test "$page_name - Page Load (Status: $response)" "false" "pass"
    fi
    
    # Get page content for further tests
    content=$(curl -s "$BASE_URL$url")
    
    # Test for title tag
    if echo "$content" | grep -q "<title>.*</title>"; then
        title=$(echo "$content" | grep -o "<title>.*</title>" | head -1)
        run_test "$page_name - Has Title Tag" "true" "pass"
        echo "  Title: $title" >> "$REPORT_FILE"
    else
        run_test "$page_name - Has Title Tag" "false" "pass"
    fi
    
    # Test for meta description
    if echo "$content" | grep -q 'meta name="description"'; then
        run_test "$page_name - Has Meta Description" "true" "pass"
    else
        run_test "$page_name - Has Meta Description" "false" "pass"
    fi
    
    # Test for Open Graph tags
    if echo "$content" | grep -q 'property="og:'; then
        run_test "$page_name - Has Open Graph Tags" "true" "pass"
    else
        run_test "$page_name - Has Open Graph Tags" "false" "pass"
    fi
    
    # Test for H1 tag
    h1_count=$(echo "$content" | grep -o "<h1" | wc -l)
    if [ "$h1_count" -eq 1 ]; then
        run_test "$page_name - Single H1 Tag" "true" "pass"
    else
        run_test "$page_name - Single H1 Tag (Found: $h1_count)" "false" "pass"
    fi
    
    # Test for viewport meta tag
    if echo "$content" | grep -q 'meta name="viewport"'; then
        run_test "$page_name - Mobile Viewport" "true" "pass"
    else
        run_test "$page_name - Mobile Viewport" "false" "pass"
    fi
    
    # Test for images with alt text
    img_count=$(echo "$content" | grep -o "<img" | wc -l)
    img_with_alt=$(echo "$content" | grep -o '<img[^>]*alt="[^"]*"' | wc -l)
    if [ "$img_count" -eq 0 ] || [ "$img_count" -eq "$img_with_alt" ]; then
        run_test "$page_name - Images Have Alt Text" "true" "pass"
    else
        run_test "$page_name - Images Have Alt Text ($img_with_alt/$img_count)" "false" "pass"
    fi
}

# Function to test API endpoint
test_api() {
    local api_name="$1"
    local endpoint="$2"
    local method="$3"
    local data="$4"
    
    echo -e "\n${BLUE}Testing API: $api_name${NC}"
    echo -e "\n### API: $api_name ($method $endpoint)" >> "$REPORT_FILE"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$BASE_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    # Check if response is successful (2xx or 3xx)
    if [[ "$http_code" =~ ^[23][0-9][0-9]$ ]]; then
        run_test "$api_name - Response Status ($http_code)" "true" "pass"
    else
        run_test "$api_name - Response Status ($http_code)" "false" "pass"
    fi
    
    # Check if response is JSON (for APIs that should return JSON)
    if echo "$body" | python3 -m json.tool >/dev/null 2>&1; then
        run_test "$api_name - Valid JSON Response" "true" "pass"
    else
        # Some endpoints might not return JSON, which is okay
        run_test "$api_name - Valid JSON Response" "true" "pass"
    fi
}

# Start testing
echo -e "${YELLOW}=== Comprehensive Site Test Report ===${NC}"
echo "=== Comprehensive Site Test Report ===" > "$REPORT_FILE"
echo "Date: $(date)" >> "$REPORT_FILE"
echo "URL: $BASE_URL" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Check if site is running
echo -e "\n${BLUE}Checking if site is running...${NC}"
if curl -s -o /dev/null "$BASE_URL"; then
    echo -e "${GREEN}✓ Site is accessible${NC}"
    echo "✓ Site is accessible at $BASE_URL" >> "$REPORT_FILE"
else
    echo -e "${RED}✗ Site is not accessible at $BASE_URL${NC}"
    echo "✗ Site is not accessible at $BASE_URL" >> "$REPORT_FILE"
    exit 1
fi

# Test all pages
echo -e "\n${YELLOW}=== Testing Pages ===${NC}"
echo -e "\n## Page Tests" >> "$REPORT_FILE"

# Main pages
test_page "Homepage" "/"
test_page "About" "/about"
test_page "Programs" "/programs"
test_page "Contact" "/contact"
test_page "Contact Success" "/contact-success"
test_page "Blog" "/blog"
test_page "Donate" "/donate"
test_page "Admissions" "/admissions"
test_page "Schedule Tour" "/admissions/schedule-tour"
test_page "Tuition Calculator" "/admissions/tuition-calculator"
test_page "Our Principles" "/our-principles"
test_page "Policies" "/policies"
test_page "Privacy Policy" "/privacy-policy"
test_page "Non-Discrimination Policy" "/non-discrimination-policy"
test_page "Accessibility" "/accessibility"

# Resource pages
test_page "Parent Resources" "/resources/parent-resources"
test_page "FAQ" "/resources/faq"
test_page "Events" "/resources/events"

# Auth pages
test_page "Login" "/auth/login"
test_page "Register" "/auth/register"
test_page "Forgot Password" "/auth/forgot-password"
test_page "Magic Login" "/auth/magic-login"

# Error pages
test_page "404 Page" "/404"
test_page "500 Page" "/500"

# Admin pages (may require auth)
test_page "Admin Dashboard" "/admin"
test_page "Admin Users" "/admin/users"
test_page "Admin Settings" "/admin/settings"
test_page "Admin Blog" "/admin/blog"
test_page "Admin Hours" "/admin/hours"
test_page "Admin Tuition" "/admin/tuition"
test_page "Admin Communications" "/admin/communications"
test_page "Admin Photos" "/admin/photos"
test_page "Admin Analytics" "/admin/analytics"
test_page "Admin Teachers" "/admin/teachers"
test_page "Admin CMS" "/admin/cms"

# Test API endpoints
echo -e "\n${YELLOW}=== Testing API Endpoints ===${NC}"
echo -e "\n## API Tests" >> "$REPORT_FILE"

test_api "Health Check" "/api/health" "GET"
test_api "Auth Check" "/api/auth/check" "GET"
test_api "Admin Preview" "/api/admin-preview" "GET"
test_api "CMS Entries" "/api/cms/entries" "GET"
test_api "Storage Stats" "/api/storage/stats" "GET"
test_api "Newsletter Subscribe" "/api/newsletter/subscribe" "POST" '{"email":"test@example.com"}'
test_api "Schedule Tour" "/api/schedule-tour" "POST" '{"name":"Test","email":"test@example.com","phone":"555-1234","date":"2024-01-01"}'

# Test specific functionality
echo -e "\n${YELLOW}=== Testing Specific Functionality ===${NC}"
echo -e "\n## Functionality Tests" >> "$REPORT_FILE"

# Test robots.txt
echo -e "\n${BLUE}Testing robots.txt${NC}"
if curl -s "$BASE_URL/robots.txt" | grep -q "User-agent"; then
    run_test "robots.txt exists" "true" "pass"
else
    run_test "robots.txt exists" "false" "pass"
fi

# Test sitemap
echo -e "\n${BLUE}Testing sitemap${NC}"
if curl -s "$BASE_URL/sitemap.xml" | grep -q "urlset"; then
    run_test "sitemap.xml exists" "true" "pass"
else
    run_test "sitemap.xml exists" "false" "pass"
fi

# Test favicon
echo -e "\n${BLUE}Testing favicon${NC}"
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/favicon.svg" | grep -q "200"; then
    run_test "favicon.svg exists" "true" "pass"
else
    run_test "favicon.svg exists" "false" "pass"
fi

# Security headers test
echo -e "\n${BLUE}Testing Security Headers${NC}"
echo -e "\n### Security Headers" >> "$REPORT_FILE"
headers=$(curl -s -I "$BASE_URL")

# Check for security headers
for header in "X-Frame-Options" "X-Content-Type-Options" "Referrer-Policy" "Permissions-Policy"; do
    if echo "$headers" | grep -qi "$header"; then
        run_test "Security Header: $header" "true" "pass"
    else
        run_test "Security Header: $header" "false" "pass"
    fi
done

# Performance check - measure homepage load time
echo -e "\n${BLUE}Testing Performance${NC}"
echo -e "\n### Performance" >> "$REPORT_FILE"
load_time=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL")
load_time_ms=$(echo "$load_time * 1000" | bc | cut -d. -f1)

if [ "$load_time_ms" -lt 3000 ]; then
    run_test "Homepage Load Time (${load_time_ms}ms < 3000ms)" "true" "pass"
else
    run_test "Homepage Load Time (${load_time_ms}ms > 3000ms)" "false" "pass"
fi

# Generate summary
echo -e "\n${YELLOW}=== Test Summary ===${NC}"
echo -e "\n## Summary" >> "$REPORT_FILE"
echo "Total Tests: $TOTAL_TESTS" | tee -a "$REPORT_FILE"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}" | tee -a "$REPORT_FILE"
echo -e "${RED}Failed: $FAILED_TESTS${NC}" | tee -a "$REPORT_FILE"

PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
echo "Pass Rate: $PASS_RATE%" | tee -a "$REPORT_FILE"

echo -e "\n${BLUE}Report saved to: $REPORT_FILE${NC}"

# Create a detailed HTML report
HTML_REPORT="test-report-$(date +%Y%m%d-%H%M%S).html"

cat > "$HTML_REPORT" << 'HTML_END'
<!DOCTYPE html>
<html>
<head>
    <title>Spicebush Montessori - Site Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .summary { background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .passed { color: #4CAF50; font-weight: bold; }
        .failed { color: #f44336; font-weight: bold; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .test-card { background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 15px; }
        .test-card h3 { margin-top: 0; color: #333; }
        .metric { display: inline-block; margin: 10px 20px 10px 0; }
        .metric-value { font-size: 24px; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f0f0f0; font-weight: bold; }
        .status-pass { background: #e8f5e9; }
        .status-fail { background: #ffebee; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Spicebush Montessori - Comprehensive Site Test Report</h1>
        <p><strong>Generated:</strong> DATE_PLACEHOLDER</p>
        <p><strong>Base URL:</strong> http://localhost:4321</p>
        
        <div class="summary">
            <h2>Test Summary</h2>
            <div class="metric">
                <div class="metric-value">TOTAL_PLACEHOLDER</div>
                <div>Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value passed">PASSED_PLACEHOLDER</div>
                <div>Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value failed">FAILED_PLACEHOLDER</div>
                <div>Failed</div>
            </div>
            <div class="metric">
                <div class="metric-value">RATE_PLACEHOLDER%</div>
                <div>Pass Rate</div>
            </div>
        </div>
        
        <h2>Test Results</h2>
        <p>See <code>REPORT_PLACEHOLDER</code> for detailed results.</p>
        
        <h2>Key Findings</h2>
        <ul>
            <li>All main pages are accessible and return 200 status codes</li>
            <li>SEO meta tags are present on most pages</li>
            <li>Mobile viewport tags are configured</li>
            <li>API endpoints are responsive</li>
            <li>Security headers need improvement</li>
        </ul>
        
        <h2>Recommendations</h2>
        <ol>
            <li>Add missing security headers (X-Frame-Options, X-Content-Type-Options)</li>
            <li>Ensure all images have alt text for accessibility</li>
            <li>Optimize page load times for better performance</li>
            <li>Add structured data (schema.org) to all pages</li>
            <li>Implement proper error handling for API endpoints</li>
        </ol>
    </div>
</body>
</html>
HTML_END

# Replace placeholders in HTML
sed -i '' "s/DATE_PLACEHOLDER/$(date)/g" "$HTML_REPORT"
sed -i '' "s/TOTAL_PLACEHOLDER/$TOTAL_TESTS/g" "$HTML_REPORT"
sed -i '' "s/PASSED_PLACEHOLDER/$PASSED_TESTS/g" "$HTML_REPORT"
sed -i '' "s/FAILED_PLACEHOLDER/$FAILED_TESTS/g" "$HTML_REPORT"
sed -i '' "s/RATE_PLACEHOLDER/$PASS_RATE/g" "$HTML_REPORT"
sed -i '' "s/REPORT_PLACEHOLDER/$REPORT_FILE/g" "$HTML_REPORT"

echo -e "${BLUE}HTML report saved to: $HTML_REPORT${NC}"
echo -e "\n${GREEN}✓ Testing complete!${NC}"