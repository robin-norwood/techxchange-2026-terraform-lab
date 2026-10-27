output "registry" {
  description = "Environment registry configuration"
  value = {
    table_name              = aws_dynamodb_table.environment_registry.name
    table_arn               = aws_dynamodb_table.environment_registry.arn
    region                  = data.aws_region.registry.region
    discovery_function_arn  = aws_lambda_function.discovery.arn
    discovery_function_name = aws_lambda_function.discovery.function_name
    register_function_arn   = aws_lambda_function.register_environment.arn
    register_function_name  = aws_lambda_function.register_environment.function_name
    read_policy_arn         = aws_iam_policy.registry_read.arn
    write_policy_arn        = aws_iam_policy.registry_write.arn
  }
}
