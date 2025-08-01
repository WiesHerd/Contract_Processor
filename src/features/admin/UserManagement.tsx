import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, UserPlus, Mail, Shield, Users, Clock, CheckCircle, AlertCircle, Filter, Search, Loader2, Key, Settings, Plus, XCircle } from 'lucide-react';
import { deleteCognitoUser, createCognitoUser, listCognitoUsers, listCognitoGroups, updateUserRoles, resendInvitation, resetUserPassword } from '@/services/cognitoAdminService';
import { useToast } from '@/hooks/useToast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
  Username: string;
  Attributes: Array<{ Name: string; Value: string }>;
  Enabled: boolean;
  UserStatus: string;
  groups: string[];
}

interface Role {
  GroupName: string;
  Description?: string;
  Precedence?: number;
}

interface UserManagementProps {
  onRefresh: () => void;
  showCreateUserModal: boolean;
  setShowCreateUserModal: (show: boolean) => void;
}

interface UserCreationLog {
  id: string;
  username: string;
  email: string;
  createdBy: string;
  createdAt: string;
  temporaryPassword: string;
  status: 'created' | 'failed';
  error?: string;
  assignedGroups: string[];
  userStatus: string;
}

interface GroupInfo {
  GroupName: string;
  Description?: string;
  Precedence?: number;
  UserCount?: number;
}

