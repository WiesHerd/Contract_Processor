import { Document, Packer, Paragraph, TextRun } from 'docx';
import { Provider } from '../../types/provider';
import { Template } from '../../types/template';
import { mergeTemplateWithData } from './mergeUtils';

/**
 * Creates a DOCX document from merged content
 */
const createDocument = (content: string): Document => {
  // Split content into paragraphs and create document
  const paragraphs = content.split('\n\n').map(text => 
    new Paragraph({
      children: [
        new TextRun({
          text,
          size: 24, // 12pt
        }),
      ],
    })
  );

  return new Document({
    sections: [{
      properties: {},
      children: paragraphs,
    }],
  });
};

/**
 * Generates a filename for the contract
 */
const generateFilename = (provider: Provider): string => {
  const sanitizedName = provider.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `${sanitizedName}_schedule_a.docx`;
};

/**
 * Generates a contract document and returns the blob
 */
export const generateContractBlob = async (
  template: Template,
  provider: Provider,
  templateContent: string
): Promise<{ filename: string; blob: Blob; warnings: string[] }> => {
  try {
    // Merge template with provider data
    const { content, warnings } = mergeTemplateWithData(template, provider, templateContent);

    // Create document
    const doc = createDocument(content);

    // Generate blob
    const blob = await Packer.toBlob(doc);
    const filename = generateFilename(provider);

    return { filename, blob, warnings };
  } catch (error) {
    console.error('Error generating contract:', error);
    throw new Error('Failed to generate contract document');
  }
};

/**
 * Generates and downloads a single contract document
 */
export const generateContract = async (
  template: Template,
  provider: Provider,
  templateContent: string
): Promise<void> => {
  try {
    const { filename, blob, warnings } = await generateContractBlob(template, provider, templateContent);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    // Log any warnings
    if (warnings.length > 0) {
      console.warn('Contract generation warnings:', warnings);
    }
  } catch (error) {
    console.error('Error generating contract:', error);
    throw new Error('Failed to generate contract document');
  }
}; 