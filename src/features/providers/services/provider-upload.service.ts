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
            // Explicit header mapping for robust CSV parsing
            const headerMap: Record<string, string> = {
              'Employee ID': 'employeeId',
              'Provider Name': 'providerName',
              'Provider Type': 'providerType',
              'Specialty': 'specialty',
              'Subspecialty': 'subspecialty',
              'FTE': 'fte',
              'Administrative FTE': 'administrativeFte',
              'Position Title': 'administrativeRole',
              'Years of Experience': 'yearsExperience',
              'Hourly Wage': 'hourlyWage',
              'BaseSalary': 'baseSalary',
              'OriginalAgreementDate': 'originalAgreementDate',
              'OrganizationName': 'organizationName',
              'StartDate': 'startDate',
              'ContractTerm': 'contractTerm',
              'PTODays': 'ptoDays',
              'HolidayDays': 'holidayDays',
              'CMEDays': 'cmeDays',
              'CMEAmount': 'cmeAmount',
              'SigningBonus': 'signingBonus',
              'RelocationBonus': 'relocationBonus',
              'QualityBonus': 'qualityBonus',
              'Compensation Type': 'compensationModel',
              'ConversionFactor': 'conversionFactor',
              'wRVUTarget': 'wRVUTarget',
              'Compensation Year': 'compensationYear',
              'Credentials': 'credentials',
              // Add more as needed
            };

            const normalizeKey = (key: string) =>
              headerMap[key.trim()] ||
              key.replace(/[_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^[A-Z]/, c => c.toLowerCase());

            const providers = results.data.map((row) => {
              // Build a new row with normalized keys
              const normalizedRow: Record<string, string> = {};
              Object.keys(row).forEach((key) => {
                normalizedRow[normalizeKey(key)] = row[key];
              });

              const compensationModel = (normalizedRow.compensationModel || 'BASE').toUpperCase() as CompensationModel;
              return {
                id: normalizedRow.id || crypto.randomUUID(),
                name: normalizedRow.name || '',
                startDate: normalizedRow.startDate || '', // Take as-is, do not parse
                fte: parseFloat(normalizedRow.fte) || 1.0,
                baseSalary: parseFloat(normalizedRow.baseSalary) || 0,
                compensationModel: compensationModel,
                employeeId: normalizedRow.employeeId || undefined,
                providerType: normalizedRow.providertype || normalizedRow.providerType || undefined,
                specialty: normalizedRow.specialty || undefined,
                subspecialty: normalizedRow.subspecialty || undefined,
                administrativeFte: normalizedRow.administrativefte ? parseFloat(normalizedRow.administrativefte) : undefined,
                administrativeRole: normalizedRow.administrativerole || undefined,
                yearsExperience: normalizedRow.yearsofexperience ? parseInt(normalizedRow.yearsofexperience) : undefined,
                hourlyWage: normalizedRow.hourlywage ? parseFloat(normalizedRow.hourlywage) : undefined,
                originalAgreementDate: normalizedRow.originalagreementdate || undefined, // Take as-is, do not parse
                organizationName: normalizedRow.organizationname || undefined,
                contractTerm: normalizedRow.contractterm || undefined,
                ptoDays: normalizedRow.ptodays ? parseInt(normalizedRow.ptodays) : undefined,
                holidayDays: normalizedRow.holidaydays ? parseInt(normalizedRow.holidaydays) : undefined,
                cmeDays: normalizedRow.cmedays ? parseInt(normalizedRow.cmedays) : undefined,
                cmeAmount: normalizedRow.cmeamount ? parseFloat(normalizedRow.cmeamount) : undefined,
                signingBonus: normalizedRow.signingbonus ? parseFloat(normalizedRow.signingbonus) : undefined,
                educationBonus: normalizedRow.educationbonus ? parseFloat(normalizedRow.educationbonus) : undefined,
                qualityBonus: normalizedRow.qualitybonus ? parseFloat(normalizedRow.qualitybonus) : undefined,
                conversionFactor: normalizedRow.conversionfactor ? parseFloat(normalizedRow.conversionfactor) : undefined,
                wRVUTarget: normalizedRow.wrvutarget ? parseFloat(normalizedRow.wrvutarget) : undefined,
                compensationYear: normalizedRow.compensationyear || undefined,
                credentials: normalizedRow.credentials || undefined,
                fteBreakdown: normalizedRow.ftebreakdown ? JSON.parse(normalizedRow.ftebreakdown) : [{
                  activity: 'Clinical',
                  percentage: 100,
                }],
                templateTag: normalizedRow.templatetag || undefined,
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