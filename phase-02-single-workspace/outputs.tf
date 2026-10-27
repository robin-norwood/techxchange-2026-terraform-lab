output "game_url" {
  description = "URL to access the Terramino game"
  value       = var.enable_cloudfront ? "https://${aws_cloudfront_distribution.frontend[0].domain_name}" : try("http://${aws_s3_bucket_website_configuration.frontend[0].website_endpoint}", "S3 website not configured")
}

output "registry" {
  description = "Environment registry configuration"
  value = {
    region                 = data.aws_region.registry.region
    discovery_function_arn = aws_lambda_function.discovery.arn
    register_function_arn  = aws_lambda_function.register_environment.arn
  }
}

output "discovery_endpoint" {
  description = "Discovery API endpoint URL for testing multi-region setup"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/discovery"
}
