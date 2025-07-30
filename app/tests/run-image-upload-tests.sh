#!/bin/bash
# ImageUpload Component Test Runner
# Runs both unit and integration tests for the ImageUpload component

set -e

echo "================================================"
echo "ImageUpload Component Test Suite"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required dependencies are installed
echo "Checking dependencies..."

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Install required test dependencies if not present
echo "Installing test dependencies..."
npm list jsdom &>/dev/null || npm install --save-dev jsdom
npm list @types/jsdom &>/dev/null || npm install --save-dev @types/jsdom

echo ""
echo "Running tests..."
echo ""

# Run unit tests with Vitest
echo -e "${YELLOW}1. Running Unit Tests${NC}"
echo "================================"
npm run test -- tests/components/ImageUpload.test.ts --reporter=verbose

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Unit tests passed${NC}"
else
    echo -e "${RED}✗ Unit tests failed${NC}"
    exit 1
fi

echo ""

# Run integration tests with Playwright
echo -e "${YELLOW}2. Running Integration Tests${NC}"
echo "================================"

# Check if the dev server is running
if ! curl -s http://localhost:4321 > /dev/null; then
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev &
    SERVER_PID=$!
    
    # Wait for server to start
    echo "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:4321 > /dev/null; then
            echo -e "${GREEN}Server is ready${NC}"
            break
        fi
        sleep 1
    done
fi

# Run Playwright tests
npx playwright test tests/integration/ImageUpload.spec.ts --reporter=list

PLAYWRIGHT_EXIT_CODE=$?

# Stop dev server if we started it
if [ ! -z "$SERVER_PID" ]; then
    echo "Stopping dev server..."
    kill $SERVER_PID 2>/dev/null || true
fi

if [ $PLAYWRIGHT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Integration tests passed${NC}"
else
    echo -e "${RED}✗ Integration tests failed${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo -e "${GREEN}All tests passed successfully!${NC}"
echo "================================================"

# Generate test report
echo ""
echo "Generating test report..."

cat > tests/image-upload-test-report.md << EOF
# ImageUpload Component Test Report

Generated on: $(date)

## Test Coverage

### Unit Tests (Vitest)
- ✅ File Selection
  - File input handling
  - File type validation
  - File size validation
  
- ✅ Drag and Drop
  - Dragover event handling
  - Dragleave event handling
  - Drop event with valid files
  - Disabled state handling
  
- ✅ Upload Progress
  - XMLHttpRequest progress tracking
  - Progress bar updates
  - Percentage display
  
- ✅ Error Handling
  - HTTP status code mapping
  - Custom error messages
  - Network failures
  
- ✅ Image Preview and Removal
  - Preview display
  - Remove button functionality
  - State reset

- ✅ Image Dimension Validation
  - Minimum size checking
  - Maximum size checking
  - Valid dimension acceptance

### Integration Tests (Playwright)
- ✅ Blog Editor Integration
  - Image upload workflow
  - Drag and drop in browser
  - Form integration
  
- ✅ Staff Editor Integration
  - Staff photo upload
  - Form submission readiness
  
- ✅ Error Scenarios
  - Network failures
  - Authentication errors
  - Server errors with messages
  
- ✅ Progress Tracking
  - Real-time progress updates
  - Visual feedback
  
- ✅ Accessibility
  - Keyboard navigation
  - ARIA attributes
  
- ✅ Advanced Scenarios
  - Rapid successive uploads
  - State persistence across validation

## Key Features Tested

1. **File Upload with Progress**
   - XMLHttpRequest implementation
   - Real-time percentage tracking
   - Visual progress bar

2. **Client-side Validation**
   - File type checking (JPG, PNG, WebP, GIF)
   - File size limits (10MB default)
   - Image dimension validation

3. **Error Handling**
   - User-friendly error messages
   - HTTP status code mapping
   - Network failure handling

4. **User Experience**
   - Drag and drop support
   - Image preview
   - Easy removal
   - Keyboard accessibility

## Recommendations

1. **Performance Testing**: Consider adding tests for:
   - Large file upload performance
   - Multiple concurrent uploads
   - Memory usage during uploads

2. **Browser Compatibility**: Test across:
   - Chrome, Firefox, Safari, Edge
   - Mobile browsers
   - Different viewport sizes

3. **Production Monitoring**: Implement:
   - Error tracking for failed uploads
   - Upload success/failure metrics
   - Performance monitoring

EOF

echo -e "${GREEN}Test report generated: tests/image-upload-test-report.md${NC}"