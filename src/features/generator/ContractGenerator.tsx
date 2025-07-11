import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, FileDown, Loader2, Info, CheckCircle, XCircle, ChevronDown, ChevronUp, FileText, CheckSquare, Square, Search } from 'lucide-react';
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

  const [bulkClauseModalOpen, setBulkClauseModalOpen] = useState(false);
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
  const [statusTab, setStatusTab] = useState<'notGenerated' | 'pending' | 'processed' | 'all'>('notGenerated');

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

  // Multi-select handlers
  const allProviderIds = providers.map((p: Provider) => p.id);
  const allSelected = selectedProviderIds.length === allProviderIds.length && allProviderIds.length > 0;

  const toggleSelectAll = () => {
    setSelectedProviderIds(allSelected ? [] : allProviderIds);
  };

  const toggleSelectProvider = (id: string) => {
    setSelectedProviderIds(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  // Helper to generate and download DOCX for a provider
  const generateAndDownloadDocx = async (provider: Provider) => {
    if (!selectedTemplate) return;
    
    try {
    const html = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || "";
    const mapping = mappings[selectedTemplate.id]?.mappings;
    const { content: mergedHtml } = mergeTemplateWithData(selectedTemplate, provider, html, mapping);
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
      // 1. Save to S3
      let s3Url = '';
      try {
        // Convert Blob to File for saveContractFile
        const docxFile = new File([docxBlob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const contractId = provider.id + '-' + selectedTemplate.id + '-' + contractYear;
        await saveContractFile(docxFile, contractId, {
          providerId: provider.id,
          providerName: provider.name,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          contractYear,
        });
        // Get signed S3 download URL
        const { url: signedUrl } = await getContractFile(contractId, fileName);
        s3Url = signedUrl;
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

      // Log the generation event
      const logInput = {
        providerId: provider.id,
        contractYear: contractYear,
        templateId: selectedTemplate.id,
        generatedAt: new Date().toISOString(),
        generatedBy: 'user', // TODO: Get actual user ID
        outputType: 'DOCX',
        status: 'SUCCESS',
        fileUrl: s3Url || fileName, // Prefer S3 URL if available
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
        // Don't return here! Continue to audit log
      }
      // Always attempt to log to the main audit log, even if contractGenerationLogService fails
      console.log('Dispatching logSecurityEvent for contract generation', {provider, selectedTemplate, fileName, contractYear});
      try {
        const auditDetails = JSON.stringify({
          providerId: provider.id,
          providerName: provider.name,
          templateId: selectedTemplate.id,
          templateName: selectedTemplate.name,
          contractYear,
          fileUrl: s3Url || fileName,
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
            status: 'SUCCESS',
            outputType: 'DOCX',
            generatedAt: new Date().toISOString(),
          },
        }));
        console.log('logSecurityEvent dispatched, result:', result);
      } catch (auditLogError) {
        console.error('Error dispatching logSecurityEvent:', auditLogError);
      }
    } catch (error) {
      console.error('Error generating document:', error);
      setUserError('Failed to generate document. Please try again.');
      dispatch(addGeneratedContract({
        providerId: provider.id,
        templateId: selectedTemplate.id,
        status: 'FAILED',
        generatedAt: new Date().toISOString(),
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
    const { content: mergedHtml } = mergeTemplateWithData(selectedTemplate, provider, html, mapping);
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

  // AG Grid column definitions (with filtering and tooltip)
  const agGridColumnDefs = useMemo(() => [
    {
      headerName: '',
      field: 'checkbox',
      width: 48,
      pinned: 'left',
      suppressMenu: true,
      suppressMovable: true,
      suppressSizeToFit: true,
      lockPosition: true,
      lockPinned: true,
      resizable: false,
      sortable: false,
      filter: false,
      cellRenderer: (params: any) => (
        <div className="flex items-center h-full pl-2">
          <Checkbox
            checked={selectedProviderIds.includes(params.data.id)}
            onCheckedChange={() => {
              const id = params.data.id;
              setSelectedProviderIds(prev =>
                prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
              );
            }}
            aria-label={`Select ${params.data.name}`}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
        </div>
      ),
      headerComponent: (params: any) => {
        const headerCheckboxDivRef = useRef<HTMLDivElement>(null);
        const allChecked = paginatedProviders.length > 0 && paginatedProviders.every(p => selectedProviderIds.includes(p.id));
        const someChecked = paginatedProviders.some(p => selectedProviderIds.includes(p.id)) && !allChecked;
        useLayoutEffect(() => {
          if (headerCheckboxDivRef.current) {
            const input = headerCheckboxDivRef.current.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
            if (input) input.indeterminate = someChecked;
          }
        }, [someChecked]);
        return (
          <div ref={headerCheckboxDivRef} className="flex items-center h-full pl-2">
            <Checkbox
              checked={allChecked}
              onCheckedChange={() => {
                const ids = paginatedProviders.map(p => p.id);
                if (allChecked) {
                  setSelectedProviderIds(selectedProviderIds.filter(id => !ids.includes(id)));
                } else {
                  setSelectedProviderIds([...new Set([...selectedProviderIds, ...ids])]);
                }
              }}
              aria-label="Select all providers"
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
          </div>
        );
      },
      cellClass: 'ag-checkbox-cell',
      headerClass: 'ag-checkbox-header',
    },
    {
      field: 'name',
      headerName: 'Provider Name',
      minWidth: 180,
      pinned: 'left',
      valueFormatter: (params: any) => params.value || '',
      cellStyle: { fontWeight: 'bold', color: '#1f2937' },
      filter: 'agTextColumnFilter',
      tooltipField: 'name',
    },
    {
      field: 'employeeId',
      headerName: 'Employee ID',
      minWidth: 120,
      filter: 'agTextColumnFilter',
      tooltipField: 'employeeId',
    },
    {
      field: 'specialty',
      headerName: 'Specialty',
      minWidth: 120,
      valueFormatter: (params: any) => params.value || 'N/A',
      filter: 'agTextColumnFilter',
      tooltipField: 'specialty',
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      minWidth: 120,
      valueFormatter: (params: any) => formatDate(params.value),
      filter: 'agTextColumnFilter',
      tooltipField: 'startDate',
    },
    {
      field: 'baseSalary',
      headerName: 'Base Salary',
      minWidth: 120,
      valueFormatter: (params: any) => {
        if (!params.value) return '';
        return formatCurrency(params.value);
      },
      filter: 'agTextColumnFilter',
      tooltipField: 'baseSalary',
    },
    {
      field: 'fte',
      headerName: 'FTE',
      minWidth: 80,
      valueFormatter: (params: any) => {
        if (params.value === undefined || params.value === null) return '';
        return Number(params.value).toFixed(2);
      },
      filter: 'agNumberColumnFilter',
      tooltipField: 'fte',
    },
    { headerName: 'Provider Type', field: 'providerType', minWidth: 140, filter: true, sortable: true },
    { headerName: 'Subspecialty', field: 'subspecialty', minWidth: 140, filter: true, sortable: true },
    { headerName: 'Status', field: 'generationStatus', minWidth: 140, cellRenderer: (params: any) => {
      const status = params.value;
      const generationDate = getGenerationDate(params.data.id, selectedTemplate?.id || '');
      if (status === 'Success') {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-green-600 font-medium flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Success
            </span>
            {generationDate && (
              <span className="text-xs text-gray-500">
                {formatDate(generationDate.toISOString())}
              </span>
            )}
          </div>
        );
      }
      if (status === 'Failed') {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-red-600 font-medium flex items-center gap-1">
              <XCircle className="w-4 h-4" /> Failed
            </span>
            {generationDate && (
              <span className="text-xs text-gray-500">
                {formatDate(generationDate.toISOString())}
              </span>
            )}
          </div>
        );
      }
      if (status === 'Needs Review') {
        return (
          <div className="flex flex-col gap-1">
            <span className="text-yellow-600 font-medium flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Needs Review
            </span>
            {generationDate && (
              <span className="text-xs text-gray-500">
                {formatDate(generationDate.toISOString())}
              </span>
            )}
          </div>
        );
      }
      if (status === 'Not Generated') {
        return <span className="text-gray-400 font-medium flex items-center gap-1"><span className="w-4 h-4">—</span> Ready to Generate</span>;
      }
      return <span className="text-gray-500 font-medium flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Pending</span>;
    }, sortable: true },
    // --- Template Used column (only one)
    { headerName: 'Template Used', field: 'templateUsed', minWidth: 200, cellRenderer: (params: any) => (
      <span>{params.value || '—'}</span>
    ), sortable: true },
  ], [paginatedProviders, selectedProviderIds, setSelectedProviderIds]);

  // Prepare row data for AG Grid, including only templateUsed and generationStatus
  const agGridRows = paginatedProviders.map((provider: Provider) => {
    // Find the latest successful generated contract for this provider
    const latestSuccessContract = generatedContracts
      .filter(c => c.providerId === provider.id && c.status === 'SUCCESS')
      .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
    let templateUsed = '—';
    let generationStatus = 'Not Generated';
    if (latestSuccessContract) {
      const t = templates.find(t => t.id === latestSuccessContract.templateId);
      if (t) templateUsed = `${t.name} (v${t.version})`;
      else templateUsed = latestSuccessContract.templateId;
      generationStatus = 'Success';
    } else {
      generationStatus = 'Not Generated';
    }
    return {
      ...provider,
      templateUsed,
      generationStatus,
    };
  });

  // Compute counts for progress bar and stats
  const completedCount = agGridRows.filter(row => row.generationStatus === 'Success').length;
  const failedCount = agGridRows.filter(row => row.generationStatus === 'Failed').length;
  const notGeneratedCount = agGridRows.filter(row => row.generationStatus === 'Not Generated').length;
  const pendingCount = agGridRows.filter(row => row.generationStatus === 'Pending' || row.generationStatus === 'Needs Review').length;
  const totalCount = agGridRows.length;

  // CSV Export
  const handleExportCSV = () => {
    // Use all filtered providers, not just paginated
    const allRows = filteredProviders.map((provider: Provider) => {
      // Find the latest successful generated contract for this provider
      const latestSuccessContract = generatedContracts
        .filter(c => c.providerId === provider.id && c.status === 'SUCCESS')
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
      let templateUsed = '—';
      let generationStatus = 'Not Generated';
      if (latestSuccessContract) {
        const t = templates.find(t => t.id === latestSuccessContract.templateId);
        if (t) templateUsed = `${t.name} (v${t.version})`;
        else templateUsed = latestSuccessContract.templateId;
        generationStatus = 'Success';
      } else {
        generationStatus = 'Not Generated';
      }
      return {
        ...provider,
        templateUsed,
        generationStatus,
      };
    });
    // Use all columns, including Template Used
    const headers = agGridColumnDefs.filter(col => col.field && col.field !== 'checkbox').map(col => col.headerName);
    const rows = allRows.map(row =>
      agGridColumnDefs.filter(col => col.field && col.field !== 'checkbox').map(col => (row as any)[col.field] ?? '')
    );
    const csv = [headers, ...rows].map(r => r.map(String).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'providers.csv');
  };

  // After provider and template are selected and merged, set editorContent
  useEffect(() => {
    if (selectedTemplate && selectedProviderIds.length === 1) {
      const provider = providers.find(p => p.id === selectedProviderIds[0]);
      if (provider) {
        const html = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || '';
        const mapping = mappings[selectedTemplate.id]?.mappings;
        const { content: mergedHtml } = mergeTemplateWithData(selectedTemplate, provider, html, mapping);
        setEditorContent(mergedHtml);
      }
    }
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
  const clauseLibrary = clauses; // Use your clause library from Redux
  const selectedClause = clauseLibrary.find(c => c.id === selectedClauseId);

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
  const pendingRows = agGridRows.filter(row => row.generationStatus === 'Pending' || row.generationStatus === 'Needs Review');
  const processedRows = agGridRows.filter(row => row.generationStatus === 'Success');
  const notGeneratedRows = agGridRows.filter(row => row.generationStatus === 'Not Generated');
  const allRows = agGridRows;
  const tabCounts = {
    notGenerated: notGeneratedRows.length,
    pending: pendingRows.length,
    processed: processedRows.length,
    all: allRows.length,
  };
  const visibleRows = statusTab === 'notGenerated' ? notGeneratedRows : statusTab === 'pending' ? pendingRows : statusTab === 'processed' ? processedRows : allRows;

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
                            onClick={() => setBulkClauseModalOpen(true)}
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
                    <span className="text-xs text-gray-500">{`${failedCount} failed, ${pendingCount} pending`}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs for Pending / Processed / All */}
          <div className="mb-2 flex justify-between items-center">
            <Tabs value={statusTab} onValueChange={v => setStatusTab(v as 'notGenerated' | 'pending' | 'processed' | 'all')} className="w-full">
              <TabsList className="flex gap-2 border-b-0 bg-transparent justify-start relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[1.5px] after:bg-gray-200 after:z-10 overflow-visible">
                <TabsTrigger value="notGenerated" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                  data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                  data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                  Not Generated <span className="ml-1 text-xs">({tabCounts.notGenerated})</span>
                </TabsTrigger>
                <TabsTrigger value="pending" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                  data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                  data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                  Pending <span className="ml-1 text-xs">({tabCounts.pending})</span>
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
                  onClick={() => setSearch('')}
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
          <div className="ag-theme-alpine w-full" style={{ height: '600px' }}>
            <AgGridReact
              rowData={visibleRows}
              columnDefs={agGridColumnDefs as import('ag-grid-community').ColDef<ExtendedProvider, any>[]}
              domLayout="autoHeight"
              suppressRowClickSelection={true}
              rowSelection="multiple"
              pagination={false}
              enableCellTextSelection={true}
              headerHeight={40}
              rowHeight={36}
              suppressDragLeaveHidesColumns={true}
              suppressScrollOnNewData={true}
              suppressColumnVirtualisation={false}
              suppressRowVirtualisation={false}
              defaultColDef={{ tooltipValueGetter: params => params.value, resizable: true, sortable: true, filter: true, cellStyle: { fontSize: '14px', fontFamily: 'var(--font-sans, sans-serif)', fontWeight: 400, color: '#111827', display: 'flex', alignItems: 'center', height: '100%' } }}
              isRowSelectable={(rowNode) => {
                return Boolean(rowNode.data && rowNode.data.id);
              }}
              enableBrowserTooltips={true}
              enableRangeSelection={true}
              singleClickEdit={true}
              suppressClipboardPaste={false}
              suppressCopyRowsToClipboard={false}
            />
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Showing {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filteredProviders.length)} of {filteredProviders.length} providers
          </div>
          
          {/* Bottom Pagination Controls */}
          <div className="flex gap-2 items-center mt-2">
            <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
            <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
            <span className="text-sm px-4">Page {pageIndex + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
            <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
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
        {/* Modal for TinyMCE editor */}
        <Dialog open={editorModalOpen} onOpenChange={setEditorModalOpen}>
          <DialogContent className="max-w-6xl w-full flex flex-col md:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <DialogHeader>
                <DialogTitle>Edit Contract</DialogTitle>
              </DialogHeader>
              <Editor
                apiKey="hwuyiukhovfmwo28b4d5ktsw78kc9fu31gwdlqx9b4h2uv9b"
                value={editorContent}
                onEditorChange={setEditorContent}
                onInit={(_evt, editor) => (editorRef.current = editor)}
                init={{
                  height: 400,
                  menubar: false,
                  plugins: [
                    'lists link paste',
                  ],
                  toolbar:
                    'undo redo | bold italic underline | bullist numlist | link | removeformat',
                  branding: false,
                }}
              />
              <DialogFooter className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setEditorModalOpen(false)}>Cancel</Button>
                <Button
                  variant="default"
                  onClick={async () => {
                    // Download as Word logic using html-docx-js
                    const html = editorContent;
                    const provider = providers.find(p => p.id === selectedProviderIds[0]);
                    if (!provider) return;
                    // @ts-ignore
                    if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
                      alert('DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.');
                      return;
                    }
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
                    const htmlWithFont = aptosStyle + html;
                    // Get provider and template info for filename
                    const contractYear = selectedTemplate ? selectedTemplate.contractYear || new Date().getFullYear().toString() : new Date().getFullYear().toString();
                    const fileName = getContractFileName(contractYear, provider?.name || 'Provider', new Date().toISOString().split('T')[0]);
                    // @ts-ignore
                    const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
                    const url = URL.createObjectURL(docxBlob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fileName;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download as Word
                </Button>
              </DialogFooter>
            </div>
            {/* Clause Library Sidebar */}
            <aside className="w-full md:w-80 bg-gray-50 border-l p-4 rounded-lg flex flex-col">
              <h3 className="font-bold mb-2">Clause Library</h3>
              <input
                type="text"
                placeholder="Search clauses..."
                value={clauseSearch}
                onChange={e => setClauseSearch(e.target.value)}
                className="mb-3 px-2 py-1 border rounded"
              />
              {/* Scrollable clause list with fixed max height */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px]">
                {filteredClauses.map((clause: { id: string; title: string; content: string }) => (
                  <div key={clause.id} className="bg-white rounded shadow p-2 flex flex-col gap-1">
                    <div className="font-semibold text-sm">{clause.title}</div>
                    <div className="text-xs text-gray-600 line-clamp-2">{clause.content}</div>
                    <Button
                      size="sm"
                      className="mt-1 self-end"
                      onClick={() => {
                        if (editorRef.current) {
                          editorRef.current.insertContent(clause.content);
                        }
                      }}
                    >
                      Insert
                    </Button>
                  </div>
                ))}
                {filteredClauses.length === 0 && (
                  <div className="text-xs text-gray-400">No clauses found.</div>
                )}
              </div>
            </aside>
          </DialogContent>
        </Dialog>
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
              <Button
                onClick={() => setEditorModalOpen(true)}
                disabled={!selectedTemplate || selectedProviderIds.length !== 1}
                variant="outline"
                className="h-10 px-6 text-base font-semibold"
                aria-label="Edit Contract"
              >
                Edit Contract
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
          .ag-theme-alpine .ag-checkbox-input, .ag-theme-alpine input[type="checkbox"] {
            display: none !important;
          }
          .ag-checkbox-cell, .ag-checkbox-header {
            display: flex !important;
            align-items: center !important;
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
        <Dialog open={bulkClauseModalOpen} onOpenChange={setBulkClauseModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bulk Edit Clauses</DialogTitle>
            </DialogHeader>
            <div className="mb-4">
              <label className="block font-medium mb-1">Select Clause</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={selectedClauseId}
                onChange={e => setSelectedClauseId(e.target.value)}
              >
                <option value="">-- Select a clause --</option>
                {clauseLibrary.map(clause => (
                  <option key={clause.id} value={clause.id}>{clause.title}</option>
                ))}
              </select>
            </div>
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
            {selectedClause && (
              <div className="mb-4">
                <label className="block font-medium mb-1">Clause Preview</label>
                <div className="border rounded p-2 bg-gray-50 text-sm whitespace-pre-wrap">{selectedClause.content}</div>
              </div>
            )}
            <DialogFooter>
              <Button
                variant="default"
                onClick={() => {
                  // Save clause/placeholder selection for bulk generation
                  setBulkClauseModalOpen(false);
                  setBulkClausePreview(selectedClause?.content || '');
                  // Store selectedClauseId and selectedPlaceholder/customPlaceholder for use in bulk generation
                }}
                disabled={!selectedClauseId || (!selectedPlaceholder && !customPlaceholder)}
              >
                Apply to Selected
              </Button>
              <Button variant="outline" onClick={() => setBulkClauseModalOpen(false)}>Cancel</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
} 