variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "terramino"
}

variable "organization_name" {
  description = "HCP Terraform organization name"
  type        = string
}

variable "registry_workspace_name" {
  description = "Name of the registry workspace to read remote state from"
  type        = string
  default     = "phase-04-registry"
}

variable "environment_region" {
  description = "AWS region for environment deployment"
  type        = string
}

variable "enable_cloudfront" {
  description = "Enable CloudFront distribution (takes 5-10 minutes to deploy)"
  type        = bool
  default     = true
}

variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs22.x"
}

variable "lambda_source_dir" {
  description = "Directory containing Lambda function source code"
  type        = string
  default     = "lambda-packages"
}

variable "frontend_source_dir" {
  description = "Directory containing frontend application files"
  type        = string
  default     = "terramino-app"
}