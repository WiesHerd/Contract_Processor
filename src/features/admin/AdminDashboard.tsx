import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ADMIN_CONFIG } from '@/config/admin';
import { AuditLogEntry } from '@/store/slices/auditSlice';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Download, Upload, RefreshCw, Trash2, Shield, Activity, FileText, Users, TrendingUp, AlertCircle, CheckCircle, Clock, Settings, Database, BarChart3 } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/contexts/AuthContext';
import { CachePerformanceDashboard } from '@/components/ui/CachePerformanceDashboard';
import UserManagement from './UserManagement';

interface SystemStats {
  totalProviders: number;
  totalTemplates: number;
  totalClauses: number;
  totalAuditLogs: number;
  activeUsers: number;
  systemUptime: string;
  avgResponseTime: string;
  errorRate: string;
  storageUsed: string;
  contractsGenerated: number;
  contractsGeneratedToday: number;
  failedGenerations: number;
  pendingGenerations: number;
}

interface UserActivity {
  userId: string;
  email: string;
  lastActivity: string;
  sessionDuration: string;
  actionsPerformed: number;
  status: 'active' | 'idle' | 'offline';
}

interface SecurityMetrics {
  failedLogins: number;
  suspiciousActivities: number;
  mfaEnrollments: number;
  accountLockouts: number;
  dataAccessEvents: number;
  fmvOverrides: number;
}

interface PerformanceMetrics {
  apiLatency: number;
  cacheHitRate: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  s3Operations: number;
}

interface AlertItem {
  id: string;
  type: 'security' | 'performance' | 'system' | 'data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  action?: string;
}

const AdminDashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const providers = useSelector((state: RootState) => state.provider.providers);
  const templates = useSelector((state: RootState) => state.templates.templates);
  const clauses = useSelector((state: RootState) => state.clauses.clauses);
  const auditLogs = useSelector((state: RootState) => state.audit.logs);

  // --- State Management ---
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'system' | 'activitylog' | 'performance'>('overview');
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalProviders: 0,
    totalTemplates: 0,
    totalClauses: 0,
    totalAuditLogs: 0,
    activeUsers: 0,
    systemUptime: '99.9%',
    avgResponseTime: '245ms',
    errorRate: '0.12%',
    storageUsed: '2.4GB',
    contractsGenerated: 0,
    contractsGeneratedToday: 0,
    failedGenerations: 0,
    pendingGenerations: 0,
  });

  const [userActivity, setUserActivity] = useState<UserActivity[]>([
    { userId: '1', email: 'admin@healthcare.org', lastActivity: '2 min ago', sessionDuration: '45 min', actionsPerformed: 12, status: 'active' },
    { userId: '2', email: 'hr.manager@healthcare.org', lastActivity: '5 min ago', sessionDuration: '23 min', actionsPerformed: 8, status: 'active' },
    { userId: '3', email: 'compensation@healthcare.org', lastActivity: '15 min ago', sessionDuration: '1h 12m', actionsPerformed: 15, status: 'idle' },
  ]);

  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics>({
    failedLogins: 3,
    suspiciousActivities: 1,
    mfaEnrollments: 8,
    accountLockouts: 0,
    dataAccessEvents: 156,
    fmvOverrides: 2,
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    apiLatency: 245,
    cacheHitRate: 87.3,
    memoryUsage: 68.2,
    cpuUsage: 42.1,
    databaseConnections: 12,
    s3Operations: 89,
  });

  const [alerts, setAlerts] = useState<AlertItem[]>([
    {
      id: '1',
      type: 'security',
      severity: 'high',
      title: 'Multiple Failed Login Attempts',
      description: '3 failed login attempts detected from IP 192.168.1.100',
      timestamp: '5 minutes ago',
      action: 'Review security logs'
    },
    {
      id: '2',
      type: 'performance',
      severity: 'medium',
      title: 'High API Latency',
      description: 'Average response time increased to 450ms',
      timestamp: '15 minutes ago',
      action: 'Check system resources'
    },
    {
      id: '3',
      type: 'data',
      severity: 'low',
      title: 'Template Validation Errors',
      description: '2 templates have validation warnings',
      timestamp: '1 hour ago',
      action: 'Review templates'
    }
  ]);

  // --- Audit Log Table Sorting State ---
  const [sortColumn, setSortColumn] = useState('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [auditUserFilter, setAuditUserFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);

  // --- Filtered Audit Logs ---
  const filteredAuditLogs = auditLogs.filter(log =>
    (log.user || '').toLowerCase().includes(auditUserFilter.toLowerCase()) &&
    (log.action || '').toLowerCase().includes(auditActionFilter.toLowerCase())
  );

  // --- Helper for type-safe sorting ---
  const getSortValue = (log: AuditLogEntry, column: string): string | number => {
    switch (column) {
      case 'timestamp':
        return log.timestamp || '';
      case 'user':
        return log.user || '';
      case 'action':
        return log.action || '';
      case 'ipAddress':
        return log.ipAddress || '';
      case 'severity':
        return log.severity || '';
      default:
        return '';
    }
  };

  // --- Sorting Logic ---
  const sortedAuditLogs = [...filteredAuditLogs].sort((a, b) => {
    const aVal = getSortValue(a, sortColumn);
    const bVal = getSortValue(b, sortColumn);
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // --- Drill-down Modal Logic ---
  const openLogModal = (log: any) => {
    setSelectedLog(log);
    setShowLogModal(true);
  };
  const closeLogModal = () => {
    setShowLogModal(false);
    setSelectedLog(null);
  };

  // --- Export Functions ---
  const exportAuditLogToCSV = () => {
    const headers = ['Timestamp', 'User', 'Action', 'IP Address', 'Status', 'Details'];
    const csvContent = [
      headers.join(','),
      ...sortedAuditLogs.map(log => [
        log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A',
        log.user || 'N/A',
        log.action || 'N/A',
        log.ipAddress || 'N/A',
        log.severity || 'LOW',
        log.details || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- Alert Management ---
  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'high': return <AlertCircle className="w-4 h-4" />;
      case 'medium': return <Clock className="w-4 h-4" />;
      case 'low': return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  useEffect(() => {
    // Update system stats from Redux state
    setSystemStats(prev => ({
      ...prev,
      totalProviders: providers.length,
      totalTemplates: templates.length,
      totalClauses: clauses.length,
      totalAuditLogs: auditLogs.length,
      activeUsers: userActivity.filter(u => u.status === 'active').length,
      contractsGenerated: auditLogs.filter(log => log.action?.includes('CONTRACT_GENERATED')).length,
      contractsGeneratedToday: auditLogs.filter(log => 
        log.action?.includes('CONTRACT_GENERATED') && 
        new Date(log.timestamp).toDateString() === new Date().toDateString()
      ).length,
      failedGenerations: auditLogs.filter(log => log.action?.includes('GENERATION_FAILED')).length,
      pendingGenerations: auditLogs.filter(log => log.action?.includes('GENERATION_QUEUED')).length,
    }));
  }, [providers, templates, clauses, auditLogs, userActivity]);

  // System info (stubbed for now, can be replaced with real data)
  const systemInfo = {
    version: '1.0.0',
    uptime: '99.99%',
    environment: process.env.NODE_ENV || 'development',
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">Access Denied</h1>
          <p className="text-neutral-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return <UserManagement />;
      case 'system':
  return (
          <div className="space-y-6">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">System Overview</h2>
        <table className="min-w-full border text-sm bg-white">
          <thead className="bg-neutral-100 border-b">
            <tr>
              <th className="px-4 py-2 text-left font-semibold text-neutral-700">Metric</th>
              <th className="px-4 py-2 text-left font-semibold text-neutral-700">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-4 py-2 border-b">Providers</td>
              <td className="px-4 py-2 border-b font-mono">{providers && providers.length > 0 ? providers.length : 'No data'}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 border-b">Templates</td>
              <td className="px-4 py-2 border-b font-mono">{templates && templates.length > 0 ? templates.length : 'No data'}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 border-b">Clauses</td>
              <td className="px-4 py-2 border-b font-mono">{clauses && clauses.length > 0 ? clauses.length : 'No data'}</td>
            </tr>
            <tr>
                  <td className="px-4 py-2 border-b">Activity Logs</td>
              <td className="px-4 py-2 border-b font-mono">{auditLogs && auditLogs.length > 0 ? auditLogs.length : 'No data'}</td>
            </tr>
          </tbody>
        </table>
          </div>
        );
      case 'activitylog':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-neutral-800">Activity Logs</h2>
              <Button onClick={exportAuditLogToCSV} variant="outline">Export Activity Log</Button>
            </div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('timestamp')}>
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('user')}>
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('action')}>
                      Action
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('ipAddress')}>
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('severity')}>
                      Severity
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedAuditLogs.slice(0, 50).map((log, index) => (
                    <tr key={index} className="hover:bg-gray-50 cursor-pointer" onClick={() => openLogModal(log)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.user || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.action || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{log.ipAddress || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={log.severity === 'HIGH' ? 'destructive' : 'secondary'}>
                          {log.severity || 'LOW'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'performance':
        return <CachePerformanceDashboard />;
      default:
        return (
          <div className="space-y-6">
            {/* Overview Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Users</p>
                    <p className="text-2xl font-semibold text-gray-900">{systemStats.activeUsers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Contracts Generated</p>
                    <p className="text-2xl font-semibold text-gray-900">{systemStats.contractsGeneratedToday}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Failed Generations</p>
                    <p className="text-2xl font-semibold text-gray-900">{systemStats.failedGenerations}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Uptime</p>
                    <p className="text-2xl font-semibold text-gray-900">{systemStats.systemUptime}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts Section */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
              </div>
              <div className="p-6">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className={`flex items-center justify-between p-4 mb-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                    <div className="flex items-center">
                      {getSeverityIcon(alert.severity)}
                      <div className="ml-3">
                        <p className="text-sm font-medium">{alert.title}</p>
                        <p className="text-sm opacity-90">{alert.description}</p>
                        <p className="text-xs opacity-75 mt-1">{alert.timestamp}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {alert.action && (
                        <Button size="sm" variant="outline">
                          {alert.action}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => dismissAlert(alert.id)}>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center py-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900">System Administration</h1>
            <p className="text-xs text-neutral-500 mt-1">Enterprise Admin Dashboard</p>
          </div>
          <div className="text-right text-xs text-neutral-500">
            <div>Version: <span className="font-mono text-neutral-700">{systemInfo.version}</span></div>
            <div>Uptime: <span className="font-mono text-neutral-700">{systemInfo.uptime}</span></div>
            <div>Env: <span className="font-mono text-neutral-700">{systemInfo.environment}</span></div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              User Management
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'system'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Database className="w-4 h-4 inline mr-2" />
              System
            </button>
            <button
              onClick={() => setActiveTab('activitylog')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'activitylog'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              Activity Logs
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 inline mr-2" />
              Performance
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default AdminDashboard; 