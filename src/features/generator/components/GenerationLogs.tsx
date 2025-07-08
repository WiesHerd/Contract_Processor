import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Filter, Download } from 'lucide-react';
import { ContractGenerationLogService } from '@/services/contractGenerationLogService';
import { setGenerationLogs, setLogsLoading, setLogsError } from '../generatorSlice';
import type { AppDispatch } from '@/store';

interface GenerationLogsProps {
  className?: string;
}

export default function GenerationLogs({ className }: GenerationLogsProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { generationLogs, logsLoading, logsError } = useSelector((state: RootState) => state.generator);
  const { providers } = useSelector((state: RootState) => state.provider);
  const { templates } = useSelector((state: RootState) => state.templates);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [outputTypeFilter, setOutputTypeFilter] = useState<string>('all');

  // Load generation logs on component mount
  useEffect(() => {
    loadGenerationLogs();
  }, []);

  const loadGenerationLogs = async () => {
    dispatch(setLogsLoading(true));
    dispatch(setLogsError(null));
    
    try {
      const result = await ContractGenerationLogService.listLogs();
      dispatch(setGenerationLogs(result.items));
    } catch (error) {
      console.error('Error loading generation logs:', error);
      dispatch(setLogsError('Failed to load generation logs'));
    } finally {
      dispatch(setLogsLoading(false));
    }
  };

  // Filter logs based on search and filters
  const filteredLogs = generationLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.generatedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.fileUrl?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesYear = yearFilter === 'all' || log.contractYear === yearFilter;
    const matchesOutputType = outputTypeFilter === 'all' || log.outputType === outputTypeFilter;

    return matchesSearch && matchesStatus && matchesYear && matchesOutputType;
  });

  // Get unique years for filter
  const uniqueYears = [...new Set(generationLogs.map(log => log.contractYear))].sort().reverse();

  // Get provider name by ID
  const getProviderName = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    return provider?.name || 'Unknown Provider';
  };

  // Get template name by ID
  const getTemplateName = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    return template?.name || 'Unknown Template';
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status badge color
  const getStatusBadgeVariant = (status: string | undefined) => {
    switch (status?.toUpperCase()) {
      case 'SUCCESS':
        return 'default';
      case 'FAILED':
        return 'destructive';
      case 'PENDING':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Generation Logs</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={loadGenerationLogs}
            disabled={logsLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="SUCCESS">Success</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {uniqueYears.map(year => (
                <SelectItem key={year} value={year}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={outputTypeFilter} onValueChange={setOutputTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Output Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="DOCX">DOCX</SelectItem>
              <SelectItem value="PDF">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Display */}
        {logsError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{logsError}</p>
          </div>
        )}

        {/* Logs List */}
        <div className="space-y-3">
          {logsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No generation logs found</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">
                        {getProviderName(log.providerId)}
                      </h4>
                      <Badge variant={getStatusBadgeVariant(log.status)}>
                        {log.status || 'UNKNOWN'}
                      </Badge>
                      {log.outputType && (
                        <Badge variant="outline">{log.outputType}</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><span className="font-medium">Template:</span> {getTemplateName(log.templateId)}</p>
                      <p><span className="font-medium">Contract Year:</span> {log.contractYear}</p>
                      <p><span className="font-medium">Generated:</span> {formatDate(log.generatedAt)}</p>
                      {log.generatedBy && (
                        <p><span className="font-medium">By:</span> {log.generatedBy}</p>
                      )}
                      {log.fileUrl && (
                        <p><span className="font-medium">File:</span> {log.fileUrl}</p>
                      )}
                      {log.notes && (
                        <p><span className="font-medium">Notes:</span> {log.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {log.fileUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implement file download logic
                          console.log('Download file:', log.fileUrl);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredLogs.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing {filteredLogs.length} of {generationLogs.length} logs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 