/**
 * Enterprise Provider Schema Configuration
 * 
 * This configuration defines the expected CSV columns and their mapping to DynamoDB fields.
 * The system is designed to be flexible and support additional columns dynamically.
 */

export interface ProviderSchemaField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  required: boolean;
  variants: string[];
  format?: 'currency' | 'percentage' | 'date' | 'phone' | 'email';
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Core Provider Schema - Based on Target Column Schema
 * These are the expected columns in the CSV upload
 */
export const PROVIDER_SCHEMA: ProviderSchemaField[] = [
  // Core Identity Fields
  { key: 'compensationYear', label: 'Compensation Year', type: 'string', required: true, variants: ['compensation year', 'compensationyear', 'year'] },
  { key: 'employeeId', label: 'Employee ID', type: 'string', required: true, variants: ['employee id', 'employeeid', 'emp id'] },
  { key: 'name', label: 'Provider Name', type: 'string', required: true, variants: ['provider name', 'providername', 'name'] },
  { key: 'providerType', label: 'Provider Type', type: 'string', required: true, variants: ['provider type', 'providertype', 'type'] },
  
  // Clinical Classification
  { key: 'specialty', label: 'Specialty', type: 'string', required: true, variants: ['specialty'] },
  { key: 'subspecialty', label: 'Subspecialty', type: 'string', required: false, variants: ['subspecialty', 'sub specialty'] },
  { key: 'positionTitle', label: 'Position Title', type: 'string', required: false, variants: ['position title', 'positiontitle', 'title'] },
  { key: 'yearsExperience', label: 'Years of Experience', type: 'number', required: false, variants: ['years of experience', 'yearsofexperience', 'years experience', 'experience'] },
  
  // Compensation
  { key: 'hourlyWage', label: 'Hourly Wage', type: 'number', required: false, variants: ['hourly wage', 'hourlywage'], format: 'currency' },
  { key: 'baseSalary', label: 'BaseSalary', type: 'number', required: false, variants: ['basesalary', 'base salary', 'salary'], format: 'currency' },
  
  // Contract Details
  { key: 'originalAgreementDate', label: 'OriginalAgreementDate', type: 'date', required: false, variants: ['original agreement date', 'originalagreementdate', 'agreement date'] },
  { key: 'organizationName', label: 'OrganizationName', type: 'string', required: false, variants: ['organization name', 'organizationname', 'organization'] },
  { key: 'startDate', label: 'StartDate', type: 'date', required: false, variants: ['start date', 'startdate'] },
  { key: 'contractTerm', label: 'ContractTerm', type: 'string', required: false, variants: ['contract term', 'contractterm', 'term'] },
  
  // Benefits
  { key: 'ptoDays', label: 'PTODays', type: 'number', required: false, variants: ['pto days', 'ptodays', 'pto'] },
  { key: 'holidayDays', label: 'HolidayDays', type: 'number', required: false, variants: ['holiday days', 'holidaydays', 'holidays'] },
  { key: 'cmeDays', label: 'CMEDays', type: 'number', required: false, variants: ['cme days', 'cmedays', 'cme'] },
  { key: 'cmeAmount', label: 'CMEAmount', type: 'number', required: false, variants: ['cme amount', 'cmeamount'], format: 'currency' },
  
  // Bonuses
  { key: 'signingBonus', label: 'SigningBonus', type: 'number', required: false, variants: ['signing bonus', 'signingbonus'], format: 'currency' },
  { key: 'relocationBonus', label: 'RelocationBonus', type: 'number', required: false, variants: ['relocation bonus', 'relocationbonus'], format: 'currency' },
  { key: 'qualityBonus', label: 'QualityBonus', type: 'number', required: false, variants: ['quality bonus', 'qualitybonus'], format: 'currency' },
  
  // Productivity
  { key: 'compensationType', label: 'Compensation Type', type: 'string', required: false, variants: ['compensation type', 'compensationtype', 'comp type'] },
  { key: 'conversionFactor', label: 'ConversionFactor', type: 'number', required: false, variants: ['conversion factor', 'conversionfactor'] },
  { key: 'wRVUTarget', label: 'wRVUTarget', type: 'number', required: false, variants: ['wrvu target', 'wrvutarget', 'wrvu'] },
  
  // Credentials
  { key: 'credentials', label: 'Credentials', type: 'string', required: false, variants: ['credentials'] },
  
  // FTE Breakdown - New Target Schema
  { key: 'clinicalFTE', label: 'ClinicalFTE', type: 'number', required: false, variants: ['clinical fte', 'clinicalfte', 'ClinicalFTE'], format: 'percentage' },
  { key: 'medicalDirectorFTE', label: 'MedicalDirectorFTE', type: 'number', required: false, variants: ['medical director fte', 'medicaldirectorfte', 'MedicalDirectorFTE'], format: 'percentage' },
  { key: 'divisionChiefFTE', label: 'DivisionChiefFTE', type: 'number', required: false, variants: ['division chief fte', 'divisionchieffte', 'DivisionChiefFTE'], format: 'percentage' },
  { key: 'researchFTE', label: 'ResearchFTE', type: 'number', required: false, variants: ['research fte', 'researchfte', 'ResearchFTE'], format: 'percentage' },
  { key: 'teachingFTE', label: 'TeachingFTE', type: 'number', required: false, variants: ['teaching fte', 'teachingfte', 'TeachingFTE'], format: 'percentage' },
  { key: 'totalFTE', label: 'TotalFTE', type: 'number', required: false, variants: ['total fte', 'totalfte', 'fte', 'TotalFTE'], format: 'percentage' },
];

