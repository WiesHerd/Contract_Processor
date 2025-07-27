# 🔧 Fix S3 CORS Configuration for Amplify Production

## 🚨 **Issue**
Your Amplify app is getting CORS errors when trying to access S3 directly:
- `Access to fetch at 'https://contractengine-storage-wherdzik.s3.us-east-2.amazonaws.com/...' has been blocked by CORS policy`
- `No 'Access-Control-Allow-Origin' header is present on the requested resource`
- Templates and contracts not loading due to browser security restrictions

## 🎯 **Root Cause**
The S3 bucket `contractengine-storage-wherdzik` doesn't have CORS (Cross-Origin Resource Sharing) configuration to allow requests from your Amplify app domain.

## 🔧 **Solution Options**

### **Option 1: PowerShell Script (Recommended)**
```powershell
# Run the provided script
.\fix-s3-cors.ps1
```

### **Option 2: AWS CLI (Manual)**
```bash
# Apply CORS configuration directly
aws s3api put-bucket-cors --bucket contractengine-storage-wherdzik --cors-configuration file://fix-s3-cors.json
```

### **Option 3: AWS Console (Manual)**

#### **Step 1: Go to S3 Console**
1. Open AWS Console
2. Navigate to **S3** service
3. Click on your bucket: `contractengine-storage-wherdzik`

#### **Step 2: Configure CORS**
1. Click on the **Permissions** tab
2. Scroll down to **Cross-origin resource sharing (CORS)**
3. Click **Edit**

#### **Step 3: Add CORS Rules**
Replace the existing configuration with:

```json
[
  {
    "AllowedHeaders": [
      "*"
    ],
    "AllowedMethods": [
      "GET",
      "PUT", 
      "POST",
      "DELETE",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://production.d1u3c8k7z1pj0k.amplifyapp.com",
      "https://main.d1u3c8k7z1pj0k.amplifyapp.com",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-version-id"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

4. Click **Save changes**

## ✅ **Verification Steps**

### **1. Check CORS Configuration**
```bash
aws s3api get-bucket-cors --bucket contractengine-storage-wherdzik
```

### **2. Test Browser Access**
1. Open browser developer tools (F12)
2. Go to your Amplify app: `https://production.d1u3c8k7z1pj0k.amplifyapp.com`
3. Navigate to Templates or Providers page
4. Check console for CORS errors - they should be gone

### **3. Verify S3 Operations**
- Templates should load without errors
- File uploads should work
- Contract generation should function properly

## 🔍 **Expected Results**
- ✅ No more CORS errors in browser console
- ✅ Templates screen loads properly
- ✅ File operations work as expected
- ✅ Direct S3 access functions correctly

## 🚨 **If Still Not Working**

### **Check IAM Permissions**
Ensure your Cognito authenticated users have S3 permissions:
```bash
# Check if the IAM role has S3 permissions
aws iam get-role-policy --role-name amplify-contractgenerator-production-78963-authRole --policy-name AmplifyS3AccessPolicy
```

### **Verify Bucket Name**
Make sure you're using the correct bucket name:
- Production: `contractengine-storage-wherdzik`
- Check `src/amplifyconfiguration.json` for the correct bucket

### **Check Amplify Configuration**
Verify your app is using the correct S3 bucket:
```json
{
  "aws_user_files_s3_bucket": "contractengine-storage-wherdzik",
  "aws_user_files_s3_bucket_region": "us-east-2"
}
```

## 🔄 **Alternative Solution: Use Amplify Storage**

If CORS continues to be an issue, you can modify the app to use Amplify Storage instead of direct S3 access:

```typescript
// In s3Storage.ts, modify listFiles function to use Amplify Storage
import { list } from 'aws-amplify/storage';

export async function listFiles(prefix: string): Promise<string[]> {
  try {
    const result = await list({ prefix });
    return result.items.map(item => item.key).filter(Boolean);
  } catch (error) {
    console.error('Failed to list files:', error);
    throw error;
  }
}
```

## 📝 **CORS Configuration Explained**

- **AllowedHeaders**: `["*"]` allows all headers
- **AllowedMethods**: `["GET", "PUT", "POST", "DELETE", "HEAD"]` allows all necessary HTTP methods
- **AllowedOrigins**: Your Amplify app domains and local development URLs
- **ExposeHeaders**: Headers that the browser can access from the response
- **MaxAgeSeconds**: How long the browser can cache the CORS preflight response

## 🎉 **Success Indicators**
- No CORS errors in browser console
- Templates and contracts load properly
- File uploads and downloads work
- All S3 operations function correctly 