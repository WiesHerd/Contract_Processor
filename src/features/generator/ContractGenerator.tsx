import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FileDown, Loader2, Info, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, CheckSquare, Square, Search, Eye, RotateCcw, X, Trash2, FolderOpen, Download, Upload, Users, TestTube, Database, Plus } from 'lucide-react';
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

import { getContractFileName } from '@/utils/filename';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import { v4 as uuidv4 } from 'uuid';
import { PageHeader } from '@/components/PageHeader';
import { fetchClausesIfNeeded } from '@/store/slices/clauseSlice';
import { fetchTemplatesIfNeeded } from '@/features/templates/templatesSlice';
import { fetchProvidersIfNeeded } from '@/store/slices/providerSlice';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type { AppDispatch } from '@/store';
import { normalizeSmartQuotes, formatCurrency, formatNumber, formatDate } from '@/utils/formattingUtils';
import { useTemplateAssignment } from './hooks/useTemplateAssignment';
import { useMultiSelect } from './hooks/useMultiSelect';
import { useContractGeneration } from './hooks/useContractGeneration';
import { useBulkGeneration } from './hooks/useBulkGeneration';
import { useGeneratorEvents } from './hooks/useGeneratorEvents';
import { useGeneratorStatus } from './hooks/useGeneratorStatus';
import { useGeneratorUI } from './hooks/useGeneratorUI';
import { useGeneratorDataManagement } from './hooks/useGeneratorDataManagement';
import { useGeneratorGrid } from './hooks/useGeneratorGrid';
import { useGeneratorRendering } from './hooks/useGeneratorRendering';


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
import { saveDocxFile, saveMultipleFilesAsZip } from '@/utils/fileUtils';
import { Progress } from '@/components/ui/progress';
import { Clause } from '@/types/clause';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ContractPreviewModal from './components/ContractPreviewModal';
import { ContractProgressChart } from '@/components/ui/ContractProgressChart';
import { useContractProgress } from './hooks/useContractProgress';



// Default column preferences for fallback
const defaultColumnPreferences = {
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  savedViews: {},
  activeView: 'default',
  displaySettings: {
    pageSize: 20,
    showTooltips: true,
  },
};
import { useGeneratorPreferences } from '@/hooks/useGeneratorPreferences';
import { useLegacyNotifications } from '@/components/ui/enterprise-notifications';
import ProgressModal from '@/components/ui/ProgressModal';
import { useYear } from '@/contexts/YearContext';
import { fetchProvidersByYear } from '@/store/slices/providerSlice';


ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowSelectionModule,
  PaginationModule,
]);

// Extend Provider type to allow dynamic column access
interface ExtendedProvider extends Provider {
  [key: string]: any;
}

// Utility functions have been extracted to @/utils/formattingUtils



