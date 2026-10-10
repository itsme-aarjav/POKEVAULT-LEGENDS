# PokéVault Legends — Active Service Endpoints & Architecture Links

**Deployment Status:** SUCCESS (All microservices and observability active)
**Cluster:** pokevault-eks-auto (Region: us-east-1)
**Generated At:** 2026-10-10T12:41:15Z

## 1. Production Microservices & Storefront
- **Storefront (HTTP):** http://k8s-pokevaul-pokevaul-e701e7b82d-202949458.us-east-1.elb.amazonaws.com
- **Storefront (HTTPS):** https://k8s-pokevaul-pokevaul-e701e7b82d-202949458.us-east-1.elb.amazonaws.com
- **Catalog API:** http://k8s-pokevaul-pokevaul-e701e7b82d-202949458.us-east-1.elb.amazonaws.com/api/cards
- **Orders API:** http://k8s-pokevaul-pokevaul-e701e7b82d-202949458.us-east-1.elb.amazonaws.com/api/orders
- **Auth API:** http://k8s-pokevaul-pokevaul-e701e7b82d-202949458.us-east-1.elb.amazonaws.com/api/auth

## 2. Observability & FinOps Portals
- **Grafana Dashboards:** http://k8s-monitori-grafanai-1208dde3b5-1173025512.us-east-1.elb.amazonaws.com
  *(Credentials: admin / admin123)*
- **OpenCost FinOps Dashboard:** Available via Grafana FinOps dashboard or port-forward:
  `kubectl port-forward svc/opencost -n monitoring 9003:9003`
- **Prometheus UI:** Available via port-forward:
  `kubectl port-forward svc/prometheus -n monitoring 9090:9090`

## 3. GitOps & Progressive Delivery Engines
- **ArgoCD UI:** Port-forward available via:
  `kubectl port-forward svc/argocd-server -n argocd 8080:443`
  *(Login: admin / Initial secret: `kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d`)*
- **Argo Rollouts Canary:** Live on deployment `pokevault-order` in namespace `pokevault`

