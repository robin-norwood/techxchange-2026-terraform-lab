identity_token "aws" {
  audience = ["aws.workload.identity"]
}

upstream_input "registry_stack" {
  type   = "stack"
  source = "app.terraform.io/ORGANIZATION_NAME/terramino-lab/registry"
}

deployment "us_east_1" {
  inputs = {
    role_arn            = "HCP_ROLE_ARN"
    identity_token      = identity_token.aws.jwt
    aws_region          = "us-east-1"
    project_name        = var.project_name
    registry            = upstream_input.registry_stack.registry_config
    enable_cloudfront   = var.enable_cloudfront
    lambda_runtime      = var.lambda_runtime
    lambda_source_dir   = var.lambda_source_dir
    frontend_source_dir = var.frontend_source_dir
  }
}

deployment "eu_west_1" {
  inputs = {
    role_arn            = "HCP_ROLE_ARN"
    identity_token      = identity_token.aws.jwt
    aws_region          = "eu-west-1"
    project_name        = var.project_name
    registry            = upstream_input.registry_stack.registry_config
    enable_cloudfront   = var.enable_cloudfront
    lambda_runtime      = var.lambda_runtime
    lambda_source_dir   = var.lambda_source_dir
    frontend_source_dir = var.frontend_source_dir
  }
}
