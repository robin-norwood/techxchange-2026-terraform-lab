terraform {
  required_version = "~> 1.16"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.66.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9.1"
    }
  }

  cloud {
    organization = "ORGANIZATION_NAME"

    workspaces {
      project = "terramino-lab"
      name    = "phase-02-single-workspace"
    }
  }
}
