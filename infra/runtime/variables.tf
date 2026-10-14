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

variable "cluster_name" {
  type        = string
  description = "EKS cluster name"
  default     = "pokevault-eks"
}

variable "cluster_version" {
  type        = string
  description = "Kubernetes control plane version"
  default     = "1.31"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the runtime VPC"
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  type        = list(string)
  description = "Target Availability Zones in us-east-1"
  default     = ["us-east-1a", "us-east-1b"]
}
