import { Provider, ProviderUploadSchema } from '../../../types/provider';
import { generateClient } from 'aws-amplify/api';
import { createProvider } from '../../../graphql/mutations';
import { performHealthCheck, validateHealthCheck } from '../../../utils/aws-health-check';
import Papa from 'papaparse';
import type { CreateProviderInput } from '../../../API';
import { 
  PROVIDER_SCHEMA, 
  createFieldLookup, 
  mapCsvHeader, 
  parseFieldValue, 
  isSchemaField 
} from '../../../config/providerSchema';

type CompensationModel = 'BASE' | 'PRODUCTIVITY' | 'HYBRID' | 'HOSPITALIST' | 'LEADERSHIP';

export interface UploadResult {
  success: boolean;
  providers: Provider[];
  errors: string[];
  uploadedCount: number;
  failedCount: number;
  details: {
    parsed: boolean;
    validated: boolean;
    uploaded: boolean;
    healthCheck: boolean;
  };
}

export interface UploadOptions {
  retries?: number;
  batchSize?: number;
  validateOnly?: boolean;
}

const DEFAULT_OPTIONS: Required<UploadOptions> = {
  retries: 3,
  batchSize: 25,
  validateOnly: false,
};

export class ProviderUploadService {
  private client = generateClient();
  private fieldLookup = createFieldLookup();

  constructor(private options: UploadOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  async uploadFromCSV(file: File): Promise<UploadResult> {
    const result: UploadResult = {
      success: false,
      providers: [],
      errors: [],
      uploadedCount: 0,
      failedCount: 0,
      details: {
        parsed: false,
        validated: false,
        uploaded: false,
        healthCheck: false,
      },
    };

    try {
      // Step 1: Health Check
      const healthCheck = await performHealthCheck();
      const healthIssues = validateHealthCheck(healthCheck);
      
      if (healthIssues.length > 0) {
        result.errors.push(...healthIssues);
        return result;
      }
      result.details.healthCheck = true;

      // Step 2: Parse CSV
      const providers = await this.parseCSV(file);
      result.providers = providers;
      result.details.parsed = true;

      // Step 3: Validate Data
      const validationResult = await this.validateProviders(providers);
      if (!validationResult.success) {
        result.errors.push(...validationResult.errors);
        return result;
      }
      result.details.validated = true;

      // Step 4: Upload to DynamoDB (if not validate only)
      if (!this.options.validateOnly) {
        const uploadResult = await this.uploadProviders(providers);
        result.uploadedCount = uploadResult.uploaded;
        result.failedCount = uploadResult.failed;
        result.errors.push(...uploadResult.errors);
        result.details.uploaded = uploadResult.uploaded > 0;
      }

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : 'Unknown error during upload');
      return result;
    }
  }

