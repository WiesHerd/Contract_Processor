import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDispatch, useSelector } from 'react-redux';
import { updateTemplate } from '../templatesSlice';
import { Template } from '@/types/template';

// Dynamically import TinyMCE React component
const Editor = React.lazy(() => import('@tinymce/tinymce-react').then(mod => ({ default: mod.Editor })));

interface TemplateHtmlEditorModalProps {
  templateId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Utility to highlight placeholders visually in the editor
function highlightPlaceholders(html: string): string {
  // Wrap {{placeholder}} in a span for highlighting
  return html.replace(/(\{\{[^}]+\}\})/g, '<span style="background: #e0e7ff; color: #1e40af; padding:2px 4px; border-radius:3px; font-family:monospace;">$1</span>');
}

const TemplateHtmlEditorModal: React.FC<TemplateHtmlEditorModalProps> = ({ templateId, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const template: Template | undefined = useSelector((state: any) => state.templates.templates.find((t: Template) => t.id === templateId));
  const [editorValue, setEditorValue] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load initial content
  useEffect(() => {
    if (isOpen && template) {
      const html = template.editedHtmlContent || template.htmlPreviewContent || '';
      setEditorValue(html);
      setLoading(false);
    } else if (!template) {
      setEditorValue('');
      setLoading(false);
    }
  }, [isOpen, template]);

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
  const tinymceInit = {
    height: 500,
    menubar: false,
    plugins: [
      'lists table',
      'advlist autolink link charmap preview anchor',
      'searchreplace visualblocks code fullscreen',
      'insertdatetime media paste help wordcount',
    ],
    toolbar:
      'undo redo | bold italic underline | bullist numlist | table | code',
    content_style:
      'body { font-family:Inter,Arial,sans-serif; font-size:14px; }',
    // Prevent TinyMCE from encoding curly braces or placeholders
    valid_elements: '*[*]',
    entity_encoding: 'raw',
    // Highlight placeholders on load
    setup: (editor: any) => {
      editor.on('init', () => {
        const html = highlightPlaceholders(editor.getContent());
        editor.setContent(html);
      });
      // Re-highlight after content changes
      editor.on('SetContent', (e: any) => {
        if (e.content) {
          editor.setContent(highlightPlaceholders(e.content), { format: 'raw' });
        }
      });
    },
    // Allow {{...}} to be edited as plain text
    formats: {
      placeholder: { inline: 'span', classes: 'placeholder-highlight' },
    },
  };

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
          <React.Suspense fallback={<div className="text-gray-500">Loading editor...</div>}>
            <Editor
              apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
              value={editorValue}
              onEditorChange={setEditorValue}
              init={tinymceInit}
            />
          </React.Suspense>
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