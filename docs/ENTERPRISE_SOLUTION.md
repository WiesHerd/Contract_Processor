# Enterprise-Grade Multi-Organization Solution

## Overview

This document outlines the enterprise-grade solution for making the ContractEngine application scalable, robust, and suitable for multiple organizations with proper access control.

## Problem Solved

**Previous Issue**: Owner-based authorization (`@auth(rules: [{ allow: owner }])`) was too restrictive:
- Only the user who created a record could access it
- When users left the organization, their data became inaccessible
- No way to share data across team members
- Not scalable for enterprise use

**New Solution**: Group-based authorization with multi-tenant architecture:
- Data is organized by organizations
- Access controlled by Cognito groups
- Survives user turnover
- Scalable for multiple organizations

## Architecture

### 1. Multi-Tenant Data Model

Each record now includes:
- `organizationId`: Links data to a specific organization
- `organizationGroups`: Array of Cognito groups that can access this data
- `organizationName`: Human-readable organization name

### 2. Authorization Rules

The new schema uses three-tier authorization:

```graphql
@auth(rules: [
  # Admin users can do everything
  { allow: groups, groups: ["Admin"], operations: [create, update, delete, read] },
  
  # Organization members can read/update based on their groups
  { allow: groups, groupsField: "organizationGroups", operations: [read, update] },
  
  # Original owner can still access their own data
  { allow: owner, ownerField: "owner", operations: [create, update, delete, read] }
])
```

### 3. Organization Management

New `Organization` model for managing multi-tenant structure:
```graphql
type Organization @model @auth(rules: [
  { allow: groups, groups: ["Admin"], operations: [create, update, delete, read] },
  { allow: groups, groupsField: "memberGroups", operations: [read] }
]) {
  id: ID!
  name: String!
  description: String
  memberGroups: [String]! # Cognito groups that are members
  adminGroups: [String]! # Cognito groups that are admins
  settings: AWSJSON # Organization-specific settings
}
```

## Implementation Steps

### Step 1: Deploy Updated Schema

```bash
# Deploy the new schema
amplify push
```

### Step 2: Run Migration Script

```bash
# Set your password
export USER_PASSWORD="your-actual-password"

# Run the migration
node scripts/migrate-to-enterprise-schema.js
```

### Step 3: Set Up Cognito Groups

In AWS Console → Cognito → User Pools → Groups:

1. **Create Organization Groups**:
   - `Org1-Members` - Regular users for Organization 1
   - `Org1-Admins` - Admin users for Organization 1
   - `Org2-Members` - Regular users for Organization 2
   - `Org2-Admins` - Admin users for Organization 2

2. **Assign Users to Groups**:
   - Add users to appropriate organization groups
   - Users can be in multiple groups if needed

### Step 4: Update Application Code

The application needs to be updated to:
- Query data by organization
- Handle group-based permissions
- Display organization context

## Benefits

### 1. Scalability
- **Multiple Organizations**: Each organization has isolated data
- **User Management**: Users can be added/removed without data loss
- **Growth Ready**: Easy to add new organizations

### 2. Security
- **Group-Based Access**: Fine-grained control over who sees what
- **Audit Trail**: All actions logged with organization context
- **Data Isolation**: Organizations can't see each other's data

### 3. Enterprise Features
- **User Turnover**: Data survives when users leave
- **Team Collaboration**: Multiple users can access shared data
- **Admin Controls**: Organization admins can manage their data
- **Compliance**: Proper data governance and access controls

### 4. Operational Excellence
- **Backup & Recovery**: Organization-level data management
- **Monitoring**: Organization-specific metrics and logs
- **Support**: Easier troubleshooting with clear data boundaries

## Migration Strategy

### Phase 1: Schema Update
- Deploy new schema with backward compatibility
- Existing data remains accessible during transition

### Phase 2: Data Migration
- Run migration script to update existing records
- Add organization context to all data
- Create default organization for existing data

### Phase 3: Application Updates
- Update queries to use organization context
- Implement group-based UI features
- Add organization management screens

### Phase 4: User Onboarding
- Set up Cognito groups for each organization
- Assign users to appropriate groups
- Train users on new organization features

## Cognito Group Structure

### Recommended Group Naming Convention
```
{OrganizationName}-{Role}
```

Examples:
- `AcmeHospital-Members` - Regular users at Acme Hospital
- `AcmeHospital-Admins` - Admin users at Acme Hospital
- `CityMedical-Members` - Regular users at City Medical
- `CityMedical-Admins` - Admin users at City Medical

### Group Hierarchy
```
Admin (Global)
├── Org1-Admins
│   └── Org1-Members
└── Org2-Admins
    └── Org2-Members
```

## Data Access Patterns

### 1. Organization-Specific Queries
```graphql
# Get providers for a specific organization
query GetProvidersByOrganization($organizationId: String!) {
  providersByOrganization(organizationId: $organizationId) {
    items {
      id
      name
      organizationName
    }
  }
}
```

### 2. Group-Based Filtering
The `organizationGroups` field automatically filters data based on the user's Cognito groups.

### 3. Admin Override
Users in the `Admin` group can access all data across all organizations.

## Monitoring and Maintenance

### 1. Organization Metrics
- Track data usage per organization
- Monitor user activity and access patterns
- Identify inactive organizations

### 2. Security Monitoring
- Audit log analysis by organization
- Detect unusual access patterns
- Monitor group membership changes

### 3. Data Management
- Regular backups per organization
- Data retention policies
- Cleanup of orphaned data

## Troubleshooting

### Common Issues

1. **Users can't see data after migration**
   - Check if user is in correct Cognito groups
   - Verify `organizationGroups` field contains user's groups
   - Ensure organization exists and is properly configured

2. **Migration script fails**
   - Verify user credentials
   - Check AWS permissions
   - Review error logs for specific issues

3. **Schema deployment fails**
   - Check for syntax errors in schema
   - Verify Amplify CLI version
   - Review AWS service limits

### Support Commands

```bash
# Check user's Cognito groups
aws cognito-idp admin-get-user --user-pool-id us-east-2_ldPO5ZKCR --username user@example.com

# List organizations
aws dynamodb scan --table-name Organization-xxx

# Check provider data
aws dynamodb scan --table-name Provider-xxx --filter-expression "organizationId = :org" --expression-attribute-values '{":org": {"S": "default-org"}}'
```

## Future Enhancements

### 1. Advanced Features
- Cross-organization data sharing
- Organization templates and settings
- Advanced audit and compliance features

### 2. Integration
- SSO integration with organization systems
- API access for third-party integrations
- Webhook notifications for organization events

### 3. Analytics
- Organization-level reporting
- Usage analytics and insights
- Performance monitoring

## Conclusion

This enterprise solution provides:
- ✅ **Scalability** for multiple organizations
- ✅ **Security** with proper access controls
- ✅ **Reliability** that survives user turnover
- ✅ **Compliance** with enterprise requirements
- ✅ **Maintainability** with clear data organization

The migration is designed to be safe, reversible, and minimally disruptive to existing operations. 