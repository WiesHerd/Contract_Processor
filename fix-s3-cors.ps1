# Fix S3 CORS Configuration for Amplify App
# This script applies CORS rules to allow browser requests from the Amplify app

Write-Host "🔧 Fixing S3 CORS Configuration..." -ForegroundColor Yellow

# S3 Bucket name
$BUCKET_NAME = "contractengine-storage-wherdzik"

# CORS Configuration
$CORS_CONFIG = @{
    CORSRules = @(
        @{
            AllowedHeaders = @("*")
            AllowedMethods = @("GET", "PUT", "POST", "DELETE", "HEAD")
            AllowedOrigins = @(
                "https://production.d1u3c8k7z1pj0k.amplifyapp.com",
                "https://main.d1u3c8k7z1pj0k.amplifyapp.com", 
                "http://localhost:5173",
                "http://localhost:3000"
            )
            ExposeHeaders = @("ETag", "x-amz-meta-*", "x-amz-version-id")
            MaxAgeSeconds = 3000
        }
    )
}

# Convert to JSON
$CORS_JSON = $CORS_CONFIG | ConvertTo-Json -Depth 10

Write-Host "📋 CORS Configuration:" -ForegroundColor Cyan
Write-Host $CORS_JSON -ForegroundColor Gray

# Apply CORS configuration using AWS CLI
Write-Host "🚀 Applying CORS configuration to bucket: $BUCKET_NAME" -ForegroundColor Green

try {
    # Save CORS config to temporary file
    $CORS_JSON | Out-File -FilePath "temp-cors.json" -Encoding UTF8
    
    # Apply CORS configuration
    aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://temp-cors.json
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CORS configuration applied successfully!" -ForegroundColor Green
        
        # Verify the configuration
        Write-Host "🔍 Verifying CORS configuration..." -ForegroundColor Yellow
        aws s3api get-bucket-cors --bucket $BUCKET_NAME
        
        Write-Host "`n🎉 S3 CORS configuration is now fixed!" -ForegroundColor Green
        Write-Host "📝 The bucket now allows requests from:" -ForegroundColor Cyan
        Write-Host "   - https://production.d1u3c8k7z1pj0k.amplifyapp.com" -ForegroundColor White
        Write-Host "   - https://main.d1u3c8k7z1pj0k.amplifyapp.com" -ForegroundColor White
        Write-Host "   - http://localhost:5173 (development)" -ForegroundColor White
        Write-Host "   - http://localhost:3000 (development)" -ForegroundColor White
        
        Write-Host "`n🔄 Please refresh your Amplify app and try again." -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to apply CORS configuration" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error applying CORS configuration: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    # Clean up temporary file
    if (Test-Path "temp-cors.json") {
        Remove-Item "temp-cors.json"
    }
} 