# Cognito Email Verification Guide

## 🔍 How to Verify Email Delivery in AWS Cognito

### **Method 1: Cognito Console (Recommended)**

1. **Open Cognito Console:**
   - Go to: https://console.aws.amazon.com/cognito/v2/home?region=us-east-2
   - Click on your User Pool: `us-east-2_ldPO5ZKCR`

2. **Check User Status:**
   - Go to "Users" tab
   - Find the user `herdzik@att.net`
   - Check the "Status" column:
     - `FORCE_CHANGE_PASSWORD` = User created, email sent, waiting for first login
     - `CONFIRMED` = User has already confirmed their account
     - `UNCONFIRMED` = User created but email not sent/delivered

3. **Check Message Delivery:**
   - Click on the user to see details
   - Look for "Message delivery" section
   - Check if there are any delivery failures

### **Method 2: CloudWatch Logs**

1. **Enable Cognito Logging:**
   - In Cognito Console → "Signing experience" → "App integration"
   - Scroll to "Advanced security" → "Logs"
   - Enable "User Pool logs"

2. **Check CloudWatch:**
   - Go to CloudWatch Console
   - Navigate to "Log groups"
   - Look for `/aws/cognito/userpool/us-east-2_ldPO5ZKCR`
   - Search for your user's email address

### **Method 3: SES (Simple Email Service) Logs**

If you're using SES for email delivery:

1. **Check SES Console:**
   - Go to: https://console.aws.amazon.com/ses/
   - Check "Sending statistics"
   - Look for bounces, complaints, or delivery failures

2. **Check SES Logs:**
   - Go to CloudWatch → Log groups
   - Look for SES-related logs

### **Method 4: AWS CLI Commands**

```bash
# Check user status
aws cognito-idp admin-get-user \
  --username herdzik@att.net \
  --user-pool-id us-east-2_ldPO5ZKCR

# List recent events (if logging enabled)
aws logs describe-log-groups --log-group-name-prefix "/aws/cognito"
```

## 🚨 Common Email Delivery Issues

### **1. Email Configuration**
- **Check SES Configuration:** Ensure SES is properly configured for your region
- **Verify Email Templates:** Check if welcome email templates are set up
- **Check Sending Limits:** SES has daily sending limits for new accounts

### **2. User Pool Settings**
- **Message Configuration:** Verify message templates in User Pool settings
- **Email Verification:** Check if email verification is required
- **SMTP Settings:** Verify SMTP configuration if using custom email

### **3. Email Address Issues**
- **Spam Filters:** Check spam/junk folders
- **Email Format:** Verify email address format
- **Domain Restrictions:** Some domains may block AWS emails

## 🔧 Troubleshooting Steps

### **Step 1: Check User Status**
```bash
aws cognito-idp admin-get-user \
  --username herdzik@att.net \
  --user-pool-id us-east-2_ldPO5ZKCR
```

### **Step 2: Manually Trigger Email**
```bash
# Force password reset to trigger email
aws cognito-idp admin-set-user-password \
  --username herdzik@att.net \
  --user-pool-id us-east-2_ldPO5ZKCR \
  --password "TempPass123!" \
  --permanent false
```

### **Step 3: Check SES Status**
```bash
# Check SES sending limits
aws ses get-send-quota

# Check if email is verified
aws ses get-identity-verification-attributes \
  --identities "herdzik@att.net"
```

## 📧 Email Configuration Checklist

### **Cognito User Pool Settings:**
- [ ] **Message templates** configured
- [ ] **SES integration** enabled
- [ ] **Email verification** settings correct
- [ ] **SMTP settings** (if using custom email)

### **SES Configuration:**
- [ ] **Sending limits** sufficient
- [ ] **Email verified** in SES
- [ ] **Domain verified** (if using custom domain)
- [ ] **Bounce/complaint handling** configured

### **Network/Security:**
- [ ] **VPC endpoints** configured (if applicable)
- [ ] **Security groups** allow SES traffic
- [ ] **IAM permissions** correct

## 🎯 Quick Verification Commands

```bash
# 1. Check if user exists and status
aws cognito-idp admin-get-user \
  --username herdzik@att.net \
  --user-pool-id us-east-2_ldPO5ZKCR

# 2. Check SES sending quota
aws ses get-send-quota

# 3. Check recent CloudWatch logs
aws logs filter-log-events \
  --log-group-name "/aws/cognito/userpool/us-east-2_ldPO5ZKCR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "herdzik@att.net"
```

## 📞 Next Steps

1. **Check Cognito Console** for user status
2. **Verify SES configuration** and limits
3. **Check CloudWatch logs** for delivery attempts
4. **Test with a different email** (Gmail, Outlook)
5. **Contact AWS Support** if issues persist

---

**Note:** Email delivery can take 1-5 minutes. If no email received after 10 minutes, there's likely a configuration issue. 