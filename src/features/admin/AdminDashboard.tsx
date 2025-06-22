import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { generateClient } from 'aws-amplify/api';
import { listProviders, listTemplates, listAuditLogs } from '../../graphql/queries';
import { deleteProvider } from '../../graphql/mutations';
import { toast } from 'sonner';
import { useDispatch, useSelector } from 'react-redux';
import { clearAllProviders } from '../../store/slices/providerSlice';
import { RootState } from '../../store';
import { awsBulkOperations } from '../../utils/awsServices';
import { CachePerformanceDashboard } from '../../components/ui/CachePerformanceDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { Users, FileText, Activity, Trash2, BarChart3 } from 'lucide-react';

const client = generateClient();

interface AdminStats {
  totalProviders: number;
  totalTemplates: number;
  totalAuditLogs: number;
  lastAuditAction: string;
  lastAuditTime: string;
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  const dispatch = useDispatch();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cache'>('overview');
  
  const { loadingAction, clearProgress, clearTotal } = useSelector((state: RootState) => ({
    loadingAction: state.provider.loadingAction,
    clearProgress: state.provider.clearProgress,
    clearTotal: state.provider.clearTotal,
  }));
  
  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    }
  }, [isAdmin]);

  const loadAdminStats = async () => {
    try {
      setIsLoading(true);
      
      const providerCount = await awsBulkOperations.countAllProviders();
      
      // Get template count
      const templatesResult = await client.graphql({
        query: listTemplates,
        variables: { limit: 1 }
      });
      
      // Get audit logs
      const auditResult = await client.graphql({
        query: listAuditLogs,
        variables: { limit: 10 }
      });
      
      const lastAudit = auditResult.data.listAuditLogs.items[0];
      
      setStats({
        totalProviders: providerCount,
        totalTemplates: templatesResult.data.listTemplates.items.length,
        totalAuditLogs: auditResult.data.listAuditLogs.items.length,
        lastAuditAction: lastAudit?.action || 'None',
        lastAuditTime: lastAudit?.timestamp || 'None'
      });
    } catch (error) {
      console.error('Error loading admin stats:', error);
      toast.error('Failed to load admin statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllProviders = async () => {
    if (deleteConfirmation !== 'DELETE ALL') {
      toast.error('Please type "DELETE ALL" to confirm');
      return;
    }

    try {
      await dispatch(clearAllProviders() as any);
      toast.success('All providers have been deleted');
      setShowDeleteDialog(false);
      setDeleteConfirmation('');
      loadAdminStats(); // Refresh stats
    } catch (error) {
      console.error('Error deleting providers:', error);
      toast.error('Failed to delete providers');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-gray-600">
          Welcome, {user?.username || 'Admin'}
        </div>
      </div>

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
          onClick={() => setActiveTab('cache')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
            activeTab === 'cache'
              ? 'bg-white shadow-sm text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Cache Performance</span>
        </button>
      </div>

      {activeTab === 'overview' ? (
        <>
          {/* Stats Cards */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" message="Loading Admin Stats..." color="primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalProviders || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Registered in the system
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalTemplates || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Available templates
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats?.totalAuditLogs || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Last action: {stats?.lastAuditAction || 'None'}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                <span>Dangerous Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold text-red-600">Delete All Providers</h3>
                  <p className="text-sm text-gray-600">
                    This will permanently delete all provider data from the system.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loadingAction === 'clearing'}
                >
                  {loadingAction === 'clearing' ? (
                    <LoadingSpinner size="sm" message="Clearing..." color="white" />
                  ) : (
                    'Delete All'
                  )}
                </Button>
              </div>

              {clearProgress !== undefined && clearTotal !== undefined && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{clearProgress} / {clearTotal}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${clearProgress && clearTotal ? (clearProgress / clearTotal) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delete Confirmation Dialog */}
          {showDeleteDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold text-red-600 mb-4">
                  Confirm Deletion
                </h3>
                <p className="text-gray-600 mb-4">
                  This action cannot be undone. All provider data will be permanently deleted.
                </p>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Type 'DELETE ALL' to confirm"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  />
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowDeleteDialog(false);
                        setDeleteConfirmation('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAllProviders}
                      disabled={deleteConfirmation !== 'DELETE ALL'}
                      className="flex-1"
                    >
                      Delete All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <CachePerformanceDashboard />
      )}
    </div>
  );
} 