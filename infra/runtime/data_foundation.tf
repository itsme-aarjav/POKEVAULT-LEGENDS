data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

data "aws_acm_certificate" "cert" {
  domain      = var.domain_name
  statuses    = ["ISSUED", "PENDING_VALIDATION"]
  most_recent = true
}

data "aws_secretsmanager_secret" "config" {
  name = "pokevault/prod/config"
}

data "aws_secretsmanager_secret_version" "config" {
  secret_id = data.aws_secretsmanager_secret.config.id
}
