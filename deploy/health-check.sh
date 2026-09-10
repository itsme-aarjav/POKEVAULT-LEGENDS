#!/usr/bin/env bash
# ==============================================================================
# POKÉVAULT LEGENDS — SYSTEM HEALTH & METRICS PROBE
# Run manually or via monitoring cron:
#   ./deploy/health-check.sh
# ==============================================================================

set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

TARGET_HOST="${1:-http://127.0.0.1}"
ENDPOINT="${TARGET_HOST}/api/health"

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}🔍 POKÉVAULT LEGENDS — PRODUCTION SYSTEM HEALTH PROBE${NC}"
echo -e "${BLUE}Target URL: ${ENDPOINT}${NC}"
echo -e "${BLUE}=================================================================${NC}"

# Measure latency & HTTP code
START_TIME=$(date +%s%N)
HTTP_RESPONSE=$(curl -s -w "\n%{http_code}\n%{time_total}" "$ENDPOINT" || echo -e "FAILED\n000\n0")
END_TIME=$(date +%s%N)

BODY=$(echo "$HTTP_RESPONSE" | sed -e '$d' | sed -e '$d')
HTTP_CODE=$(echo "$HTTP_RESPONSE" | tail -n 2 | head -n 1)
TIME_TOTAL=$(echo "$HTTP_RESPONSE" | tail -n 1)

echo -e "HTTP Status Code : ${HTTP_CODE}"
echo -e "Response Latency : ${TIME_TOTAL}s"

if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "\n${GREEN}✅ SERVICE IS HEALTHY & RESPONDING${NC}"
    echo -e "${GREEN}Payload: ${BODY}${NC}"
else
    echo -e "\n${RED}❌ SERVICE HEALTH CHECK FAILED! (Status: ${HTTP_CODE})${NC}"
    exit 1
fi
