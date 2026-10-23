resource "aws_apigatewayv2_api" "api" {
  name          = "${local.environment_prefix}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers = ["content-type", "x-amz-date", "authorization", "x-api-key", "x-amz-security-token"]
    max_age       = 300
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

resource "aws_apigatewayv2_integration" "lambda" {
  for_each = local.lambda_functions

  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.functions[each.key].invoke_arn

  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "routes" {
  for_each = {
    "GET /health"     = "high-scores"
    "GET /scores"     = "high-scores"
    "POST /scores"    = "high-scores"
    "POST /game"      = "game-logic"
    "GET /session"    = "session-management"
    "POST /session"   = "session-management"
    "PUT /session"    = "session-management"
    "DELETE /session" = "session-management"
  }

  api_id    = aws_apigatewayv2_api.api.id
  route_key = each.key
  target    = "integrations/${aws_apigatewayv2_integration.lambda[each.value].id}"
}

resource "aws_lambda_permission" "api_gateway" {
  for_each = local.lambda_functions

  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.functions[each.key].function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_apigatewayv2_integration" "discovery" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.registry.discovery_function_arn

  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "discovery" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /discovery"
  target    = "integrations/${aws_apigatewayv2_integration.discovery.id}"
}

resource "aws_apigatewayv2_integration" "register" {
  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = var.registry.register_function_arn

  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "register" {
  api_id    = aws_apigatewayv2_api.api.id
  route_key = "POST /register"
  target    = "integrations/${aws_apigatewayv2_integration.register.id}"
}
