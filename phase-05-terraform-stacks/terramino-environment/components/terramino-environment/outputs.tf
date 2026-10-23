output "game_url" {
  description = "URL to access the Terramino game"
  value       = var.enable_cloudfront ? "https://${aws_cloudfront_distribution.frontend[0].domain_name}" : "http://${aws_s3_bucket.frontend.bucket_regional_domain_name}"
}

output "discovery_endpoint" {
  description = "Discovery endpoint URL"
  value       = "${aws_apigatewayv2_api.api.api_endpoint}/discovery"
}