  private async parseCSV(file: File): Promise<Provider[]> {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const providers = results.data.map((row) => {
              // Initialize provider with required fields
              const provider: any = {
                id: crypto.randomUUID(),
                name: '',
                compensationModel: 'BASE' as CompensationModel,
              };

              // Separate flat fields from dynamic fields
              const dynamicFields: Record<string, any> = {};
              
              // Process each CSV column
              Object.entries(row).forEach(([csvHeader, value]) => {
                if (!value || value.trim() === '') return;

                // Try to map CSV header to schema field
                const schemaField = mapCsvHeader(csvHeader);
                
                if (schemaField) {
                  // Store as flat field in DynamoDB
                  const parsedValue = parseFieldValue(schemaField, value);
                  if (parsedValue !== null) {
                    provider[schemaField] = parsedValue;
                  }
                } else {
                  // Store as dynamic field only if truly unknown
                  console.log(`Unknown column detected: "${csvHeader}" - storing in dynamicFields`);
                  dynamicFields[csvHeader] = value.trim();
                }
              });

              // Only add dynamicFields if there are truly unknown columns
              if (Object.keys(dynamicFields).length > 0) {
                provider.dynamicFields = JSON.stringify(dynamicFields);
                console.log(`Provider ${provider.name} has ${Object.keys(dynamicFields).length} dynamic fields:`, Object.keys(dynamicFields));
              }

              // Ensure required fields have defaults
              if (!provider.name) provider.name = 'Unknown Provider';
              if (!provider.fte) provider.fte = 1.0;
              if (!provider.compensationModel) provider.compensationModel = 'BASE';

              return provider as Provider;
            });

            console.log(`Parsed ${providers.length} providers from CSV`);
            resolve(providers);
          } catch (error) {
            reject(new Error('Failed to parse provider data: ' + (error instanceof Error ? error.message : 'Unknown error')));
          }
        },
        error: (error) => {
          reject(new Error('CSV parsing error: ' + error.message));
        }
      });
    });
  }

  private async validateProviders(providers: Provider[]): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    providers.forEach((provider, index) => {
      // Basic validation
      if (!provider.name || provider.name.trim() === '') {
        errors.push(`Row ${index + 1}: Provider name is required`);
      }
      
      // Add more validation as needed
      if (provider.fte && (provider.fte < 0 || provider.fte > 2)) {
        errors.push(`Row ${index + 1}: FTE must be between 0 and 2`);
      }
    });

    return {
      success: errors.length === 0,
      errors
    };
  }

  private async uploadProviders(providers: Provider[]): Promise<{ uploaded: number; failed: number; errors: string[] }> {
    const result = { uploaded: 0, failed: 0, errors: [] as string[] };
    const batches = this.chunkArray(providers, this.options.batchSize || DEFAULT_OPTIONS.batchSize);

    for (const batch of batches) {
      const batchResults = await Promise.allSettled(
        batch.map(provider => this.uploadWithRetry(provider))
      );

      batchResults.forEach((batchResult, index) => {
        if (batchResult.status === 'fulfilled') {
          result.uploaded++;
        } else {
          result.failed++;
          result.errors.push(`Failed to upload ${batch[index].name}: ${batchResult.reason}`);
        }
      });
    }

    return result;
  }

  private async uploadWithRetry(provider: Provider, attempt = 1): Promise<void> {
    try {
      // Transform the provider data to match the DynamoDB schema
      const input: CreateProviderInput = {
        id: provider.id,
        name: provider.name && provider.name.trim() !== '' ? provider.name : 'Unknown Provider', // Ensure name is never null/undefined/empty
        employeeId: provider.employeeId,
        providerType: provider.providerType,
        specialty: provider.specialty,
        subspecialty: provider.subspecialty,
        fte: provider.fte,
        administrativeFte: provider.administrativeFte,
        administrativeRole: provider.administrativeRole,
        yearsExperience: provider.yearsExperience,
        hourlyWage: provider.hourlyWage,
        baseSalary: provider.baseSalary,
        originalAgreementDate: provider.originalAgreementDate,
        organizationName: provider.organizationName && provider.organizationName.trim() !== '' ? provider.organizationName : 'Default Organization', // Required field
        organizationId: provider.organizationId && provider.organizationId.trim() !== '' ? provider.organizationId : 'default-org-id', // Required field
        startDate: provider.startDate,
        contractTerm: provider.contractTerm,
        ptoDays: provider.ptoDays,
        holidayDays: provider.holidayDays,
        cmeDays: provider.cmeDays,
        cmeAmount: provider.cmeAmount,
        signingBonus: provider.signingBonus,
        educationBonus: provider.educationBonus,
        qualityBonus: provider.qualityBonus,
        compensationType: provider.compensationModel || null, // Handle empty compensation type
        conversionFactor: provider.conversionFactor || null, // Handle empty conversion factor
        wRVUTarget: provider.wRVUTarget || null, // Handle empty wRVU Target values
        compensationYear: provider.compensationYear || null, // Handle empty compensation year
        credentials: provider.credentials,
        // Only include dynamicFields if it exists and has content
        dynamicFields: typeof provider.dynamicFields === 'string' ? provider.dynamicFields : null,
      };

      console.log('Original provider data:', JSON.stringify(provider, null, 2));
      console.log('Transformed input data:', JSON.stringify(input, null, 2));
      console.log('Provider name:', provider.name, 'Type:', typeof provider.name);
      console.log('Organization name:', provider.organizationName, 'Type:', typeof provider.organizationName);
      console.log('Organization ID:', provider.organizationId, 'Type:', typeof provider.organizationId);
      console.log('wRVU Target:', provider.wRVUTarget, 'Type:', typeof provider.wRVUTarget);
      console.log('Compensation Type:', provider.compensationModel, 'Type:', typeof provider.compensationModel);
      console.log('Conversion Factor:', provider.conversionFactor, 'Type:', typeof provider.conversionFactor);
      
      // Check for any null/undefined values in the input
      const nullFields = Object.entries(input).filter(([key, value]) => value === null || value === undefined);
      if (nullFields.length > 0) {
        console.log('⚠️ WARNING: Found null/undefined fields:', nullFields);
      }

      // Ensure all required fields are present and not null
      const sanitizedInput: CreateProviderInput = {
        ...input,
        name: input.name || 'Unknown Provider',
        organizationName: input.organizationName || 'Default Organization',
        organizationId: input.organizationId || 'default-org-id',
      };
      
      // Remove null/undefined values
      const finalInput = Object.fromEntries(
        Object.entries(sanitizedInput).filter(([key, value]) => value !== null && value !== undefined)
      ) as CreateProviderInput;
      
      console.log('Final input:', JSON.stringify(finalInput, null, 2));
      
      // Log the exact GraphQL variables being sent
      console.log('🔍 GraphQL variables being sent:', JSON.stringify({ input: finalInput }, null, 2));
      
      try {
        await this.client.graphql({
          query: createProvider,
          variables: { input: finalInput },
          authMode: 'apiKey'
        });
      } catch (error) {
        console.error('❌ GraphQL error details:', error);
        console.error('❌ Failed input:', JSON.stringify(finalInput, null, 2));
        throw error;
      }

      console.log('Successfully uploaded provider:', provider.name);
    } catch (error) {
      if (attempt < (this.options.retries || DEFAULT_OPTIONS.retries)) {
        console.log(`Retrying upload for ${provider.name} (attempt ${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this.uploadWithRetry(provider, attempt + 1);
      }
      throw error;
    }
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
} 