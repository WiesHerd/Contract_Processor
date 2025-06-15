import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDispatch, useSelector } from 'react-redux';
import { updateTemplate } from '../templatesSlice';
import { Template } from '@/types/template';
import { Editor } from '@tinymce/tinymce-react';

interface TemplateHtmlEditorModalProps {
  templateId: string;
  isOpen: boolean;
  onClose: () => void;
  initialValue?: string;
}

// Utility to highlight placeholders visually in the editor
function highlightPlaceholders(html: string): string {
  // Wrap {{placeholder}} in a span for highlighting
  return html.replace(/(\{\{[^}]+\}\})/g, '<span style="background: #e0e7ff; color: #1e40af; padding:2px 4px; border-radius:3px; font-family:monospace;">$1</span>');
}

const TemplateHtmlEditorModal: React.FC<TemplateHtmlEditorModalProps> = ({ templateId, isOpen, onClose, initialValue }) => {
  const dispatch = useDispatch();
  const template: Template | undefined = useSelector((state: any) => state.templates.templates.find((t: Template) => t.id === templateId));
  const [editorValue, setEditorValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load initial content
  useEffect(() => {
    if (isOpen && template) {
      const html = initialValue !== undefined ? initialValue : (template.editedHtmlContent || template.htmlPreviewContent || '');
      setEditorValue(html);
      setLoading(false);
    } else if (!template) {
      setEditorValue('');
      setLoading(false);
    }
  }, [isOpen, template, initialValue]);

  // Save handler
  const handleSave = useCallback(() => {
    if (!template) return;
    setSaving(true);
    const newVersion = {
      timestamp: new Date().toISOString(),
      html: editorValue,
    };
    dispatch(updateTemplate({
      ...template,
      editedHtmlContent: editorValue,
      versionHistory: [newVersion, ...(template.versionHistory || [])],
    }));
    setSaving(false);
    onClose();
  }, [dispatch, editorValue, onClose, template]);

  // Editor config
  const tinymceInit: any = {
    height: 500,
    menubar: false,
    plugins: [
      'lists', 'table',
      'advlist', 'autolink', 'link', 'charmap', 'preview', 'anchor',
      'searchreplace', 'visualblocks', 'code', 'fullscreen',
      'insertdatetime', 'media', 'paste', 'help', 'wordcount'
    ],
    toolbar:
      'undo redo | bold italic underline | bullist numlist | table | code',
    content_style:
      'body { font-family:Inter,Arial,sans-serif; font-size:14px; }',
    valid_elements: '*[*]',
    entity_encoding: 'raw',
    // No placeholder highlighting for performance
    setup: (editor: any) => {},
    formats: {
      placeholder: { inline: 'span', classes: 'placeholder-highlight' },
    },
  };

  // TODO: Replace 'YOUR_TINYMCE_API_KEY' with your actual TinyMCE Cloud API key
  // Get a free key at https://www.tiny.cloud/get-tiny/

  // Debug log to check what is being passed to the editor
  console.log('Editor Value:', editorValue);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit Template HTML</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">Loading editor...</div>
        ) : !template ? (
          <div className="text-red-500">Template not found.</div>
        ) : (
          <Editor
            key={template?.id}
            apiKey="hwuyiukhovfmwo28b4d5ktsw78kc9fu31gwdlqx9b4h2uv9b"
            value={editorValue}
            onEditorChange={setEditorValue}
            init={tinymceInit}
          />
        )}
        <DialogFooter className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading || !template}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateHtmlEditorModal; 