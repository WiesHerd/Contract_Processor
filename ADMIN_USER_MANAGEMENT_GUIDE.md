# Admin User Management System Guide

## Overview

The Admin User Management System provides comprehensive user and user group management capabilities for the ContractEngine application. It integrates with AWS Cognito for authentication and authorization, providing a secure and scalable solution for enterprise user management.

## Features

### User Management
- **View Users**: List all users with filtering and search capabilities
- **Create Users**: Add new users with email invitations
- **Edit Users**: Update user attributes, groups, and status
- **Delete Users**: Remove users from the system
- **Bulk Operations**: Perform operations on multiple users simultaneously
  - Enable/Disable users
  - Add/Remove from groups
  - Delete multiple users

### User Group Management
- **View Groups**: List all user groups with member counts
- **Create Groups**: Add new groups with custom permissions
- **Edit Groups**: Update group settings and permissions
- **Delete Groups**: Remove groups from the system

### Security Features
- **Role-Based Access Control**: Users are assigned to groups with specific permissions
- **Audit Logging**: All admin actions are logged for compliance
- **MFA Support**: Multi-factor authentication for enhanced security
- **Session Management**: Configurable session timeouts

## Architecture

### Frontend Components
- **AdminDashboard**: Main admin interface with tabbed navigation
- **UserManagement**: Comprehensive user management interface
- **Redux Store**: State management for users and groups
- **API Service**: Communication layer with backend services

### Backend Services
- **Lambda Function**: Serverless function for user operations
- **AWS Cognito**: User pool and group management
- **API Gateway**: RESTful API endpoints
- **DynamoDB**: Audit logging and metadata storage

## Setup Instructions

### 1. Configure Admin Access

Edit `src/config/admin.ts` to add your admin credentials:

```typescript
export const ADMIN_CONFIG = {
  adminDomains: [
    'yourcompany.com',
    'contractengine.com',
  ],
  adminEmails: [
    'admin@yourcompany.com',
    'your-email@yourcompany.com', // Add your email here
  ],
  // ... other config
};
```

### 2. Deploy Lambda Function

The Lambda function is already configured in the Amplify backend. To deploy:

```bash
# Deploy the function
amplify push

# Or deploy just the function
amplify push --category function
```

### 3. Configure API Gateway

The Lambda function is automatically exposed through API Gateway. The endpoints are:

- `GET /admin/users` - List users
- `POST /admin/users` - Create user
- `PUT /admin/users/{id}` - Update user
- `DELETE /admin/users/{id}` - Delete user
- `POST /admin/users/bulk` - Bulk operations
- `GET /admin/groups` - List groups
- `POST /admin/groups` - Create group
- `PUT /admin/groups/{id}` - Update group
- `DELETE /admin/groups/{id}` - Delete group

### 4. Environment Variables

Set the following environment variables:

```bash
# In your .env file
VITE_AWS_REGION=us-east-2
VITE_USER_POOL_ID=your-user-pool-id
VITE_API_GATEWAY_URL=https://your-api-gateway-url.amazonaws.com/prod
```

## Usage Guide

### Accessing the Admin Dashboard

1. Sign in to the application with an admin account
2. Navigate to `/admin` in your browser
3. You'll see the admin dashboard with multiple tabs

### Managing Users

#### Viewing Users
1. Click on the "User Management" tab
2. Users are displayed in a table with filtering options
3. Use the search bar to find specific users
4. Filter by status or group using the dropdown menus

#### Creating a New User
1. Click "Add User" button
2. Fill in the required information:
   - Username (email address)
   - First Name
   - Last Name
   - Phone Number (optional)
   - Password
   - Group assignment
3. Click "Create User"
4. The user will receive an email invitation

#### Editing a User
1. Click the "Edit" button next to a user
2. Modify the user's information
3. Update group assignments
4. Enable/disable the user account
5. Click "Update User"

#### Bulk Operations
1. Select multiple users using checkboxes
2. Click "Bulk Operations" button
3. Choose the operation:
   - Enable Users
   - Disable Users
   - Add to Admin Group
   - Remove from Admin Group
   - Delete Users
4. Confirm the operation

### Managing User Groups

#### Viewing Groups
1. Click on the "Groups" tab in User Management
2. Groups are displayed as cards with member counts
3. Each group shows its permissions

#### Creating a New Group
1. Click "Add Group" button
2. Enter group name and description
3. Set precedence (lower numbers have higher priority)
4. Select permissions for the group
5. Click "Create Group"

#### Editing a Group
1. Click "Edit" on a group card
2. Modify group settings
3. Update permissions
4. Click "Update Group"

## Permission System

### Default Permissions

The system includes several predefined permission levels:

