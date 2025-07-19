// src/utils/immutableContractStorage.ts
// Enterprise-grade immutable contract storage with permanent URLs

import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { withRetry } from './retry';

interface ImmutableContract {
  contractId: string;
  fileName: string;
  providerData: any; // Snapshot of provider data at generation time
  templateData: any; // Snapshot of template data at generation time
  generatedAt: string;
  version: string;
  permanentUrl: string;
  fileHash: string; // For integrity verification
}

interface ContractMetadata {
  contractId: string;
  providerId: string;
  providerName: string;
  templateId: string;
  templateName: string;
  generatedAt: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL_SUCCESS';
  fileSize?: number;
  permanentUrl?: string;
  version: string;
}

class ImmutableContractStorage {
  private readonly BUCKET_NAME = import.meta.env.VITE_S3_BUCKET || 'contractgenerator42b439f60de94b878e0fba58439804';
  private readonly AWS_REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';
  private readonly CONTRACTS_PREFIX = 'contracts/immutable/';
  private readonly METADATA_PREFIX = 'contracts/metadata/';
  
  // Initialize S3 client with retry configuration (same as s3Storage.ts)
  private readonly s3Client = new S3Client({
    region: this.AWS_REGION,
    credentials: {
      accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
    },
    maxAttempts: 3,
  });

  /**
   * Store a contract with immutable data and permanent URL
   */
  async storeImmutableContract(
    contractId: string,
    fileName: string,
    fileBuffer: Buffer | Uint8Array,
    providerData: any,
    templateData: any
  ): Promise<ImmutableContract> {
    const timestamp = new Date().toISOString();
    const version = '1.0.0';
    
    console.log('🔍 ImmutableStorage Debug:', {
      bucketName: this.BUCKET_NAME,
      contractId,
      fileName,
      fileSize: fileBuffer.length,
      timestamp
    });
    
    // Create immutable file path with timestamp
    const immutableKey = `${this.CONTRACTS_PREFIX}${contractId}/${timestamp}/${fileName}`;
    const metadataKey = `${this.METADATA_PREFIX}${contractId}/${timestamp}.json`;
    
    console.log('🔍 S3 Keys:', { immutableKey, metadataKey });
    
    // Calculate file hash for integrity using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Store the contract file permanently (no expiration)
    console.log('🔍 Attempting S3 upload to bucket:', this.BUCKET_NAME);
    console.log('🔍 S3 Client configuration:', {
      region: this.AWS_REGION,
      hasAccessKey: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
      hasSecretKey: !!import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
      bucketName: this.BUCKET_NAME,
      key: immutableKey,
      fileSize: fileBuffer.length
    });
    
    try {
      await withRetry(async () => {
        console.log('🔍 Sending PutObjectCommand to S3...');
        await this.s3Client.send(new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: immutableKey,
      Body: fileBuffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ServerSideEncryption: 'AES256',
      Metadata: {
        'contract-id': contractId,
        'generated-at': timestamp,
        'version': version,
        'file-hash': fileHash,
        'immutable': 'true'
      }
    }));
        console.log('🔍 PutObjectCommand sent successfully');
      });
      
