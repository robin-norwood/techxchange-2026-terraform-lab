component "terramino_environment" {
  source = "./components/terramino-environment"

  providers = {
    aws    = provider.aws.this
    random = provider.random.this
  }

  inputs = {
    project_name      = var.project_name
    registry          = var.registry
    enable_cloudfront = var.enable_cloudfront
    lambda_runtime    = var.lambda_runtime
    lambda_source_dir = var.lambda_source_dir
    frontend_source_dir = var.frontend_source_dir
  }
}
