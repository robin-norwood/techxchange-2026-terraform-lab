output "game_url" {
  type        = string
  description = "URL to access the Terramino game"
  value       = component.terramino_environment.game_url
}

output "discovery_endpoint" {
  type        = string
  description = "Discovery service endpoint URL"
  value       = component.terramino_environment.discovery_endpoint
}