const UserManagement: React.FC<UserManagementProps> = ({ onRefresh, showCreateUserModal, setShowCreateUserModal }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showInviteSentModal, setShowInviteSentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [userCreationResult, setUserCreationResult] = useState<any>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userCreationLogs, setUserCreationLogs] = useState<UserCreationLog[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [groupInfo, setGroupInfo] = useState<GroupInfo[]>([]);
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    groups: [] as string[]
  });

  // Load user creation logs from localStorage
  useEffect(() => {
    const logs = localStorage.getItem('userCreationLogs');
    if (logs) {
      setUserCreationLogs(JSON.parse(logs));
    }
  }, []);

  // Save user creation logs to localStorage
  const saveUserCreationLog = (log: UserCreationLog) => {
    const updatedLogs = [...userCreationLogs, log];
    setUserCreationLogs(updatedLogs);
    localStorage.setItem('userCreationLogs', JSON.stringify(updatedLogs));
  };

  // Enhanced group management
  const fetchGroupInfo = async () => {
    try {
      const groups = await listCognitoGroups();
      const groupInfoWithCounts = await Promise.all(
        groups.map(async (group) => {
          try {
            // Get user count for each group (this would need to be implemented)
            return {
              GroupName: group.GroupName,
              Description: group.Description,
              Precedence: group.Precedence,
              UserCount: 0 // TODO: Implement user count per group
            };
          } catch (error) {
            return {
              GroupName: group.GroupName,
              Description: group.Description,
              Precedence: group.Precedence,
              UserCount: 0
            };
          }
        })
      );
      setGroupInfo(groupInfoWithCounts);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching users...');
      
      const usersData = await listCognitoUsers();
      console.log('✅ Users fetched:', usersData.length);
      
      // Enhanced user data processing
      const processedUsers = usersData.map(user => ({
        ...user,
        // Ensure groups is always an array
        groups: user.groups || []
      }));
      
      setUsers(processedUsers);
      console.log('📊 Processed users:', processedUsers.map(u => ({
        username: u.Username,
        email: getUserEmail(u),
        status: u.UserStatus,
        groups: u.groups
      })));
      
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      showError('Failed to Load Users', error instanceof Error ? error.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced refresh function
  const handleRefresh = async () => {
    console.log('🔄 Manual refresh triggered');
    await fetchUsers();
    await fetchRoles();
    await fetchGroupInfo();
  };

  // Auto-refresh when component mounts or when users change
  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchGroupInfo();
  }, []);

  // Helper functions - moved to top to avoid hoisting issues
  const getUserEmail = (user: User) => {
    return user.Attributes.find(attr => attr.Name === 'email')?.Value || 'No email';
  };

  const getUserName = (user: User) => {
    const firstName = user.Attributes.find(attr => attr.Name === 'given_name')?.Value || '';
    const lastName = user.Attributes.find(attr => attr.Name === 'family_name')?.Value || '';
    return firstName && lastName ? `${firstName} ${lastName}` : user.Username;
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const fetchedRoles = await listCognitoGroups();
      setRoles(fetchedRoles);
    } catch (err) {
      console.error('❌ Error fetching roles:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch roles';
      showError('Failed to Load Roles', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`Are you sure you want to delete user ${username}?`)) return;
    
    try {
      setLoading(true);
      await deleteCognitoUser(username);
      showSuccess('User Deleted', `User ${username} deleted successfully`);
      fetchUsers(); // Refresh the list
    } catch (err) {
      console.error('❌ Error deleting user:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      showError('Failed to Delete User', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleManageRoles = (user: User) => {
    setSelectedUser(user);
    setSelectedRoles(user.groups || []);
    setShowRoleModal(true);
  };

  const handleSaveRoles = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      
      console.log(`👥 Updating roles for user ${selectedUser.Username}:`, selectedRoles);
      
      // Use the real role management function
      await updateUserRoles(selectedUser.Username, selectedRoles);
      
      showSuccess(`User roles updated successfully for ${selectedUser.Username}`);
      showSuccess('Roles Updated', `User roles updated successfully for ${selectedUser.Username}`);
      setShowRoleModal(false);
      fetchUsers(); // Refresh user list to get updated roles
    } catch (err) {
      console.error('❌ Error updating user roles:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update user roles';
      showError('Failed to Update Roles', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.firstName || !newUser.lastName) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }
    
    try {
      setLoading(true);
      
      // Use the real create function
      const selectedGroups = newUser.groups; // Direct array, not object keys
      
      console.log('👤 Creating user with groups:', selectedGroups);
      
      const result = await createCognitoUser(
        newUser.username,
        newUser.email,
        newUser.firstName,
        newUser.lastName,
        selectedGroups
      );
      
      console.log('✅ User creation result:', result);
      
      // Enhanced success feedback with email status
      setUserCreationResult(result);
      setShowInviteSentModal(true);
      showSuccess(`User ${newUser.username} created successfully`);
      
      // Log the user creation with enhanced details
      const creationLog: UserCreationLog = {
        id: Date.now().toString(),
        username: newUser.username,
        email: newUser.email,
        createdBy: 'Admin', // TODO: Get actual admin username
        createdAt: new Date().toISOString(),
        temporaryPassword: result.tempPassword || 'Not provided',
        status: 'created',
        assignedGroups: selectedGroups,
        userStatus: 'FORCE_CHANGE_PASSWORD'
      };
      saveUserCreationLog(creationLog);
      
      // Create detailed success message with email status
      let successMessage = `User ${newUser.username} has been created and added to the system.\n\n`;
      successMessage += `Login Instructions:\n`;
      successMessage += `Username: ${newUser.username}\n`;
      successMessage += `Temporary Password: ${result.tempPassword}\n\n`;
      
      // Add group assignment information
      if (selectedGroups.length > 0) {
        successMessage += `Assigned Groups: ${selectedGroups.join(', ')}\n\n`;
      } else {
        successMessage += `No groups assigned (default user permissions)\n\n`;
      }
      
      // Add email status information
      if (result.emailResult) {
        if (result.emailResult.success) {
          successMessage += `✅ Welcome email sent successfully via SES\n`;
          successMessage += `Message ID: ${result.emailResult.messageId}\n`;
        } else {
          successMessage += `⚠️ SES email failed: ${result.emailResult.error}\n`;
          successMessage += `📧 Cognito will send automatic welcome email\n`;
        }
      }
      
      if (result.emailResult && !result.emailResult.success) {
        successMessage += `\nEmail Status:\n`;
        successMessage += `- Email sent: ${result.emailResult.success ? '✅' : '❌'}\n`;
        successMessage += `- Error: ${result.emailResult.error || 'None'}\n`;
      }
      
      console.log('📋 Success Details:', successMessage);
      
      // Refresh data
      await fetchUsers();
      await fetchRoles();
      await fetchGroupInfo();
      
      // Reset form
      setNewUser({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        groups: []
      });
      
      // Show success message with user details
      showSuccess('User Created Successfully', `User ${newUser.username} has been created and added to the system.`);
      
    } catch (error: any) {
      console.error('❌ Error creating user:', error);
      showError('Failed to Create User', error instanceof Error ? error.message : 'Failed to create user');
      
      // Log the failed creation
      const creationLog: UserCreationLog = {
        id: Date.now().toString(),
        username: newUser.username,
        email: newUser.email,
        createdBy: 'Admin',
        createdAt: new Date().toISOString(),
        temporaryPassword: '',
        status: 'failed',
        error: error.message,
        assignedGroups: [],
        userStatus: 'FAILED'
      };
      saveUserCreationLog(creationLog);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (username: string) => {
    if (!window.confirm(`Resend invitation to ${username}?`)) return;
    
    try {
      setLoading(true);
      const result = await resendInvitation(username);
      showSuccess('Invitation Sent', result.message);
      setShowInviteSentModal(true);
    } catch (err) {
      console.error('❌ Error resending invitation:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to resend invitation';
      showError('Failed to Resend Invitation', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (username: string) => {
    try {
      setLoading(true);
      const result = await resetUserPassword(username);
      showSuccess('Password Reset', `Password reset email sent to ${username}`);
      console.log('✅ Password reset result:', result);
    } catch (error: any) {
      console.error('❌ Error resetting password:', error);
      showError('Password Reset Failed', error.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on current view and search
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserEmail(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(user).toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showPendingOnly) {
      return matchesSearch && user.UserStatus === 'FORCE_CHANGE_PASSWORD';
    }
    
    return matchesSearch; // Show all users, not just CONFIRMED
  });

  const pendingUsersCount = users.filter(user => 
    user.UserStatus === 'FORCE_CHANGE_PASSWORD'
  ).length;

  return (
    <div className="space-y-6">
      {/* User Creation History */}
      {userCreationLogs.length > 0 && (
        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Recent User Creation History
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {userCreationLogs.slice(-5).reverse().map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                <div className="flex items-center space-x-2">
                  {log.status === 'created' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium">{log.username}</span>
                  <span className="text-muted-foreground">({log.email})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                  {log.status === 'failed' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="w-4 h-4 text-red-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{log.error}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User List - Converted to Table Format */}
      <div className="bg-white rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.Username} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">
                            {getUserName(user).charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {getUserName(user)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {getUserEmail(user)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {user.UserStatus === 'CONFIRMED' ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : user.UserStatus === 'FORCE_CHANGE_PASSWORD' ? (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {user.UserStatus}
                        </Badge>
                      )}
                      {user.Enabled ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Enabled
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Disabled
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {user.groups && user.groups.length > 0 ? (
                        user.groups.map((group) => (
                          <Badge key={group} variant="outline" className="text-xs">
                            {group}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {/* TODO: Add creation date when available */}
                    <span>Recently</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManageRoles(user)}
                              className="h-8 w-8 p-0"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Manage Roles</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResendInvite(user.Username)}
                              className="h-8 w-8 p-0"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Resend Invite</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleResetPassword(user.Username)}
                              className="h-8 w-8 p-0"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Reset Password</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.Username)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Delete User</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No users found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || showPendingOnly 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Get started by creating a new user.'
                }
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateUserModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account. The user will receive a welcome email with temporary login credentials.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  placeholder="First name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  placeholder="Last name"
                  className="mt-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="username" className="text-sm font-medium">
                Username <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                placeholder="john.doe"
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@company.com"
                className="mt-1"
              />
            </div>
            
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Assign Roles</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {roles.map((role) => (
                  <div key={role.GroupName} className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`create-role-${role.GroupName}`}
                      checked={newUser.groups.includes(role.GroupName)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewUser({
                            ...newUser,
                            groups: [...newUser.groups, role.GroupName]
                          });
                        } else {
                          setNewUser({
                            ...newUser,
                            groups: newUser.groups.filter(g => g !== role.GroupName)
                          });
                        }
                      }}
                      className="rounded border-gray-300 h-4 w-4"
                    />
                    <Label htmlFor={`create-role-${role.GroupName}`} className="text-sm cursor-pointer">
                      {role.GroupName}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateUserModal(false);
                setNewUser({ username: '', email: '', firstName: '', lastName: '', groups: [] });
              }}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={loading || !newUser.username || !newUser.email || !newUser.firstName || !newUser.lastName}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Management Modal */}
      <Dialog open={showRoleModal} onOpenChange={setShowRoleModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Manage User Roles
            </DialogTitle>
            <DialogDescription>
              Assign roles to {selectedUser?.Username}. Roles determine user permissions and access levels.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-3 block">Select Roles</Label>
              <div className="space-y-2">
                {roles.map((role) => (
                  <div key={role.GroupName} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`role-${role.GroupName}`}
                      checked={selectedRoles.includes(role.GroupName)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRoles([...selectedRoles, role.GroupName]);
                        } else {
                          setSelectedRoles(selectedRoles.filter(r => r !== role.GroupName));
                        }
                      }}
                      className="rounded border-gray-300 h-4 w-4"
                    />
                    <div className="flex-1">
                      <Label htmlFor={`role-${role.GroupName}`} className="text-sm font-medium cursor-pointer">
                        {role.GroupName}
                      </Label>
                      {role.Description && (
                        <p className="text-xs text-gray-500 mt-1">{role.Description}</p>
                      )}
                    </div>
                  </div>
                ))}
                {roles.length === 0 && (
                  <p className="text-sm text-gray-500 italic">No roles available</p>
                )}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleModal(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSaveRoles} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Save Roles
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Sent Successfully Modal */}
      <Dialog open={showInviteSentModal} onOpenChange={setShowInviteSentModal}>
        <DialogContent className="w-[95vw] max-w-sm sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader className="pb-3">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              User Created
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Success Icon */}
            <div className="text-center">
              <div className="mx-auto w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">User account created successfully</p>
            </div>
            
            {/* Credentials */}
            <div className="bg-gray-50 p-3 rounded border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Username:</span>
                <code className="text-xs bg-white px-2 py-1 rounded">{newUser.username}</code>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Password:</span>
                <code className="text-xs bg-white px-2 py-1 rounded">{userCreationResult?.tempPassword || 'Generated'}</code>
              </div>
            </div>
            
            {/* Email Status */}
            <div className="text-center text-sm text-gray-600">
              <p>✓ Welcome email sent</p>
              <p>✓ User can login immediately</p>
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              onClick={() => {
                setShowInviteSentModal(false);
                setShowCreateUserModal(false);
                setNewUser({ username: '', email: '', firstName: '', lastName: '', groups: [] });
                onRefresh();
              }} 
              className="bg-blue-600 hover:bg-blue-700"
              autoFocus
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement; 