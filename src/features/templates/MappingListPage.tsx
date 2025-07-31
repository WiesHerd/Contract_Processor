import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { CheckCircle, AlertTriangle, Trash2, Info, Edit3, Loader2, Shield, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { fetchMappingsIfNeeded, deleteMapping } from './mappingsSlice';
import { fetchTemplatesIfNeeded } from './templatesSlice';
import { awsMappings } from '@/utils/awsServices';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { generateClient } from 'aws-amplify/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function MappingListPage() {
  const { templates, status: templatesStatus, error: templatesError } = useSelector((state: RootState) => state.templates);
  const { mappings, loading: mappingsLoading, error: mappingsError } = useSelector((state: RootState) => state.mappings);
  const navigate = useNavigate();
  const dispatch: AppDispatch = useDispatch();
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearAllDialog, setShowClearAllDialog] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string; name: string } | null>(null);
  const location = useLocation();
  const client = generateClient();

  // Load templates and mappings with caching
  useEffect(() => {
    dispatch(fetchTemplatesIfNeeded());
    dispatch(fetchMappingsIfNeeded());
  }, [dispatch]);

  // Enterprise-grade deletion with confirmation, audit logging, and progress tracking
  const handleDeleteMapping = async (templateId: string, templateName: string) => {
    setSelectedTemplate({ id: templateId, name: templateName });
    setShowDeleteDialog(true);
  };

  const confirmDeleteMapping = async () => {
    if (!selectedTemplate) return;
    
    const { id: templateId, name: templateName } = selectedTemplate;
    setDeletingTemplateId(templateId);
    setDeleteProgress(0);
    setShowDeleteDialog(false);

    try {
      // Enterprise: Log the deletion attempt
      console.log(`🔒 [AUDIT] User initiated deletion for template: ${templateName} (${templateId})`);
      
      // Enterprise: Get mapping count for progress tracking
      const { listTemplateMappings } = await import('@/graphql/queries');
      const { deleteTemplateMapping } = await import('@/graphql/mutations');
      
      const result = await client.graphql({
        query: listTemplateMappings,
        variables: { 
          filter: { templateID: { eq: templateId } },
          limit: 1000 
        }
      });
      
      const mappingsToDelete = result.data?.listTemplateMappings?.items || [];
      const totalMappings = mappingsToDelete.length;
      
      if (totalMappings === 0) {
        toast.info('No mappings found for this template. Nothing to delete.');
        return;
      }

      // Enterprise: Show progress indicator
      toast.info(`Starting deletion of ${totalMappings} mappings...`);
      
      let deletedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Enterprise: Delete with progress tracking and error handling
      for (let i = 0; i < mappingsToDelete.length; i++) {
        const mapping = mappingsToDelete[i];
        try {
          await client.graphql({
            query: deleteTemplateMapping,
            variables: { input: { id: mapping.id } }
          });
          deletedCount++;
          
          // Update progress
          const progress = Math.round(((i + 1) / totalMappings) * 100);
          setDeleteProgress(progress);
          
        } catch (deleteError) {
          failedCount++;
          const errorMsg = `Failed to delete mapping ${mapping.id}: ${deleteError}`;
          errors.push(errorMsg);
          console.warn(errorMsg, deleteError);
        }
      }

      // Enterprise: Comprehensive result reporting
      if (deletedCount > 0) {
        const successMsg = `Successfully deleted ${deletedCount} mappings for "${templateName}"`;
        toast.success(successMsg);
        console.log(`✅ [AUDIT] ${successMsg}`);
      }
      
      if (failedCount > 0) {
        const warningMsg = `${failedCount} mappings could not be deleted due to permissions or data constraints`;
        toast.warning(warningMsg);
        console.warn(`⚠️ [AUDIT] ${warningMsg}`, errors);
      }

      // Enterprise: Always update local state and refresh
      dispatch(deleteMapping(templateId));
      dispatch(fetchMappingsIfNeeded());
      
    } catch (error) {
      console.error('❌ [AUDIT] Critical error during mapping deletion:', error);
      toast.error('Failed to delete mappings. Please try again or contact support.');
    } finally {
      setDeletingTemplateId(null);
      setDeleteProgress(0);
      setSelectedTemplate(null);
    }
  };

  // Enterprise-grade "Clear All" with comprehensive confirmation
  const handleClearAllMappings = () => {
    setShowClearAllDialog(true);
  };

  const confirmClearAllMappings = async () => {
    setDeletingAll(true);
    setDeleteProgress(0);
    setShowClearAllDialog(false);

    try {
      // Enterprise: Log the bulk deletion attempt
      const templateCount = Object.keys(mappings).length;
      console.log(`🔒 [AUDIT] User initiated bulk deletion for ${templateCount} templates`);
      
      toast.info(`Starting bulk deletion of all mappings...`);
      
      let totalDeleted = 0;
      let totalFailed = 0;
      const templateIds = Object.keys(mappings);
      
      // Enterprise: Process each template with progress tracking
      for (let i = 0; i < templateIds.length; i++) {
        const templateId = templateIds[i];
        const templateName = templates.find(t => t.id === templateId)?.name || 'Unknown Template';
        
        try {
          // Delete mappings for this template
          const { listTemplateMappings } = await import('@/graphql/queries');
          const { deleteTemplateMapping } = await import('@/graphql/mutations');
          
          const result = await client.graphql({
            query: listTemplateMappings,
            variables: { 
              filter: { templateID: { eq: templateId } },
              limit: 1000 
            }
          });
          
          const mappingsToDelete = result.data?.listTemplateMappings?.items || [];
          
          for (const mapping of mappingsToDelete) {
            try {
              await client.graphql({
                query: deleteTemplateMapping,
                variables: { input: { id: mapping.id } }
              });
              totalDeleted++;
            } catch (deleteError) {
              totalFailed++;
              console.warn(`Failed to delete mapping ${mapping.id} for template ${templateName}:`, deleteError);
            }
          }
          
          // Update progress
          const progress = Math.round(((i + 1) / templateIds.length) * 100);
          setDeleteProgress(progress);
          
        } catch (templateError) {
          totalFailed++;
          console.warn(`Failed to process template ${templateName}:`, templateError);
        }
      }

      // Enterprise: Clear local state
      Object.keys(mappings).forEach(templateId => {
        dispatch(deleteMapping(templateId));
      });
      dispatch(fetchMappingsIfNeeded());

      // Enterprise: Comprehensive result reporting
      if (totalDeleted > 0) {
        const successMsg = `Successfully deleted ${totalDeleted} mappings across all templates`;
        toast.success(successMsg);
        console.log(`✅ [AUDIT] ${successMsg}`);
      }
      
      if (totalFailed > 0) {
        const warningMsg = `${totalFailed} mappings could not be deleted due to permissions`;
        toast.warning(warningMsg);
        console.warn(`⚠️ [AUDIT] ${warningMsg}`);
      }
      
    } catch (error) {
      console.error('❌ [AUDIT] Critical error during bulk deletion:', error);
      toast.error('Failed to clear all mappings. Please try again or contact support.');
    } finally {
      setDeletingAll(false);
      setDeleteProgress(0);
    }
  };

  // Enterprise: Loading states
  const isLoading = templatesStatus === 'loading' || mappingsLoading;
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
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header Card - Enterprise-grade with security indicators */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
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
              <Badge variant="outline" className="ml-2">
                <Shield className="w-3 h-3 mr-1" />
                Enterprise
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllMappings}
              disabled={deletingAll || Object.keys(mappings).length === 0}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              {deletingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {deletingAll ? 'Clearing...' : 'Clear All Mappings'}
            </Button>
          </div>
          
          {/* Enterprise: Progress indicator for bulk operations */}
          {deletingAll && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Clearing all mappings...</span>
                <span>{deleteProgress}%</span>
              </div>
              <Progress value={deleteProgress} className="h-2" />
            </div>
          )}
        </div>

        {/* Table/Card - Enterprise-grade with enhanced UX */}
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
                const isDeleting = deletingTemplateId === template.id;
                
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
                        
                        {/* Enterprise: Enhanced delete button with confirmation */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 p-0 hover:bg-red-100 hover:text-red-700"
                                onClick={() => handleDeleteMapping(template.id, template.name)}
                                disabled={isDeleting || deletingAll}
                                aria-label="Delete Mapping"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {isDeleting ? 'Deleting...' : 'Delete all mappings for this template'}
                            </TooltipContent>
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

      {/* Google/Microsoft-style: Simple Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete mappings?</DialogTitle>
            <DialogDescription>
              This will permanently delete all mappings for "{selectedTemplate?.name}". This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteMapping}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google/Microsoft-style: Simple Clear All Dialog */}
      <Dialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear all mappings?</DialogTitle>
            <DialogDescription>
              This will permanently delete all mappings for all templates. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearAllDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmClearAllMappings}
            >
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
