import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { FieldMapping } from '@/features/templates/mappingsSlice';
import { getTemplateFile } from '@/utils/s3Storage';
import { formatCurrency, formatDate } from '@/utils/format';

interface DocxGenerationResult {
  success: boolean;
  blob?: Blob;
  filename?: string;
  warnings?: string[];
  error?: string;
}

/**
 * Enhanced docxtemplater-based document generator
 * Provides better template processing and placeholder resolution
 */
export class DocxtemplaterGenerator {
  
  /**
   * Generate document using docxtemplater with provider data
   */
  static async generateDocument(
    template: Template,
    provider: Provider,
    mapping?: FieldMapping[]
  ): Promise<DocxGenerationResult> {
    try {
      // Load the DOCX template file
      const docxBlob = await this.loadTemplateFile(template);
      if (!docxBlob) {
        return {
          success: false,
          error: 'Template file not found or could not be loaded'
        };
      }

      // Prepare data for docxtemplater
      const templateData = this.prepareTemplateData(provider, mapping);
      
      // Process with docxtemplater
      const result = await this.processTemplate(docxBlob, templateData);
      
      if (result.success) {
        const filename = this.generateFilename(template, provider);
        return {
          success: true,
          blob: result.blob,
          filename,
          warnings: result.warnings
        };
      } else {
        return {
          success: false,
          error: result.error
        };
      }
    } catch (error) {
      console.error('DocxtemplaterGenerator error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Load template file from storage
   */
  private static async loadTemplateFile(template: Template): Promise<Blob | null> {
    try {
      if (!template.docxTemplate || typeof template.docxTemplate !== 'string') {
        throw new Error('No DOCX template file available');
      }

      const { url: docxUrl } = await getTemplateFile(template.id, template.docxTemplate);
      const response = await fetch(docxUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch template: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error loading template file:', error);
      return null;
    }
  }

  /**
   * Prepare provider data for docxtemplater
   */
  private static prepareTemplateData(
    provider: Provider,
    mapping?: FieldMapping[]
  ): Record<string, any> {
    const data: Record<string, any> = {};

    if (mapping && Array.isArray(mapping)) {
      // Use field mappings if available
      mapping.forEach(({ placeholder, mappedColumn }) => {
        if (!placeholder || !mappedColumn) return;
        
        const value = this.getProviderFieldValue(provider, mappedColumn);
        data[placeholder] = this.formatValue(mappedColumn, value);
      });
    } else {
      // Fallback to standard placeholders
      data.ProviderName = provider.name || '';
      data.StartDate = provider.startDate ? formatDate(provider.startDate) : '';
      data.BaseSalary = provider.baseSalary ? formatCurrency(provider.baseSalary) : '';
      data.FTE = provider.fte !== undefined ? provider.fte.toString() : '';
      data.Specialty = provider.specialty || '';
      data.Credentials = provider.credentials || '';
      
      // Add common fields
      if (provider.wRVUTarget) data.wRVUTarget = provider.wRVUTarget.toString();
      if (provider.conversionFactor) data.ConversionFactor = formatCurrency(provider.conversionFactor);
      if (provider.signingBonus) data.SigningBonus = formatCurrency(provider.signingBonus);
      if (provider.relocationBonus) data.RelocationBonus = formatCurrency(provider.relocationBonus);
      if (provider.qualityBonus) data.QualityBonus = formatCurrency(provider.qualityBonus);
      if (provider.cmeAmount) data.CMEAmount = formatCurrency(provider.cmeAmount);
      
      // Add dynamic fields from uploaded CSV
      if (provider.dynamicFields) {
        try {
          const dynamicFields = typeof provider.dynamicFields === 'string' 
            ? JSON.parse(provider.dynamicFields) 
            : provider.dynamicFields;
          
          Object.entries(dynamicFields).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
              data[key] = this.formatValue(key, value);
            }
          });
        } catch (e) {
          console.warn('Failed to parse dynamic fields:', e);
        }
      }
    }

    return data;
  }

  /**
   * Get field value from provider (checks both flat fields and dynamic fields)
   */
  private static getProviderFieldValue(provider: Provider, fieldName: string): any {
    // First try flat field (direct provider property)
    if (provider[fieldName as keyof Provider] !== undefined && provider[fieldName as keyof Provider] !== null) {
      return provider[fieldName as keyof Provider];
    }
    
    // Then try dynamicFields (uploaded CSV columns)
    if (provider.dynamicFields) {
      try {
        const dynamicFields = typeof provider.dynamicFields === 'string' 
          ? JSON.parse(provider.dynamicFields) 
          : provider.dynamicFields;
        
        // Try exact field name match first
        if (dynamicFields[fieldName] !== undefined && dynamicFields[fieldName] !== null) {
          return dynamicFields[fieldName];
        }
        
        // Try case-insensitive match for uploaded columns
        const fieldLower = fieldName.toLowerCase();
        const matchingKey = Object.keys(dynamicFields).find(key => 
          key.toLowerCase() === fieldLower
        );
        if (matchingKey && dynamicFields[matchingKey] !== undefined && dynamicFields[matchingKey] !== null) {
          return dynamicFields[matchingKey];
        }
      } catch (e) {
        console.warn('Failed to parse dynamicFields:', e);
      }
    }
    
    return null;
  }

  /**
   * Format value based on field type
   */
  private static formatValue(fieldName: string, value: any): string {
    if (value === null || value === undefined) return '';
    
    const fieldLower = fieldName.toLowerCase();
    
    // Currency fields
    if (fieldLower.includes('salary') || 
        fieldLower.includes('bonus') || 
        fieldLower.includes('amount') || 
        fieldLower.includes('wage')) {
      const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? String(value) : formatCurrency(num);
    }
    
    // Date fields
    if (fieldLower.includes('date')) {
      return formatDate(String(value));
    }
    
    // FTE fields
    if (fieldLower.includes('fte')) {
      const num = parseFloat(String(value));
      return isNaN(num) ? String(value) : num.toFixed(2);
    }
    
    // Number fields
    if (fieldLower.includes('target') || fieldLower.includes('factor')) {
      const num = parseFloat(String(value));
      return isNaN(num) ? String(value) : num.toLocaleString();
    }
    
    return String(value);
  }

  /**
   * Process template with docxtemplater
   */
  private static async processTemplate(
    templateBlob: Blob,
    data: Record<string, any>
  ): Promise<{ success: boolean; blob?: Blob; warnings?: string[]; error?: string }> {
    try {
      const arrayBuffer = await templateBlob.arrayBuffer();
      const zip = new PizZip(arrayBuffer);
      
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        nullGetter: () => '', // Replace null/undefined with empty string
      });

      // Set the template data
      doc.setData(data);

      // Render the document
      doc.render();

      // Generate the output blob
      const output = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      return {
        success: true,
        blob: output,
        warnings: []
      };
    } catch (error) {
      console.error('Docxtemplater processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template processing failed'
      };
    }
  }

  /**
   * Generate filename for the document
   */
  private static generateFilename(template: Template, provider: Provider): string {
    const contractYear = template.contractYear || new Date().getFullYear().toString();
    const runDate = new Date().toISOString().split('T')[0];
    const safeName = provider.name.replace(/[^a-zA-Z0-9]/g, '');
    return `${contractYear}_${safeName}_${template.name}_${runDate}.docx`;
  }

  /**
   * Preview template data (for debugging)
   */
  static previewTemplateData(
    provider: Provider,
    mapping?: FieldMapping[]
  ): Record<string, any> {
    return this.prepareTemplateData(provider, mapping);
  }
} 