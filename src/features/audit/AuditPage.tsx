import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { clearAuditLogs } from '@/store/slices/auditSlice';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';

export default function AuditPage() {
  const logs = useSelector((state: RootState) => state.audit.logs);
  const dispatch = useDispatch();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <PageHeader
        title="Audit Log"
        description="View and manage FMV override logs and contract generation metadata."
        rightContent={
          <Button
            variant="outline"
            onClick={() => dispatch(clearAuditLogs())}
            className="text-red-600 border-red-300"
          >
            Clear Log
          </Button>
        }
      />
      {/* Table Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 px-4">
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
                logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-4 py-2 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{log.user || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {log.providers.join(', ')}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{log.template}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{log.outputType}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={
                          log.status === 'success'
                            ? 'text-green-600'
                            : log.status === 'failed'
                            ? 'text-red-600'
                            : 'text-yellow-600'
                        }
                      >
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {log.downloadUrl ? (
                        <a
                          href={log.downloadUrl}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 