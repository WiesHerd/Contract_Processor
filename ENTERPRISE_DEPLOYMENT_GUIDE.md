# Enterprise Deployment Guide for ContractEngine

## 🚀 Overview

This guide provides step-by-step instructions for deploying ContractEngine in an enterprise environment with enhanced security, monitoring, and compliance features.

## 📋 Pre-Deployment Checklist

### ✅ Security Enhancements
- [x] MFA enabled in Cognito
- [x] Strong password policy (12+ chars, uppercase, lowercase, numbers, symbols)
- [x] Session timeout (20 min user, 15 min admin)
- [x] Enhanced audit logging
- [x] Error boundaries and monitoring
- [x] No secrets in repository

### ✅ Monitoring & Observability
- [x] Sentry error tracking configured
- [x] Performance monitoring
- [x] Security event logging
- [x] Health check utilities
- [x] User action tracking

### ✅ Authentication & Authorization
- [x] Cognito MFA (SMS + TOTP)
- [x] Admin role-based access
- [x] Session management
- [x] Secure sign-out
- [x] Failed login tracking

## 🔧 Step 1: Environment Configuration

### 1.1 Environment Variables

Create a `.env.production` file:

```bash
# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_AWS_ACCESS_KEY_ID=your_production_access_key
VITE_AWS_SECRET_ACCESS_KEY=your_production_secret_key

# S3 Configuration
VITE_S3_BUCKET=your-production-bucket-name

# DynamoDB Table Names
VITE_DYNAMODB_TEMPLATE_TABLE=Template-prod-xxxxxxxxx
VITE_DYNAMODB_PROVIDER_TABLE=Provider-prod-xxxxxxxxx
VITE_DYNAMODB_MAPPING_TABLE=Mapping-prod-xxxxxxxxx
VITE_DYNAMODB_CLAUSE_TABLE=Clause-prod-xxxxxxxxx
VITE_DYNAMODB_AUDIT_TABLE=AuditLog-prod-xxxxxxxxx

# Application Configuration
VITE_APP_NAME=ContractEngine Enterprise
VITE_APP_VERSION=1.0.0
VITE_MAX_FILE_SIZE=10485760
VITE_MAX_BULK_UPLOAD=1000

# Monitoring
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Feature Flags
VITE_ENABLE_COMPRESSION=true
VITE_ENABLE_AUDIT_LOGGING=true
VITE_ENABLE_BULK_OPERATIONS=true
```

### 1.2 Admin Configuration

Update `src/config/admin.ts`:

```typescript
export const ADMIN_CONFIG = {
  // Add your production admin domains
  adminDomains: [
    'yourcompany.com',
    'contractengine.com',
  ],
  
  // Add specific admin emails
  adminEmails: [
    'admin@yourcompany.com',
    'superadmin@contractengine.com',
    // Add your production admin emails
  ],
  
  // Admin session timeout (in minutes)
  adminSessionTimeout: 15,
  
  // Bulk operation limits
  maxBulkDelete: 1000,
  maxBulkExport: 5000,
  
  // Safety confirmations
  requireConfirmationForBulkDelete: true,
  requireConfirmationForBulkExport: true,
  requireTypingConfirmation: true,
};
```

## 🔒 Step 2: Security Configuration

### 2.1 Cognito MFA Setup

The MFA is already configured in the Amplify backend. To verify:

```bash
# Check current MFA configuration
aws cognito-idp describe-user-pool \
  --user-pool-id YOUR_USER_POOL_ID

# Expected output should show:
# "MfaConfiguration": "ON"
# "MfaTypes": ["SMS", "TOTP"]
```

### 2.2 Password Policy Verification

```bash
# Verify password policy
aws cognito-idp describe-user-pool \
  --user-pool-id YOUR_USER_POOL_ID

# Expected output should show:
# "PasswordPolicy": {
#   "MinimumLength": 12,
#   "RequireUppercase": true,
#   "RequireLowercase": true,
#   "RequireNumbers": true,
#   "RequireSymbols": true
# }
```

### 2.3 S3 Bucket Security

