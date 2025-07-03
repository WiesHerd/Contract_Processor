import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { clearLogs, fetchAuditLogs } from '@/store/slices/auditSlice';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

export default function AuditPage() {
  const { logs, isLoading, error } = useSelector((state: RootState) => state.audit);
  const dispatch = useDispatch<AppDispatch>();

  // Load audit logs with caching
  useEffect(() => {
    dispatch(fetchAuditLogs());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner 
          size="lg" 
          message="Loading Audit Logs..." 
          color="primary"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-500">
        <p className="mt-4 text-lg text-center">{error}</p>
        <Button onClick={() => dispatch(fetchAuditLogs())} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Card - Consistent with Templates/Providers */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800">Audit Log</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer">
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" align="start">
                  View and manage FMV override logs and contract generation metadata.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <hr className="my-3 border-gray-100" />
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => dispatch(clearLogs())}
              className="text-red-600 border-red-300"
            >
              Clear Log
            </Button>
          </div>
        </div>
        {/* Table Card - Consistent with Templates/Providers */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Timestamp</th>
                  <th className="px-4 py-2 text-left">User</th>
                  <th className="px-4 py-2 text-left">Providers</th>
                  <th className="px-4 py-2 text-left">Template</th>
                  <th className="px-4 py-2 text-left">Output</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Download</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray-400 py-8">
                      No audit log entries yet.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const parsed = log.details ? (() => { try { return JSON.parse(log.details); } catch { return {}; } })() : {};
                    return (
                      <tr key={log.id} className="border-t">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{log.user || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {parsed.providers ? parsed.providers.join(', ') : '-'}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">{parsed.template || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">{parsed.outputType || parsed.action || '-'}</td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={
                              parsed.status === 'success'
                                ? 'text-green-600'
                                : parsed.status === 'failed'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                            }
                          >
                            {parsed.status
                              ? parsed.status.charAt(0).toUpperCase() + parsed.status.slice(1)
                              : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {parsed.downloadUrl ? (
                            <a
                              href={parsed.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline"
                            >
                              Download
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 