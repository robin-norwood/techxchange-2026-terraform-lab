# Terramino Environment Stack Variables

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
  type        = string
  description = "AWS region for the deployment"
}

variable "project_name" {
  type        = string
  description = "Project name used for resource naming"
  default     = "terramino"
}

variable "registry" {
  type = object({
    region                 = string
    discovery_function_arn = string
    register_function_arn  = string
  })
  description = "Registry configuration from the registry stack"
}

variable "enable_cloudfront" {
  type        = bool
  description = "Whether to enable CloudFront distributions for faster testing (disable for faster deploys)"
  default     = true
}

variable "lambda_runtime" {
  type        = string
  description = "Lambda runtime version"
  default     = "nodejs22.x"
}

variable "lambda_source_dir" {
  type        = string
  description = "Directory containing Lambda function source code (relative to root module)"
  default     = "lambda-packages"
}

variable "frontend_source_dir" {
  type        = string
  description = "Directory containing frontend application files (relative to root module)"
  default     = "terramino-app"
}
