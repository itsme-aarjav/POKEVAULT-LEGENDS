#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

REGION="us-east-1"
DOMAIN_NAME="aarjav.site"
FORCE_BUILD=false

for arg in "$@"; do
  if [[ "${arg}" == "--force-build" ]]; then
    FORCE_BUILD=true
  fi
done

echo "[deploy] Checking AWS credentials..."
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text --region "${REGION}")
if [[ -z "${ACCOUNT_ID}" || "${ACCOUNT_ID}" == "None" ]]; then
  echo "[deploy] ERROR: Unable to retrieve AWS Account ID." >&2
  exit 1
fi
echo "[deploy] Authenticated as AWS Account: ${ACCOUNT_ID}"

# 1. State Bootstrap
echo "[deploy] Bootstrapping remote state..."
bash "${SCRIPT_DIR}/bootstrap-state.sh"

# 2. Phase 3: Foundation (Idempotent)
echo "[deploy] Ensuring Foundation Infrastructure (Route 53, ACM, CloudFront, ECR)..."
terraform -chdir="${REPO_ROOT}/infra/foundation" init -backend-config=backend.hcl
terraform -chdir="${REPO_ROOT}/infra/foundation" apply -auto-approve

FRONTEND_BUCKET=$(terraform -chdir="${REPO_ROOT}/infra/foundation" output -raw frontend_bucket_name 2>/dev/null || echo "")
CF_DIST_ID=$(terraform -chdir="${REPO_ROOT}/infra/foundation" output -raw cloudfront_distribution_id 2>/dev/null || echo "")

# 3. Smart ECR Image Check & Build (linux/amd64 for Apple Silicon compatibility)
echo "[deploy] Authenticating Docker with ECR..."
aws ecr get-login-password --region "${REGION}" | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

SERVICES=("auth-service" "catalog-service" "order-service" "nginx-gateway")
for SVC in "${SERVICES[@]}"; do
  IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/pokevault/${SVC}:latest"
  
  IMAGE_EXISTS=false
  if [[ "${FORCE_BUILD}" != "true" ]]; then
    if aws ecr describe-images --repository-name "pokevault/${SVC}" --image-ids imageTag=latest --region "${REGION}" >/dev/null 2>&1; then
      IMAGE_EXISTS=true
    fi
  fi

  if [[ "${IMAGE_EXISTS}" == "true" ]]; then
    echo "[deploy] Image pokevault/${SVC}:latest already exists in ECR. Skipping build (pass --force-build to override)."
  else
    echo "[deploy] Building and pushing ${SVC} (--platform linux/amd64) -> ${IMAGE_URI}..."
    docker build --platform linux/amd64 -t "${IMAGE_URI}" "${REPO_ROOT}/services/${SVC}"
    docker push "${IMAGE_URI}"
  fi
done

# 4. Build Frontend & Sync to S3
if [[ -n "${FRONTEND_BUCKET}" && -f "${REPO_ROOT}/package.json" ]]; then
  echo "[deploy] Building and syncing frontend to S3 (${FRONTEND_BUCKET})..."
  VITE_API_BASE_URL="https://api.${DOMAIN_NAME}/api" npm --prefix "${REPO_ROOT}" run build
  aws s3 sync "${REPO_ROOT}/dist/assets" "s3://${FRONTEND_BUCKET}/assets" --cache-control "public, max-age=31536000, immutable" --delete
  aws s3 sync "${REPO_ROOT}/dist" "s3://${FRONTEND_BUCKET}" --exclude "assets/*" --cache-control "public, max-age=0, must-revalidate" --delete
  if [[ -n "${CF_DIST_ID}" ]]; then
    echo "[deploy] Invalidating CloudFront cache (${CF_DIST_ID})..."
    aws cloudfront create-invalidation --distribution-id "${CF_DIST_ID}" --paths "/*" >/dev/null
  fi
fi

# 5. Phase 4: Runtime
echo "[deploy] Deploying Ephemeral Runtime Infrastructure..."
terraform -chdir="${REPO_ROOT}/infra/runtime" init -backend-config=backend.hcl
terraform -chdir="${REPO_ROOT}/infra/runtime" apply -auto-approve

EKS_CLUSTER_NAME=$(terraform -chdir="${REPO_ROOT}/infra/runtime" output -raw eks_cluster_name)
WAF_ACL_ARN=$(terraform -chdir="${REPO_ROOT}/infra/runtime" output -raw waf_web_acl_arn)
ACM_CERT_ARN=$(terraform -chdir="${REPO_ROOT}/infra/runtime" output -raw acm_certificate_arn)

# 6. Update Kubeconfig
echo "[deploy] Configuring kubectl context for ${EKS_CLUSTER_NAME}..."
aws eks update-kubeconfig --region "${REGION}" --name "${EKS_CLUSTER_NAME}"

# 7. Auto-Inject Dynamic Parameters into Root App Manifest
ROOT_APP_FILE="${REPO_ROOT}/gitops/root-app.yaml"
echo "[deploy] Resolving Git repository URL and injecting runtime parameters into ${ROOT_APP_FILE}..."

RAW_GIT_URL=$(git -C "${REPO_ROOT}" config --get remote.origin.url 2>/dev/null || echo "")
if [[ -z "${RAW_GIT_URL}" ]]; then
  GIT_REPO_URL="https://github.com/itsme-aarjav/pokevault.git"
