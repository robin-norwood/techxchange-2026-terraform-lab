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
    project_name        = "terramino"
    registry            = upstream_input.registry_stack.registry
    enable_cloudfront   = true
    lambda_runtime      = "nodejs22.x"
    lambda_source_dir   = "lambda-packages"
    frontend_source_dir = "terramino-app"
  }
}

deployment "eu_west_1" {
  inputs = {
    role_arn            = "HCP_ROLE_ARN"
    identity_token      = identity_token.aws.jwt
    aws_region          = "eu-west-1"
    project_name        = "terramino"
    registry            = upstream_input.registry_stack.registry
    enable_cloudfront   = true
    lambda_runtime      = "nodejs22.x"
    lambda_source_dir   = "lambda-packages"
    frontend_source_dir = "terramino-app"
  }
}
