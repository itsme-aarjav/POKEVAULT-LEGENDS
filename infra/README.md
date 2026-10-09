# Infrastructure Directory

This directory contains the Terraform code used to provision AWS cloud resources for the PokeVault platform.

---

## Directory Structure

```
infra/
└── terraform/                 # AWS Infrastructure as Code
    ├── vpc.tf                 # Network: VPC, subnets, and internet gateway
    ├── eks_auto.tf            # Kubernetes cluster (Amazon EKS Auto Mode)
    ├── ecr.tf                 # Container registries for storing Docker images
    ├── iam_oidc.tf            # Secure GitHub Actions authentication without static keys
    ├── budget.tf              # AWS cost guardrail alert
    ├── providers.tf           # AWS provider configuration
    ├── variables.tf           # Input variables
    └── outputs.tf             # Output values
```

---

## Infrastructure Overview

Terraform automatically provisions all required AWS resources:
* **VPC & Subnets:** Network spread across 3 availability zones for high availability.
* **Amazon EKS:** Managed Kubernetes cluster running version 1.31 with Karpenter for automated node management.
* **Amazon ECR:** 4 private image repositories where GitHub Actions pushes built Docker images.
* **IAM OIDC:** Allows GitHub Actions to push images securely to AWS using short-lived tokens.
