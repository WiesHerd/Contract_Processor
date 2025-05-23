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

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [testMergeOpen, setTestMergeOpen] = useState(false);
  const [testMergeResult, setTestMergeResult] = useState<{ success: boolean; unresolved?: string[]; error?: string } | null>(null);
  const [testMergeLoading, setTestMergeLoading] = useState(false);

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
    if (!selectedTemplate) return;
    const mapping = mappings[selectedTemplate.id];
    if (!mapping) {
      dispatch(setError('No mapping found for this template'));
      return;
    }
    const selectedProviders = providers.filter(p => selectedProviderIds.includes(p.id));
    if (selectedProviders.length === 0) {
      dispatch(setError('Please select at least one provider.'));
      return;
    }
    try {
      dispatch(setGenerating(true));
      dispatch(setError(null));
      dispatch(clearGeneratedFiles());
      for (const provider of selectedProviders) {
        try {
          const blob = await generateDocument(selectedTemplate, provider, mapping);
          const url = URL.createObjectURL(blob);
          dispatch(addGeneratedFile({
            providerId: provider.id,
            fileName: `ScheduleB_${provider.name.replace(/\s+/g, '')}.docx`,
            url,
          }));
          downloadDocument(blob, provider);
        } catch (error) {
          console.error(`Failed to generate document for ${provider.name}:`, error);
        }
      }
    } catch (error) {
      dispatch(setError(error instanceof Error ? error.message : 'Failed to generate documents'));
    } finally {
      dispatch(setGenerating(false));
    }
  };

  // Test Merge Handler
  const handleTestMerge = async () => {
    if (!selectedTemplate || selectedProviderIds.length !== 1) return;
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) return;
    const mapping = mappings[selectedTemplate.id];
    if (!mapping) {
      setTestMergeResult({ success: false, error: 'No mapping found for this template' });
      setTestMergeOpen(true);
      return;
    }
    setTestMergeLoading(true);
    setTestMergeResult(null);
    try {
      if (!selectedTemplate.docxTemplate || typeof selectedTemplate.docxTemplate !== 'string') throw new Error('Invalid docxTemplate key');
      const blob = await localforage.getItem<Blob>(selectedTemplate.docxTemplate as string);
      if (!blob) throw new Error('DOCX file not found');
      const arrayBuffer = await blob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
      // Prepare data for merge
      const data: Record<string, any> = {};
      mapping.mappings.forEach((m: any) => {
        data[m.placeholder] = m.mappedColumn ? provider[m.mappedColumn] ?? '' : '';
      });
      doc.setData(data);
      doc.render();
      const text = doc.getFullText();
      const unresolved = Array.from(text.matchAll(/{{([^}]+)}}/g)).map(m => m[1]);
      if (unresolved.length > 0) {
        setTestMergeResult({ success: false, unresolved });
      } else {
        setTestMergeResult({ success: true });
      }
    } catch (err: any) {
      setTestMergeResult({ success: false, error: err.message });
    } finally {
      setTestMergeLoading(false);
      setTestMergeOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      {/* Debug info for selected template */}
      {selectedTemplate && (
        <div className="mb-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
          <div><b>Selected Template:</b> {selectedTemplate.name}</div>
          <div><b>DOCX Key:</b> {selectedTemplate.docxTemplate}</div>
        </div>
      )}
      {/* Action Buttons at the Top */}
      <div className="flex gap-4 mb-4">
        <Button
          onClick={handleGenerate}
          disabled={!selectedTemplate || selectedProviderIds.length !== 1 || isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Generate Single
            </>
          )}
        </Button>
        <Button
          onClick={handleBulkGenerate}
          disabled={!selectedTemplate || selectedProviderIds.length === 0 || isGenerating}
          variant="outline"
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating All...
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Generate All
            </>
          )}
        </Button>
        <Button
          onClick={handleTestMerge}
          disabled={!selectedTemplate || selectedProviderIds.length !== 1 || testMergeLoading}
          variant="secondary"
          className="gap-2"
        >
          {testMergeLoading ? 'Testing...' : 'Test Merge'}
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
      {/* Provider Table with Multi-Select */}
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Providers</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  aria-label="Select all providers"
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Specialty</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Base Salary</TableHead>
              <TableHead>FTE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider: Provider) => (
              <TableRow key={provider.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedProviderIds.includes(provider.id)}
                    onChange={() => toggleSelectProvider(provider.id)}
                    aria-label={`Select ${provider.name}`}
                  />
                </TableCell>
                <TableCell>{provider.name}</TableCell>
                <TableCell>{provider.specialty}</TableCell>
                <TableCell>{provider.startDate}</TableCell>
                <TableCell>{provider.baseSalary ? `$${provider.baseSalary.toLocaleString()}` : ''}</TableCell>
                <TableCell>{provider.fte}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
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
      {/* Test Merge Result Modal */}
      <Dialog open={testMergeOpen} onOpenChange={setTestMergeOpen}>
        <DialogContent className="max-w-lg" aria-describedby="test-merge-desc">
          <DialogHeader>
            <DialogTitle>Test Merge Result</DialogTitle>
          </DialogHeader>
          <div id="test-merge-desc" className="sr-only">
            This dialog shows the result of a test merge, including any unresolved placeholders or errors.
          </div>
          {testMergeResult?.success ? (
            <div className="text-green-700 font-semibold py-4">All placeholders are resolvable! Your contract is ready for generation.</div>
          ) : testMergeResult?.unresolved ? (
            <div className="text-red-600 py-2">
              <div className="font-semibold mb-2">Unresolved Placeholders:</div>
              <ul className="list-disc ml-6">
                {testMergeResult.unresolved.map(ph => (
                  <li key={ph}>{ph}</li>
                ))}
              </ul>
            </div>
          ) : testMergeResult?.error ? (
            <div className="text-red-600 py-2">Error: {testMergeResult.error}</div>
          ) : null}
          <DialogFooter className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setTestMergeOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 