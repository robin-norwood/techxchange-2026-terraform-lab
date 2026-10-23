provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
      Component = "registry"
    }
  }
}

module "environment_registry" {
  source = "./modules/environment-registry"

  project_name   = var.project_name
  lambda_runtime = var.lambda_runtime
}
