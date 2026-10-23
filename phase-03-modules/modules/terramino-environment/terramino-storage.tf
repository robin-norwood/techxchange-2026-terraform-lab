resource "aws_dynamodb_table" "scores" {
  name         = "${local.environment_prefix}-scores"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "player_id"
  range_key    = "timestamp"

  attribute {
    name = "player_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  attribute {
    name = "region"
    type = "S"
  }

  attribute {
    name = "score"
    type = "N"
  }

  global_secondary_index {
    name = "region-score-index"

    key_schema {
      attribute_name = "region"
      key_type       = "HASH"
    }
    key_schema {
      attribute_name = "score"
      key_type       = "RANGE"
    }
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }
}

resource "aws_s3_bucket" "lambda_packages" {
  bucket_prefix = "${local.environment_prefix}-lambda-"
}

resource "aws_s3_bucket_versioning" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "lambda_packages" {
  bucket = aws_s3_bucket.lambda_packages.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_object" "lambda_packages" {
  for_each = local.lambda_functions

  bucket = aws_s3_bucket.lambda_packages.id
  key    = "${each.key}.zip"
  source = "${local.lambda_source_dir}/${each.key}.zip"
  etag   = filemd5("${local.lambda_source_dir}/${each.key}.zip")
}