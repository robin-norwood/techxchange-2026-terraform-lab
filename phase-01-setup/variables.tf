variable "tfc_organization" {
  description = "The name of your HCP Terraform organization"
  type        = string
}

variable "tfc_project_name" {
  description = "The name of the HCP Terraform project"
  type        = string
  default     = "terramino-lab"
}

variable "tfc_role_name" {
  description = "The name of the IAM role for HCP Terraform to assume"
  type        = string
  default     = "hcp-terraform-terramino-role"
}

variable "aws_region" {
  description = "AWS region for the OIDC provider"
  type        = string
  default     = "us-east-1"
}
