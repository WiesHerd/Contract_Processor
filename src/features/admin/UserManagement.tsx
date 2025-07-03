import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { 
  fetchUsers, 
  fetchUserGroups, 
  createUser, 
  updateUser, 
  deleteUser, 
  bulkUserOperation,
  setFilters,
  setSelectedUsers,
  clearError
} from '@/store/slices/userSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  UserPlus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  Download, 
  Upload,
  Shield,
  UserCheck,
  UserX,
  MoreHorizontal,
  Plus
} from 'lucide-react';
import { User, UserGroup, CreateUserInput, UpdateUserInput } from '@/types/user';
import { toast } from 'sonner';

interface UserFormData {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password: string;
  groups: string[];
  enabled: boolean;
}

const UserManagement: React.FC = () => {
  const dispatch: AppDispatch = useDispatch();
  const { 
    users, 
    userGroups, 
    loading, 
    error, 
    filters, 
    selectedUsers,
    bulkOperationInProgress,
    bulkOperationProgress 
  } = useSelector((state: RootState) => state.users);

  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showBulkOperationsModal, setShowBulkOperationsModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<string>('');
  const [userFormData, setUserFormData] = useState<UserFormData>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    password: '',
    groups: [],
    enabled: true,
  });

  // Load data on component mount
  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchUserGroups());
  }, [dispatch]);

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || user.status === statusFilter;
    const matchesGroup = !groupFilter || user.groups.includes(groupFilter);
    
    return matchesSearch && matchesStatus && matchesGroup;
  });

  const handleCreateUser = async () => {
    try {
      const userData: CreateUserInput = {
        username: userFormData.username,
        email: userFormData.email,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        phoneNumber: userFormData.phoneNumber,
        password: userFormData.password,
        groups: userFormData.groups,
        sendInvitation: true,
      };

      await dispatch(createUser(userData)).unwrap();
      setShowCreateUserModal(false);
      resetUserForm();
      toast.success('User created successfully');
    } catch (error) {
      toast.error(`Failed to create user: ${error}`);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const userData: UpdateUserInput = {
        id: editingUser.id,
        firstName: userFormData.firstName,
        lastName: userFormData.lastName,
        phoneNumber: userFormData.phoneNumber,
        enabled: userFormData.enabled,
        groups: userFormData.groups,
      };

      await dispatch(updateUser(userData)).unwrap();
      setShowEditUserModal(false);
      setEditingUser(null);
      resetUserForm();
      toast.success('User updated successfully');
    } catch (error) {
      toast.error(`Failed to update user: ${error}`);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      await dispatch(deleteUser(userId)).unwrap();
      toast.success('User deleted successfully');
    } catch (error) {
      toast.error(`Failed to delete user: ${error}`);
    }
  };

  const handleBulkOperation = async (operation: 'enable' | 'disable' | 'delete' | 'addToGroup' | 'removeFromGroup', groupName?: string) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    try {
      await dispatch(bulkUserOperation({
        userIds: selectedUsers,
        operation,
        groupName,
      })).unwrap();
      
      setShowBulkOperationsModal(false);
      dispatch(setSelectedUsers([]));
      toast.success(`Bulk ${operation} completed successfully`);
    } catch (error) {
      toast.error(`Failed to perform bulk operation: ${error}`);
    }
  };

  const resetUserForm = () => {
    setUserFormData({
      username: '',
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      password: '',
      groups: [],
      enabled: true,
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setUserFormData({
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phoneNumber: user.attributes.phone_number || '',
      password: '',
      groups: user.groups,
      enabled: user.enabled,
    });
    setShowEditUserModal(true);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      dispatch(setSelectedUsers(filteredUsers.map(user => user.id)));
    } else {
      dispatch(setSelectedUsers([]));
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      dispatch(setSelectedUsers([...selectedUsers, userId]));
    } else {
      dispatch(setSelectedUsers(selectedUsers.filter(id => id !== userId)));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      CONFIRMED: { color: 'bg-green-100 text-green-800', text: 'Active' },
      UNCONFIRMED: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      ARCHIVED: { color: 'bg-gray-100 text-gray-800', text: 'Archived' },
      COMPROMISED: { color: 'bg-red-100 text-red-800', text: 'Compromised' },
      RESET_REQUIRED: { color: 'bg-orange-100 text-orange-800', text: 'Reset Required' },
      FORCE_CHANGE_PASSWORD: { color: 'bg-purple-100 text-purple-800', text: 'Force Change' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.UNCONFIRMED;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner 
          size="lg" 
          message="Loading User Management..." 
          color="primary"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage users and user groups for your organization</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={() => setShowBulkOperationsModal(true)}
            disabled={selectedUsers.length === 0}
          >
            <MoreHorizontal className="w-4 h-4 mr-2" />
            Bulk Operations ({selectedUsers.length})
          </Button>
          <Button onClick={() => setShowCreateUserModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'groups'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Groups ({userGroups.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All statuses</SelectItem>
                      <SelectItem value="CONFIRMED">Active</SelectItem>
                      <SelectItem value="UNCONFIRMED">Pending</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                      <SelectItem value="COMPROMISED">Compromised</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Group</label>
                  <Select value={groupFilter} onValueChange={setGroupFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All groups</SelectItem>
                      {userGroups.map(group => (
                        <SelectItem key={group.id} value={group.name}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('');
                      setGroupFilter('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Users ({filteredUsers.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3">
                        <Checkbox
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Email</th>
                      <th className="text-left p-3 font-medium">Status</th>
                      <th className="text-left p-3 font-medium">Groups</th>
                      <th className="text-left p-3 font-medium">Last Sign In</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr key={user.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">
                          <Checkbox
                            checked={selectedUsers.includes(user.id)}
                            onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                          />
                        </td>
                        <td className="p-3">
                          <div>
                            <div className="font-medium">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : user.username
                              }
                            </div>
                            <div className="text-sm text-gray-500">@{user.username}</div>
                          </div>
                        </td>
                        <td className="p-3">{user.email}</td>
                        <td className="p-3">{getStatusBadge(user.status)}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {user.groups.map(group => (
                              <Badge key={group} variant="secondary" className="text-xs">
                                {group}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-500">
                          {user.lastSignIn 
                            ? new Date(user.lastSignIn).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="p-3">
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditModal(user)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>User Groups</CardTitle>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userGroups.map(group => (
                  <Card key={group.id} className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{group.name}</h3>
                      <Badge variant="secondary">{group.userCount} users</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {group.permissions.map(permission => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create User Modal */}
      <Dialog open={showCreateUserModal} onOpenChange={setShowCreateUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <Input
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                placeholder="Enter username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="Enter email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <Input
                  value={userFormData.firstName}
                  onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Input
                  value={userFormData.lastName}
                  onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <Input
                value={userFormData.phoneNumber}
                onChange={(e) => setUserFormData({ ...userFormData, phoneNumber: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Groups</label>
              <Select
                value={userFormData.groups[0] || ''}
                onValueChange={(value) => setUserFormData({ ...userFormData, groups: value ? [value] : [] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {userGroups.map(group => (
                    <SelectItem key={group.id} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowCreateUserModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateUser}>
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditUserModal} onOpenChange={setShowEditUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name</label>
                <Input
                  value={userFormData.firstName}
                  onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name</label>
                <Input
                  value={userFormData.lastName}
                  onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <Input
                value={userFormData.phoneNumber}
                onChange={(e) => setUserFormData({ ...userFormData, phoneNumber: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Groups</label>
              <Select
                value={userFormData.groups[0] || ''}
                onValueChange={(value) => setUserFormData({ ...userFormData, groups: value ? [value] : [] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select group" />
                </SelectTrigger>
                <SelectContent>
                  {userGroups.map(group => (
                    <SelectItem key={group.id} value={group.name}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={userFormData.enabled}
                onCheckedChange={(checked) => setUserFormData({ ...userFormData, enabled: checked as boolean })}
              />
              <label className="text-sm font-medium">User is enabled</label>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setShowEditUserModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateUser}>
                Update User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Operations Modal */}
      <Dialog open={showBulkOperationsModal} onOpenChange={setShowBulkOperationsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Operations ({selectedUsers.length} users)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleBulkOperation('enable')}
                disabled={bulkOperationInProgress}
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Enable Users
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkOperation('disable')}
                disabled={bulkOperationInProgress}
              >
                <UserX className="w-4 h-4 mr-2" />
                Disable Users
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => handleBulkOperation('addToGroup', 'Admin')}
                disabled={bulkOperationInProgress}
              >
                <Shield className="w-4 h-4 mr-2" />
                Add to Admin
              </Button>
              <Button
                variant="outline"
                onClick={() => handleBulkOperation('removeFromGroup', 'Admin')}
                disabled={bulkOperationInProgress}
              >
                <Shield className="w-4 h-4 mr-2" />
                Remove from Admin
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={() => handleBulkOperation('delete')}
              disabled={bulkOperationInProgress}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Users
            </Button>
            {bulkOperationInProgress && bulkOperationProgress && (
              <div className="text-sm text-gray-600">
                Progress: {bulkOperationProgress.completed} / {bulkOperationProgress.total}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement; 