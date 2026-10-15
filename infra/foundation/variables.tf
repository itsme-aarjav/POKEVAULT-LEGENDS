variable "aws_region" {
  type        = string
  description = "AWS deployment region"
  default     = "us-east-1"
}

variable "domain_name" {
  type        = string
  description = "Apex domain name for the application"
  default     = "aarjav.site"
}

variable "github_repo" {
  type        = string
  description = "GitHub repository (owner/name) for CI/CD OIDC trust"
  default     = "itsme-aarjav/POKEVAULT-LEGENDS"
}

variable "budget_alert_email" {
  type        = string
  description = "Recipient email address for AWS budget alerts"
  default     = "admin@aarjav.site"
}

variable "wait_for_acm_validation" {
  type        = bool
  description = "Whether to block for DNS validation of the ACM certificate"
  default     = true
}
