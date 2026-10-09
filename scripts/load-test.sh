#!/bin/bash
# PokéVault Traffic & Load Generator
# Generates sustained concurrent traffic to validate Prometheus telemetry and HPA scaling

STOREFRONT_URL="https://k8s-pokevaul-pokevaul-e701e7b82d-2093600175.us-east-1.elb.amazonaws.com"
DURATION_SECONDS=${1:-120}

echo "=========================================================="
echo "Starting Traffic Generator ($DURATION_SECONDS seconds)"
echo "Target: $STOREFRONT_URL"
echo "=========================================================="

END_TIME=$((SECONDS + DURATION_SECONDS))

# Loop 1: Catalog browsing
(
  while [ $SECONDS -lt $END_TIME ]; do
    curl -sk "$STOREFRONT_URL/api/products?trending=true" > /dev/null &
    curl -sk "$STOREFRONT_URL/api/products/charizard-base-1st" > /dev/null &
    curl -sk "$STOREFRONT_URL/api/products?category=vintage" > /dev/null &
    sleep 0.1
  done
  wait
) &

# Loop 2: Health & Metrics traffic
(
  while [ $SECONDS -lt $END_TIME ]; do
    curl -sk "$STOREFRONT_URL/" > /dev/null &
    curl -sk "$STOREFRONT_URL/api/auth/verify" > /dev/null &
    sleep 0.1
  done
  wait
) &

# Loop 3: Orders placement
(
  while [ $SECONDS -lt $END_TIME ]; do
    curl -sk -X POST "$STOREFRONT_URL/api/orders" \
      -H "Content-Type: application/json" \
      -d '{"customerName":"Load Test Collector","customerEmail":"test@pokevault.com","items":[{"id":"charizard-base-1st","name":"Charizard","price":4850,"qty":1}]}' > /dev/null &
    sleep 1.5
  done
  wait
) &

echo "Traffic generator running in background for $DURATION_SECONDS seconds..."
wait
echo "Traffic generation completed."
