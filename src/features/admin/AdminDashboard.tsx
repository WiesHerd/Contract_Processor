import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Users, Activity, UserPlus, Info } from 'lucide-react';
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
  const [section, setSection] = useState<'users' | 'activity'>('users');

  const handleRefresh = () => {
    // UserManagement now handles its own data fetching
    console.log('Refresh requested');
  };

  useEffect(() => {
    // Simulate loading for the dashboard
    const timer = setTimeout(() => {
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

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
              <h1 className="text-lg font-bold text-gray-800">Admin Dashboard</h1>
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
              <Select value={section} onValueChange={val => setSection(val as 'users' | 'activity')}>
                <SelectTrigger id="section-select" className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="users">User Management</SelectItem>
                  <SelectItem value="activity">Activity Log</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <hr className="my-3 border-gray-100" />
        </div>

        {error && (
          <Alert className="border-red-200 bg-red-50 mt-4">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {section === 'users' && (
          <UserManagement onRefresh={handleRefresh} />
        )}

        {section === 'activity' && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Activity log functionality coming soon...
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 