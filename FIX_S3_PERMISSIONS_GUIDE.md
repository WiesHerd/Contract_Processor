# 🔧 Fix S3 Permissions for Amplify Production

## 🚨 **Issue**
The Cognito authenticated users don't have S3 permissions, causing:
- `403 Forbidden` errors on S3 operations
- `AccessDenied: User is not authorized to perform: s3:ListBucket`
- Templates and contracts not loading

## 🎯 **Root Cause**
The IAM role `amplify-contractgenerator-production-78963-authRole` lacks S3 permissions.

## 🔧 **Solution Options**

### **Option 1: AWS CLI (Recommended)**
```powershell
# Run the provided script
.\fix-s3-permissions.ps1
```

### **Option 2: AWS Console (Manual)**

#### **Step 1: Go to IAM Console**
1. Open AWS Console
2. Navigate to **IAM** service
3. Click **Roles** in the left sidebar

#### **Step 2: Find the Role**
1. Search for: `amplify-contractgenerator-production-78963-authRole`
2. Click on the role name

#### **Step 3: Attach Policy**
1. Click **Attach policies**
2. Click **Create policy**
3. Choose **JSON** tab
4. Paste this policy:

```json
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
        "arn:aws:s3:::contractgenerator42b439f60de94b878e0fba5843980478963-production",
        "arn:aws:s3:::contractgenerator42b439f60de94b878e0fba5843980478963-production/*"
      ]
    }
  ]
}
```

5. Click **Next: Tags** (skip tags)
6. Click **Next: Review**
7. Name: `AmplifyS3AccessPolicy`
8. Description: `Allow S3 access for Amplify app`
9. Click **Create policy**

#### **Step 4: Attach to Role**
1. Go back to the role
2. Click **Attach policies**
3. Search for `AmplifyS3AccessPolicy`
4. Check the box and click **Attach policy**

## ✅ **Verification**
1. Wait 1-2 minutes for changes to propagate
2. Refresh your Amplify app
3. Check that templates and contracts load properly
4. Verify no more 403 errors in browser console

## 🔍 **Expected Results**
- ✅ Templates screen loads without errors
- ✅ Mapping screen works properly
- ✅ Contract generation functions
- ✅ No more "AccessDenied" errors

## 🚨 **If Still Not Working**
1. Check that you're using the correct role name
2. Verify the bucket name matches exactly
3. Ensure you're logged in as an authenticated user
4. Check CloudWatch logs for additional errors 