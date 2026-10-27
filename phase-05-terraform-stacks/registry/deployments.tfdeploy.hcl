identity_token "aws" {
  audience = ["aws.workload.identity"]
}

deployment "registry" {
  inputs = {
    role_arn           = "HCP_ROLE_ARN"
    identity_token     = identity_token.aws.jwt
    aws_region         = "us-east-1"
    environment_prefix = "terramino-registry"
  }
}

publish_output "registry" {
  description = "Registry configuration for consumption by environment stacks"
  value       = deployment.registry.registry
}
