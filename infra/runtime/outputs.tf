output "eks_cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Endpoint for EKS cluster control plane"
  value       = aws_eks_cluster.main.endpoint
}

output "rds_endpoint" {
  description = "Connection endpoint for PokeVault MySQL RDS instance"
  value       = aws_db_instance.mysql.endpoint
}

output "redis_endpoint" {
  description = "Primary endpoint address for PokeVault ElastiCache Redis"
  value       = aws_elasticache_cluster.redis.cache_nodes[0].address
}

output "waf_web_acl_arn" {
  description = "ARN of the Regional WAFv2 WebACL"
  value       = aws_wafv2_web_acl.alb.arn
}

output "eso_irsa_role_arn" {
  description = "ARN of the IAM role for External Secrets Operator IRSA"
  value       = aws_iam_role.eso_irsa.arn
}

output "acm_certificate_arn" {
  description = "ARN of the validated ACM certificate for aarjav.site"
  value       = data.aws_acm_certificate.cert.arn
}
