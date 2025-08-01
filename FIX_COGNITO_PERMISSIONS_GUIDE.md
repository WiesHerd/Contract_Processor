# 🔧 Fix Cognito Permissions for User Management

## 🚨 **Issue**
The authenticated user doesn't have Cognito permissions, causing:
- `Failed to fetch users: User: arn:aws:sts::430118851518:assumed-role/amplify-contractgenerator-production-78963-authRole/CognitoIdentityCredentials is not authorized to perform: cognito-idp:ListUsers`
- User Management page shows empty table with error
- Admin functions not working properly

## 🎯 **Root Cause**
The IAM role `amplify-contractgenerator-production-78963-authRole` lacks Cognito Identity Provider permissions.

## 🔧 **Solution Options**

### **Option 1: AWS CLI (Recommended)**
```powershell
# Create the fix script
New-Item -Path "fix-cognito-permissions.ps1" -ItemType File -Force

# Add the script content
@"
# Fix Cognito Permissions for Amplify Production
Write-Host "🔧 Fixing Cognito permissions for User Management..." -ForegroundColor Yellow

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
Write-Host "📝 Creating CognitoAdminPolicy..." -ForegroundColor Blue
aws iam create-policy --policy-name CognitoAdminPolicy --policy-document "$policyJson" --description "Allow Cognito admin operations for User Management"

# Attach policy to the role
Write-Host "🔗 Attaching policy to role..." -ForegroundColor Blue
aws iam attach-role-policy --role-name amplify-contractgenerator-production-78963-authRole --policy-arn arn:aws:iam::430118851518:policy/CognitoAdminPolicy

Write-Host "✅ Cognito permissions fixed! Wait 1-2 minutes for changes to propagate." -ForegroundColor Green
Write-Host "🔄 Refresh your app and try the User Management page again." -ForegroundColor Cyan
"@ | Out-File -FilePath "fix-cognito-permissions.ps1" -Encoding UTF8

# Run the script
.\fix-cognito-permissions.ps1
```

### **Option 2: AWS Console (Manual)**

#### **Step 1: Go to IAM Console**
1. Open AWS Console
2. Navigate to **IAM** service
3. Click **Roles** in the left sidebar

#### **Step 2: Find the Role**
1. Search for: `amplify-contractgenerator-production-78963-authRole`
2. Click on the role name

#### **Step 3: Create Cognito Policy**
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
```

5. Click **Next: Tags** (skip tags)
6. Click **Next: Review**
7. Name: `CognitoAdminPolicy`
8. Description: `Allow Cognito admin operations for User Management`
9. Click **Create policy**

#### **Step 4: Attach to Role**
1. Go back to the role
2. Click **Attach policies**
3. Search for `CognitoAdminPolicy`
4. Check the box and click **Attach policy**

## ✅ **Verification**
1. Wait 1-2 minutes for changes to propagate
2. Refresh your Amplify app
3. Navigate to User Management page
4. Check that users load properly without errors
5. Verify admin functions work (create, edit, delete users)

## 🔍 **Expected Results**
- ✅ User Management page loads without errors
- ✅ User table displays actual Cognito users
- ✅ Search and filter functions work
- ✅ Create/Edit/Delete user functions work
- ✅ No more "not authorized" errors

## 🚨 **If Still Not Working**
1. Check that you're using the correct role name
2. Verify the User Pool ID matches exactly: `us-east-2_ldPO5ZKCR`
3. Ensure you're logged in as an authenticated user
4. Check CloudWatch logs for additional errors
5. Verify the policy was attached successfully in IAM console

## 🔧 **Additional Troubleshooting**

### **Check Current Role Permissions**
```bash
aws iam list-attached-role-policies --role-name amplify-contractgenerator-production-78963-authRole
```

### **Verify User Pool ID**
The User Pool ID in the error message should match your actual Cognito User Pool:
- Error shows: `us-east-2_ldPO5ZKCR`
- Verify this matches your User Pool ID in AWS Console

### **Test Permissions**
```bash
aws cognito-idp list-users --user-pool-id us-east-2_ldPO5ZKCR
```

## 📋 **Required Permissions Summary**
The policy grants these Cognito operations:
- `ListUsers` - View all users
- `AdminListGroupsForUser` - Get user groups
- `AdminGetUser` - Get user details
- `AdminCreateUser` - Create new users
- `AdminDeleteUser` - Delete users
- `AdminSetUserPassword` - Set/reset passwords
- `AdminAddUserToGroup` - Add users to groups
- `AdminRemoveUserFromGroup` - Remove users from groups
- `ListGroups` - View all groups
- `CreateGroup` - Create new groups
- `DeleteGroup` - Delete groups 