elif [[ "${RAW_GIT_URL}" =~ ^git@github\.com:(.+)\.git$ ]]; then
  GIT_REPO_URL="https://github.com/${BASH_REMATCH[1]}.git"
elif [[ "${RAW_GIT_URL}" =~ ^git@github\.com:(.+)$ ]]; then
  GIT_REPO_URL="https://github.com/${BASH_REMATCH[1]}.git"
else
  GIT_REPO_URL="${RAW_GIT_URL}"
fi
echo "[deploy] Dynamic repoURL: ${GIT_REPO_URL}"

ACCOUNT_ID="${ACCOUNT_ID}" ACM_CERT_ARN="${ACM_CERT_ARN}" WAF_ACL_ARN="${WAF_ACL_ARN}" GIT_REPO_URL="${GIT_REPO_URL}" ROOT_APP_FILE="${ROOT_APP_FILE}" python3 -c '
import os, re

root_app = os.environ["ROOT_APP_FILE"]
account_id = os.environ["ACCOUNT_ID"]
acm_arn = os.environ["ACM_CERT_ARN"]
waf_arn = os.environ["WAF_ACL_ARN"]
repo_url = os.environ["GIT_REPO_URL"]

with open(root_app, "r") as f:
    content = f.read()

content = re.sub(r"(repoURL:\s*)\S+", lambda m: f"{m.group(1)}{repo_url}", content)
content = re.sub(r"(- name: awsAccountId\s+value:\s*)\"[^\"]*\"", lambda m: f"{m.group(1)}\"{account_id}\"", content)
content = re.sub(r"(- name: acmCertificateArn\s+value:\s*)\"[^\"]*\"", lambda m: f"{m.group(1)}\"{acm_arn}\"", content)
content = re.sub(r"(- name: wafAclArn\s+value:\s*)\"[^\"]*\"", lambda m: f"{m.group(1)}\"{waf_arn}\"", content)

with open(root_app, "w") as f:
    f.write(content)
'

# 8. Deploy Helm Chart & Argo CD Root Application
echo "[deploy] Waiting for required CRDs and controllers to be ready..."
for crd in clustersecretstores.external-secrets.io externalsecrets.external-secrets.io rollouts.argoproj.io servicemonitors.monitoring.coreos.com applications.argoproj.io; do
  echo "[deploy] Waiting for CRD ${crd}..."
  kubectl wait --for condition=established --timeout=180s "crd/${crd}" 2>/dev/null || true
done

echo "[deploy] Waiting for external-secrets webhook to become available..."
kubectl rollout status deployment/external-secrets-webhook -n external-secrets --timeout=180s 2>/dev/null || true
echo "[deploy] Waiting for argo-rollouts controller to become available..."
kubectl rollout status deployment/argo-rollouts -n argo-rollouts --timeout=180s 2>/dev/null || true
echo "[deploy] Waiting for argo-cd-server to become available..."
kubectl rollout status deployment/argo-cd-argocd-server -n argocd --timeout=180s 2>/dev/null || true

echo "[deploy] Deploying PokéVault Helm Chart (with retries for admission webhook convergence)..."
kubectl delete job pokevault-db-seeder -n pokevault --ignore-not-found 2>/dev/null || true
kubectl annotate ingressclass alb meta.helm.sh/release-name=pokevault meta.helm.sh/release-namespace=pokevault --overwrite 2>/dev/null || true
kubectl label ingressclass alb app.kubernetes.io/managed-by=Helm --overwrite 2>/dev/null || true
kubectl annotate ingressclassparams alb-params meta.helm.sh/release-name=pokevault meta.helm.sh/release-namespace=pokevault --overwrite 2>/dev/null || true
kubectl label ingressclassparams alb-params app.kubernetes.io/managed-by=Helm --overwrite 2>/dev/null || true
MAX_ATTEMPTS=5
ATTEMPT=1
until helm upgrade --install pokevault "${REPO_ROOT}/gitops/helm-chart" \
  --namespace pokevault \
  --create-namespace \
  --set awsAccountId="${ACCOUNT_ID}" \
  --set awsRegion="${REGION}" \
  --set domainName="${DOMAIN_NAME}" \
  --set acmCertificateArn="${ACM_CERT_ARN}" \
  --set wafAclArn="${WAF_ACL_ARN}" \
  --force-conflicts; do
  if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
    echo "[deploy] ERROR: Helm upgrade failed after $MAX_ATTEMPTS attempts." >&2
    exit 1
  fi
  echo "[deploy] Helm upgrade attempt $ATTEMPT failed. Waiting 10s for admission webhooks/CRDs..."
  sleep 10
  ((ATTEMPT++))
done

echo "[deploy] Applying Argo CD Root Application..."
kubectl apply -f "${ROOT_APP_FILE}"

# 9. Verify Workload Convergence
echo "[deploy] Verifying deployment rollouts..."
kubectl rollout status deployment/auth-service -n pokevault --timeout=300s
kubectl rollout status deployment/catalog-service -n pokevault --timeout=300s
kubectl rollout status deployment/nginx-gateway -n pokevault --timeout=300s

echo "[deploy] Waiting for order-service rollout pod to be ready..."
kubectl wait --for=condition=Ready pod -l app=order-service -n pokevault --timeout=300s 2>/dev/null || true

echo "[deploy] Waiting for database seeder job completion..."
kubectl wait --for=condition=complete job/pokevault-db-seeder -n pokevault --timeout=300s 2>/dev/null || true

echo "[deploy] PokéVault Stack deployed successfully."
kubectl get ingress -A

