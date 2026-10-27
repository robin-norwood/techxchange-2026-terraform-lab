resource "random_string" "registry" {
  length  = 4
  special = false
  upper   = false
}

locals {
  registry_prefix = "${var.project_name}-${data.aws_region.registry.name}-${random_string.registry.result}"
}

resource "aws_dynamodb_table" "environment_registry" {
  provider     = aws.registry
  name         = "${local.registry_prefix}-environment-registry"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "region_id"

  attribute {
    name = "region_id"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }
}

resource "aws_iam_policy" "registry_read" {
  provider = aws.registry

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "dynamodb:Query"
        ]
        Resource = aws_dynamodb_table.environment_registry.arn
      }
    ]
  })
}

resource "aws_iam_policy" "registry_write" {
  provider = aws.registry

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = "arn:aws:dynamodb:*:*:table/${aws_dynamodb_table.environment_registry.name}"
      }
    ]
  })
}

resource "aws_s3_object" "discovery" {
  provider = aws.registry

  bucket = aws_s3_bucket.lambda_packages.id
  key    = "discovery.zip"
  source = "${path.module}/lambda-packages/discovery.zip"
  etag   = filemd5("${path.module}/lambda-packages/discovery.zip")
}

resource "aws_lambda_function" "discovery" {
  provider = aws.registry

  s3_bucket         = aws_s3_bucket.lambda_packages.id
  s3_key            = aws_s3_object.discovery.key
  s3_object_version = aws_s3_object.discovery.version_id

  function_name    = "${local.registry_prefix}-discovery"
  role             = aws_iam_role.discovery.arn
  handler          = "index.handler"
  source_code_hash = aws_s3_object.discovery.etag
  runtime          = var.lambda_runtime
  timeout          = 30

  environment {
    variables = {
      REGISTRY_TABLE  = aws_dynamodb_table.environment_registry.name
      REGISTRY_REGION = data.aws_region.registry.name
    }
  }
}

resource "aws_iam_role" "discovery" {
  provider = aws.registry

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "discovery_basic" {
  provider = aws.registry

  role       = aws_iam_role.discovery.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "discovery_registry" {
  provider = aws.registry

  role       = aws_iam_role.discovery.name
  policy_arn = aws_iam_policy.registry_read.arn
}

resource "aws_lambda_permission" "discovery_cross_region" {
  provider = aws.registry

  statement_id  = "AllowAPIGatewayInvokeFromAnyRegion"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.discovery.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_s3_object" "register_environment" {
  provider = aws.registry

  bucket = aws_s3_bucket.lambda_packages.id
  key    = "register-environment.zip"
  source = "${path.module}/lambda-packages/register-environment.zip"
  etag   = filemd5("${path.module}/lambda-packages/register-environment.zip")
}

resource "aws_lambda_function" "register_environment" {
  provider = aws.registry

  s3_bucket         = aws_s3_bucket.lambda_packages.id
  s3_key            = aws_s3_object.register_environment.key
  s3_object_version = aws_s3_object.register_environment.version_id

  function_name    = "${local.registry_prefix}-register-environment"
  role             = aws_iam_role.register_environment.arn
  handler          = "index.handler"
  source_code_hash = aws_s3_object.register_environment.etag
  runtime          = var.lambda_runtime
  timeout          = 30

  environment {
    variables = {
      REGISTRY_TABLE  = aws_dynamodb_table.environment_registry.name
      REGISTRY_REGION = data.aws_region.registry.name
    }
  }

}

resource "aws_iam_role" "register_environment" {
  provider = aws.registry

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "register_environment_basic" {
  provider = aws.registry

  role       = aws_iam_role.register_environment.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "register_environment_registry" {
  provider = aws.registry

  role       = aws_iam_role.register_environment.name
  policy_arn = aws_iam_policy.registry_write.arn
}

resource "aws_lambda_permission" "register_cross_region" {
  provider = aws.registry

  statement_id  = "AllowAPIGatewayInvokeFromAnyRegion"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_environment.function_name
  principal     = "apigateway.amazonaws.com"
}
