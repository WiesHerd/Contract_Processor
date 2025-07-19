/// <reference types="html-docx-js" />
import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch } from '@/store';
import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import TemplateHtmlEditorModal from './TemplateHtmlEditorModal';
import Select from 'react-select';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { FieldMapping } from '@/features/templates/mappingsSlice';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import { v4 as uuidv4 } from 'uuid';
import { Provider } from '@/types/provider';
import { getContractFileName } from '@/utils/filename';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { saveDocxFile } from '@/utils/fileUtils';

// IMPORTANT: Add this to your public/index.html
// <script src="https://unpkg.com/html-docx-js/dist/html-docx.js"></script>

// A more complete sample provider for robust previewing
const sampleData: Provider = {
  id: 'sample-provider-id',
  employeeId: '007',
  name: 'Dr. Jordan Smith',
  providerType: 'Physician',
  specialty: 'Cardiology',
  subspecialty: 'Interventional Cardiology',
  fte: 1.0,
  administrativeFte: 0,
  administrativeRole: '',
  yearsExperience: 10,
  hourlyWage: 0,
  baseSalary: 250000,
  originalAgreementDate: '2024-01-01',
  organizationName: 'General Hospital',
  startDate: '2025-07-01',
  contractTerm: "3",
  ptoDays: 20,
  holidayDays: 10,
  cmeDays: 5,
  cmeAmount: 5000,
  signingBonus: 20000,
  educationBonus: 0,
  qualityBonus: 15000,
  compensationType: 'PRODUCTIVITY',
  conversionFactor: 52.00,
  wRVUTarget: 5500,
  compensationYear: "2025",
  credentials: 'MD, FACC',
  compensationModel: 'PRODUCTIVITY',
  templateTag: 'PRODUCTIVITY_V1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  fteBreakdown: [{ activity: 'Clinical', percentage: 100 }],
};

interface TemplatePreviewPanelProps {
  templateId: string;
  providerData?: Record<string, string>;
}

// Add this interface near the top with other interfaces
interface ProviderOption {
  value: string;
  label: string;
}

// All contract outputs must use Aptos font for enterprise consistency
const aptosStyle = `<style>
body, p, span, td, th, div, h1, h2, h3, h4, h5, h6, b, strong {
  font-family: Aptos, Arial, sans-serif !important;
  font-size: 11pt !important;
}
h1 { font-size: 16pt !important; font-weight: bold !important; }
h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; }
</style>`;

const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps> = ({ templateId, providerData }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(sampleData);
  const [mergedHtml, setMergedHtml] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const template = useSelector((state: any) =>
    state.templates.templates.find((t: Template) => t.id === templateId)
  );
  const providers = useSelector((state: any) => state.provider.providers);
  const providerOptions: ProviderOption[] = useMemo(() =>
    providers.map((p: Provider) => ({ value: p.id, label: p.name })),
    [providers]
  );
  const mappings = useSelector((state: any) => state.mappings.mappings);
  const mapping: FieldMapping[] | undefined = template ? mappings?.[template.id]?.mappings : undefined;

  // Update mergedHtml when template, selectedProvider, or mapping changes
  React.useEffect(() => {
    let cancelled = false;
    const doMerge = async () => {
      if (!template) {
        setMergedHtml('');
        setWarnings([]);
        return;
      }
      setLoading(true);
      const html = template.editedHtmlContent || template.htmlPreviewContent || '';
      // --- PATCH: Transform mapping to include mappingType ---
      let enhancedMapping = mapping;
      if (mapping && Array.isArray(mapping)) {
        enhancedMapping = mapping.map(m => {
          if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
            return {
              ...m,
              mappingType: 'dynamic',
              mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
              mappedColumn: undefined,
            };
          }
          return {
            ...m,
            mappingType: 'field',
          };
        });
      }
      try {
        const result = await mergeTemplateWithData(template, selectedProvider, html, enhancedMapping);
        if (!cancelled) {
          setMergedHtml(result.content);
          setWarnings(result.warnings || []);
        }
      } catch (e) {
        if (!cancelled) {
          setMergedHtml('<div class="text-red-500">Failed to merge template and provider data.</div>');
          setWarnings(['Error merging template: ' + (e instanceof Error ? e.message : String(e))]);
        }
      }
      setLoading(false);
    };
    doMerge();
    return () => { cancelled = true; };
  }, [template, selectedProvider, mapping]);

  const handleProviderChange = (option: ProviderOption | null) => {
    const provider = providers.find((p: Provider) => p.id === option?.value);
    if (provider) {
      setSelectedProvider(provider);
    }
  };

  const handleDownload = async () => {
    if (!template) return;
    try {
      const htmlContent = `<!DOCTYPE html><html><head><meta charset='utf-8'>${aptosStyle}</head><body>${mergedHtml}</body></html>`;
      const docxBlob = htmlDocx.asBlob(htmlContent);
      const contractYear = template.contractYear || new Date().getFullYear().toString();
      const runDate = new Date().toISOString().split('T')[0];
      const fileName = getContractFileName(contractYear, selectedProvider.name, runDate);
      
      // Use Windows File Explorer "Save As" dialog approach
      const savedFilePath = await saveDocxFile(docxBlob, fileName);
      if (savedFilePath) {
        console.log('✅ Template preview saved successfully:', savedFilePath);
        dispatch(logSecurityEvent({
          action: 'TEMPLATE_PREVIEW',
          details: 'Template previewed and saved',
          severity: 'LOW',
        }));
      } else {
        console.log('⚠️ Template preview generation completed but save was cancelled by user');
      }
    } catch (error) {
      console.error("Error generating DOCX:", error);
    }
  };

  const handleSaveEditedHtml = (editedHtml: string) => {
    // This should dispatch an action to update the template in Redux store
    console.log("Saving edited HTML for template:", templateId, editedHtml);
  };

  if (!template) {
    return <div className="p-4 text-center text-gray-500">Select a template to see a preview.</div>;
  }

  // Prepare options for react-select
  const selectedOption = providerOptions.find(opt => opt.value === selectedProvider.id) || null;

  return (
    <div className="flex flex-col h-full w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold mr-4">Contract Preview</h2>
          {/* Provider selection with react-select */}
          {providers.length > 0 && (
            <div style={{ minWidth: 220 }}>
              <Select
                options={providerOptions}
                value={selectedOption}
                onChange={handleProviderChange}
                isSearchable
                placeholder="Search provider..."
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditorOpen(true)}>Edit HTML</Button>
          <Button onClick={handleDownload}>Download as Word</Button>
        </div>
      </div>
      <div className="bg-white rounded shadow p-6 overflow-auto font-serif leading-relaxed text-gray-900 max-h-[70vh] border relative">
        {/* Render merged HTML */}
        {loading ? (
          <div className="flex items-center justify-center h-32"><LoadingSpinner size="md" message="Merging template..." color="gray" /></div>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: mergedHtml }} />
        )}
        
        {/* Show warnings if any */}
        {warnings.length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-semibold text-yellow-800 mb-2">Warnings:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              {warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* HTML Editor Modal */}
      {isEditorOpen && (
        <TemplateHtmlEditorModal
          templateId={templateId}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default TemplatePreviewPanel; 