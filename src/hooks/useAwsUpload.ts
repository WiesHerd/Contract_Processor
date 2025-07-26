import { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { 
  saveTemplateFile, 
  saveContractFile, 
  compressFile,
  checkS3Health
} from '@/utils/s3Storage';
import { awsTemplates, awsProviders, awsMappings, awsBulkOperations, checkAWSHealth } from '@/utils/awsServices';
// import { addAuditLog } from '@/store/slices/auditSlice';
import { Template, TemplateType } from '@/types/template';
import { Provider } from '@/types/provider';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadState {
  isUploading: boolean;
  progress: UploadProgress;
  error: string | null;
  success: boolean;
}

interface UseAwsUploadReturn {
  uploadState: UploadState;
  uploadTemplate: (file: File, metadata: Partial<Template>) => Promise<Template | null>;
  uploadContract: (file: File, contractId: string, metadata?: Record<string, string>) => Promise<string | null>;
  uploadProviderData: (providers: Provider[]) => Promise<Provider[]>;
  uploadMapping: (templateId: string, providerId: string, mappings: Record<string, string>) => Promise<boolean>;
  checkHealth: () => Promise<{ s3: boolean; dynamodb: boolean; appsync: boolean }>;
  resetUploadState: () => void;
}

export function useAwsUpload(): UseAwsUploadReturn {
  const dispatch = useDispatch();
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: { loaded: 0, total: 0, percentage: 0 },
    error: null,
    success: false,
  });

  const updateProgress = useCallback((loaded: number, total: number) => {
    const percentage = Math.round((loaded / total) * 100);
    setUploadState(prev => ({
      ...prev,
      progress: { loaded, total, percentage },
    }));
  }, []);

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: { loaded: 0, total: 0, percentage: 0 },
      error: null,
      success: false,
    });
  }, []);

  const uploadTemplate = useCallback(async (
    file: File, 
    metadata: Partial<Template>
  ): Promise<Template | null> => {
    setUploadState(prev => ({ ...prev, isUploading: true, error: null, success: false }));

    try {
      // Check file size
      const maxSize = parseInt(import.meta.env.VITE_MAX_FILE_SIZE || '10485760');
      if (file.size > maxSize) {
        throw new Error(`File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
      }

      // Check S3 health
      const s3Healthy = await checkS3Health();
      if (!s3Healthy) {
        throw new Error('S3 service is not available');
      }

      // Generate template ID
      const templateId = uuidv4();
      
      // Compress file if enabled
      let fileToUpload = file;
      if (import.meta.env.VITE_ENABLE_COMPRESSION === 'true') {
        fileToUpload = new File([await compressFile(file)], file.name, { type: file.type });
      }

      // Upload file to S3
      updateProgress(0, fileToUpload.size);
      const s3Key = await saveTemplateFile(fileToUpload, templateId, {
        uploadedBy: metadata.metadata?.createdBy || 'system',
        originalSize: file.size.toString(),
        compressedSize: fileToUpload.size.toString(),
      });

      // Create template record
      const template: Template = {
        id: templateId,
        name: metadata.name || file.name.replace(/\.[^/.]+$/, ''),
        description: metadata.description || '',
        version: metadata.version || '1.0.0',
        compensationModel: metadata.compensationModel || 'BASE',
        tags: metadata.tags || [],
        clauses: metadata.clauses || [],
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: metadata.metadata?.createdBy || 'system',
          lastModifiedBy: metadata.metadata?.lastModifiedBy || 'system',
        },
        docxTemplate: s3Key,
        placeholders: metadata.placeholders || [],
        clauseIds: metadata.clauseIds || [],
        versionHistory: [],
      };

      // Save to DynamoDB via AppSync
      const savedTemplate = await awsTemplates.create({
        id: template.id,
        name: template.name,
        description: template.description,
        version: template.version,
        s3Key: template.docxTemplate || '',
        type: template.compensationModel as TemplateType,
        contractYear: new Date().getFullYear().toString(),
      });

      // TODO: Fix audit logging
      // dispatch(addAuditLog({
      //   action: 'TEMPLATE_UPLOAD',
      //   details: `Template uploaded: ${template.name}`,
      //   severity: 'MEDIUM',
      //   category: 'DATA',
      //   resourceType: 'TEMPLATE',
      //   resourceId: templateId,
      //   metadata: {
      //     templateName: template.name,
      //     fileSize: file.size,
      //     s3Key: s3Key,
      //     uploadedBy: template.metadata?.createdBy || 'system'
      //   },
      // }));

      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        success: true,
        progress: { loaded: fileToUpload.size, total: fileToUpload.size, percentage: 100 }
      }));

      // Convert the saved template back to the local Template type
      const localTemplate: Template = {
        id: savedTemplate?.id || template.id,
        name: savedTemplate?.name || template.name,
        description: savedTemplate?.description || template.description,
        version: savedTemplate?.version || template.version,
        compensationModel: (savedTemplate?.type as any) || template.compensationModel,
        tags: template.tags,
        clauses: template.clauses,
        metadata: template.metadata,
        docxTemplate: savedTemplate?.s3Key || template.docxTemplate,
        placeholders: template.placeholders,
        clauseIds: template.clauseIds,
        versionHistory: template.versionHistory,
      };

      return localTemplate;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: errorMessage 
      }));

      // Log audit entry for failure
      if (import.meta.env.VITE_ENABLE_AUDIT_LOGGING === 'true') {
        // dispatch(addAuditLog({
        //   id: uuidv4(),
        //   timestamp: new Date().toISOString(),
        //   user: metadata.metadata?.createdBy || 'system',
        //   providers: [],
        //   template: metadata.name || 'Unknown',
        //   outputType: 'template_upload',
        //   status: 'failed',
        // }));
      }

      return null;
    }
  }, [dispatch, updateProgress]);

  const uploadContract = useCallback(async (
    file: File, 
    contractId: string, 
    metadata?: Record<string, string>
  ): Promise<string | null> => {
    setUploadState(prev => ({ ...prev, isUploading: true, error: null, success: false }));

    try {
      // Check S3 health
      const s3Healthy = await checkS3Health();
      if (!s3Healthy) {
        throw new Error('S3 service is not available');
      }

      // Upload contract file
      updateProgress(0, file.size);
      const s3Key = await saveContractFile(file, contractId, {
        generatedBy: metadata?.generatedBy || 'system',
        ...metadata,
      });

      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        success: true,
        progress: { loaded: file.size, total: file.size, percentage: 100 }
      }));

      // TODO: Fix audit logging
      // dispatch(addAuditLog({
      //   action: 'CONTRACT_UPLOAD',
      //   details: `Contract uploaded: ${contractId}`,
      //   severity: 'MEDIUM',
      //   category: 'DATA',
      //   resourceType: 'CONTRACT',
      //   resourceId: contractId,
      //   metadata: {
      //     contractId,
      //     fileSize: file.size,
      //     s3Key: s3Key,
      //     ...metadata
      //   },
      // }));

      return s3Key;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Contract upload failed';
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: errorMessage 
      }));
      return null;
    }
  }, [updateProgress]);

  const uploadProviderData = useCallback(async (providers: Provider[]): Promise<Provider[]> => {
    setUploadState(prev => ({ ...prev, isUploading: true, error: null, success: false }));

    try {
      // Check bulk upload limit
      const maxBulkUpload = parseInt(import.meta.env.VITE_MAX_BULK_UPLOAD || '1000');
      if (providers.length > maxBulkUpload) {
        throw new Error(`Bulk upload limit exceeded. Maximum allowed: ${maxBulkUpload}`);
      }

      // Check AWS health
      const health = await checkAWSHealth();
      if (!health.dynamodb) {
        throw new Error('DynamoDB service is not available');
      }

      let totalProcessed = 0;
      const successfulProviders: Provider[] = [];

      // Process providers in batches
      const batchSize = 25; // DynamoDB batch write limit
      for (let i = 0; i < providers.length; i += batchSize) {
        const batch = providers.slice(i, i + batchSize);
        
        const batchResults = await Promise.allSettled(
          batch.map(provider => awsProviders.create({
            name: provider.name,
            specialty: provider.specialty,
            fte: provider.fte,
            baseSalary: provider.baseSalary,
            startDate: provider.startDate,
            contractTerm: provider.contractTerm || '',
          }))
        );

        const successful = batchResults
          .filter((result): result is PromiseFulfilledResult<any> => 
            result.status === 'fulfilled' && result.value !== null
          )
          .map(result => result.value!);

        successfulProviders.push(...successful);
        totalProcessed += batch.length;
        updateProgress(totalProcessed, providers.length);
      }

      // Log audit entry
      if (import.meta.env.VITE_ENABLE_AUDIT_LOGGING === 'true') {
        // dispatch(addAuditLog({
        //   id: uuidv4(),
        //   timestamp: new Date().toISOString(),
        //   user: 'system',
        //   providers: successfulProviders.map(p => p.id),
        //   template: 'bulk_upload',
        //   outputType: 'provider_upload',
        //   status: successfulProviders.length === providers.length ? 'success' : 'failed',
        // }));
      }

      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        success: true,
        progress: { loaded: providers.length, total: providers.length, percentage: 100 }
      }));

      return successfulProviders;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Provider upload failed';
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: errorMessage 
      }));

      // Log audit entry for failure
      if (import.meta.env.VITE_ENABLE_AUDIT_LOGGING === 'true') {
        // dispatch(addAuditLog({
        //   id: uuidv4(),
        //   timestamp: new Date().toISOString(),
        //   user: 'system',
        //   providers: [],
        //   template: 'bulk_upload',
        //   outputType: 'provider_upload',
        //   status: 'failed',
        // }));
      }

      return [];
    }
  }, [dispatch, updateProgress]);

  const uploadMapping = useCallback(async (
    templateId: string, 
    providerId: string, 
    mappings: Record<string, string>
  ): Promise<boolean> => {
    setUploadState(prev => ({ ...prev, isUploading: true, error: null, success: false }));

    try {
      // Check AWS health
      const health = await checkAWSHealth();
      if (!health.dynamodb) {
        throw new Error('DynamoDB service is not available');
      }

      // Step 1: Delete existing mappings for this template-provider combination
      await awsMappings.deleteMappingsByTemplateAndProvider(templateId, providerId);
      
      // Step 2: Create new mappings using batch operation
      const mappingsToCreate = Object.entries(mappings).map(([field, value]) => ({
        templateID: templateId,
        providerID: providerId,
        field,
        value,
      }));

      if (mappingsToCreate.length > 0) {
        const createdMappings = await awsMappings.batchCreate(mappingsToCreate);
        const success = createdMappings.length === Object.keys(mappings).length;

        setUploadState(prev => ({ 
          ...prev, 
          isUploading: false, 
          success,
          progress: { loaded: createdMappings.length, total: Object.keys(mappings).length, percentage: 100 }
        }));

        return success;
      } else {
        setUploadState(prev => ({ 
          ...prev, 
          isUploading: false, 
          success: true,
          progress: { loaded: 0, total: 0, percentage: 100 }
        }));
        return true; // No mappings to create, but that's successful
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Mapping upload failed';
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: errorMessage 
      }));
      return false;
    }
  }, [updateProgress]);

  const checkHealth = useCallback(async () => {
    try {
      const health = await checkAWSHealth();
      const s3Health = await checkS3Health();
      return {
        ...health,
        s3: s3Health,
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        dynamodb: false,
        s3: false,
        appsync: false,
      };
    }
  }, []);

  return {
    uploadState,
    uploadTemplate,
    uploadContract,
    uploadProviderData,
    uploadMapping,
    checkHealth,
    resetUploadState,
  };
} 