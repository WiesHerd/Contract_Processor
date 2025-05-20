import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  setSelectedTemplate,
} from '@/store/slices/templateSlice';
import { Template, validateTemplate, generateTestData, downloadDocument } from '@/utils/template-processor';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, Edit, Download, AlertTriangle } from 'lucide-react';
import mammoth from 'mammoth';

export default function TemplateManager() {
  const dispatch = useDispatch();
  const templates = useSelector((state: RootState) => state.templates.templates);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: '',
      version: '1.0.0',
      type: 'Schedule A',
      content: '',
      lastModified: new Date().toISOString().split('T')[0],
      placeholders: [],
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

    const { isValid, errors: validationErrors } = validateTemplate(editingTemplate);
    if (!isValid) {
      setErrors(validationErrors);
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

  const handleTestTemplate = (template: Template) => {
    const testData = generateTestData(template);
    const content = template.content;

    // Replace placeholders with test data
    let testContent = content;
    template.placeholders.forEach(placeholder => {
      const value = testData[placeholder] ?? '';
      testContent = testContent.replace(
        new RegExp(`{{${placeholder}}}`, 'g'),
        String(value)
      );
    });

    downloadDocument(testContent, `${template.name}-test.txt`);
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
      // Find all {{placeholders}}
      const placeholderRegex = /{{([^}]+)}}/g;
      const placeholders = Array.from(text.matchAll(placeholderRegex))
        .map(match => match[1])
        .filter((value, index, self) => self.indexOf(value) === index);
      // Open template editor with extracted data
      setEditingTemplate({
        id: crypto.randomUUID(),
        name: file.name.replace(/\.docx$/, ''),
        version: '1.0.0',
        type: 'Schedule A',
        content: text,
        lastModified: new Date().toISOString().split('T')[0],
        placeholders,
      });
      setIsCreating(true);
    } catch (err) {
      alert('Failed to parse DOCX file. Please ensure it is a valid Word document.');
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
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload DOCX
          </Button>
          <input
            type="file"
            accept=".docx"
            ref={fileInputRef}
            className="hidden"
            onChange={handleDocxUpload}
          />
          <Button onClick={handleCreateTemplate}>
            <Plus className="mr-2 h-4 w-4" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <span className="text-3xl mb-2">📄</span>
            <span className="text-lg font-medium">No templates found</span>
            <span className="text-sm mt-1">Click <b>New Template</b> or <b>Upload DOCX</b> to get started.</span>
          </div>
        ) : (
          templates.map(template => (
            <div
              key={template.id}
              className="flex items-center justify-between p-4 border rounded-lg bg-white shadow-sm"
            >
              <div>
                <h3 className="font-medium">{template.name}</h3>
                <p className="text-sm text-gray-500">
                  Version {template.version} • {template.type} • Last modified {template.lastModified}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleTestTemplate(template)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDeleteTemplate(template.id)}
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
                    {errors.version && (
                      <p className="text-sm text-red-500">{errors.version}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      value={editingTemplate.type}
                      onValueChange={(value: Template['type']) => setEditingTemplate(prev => prev ? { ...prev, type: value } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Schedule A">Schedule A</SelectItem>
                        <SelectItem value="Schedule B">Schedule B</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Hospitalist">Hospitalist</SelectItem>
                        <SelectItem value="Leadership">Leadership</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Right side - Content editor */}
                <div className="col-span-2 flex flex-col space-y-2 h-full">
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
    </div>
  );
} 