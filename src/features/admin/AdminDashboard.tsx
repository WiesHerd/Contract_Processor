import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, UserPlus, Info, CheckCircle, Clock, Shield, User } from 'lucide-react';
import UserManagement from './UserManagement';
import { listCognitoUsers } from '@/services/cognitoAdminService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';

interface User {
  Username: string;
  Attributes: Array<{ Name: string; Value?: string }>;
  Enabled: boolean;
  UserStatus: string;
  groups?: string[];
}

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<'admin'>('admin');
  const [users, setUsers] = useState<User[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  const handleRefresh = () => {
    // UserManagement now handles its own data fetching
    console.log('Refresh requested');
  };

  // Fetch users for statistics
  const fetchUsers = async () => {
    try {
      const usersData = await listCognitoUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users for statistics:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Simulate loading for the dashboard
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Calculate user statistics
  const totalUsers = users.length;
  const confirmedUsers = users.filter(u => u.UserStatus === 'CONFIRMED').length;
  const pendingUsers = users.filter(u => u.UserStatus === 'FORCE_CHANGE_PASSWORD').length;
  const adminUsers = users.filter(u => u.groups?.includes('Admin')).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-gray-600">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">
                Admin
              </h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    Manage users, monitor system activity, and control application settings.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <Select value={section} onValueChange={val => setSection(val as 'admin')}>
                <SelectTrigger id="section-select" className="w-44">
                  <SelectValue placeholder="Admin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {section === 'admin' && (
                <Button onClick={() => setShowCreateUserModal(true)} className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              )}
            </div>
          </div>
          <hr className="my-3 border-gray-100" />
          
          {/* User Statistics Cards - Only show when Admin is selected */}
          {section === 'admin' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="flex items-center space-x-2 p-4">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Total Users</p>
                    <p className="text-2xl font-bold">{totalUsers}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center space-x-2 p-4">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Confirmed</p>
                    <p className="text-2xl font-bold">{confirmedUsers}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center space-x-2 p-4">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium">Pending</p>
                    <p className="text-2xl font-bold">{pendingUsers}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center space-x-2 p-4">
                  <Shield className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Admin Users</p>
                    <p className="text-2xl font-bold">{adminUsers}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50 mt-4">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {section === 'admin' && (
          <UserManagement onRefresh={handleRefresh} showCreateUserModal={showCreateUserModal} setShowCreateUserModal={setShowCreateUserModal} />
        )}


      </div>
    </div>
  );
};

export default AdminDashboard; 