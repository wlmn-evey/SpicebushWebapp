#!/bin/bash

# Security Audit Script for SpicebushWebapp
# This script helps identify potential security issues in the codebase

echo "🔍 Starting Security Audit..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for .env files that might be tracked
echo -e "\n${YELLOW}Checking for tracked .env files...${NC}"
TRACKED_ENV=$(git ls-files | grep -E "\.env($|\.)" | grep -v "\.env\.example" | grep -v "\.env\..*\.template" | grep -v "\.env\..*\.example")
if [ -n "$TRACKED_ENV" ]; then
    echo -e "${RED}⚠️  Found tracked .env files:${NC}"
    echo "$TRACKED_ENV"
    echo -e "${YELLOW}Run: git rm --cached <filename> to untrack them${NC}"
else
    echo -e "${GREEN}✅ No tracked .env files found${NC}"
fi

# Check for hardcoded credentials in current files
echo -e "\n${YELLOW}Scanning for potential hardcoded credentials...${NC}"
PATTERNS=(
    "supabase\.co"
    "SUPABASE_URL.*=.*https://"
    "SUPABASE_ANON_KEY.*=.*eyJ"
    "SUPABASE_SERVICE_ROLE_KEY.*=.*eyJ"
    "DB_PASSWORD.*=.*['\"]"
    "JWT_SECRET.*=.*['\"]"
    "API_KEY.*=.*['\"]"
    "SECRET_KEY.*=.*['\"]"
    "password.*=.*['\"]"
)

FOUND_ISSUES=0
for pattern in "${PATTERNS[@]}"; do
    RESULTS=$(grep -r -i -E "$pattern" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" --include="*.json" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist . 2>/dev/null | grep -v ".env.example" | grep -v ".template" | grep -v "placeholder" | grep -v "your-")
    if [ -n "$RESULTS" ]; then
        echo -e "${RED}⚠️  Found potential credential pattern: $pattern${NC}"
        echo "$RESULTS" | head -5
        echo "..."
        FOUND_ISSUES=$((FOUND_ISSUES + 1))
    fi
done

if [ $FOUND_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ No obvious hardcoded credentials found in current files${NC}"
fi

# Check git history for sensitive patterns
echo -e "\n${YELLOW}Checking git history for sensitive data...${NC}"
echo "This may take a moment..."

# Create a temporary file for patterns
cat > /tmp/sensitive_patterns.txt << EOF
SUPABASE_URL=https://
SUPABASE_ANON_KEY=eyJ
SUPABASE_SERVICE_ROLE_KEY=eyJ
DB_PASSWORD=
JWT_SECRET=
API_KEY=
SECRET_KEY=
password=
EOF

# Search git history
HISTORY_ISSUES=$(git grep -i -f /tmp/sensitive_patterns.txt $(git rev-list --all) 2>/dev/null | grep -v ".env.example" | grep -v ".template" | wc -l)

if [ $HISTORY_ISSUES -gt 0 ]; then
    echo -e "${RED}⚠️  Found $HISTORY_ISSUES potential sensitive data occurrences in git history${NC}"
    echo -e "${YELLOW}Consider using BFG Repo-Cleaner or git-filter-repo to clean history${NC}"
else
    echo -e "${GREEN}✅ No obvious sensitive data found in git history${NC}"
fi

# Clean up
rm -f /tmp/sensitive_patterns.txt

# Check .gitignore
echo -e "\n${YELLOW}Checking .gitignore configuration...${NC}"
GITIGNORE_PATTERNS=(
    ".env"
    ".env.*"
    "!.env.example"
)

MISSING_PATTERNS=0
for pattern in "${GITIGNORE_PATTERNS[@]}"; do
    if ! grep -q "^$pattern" .gitignore 2>/dev/null; then
        echo -e "${RED}⚠️  Missing pattern in .gitignore: $pattern${NC}"
        MISSING_PATTERNS=$((MISSING_PATTERNS + 1))
    fi
done

if [ $MISSING_PATTERNS -eq 0 ]; then
    echo -e "${GREEN}✅ .gitignore properly configured for .env files${NC}"
fi

# Summary
echo -e "\n${YELLOW}================================${NC}"
echo -e "${YELLOW}Security Audit Summary${NC}"
echo -e "${YELLOW}================================${NC}"

if [ $FOUND_ISSUES -eq 0 ] && [ $HISTORY_ISSUES -eq 0 ] && [ -z "$TRACKED_ENV" ] && [ $MISSING_PATTERNS -eq 0 ]; then
    echo -e "${GREEN}✅ No critical security issues found!${NC}"
else
    echo -e "${RED}⚠️  Found potential security issues that need attention${NC}"
    echo -e "\nRecommended actions:"
    echo "1. Remove any tracked .env files from git"
    echo "2. Review and remove hardcoded credentials"
    echo "3. Consider cleaning git history if sensitive data was committed"
    echo "4. Update .gitignore if needed"
fi

echo -e "\n${YELLOW}Additional recommendations:${NC}"
echo "- Use environment variables for all sensitive configuration"
echo "- Implement pre-commit hooks to prevent credential commits"
echo "- Regularly rotate credentials"
echo "- Use a secrets management service for production"