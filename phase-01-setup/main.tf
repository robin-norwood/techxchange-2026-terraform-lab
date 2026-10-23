provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "terramino-lab"
      ManagedBy   = "Terraform"
      Environment = "shared"
    }
  }
}

provider "tfe" {}

data "tls_certificate" "tfc_certificate" {
  url = "https://app.terraform.io"
}

resource "aws_iam_openid_connect_provider" "tfc_provider" {
  url             = data.tls_certificate.tfc_certificate.url
  client_id_list  = ["aws.workload.identity"]
  thumbprint_list = [data.tls_certificate.tfc_certificate.certificates[0].sha1_fingerprint]

  tags = {
    Name        = "hcp-terraform-oidc-provider"
    ManagedBy   = "Terraform"
    Project     = "terramino"
    Environment = "shared"
  }
}

data "aws_iam_policy_document" "tfc_trust_policy" {
  statement {
    effect = "Allow"

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.tfc_provider.arn]
    }

    actions = ["sts:AssumeRoleWithWebIdentity"]

    condition {
      test     = "StringEquals"
      variable = "app.terraform.io:aud"
      values   = ["aws.workload.identity"]
    }

    condition {
      test     = "StringLike"
      variable = "app.terraform.io:sub"
      values   = ["organization:${var.tfc_organization}:project:${var.tfc_project_name}:*"]
    }
  }
}

resource "aws_iam_role" "tfc_role" {
  name               = var.tfc_role_name
  assume_role_policy = data.aws_iam_policy_document.tfc_trust_policy.json

  tags = {
    Name        = var.tfc_role_name
    ManagedBy   = "Terraform"
    Project     = "terramino"
    Environment = "shared"
  }
}

resource "aws_iam_role_policy_attachment" "tfc_role_policy" {
  role       = aws_iam_role.tfc_role.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

resource "tfe_project" "terramino_lab" {
  organization = var.tfc_organization
  name         = var.tfc_project_name
}

resource "tfe_variable_set" "aws_dynamic_credentials" {
  name         = "AWS Dynamic Credentials"
  description  = "AWS dynamic provider credentials configuration for all workspaces in the terramino-lab project"
  organization = var.tfc_organization
}

resource "tfe_project_variable_set" "aws_dynamic_credentials" {
  project_id      = tfe_project.terramino_lab.id
  variable_set_id = tfe_variable_set.aws_dynamic_credentials.id
}

resource "tfe_variable" "aws_provider_auth" {
  variable_set_id = tfe_variable_set.aws_dynamic_credentials.id
  key             = "TFC_AWS_PROVIDER_AUTH"
  value_wo        = "true"
  category        = "env"
  description     = "Enable dynamic provider credentials for AWS"
}

resource "tfe_variable" "aws_role_arn" {
  variable_set_id = tfe_variable_set.aws_dynamic_credentials.id
  key             = "TFC_AWS_RUN_ROLE_ARN"
  value_wo           = aws_iam_role.tfc_role.arn
  category        = "env"
  description     = "ARN of the IAM role to assume for AWS operations"
}
