#!/bin/bash

# Setup Pre-commit Hooks for Security
echo "🔐 Setting up pre-commit hooks for credential security..."

# Create .gitleaks.toml configuration
cat > .gitleaks.toml << 'EOF'
title = "Gitleaks Configuration for SpicebushWebapp"

# Allowlist for test files
[allowlist]
paths = [
  '''.env.test''',
  '''.env.example''',
  '''*.template'''
]

# Custom rules for Supabase
[[rules]]
description = "Supabase URL"
regex = '''https://[a-z]{20}\.supabase\.co'''
tags = ["supabase", "url"]

[[rules]]
description = "Supabase Anon Key"
regex = '''eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+'''
tags = ["supabase", "key"]

[[rules]]
description = "Supabase Service Role Key"
regex = '''SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?[^"'\s]+["']?'''
tags = ["supabase", "service-key"]

[[rules]]
description = "Database Password"
regex = '''(DB_PASSWORD|DATABASE_PASSWORD|DB_PASS)\s*=\s*["']?[^"'\s]+["']?'''
tags = ["database", "password"]

[[rules]]
description = "Generic Secret"
regex = '''(SECRET|TOKEN|PASSWORD|KEY)\s*=\s*["']?[^"'\s]+["']?'''
tags = ["generic", "secret"]
EOF

# Create pre-commit script
mkdir -p .git/hooks
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 Running security checks..."

# Check for common credential patterns in staged files
PATTERNS=(
    "supabase\.co"
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
    "SUPABASE_SERVICE_ROLE_KEY="
    "DB_PASSWORD="
    "password\s*=\s*['\"]"
    "secret\s*=\s*['\"]"
    "api_key\s*=\s*['\"]"
)

FOUND_ISSUES=0
STAGED_FILES=$(git diff --staged --name-only --diff-filter=ACMR | grep -E "\.(js|ts|jsx|tsx|json|yml|yaml|env)$" | grep -v ".env.test" | grep -v ".env.example" | grep -v ".template")

if [ -n "$STAGED_FILES" ]; then
    for pattern in "${PATTERNS[@]}"; do
        RESULTS=$(echo "$STAGED_FILES" | xargs grep -l -E "$pattern" 2>/dev/null || true)
        if [ -n "$RESULTS" ]; then
            echo "❌ Found potential credential pattern: $pattern"
            echo "$RESULTS" | while read file; do
                echo "   In file: $file"
                grep -n -E "$pattern" "$file" | head -3
            done
            FOUND_ISSUES=$((FOUND_ISSUES + 1))
        fi
    done
fi

if [ $FOUND_ISSUES -gt 0 ]; then
    echo ""
    echo "⚠️  Potential security issues found!"
    echo "Please review the files above and ensure no credentials are being committed."
    echo ""
    echo "If these are false positives, you can bypass this check with:"
    echo "  git commit --no-verify"
    echo ""
    echo "But please be absolutely certain no real credentials are being committed!"
    exit 1
fi

echo "✅ Security checks passed"
EOF

chmod +x .git/hooks/pre-commit

# Install additional tools if needed
if ! command -v gitleaks &> /dev/null; then
    echo "📦 Installing gitleaks..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install gitleaks
        else
            echo "⚠️  Please install Homebrew or download gitleaks manually"
        fi
    else
        # Linux
        echo "⚠️  Please install gitleaks manually from: https://github.com/gitleaks/gitleaks"
    fi
fi

echo "✅ Pre-commit hooks setup complete!"
echo ""
echo "📋 What's been configured:"
echo "   - Pre-commit hook to scan for credentials"
echo "   - Gitleaks configuration file"
echo "   - Pattern matching for common secrets"
echo ""
echo "💡 Additional recommendations:"
echo "   - Consider using git-secrets: https://github.com/awslabs/git-secrets"
echo "   - Set up CI/CD scanning with GitHub Actions"
echo "   - Regularly rotate all credentials"