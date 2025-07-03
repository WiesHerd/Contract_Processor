import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertTriangle, FileDown, Loader2, Info } from 'lucide-react';
import {
  setSelectedTemplate,
  setSelectedProvider,
  setGenerating,
  setError,
  addGeneratedFile,
  clearGeneratedFiles,
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

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [userError, setUserError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const editorRef = useRef<any>(null);
  const [clauseSearch, setClauseSearch] = useState('');

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
  const generateAndDownloadDocx = (provider: Provider) => {
    if (!selectedTemplate) return;
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
    const url = URL.createObjectURL(docxBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || selectedProviderIds.length !== 1) return;
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) return;
    generateAndDownloadDocx(provider);
  };

  const handleBulkGenerate = async () => {
    setUserError(null);
    if (!selectedTemplate) {
      setUserError("No template selected. Please select a template before generating.");
      return;
    }
    const selectedProviders = providers.filter(p => selectedProviderIds.includes(p.id));
    if (selectedProviders.length < 2) {
      setUserError('Please select at least two providers to use Generate All.');
      return;
    }
    selectedProviders.forEach(generateAndDownloadDocx);
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
    } catch (error) {
      setUserError("Failed to generate DOCX. Please ensure the template is properly initialized and html-docx-js is loaded.");
      console.error("DOCX Generation Error:", error);
    }
  };

  // Filtering logic (by name or specialty)
  const filteredProviders = providers.filter((provider) => {
    const name = provider.name?.toLowerCase() || '';
    const specialty = (provider as any).specialty?.toLowerCase() || '';
    const searchTerm = search.toLowerCase();
    return name.includes(searchTerm) || specialty.includes(searchTerm);
  });

  // Pagination logic
  const paginatedProviders = filteredProviders.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const totalPages = Math.ceil(filteredProviders.length / pageSize);

  // Table column headers (matching Providers screen)
  const columns = [
    { key: 'name', label: 'Provider Name', tooltip: 'Full provider name' },
    { key: 'specialty', label: 'Specialty', tooltip: 'Provider specialty' },
    { key: 'startDate', label: 'Start Date', tooltip: 'Contract start date' },
    { key: 'baseSalary', label: 'Base Salary', tooltip: 'Annual base salary' },
    { key: 'fte', label: 'FTE', tooltip: 'Full-Time Equivalent' },
  ];

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
          {/* Filter (left), pagination (right) */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-2">
            <div className="flex flex-col">
              <span className="mb-1 font-medium text-gray-700">Filter Providers</span>
              <Input
                placeholder="Search providers by name or specialty..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPageIndex(0);
                }}
                className="w-64"
              />
            </div>
            {/* Pagination Controls */}
            <div className="flex gap-2 items-center mt-2 sm:mt-0">
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
              <span className="text-sm">Page {pageIndex + 1} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
              <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
              <select
                className="ml-2 border rounded px-2 py-1 text-sm"
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(0);
                }}
              >
                {[10, 20, 50, 100].map(size => (
                  <option key={size} value={size}>{size} / page</option>
                ))}
              </select>
            </div>
          </div>
          {/* Provider Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      type="checkbox"
                      checked={paginatedProviders.length > 0 && paginatedProviders.every(p => selectedProviderIds.includes(p.id))}
                      onChange={() => {
                        const ids = paginatedProviders.map(p => p.id);
                        if (ids.every(id => selectedProviderIds.includes(id))) {
                          setSelectedProviderIds(selectedProviderIds.filter(id => !ids.includes(id)));
                        } else {
                          setSelectedProviderIds([...new Set([...selectedProviderIds, ...ids])]);
                        }
                      }}
                      aria-label="Select all providers"
                    />
                  </TableHead>
                  {columns.map(col => (
                    <TableHead
                      key={col.key}
                      className={col.key === 'name' ? 'sticky left-0 bg-white z-10' : ''}
                      style={col.key === 'name' ? { minWidth: 180, maxWidth: 240 } : { minWidth: 120 }}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProviders.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedProviderIds.includes(provider.id)}
                        onChange={() => toggleSelectProvider(provider.id)}
                        aria-label={`Select ${provider.name}`}
                      />
                    </TableCell>
                    <TableCell className="sticky left-0 bg-white z-10" style={{ minWidth: 180, maxWidth: 240 }}>{provider.name}</TableCell>
                    <TableCell>{(provider as any).specialty || 'N/A'}</TableCell>
                    <TableCell>{provider.startDate}</TableCell>
                    <TableCell>{provider.baseSalary ? `$${Number(provider.baseSalary).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : ''}</TableCell>
                    <TableCell>{provider.fte !== undefined ? Number(provider.fte).toFixed(2) : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="text-sm text-gray-600 mt-2">
            Showing {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filteredProviders.length)} of {filteredProviders.length} providers
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
                apiKey="your-tinymce-api-key"
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
      </div>
    </div>
  );
} 