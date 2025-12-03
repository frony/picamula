#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0;0m' # No Color

# Configuration
BASE_URL="http://localhost:3000"
GENERAL_ENDPOINT="/trips"
AUTH_ENDPOINT="/auth/sign-in"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Picamula Rate Limit Testing Script${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Test 1: General Rate Limit
echo -e "${YELLOW}Test 1: Testing General Rate Limit (100 req/min)${NC}"
echo "Sending 110 requests to $GENERAL_ENDPOINT..."
echo ""

success_count=0
blocked_count=0

for i in {1..110}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL$GENERAL_ENDPOINT 2>/dev/null)
  
  if [ "$response" = "200" ]; then
    ((success_count++))
    if [ $i -le 5 ] || [ $i -ge 95 ]; then
      echo -e "  ${GREEN}✓${NC} Request $i: 200 OK"
    elif [ $i -eq 50 ]; then
      echo -e "  ... (requests 6-95 successful) ..."
    fi
  elif [ "$response" = "429" ]; then
    ((blocked_count++))
    echo -e "  ${RED}✗${NC} Request $i: 429 Rate Limited"
  else
    echo -e "  ${YELLOW}?${NC} Request $i: $response"
  fi
  
  # Small delay to avoid overwhelming the server
  sleep 0.01
done

echo ""
echo -e "Results: ${GREEN}$success_count successful${NC}, ${RED}$blocked_count blocked${NC}"
echo ""

# Wait for rate limit window to reset
echo -e "${YELLOW}Waiting 65 seconds for rate limit to reset...${NC}"
for i in {65..1}; do
  echo -ne "  $i seconds remaining...\r"
  sleep 1
done
echo ""

# Test 2: Authentication Rate Limit
echo -e "${YELLOW}Test 2: Testing Auth Rate Limit (5 req/10sec)${NC}"
echo "Sending 10 rapid requests to $AUTH_ENDPOINT..."
echo ""

auth_success_count=0
auth_blocked_count=0

for i in {1..10}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST $BASE_URL$AUTH_ENDPOINT \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>/dev/null)
  
  if [ "$response" = "401" ] || [ "$response" = "200" ]; then
    # 401 means request went through but auth failed (expected)
    ((auth_success_count++))
    echo -e "  ${GREEN}✓${NC} Request $i: $response (Request processed)"
  elif [ "$response" = "429" ]; then
    ((auth_blocked_count++))
    echo -e "  ${RED}✗${NC} Request $i: 429 Rate Limited"
  else
    echo -e "  ${YELLOW}?${NC} Request $i: $response"
  fi
  
  # Very small delay
  sleep 0.05
done

echo ""
echo -e "Results: ${GREEN}$auth_success_count processed${NC}, ${RED}$auth_blocked_count rate limited${NC}"
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "General Routes (100/min):"
echo -e "  - Expected: First 100 OK, then rate limited"
echo -e "  - Actual: ${GREEN}$success_count OK${NC}, ${RED}$blocked_count limited${NC}"
echo ""
echo "Auth Routes (5/10sec):"
echo -e "  - Expected: First 5 OK, then rate limited"
echo -e "  - Actual: ${GREEN}$auth_success_count OK${NC}, ${RED}$auth_blocked_count limited${NC}"
echo ""

# Check if tests passed
if [ $blocked_count -gt 0 ] && [ $auth_blocked_count -gt 0 ]; then
  echo -e "${GREEN}✓ Rate limiting is working correctly!${NC}"
else
  echo -e "${RED}✗ Rate limiting may not be working as expected${NC}"
  echo -e "${YELLOW}Check your logs and ensure:${NC}"
  echo "  1. Redis is running"
  echo "  2. Environment variables are loaded"
  echo "  3. Middleware is properly configured"
fi

echo ""
