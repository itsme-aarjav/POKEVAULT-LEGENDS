# GitOps Directory

This directory contains the deployment files used by Kubernetes and ArgoCD to manage the application on AWS EKS.

---

## Directory Structure

```
gitops/
├── helm/
│   └── pokevault/             # Helm chart containing all deployment templates
│       ├── Chart.yaml         # Chart information
│       ├── values.yaml        # Configuration values (ports, replica counts, ingress)
│       └── templates/         # YAML templates for Pods, Services, and Ingress
├── argocd/
│   ├── application.yaml       # ArgoCD configuration linking Git to the cluster
│   └── argocd-ingress.yaml    # Public HTTPS route for the ArgoCD dashboard
├── monitoring/
│   └── monitoring-stack.yaml  # Prometheus and Grafana manifests
```

---

## Key Parts Explained

### 1. Helm Chart (`helm/pokevault`)
Groups all the Kubernetes YAML files into a single deployable unit:
* Deployments for frontend, auth, catalog, and order services.
* StatefulSet for MySQL with AWS EBS disk attachment.
* Deployment for Redis cache.
* Ingress rules connecting the AWS Application Load Balancer to the frontend.
* Horizontal Pod Autoscaler (HPA) to automatically scale catalog pods when CPU load increases.

### 2. ArgoCD (`argocd/`)
Connects the Kubernetes cluster to the GitHub repository. Whenever code or YAML changes are pushed to GitHub, ArgoCD automatically updates the cluster.

### 3. Monitoring (`monitoring/`)
* **Prometheus:** Periodically scrapes response times and error codes from the services.
* **Grafana:** Displays this data on a visual dashboard.

