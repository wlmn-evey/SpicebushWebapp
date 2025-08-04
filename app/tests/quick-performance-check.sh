#!/bin/bash

echo "🚀 Quick Performance Check"
echo "=========================="

SITE_URL=${SITE_URL:-"http://localhost:4321"}

# Test pages
PAGES=(
    "/"
    "/about"
    "/admissions"
    "/programs"
    "/contact"
    "/tuition-calculator"
    "/blog"
    "/calendar"
)

echo "Testing site: $SITE_URL"
echo ""

TOTAL_TIME=0
FAILED=0
SLOW_PAGES=0

for page in "${PAGES[@]}"; do
    printf "Testing %-20s ... " "$page"
    
    # Measure time and get status code
    START=$(date +%s%N)
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL$page")
    END=$(date +%s%N)
    
    # Calculate time in milliseconds
    TIME_MS=$(( (END - START) / 1000000 ))
    TOTAL_TIME=$((TOTAL_TIME + TIME_MS))
    
    if [ "$STATUS" = "200" ]; then
        if [ $TIME_MS -lt 3000 ]; then
            echo "✅ ${TIME_MS}ms (HTTP $STATUS)"
        else
            echo "⚠️  ${TIME_MS}ms (HTTP $STATUS) - SLOW"
            SLOW_PAGES=$((SLOW_PAGES + 1))
        fi
    else
        echo "❌ ${TIME_MS}ms (HTTP $STATUS) - FAILED"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "Summary:"
echo "--------"
AVG_TIME=$((TOTAL_TIME / ${#PAGES[@]}))
echo "Average load time: ${AVG_TIME}ms"
echo "Failed pages: $FAILED"
echo "Slow pages (>3s): $SLOW_PAGES"

if [ $FAILED -eq 0 ] && [ $AVG_TIME -lt 3000 ]; then
    echo ""
    echo "✅ All pages loading successfully!"
    echo "✅ Average load time under 3 seconds!"
    echo ""
    echo "The site is working properly without HTTP 500 errors."
    exit 0
else
    echo ""
    echo "❌ Performance issues detected"
    exit 1
fi