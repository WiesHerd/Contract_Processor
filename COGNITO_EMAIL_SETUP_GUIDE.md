# Cognito Welcome Email Setup Guide

## 🎯 Overview
This guide will help you customize the welcome emails sent to new users in your ContractEngine application.

## 📋 Prerequisites
- AWS Console access
- Admin permissions for Cognito User Pool
- Email address for testing

## 🚀 Step-by-Step Implementation

### Step 1: Access AWS Cognito Console

1. **Open AWS Console**
   - Go to: https://console.aws.amazon.com/
   - Sign in with your AWS account

2. **Navigate to Cognito**
   - In the search bar, type "Cognito"
   - Click on "Amazon Cognito"

3. **Find Your User Pool**
   - Click "User pools" in the left sidebar
   - Look for: `contractgenerator7e5dfb2d_userpool_7e5dfb2d`
   - Click on it

### Step 2: Customize Welcome Email

1. **Navigate to Message Customizations**
   - In the left sidebar, scroll down
   - Click **"Message customizations"**

2. **Edit Account Creation Email**
   - Click on **"Account creation"**
   - This controls the welcome email sent to new users

3. **Update Subject Line**
   ```
   Change from: "Your temporary password"
   Change to: "Welcome to ContractEngine - Your Account is Ready"
   ```

4. **Replace Message Body with Professional Template**

```
Dear {username},

Welcome to ContractEngine! Your account has been successfully created and you can now access our contract generation platform.

**Your Login Details:**
Username: {username}
Temporary Password: {####}

**Next Steps:**
1. Sign in at: [Your App URL]
2. Change your temporary password on first login
3. Complete your profile setup
4. Start creating contracts!

**Security Note:** For your security, please change your password immediately after your first sign-in.

**Need Help?**
- Contact your administrator for technical support
- Review our user guide for getting started
- Check our FAQ section

Thank you for choosing ContractEngine!

Best regards,
The ContractEngine Team
```

### Step 3: Set Up Custom Sender (Optional but Recommended)

1. **In Message Customizations**
   - Look for **"From" address**
   - Click "Verify a new email address"
   - Enter: `noreply@yourcompany.com` (or your preferred email)
   - Check your email for verification link
   - Click the verification link
   - Return to Cognito and select your verified email

### Step 4: Save Changes

1. **Click "Save changes"** at the bottom of the page
2. **Wait for confirmation** that changes have been applied

## 🧪 Testing Your Setup

### Option 1: Use the Test Script

1. **Edit the test script**
   - Open `test-welcome-email.js`
   - Replace `'your-email@yourcompany.com'` with your actual email
   - Save the file

2. **Run the test**
   ```bash
   node test-welcome-email.js
   ```

3. **Check your email**
   - Look in your inbox for the welcome email
   - Also check spam/junk folder
   - Verify the email contains your custom template

### Option 2: Use Your Admin Dashboard

1. **Open your application**
   - Go to your admin dashboard
   - Navigate to User Management

2. **Create a test user**
   - Click "Add User"
   - Use your email address
   - Fill in required fields
   - Click "Create User"

3. **Check for the email**
   - Look in your inbox
   - Verify the custom template is working

## ✅ Verification Checklist

- [ ] Subject line is customized
- [ ] Message body contains your custom template
- [ ] Email includes username and temporary password
- [ ] Custom sender address is set (if configured)
- [ ] Email is received in inbox (not spam)
- [ ] Template variables are properly replaced

## 🔧 Troubleshooting

### Email Not Received
- Check spam/junk folder
- Verify email address is correct
- Check AWS SES sending limits
- Review CloudWatch logs

### Template Variables Not Working
- Ensure correct variable names: `{username}`, `{####}`
- Test with simple message first
- Check for typos in template

### Custom Sender Issues
- Verify email domain in SES
- Check SES sending limits
- Ensure sender address is approved

## 📧 Available Template Variables

- `{username}` - The user's username
- `{####}` - Temporary password
- `{##Verify Email##}` - Email verification link
- `{##Forgot Password##}` - Password reset link

## 🎨 Advanced Customization (Optional)

For more advanced customization, you can use Lambda Triggers:

1. **In Cognito Console**
   - Go to "User pool properties"
   - Scroll to "Lambda triggers"
   - Find "Custom message" trigger

2. **Benefits of Lambda Triggers**
   - Send HTML emails with branding
   - Add dynamic content
   - Include company logos
   - Add custom links and styling

## 📞 Support

If you encounter issues:
1. Check AWS Cognito documentation
2. Review CloudWatch logs
3. Verify IAM permissions
4. Contact AWS support if needed

## 🗑️ Cleanup

After testing, you can delete test users:
1. Go to AWS Cognito Console
2. Navigate to "Users and groups"
3. Find test users and delete them
4. Or use your admin dashboard to remove them

---

**Your User Pool Details:**
- **User Pool ID:** `us-east-2_ldPO5ZKCR`
- **User Pool Name:** `contractgenerator7e5dfb2d_userpool_7e5dfb2d`
- **Region:** `us-east-2` 