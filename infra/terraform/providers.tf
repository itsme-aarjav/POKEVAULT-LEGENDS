terraform {
  required_version = ">= 1.8.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.50"
    }
  }

  # For local experimentation, state is stored locally.
  # In enterprise multi-developer setups, configure an S3 remote backend:
  # backend "s3" {
  #   bucket         = "pokevault-terraform-state-lock"
  #   key            = "prod/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "pokevault-terraform-locks"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Owner       = "Aarjav Jain"
    }
  }
}