/**
 * Core system fields that are automatically managed
 */
export const SYSTEM_FIELDS = [
  'id',
  'createdAt',
  'updatedAt',
  'owner',
  '__typename'
];

/**
 * Required fields for provider creation
 */
export const REQUIRED_FIELDS = PROVIDER_SCHEMA
  .filter(field => field.required)
  .map(field => field.key);

/**
 * Create a normalized field lookup map for fast CSV header matching
 */
export const createFieldLookup = (): Map<string, string> => {
  const lookup = new Map<string, string>();
  
  PROVIDER_SCHEMA.forEach(field => {
    // Add the primary key
    lookup.set(normalizeFieldName(field.key), field.key);
    lookup.set(normalizeFieldName(field.label), field.key);
    
    // Add all variants
    field.variants.forEach(variant => {
      lookup.set(normalizeFieldName(variant), field.key);
    });
  });
  
  return lookup;
};

/**
 * Normalize field names for comparison
 */
export function normalizeFieldName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Get field configuration by key
 */
export function getFieldConfig(key: string): ProviderSchemaField | undefined {
  return PROVIDER_SCHEMA.find(field => field.key === key);
}

/**
 * Check if a field is a known schema field
 */
export function isSchemaField(fieldName: string): boolean {
  const lookup = createFieldLookup();
  return lookup.has(normalizeFieldName(fieldName));
}

/**
 * Map CSV header to schema field key
 */
export function mapCsvHeader(csvHeader: string): string | null {
  const lookup = createFieldLookup();
  return lookup.get(normalizeFieldName(csvHeader)) || null;
}

/**
 * Validate and parse field value according to schema
 */
export function parseFieldValue(fieldKey: string, value: string | null | undefined): any {
  if (!value || value.trim() === '') {
    return null;
  }
  
  const config = getFieldConfig(fieldKey);
  if (!config) {
    return value; // Return as-is for dynamic fields
  }
  
  switch (config.type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    
    case 'boolean':
      return ['true', '1', 'yes', 'y'].includes(value.toLowerCase());
    
    case 'date':
      // Accept various date formats and normalize to YYYY-MM-DD
      const date = new Date(value);
      return isNaN(date.getTime()) ? value : date.toISOString().split('T')[0];
    
    case 'string':
    default:
      return value.trim();
  }
}

/**
 * Format field value for display
 */
export function formatFieldValue(fieldKey: string, value: any): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  const config = getFieldConfig(fieldKey);
  if (!config?.format) {
    return String(value);
  }
  
  switch (config.format) {
    case 'currency':
      const num = parseFloat(value);
      return isNaN(num) ? String(value) : new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(num);
    
    case 'percentage':
      const pct = parseFloat(value);
      return isNaN(pct) ? String(value) : `${(pct * 100).toFixed(1)}%`;
    
    case 'date':
      const date = new Date(value);
      return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
    
    default:
      return String(value);
  }
}

/**
 * Get all expected CSV headers based on schema
 */
export function getExpectedCsvHeaders(): string[] {
  return PROVIDER_SCHEMA.map(field => field.label);
}

/**
 * Validate CSV headers against schema
 */
export function validateCsvHeaders(headers: string[]): {
  valid: boolean;
  missing: string[];
  extra: string[];
  mapped: Record<string, string>;
} {
  const lookup = createFieldLookup();
  const mapped: Record<string, string> = {};
  const recognizedHeaders = new Set<string>();
  
  // Map recognized headers
  headers.forEach(header => {
    const schemaKey = lookup.get(normalizeFieldName(header));
    if (schemaKey) {
      mapped[header] = schemaKey;
      recognizedHeaders.add(header);
    }
  });
  
  // Check for missing required fields
  const missing = REQUIRED_FIELDS.filter(requiredKey => 
    !Object.values(mapped).includes(requiredKey)
  );
  
  // Identify extra headers (not in schema)
  const extra = headers.filter(header => !recognizedHeaders.has(header));
  
  return {
    valid: missing.length === 0,
    missing: missing.map(key => getFieldConfig(key)?.label || key),
    extra,
    mapped
  };
} 