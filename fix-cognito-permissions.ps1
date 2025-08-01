# Fix Cognito Permissions for Amplify Production
Write-Host "Fixing Cognito permissions for User Management..." -ForegroundColor Yellow

# AWS CLI command to create the policy
$policyJson = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:ListUsers",
        "cognito-idp:AdminListGroupsForUser",
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminDeleteUser",
        "cognito-idp:AdminSetUserPassword",
        "cognito-idp:AdminAddUserToGroup",
        "cognito-idp:AdminRemoveUserFromGroup",
        "cognito-idp:ListGroups",
        "cognito-idp:CreateGroup",
        "cognito-idp:DeleteGroup"
      ],
      "Resource": [
        "arn:aws:cognito-idp:us-east-2:430118851518:userpool/us-east-2_ldPO5ZKCR"
      ]
    }
  ]
}
"@

# Create the policy
Write-Host "Creating CognitoAdminPolicy..." -ForegroundColor Blue
aws iam create-policy --policy-name CognitoAdminPolicy --policy-document "$policyJson" --description "Allow Cognito admin operations for User Management"

# Attach policy to the role
Write-Host "Attaching policy to role..." -ForegroundColor Blue
aws iam attach-role-policy --role-name amplify-contractgenerator-production-78963-authRole --policy-arn arn:aws:iam::430118851518:policy/CognitoAdminPolicy

Write-Host "Cognito permissions fixed! Wait 1-2 minutes for changes to propagate." -ForegroundColor Green
Write-Host "Refresh your app and try the User Management page again." -ForegroundColor Cyan 