#!/bin/bash

# Test script for verifying path aliases work correctly
# This uses a simplified Vitest config to avoid Astro plugin conflicts

echo "Testing path alias resolution..."
echo "================================"
echo ""
echo "Testing aliases:"
echo "- @lib"
echo "- @components"
echo "- @layouts"
echo "- @utils"
echo ""

npx vitest run -c vitest.config.aliases.ts src/test/path-aliases.test.ts

echo ""
echo "Path alias test complete!"