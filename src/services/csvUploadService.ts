/**
 * Enterprise CSV Upload Service
 * 
 * This service handles CSV parsing, validation, and data transformation
 * using the new flexible provider schema system.
 */

import Papa from 'papaparse';
import { z } from 'zod';
import { 
  PROVIDER_SCHEMA, 
  SYSTEM_FIELDS, 
  REQUIRED_FIELDS,
  mapCsvHeader,
  parseFieldValue,
  validateCsvHeaders,
  isSchemaField,
  type ProviderSchemaField 
} from '../config/providerSchema';

export interface CsvUploadResult {
  success: boolean;
  data: ProviderData[];
  errors: ValidationError[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
  };
  columnAnalysis: {
    recognizedColumns: string[];
    extraColumns: string[];
    missingRequiredColumns: string[];
  };
}

export interface ProviderData {
  // Core fields that will be stored as top-level DynamoDB attributes
  [key: string]: any;
  
  // System fields
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ValidationError {
  row: number;
  field?: string;
  message: string;
  type: 'missing_required' | 'invalid_format' | 'duplicate' | 'validation_error';
  value?: any;
}

export interface CsvUploadOptions {
  allowExtraColumns: boolean;
  skipDuplicates: boolean;
  validateOnly: boolean;
  batchSize: number;
}

const DEFAULT_OPTIONS: CsvUploadOptions = {
  allowExtraColumns: true,
  skipDuplicates: true,
  validateOnly: false,
  batchSize: 25
};

/**
 * Zod schema for provider validation
 */
const createProviderValidationSchema = () => {
  const schemaObject: Record<string, z.ZodTypeAny> = {};
  
  PROVIDER_SCHEMA.forEach(field => {
    let zodType: z.ZodTypeAny;
    
    switch (field.type) {
      case 'string':
        zodType = z.string();
        break;
      case 'number':
        zodType = z.number();
        break;
      case 'boolean':
        zodType = z.boolean();
        break;
      case 'date':
        zodType = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
        break;
      default:
        zodType = z.any();
    }
    
    // Apply validation constraints
    if (field.validation) {
      if (field.type === 'number') {
        if (field.validation.min !== undefined) {
          zodType = (zodType as z.ZodNumber).min(field.validation.min);
        }
        if (field.validation.max !== undefined) {
          zodType = (zodType as z.ZodNumber).max(field.validation.max);
        }
      }
      if (field.validation.pattern && field.type === 'string') {
        zodType = (zodType as z.ZodString).regex(new RegExp(field.validation.pattern));
      }
    }
    
    // Make optional if not required
    if (!field.required) {
      zodType = zodType.optional().nullable();
    }
    
    schemaObject[field.key] = zodType;
  });
  
  // Add system fields
  schemaObject.id = z.string();
  schemaObject.createdAt = z.string();
  schemaObject.updatedAt = z.string();
  
  return z.object(schemaObject).passthrough(); // Allow extra fields
};

export class CsvUploadService {
  private options: CsvUploadOptions;
  private validationSchema: z.ZodSchema;
  
  constructor(options: Partial<CsvUploadOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.validationSchema = createProviderValidationSchema();
  }
  
