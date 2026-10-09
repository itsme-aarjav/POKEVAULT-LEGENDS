# AWS IAM OIDC federation for GitHub Actions (no static keys)

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# Check if OIDC provider for GitHub already exists or create it
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd"
  ]

  tags = {
    Name = "github-actions-oidc"
  }
}

# Trust Policy: Strictly scoped to the user's specific GitHub repo
data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [
        "repo:${var.github_org}/*",
        "repo:${var.github_org}@*/*"
      ]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${var.project_name}-github-actions-ecr-role"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json

  tags = {
    Name = "GitHubActionsECRPushRole"
  }
}

# Least-Privilege Policy: Permissions strictly for ECR authentication and pushing
data "aws_iam_policy_document" "ecr_push_policy_doc" {
  statement {
    sid       = "ECRAuthToken"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "ECRPushPullImages"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:PutImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload"
    ]
    resources = [for repo in aws_ecr_repository.microservices : repo.arn]
  }
}

resource "aws_iam_policy" "ecr_push_policy" {
  name        = "${var.project_name}-ecr-push-policy"
  description = "Allows GitHub Actions CI runner to push images to PokéVault ECR repositories"
  policy      = data.aws_iam_policy_document.ecr_push_policy_doc.json
}

resource "aws_iam_role_policy_attachment" "attach_ecr_push" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.ecr_push_policy.arn
}
