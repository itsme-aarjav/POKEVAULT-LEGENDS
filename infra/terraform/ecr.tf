# Amazon ECR container repositories with automated image scanning

locals {
  services = [
    "auth",
    "catalog",
    "order",
    "frontend"
  ]
}

resource "aws_ecr_repository" "microservices" {
  for_each             = toset(local.services)
  name                 = "${var.project_name}-${each.value}"
  image_tag_mutability = "MUTABLE" # Set to MUTABLE during initial dev/testing, transition to IMMUTABLE in strict prod

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Service = each.value
  }
}

resource "aws_ecr_lifecycle_policy" "prune_policy" {
  for_each   = toset(local.services)
  repository = aws_ecr_repository.microservices[each.value].name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images older than 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        rulePriority = 2
        description  = "Keep only the latest 10 tagged versions"
        selection = {
          tagStatus     = "any"
          countType     = "imageCountMoreThan"
          countNumber   = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
