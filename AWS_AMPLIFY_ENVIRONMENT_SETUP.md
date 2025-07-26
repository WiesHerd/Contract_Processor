# AWS Amplify Environment Variables Setup Guide

## 🚨 Current Issue
Your app is deployed to AWS Amplify but the environment variables for AWS credentials and S3 configuration are not set, causing:
- "S3 list error: Region is missing"
- Templates not loading
- Mapping screen errors

## 🔧 Solution: Set Environment Variables in AWS Amplify

### Step 1: Access AWS Amplify Console
1. Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
2. Select your app: `d1u3c8k7z1pj0k`
3. Click on your production branch

### Step 2: Configure Environment Variables
1. Go to **App settings** → **Environment variables**
2. Add the following environment variables:

#### Required Environment Variables:
```
VITE_AWS_REGION = us-east-2
VITE_S3_BUCKET = contractgenerator42b439f60de94b878e0fba5843980478963-production
```

#### Optional (for enhanced functionality):
```
VITE_APP_NAME = Contract Generator
VITE_APP_VERSION = 1.0.0
VITE_MAX_FILE_SIZE = 10485760
VITE_MAX_BULK_UPLOAD = 1000
VITE_ENABLE_COMPRESSION = true
VITE_ENABLE_AUDIT_LOGGING = true
VITE_ENABLE_BULK_OPERATIONS = true
```

### Step 3: Redeploy the Application
1. After adding environment variables, go to **Build settings**
2. Click **Redeploy this version** or trigger a new build
3. Wait for the build to complete

### Step 4: Verify the Fix
1. Once deployed, refresh your application
2. Check the browser console - you should no longer see "Region is missing" errors
3. Templates and mapping screens should now work properly

## 🔍 What Changed in the Code

The code has been updated to:
1. **Use Amplify Configuration**: Instead of relying solely on environment variables, the app now uses the `amplifyconfiguration.json` file
2. **Fallback Values**: Added fallback values for region and bucket configuration
3. **Default Credential Chain**: When environment variables aren't available, the AWS SDK will use the default credential chain (IAM roles, etc.)

## 📋 Environment Variables Explanation

- **VITE_AWS_REGION**: AWS region (us-east-2 for your app)
- **VITE_S3_BUCKET**: S3 bucket name from your Amplify configuration
- **VITE_APP_NAME**: Application name for branding
- **VITE_APP_VERSION**: Version tracking
- **VITE_MAX_FILE_SIZE**: Maximum file upload size (10MB)
- **VITE_MAX_BULK_UPLOAD**: Maximum providers per bulk upload (1000)
- **VITE_ENABLE_***: Feature flags for various functionality

## 🚀 Alternative: Use AWS CLI

If you prefer using AWS CLI:

```bash
# Install Amplify CLI if not already installed
npm install -g @aws-amplify/cli

# Configure Amplify
amplify configure

# Set environment variables
amplify env add production
# Follow prompts and add environment variables

# Push changes
amplify push
```

## 🔒 Security Note

- **Do NOT** add `VITE_AWS_ACCESS_KEY_ID` or `VITE_AWS_SECRET_ACCESS_KEY` to Amplify environment variables
- These should only be used for local development
- In production, AWS Amplify uses IAM roles for authentication

## 📞 Support

If you continue to have issues after setting the environment variables:
1. Check the build logs in Amplify Console
2. Verify the environment variables are set correctly
3. Check that the S3 bucket exists and has proper permissions 