export default function ContractGenerator() {
  const dispatch = useDispatch<AppDispatch>();
  const { providers, loading: providersLoading, error: providersError } = useSelector((state: RootState) => state.provider);
  const lastSync = useSelector((state: RootState) => state.provider.lastSync);
  const { templates, status: templatesStatus, error: templatesError } = useSelector((state: RootState) => state.templates);
  const { clauses, loading: clausesLoading } = useSelector((state: RootState) => state.clauses);
  const { mappings } = useSelector((state: RootState) => state.mappings);
  const selectedTemplate = useSelector((state: RootState) => state.generator.selectedTemplate);
  const selectedProvider = useSelector((state: RootState) => state.generator.selectedProvider);
  const isGenerating = useSelector((state: RootState) => state.generator.isGenerating);
  const error = useSelector((state: RootState) => state.generator.error);
  const generatedFiles = useSelector((state: RootState) => state.generator.generatedFiles);
  const { generatedContracts } = useSelector((state: RootState) => state.generator);
  const { showError, showSuccess, showWarning, showInfo } = useLegacyNotifications();
  const { 
    preferences, 
    loading: preferencesLoading, 
    updateColumnVisibility, 
    updateColumnOrder, 
    updateColumnPinning, 
    createSavedView, 
    setActiveView, 
    deleteSavedView, 
    updateDisplaySettings 
  } = useGeneratorPreferences();
  const { selectedYear } = useYear();

  // Loading state for better UX
  const [isHydratingContracts, setIsHydratingContracts] = useState(false);

  // Load providers for the selected year with smart caching
  useEffect(() => {
    if (selectedYear) {
      console.log('🔄 ContractGenerator: Loading providers for year:', selectedYear);
      
      // Check if we already have providers for this year and they're recent (within 5 minutes)
      const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
      const now = new Date().getTime();
      const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
      const isCacheValid = providers.length > 0 && (now - lastSyncTime < CACHE_DURATION_MS);
      
      if (isCacheValid) {
        console.log('✅ ContractGenerator: Using cached providers (', providers.length, 'providers, last sync:', lastSync, ')');
      } else {
        console.log('🔄 ContractGenerator: Cache expired or empty, fetching fresh providers');
        dispatch(fetchProvidersByYear(selectedYear));
      }
    }
  }, [dispatch, selectedYear, providers.length, lastSync]);

  // Smart contract hydration with proper sequencing
  useEffect(() => {
    console.log('🔄 ContractGenerator: Hydration effect triggered', {
      selectedYear,
      providersLength: providers.length,
      providersLoading,
      isHydratingContracts
    });
    
    if (selectedYear && providers.length > 0 && !providersLoading && !isHydratingContracts) {
      console.log('🔄 ContractGenerator: Providers loaded, hydrating contracts...');
      setIsHydratingContracts(true);
      
      // Use a longer delay to ensure providers are fully processed
      const timer = setTimeout(async () => {
        try {
          await hydrateGeneratedContracts();
        } finally {
          setIsHydratingContracts(false);
        }
      }, 2000); // Increased from 1000ms to 2000ms
      
      return () => clearTimeout(timer);
    }
  }, [selectedYear, providers.length, providersLoading, isHydratingContracts]); // Removed generatedContracts.length to prevent loops

  // Multi-select state will be managed by the hook
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
  const [selectedFTE, setSelectedFTE] = useState<[number, number]>([0, 2]);
  const [selectedProviderTypeFilter, setSelectedProviderTypeFilter] = useState("__ALL__");
  
  // Modal-specific filter state (separate from main page)
  const [modalSelectedSpecialty, setModalSelectedSpecialty] = useState("__ALL__");
  const [modalSelectedSubspecialty, setModalSelectedSubspecialty] = useState("__ALL__");
  const [modalSelectedProviderType, setModalSelectedProviderType] = useState("__ALL__");
  const [modalSelectedAdminRole, setModalSelectedAdminRole] = useState("__ALL__");
  const [modalSelectedCompModel, setModalSelectedCompModel] = useState("__ALL__");
  const [selectedTemplateForFiltered, setSelectedTemplateForFiltered] = useState<string>("");
  const [bulkOpen, setBulkOpen] = useState(true);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [showAssignedProviders, setShowAssignedProviders] = useState(true);

  const [statusTab, setStatusTab] = useState<'notGenerated' | 'processed' | 'all'>('notGenerated');
  const [isColumnSidebarOpen, setIsColumnSidebarOpen] = useState(false);
  const [createViewModalOpen, setCreateViewModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  
  // Debug Redux state - DISABLED to prevent infinite loop
  // console.log('🔍 Redux State Debug:', {
  //   generatedContractsCount: generatedContracts.length,
  //   generatedContracts: generatedContracts,
  //   statusTab
  // });

  // Create a temporary gridRef that will be updated by useGeneratorGrid
  const tempGridRef = useRef<any>(null);

  // Multi-select hook - must be called early to provide selectedProviderIds to other hooks
  const {
    selectedProviderIds,
    allProviderIds,
    allSelected,
    someSelected,
    unprocessedCount,
    processedCount,
    totalFilteredCount,
    completionRate,
    toggleSelectAll,
    toggleSelectProvider,
    setSelectedProviderIds,
    selectAllUnprocessed,
    selectNextBatch,
    selectAllInCurrentTab,
    selectAllVisible,
    clearSelection,
  } = useMultiSelect({
    providers,
    visibleRows: [], // Will be updated after visibleRows is computed
    gridRef: tempGridRef,
    allFilteredProvidersWithStatus: [], // Will be updated after computation
    notGeneratedRows: [] // Will be updated after computation
  });

  // Contract progress tracking hook
  const contractProgress = useContractProgress();

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

  // Generator UI hook - replaces all modal and UI state management
  const {
    previewModalOpen,
    setPreviewModalOpen,
    bulkAssignmentModalOpen,
    setBulkAssignmentModalOpen,
    sameTemplateModalOpen,
    setSameTemplateModalOpen,
    instructionsModalOpen,
    setInstructionsModalOpen,
    templateErrorModalOpen,
    setTemplateErrorModalOpen,
    bottomActionMenuOpen,
    setBottomActionMenuOpen,
    showDetailedView,
    setShowDetailedView,
    clickedProvider,
    setClickedProvider,
    showAssignmentHint,
    setShowAssignmentHint,
  } = useGeneratorUI();





  // Auto-hide the assignment hint after 5 seconds or when user interacts
  useEffect(() => {
    if (showAssignmentHint && selectedProviderIds.length > 0) {
      const timer = setTimeout(() => {
        setShowAssignmentHint(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showAssignmentHint, selectedProviderIds.length]);
  
  // Reset pagination when switching tabs
  useEffect(() => {
    setPageIndex(0);
  }, [statusTab]);
  
  // Template assignment hook - replaces all template assignment logic
  const {
    templateAssignments,
    bulkAssignmentLoading,
    bulkAssignmentProgress,
    getAssignedTemplate,
    updateProviderTemplate: updateProviderTemplateHook,
    assignTemplateToFiltered,
    clearFilteredAssignments,
    clearTemplateAssignments: clearTemplateAssignmentsHook,
    smartAssignTemplates,
    setTemplateAssignments,
    setBulkAssignmentLoading,
    setBulkAssignmentProgress,
  } = useTemplateAssignment({
    templates,
    providers,
    selectedProviderIds,
    selectedTemplate,
    getFilteredProviderIds: () => getFilteredProviderIds,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    generatedContracts
  });

  // Initialize template assignments with session data on mount
  useEffect(() => {
    if (Object.keys(sessionTemplateAssignments).length > 0) {
      setTemplateAssignments(sessionTemplateAssignments);
    }
  }, []); // Only run once on mount

  // Wrapper functions to handle session storage
  const updateProviderTemplate = (providerId: string, templateId: string | null) => {
    updateProviderTemplateHook(providerId, templateId);
    // Also update session storage for tab navigation persistence
    if (templateId && templateId.trim() !== '' && templateId !== 'no-template') {
      const newAssignments = { ...templateAssignments, [providerId]: templateId };
      setSessionTemplateAssignments(newAssignments);
    } else {
      const newAssignments = { ...templateAssignments };
      delete newAssignments[providerId];
      setSessionTemplateAssignments(newAssignments);
    }
  };

  const clearTemplateAssignments = () => {
    clearTemplateAssignmentsHook();
    // Also clear session storage
    setSessionTemplateAssignments({});
    // Reset notification flag
    sessionRestoredRef.current = false;
  };
  
  // Contract generation hook - replaces all contract generation logic
  const {
    downloadContract: downloadContractHook,
    generateAndDownloadDocx: generateAndDownloadDocxHook,
  } = useContractGeneration({
    templates,
    mappings,
    generatedContracts,
    selectedTemplate,
    getAssignedTemplate,
    setUserError,
    showSuccess,
    showWarning,
    showError
  });

  // Wrapper functions to maintain existing interface
  const downloadContract = async (provider: Provider, templateId: string) => {
    return downloadContractHook(provider, templateId);
  };

  const generateAndDownloadDocx = async (provider: Provider, template?: Template) => {
    const result = await generateAndDownloadDocxHook(provider, template);
    
    // If generation was successful, refresh contracts from database
    if (result && result.success) {
      await hydrateGeneratedContracts();
    }
    
    return result;
  };


  
  // Session storage for template assignments (temporary persistence during tab navigation)
  const [sessionTemplateAssignments, setSessionTemplateAssignments] = useState<Record<string, string>>({});
  
  // Track if we've shown the session restoration notification to avoid spam
  const sessionRestoredRef = useRef(false);

  // Progress update functions
  const updateProgress = useCallback((updates: Partial<typeof progressData>) => {
    setProgressData(prev => ({ ...prev, ...updates }));
  }, []);

  const initializeProgress = useCallback((totalSteps: number) => {
    const steps = [
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

  // Column management with working functionality
  const [columns, setColumns] = useState([
    { field: 'name', headerName: 'Provider Name', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'employeeId', headerName: 'Employee ID', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'providerType', headerName: 'Provider Type', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'specialty', headerName: 'Specialty', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'subspecialty', headerName: 'Subspecialty', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'administrativeRole', headerName: 'Administrative Role', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'baseSalary', headerName: 'Base Salary', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'fte', headerName: 'FTE', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'startDate', headerName: 'Start Date', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'compensationModel', headerName: 'Compensation Model', visible: true, pinned: undefined as 'left' | 'right' | undefined },
    { field: 'assignedTemplate', headerName: 'Template', visible: true, pinned: undefined as 'left' | 'right' | undefined },
  ]);

  const updateColumns = useCallback((newColumns: any[]) => {
    setColumns(newColumns);
    
    // Sync with preferences
    if (preferences && statusTab) {
      const columnVisibility = Object.fromEntries(newColumns.map(col => [col.field, col.visible]));
      const columnOrder = newColumns.map(col => col.field);
      const columnPinning = {
        left: newColumns.filter(col => col.pinned === 'left').map(col => col.field),
        right: newColumns.filter(col => col.pinned === 'right').map(col => col.field),
      };
      
      updateColumnVisibility(columnVisibility, statusTab);
      updateColumnOrder(columnOrder, statusTab);
      updateColumnPinning(columnPinning, statusTab);
    }
  }, [preferences, statusTab, updateColumnVisibility, updateColumnOrder, updateColumnPinning]);

  const agGridColumns = useMemo(() => {
    return columns.map(col => ({
      field: col.field,
      headerName: col.headerName,
      hide: !col.visible,
      pinned: col.pinned,
    }));
  }, [columns]);

  const columnOrder = useMemo(() => {
    // Filter out template column for processed tab
    // Filter out template column for all tab
    // Filter out template, generation status, and actions columns for notGenerated tab
    return columns
      .filter(col => {
        if (statusTab === 'processed' && col.field === 'assignedTemplate') {
          return false;
        }
        if (statusTab === 'all' && col.field === 'assignedTemplate') {
          return false;
        }
        if (statusTab === 'notGenerated' && (col.field === 'assignedTemplate' || col.field === 'generationStatus' || col.field === 'actions')) {
          return false;
        }
        return true;
      })
      .map(col => col.field);
  }, [columns, statusTab]);

  const hiddenColumns = useMemo(() => {
    // For processed tab, always hide the template column
    // For all tab, always hide the template column
    // For notGenerated tab, always hide template, generation status, and actions columns
    const hiddenFields = columns
      .filter(col => {
        if (!col.visible) return true;
        if (statusTab === 'processed' && col.field === 'assignedTemplate') return true;
        if (statusTab === 'all' && col.field === 'assignedTemplate') return true;
        if (statusTab === 'notGenerated' && (col.field === 'assignedTemplate' || col.field === 'generationStatus' || col.field === 'actions')) return true;
        return false;
      })
      .map(col => col.field);
    return new Set(hiddenFields);
  }, [columns, statusTab]);

  const pinnedColumns = useMemo(() => {
    return {
      left: columns.filter(col => col.pinned === 'left').map(col => col.field),
      right: columns.filter(col => col.pinned === 'right').map(col => col.field),
    };
  }, [columns]);
  

  

  


  // Load clauses with caching
  useEffect(() => {
    dispatch(fetchClausesIfNeeded());
  }, [dispatch]);

  // Load templates with caching
  useEffect(() => {
    dispatch(fetchTemplatesIfNeeded());
  }, [dispatch]);

  // Create filtered clauses for the sidebar
  const filteredClauses = clauses.filter((clause: { title: string; content: string }) =>
    clause.title.toLowerCase().includes(clauseSearch.toLowerCase()) ||
    clause.content.toLowerCase().includes(clauseSearch.toLowerCase())
  );

  // Load and apply preferences when they change
  useEffect(() => {
    if (preferences && statusTab && preferences[statusTab]) {
      const tabPreferences = preferences[statusTab];
      
      // Apply saved column visibility, order, and pinning
      if (tabPreferences.columnOrder && tabPreferences.columnOrder.length > 0) {
        const newColumns = tabPreferences.columnOrder.map(field => {
          const existingColumn = columns.find(col => col.field === field);
          return {
            field,
            headerName: existingColumn?.headerName || field,
            visible: tabPreferences.columnVisibility?.[field] ?? true,
            pinned: tabPreferences.columnPinning?.left?.includes(field) ? 'left' as const :
                   tabPreferences.columnPinning?.right?.includes(field) ? 'right' as const : undefined
          };
        });
        
        // Add any missing columns that aren't in the saved order
        columns.forEach(col => {
          if (!newColumns.find(nc => nc.field === col.field)) {
            newColumns.push({
              ...col,
              visible: tabPreferences.columnVisibility?.[col.field] ?? col.visible,
              pinned: tabPreferences.columnPinning?.left?.includes(col.field) ? 'left' as const :
                     tabPreferences.columnPinning?.right?.includes(col.field) ? 'right' as const : undefined
            });
          }
        });
        
        setColumns(newColumns);
      }
    }
  }, [preferences, statusTab, columns]);

  // REMOVED: This useEffect was causing column order to reset to default
  // The preferences system now handles default column order properly



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

  // Handle window resize for AG Grid
  useEffect(() => {
    const handleResize = () => {
      if (tempGridRef.current?.api) {
        setTimeout(() => {
          tempGridRef.current?.api.sizeColumnsToFit();
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







  // Load generated contracts on component mount - FIXED: Only run once to prevent clearing state
  useEffect(() => {
    const loadContractsFromDatabase = async () => {
      try {
        console.log('🔄 Starting to load contracts from database...');
        let allLogs: ContractGenerationLog[] = [];
        let nextToken = undefined;
        let pageCount = 0;
        
        do {
          pageCount++;
          console.log(`📄 Fetching page ${pageCount} of contract logs...`);
          const result = await ContractGenerationLogService.listLogs(undefined, 1000, nextToken);
          if (result && result.items) {
            console.log(`📄 Page ${pageCount}: Found ${result.items.length} logs`);
            allLogs = allLogs.concat(result.items);
          } else {
            console.log(`📄 Page ${pageCount}: No logs found`);
          }
          nextToken = result?.nextToken;
        } while (nextToken);
        
        console.log(`📊 Total logs found in database: ${allLogs.length}`);
        console.log('📋 Sample logs:', allLogs.slice(0, 3));
        
        // Convert all logs to GeneratedContract format and set them all at once
        const generatedContractsFromDb: GeneratedContract[] = allLogs
          .filter(log => {
            const isValid = log.providerId && log.templateId && log.status && log.generatedAt;
            if (!isValid) {
              console.log('⚠️ Skipping invalid log:', log);
            }
            return isValid;
          })
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

        console.log(`✅ Converted ${generatedContractsFromDb.length} valid contracts from database`);

        // Only update Redux state if we actually have contracts from the database
        if (generatedContractsFromDb.length > 0) {
          console.log('🔄 Loading contracts from database:', generatedContractsFromDb.length, 'contracts');
          dispatch(setGeneratedContracts(generatedContractsFromDb));
          console.log('✅ Redux state updated with contracts from database');
        } else {
          console.log('⚠️ No contracts found in database to load');
        }
        
      } catch (e) {
        // Only show error if it's not a benign 'no records found' error
        const err = e as Error;
        console.error('❌ Error loading contracts from database:', err);
        if (err && err.message && !(err.message.includes('not found') || err.message.includes('No records'))) {
          console.error('❌ Initial hydration failed:', err.message);
          showError({ message: 'Could not load contract generation status from the backend. Please try again later.', severity: 'error' });
        }
      }
    };

    loadContractsFromDatabase();
  }, [dispatch]); // Add dispatch to dependency array to ensure it's available

  // Smart contract hydration with caching and error handling
  const hydrateGeneratedContracts = React.useCallback(async () => {
    try {
      console.log('🔄 Starting smart hydration of generated contracts from database...');
      
      // Check if we're already loading to prevent duplicate requests
      if (providersLoading) {
        console.log('⏳ Providers still loading, deferring contract hydration');
        return;
      }
      
      let allLogs: ContractGenerationLog[] = [];
      let nextToken = undefined;
      let pageCount = 0;
      const maxPages = 10; // Prevent infinite loops
      
      do {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount} of contract logs...`);
        const result = await ContractGenerationLogService.listLogs(undefined, 1000, nextToken);
        if (result && result.items) {
          console.log(`📄 Page ${pageCount}: Found ${result.items.length} logs`);
          allLogs = allLogs.concat(result.items);
        } else {
          console.log(`📄 Page ${pageCount}: No logs found`);
        }
        nextToken = result?.nextToken;
      } while (nextToken && pageCount < maxPages);
      
      console.log(`📊 Found ${allLogs.length} contract logs in database`);
      
      // Convert all logs to GeneratedContract format and set them all at once
      const generatedContractsFromDb: GeneratedContract[] = allLogs
        .filter(log => {
          const isValid = log.providerId && log.templateId && log.status && log.generatedAt;
          if (!isValid) {
            console.log('⚠️ Skipping invalid log:', log);
          }
          return isValid;
        })
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

      console.log(`✅ Converted ${generatedContractsFromDb.length} valid contracts for Redux state`);
      
      // Always update Redux state with contracts from database (even if empty)
      dispatch(setGeneratedContracts(generatedContractsFromDb));
      console.log('✅ Redux state updated with contracts from database');
      // Clear any previous errors silently
    } catch (e) {
      console.error('❌ Error during hydration:', e);
      // Only show error if it's not a benign 'no records found' error
      const err = e as Error;
      if (err && err.message && (err.message.includes('not found') || err.message.includes('No records'))) {
        // treat as empty, not an error - no need to show anything
        console.log('ℹ️ No contract logs found in database (this is normal for empty state)');
      } else {
        showError({ message: 'Could not load contract generation status from the backend. Please try again later.', severity: 'error' });
      }
    }
  }, [dispatch]);

  // Optimized filtering logic with memoization
  const filteredProviders = useMemo(() => {
    return providers.filter((provider) => {
      const name = provider.name?.toLowerCase() || '';
      const specialty = (provider as any).specialty?.toLowerCase() || '';
      const searchTerm = search.toLowerCase();
      const matchesSearch = name.includes(searchTerm) || specialty.includes(searchTerm);
      const matchesSpecialty = selectedSpecialty === "__ALL__" || provider.specialty === selectedSpecialty;
      const matchesSubspecialty = selectedSubspecialty === "__ALL__" || provider.subspecialty === selectedSubspecialty;
      const matchesProviderType = selectedProviderType === "__ALL__" || provider.providerType === selectedProviderType;
      
      // FTE filter - use the same logic as the grid to ensure consistency
      const getFTEValue = (provider: any): number => {
        // Check for totalFTE first (new field), then fallback to fte (old field)
        if (provider.totalFTE !== undefined && provider.totalFTE !== null) {
          const value = Number(provider.totalFTE);
          if (!isNaN(value)) return value;
        }
        if (provider.TotalFTE !== undefined && provider.TotalFTE !== null) {
          const value = Number(provider.TotalFTE);
          if (!isNaN(value)) return value;
        }
        if (provider.fte !== undefined && provider.fte !== null) {
          const value = Number(provider.fte);
          if (!isNaN(value)) return value;
        }
        // Check dynamicFields as fallback
        if (provider.dynamicFields) {
          try {
            const dynamicFields = typeof provider.dynamicFields === 'string' 
              ? JSON.parse(provider.dynamicFields) 
              : provider.dynamicFields;
            
            if (dynamicFields.totalFTE !== undefined && dynamicFields.totalFTE !== null) {
              const value = Number(dynamicFields.totalFTE);
              if (!isNaN(value)) return value;
            }
            if (dynamicFields.TotalFTE !== undefined && dynamicFields.TotalFTE !== null) {
              const value = Number(dynamicFields.TotalFTE);
              if (!isNaN(value)) return value;
            }
            if (dynamicFields.fte !== undefined && dynamicFields.fte !== null) {
              const value = Number(dynamicFields.fte);
              if (!isNaN(value)) return value;
            }
            // Check for "Total FTE" with space
            if (dynamicFields['Total FTE'] !== undefined && dynamicFields['Total FTE'] !== null) {
              const value = Number(dynamicFields['Total FTE']);
              if (!isNaN(value)) return value;
            }
          } catch (e) {
            console.error('Error parsing dynamicFields:', e);
          }
        }
        return 0;
      };
      
      const fteValue = getFTEValue(provider);
      
      // Debug logging for FTE filtering
      if (fteValue > 0) {
        console.log('🔍 [FTE Filter Debug] Provider:', provider.name, 'FTE:', fteValue, 'Range:', selectedFTE, 'Matches:', fteValue >= selectedFTE[0] && fteValue <= selectedFTE[1]);
      }
      
      // Also log when FTE doesn't match the filter
      if (fteValue > 0 && !(fteValue >= selectedFTE[0] && fteValue <= selectedFTE[1])) {
        console.log('❌ [FTE Filter Debug] Provider filtered out:', provider.name, 'FTE:', fteValue, 'Range:', selectedFTE);
      }
      
      // Debug: Log the first few providers to see their FTE values
      if (providers.length > 0 && providers.indexOf(provider) < 3) {
        console.log('🔍 [FTE Filter Debug] Provider sample:', {
          name: provider.name,
          fte: provider.fte,
          totalFTE: (provider as any).totalFTE,
          dynamicFields: provider.dynamicFields,
          calculatedFTE: fteValue
        });
      }
      
      const matchesFTE = fteValue >= selectedFTE[0] && fteValue <= selectedFTE[1];
      
      // Provider Type filter (replacing Admin Role)
      const providerType = provider.providerType || "None";
      const matchesProviderTypeFilter = selectedProviderTypeFilter === "__ALL__" || providerType === selectedProviderTypeFilter;
      
      return matchesSearch && matchesSpecialty && matchesSubspecialty && matchesProviderType && matchesFTE && matchesProviderTypeFilter;
    });
      }, [providers, search, selectedSpecialty, selectedSubspecialty, selectedProviderType, selectedFTE, selectedProviderTypeFilter]);

  // Bulk generation hook - replaces all bulk generation logic
  const {
    handleBulkGenerate: handleBulkGenerateHook,
    handleModalBulkGenerate: handleModalBulkGenerateHook,
  } = useBulkGeneration({
    providers,
    templates,
    mappings,
    selectedProviderIds,
    filteredProviders,
    generatedContracts,
    getAssignedTemplate,
    setIsBulkGenerating,
    setProgressModalOpen,
    setSelectedProviderIds,
    setUserError,
    showSuccess,
    showWarning,
    showError,
    initializeProgress,
    updateProgress,
    progressData,
    hydrateGeneratedContracts,
  });

  // Wrapper functions to maintain existing interface
  const handleBulkGenerate = async () => {
    return handleBulkGenerateHook();
  };

  const handleModalBulkGenerate = async () => {
    return handleModalBulkGenerateHook();
  };

  // Generator events hook - replaces all UI event handlers
  const {
    handleGenerate: handleGenerateHook,
    handlePreview: handlePreviewHook,
    handlePreviewGenerate: handlePreviewGenerateHook,
    handleRowClick: handleRowClickHook,
    handleGenerateOne: handleGenerateOneHook,
    handleGenerateAll: handleGenerateAllHook,
    handleClearAssignments: handleClearAssignmentsHook,
    handleAssignTemplate: handleAssignTemplateHook,
    handleGenerateDOCX: handleGenerateDOCXHook,
  } = useGeneratorEvents({
    providers,
    templates,
    mappings,
    selectedProviderIds,
    filteredProviders,
    selectedTemplate,
    clickedProvider,
    getAssignedTemplate,
    generateAndDownloadDocx,
    handleBulkGenerate,
    updateProviderTemplate,
    setSelectedProviderIds,
    setPreviewModalOpen,
    setBottomActionMenuOpen,
    setUserError,
    showSuccess,
    showError,
    hydrateGeneratedContracts,
  });

  // Wrapper functions to maintain existing interface
  const handleGenerate = async () => {
    return handleGenerateHook();
  };

  const handlePreview = () => {
    return handlePreviewHook();
  };

  const handleRowClick = (event: any) => {
    return handleRowClickHook(event);
  };

  const handleGenerateOne = async () => {
    return handleGenerateOneHook();
  };

  const handleGenerateAll = async () => {
    return handleGenerateAllHook();
  };

  const handleClearAssignments = () => {
    return handleClearAssignmentsHook();
  };

  const handleAssignTemplate = (templateId: string) => {
    return handleAssignTemplateHook(templateId);
  };

  const handleGenerateDOCX = async () => {
    return handleGenerateDOCXHook();
  };

  // Generator status hook - replaces all status checking and utility functions
  const {
    getContractStatus: getContractStatusHook,
    getLatestGeneratedContract: getLatestGeneratedContractHook,
    getGenerationStatus: getGenerationStatusHook,
    getGenerationDate: getGenerationDateHook,
    scanPlaceholders: scanPlaceholdersHook,
  } = useGeneratorStatus({
    generatedContracts,
  });

  // Wrapper functions to maintain existing interface
  const getContractStatus = (providerId: string, templateId: string) => {
    return getContractStatusHook(providerId, templateId);
  };

  const getLatestGeneratedContract = (providerId: string) => {
    return getLatestGeneratedContractHook(providerId);
  };

  const getGenerationStatus = (providerId: string, templateId: string) => {
    return getGenerationStatusHook(providerId, templateId);
  };

  const getGenerationDate = (providerId: string, templateId: string) => {
    return getGenerationDateHook(providerId, templateId);
  };

  const scanPlaceholders = (templateContent: string): string[] => {
    return scanPlaceholdersHook(templateContent);
  };

  // Generator data management hook - replaces all data management functions
  const {
    handleClearGenerated: handleClearGeneratedHook,
    handleClearAllProcessed: handleClearAllProcessedHook,
    confirmClearContracts: confirmClearContractsHook,
    handleExportCSV: handleExportCSVHook,
    getRealTabCounts: getRealTabCountsHook,
  } = useGeneratorDataManagement({
    selectedProviderIds,
    setSelectedProviderIds,
    generatedContracts,
    filteredProviders,
    templates,
    templateAssignments,
    mappings,
    agGridColumnDefs: [], // Will be updated after agGridColumnDefs is computed
    hiddenColumns: new Set(), // Will be updated after hiddenColumns is computed
    setUserError,
    showSuccess,
    showWarning,
    showError,
    showInfo,
    setIsClearing,
    setClearingProgress,
    setShowClearConfirm,
    setContractsToClear,
    hydrateGeneratedContracts,
    getAssignedTemplate,
  });

  // Wrapper functions to maintain existing interface
  const handleClearGenerated = async () => {
    return handleClearGeneratedHook();
  };

  const handleClearAllProcessed = async () => {
    return handleClearAllProcessedHook();
  };

  const confirmClearContracts = async () => {
    return confirmClearContractsHook(contractsToClear);
  };

  const handleExportCSV = async () => {
    return handleExportCSVHook();
  };

  const getRealTabCounts = () => {
    return getRealTabCountsHook();
  };

  // Handle creating a new saved view
  const handleCreateView = () => {
    if (!newViewName.trim()) {
      showWarning('Please enter a valid view name.');
      return;
    }

    try {
      console.log('🔧 handleCreateView called with:', { newViewName, statusTab, columns });
      
      const currentColumns = columns.map(col => ({
        field: col.field,
        visible: col.visible,
        pinned: col.pinned
      }));
      console.log('🔧 Current columns data:', currentColumns);
      
      const viewData = {
        columnVisibility: Object.fromEntries(currentColumns.map(col => [col.field, col.visible])),
        columnOrder: currentColumns.map(col => col.field),
        columnPinning: {
          left: currentColumns.filter(col => col.pinned === 'left').map(col => col.field),
          right: currentColumns.filter(col => col.pinned === 'right').map(col => col.field)
        }
      };
      console.log('🔧 View data to save:', viewData);
      
      createSavedView(
        newViewName.trim(),
        viewData,
        statusTab
      );
      
      // Show success message and close modal
      showSuccess(`View "${newViewName.trim()}" saved successfully!`);
      setCreateViewModalOpen(false);
      setNewViewName('');
      
    } catch (error) {
      console.error('Error saving view:', error);
      showError({ message: 'Failed to save view. Please try again.', severity: 'error' });
    }
  };


  // Pagination logic - apply to ALL filtered providers, not just tab-filtered ones
  const paginatedProviders = useMemo(() => {
    return filteredProviders.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  }, [filteredProviders, pageIndex, pageSize]);
  
  const totalPages = useMemo(() => {
    return Math.ceil(filteredProviders.length / pageSize);
  }, [filteredProviders.length, pageSize]);

  // Progress tracking will be calculated using the existing allFilteredProvidersWithStatus logic below

  // CSV Export (async, robust download links)
  const [isExportingCSV, setIsExportingCSV] = useState(false);

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

  const providerTypeFilterOptions = useMemo(() => {
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
    
    // Debug logging for newly generated contracts - DISABLED to prevent infinite loop
    // if (latestProcessedContract && (latestProcessedContract.status === 'SUCCESS' || latestProcessedContract.status === 'PARTIAL_SUCCESS')) {
    //   console.log('🔍 Provider with contract:', {
    //     providerId: provider.id,
    //     providerName: provider.name,
    //     contractStatus: latestProcessedContract.status,
    //     generationStatus: generationStatus,
    //     generatedAt: latestProcessedContract.generatedAt
    //   });
    // }
    
    return {
      ...provider,
      generationStatus,
    };
  });
  


  const processedRows = allFilteredProvidersWithStatus.filter(
    row => row.generationStatus === 'Success' || row.generationStatus === 'Partial Success'
  );

  const notGeneratedRows = allFilteredProvidersWithStatus.filter(row => row.generationStatus === 'Not Generated');
  

  

  const allRows = allFilteredProvidersWithStatus;
  

  

  
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









  // Generator grid hook - replaces all AG Grid configuration and column definitions
  const {
    agGridColumnDefs,
    gridOptions,
    gridStyle,
    onGridReady,
    onRowDataUpdated,
  } = useGeneratorGrid({
    selectedProviderIds,
    setSelectedProviderIds,
    visibleRows,
    columnOrder,
    hiddenColumns,
    columnPreferences: defaultColumnPreferences,
    templates,
    generatedContracts,
    statusTab,
    selectedTemplate,
    updateProviderTemplate,
    getAssignedTemplate,
    downloadContract,
    handlePreviewGenerate: handlePreviewGenerateHook,
    handleRowClick,
    getGenerationDate,
    gridRef: tempGridRef,
    updateColumnOrder: (order) => {
      // Convert order array to column objects and update
      const newColumns = order.map(field => {
        const existingColumn = columns.find(col => col.field === field);
        return existingColumn || { field, headerName: field, visible: true };
      });
      updateColumns(newColumns);
    },
    updateColumnPinning: (pinning) => {
      // Update pinning for columns
      const newColumns = columns.map(col => ({
        ...col,
        pinned: pinning.left.includes(col.field) ? 'left' as const : 
                pinning.right.includes(col.field) ? 'right' as const : undefined
      }));
      updateColumns(newColumns);
    },
    updateColumnVisibility: (visibility) => {
      // Update visibility for columns
      const newColumns = columns.map(col => ({
        ...col,
        visible: visibility[col.field] !== false
      }));
      updateColumns(newColumns);
    },
  });

  // Component rendering hook - extracts all JSX rendering logic
  const { renderMainLayout } = useGeneratorRendering({
    // State
    providers,
    templates,
    selectedProviderIds,
    selectedTemplate,
    statusTab,
    pageIndex,
    pageSize,
    search,
    bulkOpen,
    isBulkGenerating,
    progressModalOpen,
    progressData,
    instructionsModalOpen,
    showClearConfirm,
    isClearing,
    clearingProgress,
    contractsToClear,
    isColumnSidebarOpen,
    editorModalOpen,
    editorContent,
    previewModalOpen,
    bulkAssignmentModalOpen,
    sameTemplateModalOpen,
    templateErrorModalOpen,
    bottomActionMenuOpen,
    showDetailedView,
    clickedProvider,
    showAssignmentHint,
    
    // Loading states
    providersLoading,
    isHydratingContracts,
    
    // Filter state
    selectedSpecialty,
    selectedSubspecialty,
    selectedProviderType,
    selectedFTE,
    selectedProviderTypeFilter,
    specialtyOptions,
    subspecialtyOptions,
    providerTypeOptions,
    providerTypeFilterOptions,
    
    // Computed values
    filteredProviders,
    visibleRows,
    tabFilteredRows,
    totalPages,
    allFilteredProvidersWithStatus,
    tabCounts,
    
    // Grid props
    tempGridRef,
    agGridColumnDefs,
    gridOptions,
    gridStyle,
    onGridReady,
    onRowDataUpdated,
    
    // Functions
    setSelectedProviderIds,
    setBulkOpen,
    setPageIndex,
    setSelectedSpecialty,
    setSelectedSubspecialty,
    setSelectedProviderType,
    setSelectedFTE,
    setSelectedProviderTypeFilter,
    setInstructionsModalOpen,
    setShowClearConfirm,
    clearTemplateAssignments,
    handleRowClick,
    handleBulkGenerate,
    handleModalBulkGenerate,
    confirmClearContracts,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Contract action handlers
    onDownloadContract: downloadContract,
    onPreviewContract: (provider: Provider, templateId: string) => {
      handlePreviewGenerateHook(provider.id || '');
    },
    onViewInS3: (provider: Provider, templateId: string) => {
      // TODO: Implement S3 view functionality
      showInfo('S3 view functionality not yet implemented');
    },
    
    // Generated contracts data
    generatedContracts,
  });
  


  // Sync AG Grid selection with selectedProviderIds state




  return (
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Card - Consistent with Templates/Providers */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-bold text-gray-800">Contract Generation</h1>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setInstructionsModalOpen(true)}
                      className="cursor-pointer p-1 rounded hover:bg-gray-100 transition-colors"
                      aria-label="View instructions"
                    >
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    View detailed instructions and help
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Donut Progress Chart - Moved to the right */}
            <ContractProgressChart 
              progress={contractProgress} 
              className="flex-shrink-0"
            />
          </div>
          <hr className="my-3 border-gray-100" />
        </div>



        {/* Main Content Card */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
          {/* Bulk Processing Section */}
          <div className="flex flex-col gap-4 mb-6">
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
                    {/* Quick Selection Actions */}
                    <div className="flex items-center gap-2">
                      {unprocessedCount > 0 && (
                        <Button
                          onClick={selectAllUnprocessed}
                          disabled={isBulkGenerating}
                          size="sm"
                          variant="outline"
                          className="h-9 text-sm font-medium border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                        >
                          Select All Unprocessed ({unprocessedCount})
                        </Button>
                      )}


                    </div>
                  </div>
                </div>

                                  {/* Advanced Options */}
                  <div className="px-6 pt-4">
                    <div className="text-sm font-semibold text-gray-700 mb-3">Filters & Advanced Options</div>
                    
                    {/* Selection Actions */}
                    <div className="flex gap-2 flex-wrap mb-4 items-center justify-between">
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const allFilteredIds = filteredProviders.map((p: Provider) => p.id);
                            setSelectedProviderIds(allFilteredIds);
                          }}
                          disabled={filteredProviders.length === 0 || isBulkGenerating}
                          className="font-medium text-xs"
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
                          className="font-medium text-xs"
                          title="Select all providers currently visible on this page"
                        >
                          Visible
                        </Button>
                      </div>
                      
                      {selectedProviderIds.length > 0 && (
                        <Button
                          onClick={clearSelection}
                          disabled={isBulkGenerating}
                          size="sm"
                          variant="default"
                          className="font-medium text-xs bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:border-blue-700"
                        >
                          Clear Selection ({selectedProviderIds.length})
                        </Button>
                      )}
                    </div>
                  
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
                      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${statusTab === 'processed' ? 'min-h-[120px]' : 'min-h-[80px]'}`}>
                        <div className="flex justify-center mb-3">
                          <span className="font-semibold text-blue-700 text-sm tracking-wide">
                            {statusTab === 'processed' ? 'Reset Filters & Clear Processed' : 'Reset Filters'}
                          </span>
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
                        
                        {/* Status indicator for non-processed tabs */}
                        {statusTab !== 'processed' && (
                          <div className="mt-3 text-center">
                            <span className="text-xs text-gray-500">
                              {statusTab === 'notGenerated' ? 'Use "Clear All" on Processed tab to remove completed contracts' : 'Switch to Processed tab to manage completed contracts'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  

                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={statusTab} onValueChange={(value: any) => setStatusTab(value as 'notGenerated' | 'processed' | 'all')} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList className="flex gap-2 border-b border-blue-200 bg-transparent justify-start">
                <TabsTrigger value="notGenerated" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                  data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                  data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                  Not Generated <span className="ml-1 text-xs">({tabCounts.notGenerated})</span>
                </TabsTrigger>
                <TabsTrigger value="processed" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                  data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                  data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                  Processed <span className="ml-1 text-xs">({tabCounts.processed})</span>
                </TabsTrigger>
                <TabsTrigger value="all" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                  data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                  data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                  All <span className="ml-1 text-xs">({tabCounts.all})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Search and Controls */}
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
                    <SelectTrigger className="w-32 h-9">
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
                    className="w-32 px-3 flex items-center gap-2 justify-center"
                  >
                    <FileDown className="w-4 h-4" />
                    Export CSV
                  </Button>

                  {/* Active View Indicator - Positioned next to Columns button */}
                  {preferences?.[statusTab]?.activeView && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setIsColumnSidebarOpen(true)}
                            className="min-w-32 max-w-40 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white border border-blue-600 rounded-md shadow-sm transition-all duration-200 group justify-center whitespace-nowrap"
                            title={`Active: ${preferences[statusTab].activeView === 'default' ? 'Default View' : preferences[statusTab].activeView} - Click to customize`}
                          >
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse flex-shrink-0"></div>
                            <span className="text-white group-hover:text-white truncate">
                              {preferences[statusTab].activeView === 'default' ? 'Default' : preferences[statusTab].activeView}
                            </span>
                            <svg className="w-3 h-3 text-white group-hover:text-white transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="text-center">
                            <div className="font-medium">Active View</div>
                            <div className="text-sm text-gray-600">
                              {preferences[statusTab].activeView === 'default' ? 'Default View' : preferences[statusTab].activeView}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Click to customize</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  <Button
                    onClick={() => setIsColumnSidebarOpen(!isColumnSidebarOpen)}
                    variant="default"
                    size="sm"
                    className="w-32 px-3 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 justify-center"
                    title="Manage column visibility, order, and pinning"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    Columns
                  </Button>
                  
                  
                </div>
              </div>
            </div>
          </Tabs>

          {/* AG Grid Table */}
          <div className={`ag-theme-alpine w-full border border-gray-200 rounded-lg overflow-visible ${statusTab === 'processed' ? 'processed-tab' : ''}`} style={gridStyle}>
            <AgGridReact
                ref={tempGridRef}
                key={`grid-${statusTab}-${columnOrder.join('-')}`}
              rowData={visibleRows}
              columnDefs={agGridColumnDefs as import('ag-grid-community').ColDef<ExtendedProvider, any>[]}
              onRowClicked={statusTab === 'processed' ? undefined : handleRowClick}
              onGridReady={onGridReady}
              onRowDataUpdated={onRowDataUpdated}
              {...gridOptions}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {Math.min(tabFilteredRows.length, pageSize * (pageIndex + 1) - pageSize + 1)}–{Math.min(tabFilteredRows.length, pageSize * (pageIndex + 1))} of {tabFilteredRows.length} providers
            </div>
            
            {/* Bottom Pagination Controls - Left aligned */}
            <div className="flex gap-2 items-center mt-2">
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
          
          /* Disable row clicks for Processed tab */
          .ag-theme-alpine.processed-tab .ag-row {
            cursor: default !important;
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

          /* Ensure Contract Actions buttons are clickable */
          .ag-theme-alpine .ag-cell[col-id="actions"] {
            pointer-events: auto !important;
          }
          .ag-theme-alpine .ag-cell[col-id="actions"] button {
            pointer-events: auto !important;
            z-index: 1000 !important;
            position: relative !important;
            cursor: pointer !important;
            border: none !important;
            background: transparent !important;
            padding: 4px !important;
            border-radius: 4px !important;
            transition: all 0.15s ease !important;
          }
          .ag-theme-alpine .ag-cell[col-id="actions"] button:hover {
            background-color: #f3f4f6 !important;
            transform: scale(1.05) !important;
          }
          .ag-theme-alpine .ag-cell[col-id="actions"] button:active {
            background-color: #e5e7eb !important;
            transform: scale(0.95) !important;
          }
          .ag-theme-alpine .ag-cell[col-id="actions"] button:focus {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
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
          
          /* Fix template column layout - professional truncation approach */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] {
            min-width: 140px !important;
            max-width: 180px !important;
            position: relative !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            cursor: help !important;
            padding: 8px 12px !important;
          }
          /* Ensure template column tooltips work properly */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"]:hover {
            background-color: #f8fafc !important;
          }
          /* Style truncated indicator */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] .text-blue-500 {
            color: #3b82f6 !important;
            font-weight: bold !important;
            font-size: 14px !important;
          }
          /* Ensure proper flex layout in template cells */
          .ag-theme-alpine .ag-cell[col-id="assignedTemplate"] div {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
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
                        value={preferences?.[statusTab]?.activeView || 'default'} 
                        onChange={(e) => {
                          const viewName = e.target.value;
                          setActiveView(viewName, statusTab);
                          if (preferences?.[statusTab]?.savedViews?.[viewName]) {
                            const savedView = preferences[statusTab].savedViews[viewName];
                            updateColumnOrder(savedView.columnOrder || [], statusTab);
                            updateColumnVisibility(savedView.columnVisibility || {}, statusTab);
                            if (savedView.columnPinning) {
                              updateColumnPinning(savedView.columnPinning, statusTab);
                            }
                          }
                        }}
                        className="flex-1 text-sm border rounded px-2 py-1"
                      >
                        <option value="default">Default View</option>
                        {Object.keys(preferences?.[statusTab]?.savedViews || {}).map(viewName => (
                          <option key={viewName} value={viewName}>{viewName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log('🔧 Save View button clicked');
                          console.log('🔧 Current statusTab:', statusTab);
                          console.log('🔧 Current columns:', columns);
                          console.log('🔧 Current preferences:', preferences);
                          
                          // Open the create view modal
                          setNewViewName('');
                          setCreateViewModalOpen(true);
                        }}
                        className="flex-1 text-xs"
                      >
                        Save View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Pin first 2 visible columns to left by default
                          const visibleColumns = columns.filter(col => col.visible);
                          const firstTwoColumns = visibleColumns.slice(0, 2);
                          const newColumns = columns.map(col => ({
                            ...col,
                            pinned: firstTwoColumns.some(fc => fc.field === col.field) ? 'left' as const : undefined
                          }));
                          updateColumns(newColumns);
                          showSuccess(`Pinned first 2 visible columns to left: ${firstTwoColumns.map(col => col.headerName).join(', ')}`);
                        }}
                        className="flex-1 text-xs"
                        title="Pin the first 2 visible columns to the left side of the grid"
                      >
                        Arrange...
                      </Button>
                    </div>
                    
                    {/* Delete View Button - only show if there are saved views and not on default view */}
                    {Object.keys(preferences?.[statusTab]?.savedViews || {}).length > 0 && 
                     preferences?.[statusTab]?.activeView !== 'default' && (
                      <div className="mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentView = preferences?.[statusTab]?.activeView;
                            if (currentView && currentView !== 'default') {
                              deleteSavedView(currentView, statusTab);
                              showSuccess(`View "${currentView}" deleted successfully!`);
                            }
                          }}
                          className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
                        >
                          Delete Current View
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Column Pinning */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Column Pinning</div>
                    <div className="flex gap-2 pb-3 border-b">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newColumns = columns.map(col => ({ ...col, pinned: undefined }));
                          updateColumns(newColumns);
                        }}
                        className="flex-1 text-xs"
                      >
                        Unpin All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Pin first 2 visible columns to left by default
                          const visibleColumns = columns.filter(col => col.visible);
                          const firstTwoColumns = visibleColumns.slice(0, 2);
                          const newColumns = columns.map(col => ({
                            ...col,
                            pinned: firstTwoColumns.some(fc => fc.field === col.field) ? 'left' as const : undefined
                          }));
                          updateColumns(newColumns);
                        }}
                        className="flex-1 text-xs"
                      >
                        Pin First 2
                      </Button>
                    </div>
                    
                    {/* Show pinned columns summary */}
                    {columns.some(col => col.pinned) && (
                      <div className="text-xs text-gray-600 mb-3">
                        {columns.filter(col => col.pinned === 'left').length > 0 && (
                          <div>Left: {columns.filter(col => col.pinned === 'left').map(col => col.headerName).join(', ')}</div>
                        )}
                        {columns.filter(col => col.pinned === 'right').length > 0 && (
                          <div>Right: {columns.filter(col => col.pinned === 'right').map(col => col.headerName).join(', ')}</div>
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
                          const newColumns = columns.map(col => ({ ...col, visible: true }));
                          updateColumns(newColumns);
                        }}
                        className="flex-1 text-xs"
                      >
                        Show All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newColumns = columns.map(col => ({ ...col, visible: false }));
                          updateColumns(newColumns);
                        }}
                        className="flex-1 text-xs"
                      >
                        Hide All
                      </Button>
                    </div>
                  </div>

                  {/* Column Order */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-3">Column Order</div>
                    <div className="text-xs text-gray-500 mb-3">Drag to reorder columns. Click eye to show/hide.</div>
                    <div className="space-y-1">
                      {columns.map((column, index) => {
                        
                        return (
                          <div
                            key={column.field}
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
                                const newColumns = [...columns];
                                const draggedColumn = newColumns[dragIndex];
                                newColumns.splice(dragIndex, 1);
                                newColumns.splice(hoverIndex, 0, draggedColumn);
                                updateColumns(newColumns);
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
                                const newColumns = [...columns];
                                newColumns[index].visible = !newColumns[index].visible;
                                updateColumns(newColumns);
                              }}
                              className="p-1 rounded text-gray-600 hover:text-blue-600"
                            >
                              {column.visible ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M18.364 18.364l-9.9-9.9" />
                                </svg>
                              )}
                            </button>
                            
                            {/* Pin/Unpin Button */}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                const newColumns = [...columns];
                                const column = newColumns[index];
                                
                                if (e.shiftKey) {
                                  // Shift+Click: Pin to right or unpin from right
                                  if (column.pinned === 'right') {
                                    column.pinned = undefined;
                                  } else {
                                    column.pinned = 'right';
                                  }
                                } else {
                                  // Regular click: Pin to left or unpin from left
                                  if (column.pinned === 'left') {
                                    column.pinned = undefined;
                                  } else {
                                    column.pinned = 'left';
                                  }
                                }
                                
                                updateColumns(newColumns);
                              }}
                              className={`p-1 rounded transition-colors ${
                                column.pinned
                                  ? 'text-blue-600 hover:text-blue-800 bg-blue-50' 
                                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                              }`}
                              title={
                                column.pinned === 'left' 
                                  ? 'Click to unpin from left' 
                                  : column.pinned === 'right'
                                  ? 'Click to unpin from right'
                                  : 'Click to pin left • Shift+click to pin right'
                              }
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                              </svg>
                            </button>

                            {/* Column Name */}
                            <span className="flex-1 text-sm text-gray-700">
                              {column.headerName}
                              {column.pinned === 'left' && <span className="text-xs text-blue-600 ml-1">(pinned left)</span>}
                              {column.pinned === 'right' && <span className="text-xs text-blue-600 ml-1">(pinned right)</span>}
                              {column.field.toLowerCase().includes('fte') && <span className="text-xs text-blue-500 ml-1">FTE</span>}
                            </span>
                            
                            {/* Move Buttons */}
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  if (index > 0) {
                                    const newColumns = [...columns];
                                    [newColumns[index], newColumns[index - 1]] = [newColumns[index - 1], newColumns[index]];
                                    updateColumns(newColumns);
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
                                  if (index < columns.length - 1) {
                                    const newColumns = [...columns];
                                    [newColumns[index], newColumns[index + 1]] = [newColumns[index + 1], newColumns[index]];
                                    updateColumns(newColumns);
                                  }
                                }}
                                disabled={index === columns.length - 1}
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
          onClose={() => {
            setPreviewModalOpen(false);
            setSelectedProviderIds([]); // Clear selected providers when modal closes
          }}
          template={selectedTemplate}
          providers={providers}
          selectedProviderIds={selectedProviderIds}
          onGenerate={handlePreviewGenerateHook}
          onBulkGenerate={handleBulkGenerate}
          getAssignedTemplate={getAssignedTemplate}
          templates={templates}
          generatedContracts={generatedContracts}
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
                    
                    {/* Quick Actions */}
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1 h-6 text-xs text-gray-600 hover:text-blue-600"
                          onClick={() => setShowAssignedProviders(!showAssignedProviders)}
                        >
                          {showAssignedProviders ? 'Hide Assigned' : 'Show All'}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="flex-1 h-6 text-xs text-gray-600 hover:text-orange-600"
                          onClick={() => {
                            const unassignedCount = getFilteredProviderIds.filter(id => !templateAssignments[id]).length;
                            showInfo(`${unassignedCount} providers still need template assignment`);
                          }}
                        >
                          Show Pending
                        </Button>
                      </div>
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
                      <div className="flex items-center gap-4 mt-0.5">
                        <p className="text-xs text-gray-600">
                          {getFilteredProviderIds.length} providers match filters
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 font-medium">
                            ✓ {getFilteredProviderIds.filter(id => templateAssignments[id]).length} assigned
                          </span>
                          <span className="text-xs text-orange-600 font-medium">
                            ⏳ {getFilteredProviderIds.filter(id => !templateAssignments[id]).length} pending
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select
                        value={showAssignedProviders ? "show-all" : "hide-assigned"}
                        onValueChange={(value) => setShowAssignedProviders(value === "show-all")}
                      >
                        <SelectTrigger className="w-32 h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="show-all">Show All</SelectItem>
                          <SelectItem value="hide-assigned">Hide Assigned</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input 
                        placeholder="Search providers..." 
                        className="w-48 h-7 text-xs"
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
                      {/* Filter providers based on showAssignedProviders setting */}
                      {getFilteredProviderIds
                        .filter(providerId => {
                          if (showAssignedProviders) return true;
                          return !templateAssignments[providerId]; // Hide assigned providers
                        })
                        .slice(0, 100)
                        .map(providerId => {
                        const provider = providers.find(p => p.id === providerId);
                        const currentTemplate = templates.find(t => t.id === templateAssignments[providerId]);
                        
                        if (!provider) return null;
                        
                        return (
                          <div key={providerId} className={`flex items-center justify-between p-2 border rounded transition-colors ${
                            templateAssignments[providerId] 
                              ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {templateAssignments[providerId] && (
                                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" title="Template assigned" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <h4 className={`font-medium truncate text-sm ${
                                    templateAssignments[providerId] ? 'text-green-800' : 'text-gray-900'
                                  }`}>
                                    {provider.name}
                                  </h4>
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
                      ⚡ Generate Contracts
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
          onClose={() => {
            console.log('Force closing progress modal from ContractGenerator');
            setProgressModalOpen(false);
          }}
        />

        {/* Create View Modal */}
        <Dialog open={createViewModalOpen} onOpenChange={setCreateViewModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Save Current View</DialogTitle>
              <DialogDescription>
                Save your current column layout as a named view for easy access later.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="viewName" className="block text-sm font-medium text-gray-700 mb-2">
                  View Name
                </label>
                <Input
                  id="viewName"
                  type="text"
                  placeholder="Enter a name for this view..."
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newViewName.trim()) {
                      handleCreateView();
                    }
                  }}
                  autoFocus
                />
              </div>
              
              <div className="text-xs text-gray-500">
                <p>This will save:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Column visibility settings</li>
                  <li>Column order</li>
                  <li>Column pinning (left/right)</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateViewModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateView}
                disabled={!newViewName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Save View
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
} 