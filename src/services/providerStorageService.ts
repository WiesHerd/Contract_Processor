/**
 * Enterprise Provider Storage Service
 * 
 * This service handles storing provider data to DynamoDB using a flat structure
 * that eliminates duplication between schema fields and dynamicFields.
 */

import { generateClient } from 'aws-amplify/api';
import { updateProvider } from '../graphql/mutations';
import { SYSTEM_FIELDS } from '../config/providerSchema';
import type { ProviderData } from './csvUploadService';

// Custom GraphQL mutation that only requests fields that exist in the schema
const createProviderCustom = /* GraphQL */ `
  mutation CreateProvider($input: CreateProviderInput!) {
    createProvider(input: $input) {
      id
      employeeId
      name
      providerType
      specialty
      subspecialty
      yearsExperience
      hourlyWage
      baseSalary
      originalAgreementDate
      organizationName
      organizationId
      startDate
      contractTerm
      ptoDays
      holidayDays
      cmeDays
      cmeAmount
      signingBonus
      qualityBonus
      educationBonus
      compensationType
      conversionFactor
      wRVUTarget
      compensationYear
      credentials
      compensationModel
      administrativeFte
      administrativeRole
      fteBreakdown {
        activity
        percentage
      }
      templateTag
      dynamicFields
      createdAt
      updatedAt
      owner
    }
  }
`;

export interface StorageResult {
  success: boolean;
  uploaded: number;
  failed: number;
  errors: StorageError[];
}

export interface StorageError {
  providerId?: string;
  providerName?: string;
  message: string;
  originalError?: any;
}

export interface StorageOptions {
  batchSize: number;
  retries: number;
  retryDelay: number;
}

const DEFAULT_OPTIONS: StorageOptions = {
  batchSize: 25, // DynamoDB batch write limit
  retries: 3,
  retryDelay: 1000
};

export class ProviderStorageService {
  private client = generateClient();
  private options: StorageOptions;
  
  constructor(options: Partial<StorageOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  
  /**
   * Store multiple providers to DynamoDB
   */
  async storeProviders(providers: ProviderData[]): Promise<StorageResult> {
    const result: StorageResult = {
      success: true,
      uploaded: 0,
      failed: 0,
      errors: []
    };
    
    if (providers.length === 0) {
      return result;
    }
    
    // Process in batches
    const batches = this.chunkArray(providers, this.options.batchSize);
    
    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(provider => this.storeProviderWithRetry(provider))
      );
      
      batchResults.forEach((batchResult, index) => {
        const provider = batch[index];
        if (batchResult.status === 'fulfilled') {
          result.uploaded++;
        } else {
          result.failed++;
          result.errors.push({
            providerId: provider.id,
            providerName: provider.name,
            message: batchResult.reason instanceof Error ? batchResult.reason.message : 'Unknown error',
            originalError: batchResult.reason
          });
        }
      });
    }
    
