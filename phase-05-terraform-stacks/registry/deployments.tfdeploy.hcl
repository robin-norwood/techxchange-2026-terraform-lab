identity_token "aws" {
  audience = ["aws.workload.identity"]
}

deployment "registry" {
  inputs = {
    role_arn           = "arn:aws:iam::949008909725:role/hcp-terraform-terramino-role"
    identity_token     = identity_token.aws.jwt
    aws_region         = "us-east-1"
    environment_prefix = "terramino-registry"
  }
}

publish_output "registry_config" {
  description = "Complete registry configuration for consumption by environment stacks"
  value       = deployment.registry.registry_config
}
