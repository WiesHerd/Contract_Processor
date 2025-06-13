import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertTriangle, FileDown, Loader2 } from 'lucide-react';
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
  const dispatch = useDispatch();
  const templates = useSelector((state: RootState) => state.templates.templates);
  const providers = useSelector((state: RootState) => state.providers.providers);
  const mappings = useSelector((state: RootState) => state.mappings.mappings);
  const selectedTemplate = useSelector((state: RootState) => state.generator.selectedTemplate);
  const selectedProvider = useSelector((state: RootState) => state.generator.selectedProvider);
  const isGenerating = useSelector((state: RootState) => state.generator.isGenerating);
  const error = useSelector((state: RootState) => state.generator.error);
  const generatedFiles = useSelector((state: RootState) => state.generator.generatedFiles);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
    const saved = localStorage.getItem('selectedTemplateId');
    return saved || '';
  });
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [userError, setUserError] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState('');
  const [editorModalOpen, setEditorModalOpen] = useState(false);

  // Persist selectedTemplateId in localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('selectedTemplateId', selectedTemplateId);
  }, [selectedTemplateId]);

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

  const handleGenerate = async () => {
    if (!selectedTemplate || selectedProviderIds.length !== 1) return;
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) return;
    const mapping = mappings[selectedTemplate.id];
    if (!mapping) {
      dispatch(setError('No mapping found for this template'));
      return;
    }
    console.log('Generating document with template:', selectedTemplate);
    console.log('Template docxTemplate key:', selectedTemplate.docxTemplate);
    try {
      dispatch(setGenerating(true));
      dispatch(setError(null));
      const blob = await generateDocument(selectedTemplate, provider, mapping);
      const url = URL.createObjectURL(blob);
      dispatch(addGeneratedFile({
        providerId: provider.id,
        fileName: `ScheduleB_${provider.name.replace(/\s+/g, '')}.docx`,
        url,
      }));
      downloadDocument(blob, provider);
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Failed to generate document'));
    } finally {
      dispatch(setGenerating(false));
    }
  };

  const handleBulkGenerate = async () => {
    setUserError(null);
    if (!selectedTemplate) {
      setUserError("No template selected. Please select a template before generating.");
      return;
    }
    const mapping = mappings[selectedTemplate.id]?.mappings;
    const selectedProviders = providers.filter(p => selectedProviderIds.includes(p.id));
    if (selectedProviders.length < 2) {
      setUserError('Please select at least two providers to use Generate All.');
      return;
    }
    try {
      // @ts-ignore
      if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
        setUserError('Failed to generate document. DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.');
        return;
      }
      for (const provider of selectedProviders) {
        const html = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || "";
        const { content: mergedHtml } = mergeTemplateWithData(selectedTemplate, provider, html, mapping);
        const htmlClean = normalizeSmartQuotes(mergedHtml);
        const calibriStyle = `<style>body, p, span, td, th, div { font-family: Calibri, Arial, sans-serif !important; font-size: 11pt !important; }</style>`;
        const htmlWithFont = calibriStyle + htmlClean;
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
      }
    } catch (error) {
      setUserError('Failed to generate one or more DOCX files. Please check your template and provider data.');
      console.error("Bulk DOCX Generation Error:", error);
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
    const { content: mergedHtml } = mergeTemplateWithData(selectedTemplate, provider, html, mapping);
    if (!mergedHtml || typeof mergedHtml !== 'string' || mergedHtml.trim().length === 0) {
      setUserError("No contract content available to export after merging. Please check your template and provider data.");
      return;
    }
    try {
      // Normalize mergedHtml
      const htmlClean = normalizeSmartQuotes(mergedHtml);
      // Prepend Calibri font style
      const calibriStyle = `<style>body, p, span, td, th, div { font-family: Calibri, Arial, sans-serif !important; font-size: 11pt !important; }</style>`;
      const htmlWithFont = calibriStyle + htmlClean;
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
    const specialty = provider.specialty?.toLowerCase() || '';
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
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      {/* Action Buttons at the Top */}
      <div className="flex gap-4 mb-4">
        <Button
          onClick={handleGenerateDOCX}
          disabled={!selectedTemplate || selectedProviderIds.length !== 1 || isGenerating}
          variant="outline"
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Generate Single
        </Button>
        <Button
          onClick={handleBulkGenerate}
          disabled={!selectedTemplate || selectedProviderIds.length < 2 || isGenerating}
          variant="outline"
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Generate All
        </Button>
        <Button
          onClick={() => setEditorModalOpen(true)}
          disabled={!selectedTemplate || selectedProviderIds.length !== 1}
          variant="default"
          className="gap-2"
        >
          Edit Contract
        </Button>
      </div>
      {/* Template Selector Full Width */}
      <Card className="p-4 w-full">
        <h2 className="text-lg font-semibold mb-4">Template</h2>
        <Select
          value={selectedTemplateId}
          onValueChange={setSelectedTemplateId}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map(template => (
              <SelectItem key={template.id} value={template.id}>
                {template.name} (v{template.version})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>
      {/* Filter/Search Bar and Pagination Controls Grouped */}
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
      {/* Provider Table with Multi-Select, Pagination, Sticky Name Column */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Providers</h2>
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
                  <TableCell>{provider.specialty}</TableCell>
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
      </Card>
      {/* Modal for TinyMCE editor */}
      <Dialog open={editorModalOpen} onOpenChange={setEditorModalOpen}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>Edit Contract</DialogTitle>
          </DialogHeader>
          <Editor
            apiKey="your-tinymce-api-key" // Replace with your actual API key
            value={editorContent}
            onEditorChange={setEditorContent}
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
            {/* Optionally add Save/Download here */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Error Message */}
      {(userError || error) && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg mt-4">
          <AlertTriangle className="h-5 w-5" />
          <span>{userError || error}</span>
        </div>
      )}
      {/* Generated Files Table */}
      {generatedFiles.length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Generated Files</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {generatedFiles.map((file: GeneratedFile) => {
                const provider = providers.find(p => p.id === file.providerId);
                return (
                  <TableRow key={file.providerId}>
                    <TableCell>{provider?.name}</TableCell>
                    <TableCell>{file.fileName}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = file.url;
                          link.download = file.fileName;
                          link.click();
                        }}
                      >
                        <FileDown className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
} 