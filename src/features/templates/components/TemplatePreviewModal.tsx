import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Template } from '@/types/template';
import localforage from 'localforage';
import mammoth from 'mammoth';
import htmlDocx from 'html-docx-js/dist/html-docx';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { FieldMapping } from '@/features/templates/mappingsSlice';
import { Provider } from '@/types/provider';
import TemplateHtmlEditorModal from './TemplateHtmlEditorModal';

interface TemplatePreviewModalProps {
  open: boolean;
  template: Template | null;
  onClose: () => void;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({ open, template, onClose }) => {
  const [docxText, setDocxText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const providers = useSelector((state: any) => state.providers.providers);
  const mappings = useSelector((state: any) => state.mappings.mappings);
  const selectedProvider = providers[0]; // Use first provider for now
  const html = template?.editedHtmlContent || template?.htmlPreviewContent || '';
  const mapping: FieldMapping[] | undefined = template ? mappings?.[template.id]?.mappings : undefined;
  const { content: mergedHtml } = useMemo(() => {
    if (!template || !selectedProvider) return { content: html };
    return mergeTemplateWithData(template, selectedProvider, html, mapping);
  }, [template, selectedProvider, html, mapping]);

  useEffect(() => {
    if (open && template && typeof template.docxTemplate === 'string' && template.docxTemplate) {
      setLoading(true);
      setError(null);
      setDocxText('');
      localforage.getItem<Blob>(template.docxTemplate as string)
        .then(blob => {
          if (!blob) throw new Error('DOCX file not found');
          return blob.arrayBuffer();
        })
        .then(arrayBuffer => mammoth.extractRawText({ arrayBuffer }))
        .then(result => setDocxText(result.value))
        .catch(err => setError('Failed to load DOCX preview.'))
        .finally(() => setLoading(false));
    }
  }, [open, template]);

  const handleDownload = async () => {
    if (!template) return;
    // Use the merged, formatted HTML from the preview
    const htmlContent = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${mergedHtml}</body></html>`;
    if (!htmlDocx || typeof htmlDocx.asBlob !== 'function') {
      alert("DOCX export is not available. Please ensure html-docx-js is installed and imported.");
      return;
    }
    try {
      const docxBlob = htmlDocx.asBlob(htmlContent);
      const fileName = `ScheduleA_${template.name.replace(/\s+/g, '')}.docx`;
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DOCX generation failed:", error);
      alert("Failed to generate DOCX. Please ensure the template is properly initialized and html-docx-js is loaded.");
    }
  };

  const handleGenerateDOCX = async () => {
    if (!template || !template.docxTemplate) return;
    // Optional: Debug log
    console.log("DOCX Generation Debug", {
      htmlDocxLoaded: !!htmlDocx,
      availableFunctions: htmlDocx && Object.keys(htmlDocx),
      docxTextPreview: docxText?.slice(0, 200)
    });
    if (!htmlDocx || typeof htmlDocx.asBlob !== 'function') {
      alert("DOCX export is not available. Please ensure html-docx-js is installed and imported.");
      return;
    }
    try {
      const docxBlob = htmlDocx.asBlob(docxText);
      const fileName = `ScheduleA_${template.name.replace(/\s+/g, '')}.docx`;
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("DOCX generation failed:", error);
      alert("Failed to generate DOCX. Please ensure the template is properly initialized and html-docx-js is loaded.");
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Template Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-1">{template.name}</h2>
            <p className="text-sm text-gray-500 mb-1">
              Version {template.version} • {template.compensationModel} • Last modified {template.metadata?.updatedAt || ''}
            </p>
            <p className="text-sm text-gray-500 mb-1">
              {template.placeholders.length} placeholders • {template.clauseIds.length} clauses
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Placeholders</h3>
            <div className="flex flex-wrap gap-2">
              {template.placeholders.length === 0 ? <span className="text-gray-400">None found</span> :
                template.placeholders.map(ph => (
                  <span key={ph} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{ph}</span>
                ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Plain Text Preview</h3>
            {loading ? (
              <div className="text-gray-500 text-sm">Loading preview...</div>
            ) : error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : (
              <pre className="bg-gray-100 rounded p-2 max-h-64 overflow-auto text-xs whitespace-pre-wrap">{docxText}</pre>
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleDownload}>Download DOCX</Button>
          <Button onClick={handleGenerateDOCX}>Generate DOCX</Button>
          <Button onClick={() => setEditorOpen(true)}>Edit HTML</Button>
        </DialogFooter>
        {editorOpen && (
          <TemplateHtmlEditorModal
            templateId={template?.id || ''}
            isOpen={editorOpen}
            onClose={() => setEditorOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewModal; 