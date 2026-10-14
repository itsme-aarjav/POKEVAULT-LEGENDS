terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    key            = "foundation/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "pokevault-tflock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "PokéVault Legends"
      Environment = "production"
      ManagedBy   = "Terraform"
    }
  }
}

provider "random" {}
