#!/usr/bin/env bash
# ==============================================================================
# POKÉVAULT LEGENDS — ZERO-DOWNTIME DOCKER DEPLOYMENT PIPELINE
# Run on EC2:
#   chmod +x deploy/deploy.sh && ./deploy/deploy.sh
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

echo -e "${BLUE}=================================================================${NC}"
echo -e "${BLUE}⚡ STARTING PRODUCTION CONTAINER DEPLOYMENT${NC}"
echo -e "${BLUE}=================================================================${NC}"

# Check for .env file
if [[ ! -f .env ]]; then
    echo -e "${YELLOW}[INFO] .env not found. Creating from .env.example...${NC}"
    cp .env.example .env
fi

echo -e "\n${YELLOW}[1/4] Pulling latest code changes from Git repository...${NC}"
if git rev-parse --is-inside-work-tree &>/dev/null; then
    git fetch --all --prune
    git pull origin main || echo -e "${YELLOW}[WARN] Git pull skipped or on custom branch.${NC}"
fi

echo -e "\n${YELLOW}[2/4] Building Multi-Stage Docker Images...${NC}"
docker compose build --pull app

echo -e "\n${YELLOW}[3/4] Launching 3-Tier Services (MySQL -> Express App -> Nginx)...${NC}"
docker compose up -d --remove-orphans

echo -e "\n${YELLOW}[4/4] Running Liveness & Readiness Health Probes...${NC}"
MAX_RETRIES=15
RETRY_COUNT=0
HEALTH_URL="http://127.0.0.1/api/health"

echo -n "Waiting for service to become healthy"
until curl -sf "$HEALTH_URL" &>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [[ $RETRY_COUNT -ge $MAX_RETRIES ]]; then
        echo -e "\n${RED}[ERROR] Health probe failed after ${MAX_RETRIES} attempts!${NC}"
        echo -e "${RED}[DEBUG] Fetching container logs...${NC}"
        docker compose logs app
        exit 1
    fi
    echo -n "."
    sleep 3
done

echo -e "\n\n${GREEN}=================================================================${NC}"
echo -e "${GREEN}✅ DEPLOYMENT SUCCEEDED!${NC}"
echo -e "${GREEN}All services (Nginx, App, MySQL) are online and healthy.${NC}"
echo -e "${GREEN}Health Status: $(curl -s "$HEALTH_URL")${NC}"
echo -e "${GREEN}=================================================================${NC}"
