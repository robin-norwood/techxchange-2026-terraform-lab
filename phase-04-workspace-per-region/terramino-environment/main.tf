provider "aws" {
  region = var.environment_region

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}

data "terraform_remote_state" "registry" {
  backend = "remote"

  config = {
    organization = var.organization_name
    workspaces = {
      name = var.registry_workspace_name
    }
  }
}

module "terramino_environment" {
  source = "./modules/terramino-environment"

  project_name        = var.project_name
  registry            = data.terraform_remote_state.registry.outputs.registry
  enable_cloudfront   = var.enable_cloudfront
  lambda_runtime      = var.lambda_runtime
  lambda_source_dir   = var.lambda_source_dir
  frontend_source_dir = var.frontend_source_dir
}