#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

REGION="us-east-1"
DESTROY_FOUNDATION=false

for arg in "$@"; do
  if [[ "${arg}" == "--destroy-foundation" ]]; then
    DESTROY_FOUNDATION=true
  fi
done

echo "[destroy] Validating AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text --region "${REGION}")
if [[ -z "${ACCOUNT_ID}" || "${ACCOUNT_ID}" == "None" ]]; then
  echo "[destroy] ERROR: Unable to retrieve AWS Account ID." >&2
  exit 1
fi
echo "[destroy] Authenticated as AWS Account: ${ACCOUNT_ID}"

# 1. Clean up Kubernetes Workloads & Ingresses in strict dependency order
EKS_CLUSTER_NAME=$(terraform -chdir="${REPO_ROOT}/infra/runtime" output -raw eks_cluster_name 2>/dev/null || echo "")
if [[ -n "${EKS_CLUSTER_NAME}" ]]; then
  echo "[destroy] Updating kubeconfig for ${EKS_CLUSTER_NAME}..."
  if aws eks update-kubeconfig --region "${REGION}" --name "${EKS_CLUSTER_NAME}" 2>/dev/null; then
    echo "[destroy] Step 1: Deleting Argo CD Applications to prevent self-heal reconciliation..."
    kubectl delete applications.argoproj.io --all -n argocd --ignore-not-found=true --timeout=120s

    echo "[destroy] Step 2: Deleting all Ingresses across all namespaces to initiate ALB teardown..."
    kubectl delete ingress --all -A --ignore-not-found=true

    echo "[destroy] Step 3: Waiting 60 seconds for ExternalDNS record cleanup and AWS ALB Controller ENI release..."
    sleep 60

    echo "[destroy] Removing remaining pokevault namespace workloads..."
    kubectl delete namespace pokevault --ignore-not-found=true --timeout=60s || true
  fi
fi

# 2. Destroy Ephemeral Runtime Infrastructure
echo "[destroy] Destroying Ephemeral Runtime Infrastructure (EKS, VPC, RDS, Redis, WAF)..."
terraform -chdir="${REPO_ROOT}/infra/runtime" destroy -auto-approve

# 3. Foundation Infrastructure (Protected by default)
if [[ "${DESTROY_FOUNDATION}" == "true" ]]; then
  echo "[destroy] --destroy-foundation flag detected: Proceeding with Foundation Infrastructure teardown..."
  FRONTEND_BUCKET=$(terraform -chdir="${REPO_ROOT}/infra/foundation" output -raw frontend_bucket_name 2>/dev/null || echo "")
  if [[ -n "${FRONTEND_BUCKET}" ]]; then
    echo "[destroy] Emptying frontend bucket: ${FRONTEND_BUCKET}..."
    aws s3 rm "s3://${FRONTEND_BUCKET}" --recursive 2>/dev/null || true
  fi

  echo "[destroy] Destroying Foundation Infrastructure (Route 53, ACM, CloudFront, ECR)..."
  terraform -chdir="${REPO_ROOT}/infra/foundation" destroy -auto-approve
  echo "[destroy] Full infrastructure teardown completed."
else
  echo "[destroy] Foundation Infrastructure PRESERVED (Route 53 Hosted Zone, ACM Cert, CloudFront, ECR)."
  echo "[destroy] To destroy foundation resources, run: ./scripts/destroy.sh --destroy-foundation"
fi
