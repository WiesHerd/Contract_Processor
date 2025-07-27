# Fix S3 Permissions for Amplify Production Environment
# This script creates and attaches an IAM policy to allow S3 access

Write-Host "🔧 Fixing S3 Permissions for Amplify Production..." -ForegroundColor Yellow

# Policy name and role name
$POLICY_NAME = "AmplifyS3AccessPolicy"
$ROLE_NAME = "amplify-contractgenerator-production-78963-authRole"
$BUCKET_NAME = "contractgenerator42b439f60de94b878e0fba5843980478963-production"

Write-Host "📋 Creating IAM policy: $POLICY_NAME" -ForegroundColor Cyan

# Create the policy document
$POLICY_DOCUMENT = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject", 
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ]
    }
  ]
}
"@

# Save policy document to file
$POLICY_DOCUMENT | Out-File -FilePath "temp-policy.json" -Encoding UTF8

try {
    # Create the policy
    Write-Host "📝 Creating IAM policy..." -ForegroundColor Green
    aws iam create-policy --policy-name $POLICY_NAME --policy-document file://temp-policy.json --description "Allow S3 access for Amplify app"
    
    # Get the policy ARN
    $POLICY_ARN = aws iam list-policies --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text
    
    Write-Host "🔗 Attaching policy to role: $ROLE_NAME" -ForegroundColor Green
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn $POLICY_ARN
    
    Write-Host "✅ S3 permissions fixed successfully!" -ForegroundColor Green
    Write-Host "🔄 Please wait 1-2 minutes for changes to propagate..." -ForegroundColor Yellow
    Write-Host "🌐 Then refresh your app to test the fix" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host "💡 You may need to run this manually in AWS Console:" -ForegroundColor Yellow
    Write-Host "   1. Go to IAM Console" -ForegroundColor White
    Write-Host "   2. Find role: $ROLE_NAME" -ForegroundColor White
    Write-Host "   3. Attach policy with S3 permissions" -ForegroundColor White
} finally {
    # Clean up temp file
    if (Test-Path "temp-policy.json") {
        Remove-Item "temp-policy.json"
    }
} 