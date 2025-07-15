import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Eye, FileDown, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { mergeTemplateWithData } from '../mergeUtils';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { FieldMapping } from '@/features/templates/mappingsSlice';

interface ContractPreviewModalProps {
  open: boolean;
  onClose: () => void;
  template: Template | null;
  providers: Provider[];
  selectedProviderIds: string[];
  onGenerate: (providerId: string) => void;
  onBulkGenerate: () => void;
  getAssignedTemplate: (provider: Provider) => Template | null;
}

const ContractPreviewModal: React.FC<ContractPreviewModalProps> = ({
  open,
  onClose,
  template,
  providers,
  selectedProviderIds,
  onGenerate,
  onBulkGenerate,
  getAssignedTemplate,
}) => {
  const { mappings } = useSelector((state: RootState) => state.mappings);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [showRawHtml, setShowRawHtml] = useState(false);

  // Get available providers for preview
  const availableProviders = providers.filter(p => selectedProviderIds.includes(p.id));
  
  // Set default provider when modal opens
  React.useEffect(() => {
    if (open && availableProviders.length > 0) {
      // If there's only one provider selected (clicked from table), use that one
      if (selectedProviderIds.length === 1) {
        setSelectedProviderId(selectedProviderIds[0]);
      }
      // Otherwise, if no provider is selected or the selected provider is not in the available list, select the first one
      else if (!selectedProviderId || !availableProviders.find(p => p.id === selectedProviderId)) {
        setSelectedProviderId(availableProviders[0].id);
      }
    }
  }, [open, availableProviders, selectedProviderId, selectedProviderIds]);

  const selectedProvider = availableProviders.find(p => p.id === selectedProviderId);

  // Generate preview content
  const [previewData, setPreviewData] = useState({
    content: '',
    warnings: [] as string[],
    hasUnresolved: false,
    unresolvedPlaceholders: [] as string[],
  });

  useEffect(() => {
    const generatePreview = async () => {
      if (!selectedProvider) {
        const emptyContent = '<div style="padding: 2rem; text-align: center; color: #666; font-family: Arial, sans-serif;"><h3>No Provider Selected</h3><p>Please select a provider to preview.</p></div>';
        setPreviewData({
          content: emptyContent,
          warnings: [],
          hasUnresolved: false,
          unresolvedPlaceholders: [],
        });
        return;
      }

      // Use assigned template or fallback to global template
      const templateToUse = getAssignedTemplate(selectedProvider) || template;
      if (!templateToUse) {
        const emptyContent = '<div style="padding: 2rem; text-align: center; color: #666; font-family: Arial, sans-serif;"><h3>No Template Assigned</h3><p>This provider does not have a template assigned. Please assign a template first.</p></div>';
        setPreviewData({
          content: emptyContent,
          warnings: [],
          hasUnresolved: false,
          unresolvedPlaceholders: [],
        });
        return;
      }

      const html = templateToUse.editedHtmlContent || templateToUse.htmlPreviewContent || '';
      const mapping = mappings[templateToUse.id]?.mappings;
      
      // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
      const enhancedMapping = mapping?.map(m => {
        // Check if this mapping has a dynamic block (stored in value field with dynamic: prefix)
        if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
          return {
            ...m,
            mappingType: 'dynamic' as const,
            mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
            mappedColumn: undefined, // Clear the mappedColumn since it's a dynamic block
          };
        }
        return {
          ...m,
          mappingType: 'field' as const,
        };
      });
      
      const { content: mergedHtml, warnings } = await mergeTemplateWithData(templateToUse, selectedProvider, html, enhancedMapping);
      
      // Check for unresolved placeholders
      const unresolved = mergedHtml.match(/{{[^}]+}}/g);
      const hasUnresolved = !!(unresolved && unresolved.length > 0);

      setPreviewData({
        content: mergedHtml,
        warnings,
        hasUnresolved,
        unresolvedPlaceholders: unresolved || [],
      });
    };

    generatePreview();
  }, [template, selectedProvider, mappings, getAssignedTemplate]);

  // Utility to normalize smart quotes and special characters
  const normalizeSmartQuotes = (text: string): string => {
    return text
      .replace(/[\u201C\u201D]/g, '"') // " "
      .replace(/[\u2018\u2019]/g, "'") // ' '
      .replace(/\u2013/g, "-")         // –
      .replace(/\u2014/g, "--")        // —
      .replace(/\u2026/g, "...")       // ...
      .replace(/\u00a0/g, " ")         // non-breaking space
      .replace(/\u2022/g, "-");        // bullet to dash
  };

  // Apply Aptos styling for preview
  const styledContent = useMemo(() => {
    if (!previewData.content) return '';
    
    const aptosStyle = `
      <style>
        body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
          font-family: Aptos, Arial, sans-serif !important;
          font-size: 11pt !important;
          line-height: 1.4;
        }
        h1 { font-size: 16pt !important; font-weight: bold !important; margin: 8px 0; }
        h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; margin: 6px 0; }
        b, strong { font-weight: bold !important; }
        p { margin: 4px 0; }
        ul, ol { margin: 4px 0; padding-left: 20px; }
        li { margin: 1px 0; }
        table { border-collapse: collapse; width: 100%; margin: 6px 0; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .preview-container { 
          max-width: 14in; 
          margin: 0 auto; 
          padding: 0.4in; 
          background: white; 
          min-height: 11in;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .preview-container > *:first-child { margin-top: 0; }
        .preview-container > *:last-child { margin-bottom: 0; }
      </style>
    `;
    
    return aptosStyle + `<div class="preview-container">${normalizeSmartQuotes(previewData.content)}</div>`;
  }, [previewData.content]);

  const handleGenerateSelected = () => {
    if (selectedProvider) {
      onGenerate(selectedProvider.id);
      onClose();
    }
  };

  const handleGenerateAll = () => {
    onBulkGenerate();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Eye className="w-5 h-5 text-blue-600" />
            Contract Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {/* Controls */}
          <div className="flex-shrink-0 flex items-center gap-4 px-6 py-3 bg-gray-50/50 border-b">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Preview Provider:</label>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name} {provider.credentials && `(${provider.credentials})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRawHtml(!showRawHtml)}
                className="text-xs"
              >
                {showRawHtml ? 'Show Preview' : 'Show HTML'}
              </Button>
            </div>

            <div className="flex-1" />

            {/* Status indicators */}
            <div className="flex items-center gap-2">
                             {previewData.hasUnresolved ? (
                 <Badge variant="destructive" className="flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3" />
                   {previewData.unresolvedPlaceholders?.length || 0} Unresolved
                 </Badge>
               ) : (
                 <Badge variant="default" className="flex items-center gap-1 bg-green-600">
                   <CheckCircle className="w-3 h-3" />
                   Ready
                 </Badge>
               )}
              
              {previewData.warnings.length > 0 && (
                <Badge variant="outline" className="text-orange-600">
                  {previewData.warnings.length} Warning{previewData.warnings.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Warnings */}
          {previewData.warnings.length > 0 && (
            <div className="px-6">
              <Alert className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Preview Warnings:</div>
                  <ul className="text-sm space-y-1">
                    {previewData.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Unresolved placeholders */}
          {previewData.hasUnresolved && (
            <div className="px-6">
              <Alert variant="destructive" className="mb-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Unresolved Placeholders:</div>
                  <div className="text-sm">
                    {previewData.unresolvedPlaceholders?.join(', ') || 'None'}
                  </div>
                  <div className="text-sm mt-2">
                    These placeholders will be replaced with "N/A" in the final document. 
                    Check your field mappings to resolve them.
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Preview content */}
          <div className="flex-1 min-h-0 px-6 pb-6">
            <ScrollArea className="h-full border rounded-lg bg-gray-50">
              <div className="p-2">
                {showRawHtml ? (
                  <pre className="text-xs font-mono whitespace-pre-wrap bg-white p-3 rounded border">
                    {previewData.content}
                  </pre>
                ) : (
                  <div 
                    className="prose prose-sm max-w-none bg-white rounded border min-h-[500px]"
                    dangerouslySetInnerHTML={{ __html: styledContent }}
                  />
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex justify-between px-6 py-4 border-t bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
                            {selectedProviderIds.length > 0 && (
              <Button 
                onClick={handleGenerateAll}
                className="flex items-center gap-2"
              >
                <FileDown className="w-4 h-4" />
                Generate All ({selectedProviderIds.length})
              </Button>
            )}
            
            <Button 
              onClick={handleGenerateSelected}
              disabled={!selectedProvider}
              className="flex items-center gap-2"
            >
              <FileDown className="w-4 h-4" />
              Generate for {selectedProvider?.name || 'Provider'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractPreviewModal; 