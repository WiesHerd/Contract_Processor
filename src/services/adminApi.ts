import { 
  User, 
  UserGroup, 
  CreateUserInput, 
  UpdateUserInput, 
  CreateUserGroupInput, 
  UpdateUserGroupInput,
  BulkUserOperation
} from '@/types/user';

// Base API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-api-gateway-url.amazonaws.com/prod' 
  : 'http://localhost:3000/api';

// Helper function to make API calls
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// User Management API
export const userApi = {
  // Get all users
  async getUsers(params?: {
    limit?: number;
    paginationToken?: string;
    filter?: string;
  }): Promise<{ users: User[]; paginationToken?: string; count: number }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.paginationToken) queryParams.append('paginationToken', params.paginationToken);
    if (params?.filter) queryParams.append('filter', params.filter);
    
    const queryString = queryParams.toString();
    const endpoint = `/admin/users${queryString ? `?${queryString}` : ''}`;
    
    return apiCall(endpoint);
  },

  // Create a new user
  async createUser(userData: CreateUserInput): Promise<{ message: string; user: User }> {
    return apiCall('/admin/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  // Update a user
  async updateUser(userId: string, userData: UpdateUserInput): Promise<{ message: string; userId: string }> {
    return apiCall(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  // Delete a user
  async deleteUser(userId: string): Promise<{ message: string; userId: string }> {
    return apiCall(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Bulk user operations
  async bulkOperation(operation: BulkUserOperation): Promise<{
    message: string;
    results: Array<{ userId: string; success: boolean; error?: string }>;
    totalProcessed: number;
    successful: number;
    failed: number;
  }> {
    return apiCall('/admin/users/bulk', {
      method: 'POST',
      body: JSON.stringify(operation),
    });
  },
};

// User Group Management API
export const groupApi = {
  // Get all groups
  async getGroups(): Promise<{ groups: UserGroup[]; count: number }> {
    return apiCall('/admin/groups');
  },

  // Create a new group
  async createGroup(groupData: CreateUserGroupInput): Promise<{ message: string; group: UserGroup }> {
    return apiCall('/admin/groups', {
      method: 'POST',
      body: JSON.stringify(groupData),
    });
  },

  // Update a group
  async updateGroup(groupId: string, groupData: UpdateUserGroupInput): Promise<{ message: string; groupName: string }> {
    return apiCall(`/admin/groups/${groupId}`, {
      method: 'PUT',
      body: JSON.stringify(groupData),
    });
  },

  // Delete a group
  async deleteGroup(groupId: string): Promise<{ message: string; groupName: string }> {
    return apiCall(`/admin/groups/${groupId}`, {
      method: 'DELETE',
    });
  },
};

// Mock API for development (when Lambda is not available)
export const mockUserApi = {
  async getUsers(): Promise<{ users: User[]; paginationToken?: string; count: number }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockUsers: User[] = [
      {
        id: '1',
        username: 'admin@healthcare.org',
        email: 'admin@healthcare.org',
        firstName: 'Admin',
        lastName: 'User',
        status: 'CONFIRMED',
        enabled: true,
        groups: ['Admin'],
        attributes: {
          email: 'admin@healthcare.org',
          email_verified: true,
          given_name: 'Admin',
          family_name: 'User',
          sub: '1'
        },
        createdAt: '2024-01-01T00:00:00Z',
        lastModifiedAt: '2024-01-01T00:00:00Z',
        lastSignIn: '2024-01-15T10:30:00Z',
        mfaEnabled: true,
        userStatus: 'CONFIRMED'
      },
      {
        id: '2',
        username: 'hr.manager@healthcare.org',
        email: 'hr.manager@healthcare.org',
        firstName: 'HR',
        lastName: 'Manager',
        status: 'CONFIRMED',
        enabled: true,
        groups: ['HR', 'Manager'],
        attributes: {
          email: 'hr.manager@healthcare.org',
          email_verified: true,
          given_name: 'HR',
          family_name: 'Manager',
          sub: '2'
        },
        createdAt: '2024-01-02T00:00:00Z',
        lastModifiedAt: '2024-01-02T00:00:00Z',
        lastSignIn: '2024-01-15T09:15:00Z',
        mfaEnabled: false,
        userStatus: 'CONFIRMED'
      },
      {
        id: '3',
        username: 'compensation@healthcare.org',
        email: 'compensation@healthcare.org',
        firstName: 'Compensation',
        lastName: 'Specialist',
        status: 'CONFIRMED',
        enabled: true,
        groups: ['Compensation'],
        attributes: {
          email: 'compensation@healthcare.org',
          email_verified: true,
          given_name: 'Compensation',
          family_name: 'Specialist',
          sub: '3'
        },
        createdAt: '2024-01-03T00:00:00Z',
        lastModifiedAt: '2024-01-03T00:00:00Z',
        lastSignIn: '2024-01-14T16:45:00Z',
        mfaEnabled: false,
        userStatus: 'CONFIRMED'
      }
    ];

    return {
      users: mockUsers,
      count: mockUsers.length
    };
  },

  async createUser(userData: CreateUserInput): Promise<{ message: string; user: User }> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: userData.username,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      status: 'UNCONFIRMED',
      enabled: true,
      groups: userData.groups || [],
      attributes: {
        email: userData.email,
        email_verified: false,
        given_name: userData.firstName,
        family_name: userData.lastName,
        sub: Math.random().toString(36).substr(2, 9)
      },
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      mfaEnabled: false,
      userStatus: 'UNCONFIRMED'
    };

    return {
      message: 'User created successfully',
      user: newUser
    };
  },

  async updateUser(userId: string, userData: UpdateUserInput): Promise<{ message: string; userId: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      message: 'User updated successfully',
      userId: userId
    };
  },

  async deleteUser(userId: string): Promise<{ message: string; userId: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      message: 'User deleted successfully',
      userId: userId
    };
  },

  async bulkOperation(operation: BulkUserOperation): Promise<{
    message: string;
    results: Array<{ userId: string; success: boolean; error?: string }>;
    totalProcessed: number;
    successful: number;
    failed: number;
  }> {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const results = operation.userIds.map(userId => ({
      userId,
      success: Math.random() > 0.1, // 90% success rate for demo
      error: Math.random() > 0.9 ? 'Simulated error' : undefined
    }));

    return {
      message: `Bulk ${operation.operation} completed`,
      results,
      totalProcessed: operation.userIds.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    };
  }
};

