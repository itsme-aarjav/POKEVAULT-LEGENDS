# PokéVault Legends — System Walkthrough & Demo

This directory documents the high-resolution demonstration recording of PokéVault Legends running on **AWS EKS Auto Mode**.

## Video Details
* **File:** `Screen Recording 2026-10-10 at 3.35.34 AM.mov`
* **Resolution:** 3360 x 2100 (Retina Display)
* **Duration:** 3 minutes 08 seconds
* **Size:** ~145 MB

## Timeline and Covered Capabilities
1. **[0:00 - 0:45] Storefront Application & Live Checkout**
   - Live browsing through the collectible catalog.
   - Adding cards to cart and placing live authenticated orders.
   - Order tracking and fulfillment pipeline simulation.
2. **[0:45 - 1:30] Concurrent Traffic Load Storm & Scaling**
   - High-throughput load test execution targeting the AWS Application Load Balancer.
   - Traffic generation scaling past 45,000+ orders with zero HTTP 5xx errors.
3. **[1:30 - 2:15] SRE Observability (Grafana RED Metrics & Loki Logs)**
   - Grafana live dashboard metrics updating in real-time.
   - Availability SLA holding solid at 100%.
   - Active Promtail/Loki log stream aggregation across cluster worker nodes.
4. **[2:15 - 2:45] Distributed Tracing (Grafana Tempo & TraceQL)**
   - Querying end-to-end request journeys across Nginx, Catalog, Order, and Database spans.
   - Span waterfall analysis and latency breakdown.
5. **[2:45 - 3:08] GitOps Reconciliation (ArgoCD)**
   - Live synchronization view of application resources against GitHub commit SHA.
   - Healthy pod status, ALB Ingress mappings, and declarative state verification.
