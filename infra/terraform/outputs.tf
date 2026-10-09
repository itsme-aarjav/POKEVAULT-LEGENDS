# Terraform outputs

output "aws_region" {
  description = "AWS region hosting the infrastructure"
  value       = var.aws_region
}

output "vpc_id" {
  description = "ID of the provisioned PokéVault VPC"
  value       = aws_vpc.main.id
}

output "ecr_repository_urls" {
  description = "Map of container repository URLs in Amazon ECR"
  value = {
    for k, v in aws_ecr_repository.microservices : k => v.repository_url
  }
}

output "github_actions_role_arn" {
  description = "IAM Role ARN to be configured in GitHub Secrets as AWS_ROLE_ARN"
  value       = aws_iam_role.github_actions.arn
}

output "eks_cluster_name" {
  description = "Name of the Amazon EKS Auto Mode cluster"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Kubernetes API Server endpoint URL"
  value       = aws_eks_cluster.main.endpoint
}

output "connect_kubeconfig_command" {
  description = "Exact command to configure local kubectl to connect to the EKS cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}
