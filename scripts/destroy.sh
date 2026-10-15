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

    echo "[destroy] Step 2: Uninstalling Helm release and removing all Ingresses across namespaces..."
    helm uninstall pokevault -n pokevault 2>/dev/null || true
    kubectl delete ingress --all -A --ignore-not-found=true

    echo "[destroy] Step 3: Actively polling AWS ELBv2 until the shared ALB is fully deleted..."
    while true; do
      ALB_COUNT=$(aws elbv2 describe-load-balancers --region "${REGION}" \
        --query "length(LoadBalancers[?contains(LoadBalancerName, 'pokevault')])" --output text 2>/dev/null || echo "0")
      if [[ "${ALB_COUNT}" -eq 0 || "${ALB_COUNT}" == "None" ]]; then
        echo "[destroy] All shared ALBs have been removed from AWS ELBv2."
        break
      fi
      echo "[destroy] Waiting for ${ALB_COUNT} active ALB(s) to finish deletion... (sleeping 10s)"
      sleep 10
    done

    echo "[destroy] Waiting 20 seconds for AWS VPC ENIs to fully detach..."
    sleep 20

    echo "[destroy] Removing remaining pokevault namespace workloads..."
    kubectl delete namespace pokevault --ignore-not-found=true --timeout=60s || true
  fi
fi

# 2. Destroy Ephemeral Runtime Infrastructure
echo "[destroy] Destroying Ephemeral Runtime Infrastructure (EKS, VPC, RDS, Redis, WAF)..."
MAX_RETRIES=4
RETRY_DELAY=20
DESTROY_SUCCESS=false

for ((i=1; i<=MAX_RETRIES; i++)); do
  echo "[destroy] Attempt $i of $MAX_RETRIES: Running terraform destroy in infra/runtime..."
  if terraform -chdir="${REPO_ROOT}/infra/runtime" destroy -auto-approve; then
    DESTROY_SUCCESS=true
    echo "[destroy] Runtime terraform destroy succeeded."
    break
  else
    echo "[destroy] Attempt $i failed (likely transient VPC/ENI dependency). Retrying in ${RETRY_DELAY}s..."
    sleep "${RETRY_DELAY}"
  fi
done

if [[ "${DESTROY_SUCCESS}" != "true" ]]; then
  echo "[destroy] ERROR: Runtime terraform destroy failed after $MAX_RETRIES attempts." >&2
  exit 1
fi

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
