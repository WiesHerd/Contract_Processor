/// <reference types="vite/client" />
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { Clause } from '@/types/clause';
import { AuditLogEntry } from '@/store/slices/auditSlice';

// Initialize S3 client
const s3Client = new S3Client({
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
});

// S3 bucket and path constants
const BUCKET = import.meta.env.VITE_S3_BUCKET;
const PATHS = {
  TEMPLATES: 'templates/',
  CONTRACTS: 'contracts/',
  UPLOADS: 'uploads/',
  PROVIDERS: 'providers/',
  CLAUSES: 'clauses/',
  AUDIT: 'audit/',
  METADATA: 'metadata/',
} as const;

// Base file operations
export async function uploadFile(file: Buffer | Blob, key: string): Promise<string> {
  try {
    await s3Client.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file,
    }));
    return key;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });
    return getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function deleteFile(key: string): Promise<void> {
  try {
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }));
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function listFiles(prefix: string): Promise<string[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    });
    const response = await s3Client.send(command);
    return (response.Contents || []).map(obj => obj.Key!).filter(Boolean);
  } catch (error) {
    console.error('S3 list error:', error);
    throw new Error(`Failed to list files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Template operations
export async function saveTemplateFile(file: File, templateId: string): Promise<string> {
  const key = `${PATHS.TEMPLATES}${templateId}/${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  return uploadFile(Buffer.from(arrayBuffer), key);
}

export async function getTemplateFile(templateId: string, filename: string): Promise<string> {
  const key = `${PATHS.TEMPLATES}${templateId}/${filename}`;
  return getSignedDownloadUrl(key);
}

export async function saveTemplateMetadata(template: Template): Promise<void> {
  const key = `${PATHS.METADATA}templates/${template.id}.json`;
  await uploadFile(Buffer.from(JSON.stringify(template)), key);
}

export async function getTemplateMetadata(templateId: string): Promise<Template> {
  const key = `${PATHS.METADATA}templates/${templateId}.json`;
  const url = await getSignedDownloadUrl(key);
  const response = await fetch(url);
  return response.json();
}

// Contract operations
export async function saveContractFile(file: File, contractId: string): Promise<string> {
  const key = `${PATHS.CONTRACTS}${contractId}/${file.name}`;
  const arrayBuffer = await file.arrayBuffer();
  return uploadFile(Buffer.from(arrayBuffer), key);
}

export async function getContractFile(contractId: string, filename: string): Promise<string> {
  const key = `${PATHS.CONTRACTS}${contractId}/${filename}`;
  return getSignedDownloadUrl(key);
}

// Provider operations
export async function saveProviderData(provider: Provider): Promise<void> {
  const key = `${PATHS.PROVIDERS}${provider.id}.json`;
  await uploadFile(Buffer.from(JSON.stringify(provider)), key);
}

export async function getProviderData(providerId: string): Promise<Provider> {
  const key = `${PATHS.PROVIDERS}${providerId}.json`;
  const url = await getSignedDownloadUrl(key);
  const response = await fetch(url);
  return response.json();
}

// Clause operations
export async function saveClause(clause: Clause): Promise<void> {
  const key = `${PATHS.CLAUSES}${clause.id}.json`;
  await uploadFile(Buffer.from(JSON.stringify(clause)), key);
}

export async function getClause(clauseId: string): Promise<Clause> {
  const key = `${PATHS.CLAUSES}${clauseId}.json`;
  const url = await getSignedDownloadUrl(key);
  const response = await fetch(url);
  return response.json();
}

// Audit operations
export async function saveAuditLog(entry: AuditLogEntry): Promise<void> {
  const key = `${PATHS.AUDIT}${entry.id}.json`;
  await uploadFile(Buffer.from(JSON.stringify(entry)), key);
}

export async function getAuditLogs(startDate?: Date, endDate?: Date): Promise<AuditLogEntry[]> {
  const files = await listFiles(PATHS.AUDIT);
  const logs: AuditLogEntry[] = [];
  
  for (const file of files) {
    const url = await getSignedDownloadUrl(file);
    const response = await fetch(url);
    const entry: AuditLogEntry = await response.json();
    
    if (startDate && endDate) {
      const entryDate = new Date(entry.timestamp);
      if (entryDate >= startDate && entryDate <= endDate) {
        logs.push(entry);
      }
    } else {
      logs.push(entry);
    }
  }
  
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

// Helper to generate unique filenames
export function generateUniqueKey(prefix: string, originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  return `${prefix}${timestamp}_${random}.${extension}`;
} 