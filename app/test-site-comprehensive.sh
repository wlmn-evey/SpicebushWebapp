#!/bin/bash

# Comprehensive Site Testing Script
# Tests the Spicebush Montessori website running at http://localhost:4321

BASE_URL="http://localhost:4321"
ERRORS_FOUND=0
WARNINGS_FOUND=0

echo "=== COMPREHENSIVE SPICEBUSH WEBSITE TEST ==="
echo "Testing website at: $BASE_URL"
echo "Started at: $(date)"
echo "============================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test a page
test_page() {
    local path=$1
    local name=$2
    echo -n "Testing $name ($path)... "
    
    # Test with curl and capture response
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
    
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        
        # Get page content for further checks
        content=$(curl -s "$BASE_URL$path")
        
        # Check for common error indicators in content
        if echo "$content" | grep -q "Error\|error\|ERROR" | grep -v "ErrorBoundary" | grep -v "error-message"; then
            echo -e "  ${YELLOW}⚠ Warning: Page contains error text${NC}"
            ((WARNINGS_FOUND++))
        fi
        
        # Check if page has actual content (not empty)
        if [ ${#content} -lt 1000 ]; then
            echo -e "  ${YELLOW}⚠ Warning: Page seems to have very little content (${#content} bytes)${NC}"
            ((WARNINGS_FOUND++))
        fi
        
        # Check for images without checking if they load
        img_count=$(echo "$content" | grep -o '<img' | wc -l)
        if [ $img_count -gt 0 ]; then
            echo "  ℹ Found $img_count image tags"
        fi
        
    else
        echo -e "${RED}✗ FAILED (HTTP $response)${NC}"
        ((ERRORS_FOUND++))
    fi
}

echo "1. TESTING PAGE ACCESSIBILITY"
echo "============================="
test_page "/" "Homepage"
test_page "/about" "About"
test_page "/programs" "Programs"
test_page "/admissions" "Admissions"
test_page "/admissions/schedule-tour" "Schedule Tour"
test_page "/admissions/tuition-calculator" "Tuition Calculator"
test_page "/blog" "Blog"
test_page "/contact" "Contact"
test_page "/donate" "Donate"
test_page "/resources/faq" "FAQ"
test_page "/resources/parent-resources" "Parent Resources"
test_page "/resources/events" "Events"
test_page "/our-principles" "Our Principles"
test_page "/policies" "Policies"
test_page "/non-discrimination-policy" "Non-Discrimination Policy"
test_page "/privacy-policy" "Privacy Policy"

echo ""
echo "2. TESTING SPECIFIC FUNCTIONALITY"
echo "================================="

# Test if homepage has key sections
echo -n "Checking homepage content... "
homepage_content=$(curl -s "$BASE_URL/")
has_hero=$(echo "$homepage_content" | grep -q "hero\|Hero" && echo "yes" || echo "no")
has_testimonials=$(echo "$homepage_content" | grep -q "testimonial\|Testimonial" && echo "yes" || echo "no")
has_cta=$(echo "$homepage_content" | grep -q "Schedule\|Tour" && echo "yes" || echo "no")

if [ "$has_hero" = "yes" ] && [ "$has_testimonials" = "yes" ] && [ "$has_cta" = "yes" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "  ✓ Hero section found"
    echo "  ✓ Testimonials found"
    echo "  ✓ Call-to-action found"
else
    echo -e "${YELLOW}⚠ Some sections might be missing${NC}"
    [ "$has_hero" = "no" ] && echo "  ⚠ Hero section not clearly identified"
    [ "$has_testimonials" = "no" ] && echo "  ⚠ Testimonials section not found"
    [ "$has_cta" = "no" ] && echo "  ⚠ Call-to-action not found"
    ((WARNINGS_FOUND++))
fi

# Test FAQ page for accordion elements
echo -n "Checking FAQ accordion... "
faq_content=$(curl -s "$BASE_URL/resources/faq")
has_details=$(echo "$faq_content" | grep -q "<details\|<summary" && echo "yes" || echo "no")
has_accordion=$(echo "$faq_content" | grep -q "accordion\|faq-item" && echo "yes" || echo "no")

if [ "$has_details" = "yes" ] || [ "$has_accordion" = "yes" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "  ✓ FAQ structure found"
else
    echo -e "${YELLOW}⚠ FAQ accordion structure not clearly identified${NC}"
    ((WARNINGS_FOUND++))
fi

# Test Schedule Tour form
echo -n "Checking Schedule Tour form... "
form_content=$(curl -s "$BASE_URL/admissions/schedule-tour")
has_form=$(echo "$form_content" | grep -q "<form" && echo "yes" || echo "no")
has_inputs=$(echo "$form_content" | grep -q "<input\|<textarea\|<select" && echo "yes" || echo "no")

if [ "$has_form" = "yes" ] && [ "$has_inputs" = "yes" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "  ✓ Form element found"
    echo "  ✓ Input fields found"
else
    echo -e "${RED}✗ Form not found or incomplete${NC}"
    ((ERRORS_FOUND++))
fi

# Test Tuition Calculator
echo -n "Checking Tuition Calculator... "
calc_content=$(curl -s "$BASE_URL/admissions/tuition-calculator")
has_calculator=$(echo "$calc_content" | grep -q "calculator\|tuition" && echo "yes" || echo "no")
has_selects=$(echo "$calc_content" | grep -q "<select\|radio" && echo "yes" || echo "no")

if [ "$has_calculator" = "yes" ] && [ "$has_selects" = "yes" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "  ✓ Calculator elements found"
else
    echo -e "${YELLOW}⚠ Calculator might not be fully functional${NC}"
    ((WARNINGS_FOUND++))
fi

# Test Blog for posts
echo -n "Checking Blog posts... "
blog_content=$(curl -s "$BASE_URL/blog")
has_articles=$(echo "$blog_content" | grep -q "<article\|blog-post\|post" && echo "yes" || echo "no")

if [ "$has_articles" = "yes" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "  ✓ Blog posts found"
else
    echo -e "${YELLOW}⚠ Blog posts not clearly identified${NC}"
    ((WARNINGS_FOUND++))
fi

# Test Staff/Teachers display
echo -n "Checking Staff display... "
about_content=$(curl -s "$BASE_URL/about")
has_staff=$(echo "$about_content" | grep -q "staff\|teacher\|Teacher" && echo "yes" || echo "no")

if [ "$has_staff" = "yes" ]; then
    echo -e "${GREEN}✓ OK${NC}"
    echo "  ✓ Staff information found"
else
    echo -e "${YELLOW}⚠ Staff section not clearly identified${NC}"
    ((WARNINGS_FOUND++))
fi

echo ""
echo "3. TESTING STATIC ASSETS"
echo "========================"

# Test key images
echo "Testing key images..."
test_image() {
    local path=$1
    local name=$2
    echo -n "  $name... "
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$path")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC}"
    else
        echo -e "${RED}✗ FAILED (HTTP $response)${NC}"
        ((ERRORS_FOUND++))
    fi
}

test_image "/SpicebushLogo-03.png" "Logo"
test_image "/favicon.svg" "Favicon"

echo ""
echo "4. TESTING MOBILE RESPONSIVENESS"
echo "================================"
echo "Note: Manual testing required for full mobile functionality"
echo "Checking for viewport meta tag..."

homepage_viewport=$(curl -s "$BASE_URL/" | grep -o 'viewport')
if [ -n "$homepage_viewport" ]; then
    echo -e "${GREEN}✓ Viewport meta tag found${NC}"
else
    echo -e "${YELLOW}⚠ Viewport meta tag not found${NC}"
    ((WARNINGS_FOUND++))
fi

echo ""
echo "============================================"
echo "TEST SUMMARY"
echo "============================================"
echo "Completed at: $(date)"
echo ""

if [ $ERRORS_FOUND -eq 0 ] && [ $WARNINGS_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ ALL TESTS PASSED!${NC}"
    echo "No errors or warnings found."
else
    echo -e "Found ${RED}$ERRORS_FOUND errors${NC} and ${YELLOW}$WARNINGS_FOUND warnings${NC}"
    echo ""
    echo "RECOMMENDATIONS:"
    if [ $ERRORS_FOUND -gt 0 ]; then
        echo "- Fix critical errors (pages not loading, forms missing)"
    fi
    if [ $WARNINGS_FOUND -gt 0 ]; then
        echo "- Review warnings for potential issues"
    fi
    echo "- Perform manual testing for:"
    echo "  • JavaScript functionality"
    echo "  • Image loading and display"
    echo "  • Mobile navigation and sticky bottom nav"
    echo "  • Form submission and validation"
    echo "  • Tuition calculator interactions"
    echo "  • FAQ accordion interactions"
fi

echo ""
echo "For detailed JavaScript console errors and interactive testing,"
echo "please use browser developer tools or automated browser testing."

exit $ERRORS_FOUND