```typescript
export const DEFAULT_PERMISSIONS = {
  canManageUsers: false,
  canManageGroups: false,
  canViewAuditLogs: false,
  canManageTemplates: true,
  canManageProviders: true,
  canGenerateContracts: true,
  canOverrideFMV: false,
  canAccessAdmin: false,
};

export const ADMIN_PERMISSIONS = {
  canManageUsers: true,
  canManageGroups: true,
  canViewAuditLogs: true,
  canManageTemplates: true,
  canManageProviders: true,
  canGenerateContracts: true,
  canOverrideFMV: true,
  canAccessAdmin: true,
};
```

### Permission Descriptions

- **canManageUsers**: Create, edit, and delete users
- **canManageGroups**: Create, edit, and delete user groups
- **canViewAuditLogs**: Access audit log data
- **canManageTemplates**: Create and edit contract templates
- **canManageProviders**: Upload and manage provider data
- **canGenerateContracts**: Generate contract documents
- **canOverrideFMV**: Override Fair Market Value warnings
- **canAccessAdmin**: Access the admin dashboard

## Security Best Practices

### 1. Admin Access Control
- Limit admin access to trusted users only
- Use specific email addresses rather than entire domains
- Regularly review admin access permissions

### 2. Password Policies
- Enforce strong password requirements
- Enable MFA for all admin accounts
- Implement password expiration policies

### 3. Audit Monitoring
- Regularly review audit logs
- Monitor for unusual admin activities
- Set up alerts for security events

### 4. Data Protection
- Encrypt sensitive user data
- Implement data retention policies
- Regular security assessments

## Troubleshooting

### Common Issues

#### 1. Admin Access Not Working
- Check your email is in the admin configuration
- Verify you're signed in with the correct account
- Check browser console for errors

#### 2. Lambda Function Errors
- Check CloudWatch logs for error details
- Verify IAM permissions are correct
- Ensure environment variables are set

#### 3. API Gateway Issues
- Check API Gateway logs
- Verify CORS configuration
- Test endpoints directly

#### 4. User Creation Fails
- Check email format is valid
- Verify user pool configuration
- Check Lambda function logs

### Debug Mode

Enable debug mode by setting:

```typescript
// In src/services/adminApi.ts
const DEBUG_MODE = true;
```

This will log all API calls and responses to the console.

## API Reference

### User Endpoints

#### GET /admin/users
List all users with optional filtering.

**Query Parameters:**
- `limit`: Number of users to return (default: 60)
- `paginationToken`: Token for pagination
- `filter`: Cognito filter string

**Response:**
```json
{
  "users": [
    {
      "id": "user-id",
      "username": "user@example.com",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "status": "CONFIRMED",
      "enabled": true,
      "groups": ["Admin"],
      "createdAt": "2024-01-01T00:00:00Z",
      "lastSignIn": "2024-01-15T10:30:00Z"
    }
  ],
  "paginationToken": "next-token",
  "count": 1
}
```

#### POST /admin/users
Create a new user.

**Request Body:**
```json
{
  "username": "newuser@example.com",
  "email": "newuser@example.com",
  "firstName": "New",
  "lastName": "User",
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123!",
  "groups": ["HR"],
  "sendInvitation": true
}
```

#### PUT /admin/users/{id}
Update a user.

**Request Body:**
```json
{
  "firstName": "Updated",
  "lastName": "Name",
  "phoneNumber": "+1234567890",
  "enabled": true,
  "groups": ["Admin", "HR"]
}
```

#### DELETE /admin/users/{id}
Delete a user.

#### POST /admin/users/bulk
Perform bulk operations on users.

**Request Body:**
```json
{
  "userIds": ["user1", "user2"],
  "operation": "enable",
  "groupName": "Admin"
}
```

### Group Endpoints

#### GET /admin/groups
List all user groups.

**Response:**
```json
{
  "groups": [
    {
      "id": "Admin",
      "name": "Admin",
      "description": "Administrators",
      "precedence": 1,
      "userCount": 5,
      "permissions": ["canManageUsers", "canAccessAdmin"]
    }
  ],
  "count": 1
}
```

#### POST /admin/groups
Create a new group.

**Request Body:**
```json
{
  "name": "NewGroup",
  "description": "New user group",
  "precedence": 5,
  "permissions": ["canManageTemplates"]
}
```

## Development

### Adding New Features

1. **Update Types**: Add new interfaces in `src/types/user.ts`
2. **Update API**: Add new endpoints in `src/services/adminApi.ts`
3. **Update Redux**: Add new actions in `src/store/slices/userSlice.ts`
4. **Update UI**: Add new components in `src/features/admin/`
5. **Update Lambda**: Add new handlers in the Lambda function

### Testing

Run the test suite:

```bash
npm test
```

### Building for Production

```bash
npm run build
```

## Support

For technical support or questions about the admin system:

1. Check the troubleshooting section above
2. Review CloudWatch logs for errors
3. Contact the development team
4. Create an issue in the project repository

## Changelog

### Version 1.0.0
- Initial release of admin user management system
- User CRUD operations
- Group management
- Bulk operations
- Audit logging
- Role-based access control 