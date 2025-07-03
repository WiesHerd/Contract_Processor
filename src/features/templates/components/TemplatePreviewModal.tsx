import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Template } from '@/types/template';
import localforage from 'localforage';
import mammoth from 'mammoth';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { FieldMapping } from '@/features/templates/mappingsSlice';
import { Provider } from '@/types/provider';
import TemplateHtmlEditorModal from './TemplateHtmlEditorModal';
import { downloadFile } from '@/utils/s3Storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getContractFileName } from '@/utils/filename';

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
  const providers = useSelector((state: any) => state.provider.providers);
  const mappings = useSelector((state: any) => state.mappings.mappings);

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    providers.length > 0 ? providers[0].id : null
  );

  const selectedProvider = useMemo(
    () => providers.find((p: Provider) => p.id === selectedProviderId),
    [providers, selectedProviderId]
  );
  
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
      downloadFile(template.docxTemplate)
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
    if (!template || !selectedProvider) return;
    const htmlContent = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${mergedHtml}</body></html>`;
    if (!htmlDocx || typeof htmlDocx.asBlob !== 'function') {
      alert("DOCX export is not available. Please ensure html-docx-js is installed and imported.");
      return;
    }
    try {
      const docxBlob = htmlDocx.asBlob(htmlContent);
      const contractYear = template.contractYear || new Date().getFullYear().toString();
      const runDate = new Date().toISOString().split('T')[0];
      const fileName = getContractFileName(contractYear, selectedProvider.name, runDate);
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
          <DialogTitle>Contract Preview</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">{template.name}</h2>
              <p className="text-sm text-gray-500 mb-1">
                Version {template.version} • {template.compensationModel}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Select Provider to Preview</label>
              <Select
                value={selectedProviderId || ''}
                onValueChange={(value) => setSelectedProviderId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p: Provider) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-1">Merged Preview</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner 
                  size="sm" 
                  message="Loading preview..." 
                  color="gray"
                />
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : (
              <div
                className="prose prose-sm max-w-none max-h-96 overflow-auto border p-2 rounded"
                dangerouslySetInnerHTML={{ __html: mergedHtml }}
              />
            )}
          </div>
        </div>
        <DialogFooter className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handleDownload} disabled={!selectedProvider}>Download as Word</Button>
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