  /**
   * Parse and validate CSV file
   */
  async parseAndValidateCsv(file: File): Promise<CsvUploadResult> {
    try {
      // Step 1: Parse CSV
      const parseResult = await this.parseCSV(file);
      if (!parseResult.success) {
        return {
          success: false,
          data: [],
          errors: parseResult.errors,
          summary: {
            totalRows: 0,
            validRows: 0,
            invalidRows: parseResult.errors.length,
            duplicateRows: 0
          },
          columnAnalysis: {
            recognizedColumns: [],
            extraColumns: [],
            missingRequiredColumns: []
          }
        };
      }
      
      // Step 2: Validate headers
      const headerValidation = validateCsvHeaders(parseResult.headers);
      
      // Step 3: Transform and validate data
      const transformResult = await this.transformAndValidateData(
        parseResult.data,
        parseResult.headers,
        headerValidation.mapped
      );
      
      return {
        success: transformResult.errors.length === 0,
        data: transformResult.data,
        errors: transformResult.errors,
        summary: {
          totalRows: parseResult.data.length,
          validRows: transformResult.data.length,
          invalidRows: transformResult.errors.length,
          duplicateRows: transformResult.duplicates
        },
        columnAnalysis: {
          recognizedColumns: Object.keys(headerValidation.mapped),
          extraColumns: headerValidation.extra,
          missingRequiredColumns: headerValidation.missing
        }
      };
      
    } catch (error) {
      return {
        success: false,
        data: [],
        errors: [{
          row: 0,
          message: `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'validation_error'
        }],
        summary: {
          totalRows: 0,
          validRows: 0,
          invalidRows: 1,
          duplicateRows: 0
        },
        columnAnalysis: {
          recognizedColumns: [],
          extraColumns: [],
          missingRequiredColumns: []
        }
      };
    }
  }
  
  /**
   * Parse CSV file using PapaParse
   */
  private parseCSV(file: File): Promise<{
    success: boolean;
    data: Record<string, string>[];
    headers: string[];
    errors: ValidationError[];
  }> {
    return new Promise((resolve) => {
             Papa.parse<Record<string, string>>(file, {
         header: true,
         skipEmptyLines: true,
        complete: (results) => {
          const errors: ValidationError[] = [];
          
          // Check for parsing errors
          if (results.errors.length > 0) {
            results.errors.forEach(error => {
              errors.push({
                row: error.row || 0,
                message: `CSV parsing error: ${error.message}`,
                type: 'validation_error'
              });
            });
          }
          
          // Validate we have data
          if (!results.data || results.data.length === 0) {
            errors.push({
              row: 0,
              message: 'CSV file contains no data rows',
              type: 'validation_error'
            });
          }
          
          // Validate we have headers
          const headers = results.meta.fields || [];
          if (headers.length === 0) {
            errors.push({
              row: 0,
              message: 'CSV file contains no headers',
              type: 'validation_error'
            });
          }
          
          resolve({
            success: errors.length === 0,
            data: results.data || [],
            headers,
            errors
          });
        },
        error: (error) => {
          resolve({
            success: false,
            data: [],
            headers: [],
            errors: [{
              row: 0,
              message: `Failed to parse CSV: ${error.message}`,
              type: 'validation_error'
            }]
          });
        }
      });
    });
  }
  
  /**
   * Transform and validate CSV data
   */
  private async transformAndValidateData(
    rawData: Record<string, string>[],
    headers: string[],
    headerMapping: Record<string, string>
  ): Promise<{
    data: ProviderData[];
    errors: ValidationError[];
    duplicates: number;
  }> {
    const validData: ProviderData[] = [];
    const errors: ValidationError[] = [];
    const seenEmployeeIds = new Set<string>();
    let duplicates = 0;
    
    for (let i = 0; i < rawData.length; i++) {
      const rowNumber = i + 2; // Account for header row
      const rawRow = rawData[i];
      
      try {
        // Transform row data
        const transformedRow = this.transformRow(rawRow, headers, headerMapping);
        
        // Check for duplicates (based on employeeId + compensationYear)
        const duplicateKey = `${transformedRow.employeeId}-${transformedRow.compensationYear}`;
        if (this.options.skipDuplicates && seenEmployeeIds.has(duplicateKey)) {
          duplicates++;
          errors.push({
            row: rowNumber,
            message: `Duplicate provider: ${transformedRow.name} (${transformedRow.employeeId}) for year ${transformedRow.compensationYear}`,
            type: 'duplicate',
            field: 'employeeId'
          });
          continue;
        }
        seenEmployeeIds.add(duplicateKey);
        
        // Validate required fields
        const missingFields = this.validateRequiredFields(transformedRow);
        if (missingFields.length > 0) {
          missingFields.forEach(field => {
            errors.push({
              row: rowNumber,
              field,
              message: `Missing required field: ${field}`,
              type: 'missing_required'
            });
          });
          continue;
        }
        
        // Validate using Zod schema
        const validationResult = this.validationSchema.safeParse(transformedRow);
        if (!validationResult.success) {
          validationResult.error.errors.forEach(error => {
            errors.push({
              row: rowNumber,
              field: error.path.join('.'),
              message: error.message,
              type: 'validation_error',
              value: error.path.reduce((obj, key) => obj?.[key], transformedRow)
            });
          });
          continue;
        }
        
        validData.push(validationResult.data as ProviderData);
        
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: `Row transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'validation_error'
        });
      }
    }
    
    return {
      data: validData,
      errors,
      duplicates
    };
  }
  
