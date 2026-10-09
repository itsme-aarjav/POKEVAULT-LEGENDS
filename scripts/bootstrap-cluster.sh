#!/usr/bin/env bash
set -euo pipefail

echo "=========================================================="
echo "PokeVault Legends - Cluster Bootstrap Engine"
echo "=========================================================="

REGION="us-east-1"
CLUSTER_NAME="pokevault-eks-auto"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# 1. Terraform Provisioning
echo "==> [1/6] Provisioning AWS EKS Auto Mode & Infrastructure via Terraform..."
cd "$ROOT_DIR/infra/terraform"
terraform init
terraform apply -auto-approve

# 2. Configure Kubeconfig & Access Entries
echo "==> [2/6] Connecting kubectl context to $CLUSTER_NAME..."
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION"

ROOT_ARN=$(aws sts get-caller-identity --query "Arn" --output text || true)
if [[ -n "$ROOT_ARN" ]]; then
    echo "==> Configuring EKS Access Entry for $ROOT_ARN..."
    aws eks create-access-entry --cluster-name "$CLUSTER_NAME" --principal-arn "$ROOT_ARN" --type STANDARD --region "$REGION" 2>/dev/null || true
    aws eks associate-access-policy --cluster-name "$CLUSTER_NAME" --principal-arn "$ROOT_ARN" --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy --access-scope type=cluster --region "$REGION" 2>/dev/null || true
fi

echo "Waiting for cluster nodes to become ready..."
kubectl wait --for=condition=Ready nodes --all --timeout=180s 2>/dev/null || sleep 15

# 3. Install ArgoCD & Argo Rollouts
echo "==> [3/6] Deploying GitOps Engine (ArgoCD & Argo Rollouts)..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

kubectl create namespace argo-rollouts --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml

# 4. Install External Secrets Operator
echo "==> [4/6] Installing External Secrets Operator..."
helm repo add external-secrets https://charts.external-secrets.io 2>/dev/null || true
helm repo update
helm upgrade --install external-secrets external-secrets/external-secrets \
  -n external-secrets \
  --create-namespace \
  --set installCRDs=true

# 5. Deploy PokéVault Application & Observability Stack
echo "==> [5/6] Deploying PokéVault Microservices & Observability Stack..."
cd "$ROOT_DIR"
kubectl create namespace pokevault --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f gitops/monitoring/monitoring-stack.yaml

# Install Application Helm Release
helm upgrade --install pokevault gitops/helm/pokevault -n pokevault --create-namespace

# Connect ArgoCD GitOps Application
kubectl apply -f gitops/argocd/application.yaml

echo "Waiting for microservice pods to be ready..."
kubectl rollout status deployment/pokevault-frontend -n pokevault --timeout=180s 2>/dev/null || true

# 6. Print Live Endpoints
echo "=========================================================="
echo "PokeVault Cluster Successfully Bootstrapped"
echo "=========================================================="
echo "Active Ingress Endpoints (ALBs may take 1-2 mins to initialize DNS):"
kubectl get ingress -A
echo "=========================================================="
