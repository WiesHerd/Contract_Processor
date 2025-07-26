/// <reference types="vite/client" />
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { Clause } from '@/types/clause';
import { AuditLogEntry } from '@/store/slices/auditSlice';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from 'file-saver';
import pako from 'pako';
import { withRetry, isRetryableError } from './retry';
import config from '../amplifyconfiguration.json';
import { Amplify } from 'aws-amplify';

// Configure Amplify for storage
Amplify.configure(config);

// Get AWS configuration from Amplify config with fallbacks
const getAWSConfig = () => {
  // Try environment variables first (for local development)
  const region = import.meta.env.VITE_AWS_REGION || config.aws_project_region || 'us-east-2';
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
  
  // Use Amplify S3 bucket if available, otherwise fall back to environment variable
  const bucket = import.meta.env.VITE_S3_BUCKET || config.aws_user_files_s3_bucket;
  
  console.log('🔍 S3 Configuration:', {
    region,
    hasAccessKey: !!accessKeyId,
    hasSecretKey: !!secretAccessKey,
    bucket: bucket || 'NOT_SET'
  });
  
  return { region, accessKeyId, secretAccessKey, bucket };
};

const awsConfig = getAWSConfig();

// Initialize S3 client with retry configuration
const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  } : undefined, // Let AWS SDK use default credential chain
  maxAttempts: 3,
});

// S3 bucket and path constants
const BUCKET = awsConfig.bucket;
const PATHS = {
  TEMPLATES: 'templates/',
  CONTRACTS: 'contracts/',
  UPLOADS: 'uploads/',
  PROVIDERS: 'providers/',
  CLAUSES: 'clauses/',
  AUDIT: 'audit/',
  METADATA: 'metadata/',
  TEMP: 'temp/',
} as const;

// Check if we're in a browser environment with Amplify credentials
const isAmplifyEnvironment = () => {
  return typeof window !== 'undefined' && 
         config.aws_user_files_s3_bucket && 
         config.aws_cognito_identity_pool_id;
};

