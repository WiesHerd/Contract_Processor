/**
 * Utility functions for handling dynamic fields in Provider data
 * These functions safely manage the JSON storage of additional CSV columns
 */

export interface DynamicFields {
  [key: string]: string | number | boolean | null;
}

/**
 * Parse dynamic fields from JSON string
 * @param dynamicFieldsJson - JSON string from Provider.dynamicFields
 * @returns Parsed dynamic fields object or empty object if invalid
 */
export function parseDynamicFields(dynamicFieldsJson: string | null | undefined): DynamicFields {
  if (!dynamicFieldsJson) return {};
  
  try {
    const parsed = JSON.parse(dynamicFieldsJson);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse dynamic fields JSON:', error);
    return {};
  }
}

/**
 * Stringify dynamic fields to JSON string
 * @param dynamicFields - Dynamic fields object
 * @returns JSON string or null if empty
 */
export function stringifyDynamicFields(dynamicFields: DynamicFields): string | null {
  if (!dynamicFields || Object.keys(dynamicFields).length === 0) {
    return null;
  }
  
  try {
    return JSON.stringify(dynamicFields);
  } catch (error) {
    console.error('Failed to stringify dynamic fields:', error);
    return null;
  }
}

/**
 * Get a value from a provider, checking both schema fields and dynamic fields
 * @param provider - Provider object
 * @param fieldName - Field name to retrieve
 * @returns Field value or undefined if not found
 */
export function getProviderFieldValue(provider: any, fieldName: string): any {
  // First check if it's a schema field
  if (provider.hasOwnProperty(fieldName)) {
    return provider[fieldName];
  }
  
  // Then check dynamic fields
  const dynamicFields = parseDynamicFields(provider.dynamicFields);
  return dynamicFields[fieldName];
}

/**
 * Get all available field names from a provider (schema + dynamic)
 * @param provider - Provider object
 * @returns Array of field names
 */
export function getAllProviderFieldNames(provider: any): string[] {
  const schemaFields = Object.keys(provider).filter(key => key !== 'dynamicFields');
  const dynamicFields = parseDynamicFields(provider.dynamicFields);
  const dynamicFieldNames = Object.keys(dynamicFields);
  
  return [...schemaFields, ...dynamicFieldNames];
}

/**
 * Extract dynamic fields from CSV row data
 * @param csvRow - Raw CSV row data
 * @param schemaFields - Array of schema field names to exclude
 * @returns Object containing only the dynamic fields
 */
export function extractDynamicFields(csvRow: any, schemaFields: string[]): DynamicFields {
  const dynamicFields: DynamicFields = {};
  
  for (const [key, value] of Object.entries(csvRow)) {
    if (!schemaFields.includes(key)) {
      dynamicFields[key] = value as string | number | boolean | null;
    }
  }
  
  return dynamicFields;
}

/**
 * Validate that a field name is safe for use
 * @param fieldName - Field name to validate
 * @returns True if field name is valid
 */
export function isValidFieldName(fieldName: string): boolean {
  return typeof fieldName === 'string' && 
         fieldName.length > 0 && 
         fieldName.length <= 100 &&
         /^[a-zA-Z0-9_\s-]+$/.test(fieldName);
} 