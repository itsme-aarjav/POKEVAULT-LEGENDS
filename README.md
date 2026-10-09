# PokeVault Legends - Cloud-Native Microservices Platform

PokeVault Legends is an online Pokemon collectibles store built using a microservices architecture and deployed on Amazon Web Services (AWS) using Kubernetes (Amazon EKS).

---

## Live Endpoints

All services are deployed in the cloud on AWS with Application Load Balancers and HTTPS:

| Service | Description | URL | Access / Credentials |
| :--- | :--- | :--- | :--- |
| Storefront | Online Web Store & API Gateway | [Open Storefront](https://k8s-pokevaul-pokevaul-e701e7b82d-2093600175.us-east-1.elb.amazonaws.com) | Public Access |
| ArgoCD | GitOps Deployment Dashboard | [Open ArgoCD](https://k8s-argocd-argocdin-4beb21a6da-779593554.us-east-1.elb.amazonaws.com) | Username: `admin` <br> Password: `wV4QEIN-A67kkyZx` |
| Grafana | Observability & Metrics Dashboard | [Open Grafana](https://k8s-monitori-grafanai-1208dde3b5-1484929595.us-east-1.elb.amazonaws.com) | Auto-Login (Admin role) |

---

## What Does This Project Do?

The application is split into 4 independent microservices:

1. **Frontend (`services/frontend`):**
   * Built with Nginx and HTML5/CSS3/JavaScript.
   * Renders the product cards, cart, and checkout UI.
   * Acts as a reverse proxy, forwarding API requests to backend services.

2. **Auth Service (`services/auth-service`):**
   * Built with Node.js and Express.
   * Handles user registration, password hashing (bcrypt), and login tokens (JWT).

3. **Catalog Service (`services/catalog-service`):**
   * Built with Node.js and Express.
   * Retrieves products and inventory.
   * Uses Redis to cache frequently searched items so pages load in milliseconds.

4. **Order Service (`services/order-service`):**
   * Built with Node.js and Express.
   * Manages checkout operations, calculates verified item pricing against catalog service, and saves orders to the database.

5. **Databases:**
   * **MySQL 8.0:** Permanent database running as a Kubernetes StatefulSet with AWS EBS gp3 storage.
   * **Redis 7:** Fast in-memory cache to reduce load on MySQL.

---

## Architecture Flow

```
[ User Browser ]
       |
       v (HTTPS Port 443)
[ AWS Application Load Balancer ]
       |
       v
[ Frontend Service (Nginx) ]
       |
       +---> /api/auth/     --> [ Auth Service (Node.js) ]
       |
       +---> /api/products  --> [ Catalog Service (Node.js) ] <--> [ Redis Cache ]
       |                                                                  |
       +---> /api/orders    --> [ Order Service (Node.js) ] ------------> [ MySQL Database ]
```

---

## Infrastructure & DevOps Tools

* **AWS EKS (Kubernetes):** Runs and manages all application containers. Uses Karpenter for automatic node scaling.
* **AWS Application Load Balancer (ALB):** Manages external traffic and automatically redirects HTTP to HTTPS.
* **Terraform (`infra/terraform`):** Code that provisions AWS VPC, Subnets, EKS Cluster, and ECR repositories.
* **GitHub Actions (`.github/workflows/ci.yml`):** Builds Docker images, runs Trivy security scans, and pushes images to Amazon ECR.
* **ArgoCD (`gitops/argocd`):** GitOps tool that syncs the Kubernetes cluster with this GitHub repository.
* **Prometheus & Grafana (`gitops/monitoring`):** Gathers response times, error rates, and resource usage, displaying them on real-time dashboards.

---

## Project Structure

```
.
├── .github/
│   └── workflows/ci.yml       # Automated build and security scan pipeline
├── services/                  # Microservices source code
│   ├── frontend/              # Web store UI and Nginx proxy
│   ├── auth-service/          # Authentication service (Node.js)
│   ├── catalog-service/       # Product catalog service (Node.js Express)
│   ├── order-service/         # Checkout and order service (Node.js Express)
│   ├── db/                    # MySQL database table schema
│   └── README.md              # Microservices documentation
├── gitops/                    # Kubernetes deployment configuration
│   ├── helm/pokevault/        # Helm chart with all service deployment YAMLs
│   ├── argocd/                # ArgoCD application and ingress configuration
│   ├── monitoring/            # Prometheus and Grafana manifests
│   └── README.md              # GitOps documentation
├── infra/                     # Infrastructure as Code
│   ├── terraform/             # AWS resources (VPC, EKS, ECR, IAM)
│   └── README.md              # Infrastructure documentation
├── docs/                      # Diagrams and screenshots
└── README.md                  # Project overview
```

---

## Useful Verification Commands

Check cluster status with these commands:

```bash
# View running pods across all namespaces
kubectl get pods -A

# Check public load balancer addresses
kubectl get ingress -A

# View active worker nodes
kubectl get nodes -o wide

# Check pod autoscaler (HPA) metrics
kubectl get hpa -n pokevault
```

---

## Common Interview Questions

**Q1: Why use microservices instead of a single application?**  
Answer: Splitting the app into smaller services allows independent deployments, isolated database connections, and scaling only the services that have high traffic without touching the rest of the application.

**Q2: What is the purpose of ArgoCD?**  
Answer: ArgoCD connects the Kubernetes cluster to GitHub. Whenever new code or configuration is committed to Git, ArgoCD automatically updates the cluster so manual kubectl commands are not needed.

**Q3: How is data kept safe if a MySQL pod restarts?**  
Answer: MySQL runs as a StatefulSet connected to an AWS EBS persistent disk (`gp3`). Even if the pod is deleted or moves to another node, the disk stays intact and reattaches to the new pod.
