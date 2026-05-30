#!/bin/bash
# B3 Avenger — Pre-Deployment Verification Script

set -e

echo "🔍 B3 Avenger Deployment Verification"
echo "======================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

checks_passed=0
checks_failed=0

check_command() {
    if command -v "$1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} $1 installed"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 NOT installed - ${YELLOW}Install it first${NC}"
        ((checks_failed++))
    fi
}

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1 exists"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $1 MISSING"
        ((checks_failed++))
    fi
}

check_env() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}✗${NC} $1 NOT SET - ${YELLOW}Add to .env.local${NC}"
        ((checks_failed++))
    else
        echo -e "${GREEN}✓${NC} $1 set (length: ${#!1})"
        ((checks_passed++))
    fi
}

# Check tools
echo "📦 Checking tools..."
check_command node
check_command npm
check_command git
check_command psql
echo ""

# Check files
echo "📁 Checking project files..."
check_file "package.json"
check_file ".env.local"
check_file "vercel.json"
check_file "jest.config.js"
echo ""

# Check dependencies
echo "📚 Checking npm packages..."
if grep -q "\"next\":" package.json; then
    echo -e "${GREEN}✓${NC} Next.js dependency found"
    ((checks_passed++))
else
    echo -e "${RED}✗${NC} Next.js dependency missing"
    ((checks_failed++))
fi

if grep -q "\"@supabase/supabase-js\":" package.json; then
    echo -e "${GREEN}✓${NC} Supabase dependency found"
    ((checks_passed++))
else
    echo -e "${RED}✗${NC} Supabase dependency missing"
    ((checks_failed++))
fi
echo ""

# Check environment variables
echo "🔐 Checking environment variables..."
check_env "NEXT_PUBLIC_SUPABASE_URL"
check_env "SUPABASE_SERVICE_ROLE_KEY"
check_env "AZURE_CLIENT_ID"
check_env "AZURE_CLIENT_SECRET"
check_env "AZURE_TENANT_ID"
check_env "SENDGRID_API_KEY"
check_env "TELEGRAM_BOT_TOKEN"
check_env "MOBILE_API_KEY"
echo ""

# Check database
echo "🗄️  Checking database..."
if [ ! -z "$DATABASE_URL" ]; then
    echo -e "${GREEN}✓${NC} DATABASE_URL set"
    ((checks_passed++))

    # Try to connect
    if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Database connection successful"
        ((checks_passed++))

        # Check tables
        table_count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'")
        if [ "$table_count" -gt 0 ]; then
            echo -e "${GREEN}✓${NC} Found $table_count tables"
            ((checks_passed++))
        else
            echo -e "${YELLOW}⚠${NC}  No tables found - run migrations first"
            ((checks_failed++))
        fi
    else
        echo -e "${RED}✗${NC} Database connection failed"
        ((checks_failed++))
    fi
else
    echo -e "${YELLOW}⚠${NC}  DATABASE_URL not set - local testing only"
fi
echo ""

# Check TypeScript
echo "🔧 Checking TypeScript..."
if npm run build &> /tmp/build.log; then
    echo -e "${GREEN}✓${NC} Build successful"
    ((checks_passed++))
else
    echo -e "${RED}✗${NC} Build failed"
    ((checks_failed++))
    echo "  See /tmp/build.log for details"
fi
echo ""

# Check tests
echo "🧪 Checking tests..."
if npm run test -- --passWithNoTests &> /tmp/test.log; then
    echo -e "${GREEN}✓${NC} Tests passed"
    ((checks_passed++))
else
    echo -e "${YELLOW}⚠${NC}  Some tests failed or missing"
    echo "  See /tmp/test.log for details"
fi
echo ""

# Check lint
echo "🎯 Checking linting..."
if npm run lint &> /tmp/lint.log; then
    echo -e "${GREEN}✓${NC} Linting passed"
    ((checks_passed++))
else
    echo -e "${YELLOW}⚠${NC}  Linting warnings found"
    echo "  See /tmp/lint.log for details"
fi
echo ""

# Summary
echo "======================================"
echo "📊 Summary"
echo "======================================"
echo -e "Checks passed: ${GREEN}$checks_passed${NC}"
echo -e "Checks failed: ${RED}$checks_failed${NC}"
echo ""

if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}✓ Ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. vercel deploy --prod"
    echo "  2. Add env vars to Vercel dashboard"
    echo "  3. Monitor with: vercel logs --tail"
    exit 0
else
    echo -e "${RED}✗ Fix issues above before deploying${NC}"
    exit 1
fi
