# Check User Status in Cognito
# This script helps verify if a user was created and their current status

Write-Host "🔍 Checking user status in Cognito..." -ForegroundColor Green

# User details
$USERNAME = "herdzik@att.net"
$USER_POOL_ID = "us-east-2_ldPO5ZKCR"

Write-Host "Username: $USERNAME" -ForegroundColor Yellow
Write-Host "User Pool ID: $USER_POOL_ID" -ForegroundColor Yellow
Write-Host ""

# Check if AWS CLI is available
try {
    $awsVersion = aws --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "AWS CLI not found"
    }
    Write-Host "✅ AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install AWS CLI first." -ForegroundColor Red
    Write-Host "Download from: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if user exists and get status
Write-Host "📋 Checking user status..." -ForegroundColor Cyan
try {
    $userInfo = aws cognito-idp admin-get-user --username $USERNAME --user-pool-id $USER_POOL_ID 2>$null | ConvertFrom-Json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ User found!" -ForegroundColor Green
        Write-Host "Username: $($userInfo.Username)" -ForegroundColor White
        Write-Host "Status: $($userInfo.UserStatus)" -ForegroundColor White
        Write-Host "Enabled: $($userInfo.Enabled)" -ForegroundColor White
        
        # Check email attribute
        $emailAttr = $userInfo.UserAttributes | Where-Object { $_.Name -eq "email" }
        if ($emailAttr) {
            Write-Host "Email: $($emailAttr.Value)" -ForegroundColor White
        }
        
        # Interpret status
        switch ($userInfo.UserStatus) {
            "FORCE_CHANGE_PASSWORD" {
                Write-Host "📧 Status: User created, email sent, waiting for first login" -ForegroundColor Green
                Write-Host "   The user should have received an email with temporary password" -ForegroundColor Yellow
            }
            "CONFIRMED" {
                Write-Host "✅ Status: User has confirmed their account" -ForegroundColor Green
                Write-Host "   User can sign in normally" -ForegroundColor Yellow
            }
            "UNCONFIRMED" {
                Write-Host "⚠️ Status: User created but not confirmed" -ForegroundColor Yellow
                Write-Host "   Email may not have been sent or delivered" -ForegroundColor Red
            }
            default {
                Write-Host "❓ Status: $($userInfo.UserStatus)" -ForegroundColor Yellow
            }
        }
        
    } else {
        Write-Host "❌ User not found or error occurred" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Error checking user: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "🔧 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check spam/junk folder for email" -ForegroundColor White
Write-Host "2. Verify SES configuration in AWS Console" -ForegroundColor White
Write-Host "3. Check CloudWatch logs for delivery attempts" -ForegroundColor White
Write-Host "4. Try creating user with a different email - Gmail, Outlook" -ForegroundColor White

Write-Host ""
Write-Host "🌐 Cognito Console:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cognito/v2/home?region=us-east-2#/pool/$USER_POOL_ID/users" -ForegroundColor Blue

Write-Host ""
Write-Host "📧 SES Console:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/ses/" -ForegroundColor Blue