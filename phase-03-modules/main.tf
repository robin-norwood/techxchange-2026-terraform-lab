provider "aws" {
  region = "us-east-1"
  alias  = "registry"

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  alias  = "us_east_1_environment"

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}

module "environment_registry" {
  source = "./modules/environment-registry"

  providers = {
    aws = aws.registry
  }

  project_name   = var.project_name
  lambda_runtime = var.lambda_runtime
}

module "us_east_1_environment" {
  source = "./modules/terramino-environment"

  providers = {
    aws = aws.us_east_1_environment
  }

  project_name        = var.project_name
  registry            = module.environment_registry.registry
  enable_cloudfront   = var.enable_cloudfront
  lambda_runtime      = var.lambda_runtime
  lambda_source_dir   = var.lambda_source_dir
  frontend_source_dir = var.frontend_source_dir
}
