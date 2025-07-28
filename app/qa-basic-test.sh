#!/bin/bash

# Basic QA test script for Spicebush Montessori School website
# Tests the Docker site at http://localhost:4321

echo "=== SPICEBUSH MONTESSORI SCHOOL - QA REVIEW ==="
echo "Testing site at http://localhost:4321"
echo ""

BASE_URL="http://localhost:4321"
ISSUES=()

# Function to check page load
check_page() {
    local name="$1"
    local path="$2"
    local url="${BASE_URL}${path}"
    
    echo -n "Testing ${name} (${path})... "
    
    # Get HTTP status code
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "200" ]; then
        echo "✓ OK"
        
        # Check page content size
        content_size=$(curl -s "$url" | wc -c)
        if [ "$content_size" -lt 1000 ]; then
            ISSUES+=("[MEDIUM] ${name}: Page content suspiciously small (${content_size} bytes)")
        fi
        
        # Check for common error patterns
        if curl -s "$url" | grep -q -E "(404|Not Found|Error|Exception|Cannot GET)"; then
            ISSUES+=("[HIGH] ${name}: Page contains error text")
        fi
    else
        echo "✗ Failed (HTTP ${status})"
        ISSUES+=("[HIGH] ${name}: Page returned HTTP ${status}")
    fi
}

# Test all main pages
echo "=== TESTING PAGE LOADS ==="
check_page "Homepage" "/"
check_page "About" "/about"
check_page "Programs" "/programs"
check_page "Admissions" "/admissions"
check_page "Blog" "/blog"
check_page "Contact" "/contact"
check_page "FAQ" "/faq"
check_page "Schedule Tour" "/schedule-tour"

# Check for static assets
echo ""
echo "=== TESTING STATIC ASSETS ==="

# Check CSS
echo -n "Testing CSS loading... "
css_status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/_astro/" -H "Accept: text/css")
if [ "$css_status" = "404" ]; then
    ISSUES+=("[HIGH] CSS assets not found - build may have failed")
    echo "✗ Failed"
else
    echo "✓ OK"
fi

# Quick content checks
echo ""
echo "=== TESTING CONTENT RENDERING ==="

# Check if homepage has expected content
echo -n "Checking homepage content... "
homepage_content=$(curl -s "$BASE_URL")
if echo "$homepage_content" | grep -q "Spicebush"; then
    echo "✓ Found school name"
else
    ISSUES+=("[HIGH] Homepage: Missing school name - possible rendering issue")
    echo "✗ Missing school name"
fi

# Check for navigation menu
echo -n "Checking navigation menu... "
if echo "$homepage_content" | grep -q -E "(nav|menu|Programs|About|Contact)"; then
    echo "✓ Found navigation elements"
else
    ISSUES+=("[HIGH] Homepage: Navigation menu not found")
    echo "✗ Navigation not found"
fi

# Check blog for posts
echo -n "Checking blog posts... "
blog_content=$(curl -s "${BASE_URL}/blog")
if echo "$blog_content" | grep -q -E "(article|post|blog)"; then
    echo "✓ Found blog elements"
else
    ISSUES+=("[MEDIUM] Blog: No blog posts found - CMS content may not be rendering")
    echo "✗ No blog posts found"
fi

# Check for images
echo -n "Checking for images... "
if echo "$homepage_content" | grep -q -E "<img.*src="; then
    echo "✓ Found image tags"
    
    # Extract and test a few image URLs
    img_urls=$(echo "$homepage_content" | grep -oE 'src="[^"]+\.(jpg|jpeg|png|webp|svg)"' | sed 's/src="//' | sed 's/"$//' | head -5)
    for img in $img_urls; do
        if [[ $img == /* ]]; then
            img_url="${BASE_URL}${img}"
        else
            img_url="$img"
        fi
        
        img_status=$(curl -s -o /dev/null -w "%{http_code}" "$img_url" 2>/dev/null)
        if [ "$img_status" != "200" ] && [ "$img_status" != "304" ]; then
            ISSUES+=("[MEDIUM] Images: Broken image at ${img_url} (HTTP ${img_status})")
        fi
    done
else
    ISSUES+=("[HIGH] Homepage: No images found")
    echo "✗ No images found"
fi

# Check forms
echo ""
echo "=== TESTING FORMS ==="

echo -n "Checking Schedule Tour form... "
tour_content=$(curl -s "${BASE_URL}/schedule-tour")
if echo "$tour_content" | grep -q -E "(form|input.*name|button.*submit)"; then
    echo "✓ Found form elements"
else
    ISSUES+=("[HIGH] Schedule Tour: Form not found")
    echo "✗ Form not found"
fi

# Summary
echo ""
echo "=== QA REVIEW SUMMARY ==="
echo ""

if [ ${#ISSUES[@]} -eq 0 ]; then
    echo "✅ No issues found! The website appears to be functioning correctly."
else
    echo "Found ${#ISSUES[@]} issue(s):"
    echo ""
    for issue in "${ISSUES[@]}"; do
        echo "• $issue"
    done
fi

echo ""
echo "Note: This is a basic test. For comprehensive testing including JavaScript"
echo "functionality, mobile responsiveness, and interactive features, please run"
echo "the Playwright test script once dependencies are resolved."