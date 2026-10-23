variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "terramino"
}

variable "lambda_runtime" {
  description = "Lambda runtime version"
  type        = string
  default     = "nodejs22.x"
}
