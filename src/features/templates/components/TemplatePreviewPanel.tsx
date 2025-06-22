/// <reference types="html-docx-js" />
import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import TemplateHtmlEditorModal from './TemplateHtmlEditorModal';
import Select from 'react-select';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { FieldMapping } from '@/features/templates/mappingsSlice';
import { addAuditLog } from '@/store/slices/auditSlice';
import { v4 as uuidv4 } from 'uuid';
import { Provider } from '@/types/provider';

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

const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps> = ({ templateId, providerData }) => {
  const dispatch = useDispatch();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(sampleData);

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
  
  const { content: mergedHtml, warnings } = useMemo(() => {
    if (!template) return { content: '', warnings: [] };
    const html = template.editedHtmlContent || template.htmlPreviewContent || '';
    return mergeTemplateWithData(template, selectedProvider, html, mapping);
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
      const htmlContent = `<!DOCTYPE html><html><head><meta charset='utf-8'></head><body>${mergedHtml}</body></html>`;
      const docxBlob = htmlDocx.asBlob(htmlContent);
      const fileName = `${selectedProvider.name.replace(/\s+/g, '_')}_ScheduleA.docx`;
      saveAs(docxBlob, fileName);

      dispatch(addAuditLog({
        id: uuidv4(),
        user: 'system',
        template: template.name,
        providers: [selectedProvider.id],
        outputType: 'DOCX',
        status: 'success',
        timestamp: new Date().toISOString(),
      }));
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
        <div dangerouslySetInnerHTML={{ __html: mergedHtml }} />
      </div>
      {warnings && warnings.length > 0 && (
        <div className="mt-4 text-sm text-red-600">
          {warnings.join(', ')}
        </div>
      )}
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