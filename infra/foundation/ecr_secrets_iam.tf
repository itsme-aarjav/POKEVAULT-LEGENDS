locals {
  ecr_repos = [
    "pokevault/auth-service",
    "pokevault/catalog-service",
    "pokevault/order-service",
    "pokevault/nginx-gateway"
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.ecr_repos)
  name                 = each.value
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "services" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Retain last 5 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 5
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

resource "random_password" "admin_secret_key" {
  length  = 32
  special = false
}

resource "random_password" "mysql_password" {
  length  = 32
  special = false
}

resource "aws_secretsmanager_secret" "config" {
  name                    = "pokevault/prod/config"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "config" {
  secret_id = aws_secretsmanager_secret.config.id
  secret_string = jsonencode({
    JWT_SECRET           = random_password.jwt_secret.result
    JWT_SIGNING_SECRET   = random_password.jwt_secret.result
    ADMIN_SECRET_KEY     = random_password.admin_secret_key.result
    PAYPAL_ENVIRONMENT   = "sandbox"
    PAYPAL_CLIENT_ID     = ""
    PAYPAL_CLIENT_SECRET = ""
    MYSQL_HOST           = "mysql.pokevault.local"
    MYSQL_PORT           = "3306"
    MYSQL_USER           = "pokevault"
    MYSQL_PASSWORD       = random_password.mysql_password.result
    MYSQL_DATABASE       = "pokevault"
    REDIS_HOST           = "redis.pokevault.local"
    REDIS_PORT           = "6379"
    REDIS_URL            = ""
    CORS_ORIGIN          = "https://${var.domain_name},https://www.${var.domain_name}"
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com", "https://github.com/itsme-aarjav"]
  thumbprint_list = [
    "06d927fecd0a84aeba28aad1d808139470fe95c3",
    "1c58a3a8518e8759bf075b76b750d4f8d264fcd9",
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}

resource "aws_iam_role" "github_ci" {
  name = "pokevault-github-ci-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = [
              "repo:${var.github_repo}:*",
              "repo:itsme-aarjav*",
              "repo:itsme-aarjav@109032559/pokevault@1419173156:*",
              "repo:itsme-aarjav*/*"
            ]
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_ci" {
  name = "pokevault-github-ci-policy"
  role = aws_iam_role.github_ci.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAuth"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECRPushPull"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = [for repo in aws_ecr_repository.services : repo.arn]
      },
      {
        Sid    = "S3FrontendDeploy"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*"
        ]
      },
      {
        Sid    = "CloudFrontInvalidate"
        Effect = "Allow"
        Action = [
          "cloudfront:CreateInvalidation"
        ]
        Resource = aws_cloudfront_distribution.frontend.arn
      },
      {
        Sid    = "CloudFrontRead"
        Effect = "Allow"
        Action = [
          "cloudfront:ListDistributions",
          "cloudfront:GetDistribution"
        ]
        Resource = "*"
      }
    ]
  })
}
