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

# 2. Phase 3: Foundation (Idempotent; non-blocking on ACM DNS validation)
echo "[deploy] Ensuring Foundation Infrastructure (Route 53, ACM, CloudFront, ECR)..."
terraform -chdir="${REPO_ROOT}/infra/foundation" init -backend-config=backend.hcl
terraform -chdir="${REPO_ROOT}/infra/foundation" apply -auto-approve -var="wait_for_acm_validation=false"

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
  npm --prefix "${REPO_ROOT}" run build
  aws s3 sync "${REPO_ROOT}/dist" "s3://${FRONTEND_BUCKET}" --delete
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
echo "[deploy] Injecting runtime parameters into ${ROOT_APP_FILE}..."
ACCOUNT_ID="${ACCOUNT_ID}" ACM_CERT_ARN="${ACM_CERT_ARN}" WAF_ACL_ARN="${WAF_ACL_ARN}" ROOT_APP_FILE="${ROOT_APP_FILE}" python3 -c '
import os, re

root_app = os.environ["ROOT_APP_FILE"]
account_id = os.environ["ACCOUNT_ID"]
acm_arn = os.environ["ACM_CERT_ARN"]
waf_arn = os.environ["WAF_ACL_ARN"]

with open(root_app, "r") as f:
    content = f.read()

content = re.sub(r"(- name: awsAccountId\s+value:\s*)\"[^\"]*\"", r"\g<1>\"" + account_id + "\"", content)
content = re.sub(r"(- name: acmCertificateArn\s+value:\s*)\"[^\"]*\"", r"\g<1>\"" + acm_arn + "\"", content)
content = re.sub(r"(- name: wafAclArn\s+value:\s*)\"[^\"]*\"", r"\g<1>\"" + waf_arn + "\"", content)

with open(root_app, "w") as f:
    f.write(content)
'

# 8. Deploy Helm Chart & Argo CD Root Application
echo "[deploy] Deploying PokéVault Helm Chart..."
helm upgrade --install pokevault "${REPO_ROOT}/gitops/helm-chart" \
  --namespace pokevault \
  --create-namespace \
  --set awsAccountId="${ACCOUNT_ID}" \
  --set awsRegion="${REGION}" \
  --set domainName="${DOMAIN_NAME}" \
  --set acmCertificateArn="${ACM_CERT_ARN}" \
  --set wafAclArn="${WAF_ACL_ARN}"

echo "[deploy] Applying Argo CD Root Application..."
kubectl apply -f "${ROOT_APP_FILE}"

# 9. Verify Workload Convergence
echo "[deploy] Verifying deployment rollouts..."
kubectl rollout status deployment/auth-service -n pokevault --timeout=180s
kubectl rollout status deployment/catalog-service -n pokevault --timeout=180s
kubectl rollout status deployment/nginx-gateway -n pokevault --timeout=180s

echo "[deploy] PokéVault Stack deployed successfully."
kubectl get ingress -A
