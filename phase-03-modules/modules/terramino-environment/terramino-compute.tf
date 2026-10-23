resource "aws_iam_role" "lambda_execution" {
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  role = aws_iam_role.lambda_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.scores.arn,
          "${aws_dynamodb_table.scores.arn}/index/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_lambda_function" "functions" {
  for_each = local.lambda_functions

  s3_bucket         = aws_s3_bucket.lambda_packages.id
  s3_key            = aws_s3_object.lambda_packages[each.key].key
  s3_object_version = aws_s3_object.lambda_packages[each.key].version_id

  function_name    = "${local.environment_prefix}-${each.key}"
  role             = aws_iam_role.lambda_execution.arn
  handler          = each.value.handler
  source_code_hash = aws_s3_object.lambda_packages[each.key].etag
  runtime          = var.lambda_runtime
  timeout          = each.value.timeout
  memory_size      = each.value.memory_size

  environment {
    variables = local.common_environment_vars
  }
}

resource "aws_cloudwatch_log_group" "lambda_logs" {
  for_each = local.lambda_functions

  name              = "/aws/lambda/${aws_lambda_function.functions[each.key].function_name}"
  retention_in_days = 7
}

data "aws_region" "current" {}

resource "random_string" "environment" {
  length  = 4
  special = false
  upper   = false
}

locals {
  environment_prefix = "${var.project_name}-${data.aws_region.current.region}-${random_string.environment.result}"

  lambda_functions = {
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
    REGION     = data.aws_region.current.region
  }

  lambda_source_dir   = "${path.root}/${var.lambda_source_dir}"
  frontend_source_dir = "${path.root}/${var.frontend_source_dir}"
}