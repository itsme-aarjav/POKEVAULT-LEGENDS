variable "aws_region" {
  description = "The primary AWS Region for infrastructure deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Base project name used in resource prefixing and tagging"
  type        = string
  default     = "pokevault"
}

variable "environment" {
  description = "Deployment environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block allocated for the PokéVault VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "github_org" {
  description = "GitHub username or organization owning the source code repositories"
  type        = string
  default     = "itsme-aarjav"
}

variable "github_repo" {
  description = "GitHub repository name used for OIDC federation trust policy scoping"
  type        = string
  default     = "POKEVAULT-LEGENDS"
}

variable "alert_email" {
  description = "Email address for FinOps AWS Budget alerts and threshold warnings"
  type        = string
  default     = "aarjav24122002@gmail.com"
}
