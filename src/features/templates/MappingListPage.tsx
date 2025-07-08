import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CheckCircle, AlertTriangle, Trash2, Info, Edit3 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { fetchMappingsIfNeeded, deleteMapping } from './mappingsSlice';
import { fetchTemplatesIfNeeded } from './templatesSlice';
import { awsMappings } from '@/utils/awsServices';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

export default function MappingListPage() {
  const { templates, status: templatesStatus, error: templatesError } = useSelector((state: RootState) => state.templates);
  const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector((state: RootState) => state.mappings);
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // Load templates and mappings with caching
  useEffect(() => {
    dispatch(fetchTemplatesIfNeeded());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchMappingsIfNeeded());
  }, [dispatch]);

  const isLoading = templatesStatus === 'loading' || templatesStatus === 'idle' || mappingsLoading;
  const error = templatesError || mappingsError;

  const handleDeleteMapping = async (templateId: string) => {
    setDeletingTemplateId(templateId);
    try {
      // Delete all mappings for this template in DynamoDB
      const result = await awsMappings.deleteAllMappingsForTemplate(templateId);
      // Remove from Redux state
      dispatch(deleteMapping(templateId));
      // Optionally, refetch mappings
      dispatch(fetchMappingsIfNeeded());
      if (result.status === 'success') {
        toast.success(`All mappings for this template deleted (${result.deletedCount}).`);
      } else if (result.status === 'not_found') {
        toast.info('No mappings found for this template. Nothing to delete.');
      } else {
        toast.error('Mappings deletion completed with warnings. Check audit log.');
      }
    } catch (error) {
      toast.error('Failed to delete mappings. Please try again or contact support.');
    } finally {
      setDeletingTemplateId(null);
    }
  };

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
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Card - Consistent with Templates/Providers */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-gray-800">All Template Mappings</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-pointer">
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right" align="start">
                  View and manage all your contract template mappings. Continue mapping to finish or update your field assignments.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        {/* Table/Card - Consistent with Templates/Providers */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead>Placeholders</TableHead>
                <TableHead>Mapping Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
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
                  <TableRow key={template.id} className="hover:bg-slate-50 h-16 align-middle">
                    <TableCell className="font-medium text-base align-middle">{template.name}</TableCell>
                    <TableCell className="align-middle">{templateMapping?.lastModified ? new Date(templateMapping.lastModified).toLocaleString() : (template as any)?.metadata?.updatedAt || ''}</TableCell>
                    <TableCell className="align-middle">{totalCount}</TableCell>
                    <TableCell className="align-middle">
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
                    <TableCell className="align-middle">
                      {isComplete ? (
                        <CheckCircle className="text-green-600" />
                      ) : (
                        <AlertTriangle className="text-yellow-500" />
                      )}
                    </TableCell>
                    <TableCell className="align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="default"
                                size="sm"
                                className="flex items-center gap-2 px-5 py-2 rounded-lg shadow-md"
                                onClick={() => navigate(`/map-fields/${template.id}`)}
                                aria-label={isComplete || mappedCount > 0 ? 'Continue Mapping' : 'Start Mapping'}
                              >
                                <Edit3 className="h-4 w-4" />
                                <span className="font-medium">Continue</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{isComplete || mappedCount > 0 ? 'Continue Mapping' : 'Start Mapping'}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 p-0 hover:bg-red-100 hover:text-red-700"
                                onClick={() => handleDeleteMapping(template.id)}
                                disabled={deletingTemplateId === template.id}
                                aria-label="Delete Mapping"
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete Mapping</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
