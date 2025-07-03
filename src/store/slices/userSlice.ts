import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { 
  User, 
  UserGroup, 
  CreateUserInput, 
  UpdateUserInput, 
  CreateUserGroupInput, 
  UpdateUserGroupInput,
  UserFilters,
  UserGroupFilters,
  BulkUserOperation,
  UserActivity
} from '@/types/user';
import { logAdminEvent } from './auditSlice';
import { adminApi } from '@/services/adminApi';

interface UserState {
  users: User[];
  userGroups: UserGroup[];
  userActivity: UserActivity[];
  loading: boolean;
  error: string | null;
  filters: UserFilters;
  groupFilters: UserGroupFilters;
  selectedUsers: string[];
  selectedGroups: string[];
  bulkOperationInProgress: boolean;
  bulkOperationProgress: { completed: number; total: number } | null;
}

const initialState: UserState = {
  users: [],
  userGroups: [],
  userActivity: [],
  loading: false,
  error: null,
  filters: {},
  groupFilters: {},
  selectedUsers: [],
  selectedGroups: [],
  bulkOperationInProgress: false,
  bulkOperationProgress: null,
};

// Async thunks for user operations
export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async (_, { dispatch }) => {
    try {
      const result = await adminApi.users.getUsers();
      
      dispatch(logAdminEvent({
        action: 'FETCH_USERS',
        details: `Fetched ${result.users.length} users`,
        resourceType: 'USER',
        metadata: { count: result.users.length }
      }));
      
      return result.users;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error}`);
    }
  }
);

export const createUser = createAsyncThunk(
  'users/createUser',
  async (userData: CreateUserInput, { dispatch }) => {
    try {
      const result = await adminApi.users.createUser(userData);
      
      dispatch(logAdminEvent({
        action: 'CREATE_USER',
        details: `Created user ${userData.email}`,
        resourceType: 'USER',
        resourceId: result.user.id,
        metadata: { email: userData.email, groups: userData.groups }
      }));
      
      return result.user;
    } catch (error) {
      throw new Error(`Failed to create user: ${error}`);
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/updateUser',
  async (userData: UpdateUserInput, { dispatch }) => {
    try {
      const result = await adminApi.users.updateUser(userData.id, userData);
      
      dispatch(logAdminEvent({
        action: 'UPDATE_USER',
        details: `Updated user ${userData.id}`,
        resourceType: 'USER',
        resourceId: userData.id,
        metadata: { changes: userData }
      }));
      
      // Return the updated user data for state update
      return { ...userData };
    } catch (error) {
      throw new Error(`Failed to update user: ${error}`);
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/deleteUser',
  async (userId: string, { dispatch }) => {
    try {
      await adminApi.users.deleteUser(userId);
      
      dispatch(logAdminEvent({
        action: 'DELETE_USER',
        details: `Deleted user ${userId}`,
        resourceType: 'USER',
        resourceId: userId
      }));
      
      return userId;
    } catch (error) {
      throw new Error(`Failed to delete user: ${error}`);
    }
  }
);

export const bulkUserOperation = createAsyncThunk(
  'users/bulkOperation',
  async (operation: BulkUserOperation, { dispatch }) => {
    try {
      const result = await adminApi.users.bulkOperation(operation);
      
      dispatch(logAdminEvent({
        action: `BULK_${operation.operation.toUpperCase()}`,
        details: `Bulk ${operation.operation} for ${operation.userIds.length} users`,
        resourceType: 'USER',
        metadata: { 
          userIds: operation.userIds,
          operation: operation.operation,
          groupName: operation.groupName
        }
      }));
      
      return result;
    } catch (error) {
      throw new Error(`Failed to perform bulk operation: ${error}`);
    }
  }
);

// Async thunks for user group operations
export const fetchUserGroups = createAsyncThunk(
  'users/fetchUserGroups',
  async (_, { dispatch }) => {
    try {
      const result = await adminApi.groups.getGroups();
      
      dispatch(logAdminEvent({
        action: 'FETCH_USER_GROUPS',
        details: `Fetched ${result.groups.length} user groups`,
        resourceType: 'USER_GROUP',
        metadata: { count: result.groups.length }
      }));
      
      return result.groups;
    } catch (error) {
      throw new Error(`Failed to fetch user groups: ${error}`);
    }
  }
);

export const createUserGroup = createAsyncThunk(
  'users/createUserGroup',
  async (groupData: CreateUserGroupInput, { dispatch }) => {
    try {
      const result = await adminApi.groups.createGroup(groupData);
      
      dispatch(logAdminEvent({
        action: 'CREATE_USER_GROUP',
        details: `Created user group ${groupData.name}`,
        resourceType: 'USER_GROUP',
        resourceId: result.group.id,
        metadata: { name: groupData.name, permissions: groupData.permissions }
      }));
      
      return result.group;
    } catch (error) {
      throw new Error(`Failed to create user group: ${error}`);
    }
  }
);

export const updateUserGroup = createAsyncThunk(
  'users/updateUserGroup',
  async (groupData: UpdateUserGroupInput, { dispatch }) => {
    try {
      const result = await adminApi.groups.updateGroup(groupData.id, groupData);
      
      dispatch(logAdminEvent({
        action: 'UPDATE_USER_GROUP',
        details: `Updated user group ${groupData.id}`,
        resourceType: 'USER_GROUP',
        resourceId: groupData.id,
        metadata: { changes: groupData }
      }));
      
      // Return the updated group data for state update
      return { ...groupData };
    } catch (error) {
      throw new Error(`Failed to update user group: ${error}`);
    }
  }
);

export const deleteUserGroup = createAsyncThunk(
  'users/deleteUserGroup',
  async (groupId: string, { dispatch }) => {
    try {
      await adminApi.groups.deleteGroup(groupId);
      
      dispatch(logAdminEvent({
        action: 'DELETE_USER_GROUP',
        details: `Deleted user group ${groupId}`,
        resourceType: 'USER_GROUP',
        resourceId: groupId
      }));
      
      return groupId;
    } catch (error) {
      throw new Error(`Failed to delete user group: ${error}`);
    }
  }
);

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<UserFilters>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setGroupFilters: (state, action: PayloadAction<UserGroupFilters>) => {
      state.groupFilters = { ...state.groupFilters, ...action.payload };
    },
    setSelectedUsers: (state, action: PayloadAction<string[]>) => {
      state.selectedUsers = action.payload;
    },
    setSelectedGroups: (state, action: PayloadAction<string[]>) => {
      state.selectedGroups = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
    setBulkOperationProgress: (state, action: PayloadAction<{ completed: number; total: number } | null>) => {
      state.bulkOperationProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch users
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      });

    // Create user
    builder
      .addCase(createUser.fulfilled, (state, action) => {
        state.users.push(action.payload);
      })
      .addCase(createUser.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create user';
      });

    // Update user
    builder
      .addCase(updateUser.fulfilled, (state, action) => {
        const index = state.users.findIndex(user => user.id === action.payload.id);
        if (index !== -1) {
          state.users[index] = { ...state.users[index], ...action.payload };
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update user';
      });

    // Delete user
    builder
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.users = state.users.filter(user => user.id !== action.payload);
        state.selectedUsers = state.selectedUsers.filter(id => id !== action.payload);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete user';
      });

    // Bulk operations
    builder
      .addCase(bulkUserOperation.pending, (state) => {
        state.bulkOperationInProgress = true;
        state.error = null;
      })
      .addCase(bulkUserOperation.fulfilled, (state, action) => {
        state.bulkOperationInProgress = false;
        state.bulkOperationProgress = null;
        
        // Update users based on the operation result
        if (action.payload.results) {
          action.payload.results.forEach(result => {
            if (result.success) {
              const userIndex = state.users.findIndex(user => user.id === result.userId);
              if (userIndex !== -1) {
                // Update user based on operation type
                const user = state.users[userIndex];
                // Note: We need to get the operation type from the original action
                // For now, we'll handle this in the component that dispatches the action
              }
            }
          });
        }
      })
      .addCase(bulkUserOperation.rejected, (state, action) => {
        state.bulkOperationInProgress = false;
        state.bulkOperationProgress = null;
        state.error = action.error.message || 'Failed to perform bulk operation';
      });

    // Fetch user groups
    builder
      .addCase(fetchUserGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.userGroups = action.payload;
      })
      .addCase(fetchUserGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch user groups';
      });

    // Create user group
    builder
      .addCase(createUserGroup.fulfilled, (state, action) => {
        state.userGroups.push(action.payload);
      })
      .addCase(createUserGroup.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to create user group';
      });

    // Update user group
    builder
      .addCase(updateUserGroup.fulfilled, (state, action) => {
        const index = state.userGroups.findIndex(group => group.id === action.payload.id);
        if (index !== -1) {
          state.userGroups[index] = { ...state.userGroups[index], ...action.payload };
        }
      })
      .addCase(updateUserGroup.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update user group';
      });

    // Delete user group
    builder
      .addCase(deleteUserGroup.fulfilled, (state, action) => {
        state.userGroups = state.userGroups.filter(group => group.id !== action.payload);
        state.selectedGroups = state.selectedGroups.filter(id => id !== action.payload);
      })
      .addCase(deleteUserGroup.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to delete user group';
      });
  },
});

export const {
  setFilters,
  setGroupFilters,
  setSelectedUsers,
  setSelectedGroups,
  clearError,
  setBulkOperationProgress,
} = userSlice.actions;

export default userSlice.reducer; 