Ensure your S3 bucket has proper security:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyUnencryptedObjectUploads",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    },
    {
      "Sid": "DenyIncorrectEncryptionHeader",
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*",
      "Condition": {
        "StringNotEquals": {
          "s3:x-amz-server-side-encryption": "AES256"
        }
      }
    }
  ]
}
```

## 📊 Step 3: Monitoring Setup

### 3.1 Sentry Configuration

1. Create a Sentry project at https://sentry.io
2. Get your DSN
3. Update `VITE_SENTRY_DSN` in your environment variables
4. Configure alerts for:
   - Error rate > 5%
   - Performance degradation
   - Security events

### 3.2 CloudWatch Alarms

Create CloudWatch alarms for:

```bash
# High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name "ContractEngine-HighErrorRate" \
  --alarm-description "High error rate detected" \
  --metric-name "Errors" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Sum" \
  --period 300 \
  --threshold 5 \
  --comparison-operator "GreaterThanThreshold"

# High latency
aws cloudwatch put-metric-alarm \
  --alarm-name "ContractEngine-HighLatency" \
  --alarm-description "High latency detected" \
  --metric-name "TargetResponseTime" \
  --namespace "AWS/ApplicationELB" \
  --statistic "Average" \
  --period 300 \
  --threshold 5000 \
  --comparison-operator "GreaterThanThreshold"
```

## 🚀 Step 4: Deployment

### 4.1 Build for Production

```bash
# Install dependencies
npm ci

# Build for production
npm run build

# Test the build
npm run preview
```

### 4.2 Deploy to AWS

```bash
# Push Amplify backend changes
amplify push

# Deploy frontend
amplify publish
```

### 4.3 Verify Deployment

1. **Authentication Flow**:
   - Test sign-up with MFA
   - Test sign-in with MFA
   - Test session timeout
   - Test admin access

2. **Security Features**:
   - Verify audit logs are being created
   - Test failed login tracking
   - Verify admin-only routes

3. **Monitoring**:
   - Check Sentry for errors
   - Verify CloudWatch metrics
   - Test health check endpoint

## 🔍 Step 5: Post-Deployment Verification

### 5.1 Security Audit

```bash
# Check for exposed secrets
git log --all --full-history -- "*.env*"
git log --all --full-history -- "*.key*"
git log --all --full-history -- "*.pem*"

# Verify no secrets in current codebase
grep -r "AKIA" .
grep -r "sk_" .
grep -r "pk_" .
```

### 5.2 Performance Testing

```bash
# Test bulk operations
# Upload 1000+ providers
# Generate 1000+ contracts
# Monitor memory usage and performance
```

### 5.3 Compliance Verification

- [ ] All authentication events logged
- [ ] All admin actions tracked
- [ ] FMV overrides properly logged
- [ ] Data access events recorded
- [ ] Session management working

## 📈 Step 6: Monitoring & Maintenance

### 6.1 Daily Monitoring

- Check Sentry for new errors
- Review CloudWatch metrics
- Monitor audit logs for suspicious activity
- Check system health

### 6.2 Weekly Tasks

- Review performance metrics
- Analyze user behavior patterns
- Check for security anomalies
- Update dependencies

### 6.3 Monthly Tasks

- Security audit review
- Performance optimization
- Backup verification
- Compliance review

## 🛡️ Security Best Practices

### Access Control
- Use least privilege principle
- Regular access reviews
- Multi-factor authentication for all users
- Session timeout enforcement

### Data Protection
- Encrypt data at rest and in transit
- Regular backup testing
- Data retention policies
- Secure deletion procedures

### Monitoring
- Real-time security monitoring
- Automated alerting
- Regular security assessments
- Incident response procedures

## 📞 Support & Troubleshooting

### Common Issues

1. **MFA Not Working**:
   - Check Cognito configuration
   - Verify phone numbers
   - Check SMS delivery

2. **Performance Issues**:
   - Monitor CloudWatch metrics
   - Check database performance
   - Review bulk operation limits

3. **Audit Log Issues**:
   - Verify DynamoDB permissions
   - Check audit log table
   - Review error logs

### Emergency Procedures

1. **Security Incident**:
   - Immediately revoke affected sessions
   - Review audit logs
   - Contact security team
   - Document incident

2. **System Outage**:
   - Check health endpoints
   - Review CloudWatch alarms
   - Check Sentry for errors
   - Contact DevOps team

## 📚 Additional Resources

- [AWS Cognito Best Practices](https://docs.aws.amazon.com/cognito/latest/developerguide/best-practices.html)
- [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Amplify Documentation](https://docs.amplify.aws/)

---

**Note**: This guide should be reviewed and updated regularly to ensure compliance with your organization's security policies and requirements. 