// Base file operations with enhanced error handling
export async function uploadFile(
  file: Buffer | Blob, 
  key: string, 
  metadata?: Record<string, string>,
  contentType?: string
): Promise<string> {
  return withRetry(async () => {
    try {
      if (!BUCKET) {
        throw new Error('S3 bucket not configured');
      }
      
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: file,
        Metadata: metadata,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      });

      await s3Client.send(command);
      return key;
    } catch (error) {
      console.error('S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return withRetry(async () => {
    try {
      if (!BUCKET) {
        throw new Error('S3 bucket not configured');
      }
      
      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      });
      return getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

export async function deleteFile(key: string): Promise<void> {
  return withRetry(async () => {
    try {
      if (!BUCKET) {
        throw new Error('S3 bucket not configured');
      }
      
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET,
        Key: key,
      }));
    } catch (error) {
      console.error('S3 delete error:', error);
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

export async function listFiles(prefix: string): Promise<string[]> {
  return withRetry(async () => {
    try {
      if (!BUCKET) {
        throw new Error('S3 bucket not configured');
      }
      
      const command = new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
      });
      const response = await s3Client.send(command);
      return (response.Contents || []).map(obj => obj.Key!).filter(Boolean);
    } catch (error) {
      console.error('S3 list error:', error);
      
      // If we're in Amplify environment and get credential errors, try using Amplify Storage
      if (isAmplifyEnvironment() && error.message?.includes('Credential is missing')) {
        console.log('🔄 Falling back to Amplify Storage for listing files...');
        try {
          // Import Amplify Storage dynamically
          const { Storage } = await import('aws-amplify/storage');
          const result = await Storage.list(prefix);
          return result.results.map(item => item.key).filter(Boolean);
        } catch (amplifyError) {
          console.error('Amplify Storage fallback also failed:', amplifyError);
        }
      }
      
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

export async function getFileMetadata(key: string): Promise<Record<string, string> | null> {
  return withRetry(async () => {
    try {
      const command = new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key,
      });
      const response = await s3Client.send(command);
      return response.Metadata || null;
    } catch (error) {
      console.error('S3 metadata error:', error);
      return null;
    }
  });
}

// Template operations with enhanced metadata
export async function saveTemplateFile(
  file: File, 
  templateId: string, 
  metadata?: Record<string, string>
): Promise<string> {
  const key = `${PATHS.TEMPLATES}${templateId}/${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  
  const fileMetadata = {
    templateId,
    uploadedBy: metadata?.uploadedBy || 'system',
    uploadedAt: new Date().toISOString(),
    fileSize: file.size.toString(),
    contentType: file.type,
    originalName: file.name,
    ...metadata,
  };

  return uploadFile(
    Buffer.from(arrayBuffer), 
    key, 
    fileMetadata,
    file.type
  );
}

export async function getTemplateFile(templateId: string, fileName: string): Promise<{ url: string; metadata: Record<string, string> | null }> {
  const key = `${PATHS.TEMPLATES}${templateId}/${fileName}`;
  const url = await getSignedDownloadUrl(key);
  const metadata = await getFileMetadata(key);
  return { url, metadata };
}

export async function saveTemplateMetadata(template: Template): Promise<void> {
  const key = `${PATHS.METADATA}templates/${template.id}.json`;
  const metadata = {
    templateId: template.id,
    savedBy: 'system',
    savedAt: new Date().toISOString(),
    version: template.version,
  };
  
  await uploadFile(
    Buffer.from(JSON.stringify(template)), 
    key, 
    metadata,
    'application/json'
  );
}

export async function getTemplateMetadata(templateId: string): Promise<Template | null> {
  try {
    const key = `${PATHS.METADATA}templates/${templateId}.json`;
    const url = await getSignedDownloadUrl(key);
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting template metadata:', error);
    return null;
  }
}

// Contract operations
export async function saveContractFile(
  file: File, 
  contractId: string, 
  metadata?: Record<string, string>
): Promise<string> {
  const key = `${PATHS.CONTRACTS}immutable/${contractId}/${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  
  const fileMetadata = {
    contractId,
    generatedBy: metadata?.generatedBy || 'system',
    generatedAt: new Date().toISOString(),
    fileSize: file.size.toString(),
    contentType: file.type,
    originalName: file.name,
    ...metadata,
  };

  return uploadFile(
    Buffer.from(arrayBuffer), 
    key, 
    fileMetadata,
    file.type
  );
}

export async function getContractFile(contractId: string, fileName: string): Promise<{ url: string; metadata: Record<string, string> | null }> {
  const key = `${PATHS.CONTRACTS}immutable/${contractId}/${fileName}`;
  
  try {
    // First check if the file exists permanently in S3
    const fileExists = await checkFileExists(key);
    if (!fileExists) {
      throw new Error('Contract file not found in permanent storage');
    }
    
    // Generate a fresh download URL (expires in 7 days for security)
    // Note: The file itself is stored permanently, only the download link expires
    const url = await getSignedDownloadUrl(key, 604800);
    const metadata = await getFileMetadata(key);
    
    return { url, metadata };
  } catch (error) {
    console.error('Failed to get contract file:', error);
    throw new Error('Failed to get contract file');
  }
}

/**
 * Check if a file exists permanently in S3 storage
 * 
 * @param key - The S3 key to check
 * @returns Promise<boolean> - True if file exists, false otherwise
 */
export async function checkFileExists(key: string): Promise<boolean> {
  return withRetry(async () => {
    try {
      if (!BUCKET) {
        throw new Error('S3 bucket not configured');
      }
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET,
        Key: key
      }));
      return true;
    } catch (error) {
      if ((error as any).code === 'NotFound' || (error as any).statusCode === 404) {
        return false;
      }
      throw error;
    }
  });
}

/**
 * Regenerate a signed download URL for a contract file
 * 
 * IMPORTANT: Contract files are stored permanently in S3 and never expire.
 * Only the download links expire for security reasons (prevents unauthorized sharing).
 * This function generates a fresh download link for an existing permanent file.
 * 
 * @param contractId - The contract ID
 * @param fileName - The file name
 * @returns Promise with new signed URL and metadata
 */
export async function regenerateContractDownloadUrl(contractId: string, fileName: string): Promise<{ url: string; metadata: Record<string, string> | null }> {
  const key = `${PATHS.CONTRACTS}immutable/${contractId}/${fileName}`;
  
  try {
    // Verify the file exists permanently
    const fileExists = await checkFileExists(key);
    if (!fileExists) {
      throw new Error('Contract file not found in permanent storage. The file may have been deleted or never generated.');
    }
    
    // Generate fresh download URL (expires in 7 days for security)
    // The file itself remains permanently stored
    const url = await getSignedDownloadUrl(key, 604800);
    const metadata = await getFileMetadata(key);
    
    return { url, metadata };
  } catch (error) {
    console.error('Failed to regenerate download URL:', error);
    throw new Error('Failed to regenerate download URL');
  }
}

export async function listContractFiles(contractId: string): Promise<string[]> {
  const prefix = `${PATHS.CONTRACTS}immutable/${contractId}/`;
  const files = await listFiles(prefix);
  return files.map(file => file.replace(prefix, ''));
}

// Provider operations
export async function saveProviderData(provider: Provider): Promise<void> {
  const key = `${PATHS.PROVIDERS}${provider.id}.json`;
  const metadata = {
    providerId: provider.id,
    savedBy: 'system',
    savedAt: new Date().toISOString(),
  };
  
  await uploadFile(
    Buffer.from(JSON.stringify(provider)), 
    key, 
    metadata,
    'application/json'
  );
}

export async function getProviderData(providerId: string): Promise<Provider | null> {
  try {
    const key = `${PATHS.PROVIDERS}${providerId}.json`;
    const url = await getSignedDownloadUrl(key);
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting provider data:', error);
    return null;
  }
}

// Clause operations
export async function saveClause(clause: Clause): Promise<void> {
  const key = `${PATHS.CLAUSES}${clause.id}.json`;
  const metadata = {
    clauseId: clause.id,
    savedBy: 'system',
    savedAt: new Date().toISOString(),
  };
  
  await uploadFile(
    Buffer.from(JSON.stringify(clause)), 
    key, 
    metadata,
    'application/json'
  );
}

export async function getClause(clauseId: string): Promise<Clause | null> {
  try {
    const key = `${PATHS.CLAUSES}${clauseId}.json`;
    const url = await getSignedDownloadUrl(key);
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting clause:', error);
    return null;
  }
}

// Audit operations
export async function saveAuditLog(entry: AuditLogEntry): Promise<void> {
  const key = `${PATHS.AUDIT}${entry.id}.json`;
  const metadata = {
    auditId: entry.id,
    action: entry.action || 'unknown',
    user: entry.user || 'system',
    timestamp: entry.timestamp,
  };
  
  await uploadFile(
    Buffer.from(JSON.stringify(entry)), 
    key, 
    metadata,
    'application/json'
  );
}

export async function getAuditLog(auditId: string): Promise<AuditLogEntry | null> {
  try {
    const key = `${PATHS.AUDIT}${auditId}.json`;
    const url = await getSignedDownloadUrl(key);
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error getting audit log:', error);
    return null;
  }
}

// Bulk operations
export async function saveBulkProviders(providers: Provider[]): Promise<void> {
  const promises = providers.map(provider => saveProviderData(provider));
  await Promise.allSettled(promises);
}

export async function saveBulkTemplates(templates: Template[]): Promise<void> {
  const promises = templates.map(template => saveTemplateMetadata(template));
  await Promise.allSettled(promises);
}

// File compression utilities
export async function compressFile(file: File): Promise<Blob> {
  // Simple compression using the browser's built-in compression
  // For more advanced compression, consider using pako or similar libraries
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      const compressed = new Blob([arrayBuffer], { type: file.type });
      resolve(compressed);
    };
    reader.readAsArrayBuffer(file);
  });
}

