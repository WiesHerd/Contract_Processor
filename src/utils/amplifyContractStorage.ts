// src/utils/amplifyContractStorage.ts
// Simplified contract storage using Amplify Storage

import { withRetry } from './retry';

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

class AmplifyContractStorage {
  private readonly CONTRACTS_PREFIX = 'contracts/immutable/';
  private readonly METADATA_PREFIX = 'contracts/metadata/';

  /**
   * Store a contract with metadata
   */
  async storeContract(
    contractId: string,
    fileName: string,
    fileBuffer: Buffer | Uint8Array,
    providerData: any,
    templateData: any
  ): Promise<ContractMetadata> {
    const timestamp = new Date().toISOString();
    const version = '1.0.0';
    
    console.log('🔍 AmplifyContractStorage Debug:', {
      contractId,
      fileName,
      fileSize: fileBuffer.length,
      timestamp
    });
    
    // Create file paths
    const contractKey = `${this.CONTRACTS_PREFIX}${contractId}/${timestamp}/${fileName}`;
    const metadataKey = `${this.METADATA_PREFIX}${contractId}/${timestamp}.json`;
    
    console.log('🔍 Amplify Storage Keys:', { contractKey, metadataKey });
    
    // Calculate file hash for integrity
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Store the contract file using Amplify Storage
    console.log('🔍 Attempting Amplify Storage upload for contract file...');
    
    try {
      await withRetry(async () => {
        console.log('🔍 Sending contract file to Amplify Storage...');
        const { uploadData } = await import('aws-amplify/storage');
        
        await uploadData({
          key: contractKey,
          data: fileBuffer,
          options: {
            contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            metadata: {
              'contract-id': contractId,
              'generated-at': timestamp,
              'version': version,
              'file-hash': fileHash,
              'immutable': 'true'
            }
          }
        });
        console.log('🔍 Contract file upload successful');
      });
      
      console.log('✅ Amplify Storage upload successful for contract file');
    } catch (error) {
      console.error('❌ Amplify Storage upload failed for contract file:', error);
      console.error('❌ Upload error details:', {
        name: error.name,
        message: error.message,
        key: contractKey
      });
      throw error;
    }

    // Create permanent URL
    const permanentUrl = await this.createPermanentUrl(contractKey);
    
    // Store metadata
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

    console.log('🔍 Attempting metadata upload to Amplify Storage');
    
    try {
      await withRetry(async () => {
        console.log('🔍 Sending metadata to Amplify Storage...');
        const { uploadData } = await import('aws-amplify/storage');
        
        await uploadData({
          key: metadataKey,
          data: JSON.stringify(metadata),
          options: {
            contentType: 'application/json',
            metadata: {
              'contract-id': contractId,
              'generated-at': timestamp,
              'version': version
            }
          }
        });
        console.log('🔍 Metadata upload successful');
      });
      
      console.log('✅ Metadata upload successful');
    } catch (error) {
      console.error('❌ Metadata upload failed:', error);
      console.error('❌ Metadata upload error details:', {
        name: error.name,
        message: error.message,
        key: metadataKey
      });
      throw error;
    }

    return metadata;
  }

  /**
   * Create a permanent URL
   */
  private async createPermanentUrl(key: string): Promise<string> {
    try {
      const { getUrl } = await import('aws-amplify/storage');
      
      const { url } = await getUrl({
        key,
        options: {
          expiresIn: 31536000 // 1 year
        }
      });
      
      return url.toString();
    } catch (error) {
      console.error('Failed to create permanent URL:', error);
      throw new Error('Failed to create download URL for contract');
    }
  }

  /**
   * Get contract metadata
   */
  async getContractMetadata(contractId: string, timestamp: string): Promise<ContractMetadata | null> {
    const metadataKey = `${this.METADATA_PREFIX}${contractId}/${timestamp}.json`;
    
    try {
      const { getUrl } = await import('aws-amplify/storage');
      
      const { url } = await getUrl({
        key: metadataKey,
        options: {
          expiresIn: 3600 // 1 hour
        }
      });
      
      const response = await fetch(url);
      if (response.ok) {
        const metadata = await response.json();
        return metadata;
      }
    } catch (error) {
      console.error('Failed to get contract metadata:', error);
    }
    
    return null;
  }

  /**
   * Test Amplify Storage connectivity
   */
  async testConnection(): Promise<{ success: boolean; error?: string; details?: any }> {
    console.log('🔍 Testing Amplify Storage connection...');
    
    try {
      const { list } = await import('aws-amplify/storage');
      
      // Test basic list operation
      await list({
        prefix: 'test/'
      });
      
      console.log('✅ Amplify Storage connection test successful');
      return { 
        success: true, 
        details: {
          storage: 'amplify',
          hasCredentials: true
        }
      };
    } catch (error) {
      console.error('❌ Amplify Storage connection test failed:', error);
      return { 
        success: false, 
        error: error.message,
        details: {
          name: error.name,
          storage: 'amplify'
        }
      };
    }
  }

  /**
   * Log environment status for debugging
   */
  logEnvironmentStatus(): void {
    console.log('🔍 Amplify Storage Environment Status:', {
      storage: 'amplify',
      hasCredentials: true, // Amplify handles credentials automatically
      contractsPrefix: this.CONTRACTS_PREFIX,
      metadataPrefix: this.METADATA_PREFIX
    });
  }
}

export const amplifyContractStorage = new AmplifyContractStorage();
export type { ContractMetadata }; 