output "registry" {
  description = "Environment registry configuration"
  value = {
    region                 = data.aws_region.registry.region
    discovery_function_arn = aws_lambda_function.discovery.arn
    register_function_arn  = aws_lambda_function.register_environment.arn
  }
}
