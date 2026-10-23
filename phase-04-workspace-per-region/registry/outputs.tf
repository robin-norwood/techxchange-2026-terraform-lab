output "registry" {
  description = "Environment registry configuration for use by environment workspaces"
  value       = module.environment_registry.registry
}