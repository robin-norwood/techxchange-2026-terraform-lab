# Registry Stack Variables

variable "identity_token" {
  description = "Identity token for authentication"
  type        = string
  ephemeral   = true
}

variable "role_arn" {
  description = "ARN of role associated with identity token"
  type        = string
}

variable "aws_region" {
  description = "AWS region for the registry deployment"
  type        = string
  default     = "us-east-1"
}

variable "environment_prefix" {
  type        = string
  description = "Prefix for all resource names"
  default     = "terramino"
}
