import React, { useMemo, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Template } from '@/types/template';
import { Button } from '@/components/ui/button';
import { saveAs } from 'file-saver';
import TemplateHtmlEditorModal from './TemplateHtmlEditorModal';
import Select from 'react-select';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { FieldMapping } from '@/features/templates/mappingsSlice';
import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType } from 'docx';
import { getDocxFile } from '@/utils/docxStorage';
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

// Helper function to parse HTML and convert to docx elements
function parseHtmlToDocxElements(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const elements: any[] = [];

  function processNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        elements.push(
          new Paragraph({
            children: [
              new TextRun({
                text,
                size: 24,
              }),
            ],
          })
        );
      }
      return;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      
      switch (element.tagName.toLowerCase()) {
        case 'h1':
          elements.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 200 },
            })
          );
          break;
        case 'h2':
          elements.push(
            new Paragraph({
              text: element.textContent || '',
              heading: HeadingLevel.HEADING_2,
              spacing: { after: 160 },
            })
          );
          break;
        case 'p':
          elements.push(
            new Paragraph({
              text: element.textContent || '',
              spacing: { after: 120 },
            })
          );
          break;
        case 'table':
          const tableElement = element as HTMLTableElement;
          const table = new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1 },
              bottom: { style: BorderStyle.SINGLE, size: 1 },
              left: { style: BorderStyle.SINGLE, size: 1 },
              right: { style: BorderStyle.SINGLE, size: 1 },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
              insideVertical: { style: BorderStyle.SINGLE, size: 1 },
            },
            rows: Array.from(tableElement.rows).map(row => 
              new TableRow({
                children: Array.from(row.cells).map(cell =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: cell.textContent || '',
                        alignment: AlignmentType.CENTER,
                      }),
                    ],
                  })
                ),
              })
            ),
          });
          elements.push(table);
          break;
        default:
          // Process child nodes for other elements
          Array.from(element.childNodes).forEach(processNode);
      }
    }
  }

  // Process all nodes
  Array.from(doc.body.childNodes).forEach(processNode);
  return elements;
}

// Helper function to convert HTML to DOCX with proper formatting
async function convertHtmlToDocx(html: string): Promise<Blob> {
  try {
    // Create a new document
    const doc = new Document({
      styles: {
        paragraphStyles: [
          {
            id: 'Heading1',
            name: 'Heading 1',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 28,
              bold: true,
              color: '000000',
            },
            paragraph: {
              spacing: {
                after: 120,
              },
            },
          },
          {
            id: 'Heading2',
            name: 'Heading 2',
            basedOn: 'Normal',
            next: 'Normal',
            quickFormat: true,
            run: {
              size: 24,
              bold: true,
              color: '000000',
            },
            paragraph: {
              spacing: {
                after: 100,
              },
            },
          },
          {
            id: 'Normal',
            name: 'Normal',
            run: {
              size: 24,
              color: '000000',
            },
            paragraph: {
              spacing: {
                line: 360,
              },
            },
          },
        ],
      },
      sections: [{
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: parseHtmlToDocxElements(html),
      }],
    });

    // Generate the document
    const buffer = await Packer.toBuffer(doc);
    return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  } catch (error) {
    console.error('Error converting HTML to DOCX:', error);
    throw error;
  }
}

const TemplatePreviewPanel: React.FC<TemplatePreviewPanelProps> = ({ templateId, providerData }) => {
  const template: Template | undefined = useSelector((state: any) => state.templates.templates.find((t: Template) => t.id === templateId));
  const providers = useSelector((state: any) => state.provider.providers);
  const mappings = useSelector((state: any) => state.mappings.mappings);
  const dispatch = useDispatch();
  // State for selected provider and editor modal
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(providers[0]?.id || null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Find the selected provider or use sampleData
  const selectedProvider = providerData || providers.find((p: any) => p.id === selectedProviderId) || sampleData;

  const html = template?.editedHtmlContent || template?.htmlPreviewContent || '';

  // Get mapping for this template
  const mapping: FieldMapping[] | undefined = mappings?.[templateId]?.mappings;
  // Merge placeholders using mergeTemplateWithData for proper formatting and mapping
  const { content: mergedHtml, warnings: unresolvedPlaceholders } = useMemo(() => {
    if (!template) return { content: '', warnings: [] };
    return mergeTemplateWithData(template, selectedProvider, html, mapping);
  }, [template, selectedProvider, html, mapping]);

  const handleDownload = async () => {
    if (!template) return;

    // Use the S3 download logic
    if (template.docxTemplate) {
      // docxTemplate is the key, e.g., "templates/TEMPLATE_ID/FILENAME.docx"
      // We need to extract the fileName part.
      const fileName = template.docxTemplate.split('/').pop();
      if (!fileName) {
        alert('Could not determine the file name from the S3 key.');
        return;
      }
      const file = await getDocxFile(template.id, fileName);
      if (file) {
        saveAs(file, `${template.name}.docx`);
      } else {
        alert('Could not download the template file from S3.');
      }
      return;
    }

    // Fallback for non-S3/older templates
    const blob = await convertHtmlToDocx(mergedHtml);
    saveAs(blob, `${template.name}.docx`);
  };
  
  const handleSaveEditedHtml = (editedHtml: string) => {
    // Logic to save edited HTML
  };

  if (!template) {
    return <div className="text-red-500">Template not found.</div>;
  }

  // Prepare options for react-select
  const providerOptions: ProviderOption[] = providers.map((p: any) => ({
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
        <div dangerouslySetInnerHTML={{ __html: mergedHtml }} />
      </div>
      {unresolvedPlaceholders && unresolvedPlaceholders.length > 0 && (
        <div className="mt-4 text-sm text-red-600">
          <strong>Unresolved placeholders:</strong> {unresolvedPlaceholders.join(', ')}
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