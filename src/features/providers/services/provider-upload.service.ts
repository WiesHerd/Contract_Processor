import { Provider, ProviderUploadSchema } from '../../../types/provider';
import { generateClient } from 'aws-amplify/api';
import { createProvider } from '../../../graphql/mutations';
import { performHealthCheck, validateHealthCheck } from '../../../utils/aws-health-check';
import Papa from 'papaparse';
import type { CreateProviderInput } from '../../../API';

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
              const compensationModel = (row.compensationModel || 'BASE').toUpperCase() as CompensationModel;
              return {
                id: row.id || crypto.randomUUID(),
                name: row.name || '',
                startDate: row.startDate || '',
                fte: parseFloat(row.fte) || 1.0,
                baseSalary: parseFloat(row.baseSalary) || 0,
                compensationModel: compensationModel,
                employeeId: row.employeeId || undefined,
                providerType: row.providerType || undefined,
                specialty: row.specialty || undefined,
                subspecialty: row.subspecialty || undefined,
                administrativeFte: row.administrativeFte ? parseFloat(row.administrativeFte) : undefined,
                administrativeRole: row.administrativeRole || undefined,
                yearsExperience: row.yearsExperience ? parseInt(row.yearsExperience) : undefined,
                hourlyWage: row.hourlyWage ? parseFloat(row.hourlyWage) : undefined,
                originalAgreementDate: row.originalAgreementDate || undefined,
                organizationName: row.organizationName || undefined,
                contractTerm: row.contractTerm || undefined,
                ptoDays: row.ptoDays ? parseInt(row.ptoDays) : undefined,
                holidayDays: row.holidayDays ? parseInt(row.holidayDays) : undefined,
                cmeDays: row.cmeDays ? parseInt(row.cmeDays) : undefined,
                cmeAmount: row.cmeAmount ? parseFloat(row.cmeAmount) : undefined,
                signingBonus: row.signingBonus ? parseFloat(row.signingBonus) : undefined,
                educationBonus: row.educationBonus ? parseFloat(row.educationBonus) : undefined,
                qualityBonus: row.qualityBonus ? parseFloat(row.qualityBonus) : undefined,
                conversionFactor: row.conversionFactor ? parseFloat(row.conversionFactor) : undefined,
                wRVUTarget: row.wRVUTarget ? parseFloat(row.wRVUTarget) : undefined,
                compensationYear: row.compensationYear || undefined,
                credentials: row.credentials || undefined,
                fteBreakdown: row.fteBreakdown ? JSON.parse(row.fteBreakdown) : [{
                  activity: 'Clinical',
                  percentage: 100,
                }],
                templateTag: row.templateTag || undefined,
              } as Provider;
            });
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
    const result = ProviderUploadSchema.safeParse({ providers });
    
    if (!result.success) {
      return {
        success: false,
        errors: result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
      };
    }

    return { success: true, errors: [] };
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
        name: provider.name,
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
        organizationName: provider.organizationName,
        startDate: provider.startDate,
        contractTerm: provider.contractTerm,
        ptoDays: provider.ptoDays,
        holidayDays: provider.holidayDays,
        cmeDays: provider.cmeDays,
        cmeAmount: provider.cmeAmount,
        signingBonus: provider.signingBonus,
        educationBonus: provider.educationBonus,
        qualityBonus: provider.qualityBonus,
        compensationType: provider.compensationModel, // Map compensationModel to compensationType
        conversionFactor: provider.conversionFactor,
        wRVUTarget: provider.wRVUTarget,
        compensationYear: provider.compensationYear,
        credentials: provider.credentials,
      };

      console.log('Uploading provider to DynamoDB:', JSON.stringify(input, null, 2));

      await this.client.graphql({
        query: createProvider,
        variables: { input },
        authMode: 'apiKey'
      });

      console.log('Successfully uploaded provider:', provider.name);
    } catch (error) {
      console.error('Error uploading provider:', error);
      if (attempt < (this.options.retries ?? DEFAULT_OPTIONS.retries) && this.isRetryableError(error)) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        return this.uploadWithRetry(provider, attempt + 1);
      }
      throw error;
    }
  }

  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'NetworkError',
      'TimeoutError',
      'ConnectionError',
      'ThrottlingException',
      'ProvisionedThroughputExceededException',
    ];

    return retryableErrors.some(errType => 
      error.name?.includes(errType) || 
      error.message?.includes(errType)
    );
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    return array.reduce((chunks, item, index) => {
      const chunkIndex = Math.floor(index / size);
      if (!chunks[chunkIndex]) {
        chunks[chunkIndex] = [];
      }
      chunks[chunkIndex].push(item);
      return chunks;
    }, [] as T[][]);
  }
} 