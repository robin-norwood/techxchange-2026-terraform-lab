variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
}

variable "registry" {
  description = "Environment registry configuration"
  type = object({
    region                 = string
    discovery_function_arn = string
    register_function_arn  = string
  })
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
  description = "Directory containing Lambda function source code (relative to root module)"
  type        = string
  default     = "lambda-packages"
}

variable "frontend_source_dir" {
  description = "Directory containing frontend application files (relative to root module)"
  type        = string
  default     = "terramino-app"
}