    result.success = result.failed === 0;
    return result;
  }
  
  /**
   * Store a single provider with retry logic
   */
  private async storeProviderWithRetry(provider: ProviderData, attempt = 1): Promise<void> {
    try {
      await this.storeProvider(provider);
    } catch (error) {
      if (attempt < this.options.retries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay * attempt));
        return this.storeProviderWithRetry(provider, attempt + 1);
      }
      throw error;
    }
  }
  
  /**
   * Store a single provider to DynamoDB
   */
  private async storeProvider(provider: ProviderData): Promise<void> {
    // Transform provider data to DynamoDB input format
    const input = this.transformToCreateInput(provider);
    
    try {
      await this.client.graphql({
        query: createProviderCustom, // Use custom mutation instead of auto-generated one
        variables: { input },
        authMode: 'apiKey'
      });
      
      console.log(`Successfully stored provider: ${provider.name} (${provider.id})`);
    } catch (error) {
      console.error(`Failed to store provider ${provider.name}:`, error);
      throw new Error(`Failed to store provider ${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Update an existing provider
   */
  async updateProvider(providerId: string, updates: Partial<ProviderData>): Promise<void> {
    const input = {
      id: providerId,
      ...this.transformToUpdateInput(updates)
    };
    
    try {
      await this.client.graphql({
        query: updateProvider,
        variables: { input },
        authMode: 'apiKey'
      });
      
      console.log(`Successfully updated provider: ${providerId}`);
    } catch (error) {
      console.error(`Failed to update provider ${providerId}:`, error);
      throw new Error(`Failed to update provider: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Transform provider data to DynamoDB CreateProviderInput format
   * 
   * Key changes from old system:
   * 1. All fields are stored as top-level attributes
   * 2. No duplication between schema fields and dynamicFields
   * 3. Extra columns are stored directly as top-level fields
   */
  private transformToCreateInput(provider: ProviderData): any {
    const input: any = {};
    
    // Copy all fields directly to top level
    Object.entries(provider).forEach(([key, value]) => {
      // Skip system fields that shouldn't be sent to GraphQL
      if (key === '__typename') {
        return;
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return;
      }
      
      // Store all fields as top-level attributes
      input[key] = value;
    });
    
    return input;
  }
  
  /**
   * Transform partial updates to DynamoDB UpdateProviderInput format
   */
  private transformToUpdateInput(updates: Partial<ProviderData>): any {
    const input: any = {
      updatedAt: new Date().toISOString()
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      // Skip system fields that shouldn't be updated
      if (SYSTEM_FIELDS.includes(key) || key === '__typename') {
        return;
      }
      
      // Handle null/undefined values
      if (value === null || value === undefined) {
        return;
      }
      
      input[key] = value;
    });
    
    return input;
  }
  
  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
  
  /**
   * Validate provider data before storage
   */
  validateProviderData(provider: ProviderData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check required fields
    if (!provider.id) {
      errors.push('Provider ID is required');
    }
    
    if (!provider.name || provider.name.trim() === '') {
      errors.push('Provider name is required');
    }
    
    if (!provider.employeeId || provider.employeeId.trim() === '') {
      errors.push('Employee ID is required');
    }
    
    if (!provider.compensationYear || provider.compensationYear.trim() === '') {
      errors.push('Compensation year is required');
    }
    
    // Check for data types
    if (provider.baseSalary && typeof provider.baseSalary !== 'number') {
      errors.push('Base salary must be a number');
    }
    
    if (provider.totalFTE && (typeof provider.totalFTE !== 'number' || provider.totalFTE < 0 || provider.totalFTE > 1)) {
      errors.push('Total FTE must be a number between 0 and 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Clean up provider data by removing duplicated fields
   * This is useful for migrating existing data
   */
  cleanupProviderData(provider: any): ProviderData {
    const cleaned: ProviderData = {
      id: provider.id,
      createdAt: provider.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Copy all non-system fields
    Object.entries(provider).forEach(([key, value]) => {
      if (!SYSTEM_FIELDS.includes(key) && key !== 'dynamicFields') {
        cleaned[key] = value;
      }
    });
    
    // If there are dynamic fields, merge them as top-level fields
    // This handles migration from the old system
    if (provider.dynamicFields) {
      try {
        const dynamicFields = typeof provider.dynamicFields === 'string' 
          ? JSON.parse(provider.dynamicFields) 
          : provider.dynamicFields;
        
        if (dynamicFields && typeof dynamicFields === 'object') {
          Object.entries(dynamicFields).forEach(([key, value]) => {
            // Only add if not already present as a top-level field
            if (!(key in cleaned)) {
              cleaned[key] = value;
            }
          });
        }
      } catch (error) {
        console.warn('Failed to parse dynamic fields:', error);
      }
    }
    
    return cleaned;
  }
  
  /**
   * Get storage statistics
   */
  getStorageStats(results: StorageResult[]): {
    totalAttempted: number;
    totalUploaded: number;
    totalFailed: number;
    successRate: number;
    commonErrors: Record<string, number>;
  } {
    const totalAttempted = results.reduce((sum, r) => sum + r.uploaded + r.failed, 0);
    const totalUploaded = results.reduce((sum, r) => sum + r.uploaded, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
    
    const errorCounts: Record<string, number> = {};
    results.forEach(result => {
      result.errors.forEach(error => {
        const errorType = error.message.split(':')[0]; // Get error type
        errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
      });
    });
    
    return {
      totalAttempted,
      totalUploaded,
      totalFailed,
      successRate: totalAttempted > 0 ? (totalUploaded / totalAttempted) * 100 : 0,
      commonErrors: errorCounts
    };
  }
} 