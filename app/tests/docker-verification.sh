#!/bin/bash

echo "🐳 Docker Environment Verification"
echo "=================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Helper function to run a test
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "Testing $test_name... "
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

# 1. Check if Docker is running
run_test "Docker daemon" "docker info"

# 2. Check if docker-compose is available
run_test "Docker Compose" "docker compose version"

# 3. Check if the startup script exists
run_test "Startup script exists" "test -f ./docker-hosted.sh"

# 4. Check if the startup script is executable
run_test "Startup script is executable" "test -x ./docker-hosted.sh"

# 5. Start the containers
echo -e "\n${YELLOW}Starting Docker containers...${NC}"
./docker-hosted.sh &
DOCKER_PID=$!

# Wait for containers to start
echo "Waiting for services to start (60 seconds)..."
sleep 60

# 6. Check if containers are running
echo -e "\n${YELLOW}Checking container status...${NC}"
run_test "App container running" "docker ps | grep -q app-app-1"
run_test "Mailhog container running" "docker ps | grep -q app-mailhog-1"

# 7. Check service availability
echo -e "\n${YELLOW}Checking service availability...${NC}"
run_test "App responds on port 4321" "curl -f -s http://localhost:4321 > /dev/null"
run_test "Health check endpoint" "curl -f -s http://localhost:4321/api/health > /dev/null"

# 8. Check for HTTP errors
echo -e "\n${YELLOW}Checking for HTTP errors...${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4321)
if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "Homepage HTTP status: ${GREEN}$HTTP_STATUS OK${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "Homepage HTTP status: ${RED}$HTTP_STATUS ERROR${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 9. Measure page load time
echo -e "\n${YELLOW}Measuring page load performance...${NC}"
START_TIME=$(date +%s%N)
curl -s http://localhost:4321 > /dev/null
END_TIME=$(date +%s%N)
LOAD_TIME=$((($END_TIME - $START_TIME) / 1000000))

echo "Page load time: ${LOAD_TIME}ms"
if [ $LOAD_TIME -lt 3000 ]; then
    echo -e "${GREEN}✓ Performance is good (< 3 seconds)${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ Performance is slow (> 3 seconds)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# 10. Check Docker logs for errors
echo -e "\n${YELLOW}Checking Docker logs for errors...${NC}"
ERROR_COUNT=$(docker logs app-app-1 2>&1 | grep -i "error" | grep -v "errorCaptured" | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ No errors in Docker logs${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${YELLOW}⚠ Found $ERROR_COUNT error(s) in Docker logs${NC}"
    echo "Recent errors:"
    docker logs app-app-1 2>&1 | grep -i "error" | grep -v "errorCaptured" | tail -5
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Summary
echo -e "\n=================================="
echo "📊 TEST SUMMARY"
echo "=================================="
echo -e "Total tests: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Docker environment is working correctly.${NC}"
else
    echo -e "\n${RED}❌ Some tests failed. Please check the errors above.${NC}"
fi

# Cleanup
echo -e "\n${YELLOW}Stopping Docker containers...${NC}"
docker compose down

exit $FAILED_TESTS