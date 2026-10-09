# ==============================================================================
# ☸️ AMAZON EKS AUTO MODE CLUSTER & IAM ARCHITECTURE
# ==============================================================================
# Amazon EKS Auto Mode represents the bleeding-edge (2025/2026) of Kubernetes.
# It embeds Karpenter, AWS ALB Controller, and EBS CSI directly into AWS control plane:
# - ZERO manual EC2 worker node groups
# - Automatic JIT node provisioning in < 45 seconds
# - Native dynamic EBS gp3 block storage binding for MySQL StatefulSets
# ==============================================================================

data "aws_caller_identity" "current" {}

# ─── 1. EKS CLUSTER IAM ROLE & AUTO MODE POLICIES ─────────────────────────────
resource "aws_iam_role" "cluster" {
  name = "${var.project_name}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = [
          "sts:AssumeRole",
          "sts:TagSession"
        ]
      }
    ]
  })
}

# Standard cluster policy
resource "aws_iam_role_policy_attachment" "cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

# EKS Auto Mode managed policies (Compute, Storage, Networking, Load Balancing)
resource "aws_iam_role_policy_attachment" "cluster_compute_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSComputePolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_storage_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSBlockStoragePolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_loadbalancing_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSLoadBalancingPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_networking_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSNetworkingPolicy"
  role       = aws_iam_role.cluster.name
}

# ─── 2. EKS AUTO MODE NODE IAM ROLE ───────────────────────────────────────────
resource "aws_iam_role" "node" {
  name = "${var.project_name}-eks-auto-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "node_minimal_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodeMinimalPolicy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_ecr_pull" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPullOnly"
  role       = aws_iam_role.node.name
}

# ─── 3. AMAZON EKS AUTO CLUSTER RESOURCE ──────────────────────────────────────
resource "aws_eks_cluster" "main" {
  name     = "${var.project_name}-eks-auto"
  role_arn = aws_iam_role.cluster.arn
  version  = "1.31"

  vpc_config {
    subnet_ids              = aws_subnet.public[*].id
    endpoint_public_access  = true
    endpoint_private_access = true
  }

  # Enable EKS Auto Mode: Automates Karpenter compute & EBS storage drivers
  compute_config {
    enabled       = true
    node_pools    = ["general-purpose", "system"]
    node_role_arn = aws_iam_role.node.arn
  }

  storage_config {
    block_storage {
      enabled = true
    }
  }

  kubernetes_network_config {
    elastic_load_balancing {
      enabled = true
    }
  }

  # Ensure all IAM policies are attached prior to provisioning
  depends_on = [
    aws_iam_role_policy_attachment.cluster_policy,
    aws_iam_role_policy_attachment.cluster_compute_policy,
    aws_iam_role_policy_attachment.cluster_storage_policy,
    aws_iam_role_policy_attachment.cluster_loadbalancing_policy,
    aws_iam_role_policy_attachment.cluster_networking_policy,
    aws_iam_role_policy_attachment.node_minimal_policy,
    aws_iam_role_policy_attachment.node_ecr_pull
  ]

  tags = {
    Name = "${var.project_name}-eks-auto"
  }
}

# ─── 4. EKS ACCESS ENTRY (ADMIN PERMISSION FOR CURRENT AWS CALLER) ────────────
resource "aws_eks_access_entry" "admin_user" {
  cluster_name  = aws_eks_cluster.main.name
  principal_arn = data.aws_caller_identity.current.arn
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "admin_policy" {
  cluster_name  = aws_eks_cluster.main.name
  policy_arn    = "arn:aws:iam::aws:policy/AmazonEKSClusterAdminPolicy"
  principal_arn = data.aws_caller_identity.current.arn

  access_scope {
    type = "cluster"
  }
}
