/**
 * Custom hook for template assignment logic
 * Extracted from ContractGenerator.tsx to improve maintainability and testability
 */

import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Provider } from '@/types/provider';
import { Template } from '@/types/template';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import type { AppDispatch } from '@/store';

interface UseTemplateAssignmentProps {
  templates: Template[];
  providers: Provider[];
  selectedProviderIds: string[];
  selectedTemplate: Template | null;
  getFilteredProviderIds: () => string[];
  showSuccess: (message: string) => void;
  showError: (error: { message: string; severity: string }) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

interface UseTemplateAssignmentReturn {
  // State
  templateAssignments: Record<string, string>;
  bulkAssignmentLoading: boolean;
  bulkAssignmentProgress: { completed: number; total: number } | null;
  
  // Functions
  getAssignedTemplate: (provider: Provider) => Template | null;
  updateProviderTemplate: (providerId: string, templateId: string | null) => void;
  assignTemplateToFiltered: (templateId: string) => Promise<void>;
  clearFilteredAssignments: () => Promise<void>;
  clearTemplateAssignments: () => void;
  smartAssignTemplates: () => void;
  
  // Setters
  setTemplateAssignments: (assignments: Record<string, string>) => void;
  setBulkAssignmentLoading: (loading: boolean) => void;
  setBulkAssignmentProgress: (progress: { completed: number; total: number } | null) => void;
}

export const useTemplateAssignment = ({
  templates,
  providers,
  selectedProviderIds,
  selectedTemplate,
  getFilteredProviderIds,
  showSuccess,
  showError,
  showWarning,
  showInfo
}: UseTemplateAssignmentProps): UseTemplateAssignmentReturn => {
  const dispatch = useDispatch<AppDispatch>();
  
  // State
  const [templateAssignments, setTemplateAssignments] = useState<Record<string, string>>({});
  const [bulkAssignmentLoading, setBulkAssignmentLoading] = useState(false);
  const [bulkAssignmentProgress, setBulkAssignmentProgress] = useState<{ completed: number; total: number } | null>(null);

  // Get assigned template for a provider
  const getAssignedTemplate = useCallback((provider: Provider) => {
    // Filter out templates with empty IDs or names
    const validTemplates = templates.filter(t => 
      t && 
      t.id && 
      t.id.trim() !== '' && 
      t.name && 
      t.name.trim() !== ''
    );
    
    // Debug logging
    console.log('🔍 getAssignedTemplate Debug:', {
      providerId: provider.id,
      providerName: provider.name,
      templateAssignments: templateAssignments,
      hasAssignment: !!templateAssignments[provider.id],
      assignmentId: templateAssignments[provider.id],
      validTemplatesCount: validTemplates.length,
      selectedTemplate: selectedTemplate,
      validTemplateIds: validTemplates.map(t => t.id)
    });
    
    // 1. Check if manually assigned
    if (templateAssignments[provider.id]) {
      const assignedTemplate = validTemplates.find(t => t.id === templateAssignments[provider.id]);
      if (assignedTemplate) {
        console.log('✅ Found assigned template:', assignedTemplate.name);
        return assignedTemplate;
      }
      console.log('❌ Assigned template not found in valid templates');
      return null;
    }
    
    // 2. Fallback to selected template (original behavior)
    if (selectedTemplate && selectedTemplate.id && selectedTemplate.id.trim() !== '') {
      console.log('✅ Using selected template:', selectedTemplate.name);
      return selectedTemplate;
    }
    console.log('❌ No template found');
    return null;
  }, [templates, templateAssignments, selectedTemplate]);

  // Update template assignment for a provider
  const updateProviderTemplate = useCallback((providerId: string, templateId: string | null) => {
    const provider = providers.find(p => p.id === providerId);
    const template = templates.find(t => t.id === templateId);
    
    // Safety check to prevent empty template IDs
    if (templateId && templateId.trim() !== '' && templateId !== 'no-template') {
      const newAssignments = { ...templateAssignments, [providerId]: templateId };
      setTemplateAssignments(newAssignments);
      showSuccess(`Template "${template?.name}" assigned to ${provider?.name}`);
      
      // Log individual template assignment
      try {
        const auditDetails = JSON.stringify({
          action: 'TEMPLATE_ASSIGNED',
          providerId: providerId,
          providerName: provider?.name,
          templateId: templateId,
          templateName: template?.name,
          assignmentType: 'individual',
          timestamp: new Date().toISOString(),
          metadata: {
            providerId: providerId,
            providerName: provider?.name,
            templateId: templateId,
            templateName: template?.name,
            assignmentType: 'individual',
            operation: 'assign',
            success: true
          }
        });
        
        dispatch(logSecurityEvent({
          action: 'TEMPLATE_ASSIGNED',
          details: auditDetails,
          severity: 'LOW',
          category: 'DATA',
          resourceType: 'TEMPLATE_ASSIGNMENT',
          resourceId: providerId,
          metadata: {
            providerId: providerId,
            providerName: provider?.name,
            templateId: templateId,
            templateName: template?.name,
            assignmentType: 'individual',
            operation: 'assign',
            success: true
          },
        }));
      } catch (auditError) {
        console.error('Failed to log template assignment:', auditError);
      }
    } else {
      const newAssignments = { ...templateAssignments };
      delete newAssignments[providerId];
      setTemplateAssignments(newAssignments);
      showSuccess(`Template assignment cleared for ${provider?.name}`);
      
      // Log template unassignment
      try {
        const auditDetails = JSON.stringify({
          action: 'TEMPLATE_UNASSIGNED',
          providerId: providerId,
          providerName: provider?.name,
          assignmentType: 'individual',
          timestamp: new Date().toISOString(),
          metadata: {
            providerId: providerId,
            providerName: provider?.name,
            assignmentType: 'individual',
            operation: 'unassign',
            success: true
          }
        });
        
        dispatch(logSecurityEvent({
          action: 'TEMPLATE_UNASSIGNED',
          details: auditDetails,
          severity: 'LOW',
          category: 'DATA',
          resourceType: 'TEMPLATE_ASSIGNMENT',
          resourceId: providerId,
          metadata: {
            providerId: providerId,
            providerName: provider?.name,
            assignmentType: 'individual',
            operation: 'unassign',
            success: true
          },
        }));
      } catch (auditError) {
        console.error('Failed to log template unassignment:', auditError);
      }
    }
  }, [templateAssignments, providers, templates, dispatch, showSuccess]);

  // Bulk template assignment with progress
  const assignTemplateToFiltered = useCallback(async (templateId: string) => {
    if (!templateId || templateId.trim() === '' || templateId === 'no-template') {
      showError({ message: 'Please select a template first', severity: 'error' });
      return;
    }

    const filteredIds = getFilteredProviderIds();
    if (filteredIds.length === 0) {
      showError({ message: 'No providers match the current filters', severity: 'error' });
      return;
    }

    setBulkAssignmentLoading(true);
    setBulkAssignmentProgress({ completed: 0, total: filteredIds.length });

    try {
      const newAssignments = { ...templateAssignments };
      const template = templates.find(t => t.id === templateId);
      
      // Process in batches for better UX
      const batchSize = 10;
      for (let i = 0; i < filteredIds.length; i += batchSize) {
        const batch = filteredIds.slice(i, i + batchSize);
        
        // Update assignments for this batch
        batch.forEach(providerId => {
          newAssignments[providerId] = templateId;
        });
        
        // Update state immediately for visual feedback
        setTemplateAssignments(newAssignments);
        
        // Update progress
        setBulkAssignmentProgress({ 
          completed: Math.min(i + batchSize, filteredIds.length), 
          total: filteredIds.length 
        });
        
        // Small delay to show progress
        if (i + batchSize < filteredIds.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      // Log bulk template assignment operation
      try {
        const auditDetails = JSON.stringify({
          action: 'BULK_TEMPLATE_ASSIGNMENT',
          templateId: templateId,
          templateName: template?.name,
          providerCount: filteredIds.length,
          providerIds: filteredIds,
          assignmentType: 'filtered',
          timestamp: new Date().toISOString(),
          metadata: {
            templateId: templateId,
            templateName: template?.name,
            providerCount: filteredIds.length,
            providerIds: filteredIds,
            assignmentType: 'filtered',
            operation: 'bulk_assignment',
            success: true
          }
        });
        
        await dispatch(logSecurityEvent({
          action: 'BULK_TEMPLATE_ASSIGNMENT',
          details: auditDetails,
          severity: 'MEDIUM',
          category: 'DATA',
          resourceType: 'TEMPLATE_ASSIGNMENT',
          resourceId: templateId,
          metadata: {
            templateId: templateId,
            templateName: template?.name,
            providerCount: filteredIds.length,
            providerIds: filteredIds,
            assignmentType: 'filtered',
            operation: 'bulk_assignment',
            success: true
          },
        }));
      } catch (auditError) {
        console.error('Failed to log bulk template assignment:', auditError);
      }
      
      showSuccess(`Assigned template "${template?.name}" to ${filteredIds.length} providers`);
      
    } catch (error) {
      console.error('Error during bulk assignment:', error);
      showError({ message: 'Failed to assign templates. Please try again.', severity: 'error' });
    } finally {
      setBulkAssignmentLoading(false);
      setBulkAssignmentProgress(null);
    }
  }, [templateAssignments, templates, getFilteredProviderIds, dispatch, showSuccess, showError]);

  // Clear filtered assignments
  const clearFilteredAssignments = useCallback(async () => {
    const filteredIds = getFilteredProviderIds();
    if (filteredIds.length === 0) {
      showWarning('No providers match the current filters');
      return;
    }

    setBulkAssignmentLoading(true);
    setBulkAssignmentProgress({ completed: 0, total: filteredIds.length });

    try {
      const newAssignments = { ...templateAssignments };
      
      // Process in batches for better UX
      const batchSize = 10;
      for (let i = 0; i < filteredIds.length; i += batchSize) {
        const batch = filteredIds.slice(i, i + batchSize);
        
        // Clear assignments for this batch
        batch.forEach(providerId => {
          delete newAssignments[providerId];
        });
        
        // Update state immediately for visual feedback
        setTemplateAssignments(newAssignments);
        
        // Update progress
        setBulkAssignmentProgress({ 
          completed: Math.min(i + batchSize, filteredIds.length), 
          total: filteredIds.length 
        });
        
        // Small delay to show progress
        if (i + batchSize < filteredIds.length) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
      
      showSuccess(`Cleared assignments for ${filteredIds.length} providers`);
      
    } catch (error) {
      console.error('Error during bulk clear:', error);
      showError({ message: 'Failed to clear assignments. Please try again.', severity: 'error' });
    } finally {
      setBulkAssignmentLoading(false);
      setBulkAssignmentProgress(null);
    }
  }, [templateAssignments, getFilteredProviderIds, showSuccess, showWarning, showError]);

  // Clear all template assignments
  const clearTemplateAssignments = useCallback(() => {
    const previousCount = Object.keys(templateAssignments).length;
    setTemplateAssignments({});
    showSuccess('All template assignments cleared successfully!');
    
    // Log bulk clear operation
    try {
      const auditDetails = JSON.stringify({
        action: 'BULK_TEMPLATE_CLEAR',
        clearedCount: previousCount,
        assignmentType: 'all',
        timestamp: new Date().toISOString(),
        metadata: {
          clearedCount: previousCount,
          assignmentType: 'all',
          operation: 'bulk_clear',
          success: true
        }
      });
      
      dispatch(logSecurityEvent({
        action: 'BULK_TEMPLATE_CLEAR',
        details: auditDetails,
        severity: 'MEDIUM',
        category: 'DATA',
        resourceType: 'TEMPLATE_ASSIGNMENT',
        resourceId: 'bulk_clear',
        metadata: {
          clearedCount: previousCount,
          assignmentType: 'all',
          operation: 'bulk_clear',
          success: true
        },
      }));
    } catch (auditError) {
      console.error('Failed to log bulk template clear:', auditError);
    }
  }, [templateAssignments, dispatch, showSuccess]);

  // Smart template assignment based on provider characteristics
  const smartAssignTemplates = useCallback(() => {
    const selectedProviders = providers.filter(p => selectedProviderIds.includes(p.id));
    const newAssignments = { ...templateAssignments };
    let assignedCount = 0;

    selectedProviders.forEach(provider => {
      // Skip if already manually assigned
      if (templateAssignments[provider.id]) {
        return;
      }

      // Smart assignment logic based on provider characteristics
      let bestTemplate = null;

      // 1. Try to match by specialty
      if (provider.specialty) {
        bestTemplate = templates.find(t => 
          t.name.toLowerCase().includes(provider.specialty.toLowerCase()) ||
          t.tags?.some((tag: string) => tag.toLowerCase().includes(provider.specialty.toLowerCase()))
        );
      }

      // 2. Try to match by provider type
      if (!bestTemplate && provider.providerType) {
        bestTemplate = templates.find(t => 
          t.name.toLowerCase().includes(provider.providerType.toLowerCase()) ||
          t.tags?.some((tag: string) => tag.toLowerCase().includes(provider.providerType.toLowerCase()))
        );
      }

      // 3. Try to match by compensation model
      if (!bestTemplate && provider.compensationModel) {
        bestTemplate = templates.find(t => 
          t.name.toLowerCase().includes(provider.compensationModel.toLowerCase()) ||
          t.tags?.some((tag: string) => tag.toLowerCase().includes(provider.compensationModel.toLowerCase()))
        );
      }

      // 4. Fallback to first available template
      if (!bestTemplate && templates.length > 0) {
        bestTemplate = templates[0];
      }

      if (bestTemplate) {
        newAssignments[provider.id] = bestTemplate.id;
        assignedCount++;
      }
    });

    setTemplateAssignments(newAssignments);
    
    if (assignedCount > 0) {
      showSuccess(`Smart assigned templates to ${assignedCount} providers`);
    } else {
      showInfo('No new templates assigned. Some providers may already have templates or no suitable templates found.');
    }
  }, [providers, selectedProviderIds, templateAssignments, templates, showSuccess, showInfo]);

  return {
    // State
    templateAssignments,
    bulkAssignmentLoading,
    bulkAssignmentProgress,
    
    // Functions
    getAssignedTemplate,
    updateProviderTemplate,
    assignTemplateToFiltered,
    clearFilteredAssignments,
    clearTemplateAssignments,
    smartAssignTemplates,
    
    // Setters
    setTemplateAssignments,
    setBulkAssignmentLoading,
    setBulkAssignmentProgress,
  };
}; 