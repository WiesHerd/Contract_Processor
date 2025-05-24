import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import TemplateHtmlEditorModal from './TemplateHtmlEditorModal';
import Select from 'react-select';

// IMPORTANT: Add this to your public/index.html
// <script src="https://unpkg.com/html-docx-js/dist/html-docx.js"></script>

// Sample provider data for preview
const sampleData = {
  ProviderName: 'Dr. Jordan Smith',
  Credentials: 'MD',
  BaseSalary: '$250,000',
  StartDate: 'July 1, 2025',
  ContractTerm: '3',
  PTODays: '20',
  HolidayDays: '10',
  wRVUTarget: '5,500',
  ConversionFactor: '$52.00',
};

interface TemplatePreviewPanelProps {
  templateId: string;
  providerData?: Record<string, string>;
}

// Helper to merge placeholders with data, highlighting unresolved
function mergePlaceholders(html: string, data: Record<string, string>): { merged: string; unresolved: string[] } {
  const unresolved: string[] = [];
  const merged = html.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    if (data[key] !== undefined) {
      return data[key];
    } else {
      unresolved.push(key);
      // Highlight unresolved placeholders in red
      return `<span style=\"color: #dc2626; background: #fee2e2;\">{{${key}}}</span>`;
    }
  });
  return { merged, unresolved };
}

const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps> = ({ templateId, providerData }) => {
  const template: Template | undefined = useSelector((state: any) => state.templates.templates.find((t: Template) => t.id === templateId));
  const providers = useSelector((state: any) => state.providers.providers);
  // State for selected provider and editor modal
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(providers[0]?.id || null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Find the selected provider or use sampleData
  const selectedProvider = providerData || providers.find((p: any) => p.id === selectedProviderId) || sampleData;

  const html = template?.editedHtmlContent || template?.htmlPreviewContent || '';

  // Merge placeholders and track unresolved
  const { merged, unresolved } = useMemo(() => mergePlaceholders(html, selectedProvider), [html, selectedProvider]);

  // Download as DOCX handler using window.htmlDocx
  const handleDownload = () => {
    if (typeof window !== 'undefined' && (window as any).htmlDocx) {
      const docxBlob = (window as any).htmlDocx.asBlob(`<html><body>${merged}</body></html>`);
      saveAs(docxBlob, 'ScheduleA.docx');
    } else {
      alert('DOCX export is not available. Please ensure html-docx-js is loaded via CDN.');
    }
  };

  if (!template) {
    return <div className="text-red-500">Template not found.</div>;
  }

  // Prepare options for react-select
  const providerOptions = providers.map((p: any) => ({
    value: p.id,
    label: p.name || p.ProviderName || p.id,
  }));
  const selectedOption = providerOptions.find(opt => opt.value === selectedProviderId) || null;

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
                onChange={option => setSelectedProviderId(option?.value || null)}
                isSearchable
                placeholder="Search provider..."
              />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditorOpen(true)}>Edit HTML</Button>
          <Button onClick={handleDownload}>Download as Word</Button>
        </div>
      </div>
      <div className="bg-white rounded shadow p-6 overflow-auto font-serif leading-relaxed text-gray-900 max-h-[70vh] border relative">
        {/* Render merged HTML */}
        <div dangerouslySetInnerHTML={{ __html: merged }} />
      </div>
      {unresolved.length > 0 && (
        <div className="mt-4 text-sm text-red-600">
          <strong>Unresolved placeholders:</strong> {unresolved.map(u => `{{${u}}}`).join(', ')}
        </div>
      )}
      {/* HTML Editor Modal */}
      {editorOpen && (
        <TemplateHtmlEditorModal
          templateId={templateId}
          isOpen={editorOpen}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
};

export default TemplatePreviewPanel; 