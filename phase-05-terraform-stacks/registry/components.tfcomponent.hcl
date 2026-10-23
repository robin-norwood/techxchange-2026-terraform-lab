# Registry Stack Components Configuration
# This stack manages the centralized environment registry that tracks all Terramino deployments

# Registry Component - Global deployment
component "registry" {
  source = "./components/environment-registry"

  providers = {
    aws    = provider.aws.registry
    random = provider.random.this
  }

  inputs = {
    aws_region         = var.aws_region
    environment_prefix = var.environment_prefix
    lambda_runtime     = "nodejs22.x"
  }
}
