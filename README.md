<div align="center">

# PokéVault Legends
### Enterprise-Grade, Cost-Optimized Cloud-Native E-Commerce Platform on AWS

[![AWS](https://img.shields.io/badge/AWS-us--east--1-FF9900?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/)
[![EKS Auto Mode](https://img.shields.io/badge/Kubernetes-v1.31_EKS_Auto_Mode-326CE5?logo=kubernetes&logoColor=white)](https://aws.amazon.com/eks/)
[![Terraform](https://img.shields.io/badge/Terraform-v1.9+-844FBA?logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Argo CD](https://img.shields.io/badge/GitOps-Argo_CD-EF6B55?logo=argo&logoColor=white)](https://argoproj.github.io/cd/)
[![Argo Rollouts](https://img.shields.io/badge/Delivery-Canary_Rollouts-F38020?logo=argo&logoColor=white)](https://argoproj.github.io/rollouts/)
[![Prometheus](https://img.shields.io/badge/Metrics-Prometheus-E6522C?logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Dashboards-Grafana-F46800?logo=grafana&logoColor=white)](https://grafana.com/)
[![OpenCost](https://img.shields.io/badge/FinOps-OpenCost-00D3A9?logo=kubernetes&logoColor=white)](https://www.opencost.io/)
[![AWS WAFv2](https://img.shields.io/badge/Security-AWS_WAFv2-232F3E?logo=amazon-aws&logoColor=white)](https://aws.amazon.com/waf/)
[![Trivy](https://img.shields.io/badge/Security-Trivy_Scanned-1E88E5?logo=aquasec&logoColor=white)](https://trivy.dev/)
[![Cosign](https://img.shields.io/badge/Supply_Chain-Cosign_Signed-4CAF50?logo=linux-foundation&logoColor=white)](https://sigstore.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

<br/>

**PokéVault Legends** is a state-of-the-art, production-grade cloud-native e-commerce ecosystem built with **Node.js microservices**, **Vite frontend**, and deployed on **Amazon Web Services (AWS)** using **EKS Auto Mode (v1.31)**, **Terraform**, **GitOps (Argo CD & Argo Rollouts Canary)**, and a **Two-Tier Cost-Optimized Cloud Architecture**.

---

### Live Production Cloud Endpoints

| Service / Layer | Public Endpoint | Infrastructure Mapping | Security & Protocol |
| :--- | :--- | :--- | :--- |
| **Storefront (Frontend)** | [https://aarjav.site](https://aarjav.site) | Amazon CloudFront CDN + S3 Bucket (OAC) | TLS 1.2, Custom ACM Cert, Edge-Cached |
| **Alternate Storefront** | [https://www.aarjav.site](https://www.aarjav.site) | Route 53 Alias -> CloudFront | Automatic HTTPS Redirect |
| **API Gateway** | [https://api.aarjav.site](https://api.aarjav.site) | AWS Shared ALB -> Nginx Gateway -> Microservices | AWS WAFv2 Protected, Rate-Limited |
| **GitOps Dashboard** | [https://argocd.aarjav.site](https://argocd.aarjav.site) | AWS Shared ALB -> Argo CD Server | SSO / Token Auth, TLS Encrypted |
| **FinOps & Observability** | [https://grafana.aarjav.site](https://grafana.aarjav.site) | AWS Shared ALB -> Grafana Operator | OpenCost FinOps, Prometheus, Loki |

</div>

---

## Production Application Tour & Core Capabilities

Comprehensive visual tour of the live production system running on AWS, highlighting the collector storefront, API Gateway routing, GitOps progressive delivery, distributed logging, resource monitoring, and real-time FinOps.

### 1. Storefront Experience & High-Value Trading Card Marketplace
Live storefront running on `https://aarjav.site`, featuring PSA-authenticated vintage and modern grail cards, atomic inventory counters, dynamic vouchers, and rapid dispatch logistics:
![Storefront & High-Value Trading Card Catalog](screen-recordings/storefront-product-detail.png)

- **PSA & BGS Graded Slab Showcase**: High-resolution displays for authenticated collectibles (such as the PSA 10 Japanese Sylveon / Umbreon VMAX Special Art Alt from Eevee Heroes).
- **Atomic Stock & Urgency Telemetry**: Real-time inventory status powered by Redis and RDS MySQL ("HIGH DEMAND: Only 1 left in Mumbai Vault - 88% Claimed", "19 collectors viewing right now").
- **Dynamic Checkout & Discounts**: Tiered discount codes (`POKEVAULT10`), multiple payment rails (UPI, NetBanking, COD), BlueDart Express Pan-India air dispatch, and PokéCoins loyalty rewards.

---

### 2. Microservice Routing & Production API Gateway Health
Direct live response from the public API Gateway (`https://api.aarjav.site/api/health`), verifying end-to-end Kubernetes ingress, internal cluster DNS, and database connection pooling:
![API Gateway Microservice Health Telemetry](screen-recordings/api-gateway-health-json.png)

- **Ingress & Reverse Proxy**: AWS Application Load Balancer routes public HTTPS `/api/*` traffic to the non-root Nginx Gateway pods on port 8080.
- **Inter-Service Communication**: Microservices communicate internally via Kubernetes CoreDNS (`http://catalog-service:5002`).
- **Database Connection Pooling**: Live verification of active MySQL connection pooling (`database: mysql-connected`, `components: {mysql: UP}`).

---

### 3. GitOps Continuous Delivery & Progressive Canary Deployment (Argo CD)
Live Argo CD dashboard (`https://argocd.aarjav.site`) continuously reconciling the `pokevault-production` application state in real-time:
![Argo CD GitOps Architecture & Application Topology](screen-recordings/argocd-gitops-topology.png)

- **Declarative Synchronization**: Root application (`gitops/root-app.yaml`) continuously synchronizes cluster state against the Git repository with zero manual intervention.
- **Canary Progressive Delivery**: Argo Rollouts manages seamless traffic splitting between stable and canary versions of `order-service` without user disruption.
- **Automated Database Seeding**: Automated Kubernetes Job (`pokevault-db-seeder`) executes schema migrations and hydrates the catalog upon cluster bootstrap.

---

### 4. Distributed Log Aggregation & Streaming Telemetry (Grafana Loki)
Real-time microsecond-precision log exploration in Grafana (`https://grafana.aarjav.site`) powered by Grafana Loki and Alloy:
![Grafana Loki Distributed Log Telemetry](screen-recordings/grafana-loki-logs-telemetry.png)

- **Unified Multi-Service Log Streams**: Real-time log aggregation across all container replicas in the `pokevault` namespace.
- **Microsecond Request Tracing**: Structured JSON logs capturing Nginx gateway forwarding, microservice execution times (e.g., `1ms` for `/api/health`, `5ms` for `/api/inventory/eevee-heroes-special-art`), and client telemetry.
- **Cost-Optimized Architecture**: Single-binary Loki engine with filesystem persistence on EBS gp3 volumes.

---

### 5. Kubernetes Cluster Compute & Resource Metrics (Prometheus)
Grafana compute resource dashboard tracking real-time CPU and Memory utilization against requested quotas:
![Grafana Prometheus Kubernetes Compute Resources](screen-recordings/grafana-prometheus-compute-metrics.png)

- **Resource Quotas & Utilization**: Real-time tracking of pod CPU usage (0.365% of requests, 0.073% of limits) and memory allocations (13.0% of requests).
- **Per-Service Metrics**: Stacked time-series telemetry across `auth-service`, `catalog-service`, `order-service`, and `nginx-gateway`.
- **Right-Sizing & Headroom**: Precise metric reporting enabling predictive pod autoscaling and eliminating over-provisioned cloud compute waste.

---

### 6. Cloud FinOps & Real-Time Workload Cost Allocation (OpenCost)
Production OpenCost dashboard (`https://grafana.aarjav.site`) providing real-time Kubernetes cost visibility:
![Grafana OpenCost FinOps Dashboard](screen-recordings/grafana-opencost-finops-dashboard.png)

- **Real-Time Cost Transparency**: Accurate hourly cluster run cost (**$0.17 / hr**) and projected monthly spend (**$124.59 / mo**).
- **Multi-Dimensional Allocation**: Exact spend breakdown across CPU ($99.13), RAM ($24.67), and Persistent Volumes ($0.80).
- **Per-Namespace Breakdown**: `pokevault` production microservices account for 94% ($23.10) while cluster `monitoring` consumes 6% ($1.58).
- **Node-Level Cost Attribution**: Direct EC2 instance billing visibility for `c7i-flex.large` compute nodes and AWS EBS gp3 storage volumes.

---

## System Architecture


```mermaid
flowchart TD
    subgraph Client["User / Browser"]
        User["Client Browser"]
    end

    subgraph Foundation["Permanent Foundation Layer (~$1/mo)"]
        R53["Route 53 DNS<br/>(aarjav.site)"]
        CF["CloudFront CDN<br/>(Global Edge)"]
        S3["S3 Frontend Bucket<br/>(Static SPA Assets)"]
    end

    subgraph Runtime["Ephemeral Runtime Layer (On-Demand EKS)"]
        WAF["AWS WAFv2<br/>Regional WebACL"]
        ALB["AWS Shared Application<br/>Load Balancer"]
        ING["K8s Shared Ingress Group<br/>(pokevault-shared-alb)"]

        subgraph EKS["AWS EKS Auto Mode Cluster (v1.31)"]
            NGINX["Nginx API Gateway Pods<br/>(:8080)"]
            AUTH["Auth Service<br/>(:5001)"]
            CATALOG["Catalog Service<br/>(:5002)"]
            ORDER["Order Service<br/>(:5003 - Canary Rollout)"]
        end

        RDS[("Amazon RDS MySQL 8.0<br/>Multi-AZ Ready")]
        REDIS[("Amazon ElastiCache<br/>Redis 7 Cluster")]
    end

    subgraph Observability["Observability & FinOps Stack"]
        GRAFANA["Grafana Dashboard<br/>(grafana.aarjav.site)"]
        PROM["Prometheus & Alloy<br/>Metrics Engine"]
        LOKI[("Grafana Loki<br/>Log Aggregator")]
        OPENCOST["OpenCost FinOps<br/>Real-Time Cost Allocator"]
    end

    %% Client Routing
    User -->|aarjav.site| R53
    R53 --> CF
    CF --> S3

    User -->|api.aarjav.site / argocd / grafana| WAF
    WAF --> ALB
    ALB --> ING

    %% Ingress to Services
    ING -->|api.aarjav.site| NGINX
    ING -->|argocd.aarjav.site| Runtime
    ING -->|grafana.aarjav.site| GRAFANA

    NGINX -->|/api/auth| AUTH
    NGINX -->|/api/catalog| CATALOG
    NGINX -->|/api/orders| ORDER

    %% Data Connections
    AUTH -->|User Credentials| RDS
    CATALOG -->|60s Cache Aside| REDIS
    CATALOG -->|Product Inventory| RDS
    ORDER -->|Order Transactions| RDS

    %% Observability Connections
    GRAFANA --> PROM
    GRAFANA --> LOKI
    PROM --> OPENCOST
```

---

## Key Architectural Innovations

### 1. Two-Tier Cost-Optimized Cloud Architecture
Unlike traditional enterprise cloud architectures that incur hundreds of dollars per month in idle resource waste, PokéVault implements a **Two-Tier Separation of Concerns**:

| Layer | Components | Monthly Cost | Lifecycle Strategy |
| :--- | :--- | :--- | :--- |
| **Tier 1: Permanent Foundation** | Route 53 Hosted Zone, ACM Wildcard Certs, CloudFront Distribution, S3 Frontend Bucket, ECR Registries, GitHub OIDC IAM Role | **~$1.00 / month** | **Always-On**: Domain ownership, DNS propagation, SSL certificates, and CI/CD trust are never destroyed. |
| **Tier 2: Ephemeral Runtime** | VPC, EKS Auto Mode Cluster (Karpenter compute, EBS CSI, ALB controller), RDS MySQL 8.0, ElastiCache Redis, WAF WebACL, 8 Helm Addons | **$0.00 / hour when destroyed** (~$0.25/hr live) | **On-Demand**: 100% spin up via `./scripts/deploy.sh` and 100% teardown via `./scripts/destroy.sh` with zero orphaned ENIs, volumes, or load balancers. |

### 2. Single Shared Application Load Balancer
Standard Kubernetes deployments provision a separate AWS Application Load Balancer per ingress, rapidly racking up costs (~$25/mo per ALB + LCU hours). PokéVault leverages AWS Load Balancer Controller's Ingress Grouping:
```yaml
alb.ingress.kubernetes.io/group.name: pokevault-shared-alb
alb.ingress.kubernetes.io/scheme: internet-facing
alb.ingress.kubernetes.io/target-type: ip
```
- A single ALB securely terminates TLS and multiplexes host routing for:
  - `api.aarjav.site` -> Nginx Gateway
  - `argocd.aarjav.site` -> Argo CD Web UI
  - `grafana.aarjav.site` -> Grafana Monitoring & FinOps
- **Savings**: Eliminates 2 redundant ALBs, cutting idle ingress overhead by **66%**.

### 3. Amazon EKS Auto Mode & Karpenter
PokéVault runs on the newest **AWS EKS Auto Mode (Kubernetes 1.31)**:
- **Zero Node Group Management**: Eliminates static EC2 Auto Scaling Groups; Karpenter automatically discovers pending pods and dynamically provisions right-sized Graviton / AMD compute (`c7i-flex.large`, `c6g.large`).
- **Managed In-Tree Addons**: Block storage (`aws-ebs-csi-driver`) and load balancing (`aws-load-balancer-controller`) are managed natively by the EKS control plane.

---

## Microservices & Tech Stack

```
pokevault/
├── services/
│   ├── auth-service/        # Node.js 20, Express, JWT, bcrypt password hashing
│   ├── catalog-service/     # Node.js 20, Express, MySQL connection pool, ElastiCache Redis caching
│   ├── order-service/       # Node.js 20, Express, MySQL transaction engine, Argo Rollouts canary target
│   └── nginx-gateway/       # Nginx Alpine reverse proxy, rate limiting, unified CORS, routing
├── frontend/                # Vite SPA, Vanilla CSS design tokens, Canvas Confetti, Three.js 3D cards
├── gitops/                  # Argo CD App-of-Apps root manifest & Helm charts
├── infra/
│   ├── foundation/          # Terraform: Route 53, ACM, CloudFront, S3, ECR, IAM OIDC
│   └── runtime/             # Terraform: VPC, EKS Auto Mode, RDS MySQL, ElastiCache Redis, WAF, Helm addons
└── scripts/                 # Idempotent deploy.sh, destroy.sh, bootstrap-state.sh
```

### Microservice Specifications

| Service | Port | Primary Responsibilities | Data Store / Dependencies |
| :--- | :--- | :--- | :--- |
| **`auth-service`** | `5001` | User registration, authentication, JWT token signing, bcrypt verification | Amazon RDS MySQL (`users` table) |
| **`catalog-service`** | `5002` | Item catalog lookup, category queries, stock validation, 60s cache-aside pattern | Amazon RDS MySQL + Amazon ElastiCache Redis |
| **`order-service`** | `5003` | Order creation, atomic stock decrements, history tracking, Canary progressive delivery | Amazon RDS MySQL (`orders`, `order_items`) |
| **`nginx-gateway`** | `8080` | Edge reverse proxy, URL rewriting (`/api/auth`, `/api/catalog`, `/api/orders`), rate limiting | Microservices internal mesh |

---

## GitOps & Progressive Canary Delivery

PokéVault implements GitOps via **Argo CD** and continuous canary delivery via **Argo Rollouts**:

```
[Git Push to main] ──► [GitHub Actions CI] ──► [Cosign Sign & ECR Push] ──► [Update GitOps Repo]
                                                                                     │
                                                                                     ▼
[Argo CD Root App Auto-Reconcile] ◄──────────────────────────────────────────────────┘
         │
         ├──► [Deploy Auth Service & Catalog Service]
         └──► [Trigger Argo Rollout: Order Service]
                   │
                   ├──► Step 1: 20% Traffic to Canary ──► Prometheus Metric Analysis
                   ├──► Step 2: 50% Traffic to Canary ──► Automated Health Checks
                   └──► Step 3: 100% Traffic Promoted to Stable
```

### Canary Rollout Manifest (`order-service`)
```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: order-service
  namespace: pokevault
  labels:
    app: order-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  strategy:
    canary:
      stableService: order-service
      canaryService: order-service-canary
      steps:
        - setWeight: 20
        - pause:
            duration: 30s
        - setWeight: 50
        - pause:
            duration: 30s
        - setWeight: 100
  template:
    metadata:
      labels:
        app: order-service
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
        - name: order-service
          image: 592668326948.dkr.ecr.us-east-1.amazonaws.com/pokevault/order-service:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 5003
              name: http
          env:
            - name: ORDER_PORT
              value: "5003"
            - name: CATALOG_SERVICE_URL
              value: "http://catalog-service:5002"
            - name: CORS_ORIGIN
              value: "https://aarjav.site"
          envFrom:
            - secretRef:
                name: pokevault-env
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 500m
              memory: 256Mi
          livenessProbe:
            httpGet:
              path: /health
              port: 5003
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: 5003
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Zero-Touch Dynamic Endpoint & IP Re-Wiring

In an ephemeral infrastructure model where `./scripts/destroy.sh` completely destroys the EKS cluster, VPC, RDS, and ElastiCache, subsequent `./scripts/deploy.sh` runs result in completely new, dynamically generated AWS resources:
- A new AWS Application Load Balancer with dynamic IP addresses and DNS hostname.
- A new RDS MySQL database endpoint and master credentials.
- A new ElastiCache Redis primary replication endpoint.
- A new AWS WAFv2 Regional WebACL ARN.

PokéVault implements zero-touch dynamic re-wiring to ensure all components interconnect automatically without manual intervention or manifest updates:

1. **Dynamic DNS Re-Routing via ExternalDNS**:
   - The shared ingress (`pokevault-shared-alb`) defines host rules for `api.aarjav.site`, `argocd.aarjav.site`, and `grafana.aarjav.site`.
   - ExternalDNS continuously monitors the Ingress status for the newly provisioned ALB hostname and automatically upserts Route 53 `ALIAS` A-records within seconds.
   - The permanent Route 53 hosted zone (`aarjav.site`) remains intact, eliminating DNS delegation delays.

2. **Automated Secret Hydration via AWS Secrets Manager & ESO**:
   - Terraform Runtime provisions RDS and Redis, immediately writing the dynamic database connection string, credentials, and Redis host into AWS Secrets Manager (`pokevault-runtime-secrets`).
   - The in-cluster **External Secrets Operator (ESO)** and `ClusterSecretStore` synchronize this AWS secret directly into the Kubernetes `pokevault-env` Secret.
   - Microservice pods consume these values dynamically via `envFrom: secretRef: pokevault-env`, ensuring zero manual config changes across rebuilds.

3. **Automated Ingress WAF & Controller Association**:
   - `deploy.sh` captures the Terraform-provisioned WAF WebACL ARN and injects it into Helm values and Ingress annotations (`alb.ingress.kubernetes.io/wafv2-acl-arn`).
   - The AWS Load Balancer Controller binds the new ALB to the regional WAFv2 WebACL during ingress provisioning.

4. **Permanent Foundation vs. Ephemeral Runtime Isolation**:
   - The Foundation layer (Route 53 hosted zone, ACM wildcard certificate, CloudFront distribution, and S3 SPA bucket) remains permanently deployed at ~$1/mo.
   - Frontend web clients accessing `https://aarjav.site` always hit the persistent CloudFront edge, which proxies API traffic to `https://api.aarjav.site` without needing DNS or certificate changes.

---

## Enterprise Security & Supply Chain DevSecOps

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ZERO-TRUST SUPPLY CHAIN PIPELINE                      │
├─────────────────┬────────────────────┬──────────────────┬───────────────────┤
│ 1. Code & Deps  │ 2. Docker Build    │ 3. Security Scan │ 4. Sign & Push    │
│                 │                    │                  │                   │
│ • ESLint & Test │ • Multi-Arch Build │ • Trivy Image    │ • Cosign Keyless  │
│ • Gitleaks Scan │ • linux/amd64      │   Vulnerability  │   Signing (OIDC)  │
│ • Zero Secrets  │ • Distroless/Alpine│ • High/Crit Gate │ • Push to AWS ECR │
└─────────────────┴────────────────────┴──────────────────┴───────────────────┘
```

1. **Edge Perimeter Defense (AWS WAFv2)**:
   - AWS Managed Common Rule Set (`AWSManagedRulesCommonRuleSet`)
   - SQL Injection Rule Set (`AWSManagedRulesSQLiRuleSet`)
   - Known Bad Inputs Rule Set (`AWSManagedRulesKnownBadInputsRuleSet`)
   - Rate-based rate limiting (1,000 requests / 5 mins per IP)
2. **Dynamic Credential Synchronization (External Secrets Operator)**:
   - No plaintext passwords in Git or Helm values.
   - External Secrets Operator (ESO) bridges AWS Secrets Manager (`pokevault-secrets`) directly into native Kubernetes Secrets (`ClusterSecretStore`).
3. **Passwordless IAM Authentication (GitHub Actions OIDC)**:
   - Zero static AWS access keys stored in GitHub repository secrets.
   - GitHub Actions assumes an ephemeral AWS IAM Role via OpenID Connect (OIDC).
4. **Hardened Container Runtime**:
   - `runAsNonRoot: true` with dedicated unprivileged users (`UID 10001`).
   - `readOnlyRootFilesystem: true` with ephemeral emptyDir mounts for `/tmp`.
   - `drop: ["ALL"]` Linux capabilities.

---

## FinOps & Full-Stack Observability

| Observability Component | Technology | Role & Metrics |
| :--- | :--- | :--- |
| **Kubernetes FinOps** | **OpenCost** | Real-time hourly cost breakdown by pod, namespace, and workload; idle capacity detection |
| **Metrics Collection** | **Prometheus Operator** | Node exporter, Kube-state-metrics, microservice RED metrics (Rate, Errors, Duration) |
| **Log Aggregation** | **Grafana Loki & Alloy** | High-velocity streaming container logs without complex indexing overhead |
| **Unified Dashboards** | **Grafana** | Pre-provisioned dashboards: OpenCost Overview, Kubernetes Cluster Health, Microservice SLAs |

---

## Production Verification & Live Proofs

### 1. Amazon EKS Auto Mode Cluster (`pokevault-eks`)
Active EKS v1.31 cluster with Karpenter-managed compute nodes, zero health issues, and zero manual node groups:
![AWS EKS Cluster](screen-recordings/eks-cluster-overview.png)

---

### 2. Kubernetes Workloads & Zero-Downtime Health
All pods across `pokevault`, `argocd`, `argo-rollouts`, `monitoring`, `external-secrets`, and `external-dns` namespaces 100% Running:
![EKS Workloads & Pods](screen-recordings/eks-workloads-pods.png)

---

### 3. Amazon RDS MySQL 8.0 Production Database (`pokevault-mysql`)
Managed RDS MySQL instance with automated table creation and auto-seeding job (`pokevault-db-seeder`):
![AWS RDS MySQL Console](screen-recordings/rds-mysql-console.png)

---

### 4. Amazon CloudFront CDN Distribution (`E3DE85EBKNIBRO`)
Global edge caching serving `https://aarjav.site` with custom ACM SSL certificate and Origin Access Control:
![CloudFront Distribution Console](screen-recordings/cloudfront-distribution.png)

---

### 5. Amazon Route 53 DNS Hosted Zone (`aarjav.site`)
16 managed DNS records seamlessly routing traffic to CloudFront and the shared Kubernetes Application Load Balancer:
![Route 53 Hosted Zone](screen-recordings/route53-hosted-zone.png)

---

### 6. Amazon S3 Frontend Static Assets Bucket
Static SPA assets deployed with immutable caching headers for high performance:
![S3 Frontend Bucket Objects](screen-recordings/s3-frontend-assets.png)

---

### 7. GitHub Actions Zero-Trust CI/CD Pipeline
Continuous Integration pipeline validating tests, linting, building images, running Trivy security scans, Cosign signing, and updating GitOps tags:
![GitHub Actions Pipeline](screen-recordings/github-actions-ci-cd.png)

---

## Quickstart & Deployment Guide

### Prerequisites
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured (`aws sts get-caller-identity`)
- [Terraform v1.9+](https://developer.hashicorp.com/terraform/install)
- [kubectl v1.31+](https://kubernetes.io/docs/tasks/tools/)
- [Docker Desktop](https://www.docker.com/) (running for local builds)
- Registered domain name on AWS Route 53 (e.g., `aarjav.site`)

### 1. Bootstrap State & Deploy Everything (Single Command)
```bash
# Clone the repository
git clone https://github.com/itsme-aarjav/POKEVAULT-LEGENDS.git
cd POKEVAULT-LEGENDS

# Execute end-to-end idempotent deployment
# (Bootstraps S3 state, provisions Foundation, builds images, provisions Runtime, seeds DB, registers Argo CD)
./scripts/deploy.sh
```

### 2. Verify Live Endpoints
```bash
# Test API Gateway & Microservice Health
curl -s https://api.aarjav.site/api/health | jq .

# Query Pokémon Trading Cards & Slabs
curl -s https://api.aarjav.site/api/cards | jq '.[0:2]'

# Query Catalog Categories
curl -s https://api.aarjav.site/api/categories | jq .

# Query Orders Endpoint (Order State)
curl -s https://api.aarjav.site/api/orders | jq .

# Verify Frontend CDN Edge Response
curl -s -I https://aarjav.site | head -n 5
```

### 3. Retrieve Argo CD Admin Password
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d && echo
```

### 4. Teardown Ephemeral Runtime (Save $0 Idle Cost)
```bash
# Tears down EKS, VPC, RDS, Redis, and WAF
# KEEPS Route 53, ACM, CloudFront, and S3 intact (~$1/mo)
./scripts/destroy.sh

# (Optional) Full complete destruction of all resources including Route 53
./scripts/destroy.sh --destroy-foundation
```

---

## Local Development with Docker Compose

To test microservices locally without an AWS account:
```bash
# Start MySQL, Redis, and all microservices
docker compose up -d --build

# Verify running services
docker compose ps

# Run end-to-end integration test suite
node test-live-runtime.mjs
```

---

<div align="center">
Maintained by <a href="https://github.com/itsme-aarjav">Aarjav Jain</a>
</div>
