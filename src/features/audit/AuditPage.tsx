import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { clearLogs, fetchAuditLogs } from '@/store/slices/auditSlice';
import { fetchTemplatesIfNeeded } from '@/features/templates/templatesSlice';
import { clearAllAuditLogs } from './clearAuditLogsService';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, Search, Download, Filter, FileText, CheckCircle, XCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ProgressModal from '@/components/ui/ProgressModal';
import { listAuditLogs } from '@/graphql/queries';
import { deleteAuditLog } from '@/graphql/mutations';
import { generateClient } from 'aws-amplify/api';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ColDef } from 'ag-grid-community';
import Papa from 'papaparse';
import { regenerateContractDownloadUrl } from '@/utils/s3Storage';

export default function AuditPage() {
  const { logs, isLoading, error } = useSelector((state: RootState) => state.audit);
  const { templates, status: templatesStatus } = useSelector((state: RootState) => state.templates);
  const dispatch = useDispatch<AppDispatch>();

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [showConfirm, setShowConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [clearResult, setClearResult] = useState<number | null>(null);

  // AG Grid pagination state
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(40);

  // Load audit logs and templates
  useEffect(() => {
    dispatch(fetchAuditLogs(undefined));
    dispatch(fetchTemplatesIfNeeded());
  }, [dispatch]);

  // Helper to get template name and version by ID
  const getTemplateInfo = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return { name: 'Unknown Template', version: 'N/A' };
    return { name: template.name, version: template.version };
  };

  // Helper to get provider name by ID (if available in logs)
  const getProviderName = (providerId: string, logDetails: any) => {
    // Try to get from log details first
    if (logDetails.providerName) return logDetails.providerName;
    if (logDetails.providers && Array.isArray(logDetails.providers)) {
      return logDetails.providers.join(', ');
    }
    return providerId;
  };

  // Handler for clearing logs with progress
  const handleClearLogs = async () => {
    setShowConfirm(false); // Close confirmation immediately for clean modal UX
    setClearing(true);
    setProgress(0);
    setClearResult(null);
    try {
      let deleted = 0;
      let total = logs.length;
      if (total === 0) {
        setProgress(100);
        setClearResult(0);
        setClearing(false);
        return;
      }
      // Fetch all log IDs
      let nextToken: string | null = null;
      let allIds: string[] = [];
      const client = generateClient();
      do {
        let result: any;
        try {
          result = await client.graphql({
            query: listAuditLogs,
            variables: { limit: 1000, nextToken },
          });
        } catch (err) {
          console.error('GraphQL error fetching audit logs:', err);
          throw err;
        }
        const items = result.data.listAuditLogs?.items || [];
        allIds.push(...items.map((item: any) => item.id));
        nextToken = result.data.listAuditLogs?.nextToken || null;
      } while (nextToken);
      total = allIds.length;
      for (let i = 0; i < allIds.length; i++) {
        try {
          await client.graphql({
            query: deleteAuditLog,
            variables: { input: { id: allIds[i] } },
          });
        } catch (err) {
          console.error(`Failed to delete audit log with id ${allIds[i]}:`, err);
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }
      setClearResult(total);
      dispatch(clearLogs());
      await dispatch(fetchAuditLogs(undefined));
    } catch (err) {
      console.error('Failed to clear logs:', err);
      alert('Failed to clear logs. See console for details.');
    } finally {
      setClearing(false);
      setProgress(100);
    }
  };

  // Get unique values for filters
  const uniqueTemplates = Array.from(new Set(logs.map(log => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    return parsed.templateId;
  }).filter(Boolean)));

  const uniqueYears = Array.from(new Set(logs.map(log => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    return parsed.contractYear;
  }).filter(Boolean)));

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(logs.map(log => typeof log.user === 'string' ? log.user : '').filter((u): u is string => !!u)));

  // Filter logs based on search and filters
  const filteredLogs = logs.filter((log) => {
    if (log.action !== 'TEMPLATE_CREATED' && log.action !== 'CONTRACT_GENERATED') return false;
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const templateInfo = getTemplateInfo(parsed.templateId || '');
    const providerName = getProviderName(parsed.providerId || '', parsed);
    const contractYear = parsed.contractYear || '';
    const status = parsed.status || '';
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      providerName.toLowerCase().includes(searchLower) ||
      templateInfo.name.toLowerCase().includes(searchLower) ||
      log.user?.toLowerCase().includes(searchLower) ||
      contractYear.includes(searchLower);
    // Status filter
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    // Template filter
    const matchesTemplate = templateFilter === 'all' || parsed.templateId === templateFilter;
    // Year filter
    const matchesYear = yearFilter === 'all' || contractYear === yearFilter;
    // User filter
    const matchesUser = userFilter === 'all' || log.user === userFilter;
    return matchesSearch && matchesStatus && matchesTemplate && matchesYear && matchesUser;
  });

  // Prepare row data for AG Grid
  const agGridRows = filteredLogs.map((log) => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const meta = parsed.metadata || {};
    return {
      id: log.id,
      timestamp: log.timestamp,
      user: log.user || '-',
      providerName: meta.providerName || getProviderName(meta.providerId || parsed.providerId || '', meta),
      templateName: getTemplateInfo(meta.templateId || parsed.templateId || '').name,
      templateVersion: getTemplateInfo(meta.templateId || parsed.templateId || '').version,
      contractYear: meta.contractYear || parsed.contractYear || '',
      status: (meta.status || parsed.status || ''),
      outputType: meta.outputType || parsed.outputType || 'DOCX',
      action: log.action || '-',
      fileUrl: meta.fileUrl || parsed.fileUrl || '',
    };
  });

  // Pagination logic for AG Grid
  const pagedRows = agGridRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const totalPages = Math.ceil(agGridRows.length / pageSize);
  const showingStart = agGridRows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const showingEnd = Math.min((pageIndex + 1) * pageSize, agGridRows.length);

  // CSV export for current page
  const handleExportCSV = () => {
    if (pagedRows.length === 0) return;
    const csv = Papa.unparse(pagedRows.map(row => ({
      Timestamp: row.timestamp,
      User: row.user,
      Provider: row.providerName,
      Template: row.templateName,
      Version: row.templateVersion,
      Year: row.contractYear,
      Status: row.status,
      Output: row.outputType,
      Action: row.action,
      FileUrl: row.fileUrl,
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-page-${pageIndex + 1}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // AG Grid column definitions
  const agGridColumnDefs: ColDef<any, any>[] = [
    { headerName: 'Timestamp', field: 'timestamp', minWidth: 180, valueFormatter: (params: any) => new Date(params.value).toLocaleString(), sortable: true },
    { headerName: 'User', field: 'user', minWidth: 180, sortable: true },
    { headerName: 'Provider', field: 'providerName', minWidth: 180, sortable: true },
    { headerName: 'Template', field: 'templateName', minWidth: 220, cellRenderer: (params: any) => (
      <div>
        <div className="font-medium text-gray-900">{params.value}</div>
        <div className="text-xs text-gray-500">v{params.data.templateVersion}</div>
      </div>
    ), sortable: true },
    { headerName: 'Year', field: 'contractYear', minWidth: 100, cellRenderer: (params: any) => (
      <span className="badge badge-outline text-xs">{params.value || '-'} </span>
    ), sortable: true },
    { headerName: 'Status', field: 'status', minWidth: 120, cellRenderer: (params: any) => {
      const status = (params.value || '').toLowerCase();
      return (
        <div className="flex items-center gap-2">
          {status === 'success' ? <CheckCircle className="w-4 h-4 text-green-600" /> : status === 'failed' ? <XCircle className="w-4 h-4 text-red-600" /> : <AlertCircle className="w-4 h-4 text-yellow-600" />}
          <span className={
            status === 'success' ? 'text-green-600 font-medium' : status === 'failed' ? 'text-red-600 font-medium' : 'text-yellow-600 font-medium'
          }>{status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}</span>
        </div>
      );
    }, sortable: true },
    { headerName: 'Output', field: 'outputType', minWidth: 100, cellRenderer: (params: any) => (
      <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" /><span className="text-sm font-medium">{params.value}</span></div>
    ), sortable: true },
    { headerName: 'Action', field: 'action', minWidth: 160, cellRenderer: (params: any) => (
      <span className="text-xs font-semibold text-gray-700">{params.value}</span>
    ), sortable: true },
    { headerName: 'Actions', field: 'fileUrl', minWidth: 100, cellRenderer: (params: any) => (
      params.value ? (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  try {
                    // If the URL starts with https://, it's likely an S3 signed URL
                    if (params.value.startsWith('https://')) {
                      // Try to open the URL directly first
                      window.open(params.value, '_blank', 'noopener,noreferrer');
                    } else {
                      // If it's just a filename, try to regenerate the download URL
                      const parsed = params.data.id ? (() => { 
                        try { 
                          return JSON.parse(params.data.details || '{}'); 
                        } catch { 
                          return {}; 
                        } 
                      })() : {};
                      
                      if (parsed.providerId && parsed.templateId) {
                        const contractYear = parsed.contractYear || new Date().getFullYear().toString();
                        const contractId = parsed.providerId + '-' + parsed.templateId + '-' + contractYear;
                        const downloadUrl = await regenerateContractDownloadUrl(contractId, params.value);
                        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                      } else {
                        throw new Error('Unable to regenerate download URL - missing contract information');
                      }
                    }
                  } catch (error) {
                    console.error('Failed to download file:', error);
                    alert('Failed to download file. The file may no longer be available or there was an error accessing the storage.');
                  }
                }}
                className="text-blue-600 hover:text-blue-700"
              >
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Download {params.data.outputType} file
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : <span className="text-gray-400">-</span>
    ) },
  ];

  if (isLoading || templatesStatus === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner 
          size="lg" 
          message="Loading Activity Logs..." 
          color="primary"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-500">
        <p className="mt-4 text-lg text-center">{error}</p>
        <Button onClick={() => dispatch(fetchAuditLogs(undefined))} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <h1 className="text-lg font-bold text-gray-800">Activity Log</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer">
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" align="start">
                  View and manage contract generation history, FMV override logs, and system activity.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search providers, templates, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={templateFilter} onValueChange={setTemplateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {uniqueTemplates.map(templateId => {
                  const template = templates.find(t => t.id === templateId);
                  return (
                    <SelectItem key={templateId} value={templateId}>
                      {template ? template.name : 'Unknown Template'}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by user" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueUsers.map(user => (
                  <SelectItem key={user} value={user}>{user}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            {/* Entry count/range display, left-aligned */}
            <div className="text-sm text-gray-600">
              {agGridRows.length === 0
                ? 'No activity log entries.'
                : `Showing ${showingStart}–${showingEnd} of ${agGridRows.length} activity log entr${agGridRows.length === 1 ? 'y' : 'ies'}`}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportCSV} className="text-gray-600">
                Download CSV
              </Button>
            <Button
              variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTemplateFilter('all');
                  setYearFilter('all');
                  setUserFilter('all');
                }}
                className="text-gray-600"
              >
                Clear Filters
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={clearing}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4 mr-1" />
              Clear Log
            </Button>
            </div>
          </div>
        </div>

        {/* AG Grid Table Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="ag-theme-alpine w-full" style={{ fontSize: '14px', fontFamily: 'var(--font-sans, sans-serif)', fontWeight: 400, color: '#111827' }}>
            <AgGridReact
              rowData={pagedRows}
              columnDefs={agGridColumnDefs}
              domLayout="autoHeight"
              suppressRowClickSelection={true}
              rowSelection="single"
              pagination={false}
              enableCellTextSelection={true}
              headerHeight={40}
              rowHeight={36}
              suppressDragLeaveHidesColumns={true}
              suppressScrollOnNewData={true}
              suppressColumnVirtualisation={false}
              suppressRowVirtualisation={false}
              defaultColDef={{ tooltipValueGetter: params => params.value, resizable: true, sortable: true, filter: true, cellStyle: { fontSize: '14px', fontFamily: 'var(--font-sans, sans-serif)', fontWeight: 400, color: '#111827', display: 'flex', alignItems: 'center', height: '100%' } }}
              enableBrowserTooltips={true}
              enableRangeSelection={true}
              suppressMovableColumns={false}
            />
          </div>
          {/* Bottom Pagination Controls */}
          <div className="flex gap-2 items-center mt-2">
            <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
            <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
            <span className="text-sm px-4">Page {pageIndex + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
            <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
            <select
              className="ml-4 border rounded px-2 py-1 text-sm"
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setPageIndex(0);
              }}
            >
              {[10, 20, 40, 50, 100].map(size => (
                <option key={size} value={size}>{size} / page</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All Activity Logs</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to clear all activity logs? This action cannot be undone and will remove all entries from the database.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={clearing}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearLogs} disabled={clearing}>
              {clearing ? 'Clearing...' : 'Clear All'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ProgressModal
        isOpen={clearing}
        title="Clearing Activity Log"
        progress={progress}
        message={progress < 100 ? `Deleting activity log entries...` : `Finishing up...`}
      />
      {clearResult !== null && !clearing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h2 className="text-lg font-bold mb-2 text-gray-800">Activity Log Cleared</h2>
            <p className="mb-4 text-gray-700">Successfully cleared {clearResult} activity log entries.</p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => setClearResult(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 