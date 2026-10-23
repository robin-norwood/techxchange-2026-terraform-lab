# Terramino Environment Stack Configuration
# This stack manages regional Terramino deployments and consumes the registry stack outputs

required_providers {
  aws = {
    source  = "hashicorp/aws"
    version = "~> 6.66.0"
  }
  random = {
    source  = "hashicorp/random"
    version = "~> 3.9.0"
  }
}

# Data source to consume registry stack outputs
# This allows us to reference the registry configuration from the registry stack
data "tfe_stack" "registry" {
  name = "registry"
}

# Provider configuration for US East region
provider "aws" "us_east_1" {
  config {
    region = "us-east-1"
    assume_role_with_web_identity {
      role_arn           = var.role_arn
      web_identity_token = var.identity_token
    }
  }
}

# Provider configuration for EU West region
provider "aws" "eu_west_1" {
  config {
    region = "eu-west-1"
    assume_role_with_web_identity {
      role_arn           = var.role_arn
      web_identity_token = var.identity_token
    }
  }
}

provider "random" "this" {
  config {}
}

# US East Environment Component
component "us_east" {
  source = "./components/terramino-environment"

  providers = {
    aws    = provider.aws.us_east_1
    random = provider.random.this
  }

  inputs = {
    aws_region        = var.aws_region
    environment_name  = var.environment_name
    region_name       = var.region_name
    registry          = data.tfe_stack.registry.outputs.registry_config
    enable_cloudfront = var.enable_cloudfront
  }
}
