import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Activity, UserPlus } from 'lucide-react';
import UserManagement from './UserManagement';
import { listCognitoUsers } from '@/services/cognitoAdminService';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface User {
  Username: string;
  Attributes: Array<{ Name: string; Value: string }>;
  Enabled: boolean;
  UserStatus: string;
  groups?: string[];
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<'users' | 'activity'>('users');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const usersData = await listCognitoUsers();
      // Fetch groups for each user from backend
      const usersWithGroups = await Promise.all(
        usersData.map(async (user: any) => {
          try {
            const response = await fetch(`http://localhost:4000/api/users/${user.Username}/groups`);
            if (response.ok) {
              const groups = await response.json();
              return { ...user, groups: groups.groups || [] };
            }
          } catch (err) {
            console.warn(`Failed to fetch groups for user ${user.Username}:`, err);
          }
          return { ...user, groups: [] };
        })
      );
      setUsers(usersWithGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRefresh = () => {
    fetchUsers();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-gray-600">Loading user management...</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-2xl font-bold text-gray-900">{section === 'users' ? 'User Management' : 'Activity Log'}</CardTitle>
        <Select value={section} onValueChange={val => setSection(val as 'users' | 'activity')}>
          <SelectTrigger id="section-select" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="users">User Management</SelectItem>
            <SelectItem value="activity">Activity Log</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <div className="border-b" />
      <CardContent className="pt-6">
        {error && (
          <Alert className="border-red-200 bg-red-50 mb-4">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        <UserManagement users={users} onRefresh={handleRefresh} section={section} setSection={setSection} />
      </CardContent>
    </Card>
  );
};

export default AdminDashboard; 