#!/bin/bash
# Netlify Build Failure Fix Script
# Generated: August 5, 2025
# Purpose: Fix Netlify automatic deployment failures

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Site ID for testing site
TESTING_SITE_ID="27a429f4-9a58-4421-bc1f-126d70d81aa1"

print_header() {
    echo -e "\n${BLUE}================================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}================================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Netlify CLI is installed
check_netlify_cli() {
    if ! command -v netlify &> /dev/null; then
        print_error "Netlify CLI not found. Install with: npm install -g netlify-cli"
        exit 1
    fi
    print_success "Netlify CLI found"
}

# Check if user is authenticated
check_auth() {
    if ! netlify status &> /dev/null; then
        print_error "Not authenticated with Netlify. Run: netlify login"
        exit 1
    fi
    print_success "Netlify authentication confirmed"
}

# Phase 1: Diagnose Current State
diagnose_current_state() {
    print_header "PHASE 1: DIAGNOSING CURRENT STATE"
    
    echo "🔍 Checking current environment variables..."
    
    echo -e "\n${YELLOW}Current Environment Variables:${NC}"
    netlify env:list --site="$TESTING_SITE_ID" || print_warning "Could not list environment variables"
    
    echo -e "\n${YELLOW}Site Information:${NC}"
    netlify sites:list | grep "$TESTING_SITE_ID" || print_warning "Could not find site"
    
    echo -e "\n${YELLOW}Recent Deployments:${NC}"
    netlify api listSiteDeploys --site="$TESTING_SITE_ID" --data='{"per_page": 3}' | head -20 || print_warning "Could not get deployment history"
}

# Phase 2: Fix Environment Variables
fix_environment_variables() {
    print_header "PHASE 2: CONFIGURING MISSING ENVIRONMENT VARIABLES"
    
    echo "⚠️  This script will help you configure missing environment variables."
    echo "📋 You'll need the following values from your Supabase dashboard:"
    echo "   • PUBLIC_SUPABASE_ANON_KEY (Settings → API)"
    echo "   • SUPABASE_SERVICE_ROLE_KEY (Settings → API)" 
    echo "   • DATABASE_URL (Settings → Database → Connection string)"
    echo ""
    
    read -p "Do you have these values ready? (y/N): " PROCEED
    if [[ ! $PROCEED =~ ^[Yy]$ ]]; then
        print_info "Please gather these values and run the script again."
        print_info "Supabase Dashboard: https://supabase.com/dashboard"
        exit 0
    fi
    
    # PUBLIC_SUPABASE_ANON_KEY
    echo -e "\n${YELLOW}Setting PUBLIC_SUPABASE_ANON_KEY...${NC}"
    read -p "Enter your PUBLIC_SUPABASE_ANON_KEY (starts with eyJ...): " ANON_KEY
    if [[ -n "$ANON_KEY" ]]; then
        netlify env:set PUBLIC_SUPABASE_ANON_KEY "$ANON_KEY" --site="$TESTING_SITE_ID"
        print_success "PUBLIC_SUPABASE_ANON_KEY configured"
    else
        print_warning "Skipped PUBLIC_SUPABASE_ANON_KEY"
    fi
    
    # SUPABASE_SERVICE_ROLE_KEY  
    echo -e "\n${YELLOW}Setting SUPABASE_SERVICE_ROLE_KEY...${NC}"
    read -p "Enter your SUPABASE_SERVICE_ROLE_KEY (starts with eyJ...): " SERVICE_KEY
    if [[ -n "$SERVICE_KEY" ]]; then
        netlify env:set SUPABASE_SERVICE_ROLE_KEY "$SERVICE_KEY" --site="$TESTING_SITE_ID"
        print_success "SUPABASE_SERVICE_ROLE_KEY configured"
    else
        print_warning "Skipped SUPABASE_SERVICE_ROLE_KEY"
    fi
    
    # DATABASE_URL
    echo -e "\n${YELLOW}Setting DATABASE_URL...${NC}"
    read -p "Enter your DATABASE_URL (postgresql://...): " DATABASE_URL
    if [[ -n "$DATABASE_URL" ]]; then
        netlify env:set DATABASE_URL "$DATABASE_URL" --site="$TESTING_SITE_ID"
        print_success "DATABASE_URL configured"
        
        # DIRECT_URL (usually same as DATABASE_URL)
        read -p "Enter DIRECT_URL (press Enter to use same as DATABASE_URL): " DIRECT_URL
        if [[ -z "$DIRECT_URL" ]]; then
            DIRECT_URL="$DATABASE_URL"
        fi
        netlify env:set DIRECT_URL "$DIRECT_URL" --site="$TESTING_SITE_ID"
        print_success "DIRECT_URL configured"
    else
        print_warning "Skipped DATABASE_URL and DIRECT_URL"
    fi
    
    # Optional: Stripe keys
    echo -e "\n${YELLOW}Optional: Stripe Configuration${NC}"
    read -p "Do you want to configure Stripe keys? (y/N): " CONFIGURE_STRIPE
    if [[ $CONFIGURE_STRIPE =~ ^[Yy]$ ]]; then
        read -p "Enter PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_test...): " STRIPE_PUB_KEY
        if [[ -n "$STRIPE_PUB_KEY" ]]; then
            netlify env:set PUBLIC_STRIPE_PUBLISHABLE_KEY "$STRIPE_PUB_KEY" --site="$TESTING_SITE_ID"
            print_success "PUBLIC_STRIPE_PUBLISHABLE_KEY configured"
        fi
        
        read -p "Enter STRIPE_SECRET_KEY (sk_test...): " STRIPE_SECRET_KEY
        if [[ -n "$STRIPE_SECRET_KEY" ]]; then
            netlify env:set STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY" --site="$TESTING_SITE_ID"
            print_success "STRIPE_SECRET_KEY configured"
        fi
    fi
}

# Phase 3: Verify Configuration
verify_configuration() {
    print_header "PHASE 3: VERIFYING CONFIGURATION"
    
    echo "📋 Updated environment variables:"
    netlify env:list --site="$TESTING_SITE_ID"
    
    echo -e "\n${YELLOW}Site Build Settings:${NC}"
    netlify api getSite --site="$TESTING_SITE_ID" | grep -E '"build_settings|node_version"' || echo "Could not retrieve build settings"
}

# Phase 4: Test Build
test_build() {
    print_header "PHASE 4: TESTING BUILD"
    
    echo "🚀 Triggering a test deployment..."
    
    # Create a small test file to trigger deployment
    echo "// Test deployment trigger $(date)" > deployment-test.txt
    
    echo "📝 Creating test commit..."
    git add deployment-test.txt
    git commit -m "test: Trigger deployment after environment variable fix

- Added missing environment variables
- Fixed build configuration issues
- Testing automatic deployment

🤖 Generated with Claude Code"
    
    echo "📤 Pushing to testing branch..."
    git push origin testing
    
    print_success "Test deployment triggered!"
    print_info "Monitor the deployment at: https://app.netlify.com/sites/spicebush-testing/deploys"
    
    echo -e "\n${YELLOW}Next steps:${NC}"
    echo "1. 👀 Watch the build logs in Netlify dashboard"
    echo "2. ✅ Verify build completes successfully (exit code 0)"
    echo "3. 🌐 Test the site: https://spicebush-testing.netlify.app"
    echo "4. 🔧 If still failing, check logs for specific error messages"
}

# Phase 5: Repository Access Check
check_repository_access() {
    print_header "PHASE 5: REPOSITORY ACCESS VERIFICATION"
    
    echo "🔗 Checking GitHub integration..."
    
    # Get site info to check repository connection
    SITE_INFO=$(netlify api getSite --site="$TESTING_SITE_ID")
    
    if echo "$SITE_INFO" | grep -q "github"; then
        print_success "GitHub repository connected"
        
        # Check for recent failed deployments due to repository access
        echo "🔍 Checking recent deployment failures..."
        RECENT_DEPLOYS=$(netlify api listSiteDeploys --site="$TESTING_SITE_ID" --data='{"per_page": 5}')
        
        if echo "$RECENT_DEPLOYS" | grep -q "Host key verification failed"; then
            print_warning "Found SSH key verification issues in recent deployments"
            echo "🔧 To fix repository access issues:"
            echo "   1. Go to Netlify Dashboard → Site Settings → Build & Deploy"
            echo "   2. Click 'Link to a different repository'"
            echo "   3. Re-select your GitHub repository"
            echo "   4. This will refresh the deploy key"
        else
            print_success "No obvious repository access issues found"
        fi
    else
        print_warning "GitHub repository connection may have issues"
    fi
}

# Main execution
main() {
    print_header "NETLIFY BUILD FAILURE FIX SCRIPT"
    
    echo "🎯 This script will help fix the Netlify build failures by:"
    echo "   • Diagnosing current configuration"
    echo "   • Adding missing environment variables"
    echo "   • Verifying repository access"
    echo "   • Testing a deployment"
    echo ""
    
    # Checks
    check_netlify_cli
    check_auth
    
    # Execute phases
    diagnose_current_state
    
    read -p "Continue with environment variable setup? (y/N): " CONTINUE
    if [[ $CONTINUE =~ ^[Yy]$ ]]; then
        fix_environment_variables
        verify_configuration
        check_repository_access
        
        read -p "Trigger a test deployment? (y/N): " TEST_DEPLOY
        if [[ $TEST_DEPLOY =~ ^[Yy]$ ]]; then
            test_build
        fi
    fi
    
    print_header "COMPLETION"
    
    print_success "Fix script completed!"
    echo -e "\n${BLUE}📚 Documentation:${NC}"
    echo "   • Full diagnosis: app/journal/2025-08-05-netlify-build-failure-diagnosis.md"
    echo "   • Netlify Dashboard: https://app.netlify.com/sites/spicebush-testing"
    echo "   • Testing Site: https://spicebush-testing.netlify.app"
    
    echo -e "\n${YELLOW}⏭️  If builds still fail:${NC}"
    echo "   1. Check build logs for specific error messages"
    echo "   2. Verify all environment variables are accessible"
    echo "   3. Test local build: cd app && npm run build"
    echo "   4. Contact support with build log details"
    
    # Cleanup test file
    if [[ -f "deployment-test.txt" ]]; then
        rm deployment-test.txt
        print_info "Cleaned up test files"
    fi
}

# Run main function
main "$@"