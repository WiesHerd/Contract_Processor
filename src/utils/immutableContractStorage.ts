// src/utils/immutableContractStorage.ts
// Enterprise-grade immutable contract storage with permanent URLs

import { withRetry } from './retry';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../amplifyconfiguration.json';

// Get AWS configuration from Amplify config with fallbacks
const getAWSConfig = () => {
  // Try environment variables first (for local development)
  const region = import.meta.env.VITE_AWS_REGION || config.aws_project_region || 'us-east-2';
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
  
  // Use Amplify S3 bucket if available, otherwise fall back to environment variable
  const bucket = import.meta.env.VITE_S3_BUCKET || config.aws_user_files_s3_bucket || 'contractengine-storage-wherdzik';
  
  return { region, accessKeyId, secretAccessKey, bucket };
};

const awsConfig = getAWSConfig();

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
  private readonly CONTRACTS_PREFIX = 'contracts/immutable/';
  private readonly METADATA_PREFIX = 'contracts/metadata/';
  
  // S3 Configuration
  private readonly AWS_REGION = awsConfig.region;
  private readonly BUCKET_NAME = awsConfig.bucket;
  private readonly s3Client = new S3Client({
    region: this.AWS_REGION,
    credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
      accessKeyId: awsConfig.accessKeyId,
      secretAccessKey: awsConfig.secretAccessKey,
    } : undefined, // Let AWS SDK use default credential chain
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
      contractId,
      fileName,
      fileSize: fileBuffer.length,
      timestamp
    });
    
    // Create immutable file path without timestamp (matches actual S3 structure)
    const immutableKey = `${this.CONTRACTS_PREFIX}${contractId}/${fileName}`;
    const metadataKey = `${this.METADATA_PREFIX}${contractId}/${timestamp}.json`;
    
    console.log('🔍 Amplify Storage Keys:', { immutableKey, metadataKey });
    
    // Calculate file hash for integrity using Web Crypto API
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Store the contract file using direct S3
    console.log('🔍 Attempting S3 upload for contract file...');
    
    try {
      await withRetry(async () => {
        console.log('🔍 Sending contract file to S3...');
        
        const putCommand = new PutObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: immutableKey,
          Body: fileBuffer,
          ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          Metadata: {
            'contract-id': contractId,
            'generated-at': timestamp,
            'version': version,
            'file-hash': fileHash,
            'immutable': 'true'
          }
        });
        
        await this.s3Client.send(putCommand);
        console.log('🔍 Contract file upload successful');
      });
      
      console.log('✅ S3 upload successful for contract file');
    } catch (error) {
      console.error('❌ S3 upload failed for contract file:', error);
      console.error('❌ Upload error details:', {
        name: error.name,
        message: error.message,
        key: immutableKey,
        bucket: this.BUCKET_NAME,
        region: this.AWS_REGION
      });
      throw error;
    }

    // Create permanent URL (never expires)
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
      permanentUrl: permanentUrl,
      version
    };

    console.log('🔍 Attempting metadata upload to S3');
    
    try {
      await withRetry(async () => {
        console.log('🔍 Sending metadata to S3...');
        
        const putCommand = new PutObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: metadataKey,
          Body: JSON.stringify(metadata),
          ContentType: 'application/json',
          Metadata: {
            'contract-id': contractId,
            'generated-at': timestamp,
            'version': version
          }
        });
        
        await this.s3Client.send(putCommand);
        console.log('🔍 Metadata upload successful');
      });
      
      console.log('✅ Metadata upload successful');
    } catch (error) {
      console.error('❌ Metadata upload failed:', error);
      console.error('❌ Metadata upload error details:', {
        name: error.name,
        message: error.message,
        key: metadataKey,
        bucket: this.BUCKET_NAME,
        region: this.AWS_REGION
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
      permanentUrl: permanentUrl,
      fileHash
    };

    return immutableContract;
  }

  /**
   * Create a download URL using CloudFront or presigned URL for private buckets
   */
  private async createPermanentUrl(key: string): Promise<string> {
    try {
      // Check if CloudFront is configured
      const cloudFrontDomain = import.meta.env.VITE_CLOUDFRONT_DOMAIN;
      
      if (cloudFrontDomain) {
        // Use CloudFront for permanent URLs
        return `https://${cloudFrontDomain}/${key}`;
      } else {
        // For private buckets, create a presigned URL instead of direct S3 URL
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        
        const getCommand = new GetObjectCommand({
          Bucket: this.BUCKET_NAME,
          Key: key,
          ResponseContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ResponseContentDisposition: 'inline'
        });
        
        // Create a presigned URL that expires in 1 hour
        const presignedUrl = await getSignedUrl(this.s3Client, getCommand, {
          expiresIn: 3600 // 1 hour
        });
        
        return presignedUrl;
      }
    } catch (error) {
      console.error('Failed to create download URL:', error);
      throw new Error('Failed to create download URL for contract');
    }
  }

  /**
   * Get immutable contract data (original provider/template data)
   */
  async getImmutableContract(contractId: string, timestamp: string): Promise<ImmutableContract | null> {
    const metadataKey = `${this.METADATA_PREFIX}${contractId}/${timestamp}.json`;
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: metadataKey
      });
      
      const response = await this.s3Client.send(getCommand);
      if (response.Body) {
        const metadataText = await response.Body.transformToString();
        const metadata = JSON.parse(metadataText);
        return metadata;
      }
    } catch (error) {
      console.error('Failed to get immutable contract:', error);
    }
    
    return null;
  }

  /**
   * Get download URL for a contract (uses presigned URL for private buckets)
   */
  async getPermanentDownloadUrl(contractId: string, timestamp: string, fileName: string): Promise<string> {
    const immutableKey = `${this.CONTRACTS_PREFIX}${contractId}/${fileName}`;
    
    try {
      // First try to get the permanent URL from metadata
      const metadata = await this.getImmutableContract(contractId, timestamp);
      if (metadata?.permanentUrl) {
        // Check if it's a CloudFront URL (permanent) or needs to be converted to presigned
        if (metadata.permanentUrl.includes('cloudfront.net')) {
          return metadata.permanentUrl;
        }
      }
      
      // For private buckets, use presigned URLs instead of direct S3 URLs
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      
      const getCommand = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: immutableKey,
        ResponseContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ResponseContentDisposition: 'inline'
      });
      
      // Create a presigned URL that expires in 1 hour
      const presignedUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: 3600 // 1 hour
      });
      
      return presignedUrl;
    } catch (error) {
      console.error('Failed to get download URL:', error);
      throw new Error('Contract not found or inaccessible');
    }
  }

  /**
   * Verify contract integrity
   */
  async verifyContractIntegrity(contractId: string, timestamp: string, fileName: string): Promise<boolean> {
    const immutableKey = `${this.CONTRACTS_PREFIX}${contractId}/${fileName}`;
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.BUCKET_NAME,
        Key: immutableKey
      });
      
      // Get file and verify hash
      const response = await this.s3Client.send(getCommand);
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
      const { ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      
      const listCommand = new ListObjectsV2Command({
        Bucket: this.BUCKET_NAME,
        Prefix: `${this.METADATA_PREFIX}${contractId}/`
      });
      
      const response = await this.s3Client.send(listCommand);

      const versions: ContractMetadata[] = [];
      
      if (response.Contents) {
        for (const object of response.Contents) {
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