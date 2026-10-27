output "registry" {
  description = "Environment registry configuration"
  type = object({
    region                  = string
    discovery_function_arn  = string
    register_function_arn   = string
  })
  value = component.registry.registry
}
