import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import mammoth from 'mammoth';
import { addTemplate, updateTemplate, deleteTemplate, setTemplates, clearTemplates, hydrateTemplates } from './templatesSlice';
import { Template, TemplateType } from '@/types/template';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { TemplateUploadModal } from './components/TemplateUploadModal';
import type { UploadFormData } from './components/TemplateUploadModal';
import { saveDocxFile } from '@/utils/docxStorage';
import localforage from 'localforage';
import TemplatePreviewPanel from './components/TemplatePreviewPanel';

export default function TemplateManager() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const templates = useSelector((state: RootState) => state.templates.templates || []);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Memoize provider fields selector
  const providers = useSelector((state: RootState) => state.providers.providers || []);
  const providerFields = useMemo(() => 
    Array.isArray(providers) && providers.length > 0 ? Object.keys(providers[0]) : [],
    [providers]
  );
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPlaceholders, setUploadPlaceholders] = useState<string[]>([]);
  const [uploadArrayBuffer, setUploadArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  // Hydrate templates from localforage on mount
  useEffect(() => {
    dispatch(hydrateTemplates());
  }, [dispatch]);

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      version: '1.0.0',
      type: 'Base',
      content: '',
      lastModified: new Date().toISOString().split('T')[0],
      placeholders: [],
      docxTemplate: '',
      clauseIds: [],
    };
    setEditingTemplate(newTemplate);
    setIsCreating(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleDeleteTemplate = (id: string) => {
    dispatch(deleteTemplate(id));
  };

  const handleSaveTemplate = () => {
    if (!editingTemplate) return;

    // Validate template
    if (!editingTemplate.name) {
      setErrors({ name: 'Template name is required' });
      return;
    }

    if (!editingTemplate.content) {
      setErrors({ content: 'Template content is required' });
      return;
    }

    if (isCreating) {
      dispatch(addTemplate(editingTemplate));
    } else {
      dispatch(updateTemplate(editingTemplate));
    }

    setEditingTemplate(null);
    setErrors({});
  };

  // Handle DOCX upload and extract placeholders
  const handleDocxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.endsWith('.docx')) {
      alert('Please select a .docx file.');
      return;
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { value: text } = await mammoth.extractRawText({ arrayBuffer });
      const placeholderRegex = /{{([^}]+)}}/g;
      const placeholders = Array.from(text.matchAll(placeholderRegex))
        .map(match => match[1])
        .filter((value, index, self) => self.indexOf(value) === index);

      // Set all state before opening modal
      setUploadFile(file);
      setUploadPlaceholders(placeholders);
      setUploadArrayBuffer(arrayBuffer);
      setUploadModalOpen(true);
    } catch (err) {
      alert('Failed to parse DOCX file. Please ensure it is a valid Word document.');
      // Reset state on error
      setUploadFile(null);
      setUploadPlaceholders([]);
      setUploadArrayBuffer(null);
    }
  };

  const handleUploadModalSubmit = async (data: UploadFormData) => {
    if (!uploadFile || !uploadArrayBuffer) return;
    
    const templateId = uuidv4();
    // Store the file using the pluggable storage utility (localforage by default, swap for S3/cloud as needed)
    const docxKey = await saveDocxFile(new File([uploadArrayBuffer], uploadFile.name), templateId);

    // Convert DOCX to HTML for preview
    let htmlPreviewContent = '';
    try {
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer: uploadArrayBuffer });
      htmlPreviewContent = html;
    } catch (err) {
      htmlPreviewContent = '<div class="text-red-500">Failed to convert DOCX to HTML.</div>';
    }
    
    const newTemplate = {
      id: templateId,
      name: data.name,
      description: data.description,
      version: data.version,
      type: data.type as TemplateType,
      content: '', // Will be filled with extracted text if needed
      lastModified: new Date().toISOString().split('T')[0],
      placeholders: uploadPlaceholders,
      docxTemplate: docxKey,
      clauseIds: [],
      htmlPreviewContent, // Store HTML preview
    };
    
    dispatch(addTemplate(newTemplate));
    
    // Reset all upload state
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadPlaceholders([]);
    setUploadArrayBuffer(null);
    
    navigate(`/map-fields/${templateId}`);
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadPlaceholders([]);
    setUploadArrayBuffer(null);
  };

  // Delete all templates handler
  const handleDeleteAllTemplates = () => {
    if (window.confirm('Are you sure you want to delete ALL templates? This cannot be undone.')) {
      dispatch(clearTemplates());
      localforage.removeItem('templates').then(() => {
        alert('All templates and files have been deleted.');
        window.location.reload();
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-4 bg-white px-4 pt-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Template Manager</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your contract templates. Upload a DOCX to extract placeholders, or create a new template from scratch.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDeleteAllTemplates} className="text-red-600 border-red-300">Delete All Templates</Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            Upload DOCX
          </Button>
          <input
            type="file"
            accept=".docx"
            ref={fileInputRef}
            className="hidden"
            onChange={handleDocxUpload}
          />
        </div>
      </div>

      <div className="space-y-4">
        {Array.isArray(templates) && templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-3xl mb-2">📄</span>
            <span className="text-lg font-medium">No templates found</span>
            <span className="text-sm mt-1">Click <b>New Template</b> or <b>Upload DOCX</b> to get started.</span>
          </div>
        ) : (
          templates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm hover:bg-blue-50 transition"
            >
              <div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-gray-500">
                  Version {template.version} • {template.type} • Last modified {template.lastModified}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {template.placeholders.length} placeholders • {template.clauseIds.length} clauses
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  title="Preview"
                  onClick={() => setPreviewTemplateId(template.id)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={e => { e.stopPropagation(); handleEditTemplate(template); }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={e => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingTemplate && (
        <Dialog open={true} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-3xl w-full p-0 overflow-hidden">
            <div className="flex flex-col h-[80vh]">
              <div className="px-6 pt-6 pb-2 border-b">
                <DialogHeader>
                  <DialogTitle>
                    {isCreating ? 'Create Template' : 'Edit Template'}
                  </DialogTitle>
                </DialogHeader>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 px-6 py-4 overflow-y-auto">
                {/* Left sidebar - Template metadata */}
                <div className="col-span-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template Name</Label>
                    <Input
                      id="name"
                      value={editingTemplate.name}
                      onChange={e => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={editingTemplate.version}
                      onChange={e => setEditingTemplate(prev => prev ? { ...prev, version: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={editingTemplate.type}
                      onValueChange={(value: TemplateType) => setEditingTemplate(prev => prev ? { ...prev, type: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Base">Base</SelectItem>
                        <SelectItem value="Productivity">Productivity</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Hospital-based">Hospital-based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Right side - Content editor */}
                <div className="col-span-2 space-y-4">
                  <Label>Content</Label>
                  <div className="flex-1">
                    <ScrollArea className="h-full max-h-[420px] rounded-md border bg-white">
                      <textarea
                        className="w-full h-full min-h-[320px] max-h-[400px] p-4 font-mono text-sm resize-vertical border-none outline-none bg-transparent"
                        value={editingTemplate.content}
                        onChange={e => {
                          const content = e.target.value;
                          const placeholders = Array.from(content.matchAll(/{{([^}]+)}}/g))
                            .map(match => match[1])
                            .filter((value, index, self) => self.indexOf(value) === index);
                          setEditingTemplate(prev => prev ? { ...prev, content, placeholders } : null);
                        }}
                        placeholder="Enter template content..."
                      />
                    </ScrollArea>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t bg-white">
                <Button variant="outline" onClick={() => setEditingTemplate(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  Save Template
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {uploadModalOpen && uploadFile && (
        <TemplateUploadModal
          isOpen={uploadModalOpen}
          onClose={handleCloseUploadModal}
          file={uploadFile}
          placeholders={uploadPlaceholders}
          onSubmit={handleUploadModalSubmit}
        />
      )}
      {previewTemplateId && (
        <Dialog open={!!previewTemplateId} onOpenChange={() => setPreviewTemplateId(null)}>
          <DialogContent className="max-w-4xl">
            <TemplatePreviewPanel templateId={previewTemplateId} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
} 