export const mockGroupApi = {
  async getGroups(): Promise<{ groups: UserGroup[]; count: number }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockGroups: UserGroup[] = [
      {
        id: 'Admin',
        name: 'Admin',
        description: 'Administrators with full system access',
        precedence: 1,
        createdAt: '2024-01-01T00:00:00Z',
        lastModifiedAt: '2024-01-01T00:00:00Z',
        userCount: 1,
        permissions: ['canManageUsers', 'canManageGroups', 'canViewAuditLogs', 'canAccessAdmin']
      },
      {
        id: 'HR',
        name: 'HR',
        description: 'Human Resources team members',
        precedence: 2,
        createdAt: '2024-01-02T00:00:00Z',
        lastModifiedAt: '2024-01-02T00:00:00Z',
        userCount: 1,
        permissions: ['canManageTemplates', 'canManageProviders', 'canGenerateContracts']
      },
      {
        id: 'Manager',
        name: 'Manager',
        description: 'Department managers',
        precedence: 3,
        createdAt: '2024-01-03T00:00:00Z',
        lastModifiedAt: '2024-01-03T00:00:00Z',
        userCount: 1,
        permissions: ['canManageTemplates', 'canManageProviders', 'canGenerateContracts', 'canOverrideFMV']
      },
      {
        id: 'Compensation',
        name: 'Compensation',
        description: 'Compensation specialists',
        precedence: 4,
        createdAt: '2024-01-04T00:00:00Z',
        lastModifiedAt: '2024-01-04T00:00:00Z',
        userCount: 1,
        permissions: ['canManageTemplates', 'canManageProviders', 'canGenerateContracts']
      }
    ];

    return {
      groups: mockGroups,
      count: mockGroups.length
    };
  },

  async createGroup(groupData: CreateUserGroupInput): Promise<{ message: string; group: UserGroup }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newGroup: UserGroup = {
      id: groupData.name,
      name: groupData.name,
      description: groupData.description,
      precedence: groupData.precedence || 5,
      createdAt: new Date().toISOString(),
      lastModifiedAt: new Date().toISOString(),
      userCount: 0,
      permissions: groupData.permissions || []
    };

    return {
      message: 'Group created successfully',
      group: newGroup
    };
  },

  async updateGroup(groupId: string, groupData: UpdateUserGroupInput): Promise<{ message: string; groupName: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      message: 'Group updated successfully',
      groupName: groupId
    };
  },

  async deleteGroup(groupId: string): Promise<{ message: string; groupName: string }> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      message: 'Group deleted successfully',
      groupName: groupId
    };
  }
};

// Export the appropriate API based on environment
export const adminApi = {
  users: process.env.NODE_ENV === 'development' ? mockUserApi : userApi,
  groups: process.env.NODE_ENV === 'development' ? mockGroupApi : groupApi,
}; 