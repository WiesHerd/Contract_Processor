# Check Cognito Email Configuration
Write-Host "🔍 Checking Cognito email configuration..." -ForegroundColor Green

$USER_POOL_ID = "us-east-2_ldPO5ZKCR"

Write-Host ""
Write-Host "📧 To check email configuration:" -ForegroundColor Cyan
Write-Host "1. Go to AWS Cognito Console:" -ForegroundColor White
Write-Host "   https://console.aws.amazon.com/cognito/v2/home?region=us-east-2#/pool/$USER_POOL_ID" -ForegroundColor Blue
Write-Host ""
Write-Host "2. Check these settings:" -ForegroundColor Cyan
Write-Host "   - Go to 'Signing experience' → 'App integration'" -ForegroundColor White
Write-Host "   - Look for 'Message templates'" -ForegroundColor White
Write-Host "   - Check if 'Welcome message' is configured" -ForegroundColor White
Write-Host ""
Write-Host "3. Check SES Configuration:" -ForegroundColor Cyan
Write-Host "   - Go to: https://console.aws.amazon.com/ses/" -ForegroundColor Blue
Write-Host "   - Check 'Sending statistics'" -ForegroundColor White
Write-Host "   - Look for bounces or delivery failures" -ForegroundColor White
Write-Host ""
Write-Host "4. Check CloudWatch Logs:" -ForegroundColor Cyan
Write-Host "   - Go to: https://console.aws.amazon.com/cloudwatch/" -ForegroundColor Blue
Write-Host "   - Look for Cognito or SES logs" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Common Issues:" -ForegroundColor Yellow
Write-Host "- SES not configured for your region" -ForegroundColor White
Write-Host "- Daily sending limits exceeded" -ForegroundColor White
Write-Host "- Email templates not configured" -ForegroundColor White
Write-Host "- Domain blocking AWS emails" -ForegroundColor White 