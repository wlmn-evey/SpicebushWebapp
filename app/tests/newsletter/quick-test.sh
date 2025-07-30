#!/bin/bash

# Quick Newsletter Feature Test
# This script performs a basic end-to-end test of the newsletter feature

echo "Quick Newsletter Feature Test"
echo "============================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL (adjust if running on different port)
BASE_URL="http://localhost:4321"

# Test email (use timestamp to make unique)
TEST_EMAIL="test-$(date +%s)@example.com"

echo -e "${BLUE}Testing newsletter subscription API...${NC}"
echo ""

# Test 1: Subscribe a new email
echo -e "${YELLOW}1. Testing new subscription${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\", \"signup_source\": \"test_script\"}")

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Successfully subscribed $TEST_EMAIL${NC}"
else
    echo -e "${RED}✗ Failed to subscribe: $RESPONSE${NC}"
fi

echo ""

# Test 2: Try to subscribe same email again
echo -e "${YELLOW}2. Testing duplicate subscription${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

if echo "$RESPONSE" | grep -q "already subscribed"; then
    echo -e "${GREEN}✓ Correctly prevented duplicate subscription${NC}"
else
    echo -e "${RED}✗ Duplicate check failed: $RESPONSE${NC}"
fi

echo ""

# Test 3: Invalid email
echo -e "${YELLOW}3. Testing invalid email validation${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/newsletter/subscribe" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"invalid-email\"}")

if echo "$RESPONSE" | grep -q "Invalid email"; then
    echo -e "${GREEN}✓ Invalid email correctly rejected${NC}"
else
    echo -e "${RED}✗ Invalid email not rejected: $RESPONSE${NC}"
fi

echo ""

# Test 4: Check if admin endpoint requires auth
echo -e "${YELLOW}4. Testing admin authentication${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/admin/newsletter?action=stats")

if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Admin endpoint correctly requires authentication${NC}"
else
    echo -e "${RED}✗ Admin endpoint not properly secured (HTTP $HTTP_CODE)${NC}"
fi

echo ""

# Manual tests reminder
echo -e "${BLUE}Manual Tests to Perform:${NC}"
echo ""
echo "1. Visual Tests:"
echo "   - Visit $BASE_URL and scroll to footer"
echo "   - Verify newsletter signup form is visible"
echo "   - Try signing up with a new email"
echo "   - Check success message appears"
echo ""
echo "2. Admin Interface:"
echo "   - Log in as admin"
echo "   - Visit $BASE_URL/admin/newsletter"
echo "   - Verify statistics are shown"
echo "   - Check if $TEST_EMAIL appears in the list"
echo "   - Try the export CSV function"
echo ""
echo "3. Database Check:"
echo "   Run: psql DATABASE_URL -c \"SELECT email, subscription_status FROM newsletter_subscribers WHERE email LIKE '%$TEST_EMAIL%'\""
echo ""
echo -e "${GREEN}Quick test completed!${NC}"