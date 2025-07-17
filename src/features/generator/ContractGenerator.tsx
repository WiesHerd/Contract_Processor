import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FileDown, Loader2, Info, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, CheckSquare, Square, Search, Eye, RotateCcw, X, Trash2, FolderOpen, Download, Upload, Users } from 'lucide-react';
import {
  setSelectedTemplate,
  setSelectedProvider,
  setGenerating,
  setError,
  addGeneratedFile,
  clearGeneratedFiles,
  addGenerationLog,
  addGeneratedContract,
  setGeneratedContracts,
  setGenerationLogs,
  clearGeneratedContracts,
} from './generatorSlice';
import { generateDocument, downloadDocument } from './utils/documentGenerator';
import type { GeneratedFile, GeneratedContract } from './generatorSlice';
import { Provider } from '@/types/provider';
import { Template } from '@/types/template';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import localforage from 'localforage';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { Input } from '@/components/ui/input';
import { Editor } from '@tinymce/tinymce-react';
import { getContractFileName } from '@/utils/filename';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import { v4 as uuidv4 } from 'uuid';
import { PageHeader } from '@/components/PageHeader';
import { fetchClausesIfNeeded } from '@/store/slices/clauseSlice';
import { fetchTemplatesIfNeeded } from '@/features/templates/templatesSlice';
import { fetchProvidersIfNeeded } from '@/store/slices/providerSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { AppDispatch } from '@/store';


import { ContractGenerationLogService, ContractGenerationLog } from '@/services/contractGenerationLogService';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ModuleRegistry } from 'ag-grid-community';
import { ClientSideRowModelModule } from 'ag-grid-community';
import { RowSelectionModule } from 'ag-grid-community';
import { PaginationModule } from 'ag-grid-community';
import { Checkbox } from '@/components/ui/checkbox';
import { saveAs } from 'file-saver';
import { saveContractFile, getContractFile, regenerateContractDownloadUrl } from '@/utils/s3Storage';
import { Progress } from '@/components/ui/progress';
import { Clause } from '@/types/clause';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ContractPreviewModal from './components/ContractPreviewModal';

import { useGeneratorPreferences } from '@/hooks/useGeneratorPreferences';
import { useProviderPreferences } from '@/hooks/useUserPreferences';
import { useErrorHandler } from '@/components/ui/error-handler';
import ProgressModal from '@/components/ui/ProgressModal';


ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowSelectionModule,
  PaginationModule,
]);

// Extend Provider type to allow dynamic column access
interface ExtendedProvider extends Provider {
  [key: string]: any;
}

// Utility to normalize smart quotes and special characters
function normalizeSmartQuotes(text: string): string {
  return text
    .replace(/[\u201C\u201D]/g, '"') // " "
    .replace(/[\u2018\u2019]/g, "'") // ' '
    .replace(/\u2013/g, "-")         // –
    .replace(/\u2014/g, "--")        // —
    .replace(/\u2026/g, "...")       // ...
    .replace(/\u00a0/g, " ")         // non-breaking space
    .replace(/\u2022/g, "-");        // bullet to dash
}

