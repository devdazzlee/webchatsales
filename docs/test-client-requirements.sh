#!/bin/bash

# Quick Test Script for Client Requirements
# This script helps verify all client requirements are working

echo "🧪 WebChatSales - Client Requirements Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:9000}"

echo "📡 Testing API at: $API_URL"
echo ""

# Test 1: Start conversation
echo "Test 1: Starting conversation..."
SESSION_RESPONSE=$(curl -s -X POST "$API_URL/api/chat/start" \
  -H "Content-Type: application/json" \
  -d '{}')

SESSION_ID=$(echo $SESSION_RESPONSE | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)

if [ -z "$SESSION_ID" ]; then
  echo -e "${RED}❌ FAIL: Could not start conversation${NC}"
  echo "Response: $SESSION_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ PASS: Conversation started (Session: $SESSION_ID)${NC}"
echo ""

# Test 2: Send buying intent message
echo "Test 2: Testing buying intent detection..."
BUYING_INTENT_RESPONSE=$(curl -s -X POST "$API_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$SESSION_ID\",\"message\":\"I want to sign up\"}")

# Check if response contains email request or closing (not discovery questions)
if echo "$BUYING_INTENT_RESPONSE" | grep -qi "email\|try it\|trial"; then
  echo -e "${GREEN}✅ PASS: Buying intent detected - skipped to closing${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Response might not show buying intent handling${NC}"
  echo "Response preview: $(echo $BUYING_INTENT_RESPONSE | head -c 200)"
fi
echo ""

# Test 3: Check message length (would need to parse response)
echo "Test 3: Message length check (manual verification needed)"
echo "   → Open chatbot and verify messages are 10-15 words max"
echo ""

# Test 4: Test qualification flow
echo "Test 4: Testing qualification flow..."
NEW_SESSION=$(curl -s -X POST "$API_URL/api/chat/start" \
  -H "Content-Type: application/json" \
  -d '{}' | grep -o '"sessionId":"[^"]*' | cut -d'"' -f4)

QUAL_RESPONSE=$(curl -s -X POST "$API_URL/api/chat/message" \
  -H "Content-Type: application/json" \
  -d "{\"sessionId\":\"$NEW_SESSION\",\"message\":\"I'm interested in this\"}")

if echo "$QUAL_RESPONSE" | grep -qi "who am i speaking\|name\|business"; then
  echo -e "${GREEN}✅ PASS: Qualification flow started${NC}"
else
  echo -e "${YELLOW}⚠️  WARNING: Qualification flow might not be working${NC}"
fi
echo ""

# Test 5: Check SMTP error handling
echo "Test 5: SMTP error handling (requires manual test)"
echo "   → Submit beta signup form with invalid SMTP config"
echo "   → Should see friendly message, not raw SMTP error"
echo ""

# Summary
echo "=========================================="
echo "📋 Test Summary"
echo "=========================================="
echo ""
echo "✅ Automated tests completed"
echo "⚠️  Manual tests required:"
echo "   1. Message length (10-15 words)"
echo "   2. No demo offers"
echo "   3. 9-step qualification flow order"
echo "   4. Human language (contractions, no formal)"
echo "   5. UI stability (no black screens)"
echo "   6. SMTP error messages"
echo ""
echo "📖 See TESTING_GUIDE.md for detailed manual testing steps"
echo ""
