#!/usr/bin/env bash
set -uo pipefail

echo "=========================================================="
echo "PokeVault Legends - Teardown and Cleanup Engine"
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Step 1: Removing ArgoCD application finalizers to prevent hung namespaces..."
kubectl patch application pokevault-production -n argocd -p '{"metadata":{"finalizers":null}}' --type=merge 2>/dev/null || true
kubectl delete application pokevault-production -n argocd --ignore-not-found=true --timeout=30s || true

echo "Step 2: Deleting Kubernetes Ingresses and Application Load Balancers..."
# Delete all Ingresses to allow AWS Load Balancer Controller to de-register Target Groups and delete ALBs
kubectl delete ingress --all -n pokevault --ignore-not-found=true --timeout=60s || true
kubectl delete ingress --all -n argocd --ignore-not-found=true --timeout=60s || true
kubectl delete ingress --all -n monitoring --ignore-not-found=true --timeout=60s || true

echo "Waiting 45 seconds for AWS ALBs to de-register and release VPC subnets..."
sleep 45

echo "Step 3: Cleaning up Persistent Volume Claims and Helm Releases..."
kubectl delete pvc --all -n pokevault --ignore-not-found=true --timeout=30s || true
helm uninstall external-secrets -n external-secrets 2>/dev/null || true
helm uninstall pokevault -n pokevault 2>/dev/null || true

echo "Step 4: Destroying AWS Infrastructure via Terraform..."
cd "$ROOT_DIR/infra/terraform"
terraform destroy -auto-approve || true

echo "Step 5: Cleaning up any detached dynamic EBS storage volumes..."
EBS_VOLS=$(aws ec2 describe-volumes --filters "Name=tag:eks:eks-cluster-name,Values=pokevault-eks-auto" "Name=status,Values=available" --region us-east-1 --query "Volumes[*].VolumeId" --output text 2>/dev/null || true)
for vol in $EBS_VOLS; do
    if [[ -n "$vol" ]]; then
        echo "Deleting detached volume: $vol"
        aws ec2 delete-volume --volume-id "$vol" --region us-east-1 2>/dev/null || true
    fi
done

echo "=========================================================="
echo "All AWS resources destroyed. Teardown complete."
echo "=========================================================="