// Utility functions for formatting (matching provider screen)
function formatCurrency(value: any) {
  const num = Number(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function formatNumber(value: any) {
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US');
}

// Only format YYYY-MM-DD to MM/DD/YYYY, otherwise return as-is
function formatDate(value: any) {
  if (!value || typeof value !== 'string') return '';
  // Match YYYY-MM-DD
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${m}/${d}/${y}`;
  }
  return value;
}

export default function ContractGenerator() {
  const dispatch = useDispatch<AppDispatch>();
  const { providers, loading: providersLoading, error: providersError } = useSelector((state: RootState) => state.provider);
  const { templates, status: templatesStatus, error: templatesError } = useSelector((state: RootState) => state.templates);
  const { clauses, loading: clausesLoading } = useSelector((state: RootState) => state.clauses);
  const { mappings } = useSelector((state: RootState) => state.mappings);
  const selectedTemplate = useSelector((state: RootState) => state.generator.selectedTemplate);
  const selectedProvider = useSelector((state: RootState) => state.generator.selectedProvider);
  const isGenerating = useSelector((state: RootState) => state.generator.isGenerating);
  const error = useSelector((state: RootState) => state.generator.error);
  const generatedFiles = useSelector((state: RootState) => state.generator.generatedFiles);
  const { generatedContracts } = useSelector((state: RootState) => state.generator);
  const { showError, showSuccess, showWarning, showInfo } = useErrorHandler();
  const { preferences: userPreferences } = useProviderPreferences();

  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [userError, setUserError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const editorRef = useRef<any>(null);
  const [clauseSearch, setClauseSearch] = useState('');
  const [gridScrollWidth, setGridScrollWidth] = useState(0);
  const [gridClientWidth, setGridClientWidth] = useState(0);
  const [activeTabView, setActiveTabView] = useState<'generator' | 'logs'>('generator');
  
  // Contract clearing progress state
  const [clearingProgress, setClearingProgress] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [contractsToClear, setContractsToClear] = useState<ContractGenerationLog[]>([]);


  // Main page filter state (separate from modal)
  const [selectedSpecialty, setSelectedSpecialty] = useState("__ALL__");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState("__ALL__");
  const [selectedProviderType, setSelectedProviderType] = useState("__ALL__");
  
  // Modal-specific filter state (separate from main page)
  const [modalSelectedSpecialty, setModalSelectedSpecialty] = useState("__ALL__");
  const [modalSelectedSubspecialty, setModalSelectedSubspecialty] = useState("__ALL__");
  const [modalSelectedProviderType, setModalSelectedProviderType] = useState("__ALL__");
  const [modalSelectedAdminRole, setModalSelectedAdminRole] = useState("__ALL__");
  const [modalSelectedCompModel, setModalSelectedCompModel] = useState("__ALL__");
  const [selectedTemplateForFiltered, setSelectedTemplateForFiltered] = useState<string>("");
  const [bulkOpen, setBulkOpen] = useState(true);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  const [statusTab, setStatusTab] = useState<'notGenerated' | 'processed' | 'all'>('notGenerated');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isColumnSidebarOpen, setIsColumnSidebarOpen] = useState(false);

  // Progress tracking state
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressData, setProgressData] = useState({
    currentStep: 0,
    totalSteps: 0,
    progress: 0,
    steps: [] as Array<{
      id: string;
      label: string;
      status: 'pending' | 'active' | 'completed' | 'error';
      icon: React.ReactNode;
      details?: string;
    }>,
    successCount: 0,
    errorCount: 0,
    skippedCount: 0,
    currentOperation: '',
    isCancelled: false
  });
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    currentProvider: string;
    status: 'preparing' | 'generating' | 'saving' | 'uploading' | 'complete';
  } | null>(null);
  const [bottomActionMenuOpen, setBottomActionMenuOpen] = useState(false);
  const [clickedProvider, setClickedProvider] = useState<Provider | null>(null);
  const [bulkAssignmentModalOpen, setBulkAssignmentModalOpen] = useState(false);
  const [sameTemplateModalOpen, setSameTemplateModalOpen] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [instructionsModalOpen, setInstructionsModalOpen] = useState(false);
  const [templateErrorModalOpen, setTemplateErrorModalOpen] = useState(false);
  
  // Simple highlight state for the assignment field
  const [showAssignmentHint, setShowAssignmentHint] = useState(true);

  // Auto-hide the assignment hint after 5 seconds or when user interacts
  useEffect(() => {
    if (showAssignmentHint && selectedProviderIds.length > 0) {
      const timer = setTimeout(() => {
        setShowAssignmentHint(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showAssignmentHint, selectedProviderIds.length]);
  
  // Template assignment state - maps provider ID to assigned template ID
  const [templateAssignments, setTemplateAssignments] = useState<Record<string, string>>({});
  
  // Session storage for template assignments (temporary persistence during tab navigation)
  const [sessionTemplateAssignments, setSessionTemplateAssignments] = useState<Record<string, string>>({});
  
  // Track if we've shown the session restoration notification to avoid spam
  const sessionRestoredRef = useRef(false);

  // State for bulk assignment loading
  const [bulkAssignmentLoading, setBulkAssignmentLoading] = useState(false);
  const [bulkAssignmentProgress, setBulkAssignmentProgress] = useState<{ completed: number; total: number } | null>(null);

  // Progress update functions
  const updateProgress = useCallback((updates: Partial<typeof progressData>) => {
    setProgressData(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeProgress = useCallback((totalSteps: number) => {
    const steps = [
      { id: 'folder', label: 'Selecting folder', status: 'pending' as const, icon: <FolderOpen className="w-4 h-4" /> },
      { id: 'generation', label: 'Generating contracts', status: 'pending' as const, icon: <FileText className="w-4 h-4" /> },
      { id: 'saving', label: 'Saving files', status: 'pending' as const, icon: <Download className="w-4 h-4" /> },
      { id: 'uploading', label: 'Uploading to cloud', status: 'pending' as const, icon: <Upload className="w-4 h-4" /> }
    ];
    
    setProgressData({
      currentStep: 0,
      totalSteps,
      progress: 0,
      steps,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      currentOperation: 'Preparing...',
      isCancelled: false
    });
    setProgressModalOpen(true);
  }, []);

  const handleProgressCancel = useCallback(() => {
    setProgressData(prev => ({ ...prev, isCancelled: true }));
  }, []);



  // Filter logic for bulk assignment modal
  const getFilteredProviderIds = useMemo(() => {
    return selectedProviderIds.filter(providerId => {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return false;
      
      // Filter by specialty
      if (modalSelectedSpecialty !== "__ALL__" && provider.specialty !== modalSelectedSpecialty) {
        return false;
      }
      
      // Filter by subspecialty
      if (modalSelectedSubspecialty !== "__ALL__" && provider.subspecialty !== modalSelectedSubspecialty) {
        return false;
      }
      
      // Filter by provider type
      if (modalSelectedProviderType !== "__ALL__" && provider.providerType !== modalSelectedProviderType) {
        return false;
      }
      
      // Filter by administrative role
      if (modalSelectedAdminRole !== "__ALL__") {
        const providerAdminRole = provider.administrativeRole || "None";
        if (providerAdminRole !== modalSelectedAdminRole) {
          return false;
        }
      }
      
      // Filter by compensation model
      if (modalSelectedCompModel !== "__ALL__") {
        const providerCompModel = provider.compensationModel || "Base";
        if (providerCompModel !== modalSelectedCompModel) {
          return false;
        }
      }
      
      return true;
    });
  }, [selectedProviderIds, providers, modalSelectedSpecialty, modalSelectedSubspecialty, modalSelectedProviderType, modalSelectedAdminRole, modalSelectedCompModel]);

  // Get filtered providers count
  const filteredProvidersCount = getFilteredProviderIds.length;

  // Enterprise-grade user preferences for column management (separate from Providers)
  const {
    preferences: columnPreferences,
    loading: preferencesLoading,
    updateColumnVisibility,
    updateColumnOrder,
    updateColumnPinning,
    createSavedView,
    setActiveView: setActiveColumnView,
    deleteSavedView,
    updateDisplaySettings
  } = useGeneratorPreferences();

  // Get preferences (non-filter data)
  const hiddenColumns = new Set(Object.entries(columnPreferences?.columnVisibility || {})
    .filter(([_, visible]) => !visible)
    .map(([col]) => col));
  const columnOrder = columnPreferences?.columnOrder || [];
  const savedViews = columnPreferences?.savedViews || {};
  const activeColumnView = columnPreferences?.activeView || 'default';

  // Load clauses with caching
  useEffect(() => {
    dispatch(fetchClausesIfNeeded());
  }, [dispatch]);

  // Load templates with caching
  useEffect(() => {
    dispatch(fetchTemplatesIfNeeded());
  }, [dispatch]);

  // Load providers with caching
  useEffect(() => {
    dispatch(fetchProvidersIfNeeded());
  }, [dispatch]);

  // Create filtered clauses for the sidebar
  const filteredClauses = clauses.filter((clause: { title: string; content: string }) =>
    clause.title.toLowerCase().includes(clauseSearch.toLowerCase()) ||
    clause.content.toLowerCase().includes(clauseSearch.toLowerCase())
  );

  // Initialize column order for Contract Generator
  useEffect(() => {
    if (providers.length > 0 && columnOrder.length === 0) {
      // Define default column order for Contract Generator
      const defaultColumnOrder = [
        'name',
        'employeeId', 
        'providerType',
        'specialty',
        'subspecialty',
        'administrativeRole',
        'baseSalary',
        'fte',
        'startDate',
        'compensationModel',
        'assignedTemplate'
      ];
      

      
      if (JSON.stringify(defaultColumnOrder) !== JSON.stringify(columnPreferences?.columnOrder)) {
        updateColumnOrder(defaultColumnOrder);
      }
    }
  }, [providers, columnOrder.length, columnPreferences?.columnOrder, updateColumnOrder]);



  // Handle tab switching and restore session assignments
  useEffect(() => {
    if (statusTab === 'notGenerated') {
      // When switching to "Not Generated" tab, restore session assignments
      if (Object.keys(sessionTemplateAssignments).length > 0) {
        setTemplateAssignments(sessionTemplateAssignments);
        // Show a subtle notification that session assignments were restored (only once per session)
        if (!sessionRestoredRef.current) {
          showInfo(`Session assignments restored (${Object.keys(sessionTemplateAssignments).length} templates)`);
          sessionRestoredRef.current = true;
        }
      }
    } else {
      // When switching away from "Not Generated" tab, save current assignments to session
      if (Object.keys(templateAssignments).length > 0) {
        setSessionTemplateAssignments(templateAssignments);
        // Reset the notification flag when saving new assignments
        sessionRestoredRef.current = false;
      }
    }
  }, [statusTab, sessionTemplateAssignments, templateAssignments]);

  // Add AG Grid ref for selection management
  const gridRef = useRef<AgGridReact>(null);



  // Handle window resize for AG Grid
  useEffect(() => {
    const handleResize = () => {
      if (gridRef.current?.api) {
        setTimeout(() => {
          gridRef.current?.api.sizeColumnsToFit();
        }, 100);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcuts for quick actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + R for complete reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
        e.preventDefault();
        setTemplateAssignments({});
        setSessionTemplateAssignments({});
        sessionRestoredRef.current = false;
        setSelectedProviderIds([]);
        showSuccess('Complete reset: All assignments and selections cleared (Ctrl+R)');
      }
      
      // Ctrl/Cmd + Shift + R for session-only reset
      if ((e.ctrlKey || e.metaKey) && e.key === 'R' && e.shiftKey) {
        e.preventDefault();
        setSessionTemplateAssignments({});
        sessionRestoredRef.current = false;
        showSuccess('Session assignments cleared (Ctrl+Shift+R)');
      }
      

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Smart template assignment logic
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



  // Update template assignment for a provider
  const updateProviderTemplate = (providerId: string, templateId: string | null) => {
    const provider = providers.find(p => p.id === providerId);
    const template = templates.find(t => t.id === templateId);
    
    // Safety check to prevent empty template IDs
    if (templateId && templateId.trim() !== '' && templateId !== 'no-template') {
      const newAssignments = { ...templateAssignments, [providerId]: templateId };
      setTemplateAssignments(newAssignments);
      // Also update session storage for tab navigation persistence
      setSessionTemplateAssignments(newAssignments);
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
      // Also update session storage
      setSessionTemplateAssignments(newAssignments);
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
  };

  // Bulk template assignment with progress
  const assignTemplateToFiltered = async (templateId: string) => {
    if (!templateId || templateId.trim() === '' || templateId === 'no-template') {
      showError({ message: 'Please select a template first', severity: 'error' });
      return;
    }

    const filteredIds = getFilteredProviderIds;
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
      setSelectedTemplateForFiltered("");
      
    } catch (error) {
      console.error('Error during bulk assignment:', error);
      showError({ message: 'Failed to assign templates. Please try again.', severity: 'error' });
      
      // Log the failure
      try {
        const auditDetails = JSON.stringify({
          action: 'BULK_TEMPLATE_ASSIGNMENT_FAILED',
          templateId: templateId,
          providerCount: filteredIds.length,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          metadata: {
            templateId: templateId,
            providerCount: filteredIds.length,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'bulk_assignment',
            success: false
          }
        });
        
        await dispatch(logSecurityEvent({
          action: 'BULK_TEMPLATE_ASSIGNMENT_FAILED',
          details: auditDetails,
          severity: 'HIGH',
          category: 'DATA',
          resourceType: 'TEMPLATE_ASSIGNMENT',
          resourceId: templateId,
          metadata: {
            templateId: templateId,
            providerCount: filteredIds.length,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'bulk_assignment',
            success: false
          },
        }));
      } catch (auditError) {
        console.error('Failed to log bulk template assignment failure:', auditError);
      }
    } finally {
      setBulkAssignmentLoading(false);
      setBulkAssignmentProgress(null);
    }
  };

  // Clear filtered assignments with progress
  const clearFilteredAssignments = async () => {
    const filteredIds = getFilteredProviderIds;
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
      
      showSuccess(`Cleared assignments for ${filteredIds.length} providers`);
      
    } catch (error) {
      console.error('Error during bulk clear:', error);
      showError({ message: 'Failed to clear assignments. Please try again.', severity: 'error' });
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
    // Reset notification flag
    sessionRestoredRef.current = false;
    // Show success feedback
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
  };

  // Smart template assignment based on provider characteristics
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
      showSuccess(`Smart assigned templates to ${assignedCount} providers`);
    } else {
      showInfo('No new templates assigned. Some providers may already have templates or no suitable templates found.');
    }
  };



  // Multi-select handlers
  const allProviderIds = providers.map((p: Provider) => p.id);
  const allSelected = selectedProviderIds.length === allProviderIds.length && allProviderIds.length > 0;
  const someSelected = selectedProviderIds.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedProviderIds([]);
      gridRef.current?.api.deselectAll();
    } else {
      // Select all providers that are currently visible in the grid
      const visibleProviderIds = visibleRows.map(row => row.id);
      setSelectedProviderIds(visibleProviderIds);
      // Manually select each visible row in the grid
      visibleRows.forEach(row => {
        const rowNode = gridRef.current?.api.getRowNode(row.id);
        if (rowNode) {
          rowNode.setSelected(true);
        }
      });
    }
  };

  const toggleSelectProvider = (id: string) => {
    setSelectedProviderIds(prev => 
      prev.includes(id) 
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  };

  // Helper function to download a contract with error handling
  const downloadContract = async (provider: Provider, templateId: string) => {
    try {
      // Find the actual generated contract to get the correct information
      const contract = generatedContracts.find(
        c => c.providerId === provider.id && c.templateId === templateId && c.status === 'SUCCESS'
      );
      
      if (!contract) {
        setUserError(`No generated contract found for ${provider.name} with template ${templateId}. Please regenerate the contract.`);
        return;
      }
      
      // Get the template to get the contract year
      const template = templates.find(t => t.id === templateId);
      const contractYear = template?.contractYear || new Date().getFullYear().toString();
      
      const contractId = provider.id + '-' + templateId + '-' + contractYear;
      const fileName = getContractFileName(
        contractYear,
        provider.name,
        new Date().toISOString().split('T')[0]
      );
      
      console.log('Attempting to download contract:', { contractId, fileName, provider: provider.name });
      
      // Try to get the contract file from immutable storage
      let downloadUrl: string;
      try {
        const { immutableContractStorage } = await import('@/utils/immutableContractStorage');
        
        // Extract timestamp from contract ID or use current date as fallback
        const timestamp = new Date().toISOString().split('T')[0]; // Use date part as timestamp
        
        downloadUrl = await immutableContractStorage.getPermanentDownloadUrl(contractId, timestamp, fileName);
        console.log('Successfully retrieved permanent download URL:', downloadUrl.substring(0, 100) + '...');
      } catch (immutableError) {
        console.log('Immutable storage failed, trying S3 storage...', immutableError);
        // Fallback to S3 storage
        try {
          const { getContractFile } = await import('@/utils/s3Storage');
          const result = await getContractFile(contractId, fileName);
          downloadUrl = result.url;
          console.log('Successfully generated download URL via S3 storage:', downloadUrl.substring(0, 100) + '...');
        } catch (s3StorageError) {
          console.log('S3 storage failed, trying direct S3 access...', s3StorageError);
          // Final fallback to direct S3 access
          try {
            const { getContractFile } = await import('@/utils/s3Storage');
            const result = await getContractFile(contractId, fileName);
            downloadUrl = result.url;
            console.log('Successfully generated download URL via S3 fallback:', downloadUrl.substring(0, 100) + '...');
          } catch (fallbackError) {
            console.error('Failed to get download URL:', fallbackError);
            
            // Check if the file actually exists in S3
            const { checkFileExists } = await import('@/utils/s3Storage');
            const fileExists = await checkFileExists(`contracts/${contractId}/${fileName}`);
            
            if (!fileExists) {
              setUserError(`Contract file not found in storage for ${provider.name}. The contract may have been generated but failed to upload to storage. Please regenerate the contract.`);
              
              // Offer to regenerate the contract
              if (confirm(`The contract file for ${provider.name} was not found in storage. Would you like to regenerate it?`)) {
                const assignedTemplate = getAssignedTemplate(provider);
                if (assignedTemplate) {
                  await generateAndDownloadDocx(provider, assignedTemplate);
                } else {
                  setUserError(`No template assigned to ${provider.name}. Please assign a template first.`);
                }
              }
              return;
            } else {
              throw new Error(`File exists in S3 but download URL generation failed: ${fallbackError}`);
            }
          }
        }
      }
      
      // Open download URL in new tab
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Failed to download contract:', error);
      setUserError(`Failed to download contract for ${provider.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try to regenerate the contract if download fails
      if (confirm(`Failed to download the contract. Would you like to regenerate it for ${provider.name}?`)) {
        try {
          // Use the template that's already assigned to this provider
          const assignedTemplate = getAssignedTemplate(provider);
          if (assignedTemplate) {
            console.log(`Regenerating contract for ${provider.name} with assigned template ${assignedTemplate.name}`);
            await generateAndDownloadDocx(provider, assignedTemplate);
            setUserError(`✅ Contract regenerated successfully for ${provider.name}`);
          } else {
            // If no template is assigned, try to find one from the contract data
            const contract = generatedContracts.find(c => c.providerId === provider.id && c.status === 'SUCCESS');
            if (contract) {
              const template = templates.find(t => t.id === contract.templateId);
              if (template) {
                console.log(`Regenerating contract for ${provider.name} with template from contract data: ${template.name}`);
                await generateAndDownloadDocx(provider, template);
                setUserError(`✅ Contract regenerated successfully for ${provider.name}`);
              } else {
                setUserError(`Template not found for ${provider.name}. Please assign a template first.`);
              }
            } else {
              setUserError(`No template assigned to ${provider.name}. Please assign a template first.`);
            }
          }
        } catch (regenerateError) {
          console.error('Contract regeneration failed:', regenerateError);
          setUserError(`Failed to regenerate contract for ${provider.name}: ${regenerateError instanceof Error ? regenerateError.message : 'Unknown error'}`);
        }
      }
    }
  };

  // Helper to generate and download DOCX for a provider
  const generateAndDownloadDocx = async (provider: Provider, template?: Template) => {
    const templateToUse = template || selectedTemplate;
    if (!templateToUse) return;
    
    try {
      const html = templateToUse.editedHtmlContent || templateToUse.htmlPreviewContent || "";
      const mapping = mappings[templateToUse.id]?.mappings;
      
      // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
      const enhancedMapping = mapping?.map(m => {
        // Check if this mapping has a dynamic block (stored in value field with dynamic: prefix)
        if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
          return {
            ...m,
            mappingType: 'dynamic' as const,
            mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
            mappedColumn: undefined, // Clear the mappedColumn since it's a dynamic block
          };
        }
        return {
          ...m,
          mappingType: 'field' as const,
        };
      });
      
      const { content: mergedHtml } = await mergeTemplateWithData(templateToUse, provider, html, enhancedMapping);
      const htmlClean = normalizeSmartQuotes(mergedHtml);
      const aptosStyle = `<style>
body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
  font-family: Aptos, Arial, sans-serif !important;
  font-size: 11pt !important;
}
h1 { font-size: 16pt !important; font-weight: bold !important; }
h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; }
b, strong { font-weight: bold !important; }
</style>`;
      const htmlWithFont = aptosStyle + htmlClean;

      // @ts-ignore
      if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
        setUserError('Failed to generate document. DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.');
        return;
      }
      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
      const contractYear = templateToUse.contractYear || new Date().getFullYear().toString();
      const runDate = new Date().toISOString().split('T')[0];
      const fileName = getContractFileName(contractYear, provider.name, runDate);
      
      // Use modern file picker for download location selection (if supported)
      let fileSaved = false;
      
      if ('showDirectoryPicker' in window) {
        try {
          // Use directory picker to let user choose folder location
          const dirHandle = await (window as any).showDirectoryPicker({
            mode: 'readwrite'
          });
          
          // Create the file in the selected directory
          const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(docxBlob);
          await writable.close();
          
          console.log('Contract saved to user-selected folder:', fileName);
          showSuccess(`Contract saved to selected folder: ${fileName}`);
          fileSaved = true;
        } catch (error) {
          // Only fallback if it's not a user cancellation
          if (error instanceof Error && error.name !== 'AbortError') {
            console.log('Directory picker failed, falling back to default download location');
            const url = URL.createObjectURL(docxBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            fileSaved = true;
          } else {
            console.log('User cancelled folder selection');
            return; // Don't save anywhere if user cancels
          }
        }
      } else {
        // Fallback for browsers that don't support showDirectoryPicker
        const url = URL.createObjectURL(docxBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        fileSaved = true;
      }
      
      // Only continue with S3 storage and logging if file was actually saved
      if (!fileSaved) {
        console.log('File not saved, skipping S3 storage and logging');
        return;
      }
      
      // 1. Store contract with immutable data and permanent URL
      let permanentUrl = '';
      let contractId = '';
      let s3UploadSuccess = false;
      try {
        const contractId = provider.id + '-' + templateToUse.id + '-' + contractYear;
        
        // Convert Blob to Buffer for immutable storage
        const arrayBuffer = await docxBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Store with immutable data and permanent URL
        const { immutableContractStorage } = await import('@/utils/immutableContractStorage');
        const immutableResult = await immutableContractStorage.storeImmutableContract(
          contractId,
          fileName,
          buffer,
          provider, // Snapshot of provider data at generation time
          templateToUse // Snapshot of template data at generation time
        );
        
        permanentUrl = immutableResult.permanentUrl;
        s3UploadSuccess = true;
        
        console.log('✅ Contract stored with immutable data and permanent URL:', { 
          contractId, 
          fileName, 
          permanentUrl: permanentUrl.substring(0, 100) + '...',
          fileHash: immutableResult.fileHash
        });
      } catch (s3err) {
        console.error('Failed to store contract with immutable data:', s3err);
        setUserError(`Contract generated but failed to store permanently: ${s3err instanceof Error ? s3err.message : 'Unknown error'}. You can still download locally.`);
        s3UploadSuccess = false;
      }
      


      // 3. Log the generation event with comprehensive details
      const logInput = {
        providerId: provider.id,
        contractYear: contractYear,
        templateId: templateToUse.id,
        generatedAt: new Date().toISOString(),
        generatedBy: 'user', // TODO: Get actual user ID
        outputType: 'DOCX',
        status: s3UploadSuccess ? 'SUCCESS' : 'FAILED', // Only mark as SUCCESS if immutable storage succeeded
        fileUrl: permanentUrl || fileName, // Prefer permanent URL if available
        notes: `Generated contract for ${provider.name} using template ${templateToUse.name} with immutable data storage${!s3UploadSuccess ? ' - Immutable storage failed' : ''}`
      };

      try {
        const logEntry = await ContractGenerationLogService.createLog(logInput);
        dispatch(addGenerationLog(logEntry));
        dispatch(addGeneratedContract({
          providerId: provider.id,
          templateId: templateToUse.id,
          status: s3UploadSuccess ? 'SUCCESS' : 'FAILED', // Only mark as SUCCESS if immutable storage succeeded
          generatedAt: new Date().toISOString(),
          fileUrl: permanentUrl, // Store the permanent URL for later access
          fileName: fileName,
          s3Key: contractId, // Store contract ID instead of S3 key
          error: !s3UploadSuccess ? 'Immutable storage failed - contract not stored permanently' : undefined,
          dynamoDbId: logEntry?.id, // Store the DynamoDB ID from the log entry
        }));
        
        console.log('Contract generation logged successfully:', logEntry);
      } catch (logError) {
        console.error('Failed to log contract generation:', logError);
        // Continue to audit log even if contract generation log fails
      }
      
      // 4. Always attempt to log to the main audit log
      console.log('Dispatching logSecurityEvent for contract generation', {provider, templateToUse, fileName, contractYear});
      try {
        const auditDetails = JSON.stringify({
          providerId: provider.id,
          providerName: provider.name,
          templateId: templateToUse.id,
          templateName: templateToUse.name,
          contractYear,
          fileUrl: permanentUrl || fileName,
          fileName: fileName,
          contractId: contractId,
          status: 'SUCCESS',
          outputType: 'DOCX',
          generatedAt: new Date().toISOString(),
          metadata: {
            providerId: provider.id,
            providerName: provider.name,
            templateId: templateToUse.id,
            templateName: templateToUse.name,
            contractYear,
            fileUrl: permanentUrl || fileName,
            fileName: fileName,
            contractId: contractId,
            status: 'SUCCESS',
            outputType: 'DOCX',
            generatedAt: new Date().toISOString(),
          }
        });
        
        const result = await dispatch(logSecurityEvent({
          action: 'CONTRACT_GENERATED',
          details: auditDetails,
          severity: 'LOW',
          category: 'DATA',
          resourceType: 'CONTRACT',
          resourceId: provider.id,
          metadata: {
            providerId: provider.id,
            providerName: provider.name,
            templateId: templateToUse.id,
            templateName: templateToUse.name,
            contractYear,
            fileUrl: permanentUrl || fileName,
            fileName: fileName,
            contractId: contractId,
            status: 'SUCCESS',
            outputType: 'DOCX',
            generatedAt: new Date().toISOString(),
          },
        }));
        
        console.log('logSecurityEvent dispatched successfully:', result);
        console.log('Audit log details:', auditDetails);
      } catch (auditLogError) {
        console.error('Error dispatching logSecurityEvent:', auditLogError);
      }
      
    } catch (error) {
      console.error('Error generating document:', error);
      setUserError('Failed to generate document. Please try again.');
      
      // Log the failure
      dispatch(addGeneratedContract({
        providerId: provider.id,
        templateId: templateToUse.id,
        status: 'FAILED',
        generatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        // Note: No dynamoDbId for failed contracts since they weren't logged to DynamoDB
      }));
    }
  };

  const hydrateGeneratedContracts = React.useCallback(async () => {
    try {
      let allLogs: ContractGenerationLog[] = [];
      let nextToken = undefined;
      do {
        const result = await ContractGenerationLogService.listLogs(undefined, 1000, nextToken);
        if (result && result.items) {
          allLogs = allLogs.concat(result.items);
        }
        nextToken = result?.nextToken;
      } while (nextToken);
      
      // Convert all logs to GeneratedContract format and set them all at once
      const generatedContractsFromDb: GeneratedContract[] = allLogs
        .filter(log => log.providerId && log.templateId && log.status && log.generatedAt)
        .map(log => {
          // Map DynamoDB status to Redux status, including PARTIAL_SUCCESS
          let reduxStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
          if (log.status === 'SUCCESS') {
            reduxStatus = 'SUCCESS';
          } else if (log.status === 'PARTIAL_SUCCESS') {
            reduxStatus = 'PARTIAL_SUCCESS';
          } else {
            reduxStatus = 'FAILED';
          }
          
          return {
            providerId: log.providerId,
            templateId: log.templateId,
            status: reduxStatus,
            generatedAt: log.generatedAt,
            dynamoDbId: log.id, // Store the actual DynamoDB ID for deletion
          };
        });

      // Debug the status mapping
      console.log('🔍 Hydration Debug - Status mapping:', {
        totalLogs: allLogs.length,
        filteredLogs: generatedContractsFromDb.length,
        statusBreakdown: allLogs.reduce((acc, log) => {
          acc[log.status || 'undefined'] = (acc[log.status || 'undefined'] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        sampleLogs: allLogs.slice(0, 5).map(log => ({
          id: log.id,
          providerId: log.providerId,
          status: log.status,
          generatedAt: log.generatedAt
        }))
      });
      
      // Set all contracts at once to avoid race conditions
      dispatch(setGeneratedContracts(generatedContractsFromDb));
      
      console.log('✅ Loaded contracts from DynamoDB:', allLogs.length, 'contracts');
      console.log('🔍 Generated contracts after hydration:', generatedContractsFromDb);
      // Clear any previous errors silently
    } catch (e) {
      // Only show error if it's not a benign 'no records found' error
      const err = e as Error;
      if (err && err.message && (err.message.includes('not found') || err.message.includes('No records'))) {
        // treat as empty, not an error - no need to show anything
      } else {
        showError({ message: 'Could not load contract generation status from the backend. Please try again later.', severity: 'error' });
      }
    }
  }, [dispatch]);

  // Load generated contracts on component mount
  useEffect(() => {
    hydrateGeneratedContracts();
  }, [hydrateGeneratedContracts]);

  const handleGenerate = async () => {
    if (selectedProviderIds.length !== 1) return;
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) return;
    
    // Use assigned template or fallback to selected template
    const assignedTemplate = getAssignedTemplate(provider);
    if (!assignedTemplate) {
      setUserError("No template assigned to this provider. Please assign a template first.");
      return;
    }
    
    try {
      await generateAndDownloadDocx(provider, assignedTemplate);
      await hydrateGeneratedContracts();
    } catch (e) {
      setUserError("Failed to generate contract. Please try again.");
    }
  };

  const handleBulkGenerate = async () => {
    console.log('🚀 handleBulkGenerate called');
    console.log('Selected provider IDs:', selectedProviderIds);
    console.log('Selected providers:', selectedProviderIds.map(id => providers.find(p => p.id === id)?.name));
    
    setUserError(null);
    setIsBulkGenerating(true);
    
    // Use all filtered providers, not just paginated
    const selectedProviders = filteredProviders.filter(p => selectedProviderIds.includes(p.id));
    if (selectedProviders.length === 0) {
      setUserError('Please select at least one provider to generate contracts.');
      setIsBulkGenerating(false);
      return;
    }

    // Check if all providers have templates assigned (either manually or using selected template)
    const providersWithoutTemplates = selectedProviders.filter(provider => !getAssignedTemplate(provider));
    if (providersWithoutTemplates.length > 0) {
      setUserError(`Some providers don't have templates assigned. Please assign templates or select a default template.`);
      setIsBulkGenerating(false);
      return;
    }

    // Initialize progress tracking
    initializeProgress(selectedProviders.length);
    updateProgress({ currentOperation: 'Opening folder selection dialog...' });

    // Use File System Access API to select folder for saving contracts
    console.log('Opening folder selection dialog for contract saving');
    
    let selectedFolderHandle: any = null;
    let selectedFolderPath: string | null = null;
    
    try {
      console.log('🔍 Starting folder selection process (main function)...');
      console.log('🔍 File System Access API available:', 'showDirectoryPicker' in window);
      
      // Use the modern File System Access API - only call once
      if ('showDirectoryPicker' in window) {
        console.log('🔍 Attempting to use File System Access API...');
        selectedFolderHandle = await (window as any).showDirectoryPicker({ 
          mode: 'readwrite',
          startIn: 'downloads'
        });
        selectedFolderPath = selectedFolderHandle.name;
        console.log('✅ Folder selected via File System Access API:', selectedFolderPath);
      } else {
        // Fallback for browsers that don't support File System Access API
        console.log('❌ File System Access API not available, showing error');
        setUserError('Your browser does not support folder selection. Please use Chrome, Edge, or Firefox with the latest version.');
        setIsBulkGenerating(false);
        setProgressModalOpen(false);
        return;
      }
    } catch (error) {
      console.error('❌ Folder selection error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('User cancelled folder selection');
        setIsBulkGenerating(false);
        setProgressModalOpen(false);
        return;
      } else {
        console.error('Folder selection failed:', error);
        setUserError('Failed to open folder selection dialog. Please ensure you are using a supported browser.');
        setIsBulkGenerating(false);
        setProgressModalOpen(false);
        return;
      }
    }
    
    if (!selectedFolderPath) {
      setUserError('No folder was selected. Please try again.');
      setIsBulkGenerating(false);
      setProgressModalOpen(false);
      return;
    }

    console.log('🎯 Selected folder for contract generation:', selectedFolderPath);

    // Update progress to generation phase
    updateProgress({ 
      currentStep: 2, 
      progress: 15,
      steps: progressData.steps.map(step => 
        step.id === 'folder' ? { ...step, status: 'completed' } :
        step.id === 'generation' ? { ...step, status: 'active' } : step
      ),
      currentOperation: 'Starting contract generation...'
    });

    const successful: any[] = [];
    const skipped: any[] = [];
    
    for (let i = 0; i < selectedProviders.length; i++) {
      // Check for cancellation
      if (progressData.isCancelled) {
        updateProgress({ currentOperation: 'Operation cancelled by user' });
        setIsBulkGenerating(false);
        return;
      }

      const provider = selectedProviders[i];
      const currentIndex = i + 1;
      const progressPercent = 15 + (currentIndex / selectedProviders.length) * 60; // 15% to 75%
      
      // Update progress
      updateProgress({ 
        currentStep: currentIndex,
        progress: progressPercent,
        currentOperation: `Generating contract for ${provider.name} (${currentIndex}/${selectedProviders.length})`
      });
      
      try {
        const assignedTemplate = getAssignedTemplate(provider);
        if (!assignedTemplate) {
          skipped.push({
            providerName: provider.name,
            reason: 'No template assigned'
          });
          updateProgress({ skippedCount: progressData.skippedCount + 1 });
          continue;
        }
        
        // Generate contract content
        const html = assignedTemplate.editedHtmlContent || assignedTemplate.htmlPreviewContent || "";
        const mapping = mappings[assignedTemplate.id]?.mappings;
        
        // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
        const enhancedMapping = mapping?.map(m => {
          if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
            return {
              ...m,
              mappingType: 'dynamic' as const,
              mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
              mappedColumn: undefined,
            };
          }
          return {
            ...m,
            mappingType: 'field' as const,
          };
        });
        
        const { content: mergedHtml } = await mergeTemplateWithData(assignedTemplate, provider, html, enhancedMapping);
        const htmlClean = normalizeSmartQuotes(mergedHtml);
        const aptosStyle = `<style>
body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
  font-family: Aptos, Arial, sans-serif !important;
  font-size: 11pt !important;
}
h1 { font-size: 16pt !important; font-weight: bold !important; }
h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; }
b, strong { font-weight: bold !important; }
</style>`;
        const htmlWithFont = aptosStyle + htmlClean;

        // @ts-ignore
        if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
          skipped.push({
            providerName: provider.name,
            reason: 'DOCX generator not available'
          });
          updateProgress({ skippedCount: progressData.skippedCount + 1 });
          continue;
        }
        
        // @ts-ignore
        const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
        const contractYear = assignedTemplate.contractYear || new Date().getFullYear().toString();
        const runDate = new Date().toISOString().split('T')[0];
        const fileName = getContractFileName(contractYear, provider.name, runDate);
        
        // Save file to the selected folder using the already selected folder handle
        let fileSaved = false;
        let localFilePath = '';
        
        try {
          // Use the already selected folder handle instead of calling showDirectoryPicker again
          if (selectedFolderHandle && selectedFolderPath) {
            const fileHandle = await selectedFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(docxBlob);
            await writable.close();
            fileSaved = true;
            localFilePath = `${selectedFolderPath}/${fileName}`;
            console.log('✅ File saved to selected folder:', localFilePath);
          } else {
            // Fallback: Download to default location
            const url = URL.createObjectURL(docxBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            fileSaved = true;
            localFilePath = `Downloads/${fileName}`;
            console.log('✅ File downloaded to Downloads folder:', localFilePath);
          }
        } catch (error) {
          console.error('Failed to save file:', error);
          // Fallback to download
          const url = URL.createObjectURL(docxBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          fileSaved = true;
          localFilePath = `Downloads/${fileName}`;
          console.log('✅ File downloaded to Downloads folder (fallback):', localFilePath);
        }
        
        // Store contract with immutable data and permanent URL
        console.log('🔍 Starting S3 upload process...');
        let permanentUrl = '';
        let contractId = '';
        let s3UploadSuccess = false;
        let dynamoDbSuccess = false;
        let logEntryId: string | undefined;
        
        try {
          contractId = provider.id + '-' + assignedTemplate.id + '-' + contractYear;
          
          console.log('🔍 Contract generation debug:', {
            contractId,
            fileName,
            blobSize: docxBlob.size,
            providerId: provider.id,
            templateId: assignedTemplate.id,
            contractYear
          });
          
          // Convert Blob to Buffer for immutable storage
          const arrayBuffer = await docxBlob.arrayBuffer();
          console.log('🔍 ArrayBuffer created, size:', arrayBuffer.byteLength);
          
          // Use Uint8Array instead of Buffer for browser compatibility
          const buffer = new Uint8Array(arrayBuffer);
          console.log('🔍 Uint8Array created, length:', buffer.length);
          
          // Store with immutable data and permanent URL
          console.log('🔍 About to import immutableContractStorage...');
          const { immutableContractStorage } = await import('@/utils/immutableContractStorage');
          console.log('🔍 immutableContractStorage imported successfully');
          
          console.log('🔍 About to call storeImmutableContract...');
          const immutableResult = await immutableContractStorage.storeImmutableContract(
            contractId,
            fileName,
            buffer,
            provider,
            assignedTemplate
          );
          console.log('🔍 storeImmutableContract completed successfully');
          
          permanentUrl = immutableResult.permanentUrl;
          s3UploadSuccess = true;
          console.log('✅ Contract stored in S3 successfully');
        } catch (s3err) {
          console.error('❌ Failed to store contract in S3:', s3err);
          console.error('S3 error details:', {
            name: s3err.name,
            message: s3err.message,
            stack: s3err.stack
          });
          s3UploadSuccess = false;
        }

        // Log the generation event to DynamoDB
        const logInput = {
          providerId: provider.id,
          contractYear: contractYear,
          templateId: assignedTemplate.id,
          generatedAt: new Date().toISOString(),
          generatedBy: 'user',
          outputType: 'DOCX',
          status: s3UploadSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS', // Store PARTIAL_SUCCESS in DynamoDB
          fileUrl: permanentUrl || fileName,
          localFilePath: localFilePath,
          notes: `Generated contract for ${provider.name} using template ${assignedTemplate.name}. Local file: ${localFilePath}. S3 storage: ${s3UploadSuccess ? 'SUCCESS' : 'FAILED'}`
        };

        console.log('🔍 DynamoDB log input:', {
          providerId: logInput.providerId,
          templateId: logInput.templateId,
          contractYear: logInput.contractYear,
          status: logInput.status,
          s3UploadSuccess,
          permanentUrl: !!permanentUrl
        });

        // Add to Redux state for Processed tab
        console.log('🚀 Adding contract to Redux state for provider:', provider.name, 'template:', assignedTemplate.name);
        
        try {
          console.log('🔄 Attempting to log contract to DynamoDB:', {
            providerId: provider.id,
            templateId: assignedTemplate.id,
            contractYear: contractYear,
            status: s3UploadSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS'
          });
          
          const logEntry = await ContractGenerationLogService.createLog(logInput);
          dispatch(addGenerationLog(logEntry));
          dynamoDbSuccess = true;
          logEntryId = logEntry?.id;
          console.log('✅ Contract logged to DynamoDB successfully:', logEntry);
          console.log('🔍 DynamoDB response details:', {
            id: logEntry?.id,
            status: logEntry?.status,
            providerId: logEntry?.providerId,
            templateId: logEntry?.templateId,
            contractYear: logEntry?.contractYear
          });
        } catch (logError) {
          console.error('❌ Failed to log contract to DynamoDB:', logError);
          console.error('Log input that failed:', logInput);
          dynamoDbSuccess = false;
        }
        
        dispatch(addGeneratedContract({
          providerId: provider.id,
          templateId: assignedTemplate.id,
          status: s3UploadSuccess && dynamoDbSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS',
          generatedAt: new Date().toISOString(),
          fileUrl: permanentUrl,
          fileName: fileName,
          s3Key: contractId,
          localFilePath: localFilePath,
          s3Status: s3UploadSuccess ? 'SUCCESS' : 'FAILED',
          dynamoDbStatus: dynamoDbSuccess ? 'SUCCESS' : 'FAILED',
          error: !s3UploadSuccess ? 'S3 storage failed' : !dynamoDbSuccess ? 'DynamoDB logging failed' : undefined,
          dynamoDbId: logEntryId,
        }));
        console.log('✅ Contract added to Redux state successfully');
        
        successful.push({
          providerName: provider.name,
          templateName: assignedTemplate.name,
          localFilePath: localFilePath,
          s3Status: s3UploadSuccess ? 'SUCCESS' : 'FAILED',
          dynamoDbStatus: dynamoDbSuccess ? 'SUCCESS' : 'FAILED'
        });
        updateProgress({ successCount: progressData.successCount + 1 });
      } catch (err) {
        skipped.push({
          providerName: provider.name,
          reason: `Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
        updateProgress({ errorCount: progressData.errorCount + 1 });
      }
    }
    
    // Update progress to completion
    updateProgress({ 
      progress: 100,
      currentStep: selectedProviders.length + 1,
      steps: progressData.steps.map(step => 
        step.id === 'generation' ? { ...step, status: 'completed' } :
        step.id === 'saving' ? { ...step, status: 'completed' } :
        step.id === 'uploading' ? { ...step, status: 'completed' } : step
      ),
      currentOperation: 'Bulk generation completed successfully!'
    });
    
    setIsBulkGenerating(false);
    setProgressModalOpen(false);
    // Clear selected providers to hide the bottom menu
    setSelectedProviderIds([]);
    // Refresh contracts from database to ensure Processed tab shows correctly
    await hydrateGeneratedContracts();
    console.log('Bulk generation completed. Contracts added to Redux state:', successful.length);
    
    // Log bulk generation operation
    try {
      const auditDetails = JSON.stringify({
        action: 'BULK_CONTRACT_GENERATION',
        providerCount: selectedProviders.length,
        successfulCount: successful.length,
        skippedCount: skipped.length,
        successful: successful,
        skipped: skipped,
        timestamp: new Date().toISOString(),
        metadata: {
          providerCount: selectedProviders.length,
          successfulCount: successful.length,
          skippedCount: skipped.length,
          successful: successful,
          skipped: skipped,
          operation: 'bulk_generation',
          success: true
        }
      });
      
      await dispatch(logSecurityEvent({
        action: 'BULK_CONTRACT_GENERATION',
        details: auditDetails,
        severity: 'MEDIUM',
        category: 'DATA',
        resourceType: 'CONTRACT_GENERATION',
        resourceId: 'bulk',
        metadata: {
          providerCount: selectedProviders.length,
          successfulCount: successful.length,
          skippedCount: skipped.length,
          successful: successful,
          skipped: skipped,
          operation: 'bulk_generation',
          success: true
        },
      }));
    } catch (auditError) {
      console.error('Failed to log bulk generation:', auditError);
    }
    
    // Show simple success message instead of modal
    console.log('Contract generation completed:', { successful, skipped });
    console.log('Generated contracts in Redux state:', generatedContracts);
    showSuccess(`Success! ${successful.length} contracts generated successfully.`);
  };

  // Modal-specific bulk generation function
  const handleModalBulkGenerate = async () => {
    console.log('🚀 handleModalBulkGenerate called');
    console.log('Selected provider IDs:', selectedProviderIds);
    console.log('Selected providers:', selectedProviderIds.map(id => providers.find(p => p.id === id)?.name));
    
    setUserError(null);
    setIsBulkGenerating(true);
    
    // Use the providers that were selected for the modal (not filtered providers from main page)
    const modalSelectedProviders = providers.filter(p => selectedProviderIds.includes(p.id));
    if (modalSelectedProviders.length === 0) {
      setUserError('No providers selected for generation.');
      setIsBulkGenerating(false);
      return;
    }

    // Check if all providers have templates assigned
    const providersWithoutTemplates = modalSelectedProviders.filter(provider => !getAssignedTemplate(provider));
    if (providersWithoutTemplates.length > 0) {
      const providerNames = providersWithoutTemplates.map(p => p.name).join(', ');
      setUserError(`Some providers don't have templates assigned: ${providerNames}. Please assign templates first.`);
      setIsBulkGenerating(false);
      return;
    }

    // Initialize progress tracking
    initializeProgress(modalSelectedProviders.length);
    updateProgress({ currentOperation: 'Opening folder selection dialog...' });

    // Use File System Access API to select folder for saving contracts
    console.log('Opening folder selection dialog for contract saving');
    
    let selectedFolderHandle: any = null;
    let selectedFolderPath: string | null = null;
    
    // Try multiple approaches to get folder selection
    try {
      console.log('🔍 Starting folder selection process...');
      console.log('🔍 File System Access API available:', 'showDirectoryPicker' in window);
      
      // Approach 1: Try the modern File System Access API with proper error handling
      if ('showDirectoryPicker' in window) {
        console.log('🔍 Attempting to use File System Access API...');
        try {
          const dirHandle = await (window as any).showDirectoryPicker({ 
            mode: 'readwrite',
            startIn: 'downloads'
          });
          console.log('✅ Folder selected via File System Access API:', dirHandle.name);
          selectedFolderHandle = dirHandle;
          selectedFolderPath = dirHandle.name;
          
          // Test if we can actually write to this folder
          try {
            console.log('🔍 Testing write permissions...');
            const testFile = await dirHandle.getFileHandle('test-write-permission.txt', { create: true });
            const writable = await testFile.createWritable();
            await writable.write('test');
            await writable.close();
            await dirHandle.removeEntry('test-write-permission.txt');
            console.log('✅ Write permission confirmed');
          } catch (writeError) {
            console.error('❌ No write permission to selected folder:', writeError);
            setUserError('Selected folder does not have write permissions. Please select a different folder.');
            setIsBulkGenerating(false);
            setProgressModalOpen(false);
            return;
          }
        } catch (error) {
          console.error('❌ File System Access API error:', error);
          if (error instanceof Error && error.name === 'AbortError') {
            console.log('User cancelled folder selection');
            setIsBulkGenerating(false);
            setProgressModalOpen(false);
            return;
          } else {
            console.error('File System Access API failed:', error);
            // Fall through to alternative approach
          }
        }
      } else {
        console.log('❌ File System Access API not available in this browser');
      }
      
      // Approach 2: If File System Access API failed or not available, show error
      if (!selectedFolderPath) {
        console.log('❌ No folder selected, showing error to user');
        setUserError('Folder selection is not supported in this browser. Please use Chrome, Edge, or Firefox with the latest version.');
        setIsBulkGenerating(false);
        setProgressModalOpen(false);
        return;
      }
      
    } catch (error) {
      console.error('❌ All folder selection methods failed:', error);
      setUserError('Unable to open folder selection dialog. Please ensure you are using a supported browser (Chrome, Edge, or Firefox).');
      setIsBulkGenerating(false);
      setProgressModalOpen(false);
      return;
    }
    
    if (!selectedFolderPath) {
      setUserError('No folder was selected. Please try again.');
      setIsBulkGenerating(false);
      setProgressModalOpen(false);
      return;
    }

    console.log('🎯 Selected folder for contract generation:', selectedFolderPath);

    // Update progress to generation phase
    updateProgress({ 
      currentStep: 2, 
      progress: 15,
      steps: progressData.steps.map(step => 
        step.id === 'folder' ? { ...step, status: 'completed' } :
        step.id === 'generation' ? { ...step, status: 'active' } : step
      ),
      currentOperation: 'Starting contract generation...'
    });

    const successful: any[] = [];
    const skipped: any[] = [];
    
    for (let i = 0; i < modalSelectedProviders.length; i++) {
      // Check for cancellation
      if (progressData.isCancelled) {
        updateProgress({ currentOperation: 'Operation cancelled by user' });
        setIsBulkGenerating(false);
        return;
      }

      const provider = modalSelectedProviders[i];
      const currentIndex = i + 1;
      const progressPercent = 15 + (currentIndex / modalSelectedProviders.length) * 60; // 15% to 75%
      
      // Update progress
      updateProgress({ 
        currentStep: currentIndex,
        progress: progressPercent,
        currentOperation: `Generating contract for ${provider.name} (${currentIndex}/${modalSelectedProviders.length})`
      });
      
             try {
          const assignedTemplate = getAssignedTemplate(provider);
        if (!assignedTemplate) {
          skipped.push({
            providerName: provider.name,
            reason: 'No template assigned'
          });
          updateProgress({ skippedCount: progressData.skippedCount + 1 });
          continue;
        }
        
        // Generate contract content
        const html = assignedTemplate.editedHtmlContent || assignedTemplate.htmlPreviewContent || "";
        const mapping = mappings[assignedTemplate.id]?.mappings;
        
        // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
        const enhancedMapping = mapping?.map(m => {
          if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
            return {
              ...m,
              mappingType: 'dynamic' as const,
              mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
              mappedColumn: undefined,
            };
          }
          return {
            ...m,
            mappingType: 'field' as const,
          };
        });
        
        const { content: mergedHtml } = await mergeTemplateWithData(assignedTemplate, provider, html, enhancedMapping);
        const htmlClean = normalizeSmartQuotes(mergedHtml);
        const aptosStyle = `<style>
body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
  font-family: Aptos, Arial, sans-serif !important;
  font-size: 11pt !important;
}
h1 { font-size: 16pt !important; font-weight: bold !important; }
h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; }
b, strong { font-weight: bold !important; }
</style>`;
        const htmlWithFont = aptosStyle + htmlClean;

        // @ts-ignore
        if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
          skipped.push({
            providerName: provider.name,
            reason: 'DOCX generator not available'
          });
          updateProgress({ skippedCount: progressData.skippedCount + 1 });
          continue;
        }
        
        // @ts-ignore
        const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
        const contractYear = assignedTemplate.contractYear || new Date().getFullYear().toString();
        const runDate = new Date().toISOString().split('T')[0];
        const fileName = getContractFileName(contractYear, provider.name, runDate);
        
        // Save file to the selected folder using the already selected folder handle
        let fileSaved = false;
        let localFilePath = '';
        
        try {
          // Use the already selected folder handle instead of calling showDirectoryPicker again
          if (selectedFolderHandle && selectedFolderPath) {
            const fileHandle = await selectedFolderHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(docxBlob);
            await writable.close();
            fileSaved = true;
            localFilePath = `${selectedFolderPath}/${fileName}`;
            console.log('✅ File saved to selected folder:', localFilePath);
          } else {
            // Fallback: Download to default location
            const url = URL.createObjectURL(docxBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            fileSaved = true;
            localFilePath = `Downloads/${fileName}`;
            console.log('✅ File downloaded to Downloads folder:', localFilePath);
          }
        } catch (error) {
          console.error('Failed to save file:', error);
          // Fallback to download
          const url = URL.createObjectURL(docxBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          fileSaved = true;
          localFilePath = `Downloads/${fileName}`;
          console.log('✅ File downloaded to Downloads folder (fallback):', localFilePath);
        }
        
        // Store contract with immutable data and permanent URL
        let permanentUrl = '';
        let contractId = '';
        let s3UploadSuccess = false;
        let dynamoDbSuccess = false;
        
        if (fileSaved) {
          
          console.log('🔍 Modal: Starting S3 upload process...');
          try {
            contractId = provider.id + '-' + assignedTemplate.id + '-' + contractYear;
            
            console.log('🔍 Modal contract generation debug:', {
              contractId,
              fileName,
              blobSize: docxBlob.size,
              providerId: provider.id,
              templateId: assignedTemplate.id,
              contractYear
            });
            
            // Convert Blob to Buffer for immutable storage
            const arrayBuffer = await docxBlob.arrayBuffer();
            console.log('🔍 Modal ArrayBuffer created, size:', arrayBuffer.byteLength);
            
            // Use Uint8Array instead of Buffer for browser compatibility
            const buffer = new Uint8Array(arrayBuffer);
            console.log('🔍 Modal Uint8Array created, length:', buffer.length);
            
            // Store with immutable data and permanent URL
            console.log('🔍 Modal: About to import immutableContractStorage...');
            const { immutableContractStorage } = await import('@/utils/immutableContractStorage');
            console.log('🔍 Modal: immutableContractStorage imported successfully');
            
            console.log('🔍 Modal: About to call storeImmutableContract...');
            const immutableResult = await immutableContractStorage.storeImmutableContract(
              contractId,
              fileName,
              buffer,
              provider,
              assignedTemplate
            );
            console.log('🔍 Modal: storeImmutableContract completed successfully');
            
            permanentUrl = immutableResult.permanentUrl;
            s3UploadSuccess = true;
            console.log('✅ Contract stored in S3 successfully');
          } catch (s3err) {
            console.error('❌ Failed to store contract in S3:', s3err);
            console.error('Modal S3 error details:', {
              name: s3err.name,
              message: s3err.message,
              stack: s3err.stack
            });
            s3UploadSuccess = false;
          }

          // Log the generation event to DynamoDB
          const logInput = {
            providerId: provider.id,
            contractYear: contractYear,
            templateId: assignedTemplate.id,
            generatedAt: new Date().toISOString(),
            generatedBy: 'user',
            outputType: 'DOCX',
            status: s3UploadSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS', // Store PARTIAL_SUCCESS in DynamoDB
            fileUrl: permanentUrl || fileName,
            localFilePath: localFilePath,
            notes: `Generated contract for ${provider.name} using template ${assignedTemplate.name}. Local file: ${localFilePath}. S3 storage: ${s3UploadSuccess ? 'SUCCESS' : 'FAILED'}`
          };

          console.log('🔍 Modal DynamoDB log input:', {
            providerId: logInput.providerId,
            templateId: logInput.templateId,
            contractYear: logInput.contractYear,
            status: logInput.status,
            s3UploadSuccess,
            permanentUrl: !!permanentUrl
          });

          // Add to Redux state for Processed tab
          console.log('🚀 Adding contract to Redux state for provider:', provider.name, 'template:', assignedTemplate.name);
          
          let logEntryId: string | undefined;
          try {
            console.log('🔄 Attempting to log contract to DynamoDB:', {
              providerId: provider.id,
              templateId: assignedTemplate.id,
              contractYear: contractYear,
              status: s3UploadSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS'
            });
            
            const logEntry = await ContractGenerationLogService.createLog(logInput);
            dispatch(addGenerationLog(logEntry));
            dynamoDbSuccess = true;
            logEntryId = logEntry?.id;
            console.log('✅ Contract logged to DynamoDB successfully:', logEntry);
            console.log('🔍 Modal DynamoDB response details:', {
              id: logEntry?.id,
              status: logEntry?.status,
              providerId: logEntry?.providerId,
              templateId: logEntry?.templateId,
              contractYear: logEntry?.contractYear
            });
          } catch (logError) {
            console.error('❌ Failed to log contract to DynamoDB:', logError);
            console.error('Log input that failed:', logInput);
            dynamoDbSuccess = false;
          }
          
          dispatch(addGeneratedContract({
            providerId: provider.id,
            templateId: assignedTemplate.id,
            status: s3UploadSuccess && dynamoDbSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS',
            generatedAt: new Date().toISOString(),
            fileUrl: permanentUrl,
            fileName: fileName,
            s3Key: contractId,
            localFilePath: localFilePath,
            s3Status: s3UploadSuccess ? 'SUCCESS' : 'FAILED',
            dynamoDbStatus: dynamoDbSuccess ? 'SUCCESS' : 'FAILED',
            error: !s3UploadSuccess ? 'S3 storage failed' : !dynamoDbSuccess ? 'DynamoDB logging failed' : undefined,
            dynamoDbId: logEntryId,
          }));
          console.log('✅ Contract added to Redux state successfully');
        }
        
        successful.push({
          providerName: provider.name,
          templateName: assignedTemplate.name,
          localFilePath: localFilePath,
          s3Status: s3UploadSuccess ? 'SUCCESS' : 'FAILED',
          dynamoDbStatus: dynamoDbSuccess ? 'SUCCESS' : 'FAILED'
        });
        updateProgress({ successCount: progressData.successCount + 1 });
      } catch (err) {
        skipped.push({
          providerName: provider.name,
          reason: `Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
        });
        updateProgress({ errorCount: progressData.errorCount + 1 });
      }
    }
    
    // All contracts have been saved to the selected folder
    console.log('✅ All contracts saved to selected folder:', selectedFolderPath);
    
    // Update progress to completion
    updateProgress({ 
      progress: 100,
      currentStep: modalSelectedProviders.length + 1,
      steps: progressData.steps.map(step => 
        step.id === 'generation' ? { ...step, status: 'completed' } :
        step.id === 'saving' ? { ...step, status: 'completed' } :
        step.id === 'uploading' ? { ...step, status: 'completed' } : step
      ),
      currentOperation: 'Bulk generation completed successfully!'
    });
    
    setIsBulkGenerating(false);
    setProgressModalOpen(false);
    // Clear selected providers to hide the bottom menu
    setSelectedProviderIds([]);
    // Refresh contracts from database to ensure Processed tab shows correctly
    await hydrateGeneratedContracts();
    console.log('Modal bulk generation completed. Contracts added to Redux state:', successful.length);
    
    // Show simple success message instead of modal
    console.log('Modal bulk generation completed:', { successful, skipped });
    console.log('Generated contracts in Redux state:', generatedContracts);
    showSuccess(`Success! ${successful.length} contracts generated successfully.`);
  };

  const handlePreview = () => {
    if (selectedProviderIds.length === 0) {
      setUserError("Please select at least one provider to preview.");
      return;
    }
    
    // Check if all selected providers have templates assigned
    const providersWithoutTemplates = selectedProviderIds
      .map(id => providers.find(p => p.id === id))
      .filter(provider => provider && !getAssignedTemplate(provider));
    
    if (providersWithoutTemplates.length > 0) {
      const providerNames = providersWithoutTemplates.map(p => p?.name).filter(Boolean).join(', ');
      setUserError(`Some selected providers don't have templates assigned: ${providerNames}. Please assign templates first.`);
      return;
    }
    
    setPreviewModalOpen(true);
  };

  const handlePreviewGenerate = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      generateAndDownloadDocx(provider);
    }
  };

  // Handle row click to toggle selection (primary interaction method)
  const handleRowClick = (event: any) => {
    const provider = event.data;
    if (provider) {
      // Toggle selection of this provider
      setSelectedProviderIds(prev => 
        prev.includes(provider.id) 
          ? prev.filter(id => id !== provider.id)
          : [...prev, provider.id]
      );
    }
  };

  // Quick action handlers for bottom menu
  const handleGenerateOne = async () => {
    if (clickedProvider) {
      const assignedTemplate = getAssignedTemplate(clickedProvider);
      if (assignedTemplate) {
        await generateAndDownloadDocx(clickedProvider, assignedTemplate);
              showSuccess(`Generated contract for ${clickedProvider.name}`);
    } else {
      showError({ message: `No template assigned to ${clickedProvider.name}`, severity: 'error' });
      }
    }
    setBottomActionMenuOpen(false);
  };

  const handleGenerateAll = async () => {
    if (clickedProvider) {
      // Select this provider and all others, then generate all
      const allProviderIds = filteredProviders.map(p => p.id);
      setSelectedProviderIds(allProviderIds);
      await handleBulkGenerate();
    }
    setBottomActionMenuOpen(false);
  };

  const handleClearAssignments = () => {
    if (clickedProvider) {
      updateProviderTemplate(clickedProvider.id, null);
      showSuccess(`Cleared template assignment for ${clickedProvider.name}`);
    }
    setBottomActionMenuOpen(false);
  };

  const handleAssignTemplate = (templateId: string) => {
    if (clickedProvider) {
      updateProviderTemplate(clickedProvider.id, templateId);
    }
    setBottomActionMenuOpen(false);
  };



  const handleGenerateDOCX = async () => {
    setUserError(null);
    if (!selectedTemplate) {
      setUserError("No template selected. Please select a template before generating.");
      return;
    }
    if (selectedProviderIds.length !== 1) {
      setUserError("Please select exactly one provider before generating.");
      return;
    }
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) {
      setUserError("Selected provider not found. Please check your provider selection.");
      return;
    }
    const html = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || "";
    if (!html) {
      setUserError("Template content is missing or not loaded. Please check your template.");
      return;
    }
    const mapping = mappings[selectedTemplate.id]?.mappings;
    
    // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
    const enhancedMapping = mapping?.map(m => {
      // Check if this mapping has a dynamic block (stored in value field with dynamic: prefix)
      if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
        return {
          ...m,
          mappingType: 'dynamic' as const,
          mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
          mappedColumn: undefined, // Clear the mappedColumn since it's a dynamic block
        };
      }
      return {
        ...m,
        mappingType: 'field' as const,
      };
    });
    
    const { content: mergedHtml } = await mergeTemplateWithData(selectedTemplate, provider, html, enhancedMapping);
    if (!mergedHtml || typeof mergedHtml !== 'string' || mergedHtml.trim().length === 0) {
      setUserError("No contract content available to export after merging. Please check your template and provider data.");
      return;
    }
    try {
      // Normalize mergedHtml
      const htmlClean = normalizeSmartQuotes(mergedHtml);
      // Prepend Aptos font style
      const aptosStyle = `<style>
body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
  font-family: Aptos, Arial, sans-serif !important;
  font-size: 11pt !important;
}
h1 { font-size: 16pt !important; font-weight: bold !important; }
h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; }
b, strong { font-weight: bold !important; }
</style>`;
      const htmlWithFont = aptosStyle + htmlClean;
      // @ts-ignore
      if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
        setUserError('Failed to generate document. DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.');
        return;
      }
      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
      const fileName = `ScheduleA_${String(provider.name).replace(/\s+/g, '')}.docx`;
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the generation event
      const contractYear = selectedTemplate.contractYear || new Date().getFullYear().toString();
      const logInput = {
        providerId: provider.id,
        contractYear: contractYear,
        templateId: selectedTemplate.id,
        generatedAt: new Date().toISOString(),
        generatedBy: 'user', // TODO: Get actual user ID
        outputType: 'DOCX',
        status: 'SUCCESS',
        fileUrl: fileName,
        notes: `Generated contract for ${provider.name} using template ${selectedTemplate.name}`
      };

      try {
        const logEntry = await ContractGenerationLogService.createLog(logInput);
        dispatch(addGenerationLog(logEntry));
        dispatch(addGeneratedContract({
          providerId: provider.id,
          templateId: selectedTemplate.id,
          status: 'SUCCESS',
          generatedAt: new Date().toISOString(),
          dynamoDbId: logEntry?.id, // Store the DynamoDB ID from the log entry
        }));
      } catch (logError) {
        console.error('Failed to log contract generation:', logError);
        // Don't fail the generation if logging fails
      }
    } catch (error) {
      setUserError("Failed to generate DOCX. Please ensure the template is properly initialized and html-docx-js is loaded.");
      console.error("DOCX Generation Error:", error);
      dispatch(addGeneratedContract({
        providerId: provider.id,
        templateId: selectedTemplate.id,
        status: 'FAILED',
        generatedAt: new Date().toISOString(),
        // Note: No dynamoDbId for failed contracts since they weren't logged to DynamoDB
      }));
    }
  };

  // Filtering logic (by name or specialty)
  const filteredProviders = providers.filter((provider) => {
    const name = provider.name?.toLowerCase() || '';
    const specialty = (provider as any).specialty?.toLowerCase() || '';
    const searchTerm = search.toLowerCase();
    const matchesSearch = name.includes(searchTerm) || specialty.includes(searchTerm);
    const matchesSpecialty = selectedSpecialty === "__ALL__" || provider.specialty === selectedSpecialty;
    const matchesSubspecialty = selectedSubspecialty === "__ALL__" || provider.subspecialty === selectedSubspecialty;
    const matchesProviderType = selectedProviderType === "__ALL__" || provider.providerType === selectedProviderType;
    return matchesSearch && matchesSpecialty && matchesSubspecialty && matchesProviderType;
  });

  // Pagination logic - apply to ALL filtered providers, not just tab-filtered ones
  const paginatedProviders = filteredProviders.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const totalPages = Math.ceil(filteredProviders.length / pageSize);

  const getContractStatus = (providerId: string, templateId: string) => {
    return generatedContracts.find(
      c => c.providerId === providerId && c.templateId === templateId
    )?.status;
  };

  // Helper to get the most recent generated contract for a provider
  const getLatestGeneratedContract = (providerId: string) => {
    const contracts = generatedContracts.filter(c => c.providerId === providerId);
    if (contracts.length === 0) return null;
    return contracts.reduce((latest, curr) =>
      new Date(curr.generatedAt) > new Date(latest.generatedAt) ? curr : latest
    );
  };

  // Compute generation status for each provider
  const getGenerationStatus = (providerId: string, templateId: string) => {
    // First try to find exact match
    let contract = generatedContracts.find(
      c => c.providerId === providerId && c.templateId === templateId
    );
    
    // If no exact match, check if any contract exists for this provider (for backward compatibility)
    if (!contract) {
      contract = generatedContracts.find(c => c.providerId === providerId);
    }
    
    if (!contract) return 'Not Generated';
    if (contract.status === 'SUCCESS') return 'Success';
    if (contract.status === 'FAILED') return 'Failed';
    return 'Needs Review';
  };

  // Helper to get generation date for display
  const getGenerationDate = (providerId: string, templateId: string) => {
    const contract = generatedContracts.find(
      c => c.providerId === providerId && c.templateId === templateId
    );
    return contract?.generatedAt ? new Date(contract.generatedAt) : null;
  };

  // Helper to scan template for placeholders
  const scanPlaceholders = (templateContent: string): string[] => {
    const matches = templateContent.match(/{{(.*?)}}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, ''))));
  };

  // Function to clear generated contracts for selected providers
  const handleClearGenerated = async () => {
    if (selectedProviderIds.length === 0) {
      showWarning('Please select providers to clear generated contracts.');
      return;
    }

    try {
      // Clear generated contracts from state for selected providers
      // We need to clear the generatedContracts array, not generatedFiles
      dispatch(clearGeneratedContracts());

      // Clear the selection
      setSelectedProviderIds([]);
      
      // Show success message
      showSuccess('Generated contracts cleared successfully.');
      
    } catch (error) {
      console.error('Error clearing generated contracts:', error);
      showError({ message: 'Failed to clear generated contracts. Please try again.', severity: 'error' });
    }
  };

  // Function to clear all processed contracts from database
  const handleClearAllProcessed = async () => {
    try {
      setIsClearing(true);
      setClearingProgress(0);
      showInfo(`Fetching all processed contracts from database...`);
      
      // Fetch ALL processed contracts from the database, not just the ones in state
      let allLogs: ContractGenerationLog[] = [];
      let nextToken = undefined;
      let fetchCount = 0;
      
      do {
        const result = await ContractGenerationLogService.listLogs(undefined, 1000, nextToken);
        if (result && result.items) {
          allLogs = allLogs.concat(result.items);
          fetchCount += result.items.length;
          setClearingProgress(Math.round((fetchCount / Math.max(fetchCount + 100, 1000)) * 30)); // First 30% for fetching
        }
        nextToken = result?.nextToken;
      } while (nextToken);
      
      // Filter for ALL processed contracts (SUCCESS, PARTIAL_SUCCESS, FAILED)
      const processedLogs = allLogs.filter(log => 
        log.status === 'SUCCESS' || 
        log.status === 'PARTIAL_SUCCESS' || 
        log.status === 'FAILED'
      );
      
      console.log('All contracts in database:', allLogs.length);
      console.log('Processed contracts to clear:', processedLogs.length);
      
      if (processedLogs.length === 0) {
        showWarning('No processed contracts found to clear.');
        setIsClearing(false);
        return;
      }

      // Show confirmation dialog instead of browser confirm
      setShowClearConfirm(true);
      setContractsToClear(processedLogs);
      setIsClearing(false);
      return;
    } catch (error) {
      console.error('Error fetching contracts for clearing:', error);
      showError({ message: `Failed to fetch contracts: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
      setIsClearing(false);
    }
  };

  // Function to actually clear the contracts (called after confirmation)
  const confirmClearContracts = async () => {
    try {
      setIsClearing(true);
      setClearingProgress(30); // Start clearing phase
      showInfo(`Clearing ${contractsToClear.length} processed contracts...`);
      
      // Get the actual DynamoDB IDs from the database logs
      const contractIds = contractsToClear.map(log => log.id);
      
      console.log('Found DynamoDB IDs to clear:', contractIds);
      
      // Delete contracts from DynamoDB with progress tracking
      let deletedCount = 0;
      const totalContracts = contractIds.length;
      
      for (let i = 0; i < contractIds.length; i++) {
        try {
          await ContractGenerationLogService.deleteLog(contractIds[i]);
          deletedCount++;
          
          // Update progress (30% to 90% for deletion phase)
          const deletionProgress = 30 + Math.round((deletedCount / totalContracts) * 60);
          setClearingProgress(deletionProgress);
          
          // Small delay to show progress
          if (i < contractIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (deleteError) {
          console.error(`Failed to delete contract ${contractIds[i]}:`, deleteError);
          // Continue with other deletions even if one fails
        }
      }
      
      setClearingProgress(90); // Almost done
      
      // Clear from local state
      dispatch(clearGeneratedContracts());
      setSelectedProviderIds([]);
      
      setClearingProgress(100); // Complete
      
      showSuccess(`Successfully cleared ${deletedCount} processed contracts (Success, Partial Success, and Failed)! All contracts are now marked as "Not Generated".`);
      
      // Close confirmation dialog
      setShowClearConfirm(false);
      setContractsToClear([]);
      
      // Refresh the contracts data to show updated status
      setTimeout(() => {
        hydrateGeneratedContracts();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing all processed contracts:', error);
      showError({ message: `Failed to clear processed contracts: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
    } finally {
      setIsClearing(false);
      setClearingProgress(100);
    }
  };



  // Base columns that appear in all tabs
  const baseColumns = useMemo(() => {
    const leftPinned = columnPreferences?.columnPinning?.left || [];
    const rightPinned = columnPreferences?.columnPinning?.right || [];
    
    // Selection indicator column (visual only, no interaction)
    const selectColumn = {
      headerName: '',
      field: 'selected',
      width: 40,
      minWidth: 40,
      maxWidth: 40,
      pinned: 'left',
      suppressMenu: true,
      sortable: false,
      filter: false,
      resizable: false,
      suppressSizeToFit: true,
      suppressRowClickSelection: true,
      cellRenderer: (params: any) => {
        const isSelected = selectedProviderIds.includes(params.data.id);
        return (
          <div className="flex items-center justify-center h-full">
            {isSelected ? (
              <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            ) : (
              <div className="w-3 h-3 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>
        );
      },
      headerComponent: () => {
        const visibleRowIds = visibleRows.map(row => row.id);
        const allVisibleSelected = visibleRowIds.length > 0 && 
          visibleRowIds.every(id => selectedProviderIds.includes(id));
        const someVisibleSelected = visibleRowIds.some(id => selectedProviderIds.includes(id));
        
        return (
          <div 
            className="flex items-center justify-center h-full cursor-pointer hover:bg-gray-100 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (allVisibleSelected) {
                // Deselect all visible
                setSelectedProviderIds(prev => prev.filter(id => !visibleRowIds.includes(id)));
              } else {
                // Select all visible
                setSelectedProviderIds(prev => {
                   const newSelection = [...prev];
                   visibleRowIds.forEach(id => {
                     if (!newSelection.includes(id)) {
                       newSelection.push(id);
                     }
                   });
                   return newSelection;
                 });
              }
            }}
          >
            {allVisibleSelected ? (
              <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            ) : someVisibleSelected ? (
              <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50"></div>
              </div>
            ) : (
              <div className="w-3 h-3 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>
        );
      },
    };

    // Define all possible columns
    const allColumnDefs = {
      name: {
        headerName: 'Provider Name',
        field: 'name',
        width: 220,
        minWidth: 180,
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
      employeeId: {
        headerName: 'Employee ID',
        field: 'employeeId',
        width: 130,
        minWidth: 100,
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
      specialty: {
        headerName: 'Specialty',
        field: 'specialty',
        width: 180,
        minWidth: 140,
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
      subspecialty: {
        headerName: 'Subspecialty',
        field: 'subspecialty',
        width: 180,
        minWidth: 140,
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
      providerType: {
        headerName: 'Provider Type',
        field: 'providerType',
        width: 140,
        minWidth: 120,
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
      administrativeRole: {
        headerName: 'Administrative Role',
        field: 'administrativeRole',
        width: 180,
        minWidth: 150,
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
      baseSalary: {
        headerName: 'Base Salary',
        field: 'baseSalary',
        width: 140,
        minWidth: 120,
        valueFormatter: (params: any) => formatCurrency(params.value),
        filter: 'agNumberColumnFilter',
        tooltipValueGetter: (params: any) => formatCurrency(params.value),
        cellStyle: { 
          textAlign: 'right',
          fontFamily: 'monospace'
        },
      },
      fte: {
        headerName: 'FTE',
        field: 'fte',
        width: 100,
        minWidth: 80,
        valueGetter: (params: any) => {
          const provider = params.data;
          // Check for totalFTE first (new field), then fallback to fte (old field)
          if (provider.totalFTE !== undefined && provider.totalFTE !== null) {
            return Number(provider.totalFTE);
          }
          if (provider.TotalFTE !== undefined && provider.TotalFTE !== null) {
            return Number(provider.TotalFTE);
          }
          if (provider.fte !== undefined && provider.fte !== null) {
            return Number(provider.fte);
          }
          // Check dynamicFields as fallback
          if (provider.dynamicFields) {
            try {
              const dynamicFields = typeof provider.dynamicFields === 'string' 
                ? JSON.parse(provider.dynamicFields) 
                : provider.dynamicFields;
              if (dynamicFields.totalFTE !== undefined && dynamicFields.totalFTE !== null) {
                return Number(dynamicFields.totalFTE);
              }
              if (dynamicFields.TotalFTE !== undefined && dynamicFields.TotalFTE !== null) {
                return Number(dynamicFields.TotalFTE);
              }
              if (dynamicFields.fte !== undefined && dynamicFields.fte !== null) {
                return Number(dynamicFields.fte);
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
          return 0;
        },
        valueFormatter: (params: any) => formatNumber(params.value),
        filter: 'agNumberColumnFilter',
        tooltipValueGetter: (params: any) => formatNumber(params.value),
        cellStyle: { 
          textAlign: 'right',
          fontFamily: 'monospace'
        },
      },
      startDate: {
        headerName: 'Start Date',
        field: 'startDate',
        width: 140,
        minWidth: 120,
        valueFormatter: (params: any) => formatDate(params.value),
        filter: 'agDateColumnFilter',
        tooltipValueGetter: (params: any) => formatDate(params.value),
        cellStyle: { 
          textAlign: 'center',
          fontFamily: 'monospace'
        },
      },
      compensationModel: {
        field: 'compensationModel',
        headerName: 'Compensation Model',
        width: 200,
        minWidth: 150,
        maxWidth: 250,
        valueGetter: (params: any) => {
          const provider = params.data;
          const model = provider.compensationModel || provider.compensationType || provider.CompensationModel || '';
          return model || 'Not specified';
        },
        cellRenderer: (params: any) => {
          const value = params.value;
          if (!value || value === 'Not specified') {
            return (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-400 italic">Not specified</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium truncate" title={value}>
                {value}
              </span>
            </div>
          );
        },
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          padding: '8px 12px'
        },
      },
      assignedTemplate: {
        headerName: 'Template',
        field: 'assignedTemplate',
        width: 180,
        minWidth: 150,
        maxWidth: 220,
        valueGetter: (params: any) => {
          const provider = params.data;
          const assignedTemplate = getAssignedTemplate(provider);
          return assignedTemplate ? assignedTemplate.name : 'No template';
        },
        cellRenderer: (params: any) => {
          const provider = params.data;
          
          // For Processed tab: Show the template that was actually used
          if (statusTab === 'processed') {
            const contract = generatedContracts.find(
              c => c.providerId === provider.id && c.status === 'SUCCESS'
            );
            
            if (contract) {
              const usedTemplate = templates.find(t => t.id === contract.templateId);
              return (
                <div className="w-full h-full flex items-center px-2" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div className="flex items-center gap-2 w-full">
                    <FileText className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm font-medium text-gray-900 truncate" title={usedTemplate?.name || 'Unknown template'}>
                      {usedTemplate?.name || 'Unknown template'}
                    </span>
                  </div>
                </div>
              );
            } else {
              return (
                <div className="w-full h-full flex items-center px-2" style={{ position: 'relative', overflow: 'hidden' }}>
                  <span className="text-sm text-gray-400 italic">No contract found</span>
                </div>
              );
            }
          }
          
          // For Not Generated and All tabs: Show template selection dropdown
          const assignedTemplate = getAssignedTemplate(provider);
          
          return (
            <div className="w-full h-full flex items-center justify-center px-1" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="w-full">
                <Select
                  value={assignedTemplate?.id || 'no-template'}
                  onValueChange={(templateId) => {
                    if (templateId === 'no-template') {
                      updateProviderTemplate(provider.id, null);
                    } else {
                      updateProviderTemplate(provider.id, templateId);
                    }
                  }}
                >
                  <SelectTrigger 
                    className="h-6 px-2 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors" 
                    style={{ position: 'relative', zIndex: 1, maxWidth: '140px' }}
                    title={assignedTemplate ? `${assignedTemplate.name} v${assignedTemplate.version || '1.0.0'}` : 'Select Template'}
                  >
                    <SelectValue>
                      {assignedTemplate ? (
                        <span className="truncate text-gray-700 font-medium">
                          {assignedTemplate.name}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Select</span>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-template">
                      <span className="text-gray-500">No template</span>
                    </SelectItem>
                    {templates
                      .filter(t => t?.id && t?.name)
                      .map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          <div>
                            <div className="font-medium">{template.name}</div>
                            <div className="text-xs text-gray-500">v{template.version || '1'}</div>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          );
        },
        sortable: true,
        filter: 'agTextColumnFilter',
        suppressSizeToFit: false,
        suppressAutoSize: false,
        resizable: true,
        cellStyle: { 
          padding: '0',
          overflow: 'hidden'
        },
      },
    };

    // Build columns based on columnOrder
    const orderedColumns = columnOrder.map(field => {
      const colDef = allColumnDefs[field as keyof typeof allColumnDefs];
      if (!colDef) return null;

      // Apply pinning from preferences
      let pinned: 'left' | 'right' | undefined;
      if (leftPinned.includes(field)) {
        pinned = 'left';
      } else if (rightPinned.includes(field)) {
        pinned = 'right';
      }

      return {
        ...colDef,
        pinned,
        hide: hiddenColumns.has(field),
      };
    }).filter(Boolean);

    return [selectColumn, ...orderedColumns];
  }, [columnOrder, hiddenColumns, columnPreferences?.columnPinning, selectedProviderIds, templateAssignments, templates, getAssignedTemplate, updateProviderTemplate, statusTab, generatedContracts]);

  // Generation Status column (only for All tab)
  const generationStatusColumn = {
    headerName: 'Generation Status',
    field: 'generationStatus',
    width: 160,
    minWidth: 140,
    cellRenderer: (params: any) => {
      const status = params.value;
      if (status === 'Success') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> Generated
          </span>
        );
      }
      if (status === 'Partial Success') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3" /> Partial
          </span>
        );
      }
      if (status === 'Failed') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      }
      if (status === 'Needs Review') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3" /> Review
          </span>
        );
      }
      if (status === 'Not Generated') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <span className="w-3 h-3 text-center">—</span> Ready
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing
        </span>
      );
    },
    sortable: true,
    filter: 'agTextColumnFilter',
    tooltipValueGetter: (params: any) => {
      const generationDate = getGenerationDate(params.data.id, selectedTemplate?.id || '');
      return generationDate ? `Last generated: ${formatDate(generationDate.toISOString())}` : 'Not generated yet';
    },
  };

  // Contract Actions column (only for Processed tab)
  const contractActionsColumn = {
    headerName: 'Contract Actions',
    field: 'actions',
    width: 160,
    minWidth: 140,
    cellRenderer: (params: any) => {
      const provider = params.data;
      // Find any contract for this provider (including failed ones so they show up in Processed tab)
      const contract = generatedContracts.find(
        c => c.providerId === provider.id
      );
      
      if (contract) {
        const isPartialSuccess = contract.status === 'PARTIAL_SUCCESS';
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadContract(provider, contract.templateId)}
              className={`${isPartialSuccess ? 'text-orange-600' : 'text-blue-600'} hover:bg-blue-50 p-1 h-8 w-8`}
              title="Download Contract"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePreviewGenerate(provider.id)}
              className={`${isPartialSuccess ? 'text-orange-600' : 'text-blue-600'} hover:bg-blue-50 p-1 h-8 w-8`}
              title="Preview Contract"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        );
      }
      
      return (
        <span className="text-gray-400 text-sm">Not Generated</span>
      );
    },
    sortable: false,
    filter: false,
    resizable: false,
    pinned: null, // Explicitly set to null to prevent any pinning
  };

  // Comprehensive column definitions for all tabs - column manager will handle visibility
  const allPossibleColumns = useMemo(() => [
    ...baseColumns,
    generationStatusColumn,
    contractActionsColumn
  ], [baseColumns, generationStatusColumn, contractActionsColumn]);

  // Contextual column definitions based on current tab
  const agGridColumnDefs = useMemo(() => {
    // Always return all possible columns - let the column manager handle visibility
    // This ensures the column manager sees all columns regardless of tab
    return allPossibleColumns;
  }, [allPossibleColumns]);

  // Prepare row data for AG Grid - ONLY include the fields we have column definitions for
  const agGridRows = paginatedProviders.map((provider: Provider) => {
    // Find the latest generated contract for this provider (include all statuses)
    const latestContract = generatedContracts
      .filter(c => c.providerId === provider.id)
      .sort((a, b) => {
        // First sort by status (SUCCESS first, then PARTIAL_SUCCESS, then FAILED)
        if (a.status === 'SUCCESS' && b.status !== 'SUCCESS') return -1;
        if (a.status === 'PARTIAL_SUCCESS' && b.status === 'FAILED') return -1;
        if (a.status === 'FAILED' && b.status === 'SUCCESS') return 1;
        if (a.status === 'FAILED' && b.status === 'PARTIAL_SUCCESS') return 1;
        // Then sort by date (newest first)
        return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
      })[0];
    
    let generationStatus = 'Not Generated';
    if (latestContract) {
      if (latestContract.status === 'SUCCESS') {
        generationStatus = 'Success';
      } else if (latestContract.status === 'PARTIAL_SUCCESS') {
        generationStatus = 'Partial Success';
      } else {
        generationStatus = 'Failed';
      }
    } else {
      generationStatus = 'Not Generated';
    }
    
    // CRITICAL FIX: Only include fields that have column definitions
    const allowedFields = [
      'id', 'name', 'employeeId', 'providerType', 'specialty', 'subspecialty', 
      'administrativeRole', 'baseSalary', 'fte', 'startDate', 'compensationModel',
      'totalFTE', 'TotalFTE', 'dynamicFields', 'compensationType', 'CompensationModel',
      'generationStatus', 'actions'
    ];
    
    const filteredProvider: any = {};
    allowedFields.forEach(field => {
      if (field in provider || field === 'generationStatus' || field === 'actions') {
        if (field === 'generationStatus') {
          filteredProvider[field] = generationStatus;
        } else if (field === 'actions') {
          // Add actions field for Contract Actions column
          filteredProvider[field] = 'actions';
        } else {
          filteredProvider[field] = provider[field as keyof Provider];
        }
      }
    });
    
    return filteredProvider;
  });

  // Progress tracking will be calculated using the existing allFilteredProvidersWithStatus logic below

  // CSV Export (async, robust download links)
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      // Use all filtered providers, not just paginated
      const allRows = await Promise.all(filteredProviders.map(async (provider: Provider) => {
        // Find the latest generated contract for this provider (prioritize SUCCESS over PARTIAL_SUCCESS)
        const latestContract = generatedContracts
          .filter(c => c.providerId === provider.id && (c.status === 'SUCCESS' || c.status === 'PARTIAL_SUCCESS'))
          .sort((a, b) => {
            // First sort by status (SUCCESS first, then PARTIAL_SUCCESS)
            if (a.status === 'SUCCESS' && b.status !== 'SUCCESS') return -1;
            if (a.status !== 'SUCCESS' && b.status === 'SUCCESS') return 1;
            // Then sort by date (newest first)
            return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
          })[0];
        
        // Find assigned template
        const assignedTemplateId = templateAssignments[provider.id];
        const assignedTemplate = assignedTemplateId
          ? templates.find(t => t.id === assignedTemplateId)
          : null;
        
        let generationStatus = 'Outstanding';
        let generationDate = '';
        let downloadLink = '';
        if (latestContract && assignedTemplate) {
          if (latestContract.status === 'SUCCESS') {
            generationStatus = 'Generated';
          } else if (latestContract.status === 'PARTIAL_SUCCESS') {
            generationStatus = 'Generated (S3 Failed)';
          } else {
            generationStatus = 'Failed';
          }
          generationDate = latestContract.generatedAt;
          // Try to use fileUrl if present and looks like a URL
          if (latestContract.fileUrl && latestContract.fileUrl.startsWith('http')) {
            downloadLink = latestContract.fileUrl;
          } else {
            // Reconstruct contractId and fileName
            const contractYear = assignedTemplate.contractYear || new Date().getFullYear().toString();
            const contractId = provider.id + '-' + assignedTemplate.id + '-' + contractYear;
            const fileName = getContractFileName(contractYear, provider.name, generationDate ? generationDate.split('T')[0] : new Date().toISOString().split('T')[0]);
            try {
              const result = await getContractFile(contractId, fileName);
              downloadLink = result.url;
            } catch (e) {
              downloadLink = '';
            }
          }
        }
        
        return {
          ...provider,
          assignedTemplate: assignedTemplate ? assignedTemplate.name : 'Unassigned',
          generationStatus,
          generationDate,
          downloadLink,
        };
      }));
      
      // Build headers based on visible columns + extra fields
      const visibleFields = agGridColumnDefs
        .filter(col => col.field && col.field !== 'checkbox' && !hiddenColumns.has(col.field))
        .map(col => col.field);
      const headers = [
        ...visibleFields.map(field => {
          const col = agGridColumnDefs.find(c => c.field === field);
          return col?.headerName || field;
        }),
        'Assigned Template',
        'Generation Status',
        'Generation Date',
        'Download Link',
      ];
      
      // Build rows
      const rows = allRows.map(row => [
        ...visibleFields.map(field => (row as any)[field] ?? ''),
        row.assignedTemplate,
        row.generationStatus,
        row.generationDate,
        row.downloadLink,
      ]);
      
      // CSV encode
      const csv = [headers, ...rows].map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'contract-generation-providers.csv');
    } catch (err) {
      setUserError('Failed to export CSV. Please try again.');
      console.error('CSV Export Error:', err);
    } finally {
      setIsExportingCSV(false);
    }
  };

  // After provider and template are selected and merged, set editorContent
  useEffect(() => {
    const updateEditorContent = async () => {
      if (selectedProviderIds.length === 1) {
        const provider = providers.find(p => p.id === selectedProviderIds[0]);
        if (provider) {
          // Use assigned template or fallback to selected template
          const templateToUse = getAssignedTemplate(provider) || selectedTemplate;
          if (!templateToUse) {
            setEditorContent('');
            return;
          }
          
          const html = templateToUse.editedHtmlContent || templateToUse.htmlPreviewContent || '';
          const mapping = mappings[templateToUse.id]?.mappings;
          
          // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
          const enhancedMapping = mapping?.map(m => {
            // Check if this mapping has a dynamic block (stored in value field with dynamic: prefix)
            if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
              return {
                ...m,
                mappingType: 'dynamic' as const,
                mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
                mappedColumn: undefined, // Clear the mappedColumn since it's a dynamic block
              };
            }
            return {
              ...m,
              mappingType: 'field' as const,
            };
          });
          
          const { content: mergedHtml } = await mergeTemplateWithData(templateToUse, provider, html, enhancedMapping);
          setEditorContent(mergedHtml);
        }
      }
    };
    
    updateEditorContent();
  }, [selectedTemplate, selectedProviderIds, providers, mappings, templateAssignments]);





  // Add state and memo for filter values and unique lists at the top of the component
  // Compute unique options for cascading filters
  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    providers.forEach(p => { if (p.specialty) set.add(p.specialty); });
    return Array.from(set).sort();
  }, [providers]);

  const subspecialtyOptions = useMemo(() => {
    return providers
      .filter(p => selectedSpecialty === "__ALL__" || p.specialty === selectedSpecialty)
      .map(p => p.subspecialty)
      .filter((s): s is string => !!s)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
  }, [providers, selectedSpecialty]);

  const providerTypeOptions = useMemo(() => {
    return providers
      .filter(p => (selectedSpecialty === "__ALL__" || p.specialty === selectedSpecialty) &&
                   (selectedSubspecialty === "__ALL__" || p.subspecialty === selectedSubspecialty))
      .map(p => p.providerType)
      .filter((s): s is string => !!s)
      .filter((v, i, arr) => arr.indexOf(v) === i)
      .sort();
  }, [providers, selectedSpecialty, selectedSubspecialty]);

  // Reset lower-level filters if their value is no longer valid
  useEffect(() => {
    if (selectedSubspecialty !== "__ALL__" && !subspecialtyOptions.includes(selectedSubspecialty)) {
      setSelectedSubspecialty("__ALL__");
    }
    // After resetting subspecialty, check provider type
    if (selectedProviderType !== "__ALL__" && !providerTypeOptions.includes(selectedProviderType)) {
      setSelectedProviderType("__ALL__");
    }
    // eslint-disable-next-line
  }, [selectedSpecialty, subspecialtyOptions, providerTypeOptions]);

  // Compute tab counts from ALL filtered providers (not just paginated ones)
  const allFilteredProvidersWithStatus = filteredProviders.map((provider: Provider) => {
    // Find the latest processed contract (SUCCESS, PARTIAL_SUCCESS, or any contract that was generated)
    const latestProcessedContract = generatedContracts
      .filter(c => c.providerId === provider.id)
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
    
    let generationStatus = 'Not Generated';
    if (latestProcessedContract) {
      if (latestProcessedContract.status === 'SUCCESS') {
        generationStatus = 'Success';
      } else if (latestProcessedContract.status === 'PARTIAL_SUCCESS') {
        generationStatus = 'Partial Success';
      } else if (latestProcessedContract.status === 'FAILED') {
        // Show failed contracts as "Partial Success" so they appear in Processed tab
        generationStatus = 'Partial Success';
      } else {
        generationStatus = 'Not Generated';
      }
    } else {
      generationStatus = 'Not Generated';
    }
    
    return {
      ...provider,
      generationStatus,
    };
  });
  
  // Debug year filtering
  console.log('🔍 Year Filtering Debug:', {
    currentYear: new Date().getFullYear().toString(),
    contractsByYear: generatedContracts.reduce((acc, contract) => {
      const year = new Date(contract.generatedAt).getFullYear().toString();
      acc[year] = (acc[year] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    sampleContractYears: generatedContracts.slice(0, 10).map(c => ({
      providerId: c.providerId,
      generatedAt: c.generatedAt,
      year: new Date(c.generatedAt).getFullYear().toString()
    }))
  });

  const processedRows = allFilteredProvidersWithStatus.filter(
    row => row.generationStatus === 'Success' || row.generationStatus === 'Partial Success'
  );
  // Get real counts from database contracts, not just filtered providers
  const getRealTabCounts = () => {
    const totalContracts = generatedContracts.length;
    const successContracts = generatedContracts.filter(c => c.status === 'SUCCESS').length;
    const partialSuccessContracts = generatedContracts.filter(c => c.status === 'PARTIAL_SUCCESS').length;
    const failedContracts = generatedContracts.filter(c => c.status === 'FAILED').length;
    const processedContracts = successContracts + partialSuccessContracts + failedContracts;
    
    return {
      notGenerated: filteredProviders.length - processedContracts,
      processed: processedContracts,
      all: filteredProviders.length,
    };
  };

  const notGeneratedRows = allFilteredProvidersWithStatus.filter(row => row.generationStatus === 'Not Generated');
  const allRows = allFilteredProvidersWithStatus;
  
  // Debug logging for tab counts
  console.log('🔍 Tab Counts Debug:', {
    totalProviders: filteredProviders.length,
    generatedContractsInState: generatedContracts.length,
    realTabCounts: getRealTabCounts(),
    oldTabCounts: {
      processedRows: processedRows.length,
      notGeneratedRows: notGeneratedRows.length,
      allRows: allRows.length,
    },
    generatedContractsDetails: generatedContracts.map(c => ({
      providerId: c.providerId,
      templateId: c.templateId,
      status: c.status,
      generatedAt: c.generatedAt
    })),
    sampleProviderStatus: allFilteredProvidersWithStatus.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      generationStatus: p.generationStatus,
      assignedTemplate: getAssignedTemplate(p)?.id
    }))
  });
  
  // Additional debug logging for processed contracts
  console.log('🔍 Processed Contracts Debug:', {
    statusTab,
    processedRowsCount: processedRows.length,
    processedRowsDetails: processedRows.slice(0, 5).map(p => ({
      id: p.id,
      name: p.name,
      generationStatus: p.generationStatus,
      matchingContracts: generatedContracts.filter(c => c.providerId === p.id)
    }))
  });
  
  // Debug the contract status matching logic
  console.log('🔍 Contract Status Matching Debug:', {
    totalGeneratedContracts: generatedContracts.length,
    contractsWithSuccessStatus: generatedContracts.filter(c => c.status === 'SUCCESS').length,
    contractsWithPartialSuccessStatus: generatedContracts.filter(c => c.status === 'PARTIAL_SUCCESS').length,
    contractsWithFailedStatus: generatedContracts.filter(c => c.status === 'FAILED').length,
    sampleContracts: generatedContracts.slice(0, 5).map(c => ({
      providerId: c.providerId,
      status: c.status,
      generatedAt: c.generatedAt
    })),
    sampleProviderMatching: filteredProviders.slice(0, 3).map(p => {
      const matchingContracts = generatedContracts.filter(c => c.providerId === p.id);
      const latestContract = matchingContracts
        .filter(c => c.status === 'SUCCESS' || c.status === 'PARTIAL_SUCCESS')
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
      return {
        providerId: p.id,
        providerName: p.name,
        matchingContractsCount: matchingContracts.length,
        latestContractStatus: latestContract?.status || 'none',
        generationStatus: latestContract ? (latestContract.status === 'SUCCESS' ? 'Success' : 'Partial Success') : 'Not Generated'
      };
    })
  });

  // Debug logging for column preferences
  console.log('🔍 Column Preferences Debug:', {
    userPreferences: userPreferences,
    columnVisibility: userPreferences?.columnVisibility,
    columnOrder: userPreferences?.columnOrder,
    columnPinning: userPreferences?.columnPinning,
    hasColumnPreferences: !!userPreferences?.columnVisibility,
    columnVisibilityKeys: userPreferences?.columnVisibility ? Object.keys(userPreferences.columnVisibility) : [],
    columnOrderLength: userPreferences?.columnOrder?.length || 0,
    userPreferencesKeys: userPreferences ? Object.keys(userPreferences) : []
  });
  
  const tabCounts = getRealTabCounts();

  // Compute counts for progress bar and stats - use ALL filtered providers
  const completedCount = processedRows.length;
  const partialSuccessCount = allFilteredProvidersWithStatus.filter(row => row.generationStatus === 'Partial Success').length;
  const failedCount = allFilteredProvidersWithStatus.filter(row => row.generationStatus === 'Failed').length;
  const notGeneratedCount = notGeneratedRows.length;
  const totalCount = allFilteredProvidersWithStatus.length;
  
  // For AG Grid display, use paginated providers with status
  const tabFilteredRows = statusTab === 'notGenerated' ? notGeneratedRows : statusTab === 'processed' ? processedRows : allRows;
  const visibleRows = tabFilteredRows.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  
  // Debug logging
  console.log('🔍 Pagination Debug:', {
    statusTab,
    tabFilteredRowsCount: tabFilteredRows.length,
    visibleRowsCount: visibleRows.length,
    pageIndex,
    pageSize,
    selectedProviderIdsCount: selectedProviderIds.length
  });

  // Sync AG Grid selection with selectedProviderIds state




  return (
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">

        {/* Header Card - Consistent with Templates/Providers, now with Template Selector */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg font-bold text-gray-800">Contract Generation</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white px-3 py-2 text-sm rounded-md shadow-lg">
                    Generate contracts for selected providers using your templates
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              
              <div className="flex-1" /> {/* Spacer to push help icon to the right */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setInstructionsModalOpen(true)}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      title="View detailed instructions"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="bg-gray-900 text-white px-3 py-2 text-sm rounded-md shadow-lg">
                    View detailed instructions and help
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Template Selector - right-aligned in header */}
            
          </div>
          <hr className="my-3 border-gray-100" />
        </div>

        {/* Main Card: Filter, table, no top action buttons */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          {/* Modern Filter Sections */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Bulk Processing Section - Progressive Disclosure Design */}
            <div className="rounded-xl border border-blue-100 bg-gray-50 shadow-sm p-0 transition-all duration-300 ${bulkOpen ? 'pb-6' : 'pb-0'} relative">
              <div className="flex items-center gap-3 px-6 pt-6 pb-2 cursor-pointer select-none" onClick={() => setBulkOpen(v => !v)}>
                <span className="text-blue-600 text-2xl">⚡</span>
                <span className="font-bold text-lg text-blue-900 tracking-wide">Bulk Processing</span>
              </div>
              <button
                className="absolute top-4 right-4 p-1 rounded hover:bg-blue-100 transition-colors"
                aria-label={bulkOpen ? 'Collapse' : 'Expand'}
                tabIndex={0}
                onClick={e => { e.stopPropagation(); setBulkOpen(v => !v); }}
                type="button"
              >
                {bulkOpen ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${bulkOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
                
                {/* Primary Actions */}
                <div className="px-6 pt-4 pb-4 border-b border-gray-200">
                  <div className="space-y-4">
                    {/* Bulk Actions */}
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allFilteredIds = filteredProviders.map((p: Provider) => p.id);
                          setSelectedProviderIds(allFilteredIds);
                        }}
                        disabled={filteredProviders.length === 0 || isBulkGenerating}
                        className="font-medium"
                        title="Select all providers across all tabs and pages"
                      >
                        All Filtered ({filteredProviders.length})
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const visibleIds = visibleRows.map((p: Provider) => p.id);
                          setSelectedProviderIds(visibleIds);
                        }}
                        disabled={providers.length === 0 || isBulkGenerating}
                        className="font-medium"
                        title="Select all providers currently visible on this page"
                      >
                        Visible
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProviderIds([]);
                        }}
                        disabled={selectedProviderIds.length === 0 || isBulkGenerating}
                        className="font-medium"
                        title="Clear all selected providers"
                      >
                        Clear
                      </Button>




                    </div>
                  </div>
                </div>



                {/* Advanced Options */}
                <div className="px-6 pt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Filters & Advanced Options</div>
                  
                  {/* Filters Row */}
                  <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 gap-2 mb-4 justify-between">
                    {/* Filter Dropdowns - Left Side */}
                    <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 gap-2">
                      <div className="flex flex-col min-w-[160px]">
                        <span className="mb-1 font-semibold text-blue-700 text-sm tracking-wide">Specialty</span>
                        <Select
                          value={selectedSpecialty}
                          onValueChange={val => {
                            setSelectedSpecialty(val);
                            setPageIndex(0);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Specialties" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ALL__">All Specialties</SelectItem>
                            {specialtyOptions.filter(s => s && s.trim() !== '').map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col min-w-[160px]">
                        <span className="mb-1 font-semibold text-blue-700 text-sm tracking-wide">Subspecialty</span>
                        <Select
                          value={selectedSubspecialty}
                          onValueChange={val => {
                            setSelectedSubspecialty(val);
                            setPageIndex(0);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Subspecialties" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ALL__">All Subspecialties</SelectItem>
                            {subspecialtyOptions.filter(s => s && s.trim() !== '').map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-col min-w-[160px]">
                        <span className="mb-1 font-semibold text-blue-700 text-sm tracking-wide">Provider Type</span>
                        <Select
                          value={selectedProviderType}
                          onValueChange={val => {
                            setSelectedProviderType(val);
                            setPageIndex(0);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__ALL__">All Types</SelectItem>
                            {providerTypeOptions.filter(s => s && s.trim() !== '').map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Reset Actions - Right Side */}
                    <div className="flex flex-col min-w-[400px] mt-4 sm:mt-0">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-center mb-3">
                          <span className="font-semibold text-blue-700 text-sm tracking-wide">Reset Filters</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Microsoft/Google-style compact button group */}
                          <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                            {/* Clear Filters - Primary Action */}
                            <button
                              onClick={() => {
                                setSelectedSpecialty("__ALL__");
                                setSelectedSubspecialty("__ALL__");
                                setSelectedProviderType("__ALL__");
                                setPageIndex(0);
                              }}
                              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 border-r border-gray-300 flex items-center gap-1.5"
                              title="Clear all filters"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Clear
                            </button>
                            
                            {/* Template Assignments - Secondary Action */}
                            <button
                              onClick={clearTemplateAssignments}
                              disabled={isBulkGenerating || Object.keys(templateAssignments).length === 0}
                              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 border-r border-gray-300 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Clear template assignments"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Templates
                            </button>
                            
                            {/* Complete Reset - Tertiary Action */}
                            <button
                              onClick={() => {
                                setTemplateAssignments({});
                                setSessionTemplateAssignments({});
                                sessionRestoredRef.current = false;
                                setSelectedProviderIds([]);
                                showSuccess('Complete reset: All assignments and selections cleared');
                              }}
                              disabled={isBulkGenerating}
                              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Complete system reset"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Reset
                            </button>
                          </div>
                          
                          {/* Destructive Action - Separated for safety (Epic EMR style) */}
                          {statusTab === 'processed' && (
                            <>
                              <div className="w-px h-6 bg-gray-300 mx-2"></div>
                              <button
                                onClick={handleClearAllProcessed}
                                disabled={isBulkGenerating}
                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 border border-red-300 rounded-md flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Clear all processed contracts"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Clear All
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  

                </div>
              </div>
            </div>
          </div>

          {/* Tabs for Pending / Processed / All */}
          <div className="mb-2 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Tabs value={statusTab} onValueChange={v => setStatusTab(v as 'notGenerated' | 'processed' | 'all')} className="flex-1">
                <TabsList className="flex gap-2 border-b-0 bg-transparent justify-start relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1.5px] after:bg-gray-200 after:z-10 overflow-visible">
                  <TabsTrigger value="notGenerated" className="px-5 py-2 font-semibold text-sm border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                    data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm
                    data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                    Not Generated <span className="ml-1 text-xs">({tabCounts.notGenerated})</span>
                  </TabsTrigger>

                  <TabsTrigger value="processed" className="px-5 py-2 font-semibold text-sm border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                    data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm
                    data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                    Processed <span className="ml-1 text-xs">({tabCounts.processed})</span>
                  </TabsTrigger>
                  <TabsTrigger value="all" className="px-5 py-2 font-semibold text-sm border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                    data-[state=active]:bg-blue-50 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300 data-[state=active]:shadow-sm
                    data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                    All <span className="ml-1 text-xs">({tabCounts.all})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              
              {/* Refresh button for Processed tab */}
              {statusTab === 'processed' && (
                <Button
                  onClick={hydrateGeneratedContracts}
                  variant="outline"
                  size="sm"
                  className="px-3 flex items-center gap-2 text-blue-600 border-blue-300 hover:bg-blue-50"
                  title="Refresh processed contracts from database"
                >
                  <RotateCcw className="w-4 h-4" />
                  Refresh
                </Button>
              )}
            </div>
            
            {/* Status & Progress - Positioned on the right side of tabs */}
            <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-6 text-sm">
                {/* Template Assignment Status */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-700">Templates:</span>
                  <span className="text-green-600 font-semibold">{Object.keys(templateAssignments).length}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">{tabFilteredRows.length}</span>
                  <span className="text-gray-400">assigned</span>
                </div>
                
                              {/* Generation Progress Donut Chart */}
              {(completedCount > 0 || isBulkGenerating) && (
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12">
                    {/* Background circle */}
                    <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        className="text-gray-200"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        stroke="currentColor"
                        strokeWidth="3"
                        fill="none"
                        strokeLinecap="round"
                        className="text-emerald-500 transition-all duration-300 ease-out"
                        style={{
                          strokeDasharray: `${2 * Math.PI * 20}`,
                          strokeDashoffset: `${2 * Math.PI * 20 * (1 - (totalCount ? completedCount / totalCount : 0))}`
                        }}
                      />
                    </svg>
                    {/* Center percentage text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-bold text-emerald-600">
                        {totalCount ? Math.round(completedCount / totalCount * 100) : 0}%
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-700">
                      complete
                    </span>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Search Provider Section - Moved below bulk processing */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search providers..."
                    value={search}
                    onChange={e => {
                      setSearch(e.target.value);
                      setPageIndex(0);
                    }}
                    className="pl-10 pr-4 py-2 w-full"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select
                  value={selectedProviderType}
                  onValueChange={val => {
                    setSelectedProviderType(val);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Types</SelectItem>
                    {providerTypeOptions.filter(s => s && s.trim() !== '').map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button
                  onClick={handleExportCSV}
                  variant="outline"
                  size="sm"
                  className="px-3 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export CSV
                </Button>
                

                <Button
                  onClick={() => setIsColumnSidebarOpen(!isColumnSidebarOpen)}
                  variant="default"
                  size="sm"
                  className="px-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  title="Manage column visibility, order, and pinning"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  Columns
                </Button>
                
                {/* Active View Selector */}
                {Object.keys(savedViews).length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">View:</span>
                    <Select
                      value={activeColumnView}
                      onValueChange={(viewName) => {
                        if (viewName === 'default') {
                          setActiveColumnView('default');
                        } else if (savedViews[viewName]) {
                          const viewData = savedViews[viewName];
                          // Apply the saved view
                          if (viewData.columnVisibility) {
                            updateColumnVisibility(viewData.columnVisibility);
                          }
                          if (viewData.columnOrder) {
                            updateColumnOrder(viewData.columnOrder);
                          }
                          if (viewData.columnPinning) {
                            updateColumnPinning(viewData.columnPinning);
                          }
                          setActiveColumnView(viewName);
                        }
                      }}
                    >
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        {Object.keys(savedViews).map(viewName => (
                          <SelectItem key={viewName} value={viewName}>
                            {viewName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AG Grid Table */}
          <div className="ag-theme-alpine w-full border border-gray-200 rounded-lg overflow-visible" style={{ 
            height: '600px',
            width: '100%',
            minWidth: '100%',
            maxWidth: '100%',
            '--ag-header-background-color': '#f8fafc',
            '--ag-header-foreground-color': '#374151',
            '--ag-border-color': '#e5e7eb',
            '--ag-row-hover-color': '#f8fafc',
            '--ag-selected-row-background-color': '#f1f5f9',
            '--ag-font-family': 'var(--font-sans, sans-serif)',
            '--ag-font-size': '14px',
            '--ag-header-height': '44px',
            '--ag-row-height': '40px'
          } as React.CSSProperties}>
            <AgGridReact
              ref={gridRef}
              rowData={visibleRows}
              columnDefs={agGridColumnDefs as import('ag-grid-community').ColDef<ExtendedProvider, any>[]}
              domLayout="normal"
              suppressRowClickSelection={false}
              onRowClicked={handleRowClick}
              pagination={false}
              enableCellTextSelection={true}
              headerHeight={44}
              rowHeight={40}
              suppressDragLeaveHidesColumns={true}
              suppressScrollOnNewData={true}
              suppressColumnVirtualisation={true}
              suppressRowVirtualisation={false}
              suppressHorizontalScroll={false}
              maintainColumnOrder={true}
              getRowId={(params) => params.data.id}
              // Prevent extra columns - use strict column control
              suppressLoadingOverlay={false}
              suppressNoRowsOverlay={false}
              skipHeaderOnAutoSize={true}
              // Column sizing and auto-fit
              suppressColumnMoveAnimation={false}
              suppressRowHoverHighlight={false}
              suppressCellFocus={false}
              // Prevent blank space issues
              suppressFieldDotNotation={true}
              // Remove unwanted gridlines and separators
              suppressMenuHide={false}

              // Enable column auto-sizing
              onGridReady={(params) => {
                // Auto-size columns to fit content but respect max widths
                params.api.sizeColumnsToFit();
                
                // Force columns to fill the entire width
                setTimeout(() => {
                  params.api.sizeColumnsToFit();
                  // Force a second resize to ensure proper layout
                  setTimeout(() => {
                    params.api.sizeColumnsToFit();
                  }, 50);
                }, 100);
              }}
              
              // Force proper column sizing on data changes
              onRowDataUpdated={(params) => {
                setTimeout(() => {
                  params.api.sizeColumnsToFit();
                }, 50);
              }}

              defaultColDef={{ 
                tooltipValueGetter: params => params.value, 
                resizable: true, 
                sortable: true, 
                filter: true,
                menuTabs: ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'],
                cellStyle: { 
                  fontSize: '14px', 
                  fontFamily: 'var(--font-sans, sans-serif)', 
                  fontWeight: 400, 
                  color: '#111827', 
                  display: 'flex', 
                  alignItems: 'center', 
                  height: '100%',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                },
                suppressSizeToFit: false,
                suppressAutoSize: false
              }}
              isRowSelectable={(rowNode) => {
                return Boolean(rowNode.data && rowNode.data.id);
              }}
              enableBrowserTooltips={true}
              enableRangeSelection={true}
              singleClickEdit={false}
              suppressClipboardPaste={false}
              suppressCopyRowsToClipboard={false}
              allowContextMenuWithControlKey={true}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {Math.min(tabFilteredRows.length, pageSize * (pageIndex + 1) - pageSize + 1)}–{Math.min(tabFilteredRows.length, pageSize * (pageIndex + 1))} of {tabFilteredRows.length} providers
            </div>
            
            {/* Bottom Pagination Controls - Left aligned */}
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
              <span className="text-sm px-4">Page {pageIndex + 1} of {Math.max(1, Math.ceil(tabFilteredRows.length / pageSize))}</span>
              <Button variant="outline" size="sm" disabled={pageIndex >= Math.ceil(tabFilteredRows.length / pageSize) - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex >= Math.ceil(tabFilteredRows.length / pageSize) - 1} onClick={() => setPageIndex(Math.ceil(tabFilteredRows.length / pageSize) - 1)}>&raquo;</Button>
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
        {/* Error Message */}
        {(userError || error) && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg mt-4">
            <AlertTriangle className="h-5 w-5" />
            <span>{userError || error}</span>
          </div>
        )}


        {/* AG Grid font override for exact match */}
        <style>{`
          .ag-theme-alpine, .ag-theme-alpine .ag-cell, .ag-theme-alpine .ag-header-cell, .ag-theme-alpine .ag-header-group-cell {
            font-size: 14px !important;
            font-family: var(--font-sans, sans-serif) !important;
            font-weight: 400 !important;
            color: #111827 !important;
          }
          .ag-theme-alpine .ag-header-cell-label .ag-header-cell-text {
            font-weight: 600 !important;
          }
          .ag-checkbox-cell, .ag-checkbox-header {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }
          /* Selection indicator styling */
          .ag-theme-alpine .ag-cell[col-id="selected"] {
            pointer-events: none !important;
          }
          /* Header selection indicator - make it clickable */
          .ag-theme-alpine .ag-header-cell[col-id="selected"] {
            pointer-events: auto !important;
            cursor: pointer !important;
          }
          .ag-theme-alpine .ag-header-cell[col-id="selected"]:hover {
            background-color: #f3f4f6 !important;
          }
          /* Native checkbox styling with subtle modern enhancements */
          .ag-theme-alpine .ag-checkbox-input {
            width: 16px !important;
            height: 16px !important;
            cursor: pointer !important;
            accent-color: #3b82f6 !important;
            transform: scale(1.1) !important;
            transition: all 0.15s ease !important;
          }
          .ag-theme-alpine .ag-checkbox-input:hover {
            transform: scale(1.15) !important;
          }
          .ag-theme-alpine .ag-checkbox-input:focus {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
          }
          /* Enhanced row interaction styling */
          .ag-theme-alpine .ag-row {
            cursor: pointer !important;
            transition: background-color 0.15s ease !important;
          }
          .ag-theme-alpine .ag-row:hover {
            background-color: #f8fafc !important;
          }
          .ag-theme-alpine .ag-row-selected {
            background-color: #eff6ff !important;
          }
          .ag-theme-alpine .ag-row-selected:hover {
            background-color: #dbeafe !important;
          }
          /* Keep selection indicator column unaffected by row selection */
          .ag-theme-alpine .ag-row-selected .ag-cell[col-id="selected"] {
            background-color: transparent !important;
          }
          /* Ensure text remains readable in selected rows */
          .ag-theme-alpine .ag-row-selected .ag-cell {
            color: #111827 !important;
          }
          /* Remove ALL horizontal gridlines */
          .ag-theme-alpine .ag-row {
            border-bottom: none !important;
          }
          .ag-theme-alpine .ag-row:last-child {
            border-bottom: none !important;
          }
          /* Remove any internal row borders that might cause gridlines */
          .ag-theme-alpine .ag-cell {
            border: none !important;
            border-right: 1px solid #e5e7eb !important;
            border-bottom: none !important;
            border-top: none !important;
          }
          .ag-theme-alpine .ag-cell:last-child {
            border-right: none !important;
          }
          /* Remove ALL possible horizontal lines */
          .ag-theme-alpine .ag-row-group {
            border-bottom: none !important;
          }
          .ag-theme-alpine .ag-row-group-indent-1,
          .ag-theme-alpine .ag-row-group-indent-2,
          .ag-theme-alpine .ag-row-group-indent-3 {
            border-bottom: none !important;
          }
          .ag-theme-alpine .ag-body-viewport {
            border-bottom: none !important;
          }
          .ag-theme-alpine .ag-center-cols-container {
            border-bottom: none !important;
          }
          .ag-theme-alpine .ag-body-viewport-wrapper {
            border-bottom: none !important;
          }
          /* Vertically center all cell and header content */
          .ag-theme-alpine .ag-cell, .ag-theme-alpine .ag-header-cell {
            display: flex !important;
            align-items: center !important;
            height: 100% !important;
          }
          /* Enhance header row separators */
          .ag-theme-alpine .ag-header-cell:not(:last-child) {
            border-right: 1.5px solid #e5e7eb !important;
          }
          /* Shade header row */
          .ag-theme-alpine .ag-header {
            background-color: #f9fafb !important;
          }
          /* Tooltip style for overflow */
          .ag-theme-alpine .ag-cell[title] {
            cursor: help;
          }
          /* Fix pinned column scrollbar issues */
          .ag-theme-alpine .ag-pinned-left {
            overflow: hidden !important;
          }
          .ag-theme-alpine .ag-pinned-left .ag-cell {
            overflow: hidden !important;
          }
          /* Hide scrollbars in pinned sections */
          .ag-theme-alpine .ag-pinned-left::-webkit-scrollbar {
            display: none !important;
          }
          .ag-theme-alpine .ag-pinned-left {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }

          /* Override AG Grid's default border styling */
          .ag-theme-alpine .ag-root-wrapper {
            border: none !important;
          }
          .ag-theme-alpine .ag-root {
            border: none !important;
          }
          .ag-theme-alpine .ag-body {
            border: none !important;
          }
          .ag-theme-alpine .ag-body-viewport {
            border: none !important;
          }
          .ag-theme-alpine .ag-center-cols-container {
            border: none !important;
          }
          .ag-theme-alpine .ag-center-cols-clipper {
            border: none !important;
          }
          .ag-theme-alpine .ag-center-cols-viewport {
            border: none !important;
          }
          /* Final override to remove ALL horizontal lines */
          .ag-theme-alpine * {
            border-bottom: none !important;
            border-top: none !important;
          }
          /* But keep vertical borders for columns */
          .ag-theme-alpine .ag-cell {
            border-right: 1px solid #e5e7eb !important;
          }
          .ag-theme-alpine .ag-cell:last-child {
            border-right: none !important;
          }
          /* Prevent button highlighting issues */
          .ag-theme-alpine button:focus {
            outline: none !important;
          }
          .ag-theme-alpine button:focus-visible {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
          }
          /* Template dropdown button styling - match AG Grid borders */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] .border {
            border-width: 1px !important;
            border-style: solid !important;
            border-color: #e5e7eb !important;
          }
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] .bg-white {
            transition: all 0.15s ease !important;
          }
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] .bg-white:hover {
            border-color: #d1d5db !important;
          }
          /* Ensure checkbox column doesn't have scrollbars */
          .ag-theme-alpine .ag-cell[col-id="selected"] {
            overflow: hidden !important;
          }
          .ag-theme-alpine .ag-cell[col-id="selected"]::-webkit-scrollbar {
            display: none !important;
          }
          
          /* Prevent internal scrollbars in cells */
          .ag-theme-alpine .ag-cell {
            overflow: hidden !important;
          }
          
          /* Allow tooltips to overflow from cells */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] {
            overflow: visible !important;
          }
          .ag-theme-alpine .ag-cell::-webkit-scrollbar {
            display: none !important;
          }
          .ag-theme-alpine .ag-cell {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
          
          /* Ensure proper column sizing */
          .ag-theme-alpine .ag-header-cell {
            overflow: hidden !important;
          }
          
          /* Fix template column layout */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] {
            min-width: 150px !important;
            max-width: 200px !important;
            position: relative !important;
            overflow: visible !important;
          }
          
          /* Ensure tooltips appear above AG Grid */
          .ag-theme-alpine [data-radix-popper-content-wrapper] {
            z-index: 9999 !important;
            position: relative !important;
          }
          

          
          /* Ensure template column scrolls with table */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] .select-trigger {
            position: relative !important;
            z-index: 1 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          /* Ensure dropdowns don't overflow */
          .ag-theme-alpine .ag-cell .select-trigger {
            max-width: 100% !important;
            overflow: hidden !important;
          }
          
          /* Improve overall grid appearance */
          .ag-theme-alpine {
            border: 1px solid #e5e7eb !important;
            border-radius: 8px !important;
            overflow: visible !important;
          }
          
          /* Ensure proper row heights */
          .ag-theme-alpine .ag-row {
            min-height: 48px !important;
          }
          
          /* Fix compensation model column */
          .ag-theme-alpine .ag-cell[col-id="compensationModel"] {
            min-width: 150px !important;
            max-width: 200px !important;
          }



        `}</style>


        {/* Modern Column Visibility Sidebar */}
        {isColumnSidebarOpen && (
          <div 
            className="fixed inset-0 z-50 flex"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsColumnSidebarOpen(false);
              }
            }}
            tabIndex={-1}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-25" 
              onClick={() => setIsColumnSidebarOpen(false)}
            />
            
            {/* Sidebar */}
            <div className="relative ml-auto w-80 bg-white shadow-xl h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Column Manager</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsColumnSidebarOpen(false)}
                  className="p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-6">
                  {/* View Management */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Saved Views</div>
                    <div className="flex gap-2 mb-3">
                      <select 
                        value={activeColumnView} 
                        onChange={(e) => {
                          const viewName = e.target.value;
                          setActiveColumnView(viewName);
                          if (savedViews[viewName]) {
                            updateColumnOrder(savedViews[viewName].columnOrder);
                            updateColumnVisibility(savedViews[viewName].columnVisibility);
                          }
                        }}
                        className="flex-1 text-sm border rounded px-2 py-1"
                      >
                        <option value="default">Default View</option>
                        {Object.keys(savedViews).map(viewName => (
                          <option key={viewName} value={viewName}>{viewName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const viewName = prompt('Enter view name:');
                          if (viewName && viewName.trim()) {
                            createSavedView(viewName.trim(), {
                              columnVisibility: columnPreferences?.columnVisibility || {},
                              columnOrder,
                              columnPinning: columnPreferences?.columnPinning || {}
                            });
                          }
                        }}
                        className="flex-1 text-xs"
                      >
                        Save View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // This would open a more advanced arrangement dialog
                          // For now, just show a message
                          alert('Advanced arrangement features coming soon!');
                        }}
                        className="flex-1 text-xs"
                      >
                        Arrange...
                      </Button>
                    </div>
                  </div>

                  {/* Column Pinning */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Column Pinning</div>
                    <div className="flex gap-2 pb-3 border-b">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          updateColumnPinning({ left: [], right: [] });
                        }}
                        className="flex-1 text-xs"
                      >
                        Unpin All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Pin first 2 columns to left by default
                          const firstTwoColumns = columnOrder.slice(0, 2);
                          updateColumnPinning({ left: firstTwoColumns, right: [] });
                        }}
                        className="flex-1 text-xs"
                      >
                        Pin First 2
                      </Button>
                    </div>
                    
                    {/* Show pinned columns summary */}
                    {((columnPreferences?.columnPinning?.left || []).length > 0 || (columnPreferences?.columnPinning?.right || []).length > 0) && (
                      <div className="text-xs text-gray-600 mb-3">
                        {(columnPreferences?.columnPinning?.left || []).length > 0 && (
                          <div>Left: {(columnPreferences?.columnPinning?.left || []).join(', ')}</div>
                        )}
                        {(columnPreferences?.columnPinning?.right || []).length > 0 && (
                          <div>Right: {(columnPreferences?.columnPinning?.right || []).join(', ')}</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Column Visibility */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Column Visibility</div>
                    <div className="flex gap-2 pb-3 border-b">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allVisible = columnOrder.reduce((acc, field) => {
                            acc[field] = true;
                            return acc;
                          }, {} as Record<string, boolean>);
                          updateColumnVisibility(allVisible);
                        }}
                        className="flex-1 text-xs"
                      >
                        Show All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const allHidden = columnOrder.reduce((acc, field) => {
                            acc[field] = false; // Hide all columns
                            return acc;
                          }, {} as Record<string, boolean>);
                          updateColumnVisibility(allHidden);
                        }}
                        className="flex-1 text-xs"
                      >
                        Hide All
                      </Button>
                    </div>
                  </div>

                  {/* Column Reordering */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Column Order</div>
                    <div className="text-xs text-gray-500 mb-3">Drag to reorder columns. Click eye to show/hide.</div>
                    <div className="space-y-1">
                      {columnOrder.map((field, index) => {
                        const colDef = baseColumns.find((col: any) => col.field === field);
                        if (!colDef) return null;
                        
                        return (
                          <div
                            key={field}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString());
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                              const hoverIndex = index;
                              
                              if (dragIndex !== hoverIndex) {
                                const newOrder = [...columnOrder];
                                const draggedItem = newOrder[dragIndex];
                                newOrder.splice(dragIndex, 1);
                                newOrder.splice(hoverIndex, 0, draggedItem);
                                updateColumnOrder(newOrder);
                              }
                            }}
                          >
                            {/* Drag Handle */}
                            <svg className="w-4 h-4 text-gray-400 cursor-move" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                            </svg>
                            
                            {/* Visibility Toggle */}
                            <button
                              onClick={() => {
                                const newVisibility = { ...columnPreferences?.columnVisibility };
                                newVisibility[field] = !newVisibility[field];
                                updateColumnVisibility(newVisibility);
                              }}
                              className="p-1 rounded text-gray-600 hover:text-blue-600"
                            >
                              {hiddenColumns.has(field) ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M18.364 18.364l-9.9-9.9" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              )}
                            </button>
                            
                            {/* Pin/Unpin Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                const currentPinning = columnPreferences?.columnPinning || { left: [], right: [] };
                                const leftPinned = currentPinning.left || [];
                                const rightPinned = currentPinning.right || [];
                                
                                const isLeftPinned = leftPinned.includes(field);
                                const isRightPinned = rightPinned.includes(field);
                                
                                if (e.shiftKey) {
                                  // Shift+Click: Pin to right or unpin from right
                                  if (isRightPinned) {
                                    updateColumnPinning({
                                      left: leftPinned,
                                      right: rightPinned.filter(f => f !== field)
                                    });
                                  } else {
                                    updateColumnPinning({
                                      left: leftPinned.filter(f => f !== field),
                                      right: [...rightPinned, field]
                                    });
                                  }
                                } else {
                                  // Regular click: Pin to left or unpin from left
                                  if (isLeftPinned) {
                                    updateColumnPinning({
                                      left: leftPinned.filter(f => f !== field),
                                      right: rightPinned
                                    });
                                  } else {
                                    updateColumnPinning({
                                      left: [...leftPinned, field],
                                      right: rightPinned.filter(f => f !== field)
                                    });
                                  }
                                }
                              }}
                              className={`p-1 rounded transition-colors ${
                                (columnPreferences?.columnPinning?.left || []).includes(field) || 
                                (columnPreferences?.columnPinning?.right || []).includes(field)
                                  ? 'text-blue-600 hover:text-blue-800 bg-blue-50' 
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              title={
                                (columnPreferences?.columnPinning?.left || []).includes(field) 
                                  ? 'Click to unpin from left' 
                                  : (columnPreferences?.columnPinning?.right || []).includes(field)
                                  ? 'Click to unpin from right'
                                  : 'Click to pin left • Shift+click to pin right'
                              }
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                            </button>

                            {/* Column Name */}
                            <span className={`flex-1 text-sm ${field === 'name' ? 'text-gray-700' : 'text-gray-700'}`}>
                              {colDef.headerName}
                              {(columnPreferences?.columnPinning?.left || []).includes(field) && <span className="text-xs text-blue-600 ml-1">(pinned left)</span>}
                              {(columnPreferences?.columnPinning?.right || []).includes(field) && <span className="text-xs text-blue-600 ml-1">(pinned right)</span>}
                              {field.toLowerCase().includes('fte') && <span className="text-xs text-blue-500 ml-1">FTE</span>}
                            </span>
                            
                            {/* Move Buttons */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  if (index > 0) {
                                    const newOrder = [...columnOrder];
                                    [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                    updateColumnOrder(newOrder);
                                  }
                                }}
                                disabled={index === 0}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <button
                                onClick={() => {
                                  if (index < columnOrder.length - 1) {
                                    const newOrder = [...columnOrder];
                                    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                    updateColumnOrder(newOrder);
                                  }
                                }}
                                disabled={index === columnOrder.length - 1}
                                className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    {columnOrder.length - hiddenColumns.size} of {columnOrder.length} columns visible
                  </div>
                  <Button
                    onClick={() => {
                      // Close the sidebar and ensure preferences are saved
                      setIsColumnSidebarOpen(false);
                      // Show success message
                      showSuccess('Column preferences saved successfully!');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
                    title="Close column manager (Esc)"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contract Preview Modal */}
        <ContractPreviewModal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          template={selectedTemplate}
          providers={providers}
          selectedProviderIds={selectedProviderIds}
          onGenerate={handlePreviewGenerate}
          onBulkGenerate={handleBulkGenerate}
          getAssignedTemplate={getAssignedTemplate}
        />



        {/* Professional Bulk Template Assignment Modal */}
        {bulkAssignmentModalOpen && (
          <Dialog open={bulkAssignmentModalOpen} onOpenChange={(open) => {
            setBulkAssignmentModalOpen(open);
            // Reset modal filters when modal closes to prevent affecting main page
            if (!open) {
              setModalSelectedSpecialty("__ALL__");
              setModalSelectedSubspecialty("__ALL__");
              setModalSelectedProviderType("__ALL__");
              setModalSelectedAdminRole("__ALL__");
              setModalSelectedCompModel("__ALL__");
              setSelectedTemplateForFiltered("");
            }
          }}>
            <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] flex flex-col bg-gray-50">
              <DialogHeader className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-base font-semibold text-gray-900">
                      Bulk Template Assignment
                    </DialogTitle>
                    <DialogDescription className="text-sm text-gray-600 mt-0.5">
                      {selectedProviderIds.length} providers selected
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {(modalSelectedSpecialty !== "__ALL__" || modalSelectedSubspecialty !== "__ALL__" || modalSelectedProviderType !== "__ALL__" || modalSelectedAdminRole !== "__ALL__" || modalSelectedCompModel !== "__ALL__") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setModalSelectedSpecialty("__ALL__");
                          setModalSelectedSubspecialty("__ALL__");
                          setModalSelectedProviderType("__ALL__");
                          setModalSelectedAdminRole("__ALL__");
                          setModalSelectedCompModel("__ALL__");
                          setSelectedTemplateForFiltered("");
                        }}
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 border-gray-200 h-7 px-3"
                      >
                        Reset Filters
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        selectedProviderIds.forEach(providerId => {
                          updateProviderTemplate(providerId, null);
                        });
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-7 px-3"
                    >
                      Clear All
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex flex-1 min-h-0 gap-2 p-2">
                {/* Left Panel - Filters and Assignment */}
                <div className="w-2/5 bg-white rounded border border-gray-200 flex flex-col">
                  <div className="flex-shrink-0 p-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Filters & Assignment
                    </h3>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {/* Filters Section */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">Filter Providers</h4>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Specialty</label>
                            <Select value={modalSelectedSpecialty} onValueChange={(value) => {
                              setModalSelectedSpecialty(value);
                              // Reset subspecialty when specialty changes
                              setModalSelectedSubspecialty("__ALL__");
                            }}>
                              <SelectTrigger className="w-full h-7 text-xs">
                                <SelectValue placeholder="All Specialties" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__ALL__">All Specialties</SelectItem>
                                {[...new Set(providers.filter(p => selectedProviderIds.includes(p.id)).map(p => p.specialty))].sort().map(specialty => (
                                  <SelectItem key={specialty} value={specialty}>
                                    {specialty}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Subspecialty</label>
                            <Select value={modalSelectedSubspecialty} onValueChange={setModalSelectedSubspecialty}>
                              <SelectTrigger className="w-full h-7 text-xs">
                                <SelectValue placeholder="All Subspecialties" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__ALL__">All Subspecialties</SelectItem>
                                {modalSelectedSpecialty !== "__ALL__" 
                                  ? [...new Set(providers
                                      .filter(p => selectedProviderIds.includes(p.id) && p.specialty === modalSelectedSpecialty)
                                      .map(p => p.subspecialty)
                                      .filter(Boolean))].sort().map(subspecialty => (
                                    <SelectItem key={subspecialty} value={subspecialty}>
                                      {subspecialty}
                                    </SelectItem>
                                  ))
                                  : [...new Set(providers
                                      .filter(p => selectedProviderIds.includes(p.id))
                                      .map(p => p.subspecialty)
                                      .filter(Boolean))].sort().map(subspecialty => (
                                    <SelectItem key={subspecialty} value={subspecialty}>
                                      {subspecialty}
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Provider Type</label>
                            <Select value={modalSelectedProviderType} onValueChange={setModalSelectedProviderType}>
                              <SelectTrigger className="w-full h-7 text-xs">
                                <SelectValue placeholder="All Types" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__ALL__">All Types</SelectItem>
                                {[...new Set(providers.filter(p => selectedProviderIds.includes(p.id)).map(p => p.providerType))].sort().map(providerType => (
                                  <SelectItem key={providerType} value={providerType}>
                                    {providerType}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-0.5">Admin Role</label>
                            <Select value={modalSelectedAdminRole} onValueChange={setModalSelectedAdminRole}>
                              <SelectTrigger className="w-full h-7 text-xs">
                                <SelectValue placeholder="All Roles" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__ALL__">All Roles</SelectItem>
                                <SelectItem value="Department Chair">Department Chair</SelectItem>
                                <SelectItem value="Division Chief">Division Chief</SelectItem>
                                <SelectItem value="Medical Director">Medical Director</SelectItem>
                                <SelectItem value="None">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Compensation Model</label>
                          <Select value={modalSelectedCompModel} onValueChange={setModalSelectedCompModel}>
                            <SelectTrigger className="w-full h-7 text-xs">
                              <SelectValue placeholder="All Models" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__ALL__">All Models</SelectItem>
                              <SelectItem value="Base">Base</SelectItem>
                              <SelectItem value="Productivity">Productivity</SelectItem>
                              <SelectItem value="Hybrid">Hybrid</SelectItem>
                              <SelectItem value="Hospitalist">Hospitalist</SelectItem>
                              <SelectItem value="Leadership">Leadership</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    
                    {/* Template Assignment Section */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">Assign Template</h4>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-0.5">Template to Assign</label>
                          <Select value={selectedTemplateForFiltered} onValueChange={setSelectedTemplateForFiltered}>
                            <SelectTrigger className="w-full h-7 text-xs">
                              <SelectValue>
                                {selectedTemplateForFiltered ? (
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="truncate text-xs" title={templates.find(t => t.id === selectedTemplateForFiltered)?.name}>
                                      {templates.find(t => t.id === selectedTemplateForFiltered)?.name}
                                    </span>
                                    <span className="text-xs text-gray-500 flex-shrink-0">
                                      ({templates.find(t => t.id === selectedTemplateForFiltered)?.compensationModel})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-gray-500">Select template...</span>
                                )}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent className="max-w-md">
                              {templates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  <div className="flex items-center gap-2 py-0.5 min-w-0">
                                    <span className="text-sm font-medium truncate" title={template.name}>
                                      {template.name}
                                    </span>
                                    <span className="text-xs text-gray-500 flex-shrink-0">({template.compensationModel})</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons - Outside scrollable container */}
                  <div className="flex-shrink-0 p-3 border-t border-gray-200">
                    {/* Progress indicator */}
                    {bulkAssignmentLoading && bulkAssignmentProgress && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Processing assignments...</span>
                          <span>{bulkAssignmentProgress.completed}/{bulkAssignmentProgress.total}</span>
                        </div>
                        <Progress 
                          value={(bulkAssignmentProgress.completed / bulkAssignmentProgress.total) * 100} 
                          className="h-2"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-1 h-7 text-xs"
                        onClick={clearFilteredAssignments}
                        disabled={filteredProvidersCount === 0 || bulkAssignmentLoading}
                      >
                        {bulkAssignmentLoading ? (
                          <div className="flex items-center gap-1">
                            <LoadingSpinner size="sm" color="gray" inline />
                            <span>Clearing...</span>
                          </div>
                        ) : (
                          'Clear Filtered'
                        )}
                      </Button>
                      <Button 
                        className="flex-1 h-7 text-xs bg-blue-600 hover:bg-blue-700"
                        onClick={() => assignTemplateToFiltered(selectedTemplateForFiltered)}
                        disabled={filteredProvidersCount === 0 || !selectedTemplateForFiltered || bulkAssignmentLoading}
                      >
                        {bulkAssignmentLoading ? (
                          <div className="flex items-center gap-1">
                            <LoadingSpinner size="sm" color="white" inline />
                            <span>Assigning...</span>
                          </div>
                        ) : (
                          'Assign Template'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Right Panel - Provider List */}
                <div className="w-3/5 bg-white rounded border border-gray-200 flex flex-col">
                  <div className="flex-shrink-0 p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          Provider List
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {getFilteredProviderIds.length} providers match filters
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input 
                          placeholder="Search providers..." 
                          className="w-56 h-7 text-xs"
                          onChange={(e) => {
                            // Add search functionality here
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Provider List */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {/* Always show only filtered providers when filters are active */}
                      {getFilteredProviderIds.slice(0, 100).map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        const currentTemplate = templates.find(t => t.id === templateAssignments[providerId]);
                        
                        if (!provider) return null;
                        
                        return (
                          <div key={providerId} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-gray-900 truncate text-sm">{provider.name}</h4>
                                  <p className="text-xs text-gray-500 truncate">
                                    {provider.specialty} • {provider.providerType}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0 ml-3">
                              <Select
                                value={templateAssignments[providerId] || 'no-template'}
                                onValueChange={(templateId) => {
                                  if (templateId && templateId !== 'no-template') {
                                    updateProviderTemplate(providerId, templateId);
                                  } else {
                                    updateProviderTemplate(providerId, null);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-full min-w-0 h-7 text-xs">
                                  <SelectValue>
                                    {currentTemplate ? (
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="truncate text-xs" title={currentTemplate.name}>
                                          {currentTemplate.name}
                                        </span>
                                        <span className="text-xs text-gray-500 flex-shrink-0">({currentTemplate.compensationModel})</span>
                                      </div>
                                    ) : (
                                      <span className="text-xs text-gray-500">No template</span>
                                    )}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="max-w-md">
                                  <SelectItem value="no-template">
                                    <span className="text-sm text-gray-500">No template</span>
                                  </SelectItem>
                                  {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                      <div className="flex items-center gap-2 py-0.5 min-w-0">
                                        <span className="text-sm font-medium truncate" title={template.name}>
                                          {template.name}
                                        </span>
                                        <span className="text-xs text-gray-500 flex-shrink-0">({template.compensationModel})</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Show message when no providers match filters */}
                      {getFilteredProviderIds.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm font-medium">No providers match the current filters</p>
                          <p className="text-xs">Try adjusting your filter criteria</p>
                        </div>
                      )}
                      
                      {/* Show pagination message */}
                      {getFilteredProviderIds.length > 100 && (
                        <div className="text-center py-2 text-xs text-gray-500">
                          Showing first 100 of {getFilteredProviderIds.length} providers
                          {filteredProvidersCount !== selectedProviderIds.length && (
                            <span className="ml-2 text-blue-600">
                              (filtered from {selectedProviderIds.length} total)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-2">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setBulkAssignmentModalOpen(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                  <Button onClick={() => setBulkAssignmentModalOpen(false)} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs">
                    Apply Assignments
                  </Button>
                  <Button 
                    onClick={async () => {
                      // Check if all selected providers have templates assigned
                      const providersWithoutTemplates = selectedProviderIds
                        .map(id => providers.find(p => p.id === id))
                        .filter(provider => provider && !getAssignedTemplate(provider));
                      
                      if (providersWithoutTemplates.length > 0) {
                        // Close the modal and show template error
                        setBulkAssignmentModalOpen(false);
                        setTemplateErrorModalOpen(true);
                        return;
                      }
                      
                      // Close the modal first
                      setBulkAssignmentModalOpen(false);
                      // Then trigger modal-specific bulk generation
                      await handleModalBulkGenerate();
                    }} 
                    className="bg-green-600 hover:bg-green-700 h-7 text-xs"
                    disabled={selectedProviderIds.length === 0}
                  >
                    Generate Contracts
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}


        {/* Same Template Assignment Modal */}
        {sameTemplateModalOpen && (
          <Dialog open={sameTemplateModalOpen} onOpenChange={setSameTemplateModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Assign Same Template to All Selected</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Select a template to assign to all {selectedProviderIds.length} selected providers:
                </div>
                
                <Select
                  value=""
                  onValueChange={(templateId) => {
                    if (templateId) {
                      // Assign template to all selected providers
                      const newAssignments = { ...templateAssignments };
                      selectedProviderIds.forEach(providerId => {
                        newAssignments[providerId] = templateId;
                      });
                      setTemplateAssignments(newAssignments);
                      setSessionTemplateAssignments(newAssignments);
                      setSameTemplateModalOpen(false);
                      showSuccess(`Template assigned to ${selectedProviderIds.length} providers`);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter((template: any) => template && template.id && template.id.trim() !== '' && template.name)
                      .map((template: any) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate max-w-[300px]" title={template.name}>
                              {template.name}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">(v{template.version || '1'})</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setSameTemplateModalOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Template Selection Error Modal */}
        {templateErrorModalOpen && (
          <Dialog open={templateErrorModalOpen} onOpenChange={setTemplateErrorModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Template Required
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="text-sm text-gray-600">
                  Please select a template before generating contracts. You can either:
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <strong>Option 1:</strong> Use the "Same Template (All)" dropdown to assign one template to all selected providers
                  </div>
                  <div className="text-sm">
                    <strong>Option 2:</strong> Use "Different Templates" to assign specific templates to each provider individually
                  </div>
                  <div className="text-sm">
                    <strong>Option 3:</strong> Assign templates using the dropdown in each provider row
                  </div>
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setTemplateErrorModalOpen(false)}
                  >
                    OK
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Bottom Action Banner */}
        {selectedProviderIds.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom-2 duration-200">
            <div className="bg-white border-t border-gray-200 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  {/* Left side - Selection and Status */}
                  <div className="flex items-center gap-6">
                    {/* Selection Count */}
                    <div className="flex items-center gap-2" title={`${selectedProviderIds.length} providers selected`}>
                      <CheckSquare className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">{selectedProviderIds.length}</span>
                      <span className="text-gray-600">selected</span>
                    </div>
                    
                    {/* Assignment Status */}
                    {selectedProviderIds.length > 0 && (() => {
                      const assignedCount = selectedProviderIds.filter(id => {
                        const provider = providers.find(p => p.id === id);
                        return provider && getAssignedTemplate(provider);
                      }).length;
                      
                      return (
                        <div className="flex items-center gap-2" title={`${assignedCount} templates assigned`}>
                          {assignedCount === selectedProviderIds.length ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : assignedCount > 0 ? (
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium">{assignedCount}</span>
                          <span className="text-gray-600">assigned</span>
                          {statusTab === 'notGenerated' && Object.keys(sessionTemplateAssignments).length > 0 && (
                            <span className="text-xs text-gray-400">• restored</span>
                          )}
                        </div>
                      );
                    })()}
                    
                    {/* Session Management */}
                    {selectedProviderIds.length > 0 && (Object.keys(sessionTemplateAssignments).length > 0 || Object.keys(templateAssignments).length > 0) && (
                      <div className="relative">
                        <Select
                          value=""
                          onValueChange={(option) => {
                            if (option === 'clear-session') {
                              setSessionTemplateAssignments({});
                              sessionRestoredRef.current = false;
                              showSuccess('Session assignments cleared');
                            } else if (option === 'clear-all') {
                              setTemplateAssignments({});
                              setSessionTemplateAssignments({});
                              sessionRestoredRef.current = false;
                              showSuccess('All template assignments cleared');
                            } else if (option === 'save-to-session') {
                              setSessionTemplateAssignments(templateAssignments);
                              showSuccess('Current assignments saved to session');
                            }
                          }}
                        >
                          <SelectTrigger 
                            className="h-7 px-2 text-gray-900 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors"
                            title="Session management options"
                          >
                            <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="save-to-session">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                                <span className="text-gray-900">Save to Session</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="clear-session">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="text-gray-900">Clear Session Only</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="clear-all">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-gray-900">Clear All Assignments</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Center - Quick Assign */}
                  {selectedProviderIds.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Quick:</span>
                      <Select
                        value=""
                        onValueChange={(option) => {
                          setShowAssignmentHint(false); // Hide hint when user interacts
                          if (option === 'same-template') {
                            setSameTemplateModalOpen(true);
                          } else if (option === 'bulk-different') {
                            setBulkAssignmentModalOpen(true);
                          }
                        }}
                      >
                        <SelectTrigger 
                          className={`w-48 h-7 text-gray-900 transition-all duration-300 ${
                            showAssignmentHint && selectedProviderIds.length > 0 
                              ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50 border-blue-300 shadow-sm' 
                              : ''
                          }`}
                          title="Assignment Options:\nSame Template: Assign one template to all selected providers\nDifferent Templates: Choose different templates for each provider"
                        >
                          <SelectValue placeholder="Choose assignment..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="same-template">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900">Same Template (All)</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="bulk-different">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-900">Different Templates</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Right side - Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleBulkGenerate}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      size="sm"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Create
                    </Button>
                    
                    {(() => {
                      const assignedCount = selectedProviderIds.filter(id => {
                        const provider = providers.find(p => p.id === id);
                        return provider && getAssignedTemplate(provider);
                      }).length;
                      
                      return assignedCount > 0 ? (
                        <Button
                          onClick={clearTemplateAssignments}
                          variant="outline"
                          className="text-gray-900 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
                          size="sm"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Clear ({assignedCount})
                        </Button>
                      ) : null;
                    })()}
                    
                    <Button
                      onClick={() => setSelectedProviderIds([])}
                      variant="outline"
                      className="text-gray-900 hover:text-gray-700 hover:bg-gray-50 border-gray-300"
                      size="sm"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear Selection
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions Modal */}
        {instructionsModalOpen && (
          <Dialog open={instructionsModalOpen} onOpenChange={setInstructionsModalOpen}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
              <DialogHeader className="flex-shrink-0 pb-4 border-b border-gray-200">
                <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Contract Generation Instructions
                </DialogTitle>
                <DialogDescription className="text-gray-600">
                  Complete guide to using the contract generation system
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Quick Start */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">🚀 Quick Start</h3>
                  <ol className="text-sm text-blue-800 space-y-1">
                    <li>1. Select providers using checkboxes or "All Filtered" button (selects all 1000+ providers)</li>
                    <li>2. Assign templates using individual dropdowns or bulk actions</li>
                    <li>3. Click "Create Selected" to generate contracts</li>
                    <li>4. Download individual files or bulk ZIP archive</li>
                  </ol>
                </div>

                {/* Template Assignment */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Template Assignment Methods
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Individual Assignment</h4>
                      <p className="text-sm text-gray-600 mb-3">Assign different templates to each provider</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• Use dropdown in each provider row</p>
                        <p>• Perfect for custom assignments</p>
                        <p>• Changes saved automatically</p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Bulk Assignment</h4>
                      <p className="text-sm text-gray-600 mb-3">Assign templates to multiple providers at once</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>• Select providers → "Same Template (All)"</p>
                        <p>• Or "Different Templates" for individual control</p>
                        <p>• Use bulk assignment modal for complex scenarios</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workflow Options */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Workflow Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Single Contract</h4>
                      <p className="text-sm text-gray-600">Generate one contract at a time</p>
                      <div className="text-xs text-gray-500 mt-2">
                        <p>• Right-click provider → "Generate"</p>
                        <p>• Immediate download</p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Bulk Generation</h4>
                      <p className="text-sm text-gray-600">Generate multiple contracts</p>
                      <div className="text-xs text-gray-500 mt-2">
                        <p>• Select multiple providers</p>
                        <p>• Download as ZIP archive</p>
                      </div>
                    </div>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Session Management</h4>
                      <p className="text-sm text-gray-600">Temporary template assignments</p>
                      <div className="text-xs text-gray-500 mt-2">
                        <p>• Persists during tab navigation</p>
                        <p>• Clear with "Complete Reset"</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keyboard Shortcuts */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Keyboard Shortcuts
                  </h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Reset Operations</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Complete Reset:</span>
                            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl+R</kbd>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Session Only:</span>
                            <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl+Shift+R</kbd>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tab Navigation:</span>
                            <span className="text-gray-500 text-xs">Click tabs</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Row Selection:</span>
                            <span className="text-gray-500 text-xs">Click rows</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tips & Best Practices */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Tips & Best Practices
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <ul className="text-sm text-amber-800 space-y-2">
                      <li>• <strong>Filter first:</strong> Use specialty/subspecialty filters to narrow down providers</li>
                      <li>• <strong>Bulk assign:</strong> Use "Same Template (All)" for efficiency when possible</li>
                      <li>• <strong>Session persistence:</strong> Template assignments are saved during tab navigation</li>
                      <li>• <strong>Check status:</strong> Use the "Processed" tab to see generated contracts</li>
                      <li>• <strong>Bulk download:</strong> Use ZIP archives for multiple contracts</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-200">
                <Button onClick={() => setInstructionsModalOpen(false)}>
                  Got it, thanks!
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Clear Confirmation Dialog */}
        <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Clear All Processed Contracts
              </DialogTitle>
            </DialogHeader>
            <p className="text-gray-600 mb-4">
              Are you sure you want to permanently delete ALL {contractsToClear.length} processed contracts (including Success, Partial Success, and Failed) from the database? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmClearContracts}
                disabled={isClearing}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {isClearing ? 'Clearing...' : `Clear All ${contractsToClear.length} Contracts`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Progress Modal for Clearing Contracts */}
        <ProgressModal
          isOpen={isClearing}
          title="Clearing Processed Contracts"
          progress={clearingProgress}
          message={
            clearingProgress < 30 
              ? 'Fetching all contracts from database...' 
              : clearingProgress < 100 
                ? 'Deleting contracts from database...' 
                : 'Finishing up...'
          }
        />

        {/* Progress Modal for Bulk Generation */}
        <ProgressModal
          isOpen={progressModalOpen}
          title="Bulk Contract Generation"
          progress={progressData.progress}
          message={progressData.currentOperation}
        />



      </div>
    </div>
  );
} 