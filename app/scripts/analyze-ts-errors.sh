#!/bin/bash

echo "Analyzing TypeScript errors..."
npm run typecheck 2>&1 | grep "error" | head -50 > ts-errors.log
echo "Top 50 errors saved to ts-errors.log"

# Count errors by type
echo -e "\nError Summary:"
echo "=============="
grep -oE "ts\([0-9]+\)" ts-errors.log | sort | uniq -c | sort -rn | head -10

# Count total errors
TOTAL_ERRORS=$(npm run typecheck 2>&1 | grep -c "error")
echo -e "\nTotal TypeScript errors: $TOTAL_ERRORS"

# Identify most problematic files
echo -e "\nMost problematic files:"
echo "======================="
npm run typecheck 2>&1 | grep "error" | cut -d: -f1 | sort | uniq -c | sort -rn | head -10