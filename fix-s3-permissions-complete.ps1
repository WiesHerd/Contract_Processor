# Fix S3 Permissions for Both Buckets
# This script applies IAM permissions to allow access to both the custom bucket and Amplify's auto-generated bucket

Write-Host "🔧 Fixing S3 Permissions for Both Buckets..." -ForegroundColor Yellow

# IAM Role name
$ROLE_NAME = "amplify-contractgenerator-production-78963-authRole"

# Policy name
$POLICY_NAME = "S3StorageAccessPolicy"

# Policy document
$POLICY_DOCUMENT = @{
    Version = "2012-10-17"
    Statement = @(
        @{
            Effect = "Allow"
            Action = @(
                "s3:GetObject",
                "s3:PutObject", 
                "s3:DeleteObject",
                "s3:ListBucket"
            )
            Resource = @(
                "arn:aws:s3:::contractengine-storage-wherdzik",
                "arn:aws:s3:::contractengine-storage-wherdzik/*",
                "arn:aws:s3:::contractengine-storage-wherdzik78963-production",
                "arn:aws:s3:::contractengine-storage-wherdzik78963-production/*"
            )
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "📋 Policy Document:" -ForegroundColor Cyan
Write-Host $POLICY_DOCUMENT -ForegroundColor Gray

Write-Host "`n🔧 Creating IAM Policy..." -ForegroundColor Yellow

try {
    # Create the policy
    $policyArn = aws iam create-policy `
        --policy-name $POLICY_NAME `
        --policy-document $POLICY_DOCUMENT `
        --query 'Policy.Arn' `
        --output text
    
    Write-Host "✅ Policy created: $policyArn" -ForegroundColor Green
    
    # Attach policy to role
    Write-Host "🔗 Attaching policy to role: $ROLE_NAME" -ForegroundColor Yellow
    aws iam attach-role-policy --role-name $ROLE_NAME --policy-arn $policyArn
    
    Write-Host "✅ Policy attached successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Error creating/attaching policy: $_" -ForegroundColor Red
    Write-Host "`n📋 Manual Steps:" -ForegroundColor Cyan
    Write-Host "1. Go to AWS IAM Console" -ForegroundColor White
    Write-Host "2. Find role: $ROLE_NAME" -ForegroundColor White
    Write-Host "3. Create policy with the JSON above" -ForegroundColor White
    Write-Host "4. Attach policy to the role" -ForegroundColor White
}

Write-Host "`n🎉 S3 Permissions fix complete!" -ForegroundColor Green 