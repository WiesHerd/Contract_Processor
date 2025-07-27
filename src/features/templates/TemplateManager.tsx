// Template loading fix deployment - 2025-07-27T16:02:48.482Z
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Edit, Eye, Info, Download, MoreHorizontal, FileText, Calendar, Tag, Check, X, Save, Edit3, Upload } from 'lucide-react';
import mammoth from 'mammoth';
import { addTemplate, updateTemplate, deleteTemplate, setTemplates, clearTemplates, hydrateTemplates, hydrateTemplatesFromS3, fetchTemplatesIfNeeded, deleteAllTemplates } from './templatesSlice';
import { Template, TemplateType } from '@/types/template';
import { RootState } from '@/store';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { TemplateUploadModal } from './components/TemplateUploadModal';
import type { UploadFormData } from './components/TemplateUploadModal';
import { saveDocxFile } from '@/utils/docxStorage';
import localforage from 'localforage';
import TemplatePreviewPanel from './components/TemplatePreviewPanel';
import { PageHeader } from '@/components/PageHeader';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { debugS3Contents } from '@/utils/s3Storage';

// FORCE DEPLOYMENT - Template loading fix v1.3 - Fixed S3 authentication
console.log('🚀 TEMPLATE MANAGER LOADED - DEPLOYMENT V1.3 - S3 AUTH FIX');

