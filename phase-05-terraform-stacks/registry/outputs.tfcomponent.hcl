output "registry" {
  description = "Environment registry configuration"
  type = object({
    region                 = string
    discovery_function_arn = string
    register_function_arn  = string
  })
  value = {
    region                 = component.registry.registry.region
    discovery_function_arn = component.registry.registry.discovery_function_arn
    register_function_arn  = component.registry.registry.register_function_arn
  }
}
