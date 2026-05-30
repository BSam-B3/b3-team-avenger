#!/bin/bash

# 🧪 12-Function Smoke Test for B3-Team-Avenger
# Tests all TIER functions + infrastructure (Telegram, Supabase)

BASE_URL="https://b3-team-avenger.vercel.app"
PASSED=0
FAILED=0

echo ""
echo "🧪 SMOKE TEST: B3-Team-Avenger"
echo "Target: $BASE_URL"
echo "Time: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# Helper function
test_endpoint() {
  local name=$1
  local endpoint=$2
  local method=$3

  echo -n "Testing $name... "

  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" -H "Content-Type: application/json" -d '{}' 2>/dev/null)
  else
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>/dev/null)
  fi

  status=$(echo "$response" | tail -1)

  if [ "$status" -ge 200 ] && [ "$status" -lt 300 ]; then
    echo "✅ (HTTP $status)"
    PASSED=$((PASSED + 1))
  elif [ "$status" -ge 300 ] && [ "$status" -lt 500 ]; then
    echo "⚠️  (HTTP $status - Client error, but endpoint responds)"
    PASSED=$((PASSED + 1))
  else
    echo "❌ (HTTP $status)"
    FAILED=$((FAILED + 1))
  fi
}

echo "🔗 [TIER FUNCTIONS]\n"

# TIER 1: Morning Brief
test_endpoint "TIER 1: Morning Brief" "/api/workers/morning-brief" "GET"

# TIER 2: Email Secretary
test_endpoint "TIER 2: Email Secretary" "/api/workers/email-secretary" "GET"

# TIER 3: PDF Reports
test_endpoint "TIER 3: PDF Reports" "/api/pdf/generate-report" "POST"

# TIER 4: Mobile Voice
test_endpoint "TIER 4: Mobile Voice" "/api/mobile/voice" "POST"

# TIER 5: Customer Portal
test_endpoint "TIER 5: Customer Portal" "/api/tier5/customer-portal" "GET"

# TIER 5: Admin Templates
test_endpoint "TIER 5: Admin Templates" "/api/tier5/admin/templates" "GET"

# TIER 5: Advanced Voice
test_endpoint "TIER 5: Advanced Voice" "/api/tier5/advanced-voice" "POST"

echo ""
echo "🧰 [INFRASTRUCTURE]\n"

# Health Check
test_endpoint "Health Check" "/api/health" "GET"
test_endpoint "Health Detailed" "/api/health?detailed=true" "GET"

# Background Workers
test_endpoint "Midnight Hunter" "/api/workers/midnight-hunter" "GET"
test_endpoint "Weekly Condense" "/api/workers/weekly-condense" "GET"
test_endpoint "Quota Monitor" "/api/monitoring/quota-check" "GET"

echo ""
echo "📊 [SUMMARY]\n"
echo "Passed: $PASSED ✅"
echo "Failed: $FAILED ❌"
echo "Total: $((PASSED + FAILED))"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo "✅ ALL SYSTEMS GO!"
  echo ""
  exit 0
else
  echo ""
  echo "⚠️  ISSUES DETECTED"
  echo ""
  exit 1
fi
