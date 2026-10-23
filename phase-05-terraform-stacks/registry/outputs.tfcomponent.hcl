# Registry Stack Outputs
# These outputs expose the registry configuration for consumption by other stacks

output "registry_table_name" {
  type        = string
  description = "Name of the DynamoDB registry table"
  value       = component.registry.registry.table_name
}

output "registry_table_arn" {
  type        = string
  description = "ARN of the DynamoDB registry table"
  value       = component.registry.registry.table_arn
}

output "registry_region" {
  type        = string
  description = "AWS region where the registry is deployed"
  value       = component.registry.registry.region
}

output "discovery_function_arn" {
  type        = string
  description = "ARN of the discovery Lambda function"
  value       = component.registry.registry.discovery_function_arn
}

output "discovery_function_name" {
  type        = string
  description = "Name of the discovery Lambda function"
  value       = component.registry.registry.discovery_function_name
}

output "register_function_arn" {
  type        = string
  description = "ARN of the register environment Lambda function"
  value       = component.registry.registry.register_function_arn
}

output "register_function_name" {
  type        = string
  description = "Name of the register environment Lambda function"
  value       = component.registry.registry.register_function_name
}

output "registry_read_policy_arn" {
  type        = string
  description = "ARN of the IAM policy for reading from the registry"
  value       = component.registry.registry.read_policy_arn
}

output "registry_write_policy_arn" {
  type        = string
  description = "ARN of the IAM policy for writing to the registry"
  value       = component.registry.registry.write_policy_arn
}
