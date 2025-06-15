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
import { addAuditLog } from '@/store/slices/auditSlice';
import { v4 as uuidv4 } from 'uuid';

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
  const providers = useSelector((state: any) => state.providers.providers);
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
  const { content: merged, warnings } = useMemo(() => {
    if (!template || !selectedProvider) return { content: html, warnings: [] };
    return mergeTemplateWithData(template, selectedProvider, html, mapping);
  }, [template, selectedProvider, html, mapping]);

  // Download as DOCX handler using html-docx-js
  const handleDownload = () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Contract</title>
          </head>
          <body style="font-family:Calibri,Arial,sans-serif; font-size:11pt;">
            ${merged}
          </body>
        </html>
      `;
      let providerName = selectedProvider?.ProviderName || selectedProvider?.name || 'Provider';
      providerName = providerName.replace(/[^a-zA-Z0-9]/g, '');
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlContent);
      const fileName = `ScheduleA_${providerName}_${dateStr}.docx`;
      const url = URL.createObjectURL(docxBlob);
      saveAs(docxBlob, fileName);
      // Audit log for preview download
      dispatch(addAuditLog({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        user: '-',
        providers: [providerName],
        template: template?.name || 'Unknown',
        outputType: 'DOCX',
        status: 'success' as const,
        downloadUrl: url,
      }));
    } catch (error) {
      console.error('Error generating DOCX:', error);
      alert('Failed to generate DOCX. Please try again.');
      // Audit log for failure
      dispatch(addAuditLog({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        user: '-',
        providers: [selectedProvider?.ProviderName || selectedProvider?.name || 'Provider'],
        template: template?.name || 'Unknown',
        outputType: 'DOCX',
        status: 'failed' as const,
        downloadUrl: undefined,
      }));
    }
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
        <div dangerouslySetInnerHTML={{ __html: merged }} />
      </div>
      {warnings && warnings.length > 0 && (
        <div className="mt-4 text-sm text-red-600">
          <strong>Unresolved placeholders:</strong> {warnings.join(', ')}
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