#!/bin/bash
# PokéVault Traffic Storm Generator
# Sends concurrent traffic across Catalog, Orders, and Auth services

STOREFRONT_URL="https://k8s-pokevaul-pokevaul-e701e7b82d-2093600175.us-east-1.elb.amazonaws.com"
DURATION_SECONDS=${1:-180}

echo "=========================================================="
echo "Starting Traffic Storm ($DURATION_SECONDS seconds)"
echo "Target: $STOREFRONT_URL"
echo "=========================================================="

END_TIME=$((SECONDS + DURATION_SECONDS))

# Worker 1: High concurrency product search & category filtering
for i in {1..8}; do
  (
    while [ $SECONDS -lt $END_TIME ]; do
      curl -sk "$STOREFRONT_URL/api/products?trending=true&era=vintage" > /dev/null &
      curl -sk "$STOREFRONT_URL/api/products?search=Charizard" > /dev/null &
      curl -sk "$STOREFRONT_URL/api/products/charizard-base-1st" > /dev/null &
      curl -sk "$STOREFRONT_URL/api/products?category=vintage" > /dev/null &
      curl -sk "$STOREFRONT_URL/api/products?category=modern" > /dev/null &
      sleep 0.05
    done
    wait
  ) &
done

# Worker 2: High concurrency order placements (Triggers Order Service & MySQL writes)
for i in {1..4}; do
  (
    while [ $SECONDS -lt $END_TIME ]; do
      curl -sk -X POST "$STOREFRONT_URL/api/orders" \
        -H "Content-Type: application/json" \
        -d '{"customerName":"Load Test Collector","customerEmail":"test@pokevault.com","shippingAddress":"789 Indigo Plateau","items":[{"id":"charizard-base-1st","name":"Charizard","price":4850,"qty":1}]}' > /dev/null &
      sleep 0.2
    done
    wait
  ) &
done

# Worker 3: Auth verification & Health traffic
for i in {1..4}; do
  (
    while [ $SECONDS -lt $END_TIME ]; do
      curl -sk "$STOREFRONT_URL/api/auth/verify" > /dev/null &
      curl -sk "$STOREFRONT_URL/health" > /dev/null &
      curl -sk "$STOREFRONT_URL/" > /dev/null &
      sleep 0.08
    done
    wait
  ) &
done

echo "Traffic generation active in background..."
wait
echo "Traffic test completed."
