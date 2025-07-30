import { Provider, ProviderUploadSchema } from '../../../types/provider';
import { generateClient } from 'aws-amplify/api';
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
      totalFTE
      templateTag
      dynamicFields
      createdAt
      updatedAt
      owner
    }
  }
`;

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
      console.log('🔍 [DEBUG] Starting CSV parse for file:', file.name, 'Size:', file.size);
      
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            console.log('🔍 [DEBUG] Papa.parse results:', {
              data: results.data.length,
              errors: results.errors.length,
              meta: results.meta
            });
            
            console.log('🔍 [DEBUG] First few rows:', results.data.slice(0, 3));
            
            const providers = results.data.map((row, index) => {
              console.log(`🔍 [DEBUG] Processing row ${index + 1}:`, row);
              
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
                console.log(`🔍 [DEBUG] Row ${index + 1}, Column "${csvHeader}": "${value}"`);
                
                // Try to map CSV header to schema field
                const schemaField = mapCsvHeader(csvHeader);
                console.log(`🔍 [DEBUG] Mapped "${csvHeader}" to schema field: "${schemaField}"`);
                
                // Special debug for FTE and administrative role
                if (csvHeader.toLowerCase().includes('fte') || csvHeader.toLowerCase().includes('administrative')) {
                  console.log(`🔍 [DEBUG] FTE/Admin field mapping: "${csvHeader}" -> "${schemaField}"`);
                }
                
                if (schemaField) {
                  // For required fields, always set them even if empty
                  const isRequiredField = ['name', 'organizationName', 'organizationId'].includes(schemaField);
                  
                  if (!value || value.trim() === '' || value.toLowerCase() === 'null') {
                    if (isRequiredField) {
                      // Set default values for required fields
                      if (schemaField === 'organizationId') {
                        provider[schemaField] = 'default-org-id';
                        console.log(`🔍 [DEBUG] Set required field ${schemaField} = default-org-id`);
                      } else if (schemaField === 'organizationName') {
                        provider[schemaField] = 'Default Organization';
                        console.log(`🔍 [DEBUG] Set required field ${schemaField} = Default Organization`);
                      } else if (schemaField === 'name') {
                        provider[schemaField] = 'Unknown Provider';
                        console.log(`🔍 [DEBUG] Set required field ${schemaField} = Unknown Provider`);
                      }
                    } else {
                      // Skip empty values for non-required fields
                      console.log(`🔍 [DEBUG] Skipping empty value for field: ${schemaField}`);
                    }
                    return;
                  }
                  
                  // Store as flat field in DynamoDB
                  const parsedValue = parseFieldValue(schemaField, value);
                  console.log(`🔍 [DEBUG] Parsed value for ${schemaField}:`, parsedValue);
                  if (parsedValue !== null) {
                    provider[schemaField] = parsedValue;
                    
                    // Special debug for FTE and administrative role
                    if (schemaField === 'totalFTE' || schemaField === 'administrativeRole') {
                      console.log(`🔍 [DEBUG] Set ${schemaField} = ${parsedValue}`);
                    }
                  }
                } else {
                  // Store as dynamic field only if truly unknown
                  console.log(`🔍 [DEBUG] Unknown column detected: "${csvHeader}" - storing in dynamicFields`);
                  dynamicFields[csvHeader] = value.trim();
                }
              });

              // Only add dynamicFields if there are truly unknown columns
              if (Object.keys(dynamicFields).length > 0) {
                provider.dynamicFields = JSON.stringify(dynamicFields);
                console.log(`🔍 [DEBUG] Provider ${provider.name} has ${Object.keys(dynamicFields).length} dynamic fields:`, Object.keys(dynamicFields));
              }

              // Ensure required fields have defaults
              if (!provider.name) provider.name = 'Unknown Provider';
              if (!provider.organizationName) provider.organizationName = 'Default Organization';
              if (!provider.organizationId) provider.organizationId = 'default-org-id';
              if (!provider.fte) provider.fte = 1.0;
              if (!provider.compensationModel) provider.compensationModel = 'BASE';

              console.log(`🔍 [DEBUG] Final provider object for row ${index + 1}:`, provider);
              return provider as Provider;
            });

            console.log(`🔍 [DEBUG] Parsed ${providers.length} providers from CSV`);
            console.log(`🔍 [DEBUG] Sample provider structure:`, providers[0]);
            resolve(providers);
          } catch (error) {
            console.error('🔍 [DEBUG] Error in parseCSV:', error);
            reject(new Error('Failed to parse provider data: ' + (error instanceof Error ? error.message : 'Unknown error')));
          }
        },
        error: (error) => {
          console.error('🔍 [DEBUG] Papa.parse error:', error);
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
      console.log(`🔍 [DEBUG] Starting upload for provider: ${provider.name} (attempt ${attempt})`);
      console.log(`🔍 [DEBUG] Provider object:`, JSON.stringify(provider, null, 2));
      
      // STEP 1: Create the initial input with proper defaults for required fields
      const input: CreateProviderInput = {
        id: provider.id,
        name: provider.name && provider.name.trim() !== '' && provider.name.toLowerCase() !== 'null' ? provider.name : 'Unknown Provider',
        employeeId: provider.employeeId,
        providerType: provider.providerType,
        specialty: provider.specialty,
        subspecialty: provider.subspecialty,
        // TEMPORARILY REMOVED: positionTitle: (provider as any).positionTitle,
        fte: provider.fte,
        administrativeRole: provider.administrativeRole,
        yearsExperience: provider.yearsExperience,
        hourlyWage: provider.hourlyWage,
        baseSalary: provider.baseSalary,
        originalAgreementDate: provider.originalAgreementDate,
        // CRITICAL: These are required in GraphQL schema but optional in TypeScript
        organizationName: provider.organizationName && provider.organizationName.trim() !== '' && provider.organizationName.toLowerCase() !== 'null' ? provider.organizationName : 'Default Organization',
        organizationId: provider.organizationId && provider.organizationId.trim() !== '' && provider.organizationId.toLowerCase() !== 'null' ? provider.organizationId : 'default-org-id',
        startDate: provider.startDate,
        contractTerm: provider.contractTerm,
        ptoDays: provider.ptoDays,
        holidayDays: provider.holidayDays,
        cmeDays: provider.cmeDays,
        cmeAmount: provider.cmeAmount,
        signingBonus: provider.signingBonus,
        // TEMPORARILY REMOVED: relocationBonus: (provider as any).relocationBonus,
        educationBonus: provider.educationBonus,
        qualityBonus: provider.qualityBonus,
        compensationType: provider.compensationModel || null,
        conversionFactor: provider.conversionFactor || null,
        wRVUTarget: provider.wRVUTarget || null,
        compensationYear: provider.compensationYear || null,
        credentials: provider.credentials,
        // TEMPORARILY REMOVED: clinicalFTE: (provider as any).clinicalFTE,
        // TEMPORARILY REMOVED: medicalDirectorFTE: (provider as any).medicalDirectorFTE,
        // TEMPORARILY REMOVED: divisionChiefFTE: (provider as any).divisionChiefFTE,
        // TEMPORARILY REMOVED: researchFTE: (provider as any).researchFTE,
        // TEMPORARILY REMOVED: teachingFTE: (provider as any).teachingFTE,
        // TEMPORARILY REMOVED: totalFTE: (provider as any).totalFTE,
        dynamicFields: typeof provider.dynamicFields === 'string' ? provider.dynamicFields : null,
      };

      console.log('🔍 [DEBUG] Original provider data:', JSON.stringify(provider, null, 2));
      console.log('🔍 [DEBUG] Initial input data:', JSON.stringify(input, null, 2));

      // STEP 2: Validate required fields before any filtering
      const requiredFields = ['name', 'organizationName', 'organizationId'];
      const missingFields = requiredFields.filter(field => {
        const value = input[field as keyof CreateProviderInput];
        return !value || value === '' || value === 'null' || value === null;
      });

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // STEP 3: Create sanitized input with guaranteed required field values
      const sanitizedInput: CreateProviderInput = {
        ...input,
        // Force required fields to have non-null values
        name: input.name || 'Unknown Provider',
        organizationName: input.organizationName || 'Default Organization',
        organizationId: input.organizationId || 'default-org-id',
      };

      // STEP 4: Filter out null/undefined values EXCEPT for required fields
      const finalInput = Object.fromEntries(
        Object.entries(sanitizedInput).filter(([key, value]) => {
          // Always include required fields, even if they have default values
          if (requiredFields.includes(key)) {
            return true;
          }
          // Remove null/undefined for optional fields
          return value !== null && value !== undefined;
        })
      ) as CreateProviderInput;

      console.log('🔍 [DEBUG] Final input being sent to GraphQL:', JSON.stringify(finalInput, null, 2));
      console.log('🔍 [DEBUG] CreateProviderInput type check - required fields present:', {
        name: !!finalInput.name,
        organizationName: !!finalInput.organizationName,
        organizationId: !!finalInput.organizationId
      });

      // STEP 5: Make the GraphQL call
      console.log('🔍 [DEBUG] Making GraphQL createProvider call...');
      const response = await this.client.graphql({
        query: createProviderCustom, // Use custom mutation instead of auto-generated one
        variables: { input: finalInput }
      });

      console.log('🔍 [DEBUG] GraphQL response:', JSON.stringify(response, null, 2));
      
      if ((response as any).data?.createProvider) {
        console.log('🔍 [DEBUG] Successfully created provider:', (response as any).data.createProvider.id);
      } else {
        console.error('🔍 [DEBUG] No data in GraphQL response');
      }

    } catch (error) {
      console.error(`🔍 [DEBUG] Error uploading provider ${provider.name}:`, error);
      
      if (error instanceof Error) {
        console.error('🔍 [DEBUG] Error message:', error.message);
        console.error('🔍 [DEBUG] Error stack:', error.stack);
      }
      
      if (attempt < this.options.retries) {
        console.log(`🔍 [DEBUG] Retrying... (attempt ${attempt + 1}/${this.options.retries})`);
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