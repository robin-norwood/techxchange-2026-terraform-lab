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
  alias  = "environment"
  default_tags {
    tags = {
      Project   = var.project_name
      ManagedBy = "Terraform"
    }
  }
}

data "aws_region" "registry" {
  provider = aws.registry
}

data "aws_region" "environment" {
  provider = aws.environment
}

resource "random_string" "environment" {
  length  = 4
  special = false
  upper   = false
}

locals {
  environment_prefix = "${var.project_name}-${data.aws_region.environment.region}-${random_string.environment.result}"

  environment_lambda_functions = {
    game-logic = {
      handler     = "index.handler"
      timeout     = 30
      memory_size = 256
    }
    high-scores = {
      handler     = "index.handler"
      timeout     = 30
      memory_size = 256
    }
    session-management = {
      handler     = "index.handler"
      timeout     = 30
      memory_size = 256
    }
  }

  common_environment_vars = {
    TABLE_NAME = aws_dynamodb_table.scores.name
    REGION     = data.aws_region.environment.region
  }
}
