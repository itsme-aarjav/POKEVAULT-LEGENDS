# 🤖 AIOps & Autonomous Kubernetes SRE with K8sGPT

This directory contains the declarative manifests and operational guides for the **AIOps (Artificial Intelligence for IT Operations)** tier of the PokéVault Legends platform.

---

## 🌟 Why AIOps in a Top 1% DevOps Project?

Traditional Kubernetes troubleshooting involves running multiple tedious commands:
```bash
kubectl get pods
kubectl describe pod <pod-name>
kubectl logs <pod-name> --previous
```
In high-velocity production microservices environments, this manual workflow increases **Mean Time to Resolution (MTTR)** and causes alert fatigue.

By integrating **K8sGPT**, our Amazon EKS cluster gains an **autonomous AI-SRE Operator**:
1. **Event Correlation:** Instantly detects failing pods (`CrashLoopBackOff`, `ImagePullBackOff`, OOMKilled, PVC mount failures, HPA scaling bottlenecks).
2. **AI-Powered Diagnostics:** Queries an LLM backend (OpenAI, AWS Bedrock, or local models) with cluster context to explain the root cause in plain English.
3. **Actionable Remediation:** Outputs the exact `kubectl` command or Helm values change required to fix the failure.

---

## 🚀 1-Minute Quick Start Guide

### Step 1: Install the K8sGPT Helm Operator
```bash
helm repo add k8sgpt https://charts.k8sgpt.ai/
helm repo update
helm install k8sgpt-operator k8sgpt/k8sgpt-operator \
  --namespace k8sgpt-operator-system \
  --create-namespace
```

### Step 2: Create the AI Provider Secret (OpenAI / AWS Bedrock)
```bash
kubectl create secret generic k8sgpt-ai-secret \
  --namespace k8sgpt-operator-system \
  --from-literal=openai-api-key="<YOUR_OPENAI_OR_BEDROCK_API_KEY>"
```

### Step 3: Deploy the Declarative K8sGPT Custom Resource
```bash
kubectl apply -f gitops/aiops/k8sgpt-operator.yaml
```

---

## 🧪 Live Incident Simulation & AI Remediation Demo

To demonstrate K8sGPT in an interview or demo recording:

### 1. Trigger a Simulated Failure:
Deploy a misconfigured pod (e.g. wrong image tag or missing secret):
```bash
kubectl run broken-order-service --image=pokevault/order-service:invalid-tag-v99 -n default
```

### 2. Run Autonomous AI Triage:
```bash
k8sgpt analyze --explain --namespace default
```

### 3. Example AI Output:
```text
AI Provider: OpenAI (gpt-4o-mini)

0: Pod default/broken-order-service:
- Error: Back-off pulling image "pokevault/order-service:invalid-tag-v99"
- Root Cause: Kubernetes kubelet cannot locate the specified image tag in Amazon ECR or Docker Hub.
- Remediation:
  1. Verify the image tag exists in Amazon ECR:
     aws ecr describe-images --repository-name pokevault-order-service
  2. Update the container image to a valid digest:
     kubectl set image pod/broken-order-service broken-order-service=pokevault/order-service:sha-a8f3b9c
```

---

## 🛡️ Enterprise Security & FinOps Compliance
* **Data Privacy:** K8sGPT strips sensitive environment variables, passwords, and tokens before sending anonymized error logs to the AI backend.
* **FinOps Efficiency:** K8sGPT uses local event caching (`noCache: false`) to prevent redundant LLM API calls, keeping operational costs under $0.05 per day.
