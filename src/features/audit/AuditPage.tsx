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

  // Helper to format provider name with proper spacing
  const formatProviderName = (name: string) => {
    if (!name || name === 'Unknown Provider') return name;
    
    // Handle common patterns like "TroyNguyen" -> "Troy Nguyen"
    // This regex finds capital letters and adds spaces before them
    return name.replace(/([a-z])([A-Z])/g, '$1 $2')
               .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
               .trim();
  };

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [templateFilter, setTemplateFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
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
    
    // Also fetch contract generation logs
    const fetchContractLogs = async () => {
      try {
        const { ContractGenerationLogService } = await import('@/services/contractGenerationLogService');
        const result = await ContractGenerationLogService.listLogs();
        console.log('📋 Contract generation logs found:', result.items?.length || 0);
        
        if (result.items && result.items.length > 0) {
              // Transform contract logs to audit log format
    const transformedLogs = result.items.map(log => ({
      id: log.id,
      action: 'CONTRACT_GENERATED',
      user: log.generatedBy || 'System', // Use System if no user info
      timestamp: log.generatedAt,
      details: JSON.stringify({
        providerId: log.providerId,
        templateId: log.templateId,
        contractYear: log.contractYear,
        outputType: log.outputType,
        status: log.status,
        fileUrl: log.fileUrl,
        notes: log.notes,
        metadata: {
          providerId: log.providerId,
          templateId: log.templateId,
          contractYear: log.contractYear,
          outputType: log.outputType,
          status: log.status,
          fileUrl: log.fileUrl,
          providerName: log.fileUrl ? formatProviderName(log.fileUrl.split('_')[1]?.replace(/_/g, ' ') || 'Unknown Provider') : 'Unknown Provider' // Extract name from filename
        }
      }),
      severity: log.status === 'SUCCESS' ? 'LOW' : 'MEDIUM',
      category: 'DATA',
      resourceType: 'CONTRACT',
      resourceId: log.id
    }));
          
          // Add to logs state
          dispatch({ type: 'audit/addLogs', payload: transformedLogs });
          console.log('✅ Added contract logs to Activity Log');
        }
      } catch (error) {
        console.error('❌ Failed to fetch contract generation logs:', error);
      }
    };
    
    fetchContractLogs();
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

  // Handler for clearing logs with progress - OPTIMIZED VERSION
  const handleClearLogs = async () => {
    setShowConfirm(false);
    setClearing(true);
    setProgress(0);
    setClearResult(null);
    
    try {
      if (logs.length === 0) {
        setProgress(100);
        setClearResult(0);
        setClearing(false);
        return;
      }

      // Fetch all log IDs first
      let nextToken: string | null = null;
      let allIds: string[] = [];
      const client = generateClient();
      
      console.log('🔄 Fetching all audit log IDs...');
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
      
      const total = allIds.length;
      console.log(`🗑️ Deleting ${total} audit log entries...`);
      
      // OPTIMIZATION: Batch deletions in parallel chunks
      const BATCH_SIZE = 25; // Process 25 deletions at a time
      const batches = [];
      
      for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
        batches.push(allIds.slice(i, i + BATCH_SIZE));
      }
      
      let deletedCount = 0;
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        // Process batch in parallel
        const batchPromises = batch.map(async (id) => {
          try {
            await client.graphql({
              query: deleteAuditLog,
              variables: { input: { id } },
            });
            return { success: true, id };
          } catch (err) {
            console.error(`Failed to delete audit log ${id}:`, err);
            return { success: false, id, error: err };
          }
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        deletedCount += batchResults.filter(r => r.success).length;
        
        // Update progress
        const progress = Math.round(((batchIndex + 1) / batches.length) * 100);
        setProgress(progress);
        
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed: ${batchResults.filter(r => r.success).length}/${batch.length} deleted`);
      }
      
      console.log(`🎉 Successfully deleted ${deletedCount}/${total} audit log entries`);
      setClearResult(deletedCount);
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
    const meta = parsed.metadata || {};
    // Check both parsed and metadata for templateId
    return parsed.templateId || meta.templateId;
  }).filter(Boolean)));

  const uniqueYears = Array.from(new Set(logs.map(log => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const meta = parsed.metadata || {};
    // Check both parsed and metadata for contractYear
    return parsed.contractYear || meta.contractYear;
  }).filter(Boolean)));

  // Get unique users for filter
  const uniqueUsers = Array.from(new Set(logs.map(log => typeof log.user === 'string' ? log.user : '').filter((u): u is string => !!u)));

  // Get unique statuses for filter
  const uniqueStatuses = Array.from(new Set(logs.map(log => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const meta = parsed.metadata || {};
    // Check both parsed and metadata for status, and also derive from action type
    let status = parsed.status || meta.status;
    if (!status) {
      // Derive status from action type
      if (log.action.includes('FAILED')) {
        status = 'failed';
      } else if (log.action.includes('GENERATION') || log.action.includes('ASSIGNED') || log.action.includes('CREATED')) {
        status = 'success';
      } else {
        status = 'unknown';
      }
    }
    return status;
  }).filter(Boolean)));

  // Get unique severities for filter
  const uniqueSeverities = Array.from(new Set(logs.map(log => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const meta = parsed.metadata || {};
    return parsed.severity || meta.severity || 'LOW';
  }).filter(Boolean)));

  // Get unique categories for filter
  const uniqueCategories = Array.from(new Set(logs.map(log => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const meta = parsed.metadata || {};
    return parsed.category || meta.category || 'SYSTEM';
  }).filter(Boolean)));

  // Filter logs based on search and filters
  const filteredLogs = logs.filter((log) => {
    // Include all relevant action types
    const relevantActions = [
      'TEMPLATE_CREATED', 
      'CONTRACT_GENERATED', 
      'BULK_CONTRACT_GENERATION',
      'TEMPLATE_ASSIGNED',
      'TEMPLATE_UNASSIGNED',
      'BULK_TEMPLATE_ASSIGNMENT',
      'BULK_TEMPLATE_ASSIGNMENT_FAILED',
      'BULK_TEMPLATE_CLEAR',
      'FMV_OVERRIDE',
      'DYNAMIC_BLOCK_DELETED',
      'BULK_DYNAMIC_BLOCKS_DELETED'
    ];
    if (!relevantActions.includes(log.action)) return false;
    
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const meta = parsed.metadata || {};
    
    // Extract data from both parsed and metadata
    const templateId = parsed.templateId || meta.templateId;
    const providerId = parsed.providerId || meta.providerId;
    const providerName = meta.providerName || getProviderName(providerId || '', parsed);
    const contractYear = parsed.contractYear || meta.contractYear || '';
    const templateInfo = getTemplateInfo(templateId || '');
    
    // Derive status from action type if not explicitly set
    let status = parsed.status || meta.status;
    if (!status) {
      if (log.action.includes('FAILED')) {
        status = 'failed';
      } else if (log.action.includes('GENERATION') || log.action.includes('ASSIGNED') || log.action.includes('CREATED')) {
        status = 'success';
      } else {
        status = 'unknown';
      }
    }
    
    // Search filter - enhanced to search more fields
    const searchLower = searchTerm.toLowerCase();
    const formattedProviderName = formatProviderName(providerName);
    const matchesSearch = searchTerm === '' || 
      providerName.toLowerCase().includes(searchLower) ||
      formattedProviderName.toLowerCase().includes(searchLower) ||
      templateInfo.name.toLowerCase().includes(searchLower) ||
      log.user?.toLowerCase().includes(searchLower) ||
      contractYear.includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      status.toLowerCase().includes(searchLower);
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    // Template filter
    const matchesTemplate = templateFilter === 'all' || templateId === templateFilter;
    
    // Year filter
    const matchesYear = yearFilter === 'all' || contractYear === yearFilter;
    
    // User filter
    const matchesUser = uniqueUsers.includes(log.user); // Use uniqueUsers directly
    
    // Severity filter
    const severity = parsed.severity || meta.severity || 'LOW';
    const matchesSeverity = uniqueSeverities.includes(severity); // Use uniqueSeverities directly
    
    // Category filter
    const category = parsed.category || meta.category || 'SYSTEM';
    const matchesCategory = uniqueCategories.includes(category); // Use uniqueCategories directly
    
    return matchesSearch && matchesStatus && matchesTemplate && matchesYear && matchesUser && matchesSeverity && matchesCategory;
  });

  // Debug logging to help identify filter issues
  useEffect(() => {
    if (logs.length > 0) {
      console.log('Audit logs loaded:', logs.length, 'total logs');
      console.log('Unique templates found:', uniqueTemplates);
      console.log('Unique years found:', uniqueYears);
      console.log('Unique users found:', uniqueUsers);
      console.log('Unique statuses found:', uniqueStatuses);
      console.log('Filtered logs:', filteredLogs.length, 'of', logs.length);
    }
  }, [logs, uniqueTemplates, uniqueYears, uniqueUsers, uniqueStatuses, filteredLogs.length]);

  // Prepare row data for AG Grid
  const agGridRows = filteredLogs.map((log) => {
    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
    const meta = parsed.metadata || {};
    
    // Extract data from both parsed and metadata
    const templateId = parsed.templateId || meta.templateId;
    const providerId = parsed.providerId || meta.providerId;
    const contractYear = parsed.contractYear || meta.contractYear || '';
    const outputType = meta.outputType || parsed.outputType || 'DOCX';
    const fileUrl = meta.fileUrl || parsed.fileUrl || '';
    
    // Extract enhanced audit fields
    const severity = parsed.severity || meta.severity || 'LOW';
    const category = parsed.category || meta.category || 'SYSTEM';
    const resourceType = parsed.resourceType || meta.resourceType || (log.action.includes('CONTRACT') ? 'CONTRACT' : 'TEMPLATE');
    const resourceId = parsed.resourceId || meta.resourceId || log.id;
    
    // Derive status from action type if not explicitly set
    let status = meta.status || parsed.status;
    if (!status) {
      if (log.action.includes('FAILED')) {
        status = 'failed';
      } else if (log.action.includes('GENERATION') || log.action.includes('ASSIGNED') || log.action.includes('CREATED')) {
        status = 'success';
      } else {
        status = 'unknown';
      }
    }
    
    return {
      id: log.id,
      timestamp: log.timestamp,
      user: log.user || '-',
      providerName: formatProviderName(meta.providerName || getProviderName(providerId || '', meta)),
      templateName: getTemplateInfo(templateId || '').name,
      templateVersion: getTemplateInfo(templateId || '').version,
      contractYear: contractYear,
      status: status,
      outputType: outputType,
      action: log.action || '-',
      fileUrl: fileUrl,
      severity: severity,
      category: category,
      resourceType: resourceType,
      resourceId: resourceId,
      details: log.details, // Keep original details for download functionality
    };
  });

  // Pagination logic for AG Grid
  const pagedRows = agGridRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const totalPages = Math.ceil(agGridRows.length / pageSize);
  const showingStart = agGridRows.length === 0 ? 0 : pageIndex * pageSize + 1;
  const showingEnd = Math.min((pageIndex + 1) * pageSize, agGridRows.length);

  // CSV export for all filtered data
  const handleExportCSV = () => {
    if (agGridRows.length === 0) return;
    const csv = Papa.unparse(agGridRows.map(row => ({
      Timestamp: row.timestamp,
      User: row.user,
      Provider: row.providerName,
      Template: row.templateName,
      Version: row.templateVersion,
      Year: row.contractYear,
      Status: row.status,
      Output: row.outputType,
      Action: row.action,
      Severity: row.severity,
      Category: row.category,
      ResourceType: row.resourceType,
      ResourceID: row.resourceId,
      FileUrl: row.fileUrl,
    })));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
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
        <div className="text-gray-900">{params.value}</div>
        <div className="text-gray-500">v{params.data.templateVersion}</div>
      </div>
    ), sortable: true },
    { headerName: 'Year', field: 'contractYear', minWidth: 100, sortable: true },
    { headerName: 'Status', field: 'status', minWidth: 120, valueFormatter: (params: any) => {
      const status = (params.value || '').toLowerCase();
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }, sortable: true },
    { headerName: 'Output', field: 'outputType', minWidth: 100, sortable: true },
    { headerName: 'Action Type', field: 'action', minWidth: 160, valueFormatter: (params: any) => {
      const actionLabels: { [key: string]: string } = {
        'TEMPLATE_CREATED': 'Template Created',
        'CONTRACT_GENERATED': 'Contract Generated',
        'BULK_CONTRACT_GENERATION': 'Bulk Generation',
        'TEMPLATE_ASSIGNED': 'Template Assigned',
        'TEMPLATE_UNASSIGNED': 'Template Unassigned',
        'BULK_TEMPLATE_ASSIGNMENT': 'Bulk Assignment',
        'BULK_TEMPLATE_ASSIGNMENT_FAILED': 'Bulk Assignment Failed',
        'BULK_TEMPLATE_CLEAR': 'Bulk Clear',
        'FMV_OVERRIDE': 'FMV Override',
        'DYNAMIC_BLOCK_DELETED': 'Dynamic Block Deleted',
        'BULK_DYNAMIC_BLOCKS_DELETED': 'Bulk Dynamic Blocks Deleted'
      };
      return actionLabels[params.value] || params.value;
    }, sortable: true },
    { headerName: 'Severity', field: 'severity', minWidth: 100, valueFormatter: (params: any) => {
      const severity = (params.value || '').toLowerCase();
      return severity.charAt(0).toUpperCase() + severity.slice(1);
    }, sortable: true },
    { headerName: 'Category', field: 'category', minWidth: 120, valueFormatter: (params: any) => {
      const category = (params.value || '').toLowerCase();
      return category.charAt(0).toUpperCase() + category.slice(1);
    }, sortable: true },
    { headerName: 'Resource Type', field: 'resourceType', minWidth: 120, sortable: true },
    { headerName: 'Resource ID', field: 'resourceId', minWidth: 120, sortable: true },
    { headerName: 'Actions', field: 'fileUrl', minWidth: 100, cellRenderer: (params: any) => (
      params.value ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            try {
              // For contract generation logs, try to regenerate the download URL
              if (params.data.action === 'CONTRACT_GENERATED') {
                const parsed = params.data.details ? (() => { 
                  try { 
                    return JSON.parse(params.data.details || '{}'); 
                  } catch { 
                    return {}; 
                  } 
                })() : {};
                
                if (parsed.providerId && parsed.templateId) {
                  const contractYear = parsed.contractYear || new Date().getFullYear().toString();
                  const contractId = parsed.providerId + '-' + parsed.templateId + '-' + contractYear;
                  
                  try {
                    const result = await regenerateContractDownloadUrl(contractId, params.value);
                    // Force download by creating a blob and downloading it
                    const response = await fetch(result.url);
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = params.value || 'contract.docx';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                  } catch (downloadError) {
                    console.error('Download failed:', downloadError);
                    alert('File not found or no longer available. The contract may have been deleted or moved.');
                  }
                } else {
                  alert('Unable to download - missing contract information');
                }
              } else {
                // For other types, try direct download
                try {
                  const response = await fetch(params.value);
                  if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                  }
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = params.value.split('/').pop() || 'file';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(url);
                } catch (fetchError) {
                  console.error('Fetch failed:', fetchError);
                  alert('Unable to download file. The file may no longer be available.');
                }
              }
            } catch (error) {
              console.error('Failed to download file:', error);
              alert('Failed to download file. The file may no longer be available.');
            }
          }}
          className="text-blue-600 hover:text-blue-700"
        >
          <Download className="w-4 h-4" />
        </Button>
      ) : <span className="text-gray-400">No file</span>
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-3">
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {uniqueStatuses.map(status => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={templateFilter} onValueChange={setTemplateFilter}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Template" className="truncate">
                    {(() => {
                      const template = templates.find(t => t.id === templateFilter);
                      const name = template ? template.name : 'All Templates';
                      return name.length > 30 ? name.substring(0, 30) + '...' : name;
                    })()}
                  </SelectValue>
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
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setTemplateFilter('all');
                  setYearFilter('all');
                }}
                className="text-gray-600 w-32"
              >
                Reset Filters
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2 w-32"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={clearing}
                className="flex items-center gap-2 w-32"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Clear Log
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            {/* Entry count/range display, left-aligned */}
            <div className="text-sm text-gray-600">
              {agGridRows.length === 0
                ? 'No activity log entries.'
                : `Showing ${showingStart}–${showingEnd} of ${agGridRows.length} activity log entr${agGridRows.length === 1 ? 'y' : 'ies'}`}
            </div>
          </div>
        </div>

        {/* AG Grid Table Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          {/* Search above table */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search providers, templates, users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
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