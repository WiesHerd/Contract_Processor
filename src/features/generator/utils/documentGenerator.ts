import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { Clause } from '@/types/clause';
import { AuditLogEntry } from '@/store/slices/auditSlice';
import { LocalTemplateMapping } from '../../templates/mappingsSlice';
import localforage from 'localforage';

export async function loadTemplate(template: Template): Promise<Docxtemplater> {
  try {
    const docxKey = typeof template.docxTemplate === 'string' ? template.docxTemplate : '';
    const docxBlob = await localforage.getItem<Blob>(docxKey);
    if (!docxBlob) {
      throw new Error('Template file not found');
    }

    const content = await docxBlob.arrayBuffer();
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    return doc;
  } catch (error) {
    console.error('Error loading template:', error);
    throw new Error('Failed to load template file');
  }
}

export function prepareTemplateData(
  provider: Provider,
  mapping: LocalTemplateMapping
): Record<string, any> {
  const data: Record<string, any> = {};

  // Map provider data to placeholders based on mapping
  mapping.mappings.forEach((m) => {
    if (m.mappedColumn && provider[m.mappedColumn] !== undefined) {
      const value = provider[m.mappedColumn];
      
      // Format values based on type
      if (typeof value === 'number') {
        if (m.mappedColumn.toLowerCase().includes('salary') || 
            m.mappedColumn.toLowerCase().includes('bonus') ||
            m.mappedColumn.toLowerCase().includes('amount')) {
          data[m.placeholder] = `$${value.toLocaleString()}`;
        } else {
          data[m.placeholder] = value.toString();
        }
      } else {
        data[m.placeholder] = value;
      }
    } else {
      data[m.placeholder] = ''; // Empty string for unmapped fields
    }
  });

  return data;
}

export async function generateDocument(
  template: Template,
  provider: Provider,
  mapping: LocalTemplateMapping
): Promise<Blob> {
  try {
    const doc = await loadTemplate(template);
    const data = prepareTemplateData(provider, mapping);

    // Set the template data
    doc.setData(data);

    // Render the document
    doc.render();

    // Generate the output
    const output = doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });

    return output;
  } catch (error) {
    console.error('Error generating document:', error);
    throw new Error('Failed to generate document');
  }
}

export function downloadDocument(blob: Blob, provider: Provider, fileName?: string): void {
  const name = (typeof fileName === 'string' && fileName) ? fileName : `ScheduleB_${provider.name.replace(/\s+/g, '')}.docx`;
  saveAs(blob, name);
} 