output "registry" {
  description = "Environment registry configuration"
  value       = module.environment_registry.registry
}

output "us_east_1_discovery_endpoint" {
  description = "Discovery API endpoint URL"
  value       = module.us_east_1_environment.discovery_endpoint
}

output "us_east_1_game_url" {
  description = "URL to access the Terramino game in US East"
  value       = module.us_east_1_environment.game_url
}
