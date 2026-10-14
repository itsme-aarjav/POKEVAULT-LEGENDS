output "route53_nameservers" {
  description = "Authoritative nameservers for Route 53 hosted zone delegation"
  value       = aws_route53_zone.main.name_servers
}

output "route53_zone_id" {
  description = "Route 53 hosted zone ID"
  value       = aws_route53_zone.main.zone_id
}

output "acm_certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.cert.arn
}

output "frontend_bucket_name" {
  description = "Name of the S3 bucket hosting frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "cloudfront_domain_name" {
  description = "Default CloudFront distribution domain name"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "ecr_repository_urls" {
  description = "Map of ECR repository names to registry URLs"
  value       = { for k, v in aws_ecr_repository.services : k => v.repository_url }
}

output "secrets_manager_arn" {
  description = "ARN of the Secrets Manager production configuration secret"
  value       = aws_secretsmanager_secret.config.arn
}

output "github_actions_role_arn" {
  description = "ARN of the IAM role assumed by GitHub Actions via OIDC"
  value       = aws_iam_role.github_ci.arn
}
