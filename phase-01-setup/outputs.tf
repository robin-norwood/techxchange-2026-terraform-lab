# Outputs for Phase 0: Workstation Setup

output "oidc_provider_arn" {
  description = "ARN of the OIDC provider for HCP Terraform"
  value       = aws_iam_openid_connect_provider.tfc_provider.arn
}

output "tfc_role_arn" {
  description = "ARN of the IAM role for HCP Terraform to assume"
  value       = aws_iam_role.tfc_role.arn
}

output "tfc_role_name" {
  description = "Name of the IAM role for HCP Terraform"
  value       = aws_iam_role.tfc_role.name
}

output "project_id" {
  description = "ID of the terramino-lab project"
  value       = tfe_project.terramino_lab.id
}

output "project_name" {
  description = "Name of the terramino-lab project"
  value       = tfe_project.terramino_lab.name
}

output "variable_set_id" {
  description = "ID of the AWS Dynamic Credentials variable set"
  value       = tfe_variable_set.aws_dynamic_credentials.id
}