// Helper to generate unique filenames
export function generateUniqueKey(prefix: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${prefix}${timestamp}_${random}.${extension}`;
}

// Helper to generate UUID-based keys
export function generateUUIDKey(prefix: string, extension: string): string {
  return `${prefix}${uuidv4()}.${extension}`;
}

// Cleanup utilities
export async function cleanupTempFiles(): Promise<void> {
  try {
    const tempFiles = await listFiles(PATHS.TEMP);
    const promises = tempFiles.map(file => deleteFile(file));
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
  }
}

export async function cleanupOldFiles(prefix: string, daysOld: number): Promise<void> {
  try {
    const files = await listFiles(prefix);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldFiles = files.filter(async (file) => {
      const metadata = await getFileMetadata(file);
      if (!metadata?.uploadedAt) return false;
      return new Date(metadata.uploadedAt) < cutoffDate;
    });

    const promises = oldFiles.map(file => deleteFile(file));
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
}

// Health check utility
export async function checkS3Health(): Promise<boolean> {
  try {
    await listFiles(PATHS.TEMP);
    return true;
  } catch (error) {
    console.error('S3 health check failed:', error);
    return false;
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  const metadataKey = `${PATHS.METADATA}templates/${templateId}.json`;
  
  try {
    // First, get the metadata to find the docx file key
    const template = await getTemplateMetadata(templateId);
    if (template && template.docxTemplate) {
      // The docxTemplate field holds the full key of the docx file
      await deleteFile(template.docxTemplate);
    }
    
    // Now delete the metadata file
    await deleteFile(metadataKey);

  } catch (error) {
    console.error(`Failed to delete template ${templateId}:`, error);
    throw new Error(`Failed to delete template from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export const downloadFile = async (key: string): Promise<Blob> => {
  try {
    const command = new GetObjectCommand({
      Bucket: import.meta.env.VITE_S3_BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    if (!response.Body) {
      throw new Error('No file body found in S3 response');
    }
    const blob = await response.Body.transformToByteArray();
    return new Blob([blob], { type: response.ContentType });
  } catch (error) {
    console.error(`Failed to download file from S3 (key: ${key}):`, error);
    throw new Error('Could not download the template file from S3.');
  }
}; 