  /**
   * Transform a single CSV row to provider data
   */
  private transformRow(
    rawRow: Record<string, string>,
    headers: string[],
    headerMapping: Record<string, string>
  ): ProviderData {
    const now = new Date().toISOString();
    const transformedRow: ProviderData = {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now
    };
    
    // Process each CSV column
    headers.forEach(csvHeader => {
      const rawValue = rawRow[csvHeader];
      
      // Skip empty values
      if (!rawValue || rawValue.trim() === '') {
        return;
      }
      
      // Check if this is a known schema field
      const schemaKey = headerMapping[csvHeader];
      if (schemaKey) {
        // Map to schema field
        const parsedValue = parseFieldValue(schemaKey, rawValue);
        if (parsedValue !== null) {
          transformedRow[schemaKey] = parsedValue;
        }
      } else if (this.options.allowExtraColumns) {
        // Store extra columns as-is (no more dynamicFields duplication)
        transformedRow[csvHeader] = rawValue.trim();
      }
    });
    
    return transformedRow;
  }
  
  /**
   * Validate required fields are present
   */
  private validateRequiredFields(data: ProviderData): string[] {
    const missing: string[] = [];
    
    REQUIRED_FIELDS.forEach(fieldKey => {
      const value = data[fieldKey];
      if (value === null || value === undefined || value === '') {
        missing.push(fieldKey);
      }
    });
    
    return missing;
  }
  
  /**
   * Generate a sample CSV template based on schema
   */
  static generateCsvTemplate(): string {
    const headers = PROVIDER_SCHEMA.map(field => field.label);
    
    // Add sample data row
    const sampleRow = PROVIDER_SCHEMA.map(field => {
      switch (field.type) {
        case 'string':
          return field.key === 'name' ? 'John Doe' :
                 field.key === 'employeeId' ? 'EMP001' :
                 field.key === 'specialty' ? 'Internal Medicine' :
                 'Sample';
        case 'number':
          return field.format === 'currency' ? '100000' :
                 field.format === 'percentage' ? '1.0' :
                 '1';
        case 'date':
          return '2024-01-01';
        case 'boolean':
          return 'true';
        default:
          return '';
      }
    });
    
    return [headers, sampleRow]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
  
  /**
   * Export validation errors as CSV
   */
  static exportErrorsAsCsv(errors: ValidationError[]): string {
    const headers = ['Row', 'Field', 'Error Type', 'Message', 'Value'];
    const rows = errors.map(error => [
      error.row.toString(),
      error.field || '',
      error.type,
      error.message,
      error.value ? String(error.value) : ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }
}

/**
 * Utility functions for CSV processing
 */
export const csvUtils = {
  /**
   * Download CSV template
   */
  downloadTemplate: () => {
    const csv = CsvUploadService.generateCsvTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'provider-template.csv';
    link.click();
  },
  
  /**
   * Download validation errors
   */
  downloadErrors: (errors: ValidationError[]) => {
    const csv = CsvUploadService.exportErrorsAsCsv(errors);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'upload-errors.csv';
    link.click();
  }
}; 