export default function TemplateManager() {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const templates = useSelector((state: RootState) => state.templates.templates || []);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Inline editing state
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Template>>({});
  
  // Memoize provider fields selector
  const providers = useSelector((state: RootState) => state.provider.providers || []);
  const providerFields = useMemo(() => 
    Array.isArray(providers) && providers.length > 0 ? Object.keys(providers[0]) : [],
    [providers]
  );
  
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPlaceholders, setUploadPlaceholders] = useState<string[]>([]);
  const [uploadArrayBuffer, setUploadArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Delete all templates handler
  const [deletingAll, setDeletingAll] = useState(false);
  const handleDeleteAllTemplates = async () => {
    if (window.confirm('Are you sure you want to delete ALL templates? This cannot be undone.')) {
      setDeletingAll(true);
      try {
        await dispatch(deleteAllTemplates()).unwrap();
        alert('All templates have been deleted from the backend and view.');
      } catch (error) {
        alert('Failed to delete all templates. Please try again.');
      } finally {
        setDeletingAll(false);
      }
    }
  };

  useEffect(() => {
    // Debug S3 contents in production
    if (process.env.NODE_ENV === 'production') {
      debugS3Contents();
    }
    dispatch(fetchTemplatesIfNeeded());
  }, [dispatch]);

  const handleCreateTemplate = () => {
    const now = new Date().toISOString();
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
      version: '1.0.0',
      compensationModel: 'BASE',
      content: '',
      metadata: {
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        lastModifiedBy: 'system',
      },
      placeholders: [],
      docxTemplate: '',
      clauseIds: [],
      tags: [],
      clauses: [],
      versionHistory: [],
    };
    setEditingTemplate(newTemplate);
    setIsCreating(true);
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      dispatch(deleteTemplate(id));
    }
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

  // Inline editing functions
  const startInlineEdit = (template: Template) => {
    setEditingRow(template.id);
    setEditData({
      name: template.name,
      description: template.description,
      version: template.version,
      compensationModel: template.compensationModel,
      contractYear: template.contractYear,
    });
  };

  const saveInlineEdit = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const updatedTemplate: Template = {
      ...template,
      ...editData,
      metadata: {
        ...template.metadata,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'system',
      },
    };

    try {
      dispatch(updateTemplate(updatedTemplate));
      setEditingRow(null);
      setEditData({});
    } catch (error) {
      console.error('Failed to update template:', error);
      alert('Failed to update template. Please try again.');
    }
  };

  const cancelInlineEdit = () => {
    setEditingRow(null);
    setEditData({});
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
    console.log('Submitting template data:', data);

    // For edit mode, we don't need a file or buffer since we're just updating metadata
    if (isEditing && editingTemplate) {
      // Handle edit mode - update existing template
      try {
        const now = new Date().toISOString();
        const updatedTemplate: Template = {
          ...editingTemplate,
          name: data.name,
          description: data.description,
          version: data.version,
          compensationModel: data.type as TemplateType,
          contractYear: data.contractYear,
          metadata: {
            ...editingTemplate.metadata,
            updatedAt: now,
            lastModifiedBy: 'system',
          },
        };
        
        console.log('Dispatching updateTemplate with updated template:', updatedTemplate);
        dispatch(updateTemplate(updatedTemplate));
        
        console.log('Resetting form...');
        setUploadModalOpen(false);
        setEditingTemplate(null);
        setIsEditing(false);
        setUploadFile(null);
        setUploadPlaceholders([]);
        setUploadArrayBuffer(null);
        console.log('Edit submission process complete.');
        return;
      } catch (error) {
        console.error('An error occurred during template update:', error);
        alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }

    // Handle create mode - original logic
    if (!uploadFile || !uploadArrayBuffer) {
      console.error('Upload file or buffer is missing.');
      alert('An error occurred. The file to upload is missing.');
      return;
    }
    console.log('File and buffer are present. Proceeding to save.');

    try {
      const now = new Date().toISOString();
      const templateId = uuidv4();
      
      console.log(`Saving DOCX with templateId: ${templateId}`);
      const docxKey = await saveDocxFile(new File([uploadArrayBuffer], uploadFile.name), templateId);
      console.log(`DOCX saved to S3 with key: ${docxKey}`);

      let htmlPreviewContent = '';
      try {
        const { value: html } = await mammoth.convertToHtml({ arrayBuffer: uploadArrayBuffer });
        htmlPreviewContent = html;
        console.log('Successfully converted DOCX to HTML for preview.');
      } catch (err) {
        console.error('Error converting DOCX to HTML:', err);
        htmlPreviewContent = '<div class="text-red-500">Failed to convert DOCX to HTML.</div>';
      }

      const newTemplate: Template = {
        id: templateId,
        name: data.name,
        description: data.description,
        version: data.version,
        compensationModel: data.type as TemplateType,
        content: '', // Not used for DOCX templates
        metadata: {
          createdAt: now,
          updatedAt: now,
          createdBy: 'system', // Replace with actual user later
          lastModifiedBy: 'system',
        },
        placeholders: uploadPlaceholders,
        docxTemplate: docxKey, // This is the S3 key
        clauseIds: [],
        htmlPreviewContent,
        contractYear: data.contractYear,
        tags: [],
        clauses: [],
        versionHistory: [],
      };
      
      console.log('Dispatching addTemplate with new template:', newTemplate);
      dispatch(addTemplate(newTemplate));
      
      console.log('Resetting form and navigating...');
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadPlaceholders([]);
      setUploadArrayBuffer(null);
      navigate(`/map-fields/${templateId}`);
      console.log('Submission process complete.');
    } catch (error) {
      console.error('An error occurred during template submission:', error);
      alert(`An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloseUploadModal = () => {
    setUploadModalOpen(false);
    setUploadFile(null);
    setUploadPlaceholders([]);
    setUploadArrayBuffer(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTemplateTypeColor = (type: TemplateType) => {
    switch (type) {
      case 'BASE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PRODUCTIVITY':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'HYBRID':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'HOSPITALIST':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'LEADERSHIP':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTemplateTypeLabel = (type: TemplateType) => {
    switch (type) {
      case 'BASE':
        return 'BASE';
      case 'PRODUCTIVITY':
        return 'PRODUCTIVITY';
      case 'HYBRID':
        return 'HYBRID';
      case 'HOSPITALIST':
        return 'HOSPITALIST';
      case 'LEADERSHIP':
        return 'LEADERSHIP';
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">Template Manager</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    Manage your contract templates. Click on any field to edit inline, or use the action buttons for more options.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          <hr className="my-3 border-gray-100" />
          <div className="flex flex-wrap items-center gap-3 justify-end">
            <Button variant="outline" onClick={handleDeleteAllTemplates} className="text-red-600 border-red-300 hover:bg-red-50" disabled={deletingAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              {deletingAll ? 'Deleting...' : 'Delete All Templates'}
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Upload className="w-4 h-4 mr-2" />
              Upload DOCX
            </Button>
            <input
              type="file"
              accept=".docx"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleDocxUpload}
            />
          </div>
        </div>

        <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {Array.isArray(templates) && templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <FileText className="w-16 h-16 mb-4 text-gray-300" />
              <span className="text-lg font-medium text-gray-500">No templates found</span>
              <span className="text-sm mt-2 text-gray-400">Click <b>Upload DOCX</b> to get started with your first template.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-700 px-6 py-4">Template Name</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-4 py-4">Type</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-4 py-4">Version</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-4 py-4">Contract Year</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-4 py-4">Placeholders</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-4 py-4">Last Modified</TableHead>
                    <TableHead className="font-semibold text-gray-700 px-4 py-4 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template, index) => {
                    const isEditing = editingRow === template.id;
                    return (
                      <TableRow
                        key={template.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 transition-colors duration-150 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        } ${isEditing ? 'bg-blue-50 border-blue-200' : ''}`}
                      >
                        <TableCell className="px-6 py-4 align-middle">
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <Input
                                  value={editData.name || ''}
                                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                  className="h-8 text-sm"
                                  placeholder="Template name"
                                />
                                <Input
                                  value={editData.description || ''}
                                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                  className="h-8 text-sm"
                                  placeholder="Description (optional)"
                                />
                              </div>
                            ) : (
                              <>
                                <div
                                  className="text-sm font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                  onClick={() => startInlineEdit(template)}
                                >
                                  {template.name}
                                </div>
                                {template.description && (
                                  <div className="text-xs text-gray-500 truncate mt-1">
                                    {template.description}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          {isEditing ? (
                            <Select
                              value={editData.compensationModel || template.compensationModel}
                              onValueChange={(value) => setEditData({ ...editData, compensationModel: value as TemplateType })}
                            >
                              <SelectTrigger className="h-8 w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="BASE">Base</SelectItem>
                                <SelectItem value="PRODUCTIVITY">Productivity</SelectItem>
                                <SelectItem value="HYBRID">Hybrid</SelectItem>
                                <SelectItem value="HOSPITALIST">Hospitalist</SelectItem>
                                <SelectItem value="LEADERSHIP">Leadership</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={`text-xs font-medium ${getTemplateTypeColor(template.compensationModel)} px-3 py-1`}
                            >
                              {getTemplateTypeLabel(template.compensationModel)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          {isEditing ? (
                            <Input
                              value={editData.version || template.version}
                              onChange={(e) => setEditData({ ...editData, version: e.target.value })}
                              className="h-8 w-20 text-sm font-mono"
                              placeholder="1.0.0"
                            />
                          ) : (
                            <span className="text-xs font-mono font-semibold text-gray-800 bg-gray-100 rounded px-2 py-1">
                              v{template.version}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          {isEditing ? (
                            <Input
                              value={editData.contractYear || template.contractYear || ''}
                              onChange={(e) => setEditData({ ...editData, contractYear: e.target.value })}
                              className="h-8 w-24 text-sm"
                              placeholder="2024"
                            />
                          ) : (
                            <span className="text-sm text-gray-800">{template.contractYear || '—'}</span>
                          )}
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          <span className="text-sm text-gray-800 font-medium">
                            {template.placeholders?.length || 0}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">fields</span>
                        </TableCell>
                        <TableCell className="px-4 py-4 align-middle">
                          <span className="text-sm text-gray-700">
                            {formatDate(template.metadata?.updatedAt || '')}
                          </span>
                        </TableCell>
                        <TableCell className="px-4 py-4 text-center align-middle">
                          <div className="flex items-center justify-center gap-3">
                            {isEditing ? (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                                        onClick={() => saveInlineEdit(template.id)}
                                        aria-label="Save Changes"
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Save Changes</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                                        onClick={cancelInlineEdit}
                                        aria-label="Cancel"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Cancel</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            ) : (
                              <>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-blue-100 hover:text-blue-700"
                                        onClick={() => setPreviewTemplateId(template.id)}
                                        aria-label="Preview Template"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Preview Template</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-green-100 hover:text-green-700"
                                        onClick={() => startInlineEdit(template)}
                                        aria-label="Edit Template"
                                      >
                                        <Edit3 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Template</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-700"
                                        onClick={() => handleDeleteTemplate(template.id)}
                                        aria-label="Delete Template"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete Template</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {uploadModalOpen && (
          <TemplateUploadModal
            isOpen={uploadModalOpen}
            onClose={() => {
              setUploadModalOpen(false);
              setEditingTemplate(null);
              setIsEditing(false);
              setUploadFile(null);
              setUploadPlaceholders([]);
            }}
            file={uploadFile}
            placeholders={uploadPlaceholders}
            onSubmit={handleUploadModalSubmit}
            initialData={isEditing && editingTemplate ? editingTemplate : undefined}
            mode={isEditing ? 'edit' : 'upload'}
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
    </div>
  );
} 