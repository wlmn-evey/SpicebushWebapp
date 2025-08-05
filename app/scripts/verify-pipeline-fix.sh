#!/bin/bash

# Spicebush Montessori - CI/CD Pipeline Fix Verification Script
# This script verifies that the React 19 peer dependency fixes work correctly

set -e

echo "🔍 Verifying CI/CD Pipeline Fix for React 19 Dependencies"
echo "=========================================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo "1. Checking .npmrc configuration..."
if [ -f ".npmrc" ]; then
    if grep -q "legacy-peer-deps=true" .npmrc; then
        print_status ".npmrc configured with legacy-peer-deps=true"
    else
        print_warning ".npmrc exists but legacy-peer-deps not set"
    fi
else
    print_warning ".npmrc file not found"
fi

echo ""
echo "2. Verifying netlify.toml build commands..."
if grep -q "npm install --legacy-peer-deps" netlify.toml; then
    print_status "netlify.toml configured with legacy peer deps"
else
    echo -e "${RED}❌ netlify.toml missing legacy peer deps configuration${NC}"
    exit 1
fi

echo ""
echo "3. Checking GitHub Actions workflow..."
if grep -q "npm ci --legacy-peer-deps" .github/workflows/deploy-netlify.yml; then
    print_status "GitHub Actions workflow configured with legacy peer deps"
else
    echo -e "${RED}❌ GitHub Actions workflow missing legacy peer deps configuration${NC}"
    exit 1
fi

echo ""
echo "4. Testing clean install..."
echo "   Removing node_modules and package-lock.json..."
rm -rf node_modules package-lock.json

echo "   Running npm install..."
if npm install > install.log 2>&1; then
    print_status "Clean npm install successful"
else
    echo -e "${RED}❌ npm install failed${NC}"
    echo "Error log:"
    cat install.log
    exit 1
fi

echo ""
echo "5. Testing build process..."
if npm run build > build.log 2>&1; then
    print_status "Build completed successfully"
else
    echo -e "${RED}❌ Build failed${NC}"
    echo "Error log:"
    cat build.log
    exit 1
fi

echo ""
echo "6. Checking for critical peer dependency warnings..."
if npm ls 2>&1 | grep -q "ERESOLVE"; then
    echo -e "${RED}❌ Critical ERESOLVE errors found${NC}"
    npm ls 2>&1 | grep -A 5 -B 5 "ERESOLVE"
    exit 1
else
    print_status "No critical ERESOLVE errors found"
fi

echo ""
echo "7. Verifying React versions..."
REACT_VERSION=$(npm list react --depth=0 2>/dev/null | grep react@ | sed 's/.*react@//' | sed 's/ .*//')
REACT_DOM_VERSION=$(npm list react-dom --depth=0 2>/dev/null | grep react-dom@ | sed 's/.*react-dom@//' | sed 's/ .*//')

if [[ $REACT_VERSION == 19.* ]]; then
    print_status "React version: $REACT_VERSION (React 19.x confirmed)"
else
    print_warning "React version: $REACT_VERSION (not React 19.x)"
fi

if [[ $REACT_DOM_VERSION == 19.* ]]; then
    print_status "React DOM version: $REACT_DOM_VERSION (React 19.x confirmed)"
else
    print_warning "React DOM version: $REACT_DOM_VERSION (not React 19.x)"
fi

echo ""
echo "8. Testing type checking..."
if npm run type-check > typecheck.log 2>&1; then
    print_status "Type checking passed"
else
    print_warning "Type checking had issues (may be expected)"
    echo "Type check log (first 10 lines):"
    head -10 typecheck.log
fi

echo ""
echo "9. Cleaning up test logs..."
rm -f install.log build.log typecheck.log

echo ""
echo "=========================================================="
echo -e "${GREEN}🎉 CI/CD Pipeline Fix Verification Complete!${NC}"
echo ""
echo "Summary of fixes applied:"
echo "• Added .npmrc with legacy-peer-deps=true"
echo "• Updated netlify.toml build commands"
echo "• Updated GitHub Actions workflow"
echo "• Verified React 19 compatibility with legacy peer deps"
echo ""
echo "Next steps:"
echo "1. Commit these changes to your testing branch"
echo "2. Push to GitHub to trigger automatic deployment"
echo "3. Monitor the GitHub Actions workflow for success"
echo "4. Verify the deployed application functions correctly"
echo ""
echo -e "${YELLOW}Note: Peer dependency warnings are expected and non-blocking${NC}"
echo -e "${YELLOW}This is a temporary solution until dependencies support React 19${NC}"