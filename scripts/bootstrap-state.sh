#!/usr/bin/env bash
set -euo pipefail

REGION="us-east-1"
TABLE_NAME="pokevault-tflock"

echo "[bootstrap] Validating AWS credentials and retrieving Account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query "Account" --output text --region "${REGION}")
if [[ -z "${ACCOUNT_ID}" || "${ACCOUNT_ID}" == "None" ]]; then
  echo "[bootstrap] ERROR: Unable to retrieve AWS Account ID." >&2
  exit 1
fi
echo "[bootstrap] Authenticated as AWS Account: ${ACCOUNT_ID}"

BUCKET_NAME="pokevault-tfstate-${ACCOUNT_ID}"

echo "[bootstrap] Ensuring S3 state bucket: ${BUCKET_NAME} in ${REGION}..."
if ! aws s3api head-bucket --bucket "${BUCKET_NAME}" --region "${REGION}" 2>/dev/null; then
  aws s3api create-bucket --bucket "${BUCKET_NAME}" --region "${REGION}"
  echo "[bootstrap] S3 bucket created."
else
  echo "[bootstrap] S3 bucket already exists."
fi

aws s3api put-bucket-versioning \
  --bucket "${BUCKET_NAME}" \
  --versioning-configuration Status=Enabled \
  --region "${REGION}"

aws s3api put-bucket-encryption \
  --bucket "${BUCKET_NAME}" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}' \
  --region "${REGION}"

aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  --region "${REGION}"

echo "[bootstrap] Ensuring DynamoDB lock table: ${TABLE_NAME} in ${REGION}..."
if ! aws dynamodb describe-table --table-name "${TABLE_NAME}" --region "${REGION}" 2>/dev/null; then
  aws dynamodb create-table \
    --table-name "${TABLE_NAME}" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "${REGION}"
  aws dynamodb wait table-exists --table-name "${TABLE_NAME}" --region "${REGION}"
  echo "[bootstrap] DynamoDB table created."
else
  echo "[bootstrap] DynamoDB table already exists."
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

mkdir -p "${REPO_ROOT}/infra/foundation" "${REPO_ROOT}/infra/runtime"

cat <<EOF > "${REPO_ROOT}/infra/foundation/backend.hcl"
bucket = "${BUCKET_NAME}"
EOF

cat <<EOF > "${REPO_ROOT}/infra/runtime/backend.hcl"
bucket = "${BUCKET_NAME}"
EOF

echo "[bootstrap] Remote state bootstrap completed successfully."
echo "[bootstrap] Generated backend configurations with bucket: ${BUCKET_NAME}"
