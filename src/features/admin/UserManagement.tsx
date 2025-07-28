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
import { Trash2, UserPlus, Mail, Shield, Users, Clock, CheckCircle, AlertCircle, Filter, Search, Loader2 } from 'lucide-react';
import { deleteCognitoUser, createCognitoUser, listCognitoUsers, listCognitoGroups, updateUserRoles, resendInvitation, resetUserPassword } from '@/services/cognitoAdminService';
import { useToast } from '@/hooks/useToast';

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
}

const UserManagement: React.FC<UserManagementProps> = ({ onRefresh }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showInviteSentModal, setShowInviteSentModal] = useState(false);
  const [userCreationResult, setUserCreationResult] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  // Form states
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    groups: [] as string[],
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const fetchedUsers = await listCognitoUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('❌ Error fetching users:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      showError('Failed to Load Users', errorMessage);
    } finally {
      setLoading(false);
    }
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

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Filter users based on current view and search
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.Username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserEmail(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserName(user).toLowerCase().includes(searchTerm.toLowerCase());
    
    if (showPendingOnly) {
      return matchesSearch && user.UserStatus === 'CONFIRMED' && (!user.groups || user.groups.length === 0);
    }
    
    return matchesSearch && user.UserStatus === 'CONFIRMED';
  });

  const pendingUsersCount = users.filter(user => 
    user.UserStatus === 'CONFIRMED' && (!user.groups || user.groups.length === 0)
  ).length;

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
      
      setSuccess(`User roles updated successfully for ${selectedUser.Username}`);
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
      const selectedGroups = Object.keys(newUser.groups).filter(group => newUser.groups[group]);
      
      const result = await createCognitoUser(
        newUser.username,
        newUser.email,
        newUser.firstName,
        newUser.lastName,
        selectedGroups
      );
      
      console.log('User creation result:', result);
      
      // Show success modal with login instructions
      setUserCreationResult(result);
      setShowInviteSentModal(true);
      setSuccess(`User ${newUser.username} created successfully`);
      showSuccess('User Created', `User ${newUser.username} has been created and added to the system.\n\nLogin Instructions:\n${result.loginInstructions || `Username: ${newUser.username}\nTemporary Password: ${result.tempPassword || 'Check console for password'}`}`);
      
      // Reset form
      setNewUser({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        groups: []
      });
      
      // Refresh user list
      fetchUsers();
      
    } catch (error) {
      console.error('Error creating user:', error);
      showError('Failed to Create User', error instanceof Error ? error.message : 'Failed to create user');
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
    if (!window.confirm(`Reset password for ${username}? This will send them a temporary password.`)) return;
    try {
      setLoading(true);
      console.log(`🔐 Resetting password for ${username}...`);
      const result = await resetUserPassword(username);
      console.log(`✅ Password reset result:`, result);
      showSuccess('Password Reset', result.message);
      setShowInviteSentModal(true);
    } catch (err) {
      console.error('❌ Error resetting password:', err);
      const errorMessage = 'Failed to reset password: ' + (err instanceof Error ? err.message : 'Unknown error');
      showError('Failed to Reset Password', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getUserEmail = (user: User) => {
    return user.Attributes.find(attr => attr.Name === 'email')?.Value || 'No email';
  };

  const getUserName = (user: User) => {
    const firstName = user.Attributes.find(attr => attr.Name === 'given_name')?.Value || '';
    const lastName = user.Attributes.find(attr => attr.Name === 'family_name')?.Value || '';
    return firstName && lastName ? `${firstName} ${lastName}` : user.Username;
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          
          {/* Pending Users Toggle */}
          <div className="flex items-center gap-3">
            <Switch
              checked={showPendingOnly}
              onCheckedChange={setShowPendingOnly}
              id="pending-toggle"
            />
            <Label htmlFor="pending-toggle" className="text-sm font-medium">
              Show Pending Users Only
            </Label>
            {pendingUsersCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingUsersCount} pending
              </Badge>
            )}
          </div>
        </div>

        <div className="text-sm text-gray-500">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Pending Users Alert */}
      {showPendingOnly && pendingUsersCount > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            These users have confirmed their accounts but haven't been assigned roles yet. 
            Assign appropriate roles to grant them access to the system.
          </AlertDescription>
        </Alert>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {showPendingOnly ? 'No Pending Users' : 'No Users Found'}
                </h3>
                <p className="text-gray-500">
                  {showPendingOnly 
                    ? 'All users have been assigned appropriate roles.'
                    : searchTerm 
                      ? 'Try adjusting your search terms.'
                      : 'Create your first user to get started.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.Username} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{getUserName(user)}</h4>
                        <p className="text-sm text-gray-500">{getUserEmail(user)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={user.Enabled ? "default" : "secondary"}>
                            {user.Enabled ? 'Active' : 'Disabled'}
                          </Badge>
                          <Badge variant={user.UserStatus === 'CONFIRMED' ? "default" : "outline"}>
                            {user.UserStatus}
                          </Badge>
                          {user.groups && user.groups.length > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              {user.groups.length} role{user.groups.length !== 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-xs">
                              No roles assigned
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleManageRoles(user)} disabled={loading}>
                      <Shield className="w-4 h-4 mr-1" />
                      Manage Roles
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleResendInvite(user.Username)} disabled={loading}>
                      <Mail className="w-4 h-4 mr-1" />
                      Resend Invite
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleResetPassword(user.Username)} disabled={loading}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Reset Password
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeleteUser(user.Username)} 
                      disabled={loading} 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create User Button - Moved to top right of controls */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateUserModal(true)} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account. The user will receive a verification email and must confirm their account before signing in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="Enter first name"
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
                    placeholder="Enter last name"
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
                  placeholder="Enter username (e.g., john.doe)"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Username must be unique and will be used for login
                </p>
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
                  placeholder="Enter email address"
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  User will receive verification email at this address
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Assign Roles</Label>
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.GroupName} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
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
                    <div className="flex-1">
                      <Label htmlFor={`create-role-${role.GroupName}`} className="text-sm font-medium cursor-pointer">
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
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowCreateUserModal(false);
                setNewUser({ username: '', email: '', firstName: '', lastName: '', groups: [] });
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={loading || !newUser.username || !newUser.email || !newUser.firstName || !newUser.lastName}
              className="bg-blue-600 hover:bg-blue-700 min-w-[120px]"
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
        <DialogContent className="sm:max-w-md">
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
              <div className="space-y-3">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-lg mb-4 text-center">✅ User created successfully!</div>
            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Login Instructions for User:</h4>
                <div className="space-y-1 text-blue-800">
                  <p><strong>Username:</strong> {newUser.username}</p>
                  <p><strong>Temporary Password:</strong> {userCreationResult?.tempPassword || 'Check console for password'}</p>
                  <p className="text-xs mt-2">
                    The user should sign in with these credentials and will be forced to change their password on first login.
                  </p>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                <p>• User will receive a welcome email with login instructions</p>
                <p>• User must change password on first login</p>
                <p>• Email verification will be required after first login</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteSentModal(false)} autoFocus>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement; 