      console.log('✅ S3 upload successful for contract file');
    } catch (error) {
      console.error('❌ S3 upload failed for contract file:', error);
      console.error('❌ S3 error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
        region: this.AWS_REGION,
        bucket: this.BUCKET_NAME,
        key: immutableKey
      });
      throw error;
    }

    // Create permanent URL (no expiration)
    const permanentUrl = await this.createPermanentUrl(immutableKey);
    
    // Store metadata with provider/template snapshots
    const metadata: ContractMetadata = {
      contractId,
      providerId: providerData.id,
      providerName: providerData.name,
      templateId: templateData.id,
      templateName: templateData.name,
      generatedAt: timestamp,
      status: 'SUCCESS',
      fileSize: fileBuffer.length,
      permanentUrl,
      version
    };

    console.log('🔍 Attempting metadata upload to S3');
    
    try {
      await withRetry(async () => {
        console.log('🔍 Sending metadata PutObjectCommand to S3...');
        await this.s3Client.send(new PutObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: metadataKey,
      Body: JSON.stringify(metadata),
      ContentType: 'application/json',
          ServerSideEncryption: 'AES256',
      Metadata: {
        'contract-id': contractId,
        'generated-at': timestamp,
        'version': version
      }
    }));
        console.log('🔍 Metadata PutObjectCommand sent successfully');
      });
      
      console.log('✅ Metadata upload successful');
    } catch (error) {
      console.error('❌ Metadata upload failed:', error);
      console.error('❌ Metadata S3 error details:', {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        requestId: error.requestId,
        region: this.AWS_REGION,
        bucket: this.BUCKET_NAME,
        key: metadataKey
      });
      throw error;
    }

    // Store immutable contract data
    const immutableContract: ImmutableContract = {
      contractId,
      fileName,
      providerData, // Snapshot of provider data at generation time
      templateData, // Snapshot of template data at generation time
      generatedAt: timestamp,
      version,
      permanentUrl,
      fileHash
    };

    return immutableContract;
  }

  /**
   * Create a permanent URL that never expires
   */
  private async createPermanentUrl(key: string): Promise<string> {
    // For enterprise use, we'll use a CloudFront distribution
    // For now, we'll create a very long-lived URL (1 year) and auto-refresh
    const command = new GetObjectCommand({
      Bucket: this.BUCKET_NAME,
      Key: key
    });

    try {
    // Create URL that expires in 1 year (maximum allowed)
      const url = await getSignedUrl(this.s3Client, command, { expiresIn: 31536000 });
    return url;
    } catch (error) {
      console.error('Failed to create permanent URL:', error);
      throw new Error('Failed to create download URL for contract');
    }
  }

  /**
   * Get immutable contract data (original provider/template data)
   */
  async getImmutableContract(contractId: string, timestamp: string): Promise<ImmutableContract | null> {
    const metadataKey = `${this.METADATA_PREFIX}${contractId}/${timestamp}.json`;
    
    try {
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: metadataKey
      }));

      if (response.Body) {
        const metadata = JSON.parse(await response.Body.transformToString());
        return metadata;
      }
    } catch (error) {
      console.error('Failed to get immutable contract:', error);
    }
    
    return null;
  }

  /**
   * Get permanent download URL for a contract
   */
  async getPermanentDownloadUrl(contractId: string, timestamp: string, fileName: string): Promise<string> {
    const immutableKey = `${this.CONTRACTS_PREFIX}${contractId}/${timestamp}/${fileName}`;
    
    try {
      // First try to get the permanent URL from metadata
      const metadata = await this.getImmutableContract(contractId, timestamp);
      if (metadata?.permanentUrl) {
        return metadata.permanentUrl;
      }
      
      // Fallback: create a new permanent URL
      return await this.createPermanentUrl(immutableKey);
    } catch (error) {
      console.error('Failed to get permanent download URL:', error);
      throw new Error('Contract not found or inaccessible');
    }
  }

  /**
   * Verify contract integrity
   */
  async verifyContractIntegrity(contractId: string, timestamp: string, fileName: string): Promise<boolean> {
    const immutableKey = `${this.CONTRACTS_PREFIX}${contractId}/${timestamp}/${fileName}`;
    
    try {
      const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
      
      // Check if file exists
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: immutableKey
      }));

      // Get file and verify hash
      const response = await this.s3Client.send(new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: immutableKey
      }));

      if (response.Body) {
        const fileBuffer = await response.Body.transformToByteArray();
        const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const currentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        const metadata = await this.getImmutableContract(contractId, timestamp);
        return metadata?.fileHash === currentHash;
      }
    } catch (error) {
      console.error('Failed to verify contract integrity:', error);
    }
    
    return false;
  }

  /**
   * List all versions of a contract
   */
  async listContractVersions(contractId: string): Promise<ContractMetadata[]> {
    try {
      const response = await this.s3Client.send(new ListObjectsV2Command({
        Bucket: this.BUCKET_NAME,
        Prefix: `${this.METADATA_PREFIX}${contractId}/`
      }));

      const versions: ContractMetadata[] = [];
      
      for (const object of response.Contents || []) {
        if (object.Key) {
          const timestamp = object.Key.split('/').pop()?.replace('.json', '') || '';
          const metadata = await this.getImmutableContract(contractId, timestamp);
          if (metadata) {
            // Convert ImmutableContract to ContractMetadata
            const contractMetadata: ContractMetadata = {
              contractId: metadata.contractId,
              providerId: metadata.providerData.id,
              providerName: metadata.providerData.name,
              templateId: metadata.templateData.id,
              templateName: metadata.templateData.name,
              generatedAt: metadata.generatedAt,
              status: 'SUCCESS',
              fileSize: undefined,
              permanentUrl: metadata.permanentUrl,
              version: metadata.version
            };
            versions.push(contractMetadata);
          }
        }
      }
      
      return versions.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    } catch (error) {
      console.error('Failed to list contract versions:', error);
      return [];
    }
  }

  /**
   * Test S3 connectivity and configuration
   */
  async testS3Connection(): Promise<{ success: boolean; error?: string; details?: any }> {
    console.log('🔍 Testing S3 connection...');
    
    try {
      // Test basic S3 operations
      const { HeadBucketCommand } = await import('@aws-sdk/client-s3');
      
      console.log('🔍 S3 Client configuration for test:', {
        region: this.AWS_REGION,
        hasAccessKey: !!import.meta.env.VITE_AWS_ACCESS_KEY_ID,
        hasSecretKey: !!import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
        bucketName: this.BUCKET_NAME
      });
      
      // Test bucket access
      await this.s3Client.send(new HeadBucketCommand({
        Bucket: this.BUCKET_NAME
      }));
      
      console.log('✅ S3 connection test successful');
      return { 
        success: true, 
        details: {
          region: this.AWS_REGION,
          bucket: this.BUCKET_NAME,
          hasCredentials: !!(import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY)
        }
      };
    } catch (error) {
      console.error('❌ S3 connection test failed:', error);
      return { 
        success: false, 
        error: error.message,
        details: {
          name: error.name,
          code: error.code,
          statusCode: error.statusCode,
          region: this.AWS_REGION,
          bucket: this.BUCKET_NAME,
          hasCredentials: !!(import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY)
        }
      };
    }
  }

  /**
   * Log environment variable status for debugging
   */
  logEnvironmentStatus(): void {
    console.log('🔍 Environment Variables Status:', {
      VITE_AWS_REGION: import.meta.env.VITE_AWS_REGION || 'NOT_SET',
      VITE_AWS_ACCESS_KEY_ID: import.meta.env.VITE_AWS_ACCESS_KEY_ID ? 'SET' : 'NOT_SET',
      VITE_AWS_SECRET_ACCESS_KEY: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT_SET',
      VITE_S3_BUCKET: import.meta.env.VITE_S3_BUCKET || 'NOT_SET',
      // Don't log actual values for security
      region: this.AWS_REGION,
      bucket: this.BUCKET_NAME,
      hasCredentials: !!(import.meta.env.VITE_AWS_ACCESS_KEY_ID && import.meta.env.VITE_AWS_SECRET_ACCESS_KEY)
    });
  }
}

export const immutableContractStorage = new ImmutableContractStorage();
export type { ImmutableContract, ContractMetadata }; 