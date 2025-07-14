import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FileDown, Loader2, Info, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, CheckSquare, Square, Search, Eye } from 'lucide-react';
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
import { saveContractFile, getContractFile } from '@/utils/s3Storage';
import { Progress } from '@/components/ui/progress';
import { Clause } from '@/types/clause';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ContractPreviewModal from './components/ContractPreviewModal';

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
  const [pageSize, setPageSize] = useState(40);
  const [userError, setUserError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const editorRef = useRef<any>(null);
  const [clauseSearch, setClauseSearch] = useState('');
  const [gridScrollWidth, setGridScrollWidth] = useState(0);
  const [gridClientWidth, setGridClientWidth] = useState(0);
  const [activeView, setActiveView] = useState<'generator' | 'logs'>('generator');

  const [selectedClauseId, setSelectedClauseId] = useState<string>('');
  const [selectedPlaceholder, setSelectedPlaceholder] = useState<string>('');
  const [customPlaceholder, setCustomPlaceholder] = useState<string>('');
  const [bulkClausePreview, setBulkClausePreview] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState("__ALL__");
  const [selectedSubspecialty, setSelectedSubspecialty] = useState("__ALL__");
  const [selectedProviderType, setSelectedProviderType] = useState("__ALL__");
  const [bulkOpen, setBulkOpen] = useState(true);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [statusTab, setStatusTab] = useState<'notGenerated' | 'processed' | 'all'>('notGenerated');
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

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
  const isUpdatingSelection = useRef(false);



  // Multi-select handlers
  const allProviderIds = providers.map((p: Provider) => p.id);
  const allSelected = selectedProviderIds.length === allProviderIds.length && allProviderIds.length > 0;
  const someSelected = selectedProviderIds.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedProviderIds([]);
      gridRef.current?.api.deselectAll();
    } else {
      setSelectedProviderIds(allProviderIds);
      gridRef.current?.api.selectAll();
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
      const contractYear = selectedTemplate?.contractYear || new Date().getFullYear().toString();
      const contractId = provider.id + '-' + templateId + '-' + contractYear;
      const fileName = getContractFileName(
        contractYear,
        provider.name,
        new Date().toISOString().split('T')[0]
      );
      
      // Try to get the contract file from S3
      const { url: downloadUrl } = await getContractFile(contractId, fileName);
      
      // Open download URL in new tab
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
      
    } catch (error) {
      console.error('Failed to download contract:', error);
      setUserError(`Failed to download contract for ${provider.name}. The file may no longer be available or there was an error accessing S3.`);
      
      // Try to regenerate the contract if download fails
      if (confirm(`Failed to download the contract. Would you like to regenerate it for ${provider.name}?`)) {
        await generateAndDownloadDocx(provider);
      }
    }
  };

  // Helper to generate and download DOCX for a provider
  const generateAndDownloadDocx = async (provider: Provider) => {
    if (!selectedTemplate) return;
    
    try {
      const html = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || "";
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
      const contractYear = selectedTemplate.contractYear || new Date().getFullYear().toString();
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
        const contractId = provider.id + '-' + selectedTemplate.id + '-' + contractYear;
        
        // Save to S3
        s3Key = await saveContractFile(docxFile, contractId, {
          providerId: provider.id,
          providerName: provider.name,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
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
        templateId: selectedTemplate.id,
        generatedAt: new Date().toISOString(),
        generatedBy: 'user', // TODO: Get actual user ID
        outputType: 'DOCX',
        status: 'SUCCESS',
        fileUrl: s3Url || fileName, // Prefer S3 URL if available
        notes: `Generated contract for ${provider.name} using template ${selectedTemplate.name}${s3Key ? ` (S3 Key: ${s3Key})` : ''}`
      };

      try {
        const logEntry = await ContractGenerationLogService.createLog(logInput);
        dispatch(addGenerationLog(logEntry));
        dispatch(addGeneratedContract({
          providerId: provider.id,
          templateId: selectedTemplate.id,
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
      console.log('Dispatching logSecurityEvent for contract generation', {provider, selectedTemplate, fileName, contractYear});
      try {
        const auditDetails = JSON.stringify({
          providerId: provider.id,
          providerName: provider.name,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
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
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
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
            templateId: selectedTemplate.id,
            templateName: selectedTemplate.name,
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
        templateId: selectedTemplate.id,
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
    if (!selectedTemplate || selectedProviderIds.length !== 1) return;
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) return;
    await generateAndDownloadDocx(provider);
    await hydrateGeneratedContracts();
  };

  const handleBulkGenerate = async () => {
    setUserError(null);
    setIsBulkGenerating(true);
    if (!selectedTemplate) {
      setUserError("No template selected. Please select a template before generating.");
      setIsBulkGenerating(false);
      return;
    }
    // Use all filtered providers, not just paginated
    const selectedProviders = filteredProviders.filter(p => selectedProviderIds.includes(p.id));
    if (selectedProviders.length < 2) {
      setUserError('Please select at least two providers to use Generate All.');
      setIsBulkGenerating(false);
      return;
    }
    let successCount = 0;
    let failCount = 0;
    for (const provider of selectedProviders) {
      try {
        await generateAndDownloadDocx(provider);
        successCount++;
      } catch (err) {
        failCount++;
      }
    }
    setIsBulkGenerating(false);
    await hydrateGeneratedContracts();
    if (failCount === 0) {
      setUserError(null);
      alert(`Successfully generated contracts for ${successCount} providers.`);
    } else {
      setUserError(`Generated contracts for ${successCount} providers. ${failCount} failed. See logs for details.`);
    }
  };

  const handlePreview = () => {
    if (!selectedTemplate) {
      setUserError("Please select a template before previewing.");
      return;
    }
    if (selectedProviderIds.length === 0) {
      setUserError("Please select at least one provider to preview.");
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

  const handleRetryFailed = async () => {
    setIsBulkGenerating(true);
    const failedProviders = providers.filter(p => {
      const contract = generatedContracts.find(c => c.providerId === p.id && c.templateId === (selectedTemplate?.id || ''));
      return contract && contract.status === 'FAILED';
    });
    for (const provider of failedProviders) {
      await generateAndDownloadDocx(provider);
    }
    setIsBulkGenerating(false);
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

  // Pagination logic
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
  const baseColumns = [
    {
      headerName: '',
      field: 'selected',
      width: 50,
      checkboxSelection: true,
      headerCheckboxSelection: true,
      pinned: 'left',
      suppressMenu: true,
      sortable: false,
      filter: false,
      resizable: false,
    },
    {
      headerName: 'Provider Name',
      field: 'name',
      width: 200,
      pinned: 'left',
      cellRenderer: (params: any) => (
        <div className="font-medium text-gray-900">{params.value}</div>
      ),
      filter: 'agTextColumnFilter',
      tooltipField: 'name',
    },
    {
      headerName: 'Employee ID',
      field: 'employeeId',
      width: 120,
      filter: 'agTextColumnFilter',
      tooltipField: 'employeeId',
    },
    {
      headerName: 'Specialty',
      field: 'specialty',
      width: 150,
      filter: 'agTextColumnFilter',
      tooltipField: 'specialty',
    },
    {
      headerName: 'Subspecialty',
      field: 'subspecialty',
      width: 150,
      filter: 'agTextColumnFilter',
      tooltipField: 'subspecialty',
    },
    {
      headerName: 'Provider Type',
      field: 'providerType',
      width: 120,
      filter: 'agTextColumnFilter',
      tooltipField: 'providerType',
    },
    {
      headerName: 'Administrative Role',
      field: 'administrativeRole',
      width: 150,
      filter: 'agTextColumnFilter',
      tooltipField: 'administrativeRole',
    },
    {
      headerName: 'Base Salary',
      field: 'baseSalary',
      width: 120,
      valueFormatter: (params: any) => formatCurrency(params.value),
      filter: 'agNumberColumnFilter',
      tooltipValueGetter: (params: any) => formatCurrency(params.value),
    },
    {
      headerName: 'FTE',
      field: 'fte',
      width: 80,
      valueFormatter: (params: any) => formatNumber(params.value),
      filter: 'agNumberColumnFilter',
      tooltipValueGetter: (params: any) => formatNumber(params.value),
    },
    {
      headerName: 'Start Date',
      field: 'startDate',
      width: 130,
      valueFormatter: (params: any) => formatDate(params.value),
      filter: 'agDateColumnFilter',
      tooltipValueGetter: (params: any) => formatDate(params.value),
    },
    {
      field: 'compensationModel',
      headerName: 'Compensation Model',
      width: 160,
      valueGetter: (params: any) => {
        const provider = params.data;
        return provider.compensationModel || provider.compensationType || provider.CompensationModel || '';
      },
      filter: 'agTextColumnFilter',
      tooltipField: 'compensationModel',
    },
  ];

  // Generation Status column (only for All tab)
  const generationStatusColumn = {
    headerName: 'Generation Status',
    field: 'generationStatus',
    width: 150,
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
    width: 140,
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
      if (selectedTemplate && selectedProviderIds.length === 1) {
        const provider = providers.find(p => p.id === selectedProviderIds[0]);
        if (provider) {
          const html = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || '';
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
          setEditorContent(mergedHtml);
        }
      }
    };
    
    updateEditorContent();
  }, [selectedTemplate, selectedProviderIds, providers, mappings]);

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

  // Bulk Edit Clauses modal logic
  const availablePlaceholders = useMemo(() => {
    if (!selectedTemplate) return [];
    const content = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || '';
    return scanPlaceholders(content);
  }, [selectedTemplate]);

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

  // Compute filtered rows for each tab
  const processedRows = agGridRows.filter(row => row.generationStatus === 'Success');
  const notGeneratedRows = agGridRows.filter(row => row.generationStatus === 'Not Generated');
  const allRows = agGridRows;
  const tabCounts = {
    notGenerated: notGeneratedRows.length,
    processed: processedRows.length,
    all: allRows.length,
  };
  const visibleRows = statusTab === 'notGenerated' ? notGeneratedRows : statusTab === 'processed' ? processedRows : allRows;

  // Sync AG Grid selection with selectedProviderIds state
  useEffect(() => {
    if (gridRef.current?.api) {
      const api = gridRef.current.api;
      
      // Get currently selected nodes
      const currentlySelected = api.getSelectedNodes().map(node => node.data.id);
      
      // Only update if there's actually a difference
      const shouldUpdate = selectedProviderIds.length !== currentlySelected.length ||
        selectedProviderIds.some(id => !currentlySelected.includes(id)) ||
        currentlySelected.some(id => !selectedProviderIds.includes(id));
      
      if (shouldUpdate) {
        // Set flag to prevent onSelectionChanged from firing
        isUpdatingSelection.current = true;
        
        // Clear all selections first
        api.deselectAll();
        
        // Select rows that should be selected
        selectedProviderIds.forEach(id => {
          const rowNode = api.getRowNode(id);
          if (rowNode) {
            rowNode.setSelected(true);
          }
        });
        
        // Reset flag after a short delay
        setTimeout(() => {
          isUpdatingSelection.current = false;
        }, 50);
      }
    }
  }, [selectedProviderIds, visibleRows]);

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
                            templates.map((template: any) => (
                              <SelectItem key={template.id} value={template.id}>
                                {template.name} (v{template.version})
                              </SelectItem>
                            ))
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
          <div className="flex flex-col gap-4 mb-2">
            {/* Bulk Processing Section */}
            <div className="rounded-xl border border-blue-100 bg-gray-50 shadow-sm p-0 transition-all duration-300 ${bulkOpen ? 'pb-6' : 'pb-0'}">
              <div className="flex items-center gap-3 px-6 pt-6 pb-2 cursor-pointer select-none" onClick={() => setBulkOpen(v => !v)}>
                <span className="text-blue-600 text-2xl">⚡</span>
                <span className="font-bold text-lg text-blue-900 tracking-wide">Bulk Processing</span>
                <button
                  className="ml-2 p-1 rounded hover:bg-blue-100 transition-colors"
                  aria-label={bulkOpen ? 'Collapse' : 'Expand'}
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); setBulkOpen(v => !v); }}
                  type="button"
                >
                  {bulkOpen ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
                </button>
              </div>
              <div className={`overflow-hidden transition-all duration-300 ${bulkOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 gap-2 px-6">
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
                        {specialtyOptions.map(s => (
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
                        {subspecialtyOptions.map(s => (
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
                        {providerTypeOptions.map(s => (
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
                </div>
                <div className="border-t border-blue-100 my-2 mx-6" />
                {/* Bulk Action Buttons and Progress */}
                <div className="flex flex-col gap-2 px-6">
                  <span className="font-semibold text-blue-900 text-sm tracking-wide mb-1">Bulk Actions</span>
                  <div className="flex flex-wrap gap-2 items-center">
                    {/* Primary Actions */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedProviderIds(paginatedProviders.map((p: Provider) => p.id))}
                            disabled={paginatedProviders.length === 0 || isBulkGenerating}
                          >
                            Select All Visible
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Select all providers currently visible in the table</TooltipContent>
                      </Tooltip>



                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRetryFailed}
                            disabled={isBulkGenerating || !generatedContracts.some(c => c.status === 'FAILED')}
                          >
                            Retry Failed
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Retry contract generation for all providers with failed status</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {/* Divider for secondary actions */}
                    <span className="mx-2 text-gray-300 select-none">|</span>
                    {/* Secondary Actions */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedClauseId(selectedClauseId)}
                            disabled={selectedProviderIds.length === 0 || isBulkGenerating}
                          >
                            Bulk Edit Clauses
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Insert or edit clauses for all selected providers</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCSV}
                            disabled={isBulkGenerating}
                          >
                            Export to CSV
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Export the current filtered provider list to CSV</TooltipContent>
                      </Tooltip>
                      {statusTab === 'processed' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleClearGenerated}
                              disabled={selectedProviderIds.length === 0 || isBulkGenerating}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                            >
                              Clear Generated
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Clear generated contracts for selected providers</TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                    {isBulkGenerating && (
                      <span className="ml-4 flex items-center gap-2 text-blue-700 animate-pulse">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing bulk generation...
                      </span>
                    )}
                  </div>
                  {/* Progress Bar and Status */}
                  <div className="flex flex-1 sm:justify-end items-center gap-4 min-w-0 mt-2">
                    <Progress value={completedCount / totalCount * 100} className="w-48 h-2" />
                    <span className="text-sm text-gray-600">{`${completedCount} of ${totalCount} generated (${totalCount ? Math.round(completedCount / totalCount * 100) : 0}%)`}</span>
                    <span className="text-xs text-gray-500">{`${failedCount} failed`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs for Pending / Processed / All */}
          <div className="mb-2 flex justify-between items-center">
            <Tabs value={statusTab} onValueChange={v => setStatusTab(v as 'notGenerated' | 'processed' | 'all')} className="w-full">
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
                    {providerTypeOptions.map(s => (
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
              rowSelection="multiple"
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
              onSelectionChanged={(event) => {
                if (!isUpdatingSelection.current) {
                  const selectedNodes = event.api.getSelectedNodes();
                  const selectedIds = selectedNodes.map(node => node.data.id);
                  setSelectedProviderIds(selectedIds);
                }
              }}
              onGridReady={(params) => {
                // Store grid API reference for later use
                setTimeout(() => {
                  // Sync initial selection state when grid is ready (with small delay)
                  const rowsToSelect = visibleRows.filter(row => selectedProviderIds.includes(row.id));
                  rowsToSelect.forEach(row => {
                    const rowNode = params.api.getRowNode(row.id);
                    if (rowNode) {
                      rowNode.setSelected(true);
                    }
                  });
                }, 100);
              }}
              defaultColDef={{ 
                tooltipValueGetter: params => params.value, 
                resizable: true, 
                sortable: true, 
                filter: true, 
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
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {Math.min(visibleRows.length, pageSize * (pageIndex + 1) - pageSize + 1)}–{Math.min(visibleRows.length, pageSize * (pageIndex + 1))} of {visibleRows.length} providers
            </div>
            
            {/* Bottom Pagination Controls - Left aligned */}
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
              <span className="text-sm px-4">Page {pageIndex + 1} of {Math.max(1, Math.ceil(visibleRows.length / pageSize))}</span>
              <Button variant="outline" size="sm" disabled={pageIndex >= Math.ceil(visibleRows.length / pageSize) - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex >= Math.ceil(visibleRows.length / pageSize) - 1} onClick={() => setPageIndex(Math.ceil(visibleRows.length / pageSize) - 1)}>&raquo;</Button>
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

        {/* Sticky Action Bar */}
        {selectedProviderIds.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full z-50 bg-white border-t shadow-lg flex flex-col md:flex-row md:justify-center items-center py-4 transition-all duration-300 animate-fade-in">
            <div className="mb-2 md:mb-0 md:mr-6 text-gray-700 font-medium">
              {selectedProviderIds.length === 1
                ? `Selected: ${providers.find(p => p.id === selectedProviderIds[0])?.name || '1 provider'}`
                : `${selectedProviderIds.length} providers selected`}
            </div>
            <div className="flex gap-4">
              {/* Clear Selection Button */}
              <div className="flex items-center">
                <Button
                  onClick={() => setSelectedProviderIds([])}
                  variant="outline"
                  className="h-10 px-6 text-base font-semibold"
                  aria-label="Clear Selection"
                  type="button"
                >
                  Clear Selection
                </Button>
              </div>
              
              {/* Preview Button */}
              <Button
                onClick={handlePreview}
                disabled={!selectedTemplate || selectedProviderIds.length === 0 || isGenerating}
                variant="outline"
                className="h-10 px-6 text-base font-semibold flex items-center gap-2"
                aria-label="Preview Contract"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              
              <Button
                onClick={handleGenerate}
                disabled={!selectedTemplate || selectedProviderIds.length !== 1 || isGenerating}
                variant={selectedProviderIds.length === 1 ? 'default' : 'outline'}
                className="h-10 px-6 text-base font-semibold flex items-center gap-2"
                aria-label="Generate Single"
              >
                {isGenerating && selectedProviderIds.length === 1 ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : null}
                Generate Single
              </Button>
              <Button
                onClick={handleBulkGenerate}
                disabled={!selectedTemplate || selectedProviderIds.length < 2 || isGenerating}
                variant={selectedProviderIds.length > 1 ? 'default' : 'outline'}
                className="h-10 px-6 text-base font-semibold flex items-center gap-2"
                aria-label="Generate All"
              >
                {isGenerating && selectedProviderIds.length > 1 ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : null}
                Generate All
              </Button>
            </div>
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
        `}</style>
        {/* Bulk Edit Clauses modal */}
        <Dialog open={selectedClauseId !== ""} onOpenChange={() => setSelectedClauseId("")}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Edit Clauses</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <label className="block font-medium mb-1">Select Insertion Point</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={selectedPlaceholder}
                onChange={e => setSelectedPlaceholder(e.target.value)}
              >
                <option value="">-- Select a placeholder --</option>
                {availablePlaceholders.map(ph => (
                  <option key={ph} value={ph}>{`{{${ph}}}`}</option>
                ))}
                <option value="custom">Custom...</option>
              </select>
              {selectedPlaceholder === 'custom' && (
                <input
                  className="w-full border rounded px-2 py-1 mt-2"
                  placeholder="Enter custom placeholder (e.g., CustomClause1)"
                  value={customPlaceholder}
                  onChange={e => setCustomPlaceholder(e.target.value)}
                />
              )}
            </div>
            {selectedClauseId !== "" && (
              <div className="mb-4">
                <label className="block font-medium mb-1">Clause Preview</label>
                <div className="border rounded p-2 bg-gray-50 text-sm whitespace-pre-wrap">{selectedClauseId}</div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="default"
                onClick={() => {
                  // Save clause/placeholder selection for bulk generation
                  setSelectedClauseId(selectedClauseId);
                  setBulkClausePreview(selectedClauseId);
                  // Store selectedClauseId and selectedPlaceholder/customPlaceholder for use in bulk generation
                }}
                disabled={!selectedPlaceholder && !customPlaceholder}
              >
                Apply to Selected
              </Button>
              <Button variant="outline" onClick={() => setSelectedClauseId("")}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contract Preview Modal */}
        <ContractPreviewModal
          open={previewModalOpen}
          onClose={() => setPreviewModalOpen(false)}
          template={selectedTemplate}
          providers={providers}
          selectedProviderIds={selectedProviderIds}
          onGenerate={handlePreviewGenerate}
          onBulkGenerate={handleBulkGenerate}
        />
        

      </div>
    </div>
  );
} 