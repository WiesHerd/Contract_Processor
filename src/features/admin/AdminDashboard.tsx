import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { generateClient } from 'aws-amplify/api';
import { listProviders, listTemplates, listAuditLogs } from '../../graphql/queries';
import { deleteProvider } from '../../graphql/mutations';
import { toast } from 'sonner';

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
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkDeleteProgress, setBulkDeleteProgress] = useState(0);

  useEffect(() => {
    if (isAdmin) {
      loadAdminStats();
    }
  }, [isAdmin]);

  const loadAdminStats = async () => {
    try {
      setIsLoading(true);
      
      // Get provider count
      const providersResult = await client.graphql({
        query: listProviders,
        variables: { limit: 1 }
      });
      
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
        totalProviders: providersResult.data.listProviders.items.length,
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

  const handleBulkDelete = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Please type "DELETE" to confirm');
      return;
    }

    try {
      setShowDeleteDialog(false);
      setBulkDeleteProgress(0);
      
      // Get all providers
      const result = await client.graphql({
        query: listProviders,
        variables: { limit: 1000 }
      });
      
      const providers = result.data.listProviders.items;
      const total = providers.length;
      
      if (total === 0) {
        toast.info('No providers to delete');
        return;
      }
      
      // Delete in batches
      const batchSize = 25;
      let deleted = 0;
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = providers.slice(i, i + batchSize);
        
        // Delete each provider in the batch
        for (const provider of batch) {
          try {
            await client.graphql({
              query: deleteProvider,
              variables: { input: { id: provider.id } }
            });
            deleted++;
            setBulkDeleteProgress((deleted / total) * 100);
          } catch (error) {
            console.error(`Failed to delete provider ${provider.id}:`, error);
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      toast.success(`Successfully deleted ${deleted} providers`);
      setBulkDeleteProgress(0);
      loadAdminStats(); // Refresh stats
      
    } catch (error) {
      console.error('Error during bulk delete:', error);
      toast.error('Failed to complete bulk delete operation');
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page. Admin privileges are required.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">System administration and bulk operations</p>
        </div>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
          Admin Access
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Providers</h3>
          <p className="text-sm text-gray-600 mb-2">Total provider records</p>
          <div className="text-2xl font-bold text-blue-600">
            {isLoading ? '...' : stats?.totalProviders || 0}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Templates</h3>
          <p className="text-sm text-gray-600 mb-2">Total contract templates</p>
          <div className="text-2xl font-bold text-green-600">
            {isLoading ? '...' : stats?.totalTemplates || 0}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
          <p className="text-sm text-gray-600 mb-2">System activity records</p>
          <div className="text-2xl font-bold text-purple-600">
            {isLoading ? '...' : stats?.totalAuditLogs || 0}
          </div>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Bulk Operations */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Bulk Operations</h2>
        <p className="text-sm text-gray-600 mb-6">Dangerous operations - use with caution</p>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-semibold text-gray-900">Delete All Providers</h3>
              <p className="text-sm text-gray-600">
                Permanently delete all provider records from the database
              </p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md font-medium transition-colors"
            >
              Delete All
            </button>
          </div>

          {bulkDeleteProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Deleting providers...</span>
                <span>{Math.round(bulkDeleteProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${bulkDeleteProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Bulk Delete</h3>
            <p className="text-gray-600 mb-4">
              This action will permanently delete ALL provider records. This cannot be undone.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="confirmation" className="block text-sm font-medium text-gray-700 mb-1">
                  Type "DELETE" to confirm:
                </label>
                <input
                  id="confirmation"
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={deleteConfirmation !== 'DELETE'}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 