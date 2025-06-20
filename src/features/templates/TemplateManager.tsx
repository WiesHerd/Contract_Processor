import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch } from '@/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Eye } from 'lucide-react';
import mammoth from 'mammoth';
import { addTemplate, updateTemplate, deleteTemplate, setTemplates, clearTemplates, hydrateTemplates, hydrateTemplatesFromS3 } from './templatesSlice';
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

export default function TemplateManager() {
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();
  const templates = useSelector((state: RootState) => state.templates.templates || []);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  useEffect(() => {
    dispatch(hydrateTemplatesFromS3());
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

  // Delete all templates handler
  const handleDeleteAllTemplates = async () => {
    if (window.confirm('Are you sure you want to delete ALL templates? This cannot be undone.')) {
      dispatch(clearTemplates());
      // The slice will handle S3 deletion if you build that logic.
      // For now, we just clear the local state. A more robust solution
      // would be a `clearAllTemplatesFromS3` thunk.
      alert('All templates have been cleared from the view. Implement S3 cleanup as needed.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6 overflow-y-auto min-h-screen">
      <PageHeader
        title="Template Manager"
        description="Manage your contract templates. Upload a DOCX to extract placeholders, or create a new template from scratch."
        rightContent={
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDeleteAllTemplates} className="text-red-600 border-red-300">Delete All Templates</Button>
            <Button onClick={() => fileInputRef.current?.click()}>
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
        }
      />

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
                  Version {template.version} • {template.compensationModel} • Last modified {template.metadata?.updatedAt || ''}
                  {template.contractYear && <> • Contract Year: {template.contractYear}</>}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {template.placeholders.length} placeholders
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
                  variant="ghost"
                  onClick={() => {
                    setEditingTemplate(template);
                    setIsEditing(true);
                    setUploadModalOpen(true);
                    setUploadFile(null);
                    setUploadPlaceholders(template.placeholders || []);
                  }}
                >
                  <Edit className="w-5 h-5" />
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
  );
} 