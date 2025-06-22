import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { fetchMappingsIfNeeded } from './mappingsSlice';
import { fetchTemplatesIfNeeded } from './templatesSlice';

export default function MappingListPage() {
  const { templates, status: templatesStatus, error: templatesError } = useSelector((state: RootState) => state.templates);
  const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector((state: RootState) => state.mappings);
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();

  // Load templates and mappings with caching
  useEffect(() => {
    dispatch(fetchTemplatesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchMappingsIfNeeded());
  }, [dispatch]);

  const isLoading = templatesStatus === 'loading' || templatesStatus === 'idle' || mappingsLoading;
  const error = templatesError || mappingsError;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner 
          size="lg" 
          message="Loading Page Data..." 
          color="primary"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-red-500">
        <AlertTriangle className="h-16 w-16" />
        <p className="mt-4 text-lg text-center">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 overflow-y-auto min-h-screen">
      <PageHeader
        title="All Template Mappings"
        description="View and manage all your contract template mappings. Continue mapping to finish or update your field assignments."
      />
      
      <Card className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template Name</TableHead>
              <TableHead>Last Modified</TableHead>
              <TableHead>Placeholders</TableHead>
              <TableHead>Mapping Progress</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {templates.map(template => {
              const templateMapping = mappings[template.id];
              const mappedCount = templateMapping?.mappings?.filter(m => m.mappedColumn).length || 0;
              const totalCount = template.placeholders.length;
              const percent = totalCount === 0 ? 0 : Math.round((mappedCount / totalCount) * 100);
              const isComplete = mappedCount === totalCount && totalCount > 0;
              return (
                <TableRow key={template.id} className="hover:bg-slate-50">
                  <TableCell className="font-semibold text-lg">{template.name}</TableCell>
                  <TableCell>{templateMapping?.lastModified ? new Date(templateMapping.lastModified).toLocaleString() : (template as any)?.metadata?.updatedAt || ''}</TableCell>
                  <TableCell>{totalCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded h-2 relative">
                        <div
                          className={`h-2 rounded transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{mappedCount} / {totalCount}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {isComplete ? (
                      <CheckCircle className="text-green-600" />
                    ) : (
                      <AlertTriangle className="text-yellow-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="default"
                      className="px-6 py-2 rounded-lg shadow-md"
                      onClick={() => navigate(`/map-fields/${template.id}`)}
                    >
                      {isComplete || mappedCount > 0 ? 'Continue Mapping' : 'Start Mapping'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
