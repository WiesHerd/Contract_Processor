import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FileDown, Loader2, Info, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, CheckSquare, Square, Search, Eye, RotateCcw } from 'lucide-react';
import {
  setSelectedTemplate,
  setSelectedProvider,
  setGenerating,
  setError,
  addGeneratedFile,
  clearGeneratedFiles,
  addGenerationLog,
  addGeneratedContract,
  setGenerationLogs,
  clearGeneratedContracts,
} from './generatorSlice';
import { generateDocument, downloadDocument } from './utils/documentGenerator';
import type { GeneratedFile } from './generatorSlice';
import { Provider } from '@/types/provider';
import { Template } from '@/types/template';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
import ContractPreviewModal from './components/ContractPreviewModal';
import { useGeneratorPreferences } from '@/hooks/useGeneratorPreferences';
import { toast } from 'sonner';

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

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
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


  const [selectedSpecialty, setSelectedSpecialty] = useState("__ALL__");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState("__ALL__");
  const [selectedProviderType, setSelectedProviderType] = useState("__ALL__");
  const [bulkOpen, setBulkOpen] = useState(true);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<'notGenerated' | 'processed' | 'all'>('notGenerated');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [isColumnSidebarOpen, setIsColumnSidebarOpen] = useState(false);
  
  // Template assignment state - maps provider ID to assigned template ID
  const [templateAssignments, setTemplateAssignments] = useState<Record<string, string>>({});

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

  // Update selected template when ID changes
  useEffect(() => {
    if (selectedTemplateId) {
      const template = templates.find(t => t.id === selectedTemplateId);
      dispatch(setSelectedTemplate(template || null));
    } else {
      dispatch(setSelectedTemplate(null));
    }
  }, [selectedTemplateId, templates, dispatch]);

  // Add AG Grid ref for selection management
  const gridRef = useRef<AgGridReact>(null);

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
    // Safety check to prevent empty template IDs
    if (templateId && templateId.trim() !== '' && templateId !== 'no-template') {
      setTemplateAssignments(prev => ({ ...prev, [providerId]: templateId }));
    } else {
      setTemplateAssignments(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[providerId];
        return newAssignments;
      });
    }
  };

  // Bulk template assignment functions
  const assignTemplateToSelected = (templateId: string) => {
    // Safety check to prevent empty template IDs
    if (!templateId || templateId.trim() === '' || templateId === 'no-template') return;
    
    const newAssignments = { ...templateAssignments };
    selectedProviderIds.forEach(providerId => {
      newAssignments[providerId] = templateId;
    });
    setTemplateAssignments(newAssignments);
  };



  const clearTemplateAssignments = () => {
    setTemplateAssignments({});
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
      
      // Try to get the contract file from S3
      let downloadUrl: string;
      try {
        const result = await getContractFile(contractId, fileName);
        downloadUrl = result.url;
      } catch (s3Error) {
        console.log('Initial download failed, trying to regenerate URL...');
        // If the initial download fails, try to regenerate the URL
        const result = await regenerateContractDownloadUrl(contractId, fileName);
        downloadUrl = result.url;
      }
      
      // Open download URL in new tab
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Failed to download contract:', error);
      setUserError(`Failed to download contract for ${provider.name}. Contract files are stored permanently, but download links expire for security. The system will automatically regenerate the link.`);
      
      // Try to regenerate the contract if download fails
      if (confirm(`Failed to download the contract. Would you like to regenerate it for ${provider.name}?`)) {
        // Find the assigned template for this provider
        const assignedTemplate = getAssignedTemplate(provider);
        if (assignedTemplate) {
          await generateAndDownloadDocx(provider, assignedTemplate);
        } else {
          setUserError(`No template assigned to ${provider.name}. Please assign a template first.`);
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
      
      // 1. Save to S3 with improved error handling
      let s3Url = '';
      let s3Key = '';
      try {
        // Convert Blob to File for saveContractFile
        const docxFile = new File([docxBlob], fileName, { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        });
        const contractId = provider.id + '-' + templateToUse.id + '-' + contractYear;
        
        // Save to S3
        s3Key = await saveContractFile(docxFile, contractId, {
          providerId: provider.id,
          providerName: provider.name,
          templateId: templateToUse.id,
          templateName: templateToUse.name,
          contractYear,
          fileName: fileName,
          fileSize: docxFile.size.toString(),
          generatedAt: new Date().toISOString(),
          generatedBy: 'user', // TODO: Get actual user ID
        });
        
        // Get signed S3 download URL (valid for 1 hour)
        const { url: signedUrl } = await getContractFile(contractId, fileName);
        s3Url = signedUrl;
        
        console.log('Contract saved to S3:', { s3Key, contractId, fileName });
      } catch (s3err) {
        console.error('Failed to upload contract to S3:', s3err);
        setUserError('Contract generated but failed to upload to S3. You can still download locally.');
      }
      
      // 2. Download locally for immediate access
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // 3. Log the generation event with comprehensive details
      const logInput = {
        providerId: provider.id,
        contractYear: contractYear,
        templateId: templateToUse.id,
        generatedAt: new Date().toISOString(),
        generatedBy: 'user', // TODO: Get actual user ID
        outputType: 'DOCX',
        status: 'SUCCESS',
        fileUrl: s3Url || fileName, // Prefer S3 URL if available
        notes: `Generated contract for ${provider.name} using template ${templateToUse.name}${s3Key ? ` (S3 Key: ${s3Key})` : ''}`
      };

      try {
        const logEntry = await ContractGenerationLogService.createLog(logInput);
        dispatch(addGenerationLog(logEntry));
        dispatch(addGeneratedContract({
          providerId: provider.id,
          templateId: templateToUse.id,
          status: 'SUCCESS',
          generatedAt: new Date().toISOString(),
          fileUrl: s3Url, // Store the S3 URL for later access
          fileName: fileName,
          s3Key: s3Key,
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
          fileUrl: s3Url || fileName,
          fileName: fileName,
          s3Key: s3Key,
          status: 'SUCCESS',
          outputType: 'DOCX',
          generatedAt: new Date().toISOString(),
          metadata: {
            providerId: provider.id,
            providerName: provider.name,
            templateId: templateToUse.id,
            templateName: templateToUse.name,
            contractYear,
            fileUrl: s3Url || fileName,
            fileName: fileName,
            s3Key: s3Key,
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
            fileUrl: s3Url || fileName,
            fileName: fileName,
            s3Key: s3Key,
            status: 'SUCCESS',
            outputType: 'DOCX',
            generatedAt: new Date().toISOString(),
          },
        }));
        
        console.log('logSecurityEvent dispatched successfully:', result);
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
      if (allLogs.length > 0) {
        allLogs.forEach(log => {
          if (log.providerId && log.templateId && log.status && log.generatedAt) {
            dispatch(addGeneratedContract({
              providerId: log.providerId,
              templateId: log.templateId,
              status: log.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
              generatedAt: log.generatedAt,
            }));
          }
        });
      }
      setAlertError(null);
    } catch (e) {
      // Only show error if it's not a benign 'no records found' error
      const err = e as Error;
      if (err && err.message && (err.message.includes('not found') || err.message.includes('No records'))) {
        setAlertError(null); // treat as empty, not an error
      } else {
        setAlertError('Could not load contract generation status from the backend. Please try again later.');
      }
    }
  }, [dispatch]);

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
    setUserError(null);
    setIsBulkGenerating(true);
    
    // Use all filtered providers, not just paginated
    const selectedProviders = filteredProviders.filter(p => selectedProviderIds.includes(p.id));
    if (selectedProviders.length < 2) {
      setUserError('Please select at least two providers to use Generate All.');
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

    let successCount = 0;
    let failCount = 0;
    for (const provider of selectedProviders) {
      try {
        const assignedTemplate = getAssignedTemplate(provider);
        if (!assignedTemplate) {
          failCount++;
          continue;
        }
        // Generate with the assigned template
        await generateAndDownloadDocx(provider, assignedTemplate);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    setIsBulkGenerating(false);
    await hydrateGeneratedContracts();
    if (failCount === 0) {
      setUserError(null);
      alert(`Successfully generated contracts for ${successCount} providers using their assigned templates.`);
    } else {
      setUserError(`Generated contracts for ${successCount} providers. ${failCount} failed. See logs for details.`);
    }
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
    const contract = generatedContracts.find(
      c => c.providerId === providerId && c.templateId === templateId
    );
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
      setAlertError('Please select providers to clear generated contracts.');
      return;
    }

    try {
      // Clear generated contracts from state for selected providers
      // We need to clear the generatedContracts array, not generatedFiles
      dispatch(clearGeneratedContracts());

      // Clear the selection
      setSelectedProviderIds([]);
      
      // Show success message
      setAlertError(null);
      
    } catch (error) {
      console.error('Error clearing generated contracts:', error);
      setAlertError('Failed to clear generated contracts. Please try again.');
    }
  };

  // Base columns that appear in all tabs
  const baseColumns = useMemo(() => {
    const leftPinned = columnPreferences?.columnPinning?.left || [];
    const rightPinned = columnPreferences?.columnPinning?.right || [];
    
    // Start with the select column (always pinned left)
    const selectColumn = {
      headerName: '',
      field: 'selected',
      width: 50,
      minWidth: 50,
      maxWidth: 50,
      pinned: 'left',
      suppressMenu: true,
      sortable: false,
      filter: false,
      resizable: false,
      suppressSizeToFit: true,
      cellRenderer: (params: any) => {
        const isSelected = selectedProviderIds.includes(params.data.id);
        return (
          <div className="flex items-center justify-center h-full">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                if (isSelected) {
                  setSelectedProviderIds(prev => prev.filter(id => id !== params.data.id));
                } else {
                  setSelectedProviderIds(prev => [...prev, params.data.id]);
                }
              }}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        );
      },
      headerComponent: () => {
        const visibleRowIds = visibleRows.map(row => row.id);
        const allVisibleSelected = visibleRowIds.length > 0 && 
          visibleRowIds.every(id => selectedProviderIds.includes(id));
        const someVisibleSelected = visibleRowIds.some(id => selectedProviderIds.includes(id));
        
        return (
          <div className="flex items-center justify-center h-full">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
              }}
              onChange={(e) => {
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
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
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
        width: 180,
        minWidth: 150,
        valueGetter: (params: any) => {
          const provider = params.data;
          return provider.compensationModel || provider.compensationType || provider.CompensationModel || '';
        },
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
      assignedTemplate: {
        headerName: 'Template',
        field: 'assignedTemplate',
        width: 280,
        minWidth: 240,
        cellRenderer: (params: any) => {
          const provider = params.data;
          const assignedTemplate = getAssignedTemplate(provider);
          
          return (
            <div className="flex items-center gap-2 w-full">
              {/* Show template name prominently */}
              {assignedTemplate ? (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="text-xs font-medium truncate" title={`${assignedTemplate.name} (v${assignedTemplate.version || '1'})`}>
                      {assignedTemplate.name}
                    </div>
                    {templateAssignments[provider.id] === assignedTemplate.id && (
                      <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                        Manual
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    v{assignedTemplate.version || '1'}
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-400 italic truncate">
                    No template assigned
                  </div>
                </div>
              )}
              <Select
                value={assignedTemplate?.id?.trim() ? assignedTemplate.id : 'no-template'}
                onValueChange={(templateId) => {
                  // Safety check to prevent empty values
                  if (templateId && templateId.trim() !== '' && templateId !== 'no-template') {
                    updateProviderTemplate(provider.id, templateId);
                  } else if (templateId === 'no-template') {
                    updateProviderTemplate(provider.id, null);
                  }
                }}
              >
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue placeholder="Change" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-template">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">No template</span>
                    </div>
                  </SelectItem>
                  {templates
                    .filter(template => 
                      template && 
                      template.id && 
                      template.id.trim() !== '' && 
                      template.name && 
                      template.name.trim() !== ''
                    )
                    .map(template => {
                      // Triple-check to ensure no empty values and provide fallback
                      const templateId = template?.id?.trim();
                      const templateName = template?.name?.trim();
                      
                      if (!templateId || !templateName) {
                        console.warn('Skipping template with empty ID or name:', template);
                        return null;
                      }
                      
                      return (
                        <SelectItem key={templateId} value={templateId}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs truncate max-w-[150px]" title={templateName}>
                              {templateName}
                            </span>
                            <span className="text-xs text-gray-500 flex-shrink-0">(v{template.version || '1'})</span>
                            {templateAssignments[provider.id] === templateId && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                                Assigned
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })
                    .filter(Boolean)}
                </SelectContent>
              </Select>
            </div>
          );
        },
        sortable: true,
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => {
          const provider = params.data;
          const assignedTemplate = getAssignedTemplate(provider);
          if (assignedTemplate) {
            const assignmentType = templateAssignments[provider.id] === assignedTemplate.id ? ' - Manually Assigned' : ' - Using Selected Template';
            return `${assignedTemplate.name} (v${assignedTemplate.version || '1'})${assignmentType}`;
          }
          return 'No template assigned';
        },
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
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
  }, [columnOrder, hiddenColumns, columnPreferences?.columnPinning, selectedProviderIds, templateAssignments, templates, getAssignedTemplate, updateProviderTemplate]);

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
      // Find any successful contract for this provider, regardless of template selection
      const contract = generatedContracts.find(
        c => c.providerId === provider.id && c.status === 'SUCCESS'
      );
      
      if (contract) {
        return (
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadContract(provider, contract.templateId)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                  >
                    <FileDown className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Download Contract
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedProviderIds([provider.id]);
                      setPreviewModalOpen(true);
                    }}
                    className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 px-2"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Preview Contract
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
    pinned: 'right',
  };

  // Contextual column definitions based on current tab
  const agGridColumnDefs = useMemo(() => {
    if (statusTab === 'notGenerated') {
      // Not Generated tab: Base columns only (no status, no actions)
      return baseColumns;
    } else if (statusTab === 'processed') {
      // Processed tab: Base columns + Contract Actions (no status since all are processed)
      return [...baseColumns, contractActionsColumn];
    } else {
      // All tab: Base columns + Generation Status + Contract Actions
      return [...baseColumns, generationStatusColumn, contractActionsColumn];
    }
  }, [statusTab, selectedTemplate, generatedContracts, downloadContract, setPreviewModalOpen]);

  // Prepare row data for AG Grid
  const agGridRows = paginatedProviders.map((provider: Provider) => {
    // Find the latest successful generated contract for this provider
    const latestSuccessContract = generatedContracts
      .filter(c => c.providerId === provider.id && c.status === 'SUCCESS')
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
    
    let generationStatus = 'Not Generated';
    if (latestSuccessContract) {
      generationStatus = 'Success';
    } else {
      generationStatus = 'Not Generated';
    }
    
    return {
      ...provider,
      generationStatus,
    };
  });

  // Compute counts for progress bar and stats
  const completedCount = agGridRows.filter(row => row.generationStatus === 'Success').length;
  const failedCount = agGridRows.filter(row => row.generationStatus === 'Failed').length;
  const notGeneratedCount = agGridRows.filter(row => row.generationStatus === 'Not Generated').length;

  const totalCount = agGridRows.length;

  // CSV Export
  const handleExportCSV = () => {
    // Use all filtered providers, not just paginated
    const allRows = filteredProviders.map((provider: Provider) => {
      // Find the latest successful generated contract for this provider
      const latestSuccessContract = generatedContracts
        .filter(c => c.providerId === provider.id && c.status === 'SUCCESS')
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
      
      let generationStatus = 'Not Generated';
      if (latestSuccessContract) {
        generationStatus = 'Success';
      } else {
        generationStatus = 'Not Generated';
      }
      
      return {
        ...provider,
        generationStatus,
      };
    });
    
    // Export with current column structure
    const headers = agGridColumnDefs.filter(col => col.field && col.field !== 'checkbox').map(col => col.headerName);
    const rows = allRows.map(row =>
      agGridColumnDefs.filter(col => col.field && col.field !== 'checkbox').map(col => (row as any)[col.field] ?? '')
    );
    const csv = [headers, ...rows].map(r => r.map(String).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'contract-generation-providers.csv');
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

  useEffect(() => {
    async function hydrateGeneratedContracts() {
      try {
        const result = await ContractGenerationLogService.listLogs();
        if (result && result.items) {
          result.items.forEach(log => {
            if (log.providerId && log.templateId && log.status && log.generatedAt) {
              dispatch(addGeneratedContract({
                providerId: log.providerId,
                templateId: log.templateId,
                status: log.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
                generatedAt: log.generatedAt,
              }));
            }
          });
        }
        setAlertError(null); // Clear any previous error
      } catch (e) {
        // Only show error if it's not a benign 'no records found' error
        const err = e as Error;
        if (err && err.message && (err.message.includes('not found') || err.message.includes('No records'))) {
          setAlertError(null); // treat as empty, not an error
        } else {
          setAlertError('Could not load contract generation status from the backend. Please try again later.');
        }
      }
    }
    hydrateGeneratedContracts();
  }, [dispatch]);



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
    // Find the latest successful generated contract for this provider
    const latestSuccessContract = generatedContracts
      .filter(c => c.providerId === provider.id && c.status === 'SUCCESS')
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
    
    let generationStatus = 'Not Generated';
    if (latestSuccessContract) {
      generationStatus = 'Success';
    } else {
      generationStatus = 'Not Generated';
    }
    
    return {
      ...provider,
      generationStatus,
    };
  });

  const processedRows = allFilteredProvidersWithStatus.filter(row => row.generationStatus === 'Success');
  const notGeneratedRows = allFilteredProvidersWithStatus.filter(row => row.generationStatus === 'Not Generated');
  const allRows = allFilteredProvidersWithStatus;
  
  const tabCounts = {
    notGenerated: notGeneratedRows.length,
    processed: processedRows.length,
    all: allRows.length,
  };
  
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
        {alertError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error loading contract status</AlertTitle>
            <AlertDescription>{alertError}</AlertDescription>
          </Alert>
        )}
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
                  <TooltipContent side="right" align="start">
                    Generate contracts for selected providers using your templates. Choose a template and providers, then generate DOCX files.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Template Selector - right-aligned in header */}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-gray-700">Template:</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="truncate max-w-xs">
                      <Select
                        value={selectedTemplateId}
                        onValueChange={setSelectedTemplateId}
                        disabled={templatesStatus === 'loading'}
                      >
                        <SelectTrigger className="w-64 truncate">
                          <SelectValue placeholder={templatesStatus === 'loading' ? 'Loading templates...' : 'Select template'} />
                        </SelectTrigger>
                        <SelectContent>
                          {templatesStatus === 'loading' ? (
                            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                              <LoadingSpinner size="sm" />
                              Loading templates...
                            </div>
                          ) : (
                            templates
                              .filter((template: any) => template && template.id && template.id.trim() !== '' && template.name)
                              .map((template: any) => {
                                // Additional safety check to ensure no empty values
                                if (!template.id || template.id.trim() === '') {
                                  return null;
                                }
                                return (
                                  <SelectItem key={template.id} value={template.id}>
                                    {template.name} (v{template.version || '1'})
                                  </SelectItem>
                                );
                              })
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{
                    selectedTemplateId && templates?.find(t => t.id === selectedTemplateId)
                      ? templates.find(t => t.id === selectedTemplateId)?.name + ' (v' + templates.find(t => t.id === selectedTemplateId)?.version + ')'
                      : 'Select a template'
                  }</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const allFilteredIds = tabFilteredRows.map((p: Provider) => p.id);
                                setSelectedProviderIds(allFilteredIds);
                              }}
                              disabled={filteredProviders.length === 0 || isBulkGenerating}
                              className="font-medium"
                            >
                              All Filtered
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Select all providers in the current tab (all pages)</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const visibleIds = visibleRows.map((p: Provider) => p.id);
                                setSelectedProviderIds(visibleIds);
                              }}
                              disabled={providers.length === 0 || isBulkGenerating}
                              className="font-medium"
                            >
                              Visible
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Select all providers currently visible on this page</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedProviderIds([]);
                              }}
                              disabled={selectedProviderIds.length === 0 || isBulkGenerating}
                              className="font-medium"
                            >
                              Clear
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clear all selected providers</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <Button
                        onClick={handleGenerate}
                        disabled={selectedProviderIds.length !== 1 || isGenerating}
                        variant={selectedProviderIds.length === 1 ? 'default' : 'outline'}
                        size="sm"
                        className="font-medium"
                        aria-label="Generate Selected"
                      >
                        {isGenerating && selectedProviderIds.length === 1 ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-1" />
                        ) : null}
                        Selected
                      </Button>
                      <Button
                        onClick={handleBulkGenerate}
                        disabled={selectedProviderIds.length < 2 || isGenerating}
                        variant={selectedProviderIds.length > 1 ? 'default' : 'outline'}
                        size="sm"
                        className="font-medium"
                        aria-label="Generate All"
                      >
                        {isGenerating && selectedProviderIds.length > 1 ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-1" />
                        ) : null}
                        All
                      </Button>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleExportCSV}
                              disabled={isBulkGenerating}
                              className="font-medium"
                            >
                              CSV
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Export the current filtered provider list to CSV</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </div>



                {/* Advanced Options */}
                <div className="px-6 pt-4">
                  <div className="text-sm font-semibold text-gray-700 mb-3">Filters & Advanced Options</div>
                  
                  {/* Filters Row */}
                  <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 gap-2 mb-4">
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
                    <div className="flex flex-col justify-end min-w-[140px] mt-4 sm:mt-0">
                      <Button
                        variant="ghost"
                        className="text-blue-600 border border-blue-100 hover:bg-blue-100"
                        onClick={() => {
                          setSelectedSpecialty("__ALL__");
                          setSelectedSubspecialty("__ALL__");
                          setSelectedProviderType("__ALL__");
                          setPageIndex(0);
                        }}
                      >
                        Clear All Filters
                      </Button>
                    </div>
                    
                    {/* Template Management Actions - Grouped with filters */}
                    <div className="flex flex-col justify-end min-w-[180px] mt-4 sm:mt-0">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearTemplateAssignments}
                              disabled={isBulkGenerating || Object.keys(templateAssignments).length === 0}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200 w-full"
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              Clear All Assignments
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clear all manual template assignments</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Clear Generated (only for processed tab) */}
                      {statusTab === 'processed' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleClearGenerated}
                                disabled={selectedProviderIds.length === 0 || isBulkGenerating}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 w-full mt-2"
                              >
                                Clear Generated
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Clear generated contracts for selected providers</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                  

                </div>
              </div>
            </div>
          </div>

          {/* Tabs for Pending / Processed / All */}
          <div className="mb-2 flex justify-between items-center">
            <Tabs value={statusTab} onValueChange={v => setStatusTab(v as 'notGenerated' | 'processed' | 'all')} className="flex-1">
              <TabsList className="flex gap-2 border-b-0 bg-transparent justify-start relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1.5px] after:bg-gray-200 after:z-10 overflow-visible">
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
            </Tabs>
            
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
                  <div className="flex items-center gap-2">
                    <div className="relative w-7 h-7">
                      {/* Background circle */}
                      <svg className="w-7 h-7 transform -rotate-90" viewBox="0 0 28 28">
                        <circle
                          cx="14"
                          cy="14"
                          r="12"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          className="text-gray-200"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="14"
                          cy="14"
                          r="12"
                          stroke="currentColor"
                          strokeWidth="2"
                          fill="none"
                          strokeLinecap="round"
                          className="text-emerald-500 transition-all duration-300 ease-out"
                          style={{
                            strokeDasharray: `${2 * Math.PI * 12}`,
                            strokeDashoffset: `${2 * Math.PI * 12 * (1 - (totalCount ? completedCount / totalCount : 0))}`
                          }}
                        />
                      </svg>
                      {/* Center percentage text */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-emerald-600">
                          {totalCount ? Math.round(completedCount / totalCount * 100) : 0}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">complete</span>
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
                  onClick={() => {
                    setSearch('');
                    setSelectedProviderType("__ALL__");
                    setPageIndex(0);
                  }}
                  variant="outline"
                  size="sm"
                  className="px-3"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => setIsColumnSidebarOpen(!isColumnSidebarOpen)}
                  variant="outline"
                  size="sm"
                  className="px-3 flex items-center gap-2"
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

          {/* AG Grid Table */}
          <div className="ag-theme-alpine w-full border border-gray-200 rounded-lg overflow-hidden" style={{ 
            height: '600px',
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
              suppressRowClickSelection={true}
              pagination={false}
              enableCellTextSelection={true}
              headerHeight={44}
              rowHeight={40}
              suppressDragLeaveHidesColumns={true}
              suppressScrollOnNewData={true}
              suppressColumnVirtualisation={false}
              suppressRowVirtualisation={false}
              suppressHorizontalScroll={false}
              maintainColumnOrder={true}
              getRowId={(params) => params.data.id}
              // Column sizing and auto-fit
              suppressColumnMoveAnimation={false}
              suppressRowHoverHighlight={false}
              suppressCellFocus={false}

              // Enable column auto-sizing
              onGridReady={(params) => {
                // Auto-size columns to fit content but respect max widths
                params.api.sizeColumnsToFit();
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
                  paddingRight: '12px'
                } 
              }}
              isRowSelectable={(rowNode) => {
                return Boolean(rowNode.data && rowNode.data.id);
              }}
              enableBrowserTooltips={true}
              enableRangeSelection={true}
              singleClickEdit={false}
              suppressClipboardPaste={false}
              suppressCopyRowsToClipboard={false}
              suppressMenuHide={false}
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
          /* Modern, subtle row selection styling - exclude checkbox column */
          .ag-theme-alpine .ag-row-selected .ag-cell:not(.ag-cell-range-selected):not([col-id="selected"]) {
            background-color: #f8fafc !important;
          }
          .ag-theme-alpine .ag-row-selected:hover .ag-cell:not(.ag-cell-range-selected):not([col-id="selected"]) {
            background-color: #f1f5f9 !important;
          }
          .ag-theme-alpine .ag-row:hover .ag-cell:not([col-id="selected"]) {
            background-color: #fafbfc !important;
          }
          /* Keep checkbox column unaffected by row selection */
          .ag-theme-alpine .ag-row-selected .ag-cell[col-id="selected"] {
            background-color: transparent !important;
          }
          /* Ensure text remains readable in selected rows */
          .ag-theme-alpine .ag-row-selected .ag-cell {
            color: #111827 !important;
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
          /* Ensure checkbox column doesn't have scrollbars */
          .ag-theme-alpine .ag-cell[col-id="selected"] {
            overflow: hidden !important;
          }
          .ag-theme-alpine .ag-cell[col-id="selected"]::-webkit-scrollbar {
            display: none !important;
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
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
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
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                    </svg>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {(columnPreferences?.columnPinning?.left || []).includes(field) 
                                      ? 'Click to unpin from left' 
                                      : (columnPreferences?.columnPinning?.right || []).includes(field)
                                      ? 'Click to unpin from right'
                                      : 'Click to pin left • Shift+click to pin right'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

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
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => {
                            // Close the sidebar and ensure preferences are saved
                            setIsColumnSidebarOpen(false);
                            // Show success message
                            toast.success('Column preferences saved successfully!');
                          }}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
                        >
                          Done
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Close column manager (Esc)</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
        

      </div>
    </div>
  );
} 