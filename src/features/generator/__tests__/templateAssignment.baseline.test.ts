/**
 * Baseline Tests for Template Assignment Functions (Before Extraction)
 * These tests verify the current functionality before we extract the functions to a custom hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from '@/types/provider';
import { Template } from '@/types/template';

// Mock the functions from ContractGenerator.tsx for baseline testing
// We'll copy these functions here to test them in isolation

// Mock Redux store and dispatch
const mockDispatch = vi.fn();
const mockShowSuccess = vi.fn();
const mockShowError = vi.fn();
const mockShowWarning = vi.fn();
const mockShowInfo = vi.fn();

// Mock state variables
let templateAssignments: Record<string, string> = {};
let selectedTemplate: Template | null = null;
let templates: Template[] = [];
let providers: Provider[] = [];
let selectedProviderIds: string[] = [];
let bulkAssignmentLoading = false;
let bulkAssignmentProgress: { completed: number; total: number } | null = null;

// Mock setter functions
const setTemplateAssignments = vi.fn((assignments: Record<string, string>) => {
  templateAssignments = assignments;
});

const setSessionTemplateAssignments = vi.fn((assignments: Record<string, string>) => {
  // Mock session storage update
});

const setBulkAssignmentLoading = vi.fn((loading: boolean) => {
  bulkAssignmentLoading = loading;
});

const setBulkAssignmentProgress = vi.fn((progress: { completed: number; total: number } | null) => {
  bulkAssignmentProgress = progress;
});

const setSelectedProviderIds = vi.fn((ids: string[]) => {
  selectedProviderIds = ids;
});

// Mock getFilteredProviderIds
const getFilteredProviderIds = vi.fn(() => providers.map(p => p.id));

// Copy the functions from ContractGenerator.tsx
const getAssignedTemplate = (provider: Provider) => {
  // Filter out templates with empty IDs or names
  const validTemplates = templates.filter(t => 
    t && 
    t.id && 
    t.id.trim() !== '' && 
    t.name && 
    t.name.trim() !== ''
  );
  
  // 1. Check if manually assigned
  if (templateAssignments[provider.id]) {
    const assignedTemplate = validTemplates.find(t => t.id === templateAssignments[provider.id]);
    if (assignedTemplate) {
      return assignedTemplate;
    }
    return null;
  }
  
  // 2. Fallback to selected template (original behavior)
  if (selectedTemplate && selectedTemplate.id && selectedTemplate.id.trim() !== '') {
    return selectedTemplate;
  }
  return null;
};

const updateProviderTemplate = (providerId: string, templateId: string | null) => {
  const provider = providers.find(p => p.id === providerId);
  const template = templates.find(t => t.id === templateId);
  
  // Safety check to prevent empty template IDs
  if (templateId && templateId.trim() !== '' && templateId !== 'no-template') {
    const newAssignments = { ...templateAssignments, [providerId]: templateId };
    setTemplateAssignments(newAssignments);
    // Also update session storage for tab navigation persistence
    setSessionTemplateAssignments(newAssignments);
    mockShowSuccess(`Template "${template?.name}" assigned to ${provider?.name}`);
    
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
      
      mockDispatch({
        type: 'audit/logSecurityEvent',
        payload: {
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
        }
      });
    } catch (auditError) {
      console.error('Failed to log template assignment:', auditError);
    }
  } else {
    const newAssignments = { ...templateAssignments };
    delete newAssignments[providerId];
    setTemplateAssignments(newAssignments);
    // Also update session storage
    setSessionTemplateAssignments(newAssignments);
    mockShowSuccess(`Template assignment cleared for ${provider?.name}`);
    
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
      
      mockDispatch({
        type: 'audit/logSecurityEvent',
        payload: {
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
        }
      });
    } catch (auditError) {
      console.error('Failed to log template unassignment:', auditError);
    }
  }
};

const assignTemplateToFiltered = async (templateId: string) => {
  if (!templateId || templateId.trim() === '' || templateId === 'no-template') {
    mockShowError({ message: 'Please select a template first', severity: 'error' });
    return;
  }

  const filteredIds = getFilteredProviderIds();
  if (filteredIds.length === 0) {
    mockShowError({ message: 'No providers match the current filters', severity: 'error' });
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
      setSessionTemplateAssignments(newAssignments);
      
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
      
      await mockDispatch({
        type: 'audit/logSecurityEvent',
        payload: {
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
        }
      });
    } catch (auditError) {
      console.error('Failed to log bulk template assignment:', auditError);
    }
    
    mockShowSuccess(`Assigned template "${template?.name}" to ${filteredIds.length} providers`);
    
  } catch (error) {
    console.error('Error during bulk assignment:', error);
    mockShowError({ message: 'Failed to assign templates. Please try again.', severity: 'error' });
  } finally {
    setBulkAssignmentLoading(false);
    setBulkAssignmentProgress(null);
  }
};

const clearFilteredAssignments = async () => {
  const filteredIds = getFilteredProviderIds();
  if (filteredIds.length === 0) {
    mockShowWarning('No providers match the current filters');
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
      setSessionTemplateAssignments(newAssignments);
      
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
    
    mockShowSuccess(`Cleared assignments for ${filteredIds.length} providers`);
    
  } catch (error) {
    console.error('Error during bulk clear:', error);
    mockShowError({ message: 'Failed to clear assignments. Please try again.', severity: 'error' });
  } finally {
    setBulkAssignmentLoading(false);
    setBulkAssignmentProgress(null);
  }
};

const clearTemplateAssignments = () => {
  const previousCount = Object.keys(templateAssignments).length;
  setTemplateAssignments({});
  // Also clear session storage
  setSessionTemplateAssignments({});
  // Show success feedback
  mockShowSuccess('All template assignments cleared successfully!');
  
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
    
    mockDispatch({
      type: 'audit/logSecurityEvent',
      payload: {
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
      }
    });
  } catch (auditError) {
    console.error('Failed to log bulk template clear:', auditError);
  }
};

const smartAssignTemplates = () => {
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
  // Also update session storage
  setSessionTemplateAssignments(newAssignments);
  
  if (assignedCount > 0) {
    mockShowSuccess(`Smart assigned templates to ${assignedCount} providers`);
  } else {
    mockShowInfo('No new templates assigned. Some providers may already have templates or no suitable templates found.');
  }
};

describe('Template Assignment Functions - Baseline Tests (Before Extraction)', () => {
  beforeEach(() => {
    // Reset all mocks and state
    vi.clearAllMocks();
    templateAssignments = {};
    selectedTemplate = null;
    templates = [];
    providers = [];
    selectedProviderIds = [];
    bulkAssignmentLoading = false;
    bulkAssignmentProgress = null;
    
    // Setup test data
    templates = [
      {
        id: 'template-1',
        name: 'Cardiology Template',
        tags: ['cardiology', 'specialist'],
        compensationModel: 'PRODUCTIVITY'
      } as Template,
      {
        id: 'template-2',
        name: 'Primary Care Template',
        tags: ['primary-care', 'general'],
        compensationModel: 'BASE'
      } as Template,
      {
        id: 'template-3',
        name: 'Hospitalist Template',
        tags: ['hospitalist', 'inpatient'],
        compensationModel: 'HOSPITALIST'
      } as Template
    ];
    
    providers = [
      {
        id: 'provider-1',
        name: 'Dr. Smith',
        specialty: 'Cardiology',
        providerType: 'Specialist',
        compensationModel: 'PRODUCTIVITY'
      } as Provider,
      {
        id: 'provider-2',
        name: 'Dr. Johnson',
        specialty: 'Primary Care',
        providerType: 'General',
        compensationModel: 'BASE'
      } as Provider,
      {
        id: 'provider-3',
        name: 'Dr. Williams',
        specialty: 'Hospitalist',
        providerType: 'Hospitalist',
        compensationModel: 'HOSPITALIST'
      } as Provider
    ];
  });

  describe('getAssignedTemplate', () => {
    it('should return manually assigned template', () => {
      templateAssignments = { 'provider-1': 'template-1' };
      const result = getAssignedTemplate(providers[0]);
      expect(result).toEqual(templates[0]);
    });

    it('should return selected template when no manual assignment', () => {
      selectedTemplate = templates[1];
      const result = getAssignedTemplate(providers[0]);
      expect(result).toEqual(templates[1]);
    });

    it('should return null when no assignment or selected template', () => {
      const result = getAssignedTemplate(providers[0]);
      expect(result).toBeNull();
    });

    it('should filter out invalid templates', () => {
      templates.push({ id: '', name: 'Invalid Template' } as Template);
      templateAssignments = { 'provider-1': '' };
      const result = getAssignedTemplate(providers[0]);
      expect(result).toBeNull();
    });
  });

  describe('updateProviderTemplate', () => {
    it('should assign template to provider', () => {
      updateProviderTemplate('provider-1', 'template-1');
      expect(setTemplateAssignments).toHaveBeenCalledWith({ 'provider-1': 'template-1' });
      expect(mockShowSuccess).toHaveBeenCalledWith('Template "Cardiology Template" assigned to Dr. Smith');
    });

    it('should clear template assignment when templateId is null', () => {
      templateAssignments = { 'provider-1': 'template-1' };
      updateProviderTemplate('provider-1', null);
      expect(setTemplateAssignments).toHaveBeenCalledWith({});
      expect(mockShowSuccess).toHaveBeenCalledWith('Template assignment cleared for Dr. Smith');
    });

    it('should clear assignment for empty template ID', () => {
      templateAssignments = { 'provider-1': 'template-1' };
      updateProviderTemplate('provider-1', '');
      expect(setTemplateAssignments).toHaveBeenCalledWith({});
      expect(mockShowSuccess).toHaveBeenCalledWith('Template assignment cleared for Dr. Smith');
    });

    it('should clear assignment for no-template ID', () => {
      templateAssignments = { 'provider-1': 'template-1' };
      updateProviderTemplate('provider-1', 'no-template');
      expect(setTemplateAssignments).toHaveBeenCalledWith({});
      expect(mockShowSuccess).toHaveBeenCalledWith('Template assignment cleared for Dr. Smith');
    });
  });

  describe('assignTemplateToFiltered', () => {
    beforeEach(() => {
      getFilteredProviderIds.mockReturnValue(['provider-1', 'provider-2']);
    });

    it('should assign template to all filtered providers', async () => {
      await assignTemplateToFiltered('template-1');
      expect(setTemplateAssignments).toHaveBeenCalledWith({ 'provider-1': 'template-1', 'provider-2': 'template-1' });
      expect(mockShowSuccess).toHaveBeenCalledWith('Assigned template "Cardiology Template" to 2 providers');
    });

    it('should show error for empty template ID', async () => {
      await assignTemplateToFiltered('');
      expect(mockShowError).toHaveBeenCalledWith({ message: 'Please select a template first', severity: 'error' });
    });

    it('should show error when no providers match filters', async () => {
      getFilteredProviderIds.mockReturnValue([]);
      await assignTemplateToFiltered('template-1');
      expect(mockShowError).toHaveBeenCalledWith({ message: 'No providers match the current filters', severity: 'error' });
    });
  });

  describe('clearFilteredAssignments', () => {
    beforeEach(() => {
      getFilteredProviderIds.mockReturnValue(['provider-1', 'provider-2']);
      templateAssignments = { 'provider-1': 'template-1', 'provider-2': 'template-2' };
    });

    it('should clear assignments for filtered providers', async () => {
      await clearFilteredAssignments();
      expect(setTemplateAssignments).toHaveBeenCalledWith({});
      expect(mockShowSuccess).toHaveBeenCalledWith('Cleared assignments for 2 providers');
    });

    it('should show warning when no providers match filters', async () => {
      getFilteredProviderIds.mockReturnValue([]);
      await clearFilteredAssignments();
      expect(mockShowWarning).toHaveBeenCalledWith('No providers match the current filters');
    });
  });

  describe('clearTemplateAssignments', () => {
    it('should clear all template assignments', () => {
      templateAssignments = { 'provider-1': 'template-1', 'provider-2': 'template-2' };
      clearTemplateAssignments();
      expect(setTemplateAssignments).toHaveBeenCalledWith({});
      expect(mockShowSuccess).toHaveBeenCalledWith('All template assignments cleared successfully!');
    });
  });

  describe('smartAssignTemplates', () => {
    beforeEach(() => {
      selectedProviderIds = ['provider-1', 'provider-2', 'provider-3'];
    });

    it('should smart assign templates based on specialty', () => {
      smartAssignTemplates();
      expect(setTemplateAssignments).toHaveBeenCalledWith({
        'provider-1': 'template-1', // Cardiology
        'provider-2': 'template-2', // Primary Care
        'provider-3': 'template-3'  // Hospitalist
      });
      expect(mockShowSuccess).toHaveBeenCalledWith('Smart assigned templates to 3 providers');
    });

    it('should skip providers that already have assignments', () => {
      templateAssignments = { 'provider-1': 'template-2' };
      smartAssignTemplates();
      expect(setTemplateAssignments).toHaveBeenCalledWith({
        'provider-1': 'template-2', // Already assigned
        'provider-2': 'template-2', // Primary Care
        'provider-3': 'template-3'  // Hospitalist
      });
      expect(mockShowSuccess).toHaveBeenCalledWith('Smart assigned templates to 2 providers');
    });

    it('should show info when no new assignments made', () => {
      templateAssignments = { 'provider-1': 'template-1', 'provider-2': 'template-2', 'provider-3': 'template-3' };
      smartAssignTemplates();
      expect(mockShowInfo).toHaveBeenCalledWith('No new templates assigned. Some providers may already have templates or no suitable templates found.');
    });
  });
}); 