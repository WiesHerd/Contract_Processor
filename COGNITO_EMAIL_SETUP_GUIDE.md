# Cognito Email Setup Guide

## 🎯 Why the Email Might Not Be Received

### **1. SES Sandbox Mode**
- New AWS accounts are in "sandbox" mode
- Can only send to verified email addresses
- Daily limit: 200 emails
- Need to request production access

### **2. Email Template Configuration**
- Default Cognito templates are generic
- May not look like a proper welcome email
- Subject line might be confusing

### **3. Domain Restrictions**
- Some email providers block AWS emails
- AT&T, Yahoo, etc. may have restrictions
- Try with Gmail for testing

## 🔧 How to Fix Email Issues

### **Step 1: Check SES Status**

1. **Go to SES Console:** https://console.aws.amazon.com/ses/
2. **Check Account Status:**
   - If "Sandbox mode" → Request production access
   - If "Production access" → You're good

### **Step 2: Configure Email Templates**

1. **Go to Cognito Console:** https://console.aws.amazon.com/cognito/v2/home?region=us-east-2
2. **Select your User Pool:** `us-east-2_ldPO5ZKCR`
3. **Go to:** "Signing experience" → "App integration"
4. **Scroll to:** "Message templates"
5. **Configure:**
   - **Welcome message** - Customize the invitation email
   - **Subject line** - Make it clear and professional
   - **Message content** - Include your app name and instructions

### **Step 3: Test with Different Email**

Try creating a user with:
- **Gmail address** (more reliable)
- **Outlook address** (better delivery)
- **Your own email** (for testing)

### **Step 4: Verify Email Address**

If in sandbox mode:
1. **Go to SES Console**
2. **Click "Verified identities"**
3. **Add your email address**
4. **Check email and click verification link**

## 📧 Sample Email Template

**Subject:** Welcome to ContractEngine - Your Account is Ready

**Message:**
```
Hello,

Your account has been created in ContractEngine.

Username: {{username}}
Temporary Password: {{####}}

Please sign in at: [your-app-url]
You will be prompted to create a new password on first login.

If you have any questions, please contact support.

Best regards,
The ContractEngine Team
```

## 🚀 Quick Fixes

### **Immediate Actions:**
1. **Check spam folder** for `herdzik@att.net`
2. **Try creating user with Gmail** (test@gmail.com)
3. **Check SES console** for delivery status
4. **Request SES production access** if needed

### **Long-term Solutions:**
1. **Configure custom email templates**
2. **Set up SES production access**
3. **Use verified domain for sending**
4. **Monitor email delivery metrics**

## 📞 Next Steps

1. **Check SES Console** for account status
2. **Try Gmail test** to verify delivery
3. **Configure email templates** for better UX
4. **Request production access** if in sandbox

---

**Note:** The user creation worked perfectly! The issue is likely email delivery, not user creation. 