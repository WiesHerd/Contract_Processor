# Admin Guide - ContractEngine

## 🔐 Admin Access

### Email-Based Admin Access
Admin access is granted to users with email addresses from configured admin domains:

- `admin.yourcompany.com`
- `yourcompany.com`
- `contractengine.com`

Or specific admin email addresses:
- `admin@yourcompany.com`
- `superadmin@contractengine.com`

### Accessing Admin Features

#### Method 1: Direct URL Access
Navigate directly to `/admin` in your browser. If you have admin privileges, you'll see the admin dashboard.

#### Method 2: CLI Tool
For advanced users, use the command-line interface:

```bash
# Install dependencies
npm install

# Run admin CLI
npx tsx scripts/admin-cli.ts
```

## 🛠 Admin Features

### Bulk Operations
- **Delete All Providers**: Permanently remove all provider records
- **Export Data**: Download all data for backup
- **System Statistics**: View current system usage

### Safety Features
- **Confirmation Dialogs**: All destructive operations require confirmation
- **Typing Confirmation**: Must type "DELETE" to confirm bulk deletions
- **Progress Tracking**: Real-time progress for long-running operations
- **Audit Logging**: All admin actions are logged

## ⚙️ Configuration

### Adding New Admin Users
Edit `src/config/admin.ts`:

```typescript
export const ADMIN_CONFIG = {
  adminDomains: [
    'yourcompany.com',
    'newadmin.com', // Add new domain
  ],
  adminEmails: [
    'admin@yourcompany.com',
    'newadmin@company.com', // Add new admin email
  ],
  // ... other config
};
```

### Adjusting Limits
```typescript
export const ADMIN_CONFIG = {
  maxBulkDelete: 2000, // Increase bulk delete limit
  maxBulkExport: 10000, // Increase export limit
  adminSessionTimeout: 60, // Increase session timeout
};
```

## 🚨 Emergency Procedures

### Complete System Reset
If you need to completely reset the system:

1. **Backup First**: Export all data before proceeding
2. **Delete Providers**: Use admin dashboard or CLI
3. **Delete Templates**: Use admin dashboard
4. **Clear Audit Logs**: Use admin dashboard

### Recovery Procedures
- All operations are logged in the audit system
- Check audit logs for recent activity
- Contact system administrator for data recovery

## 🔧 Quick Start

### 1. Configure Admin Access
Edit `src/config/admin.ts` and add your email domain or specific email:

```typescript
adminDomains: [
  'yourcompany.com', // Add your domain
],
adminEmails: [
  'your-email@yourcompany.com', // Add your email
],
```

### 2. Access Admin Dashboard
1. Sign in to the application
2. Navigate to `/admin` in your browser
3. You should see the admin dashboard if you have admin privileges

### 3. Use Bulk Delete
1. Click "Delete All" in the Bulk Operations section
2. Type "DELETE" in the confirmation field
3. Click "Confirm Delete"
4. Monitor progress as providers are deleted

### 4. Use CLI Tool (Alternative)
```bash
# Run the CLI tool
npx tsx scripts/admin-cli.ts

# Follow the prompts to confirm deletion
```

## 🛡️ Security Best Practices

### 1. Limit Admin Access
- Only grant admin access to trusted users
- Use specific email addresses rather than entire domains when possible
- Regularly review admin access

### 2. Monitor Usage
- Check audit logs regularly
- Monitor for unusual bulk operations
- Set up alerts for large deletions

### 3. Backup Strategy
- Always backup data before bulk operations
- Use the export features to create backups
- Store backups in a secure location

## 📊 Monitoring and Logging

### Audit Logs
All admin actions are automatically logged:
- User who performed the action
- Timestamp of the action
- Type of operation
- Number of records affected

### System Statistics
The admin dashboard shows:
- Total number of providers
- Total number of templates
- Total number of audit logs
- Last audit action and timestamp

## 🚨 Troubleshooting

### Common Issues

#### "Access Denied" Error
- Check if your email is in the admin configuration
- Verify you're signed in with the correct account
- Contact system administrator to add your email

#### Bulk Delete Fails
- Check network connection
- Verify API permissions
- Try using the CLI tool as an alternative
- Check audit logs for error details

#### CLI Tool Not Working
- Ensure all dependencies are installed
- Check that the API configuration is correct
- Verify you have the latest version of the script

### Getting Help
For admin access issues or emergency situations:
- Email: admin@contractengine.com
- Emergency: +1-555-ADMIN-HELP

## 📋 Admin Checklist

### Before Bulk Operations
- [ ] Backup all data
- [ ] Verify admin access
- [ ] Check system statistics
- [ ] Review audit logs
- [ ] Confirm operation with stakeholders

### After Bulk Operations
- [ ] Verify operation completed successfully
- [ ] Check updated system statistics
- [ ] Review new audit logs
- [ ] Update documentation if needed
- [ ] Notify relevant team members

---

**⚠️ Warning**: Admin operations are irreversible. Always backup data before performing bulk operations.

**🔒 Security Note**: Keep admin credentials secure and never share admin access with unauthorized users. 