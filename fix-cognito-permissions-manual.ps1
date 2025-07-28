# Manual Fix for Cognito Permissions
Write-Host "Manual Fix for Cognito Permissions" -ForegroundColor Yellow
Write-Host "=================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Since AWS CLI credentials don't have IAM permissions, we'll use the AWS Console method." -ForegroundColor Cyan
Write-Host ""
Write-Host "Step 1: Open AWS Console" -ForegroundColor Green
Write-Host "   - Go to: https://console.aws.amazon.com" -ForegroundColor White
Write-Host "   - Sign in with your AWS account" -ForegroundColor White
Write-Host ""
Write-Host "Step 2: Navigate to IAM" -ForegroundColor Green
Write-Host "   - Search for 'IAM' in the services search bar" -ForegroundColor White
Write-Host "   - Click on 'IAM' service" -ForegroundColor White
Write-Host ""
Write-Host "Step 3: Find the Role" -ForegroundColor Green
Write-Host "   - Click 'Roles' in the left sidebar" -ForegroundColor White
Write-Host "   - Search for: amplify-contractgenerator-production-78963-authRole" -ForegroundColor White
Write-Host "   - Click on the role name" -ForegroundColor White
Write-Host ""
Write-Host "Step 4: Create Policy" -ForegroundColor Green
Write-Host "   - Click 'Attach policies'" -ForegroundColor White
Write-Host "   - Click 'Create policy'" -ForegroundColor White
Write-Host "   - Choose 'JSON' tab" -ForegroundColor White
Write-Host "   - Copy and paste this policy:" -ForegroundColor White
Write-Host ""
Write-Host "POLICY TO COPY:" -ForegroundColor Red
Write-Host "===============" -ForegroundColor Red
Write-Host @"
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
        "arn:aws:cognito-idp:us-east-2:430118851518:userpool/us-east-2_IdPO5ZKCR"
      ]
    }
  ]
}
"@ -ForegroundColor Yellow
Write-Host ""
Write-Host "Step 5: Complete Policy Creation" -ForegroundColor Green
Write-Host "   - Click 'Next: Tags' (skip tags)" -ForegroundColor White
Write-Host "   - Click 'Next: Review'" -ForegroundColor White
Write-Host "   - Name: CognitoAdminPolicy" -ForegroundColor White
Write-Host "   - Description: Allow Cognito admin operations for User Management" -ForegroundColor White
Write-Host "   - Click 'Create policy'" -ForegroundColor White
Write-Host ""
Write-Host "Step 6: Attach Policy to Role" -ForegroundColor Green
Write-Host "   - Go back to the role page" -ForegroundColor White
Write-Host "   - Click 'Attach policies'" -ForegroundColor White
Write-Host "   - Search for 'CognitoAdminPolicy'" -ForegroundColor White
Write-Host "   - Check the box next to it" -ForegroundColor White
Write-Host "   - Click 'Attach policy'" -ForegroundColor White
Write-Host ""
Write-Host "Step 7: Test the Fix" -ForegroundColor Green
Write-Host "   - Wait 1-2 minutes for changes to propagate" -ForegroundColor White
Write-Host "   - Refresh your Amplify app" -ForegroundColor White
Write-Host "   - Navigate to User Management page" -ForegroundColor White
Write-Host "   - Check that users load without errors" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open AWS Console..." -ForegroundColor Cyan
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Start-Process "https://console.aws.amazon.com" 