# 🔧 Quick Reference: Fix Cognito Permissions

## 📋 **Policy to Copy**
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
        "arn:aws:cognito-idp:us-east-2:430118851518:userpool/us-east-2_IdPO5ZKCR"
      ]
    }
  ]
}
```

## 🎯 **Key Details**
- **Role Name**: `amplify-contractgenerator-production-78963-authRole`
- **Policy Name**: `CognitoAdminPolicy`
- **User Pool ID**: `us-east-2_IdPO5ZKCR`

## ✅ **After Fix**
1. Wait 1-2 minutes for changes to propagate
2. Refresh your Amplify app
3. Navigate to User Management page
4. Users should load without errors

## 🚨 **If Still Not Working**
- Verify the role name is exactly: `amplify-contractgenerator-production-78963-authRole`
- Check that the User Pool ID matches: `us-east-2_IdPO5ZKCR`
- Ensure you're logged in as an authenticated user
- Check CloudWatch logs for additional errors 