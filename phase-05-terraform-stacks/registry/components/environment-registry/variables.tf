variable "aws_region" {
  description = "AWS region for the registry deployment"
  type        = string
}

variable "environment_prefix" {
  description = "Prefix for all resource names"
  type        = string
}

variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs22.x"
}