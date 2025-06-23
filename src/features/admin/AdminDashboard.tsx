import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Database, 
  Settings, 
  Activity, 
  Shield, 
  AlertTriangle,
  RefreshCw,
  Trash2,
  Download,
  Upload
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_CONFIG } from '@/config/admin';
import { CachePerformanceDashboard } from '@/components/ui/CachePerformanceDashboard';

interface SystemStats {
  totalProviders: number;
  totalTemplates: number;
  totalClauses: number;
  totalAuditLogs: number;
  cacheHitRate: number;
  lastBackup: string;
  systemUptime: string;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('overview');
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalProviders: 0,
    totalTemplates: 0,
    totalClauses: 0,
    totalAuditLogs: 0,
    cacheHitRate: 0,
    lastBackup: 'Never',
    systemUptime: '0 days'
  });
  const [isLoading, setIsLoading] = useState(false);

  // Get data from Redux store
  const providers = useSelector((state: RootState) => state.provider.providers);
  const templates = useSelector((state: RootState) => state.templates.templates);
  const clauses = useSelector((state: RootState) => state.clauses.clauses);
  const auditLogs = useSelector((state: RootState) => state.audit.logs);

  useEffect(() => {
    if (isAdmin) {
      loadSystemStats();
    }
  }, [isAdmin, providers.length, templates.length, clauses.length, auditLogs.length]);

  const loadSystemStats = async () => {
    setIsLoading(true);
    try {
      // Simulate loading system stats
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSystemStats({
        totalProviders: providers.length,
        totalTemplates: templates.length,
        totalClauses: clauses.length,
        totalAuditLogs: auditLogs.length,
        cacheHitRate: Math.random() * 100,
        lastBackup: new Date().toLocaleDateString(),
        systemUptime: '7 days'
      });
    } catch (error) {
      console.error('Error loading system stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkExport = async () => {
    // Implementation for bulk export
    console.log('Bulk export initiated');
  };

  const handleSystemBackup = async () => {
    // Implementation for system backup
    console.log('System backup initiated');
  };

  const handleCacheClear = async () => {
    // Implementation for cache clearing
    console.log('Cache cleared');
  };

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have admin privileges to access this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {user?.username}. Manage your ContractEngine system.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="destructive" className="flex items-center space-x-1">
            <Shield className="h-3 w-3" />
            <span>ADMIN</span>
          </Badge>
          <Button 
            variant="outline" 
            size="sm"
            onClick={loadSystemStats}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Main Content */}
      <div className="space-y-6">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'overview'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'users'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Users</span>
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'system'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>System</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-white shadow-sm text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* System Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.totalProviders}</div>
                  <p className="text-xs text-muted-foreground">
                    Active provider records
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Templates</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.totalTemplates}</div>
                  <p className="text-xs text-muted-foreground">
                    Available contract templates
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clauses</CardTitle>
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.totalClauses}</div>
                  <p className="text-xs text-muted-foreground">
                    Dynamic contract clauses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{systemStats.totalAuditLogs}</div>
                  <p className="text-xs text-muted-foreground">
                    System activity records
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Performance Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Cache Performance</CardTitle>
                  <CardDescription>
                    System cache hit rates and performance metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CachePerformanceDashboard />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>System Health</CardTitle>
                  <CardDescription>
                    Current system status and uptime
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System Uptime</span>
                    <span className="text-sm text-muted-foreground">{systemStats.systemUptime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Backup</span>
                    <span className="text-sm text-muted-foreground">{systemStats.lastBackup}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cache Hit Rate</span>
                    <span className="text-sm text-muted-foreground">{systemStats.cacheHitRate.toFixed(1)}%</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" onClick={handleSystemBackup}>
                      <Upload className="h-4 w-4 mr-2" />
                      Backup
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCacheClear}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Clear Cache
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage user access and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{user?.username}</p>
                    <p className="text-sm text-muted-foreground">Current User</p>
                  </div>
                  <Badge variant="destructive">Admin</Badge>
                </div>
                
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    User management features require AWS Cognito integration. 
                    Contact your system administrator for user provisioning.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <Card>
            <CardHeader>
              <CardTitle>System Operations</CardTitle>
              <CardDescription>
                Perform system-wide operations and maintenance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" onClick={handleBulkExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export All Data
                </Button>
                <Button variant="outline" onClick={handleSystemBackup}>
                  <Upload className="h-4 w-4 mr-2" />
                  System Backup
                </Button>
                <Button variant="outline" onClick={handleCacheClear}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Clear Cache
                </Button>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Emergency Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Configuration</CardTitle>
              <CardDescription>
                Current admin settings and configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Admin Email Domains</h4>
                  <div className="space-y-1">
                    {ADMIN_CONFIG.adminDomains.map((domain, index) => (
                      <Badge key={index} variant="secondary" className="mr-2">
                        {domain}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <hr className="border-gray-200" />
                
                <div>
                  <h4 className="font-medium mb-2">Admin Email Addresses</h4>
                  <div className="space-y-1">
                    {ADMIN_CONFIG.adminEmails.map((email, index) => (
                      <Badge key={index} variant="outline" className="mr-2">
                        {email}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <hr className="border-gray-200" />
                
                <div>
                  <h4 className="font-medium mb-2">System Limits</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Max Bulk Delete:</span>
                      <span className="ml-2 font-medium">{ADMIN_CONFIG.maxBulkDelete}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max Bulk Export:</span>
                      <span className="ml-2 font-medium">{ADMIN_CONFIG.maxBulkExport}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Session Timeout:</span>
                      <span className="ml-2 font-medium">{ADMIN_CONFIG.adminSessionTimeout} min</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 