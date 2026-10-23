data "aws_region" "registry" {}

resource "random_string" "registry_suffix" {
  length  = 4
  special = false
  upper   = false
}

resource "aws_dynamodb_table" "environment_registry" {
  name         = "${var.project_name}-environment-registry-${random_string.registry_suffix.result}"
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
  name        = "${var.project_name}-${replace(data.aws_region.registry.region, "-", "")}-registry-read-${random_string.registry_suffix.result}"
  description = "Allow reading from environment registry"

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
  name        = "${var.project_name}-${replace(data.aws_region.registry.region, "-", "")}-registry-write-${random_string.registry_suffix.result}"
  description = "Allow writing to environment registry"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:UpdateItem"
        ]
        Resource = aws_dynamodb_table.environment_registry.arn
      }
    ]
  })
}

# S3 bucket for Lambda packages (shared across registry functions)
resource "random_id" "lambda_bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "lambda_packages" {
  bucket = "${var.project_name}-registry-lambda-${random_id.lambda_bucket_suffix.hex}"
}

resource "aws_s3_bucket_versioning" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Upload discovery Lambda package to S3
resource "aws_s3_object" "discovery" {
  bucket = aws_s3_bucket.lambda_packages.id
  key    = "discovery.zip"
  source = "${path.root}/lambda-packages/discovery.zip"
  etag   = filemd5("${path.root}/lambda-packages/discovery.zip")
}

resource "aws_lambda_function" "discovery" {
  s3_bucket         = aws_s3_bucket.lambda_packages.id
  s3_key            = aws_s3_object.discovery.key
  s3_object_version = aws_s3_object.discovery.version_id

  function_name    = "${var.project_name}-${replace(data.aws_region.registry.region, "-", "")}-discovery"
  role             = aws_iam_role.discovery.arn
  handler          = "index.handler"
  source_code_hash = aws_s3_object.discovery.etag
  runtime          = var.lambda_runtime
  timeout          = 30

  environment {
    variables = {
      REGISTRY_TABLE  = aws_dynamodb_table.environment_registry.name
      REGISTRY_REGION = data.aws_region.registry.region
    }
  }
}

# Allow API Gateway from any region to invoke discovery Lambda
resource "aws_lambda_permission" "discovery_cross_region" {
  statement_id  = "AllowAPIGatewayInvokeFromAnyRegion"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.discovery.function_name
  principal     = "apigateway.amazonaws.com"
  # No source_arn restriction allows invocation from any API Gateway
}

resource "aws_iam_role" "discovery" {
  name = "${var.project_name}-${replace(data.aws_region.registry.region, "-", "")}-discovery-role"

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
  role       = aws_iam_role.discovery.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "discovery_registry" {
  role       = aws_iam_role.discovery.name
  policy_arn = aws_iam_policy.registry_read.arn
}

# Upload register-environment Lambda package to S3
resource "aws_s3_object" "register_environment" {
  bucket = aws_s3_bucket.lambda_packages.id
  key    = "register-environment.zip"
  source = "${path.root}/lambda-packages/register-environment.zip"
  etag   = filemd5("${path.root}/lambda-packages/register-environment.zip")
}

resource "aws_lambda_function" "register_environment" {
  s3_bucket         = aws_s3_bucket.lambda_packages.id
  s3_key            = aws_s3_object.register_environment.key
  s3_object_version = aws_s3_object.register_environment.version_id

  function_name    = "${var.project_name}-${replace(data.aws_region.registry.region, "-", "")}-register-environment"
  role             = aws_iam_role.register_environment.arn
  handler          = "index.handler"
  source_code_hash = aws_s3_object.register_environment.etag
  runtime          = var.lambda_runtime
  timeout          = 30

  environment {
    variables = {
      REGISTRY_TABLE  = aws_dynamodb_table.environment_registry.name
      REGISTRY_REGION = data.aws_region.registry.region
    }
  }
}

resource "aws_lambda_permission" "register_cross_region" {
  statement_id  = "AllowAPIGatewayInvokeFromAnyRegion"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_environment.function_name
  principal     = "apigateway.amazonaws.com"
}

resource "aws_iam_role" "register_environment" {
  name = "${var.project_name}-${replace(data.aws_region.registry.region, "-", "")}-register-environment-role"

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
  role       = aws_iam_role.register_environment.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "register_environment_registry" {
  role       = aws_iam_role.register_environment.name
  policy_arn = aws_iam_policy.registry_write.arn
}