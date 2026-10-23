# Registry Stack Provider Configuration

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

# Provider configuration for the registry region
provider "aws" "registry" {
  config {
    region = var.aws_region
    assume_role_with_web_identity {
      role_arn           = var.role_arn
      web_identity_token = var.identity_token
    }
  }
}

provider "random" "this" {
  config {}
}
