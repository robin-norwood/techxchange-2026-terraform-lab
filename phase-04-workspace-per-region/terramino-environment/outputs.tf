output "game_url" {
  description = "URL to access the Terramino game"
  value       = module.terramino_environment.game_url
}

output "discovery_endpoint" {
  description = "Discovery endpoint URL"
  value       = module.terramino_environment.discovery_endpoint
}