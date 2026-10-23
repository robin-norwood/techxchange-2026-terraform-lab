variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "terramino"
}

variable "registry_region" {
  description = "Region for the environment deployment (e.g., 'us-east-1', 'eu-west-1', 'ap-south-1')"
  type        = string
  default     = "us-east-1"
}

variable "environment_region" {
  description = "Region for the environment deployment (e.g., 'us-east-1', 'eu-west-1', 'ap-south-1')"
  type        = string
  default     = "us-east-1"
}

variable "enable_cloudfront" {
  description = "Enable CloudFront distribution (takes 5-10 minutes to deploy)"
  type        = bool
  default     = true
}

variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs20.x"
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
