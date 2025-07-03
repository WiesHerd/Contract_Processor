export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: 'CONFIRMED' | 'UNCONFIRMED' | 'ARCHIVED' | 'COMPROMISED' | 'UNKNOWN' | 'RESET_REQUIRED' | 'FORCE_CHANGE_PASSWORD';
  enabled: boolean;
  groups: string[];
  attributes: {
    email: string;
    email_verified?: boolean;
    given_name?: string;
    family_name?: string;
    phone_number?: string;
    phone_number_verified?: boolean;
    sub: string;
    [key: string]: any;
  };
  createdAt: string;
  lastModifiedAt: string;
  lastSignIn?: string;
  mfaEnabled: boolean;
  userStatus: 'CONFIRMED' | 'UNCONFIRMED' | 'ARCHIVED' | 'COMPROMISED' | 'UNKNOWN' | 'RESET_REQUIRED' | 'FORCE_CHANGE_PASSWORD';
}

export interface UserGroup {
  id: string;
  name: string;
  description?: string;
  precedence: number;
  roleArn?: string;
  createdAt: string;
  lastModifiedAt: string;
  userCount: number;
  permissions: string[];
}

export interface CreateUserInput {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  password: string;
  groups?: string[];
  sendInvitation?: boolean;
}

export interface UpdateUserInput {
  id: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  enabled?: boolean;
  groups?: string[];
}

export interface CreateUserGroupInput {
  name: string;
  description?: string;
  precedence?: number;
  permissions?: string[];
}

export interface UpdateUserGroupInput {
  id: string;
  name?: string;
  description?: string;
  precedence?: number;
  permissions?: string[];
}

export interface UserFilters {
  status?: string;
  group?: string;
  enabled?: boolean;
  search?: string;
}

export interface UserGroupFilters {
  search?: string;
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'enable' | 'disable' | 'delete' | 'addToGroup' | 'removeFromGroup';
  groupName?: string;
}

export interface UserActivity {
  userId: string;
  email: string;
  lastActivity: string;
  sessionDuration: string;
  actionsPerformed: number;
  status: 'active' | 'idle' | 'offline';
  ipAddress?: string;
  userAgent?: string;
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageGroups: boolean;
  canViewAuditLogs: boolean;
  canManageTemplates: boolean;
  canManageProviders: boolean;
  canGenerateContracts: boolean;
  canOverrideFMV: boolean;
  canAccessAdmin: boolean;
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  canManageUsers: false,
  canManageGroups: false,
  canViewAuditLogs: false,
  canManageTemplates: true,
  canManageProviders: true,
  canGenerateContracts: true,
  canOverrideFMV: false,
  canAccessAdmin: false,
};

export const ADMIN_PERMISSIONS: UserPermissions = {
  canManageUsers: true,
  canManageGroups: true,
  canViewAuditLogs: true,
  canManageTemplates: true,
  canManageProviders: true,
  canGenerateContracts: true,
  canOverrideFMV: true,
  canAccessAdmin: true,
}; 