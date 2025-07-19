/**
 * Baseline Tests for Contract Generation Functions (Before Extraction)
 * These tests verify the current functionality before we extract the functions to a custom hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from '@/types/provider';
import { Template } from '@/types/template';
// Define GeneratedContract type locally for testing
interface GeneratedContract {
  providerId: string;
  templateId: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  generatedAt: string;
}

// Mock the functions from ContractGenerator.tsx for baseline testing
// We'll copy these functions here to test them in isolation

// Mock dependencies
const mockMergeTemplateWithData = vi.fn();
const mockGetContractFileName = vi.fn();
const mockSaveDocxFile = vi.fn();
const mockImmutableContractStorage = {
  getPermanentDownloadUrl: vi.fn(),
  storeImmutableContract: vi.fn()
};
const mockS3Storage = {
  getContractFile: vi.fn(),
  checkFileExists: vi.fn()
};

// Mock window.htmlDocx
const mockHtmlDocx = {
  asBlob: vi.fn()
};

// Mock state and functions
let providers: Provider[] = [];
let generatedContracts: GeneratedContract[] = [];
let templates: Template[] = [];
let mappings: any = {};
let selectedTemplate: Template | null = null;
let userError: string | null = null;
let successMessage: string | null = null;
let warningMessage: string | null = null;

// Mock setter functions
const setUserError = vi.fn((error: string) => {
  userError = error;
});

const showSuccess = vi.fn((message: string) => {
  successMessage = message;
});

const showWarning = vi.fn((message: string) => {
  warningMessage = message;
});

const getAssignedTemplate = vi.fn();

// Mock confirm and window.open
const mockConfirm = vi.fn();
const mockWindowOpen = vi.fn();

// Copy the functions from ContractGenerator.tsx
const downloadContract = async (provider: Provider, templateId: string) => {
  try {
    // Find the actual generated contract (allow both SUCCESS and PARTIAL_SUCCESS)
    const contract = generatedContracts.find(
      c => c.providerId === provider.id && c.templateId === templateId && 
      (c.status === 'SUCCESS' || c.status === 'PARTIAL_SUCCESS')
    );
    
    if (!contract) {
      setUserError(`No generated contract found for ${provider.name}. Please regenerate the contract.`);
      return;
    }
    
    // Get the template to get the contract year
    const template = templates.find(t => t.id === templateId);
    const contractYear = template?.contractYear || new Date().getFullYear().toString();
    
    const contractId = provider.id + '-' + templateId + '-' + contractYear;
    
    // Use the actual generation date from the contract
    const generationDate = contract.generatedAt ? contract.generatedAt.split('T')[0] : new Date().toISOString().split('T')[0];
    const fileName = mockGetContractFileName(contractYear, provider.name, generationDate);
    
    console.log('Attempting to download contract:', { 
      contractId, 
      fileName, 
      provider: provider.name,
      status: contract.status,
      generationDate 
    });
    
    // Try to get the contract file from immutable storage first
    let downloadUrl: string;
    try {
      downloadUrl = await mockImmutableContractStorage.getPermanentDownloadUrl(contractId, generationDate, fileName);
      console.log('✅ Successfully retrieved permanent download URL from immutable storage');
    } catch (immutableError) {
      console.log('Immutable storage failed, trying S3 storage...', immutableError);
      // Fallback to S3 storage
      try {
        const result = await mockS3Storage.getContractFile(contractId, fileName);
        downloadUrl = result.url;
        console.log('✅ Successfully generated download URL via S3 storage');
      } catch (s3StorageError) {
        console.error('❌ Both immutable and S3 storage failed:', {
          immutableError: immutableError.message,
          s3StorageError: s3StorageError.message
        });
        
        // Check if the file actually exists in S3
        try {
          const fileExists = await mockS3Storage.checkFileExists(`contracts/${contractId}/${fileName}`);
          
          if (!fileExists) {
            setUserError(`Contract file not found in storage for ${provider.name}. The contract may have been generated but failed to upload to storage. Please regenerate the contract.`);
            
            // Offer to regenerate the contract
            if (mockConfirm(`The contract file for ${provider.name} was not found in storage. Would you like to regenerate it?`)) {
              const assignedTemplate = getAssignedTemplate(provider);
              if (assignedTemplate) {
                // await generateAndDownloadDocx(provider, assignedTemplate);
                console.log('Would regenerate contract');
              } else {
                setUserError(`No template assigned to ${provider.name}. Please assign a template first.`);
              }
            }
            return;
          } else {
            throw new Error(`File exists in S3 but download URL generation failed`);
          }
        } catch (checkError) {
          throw new Error(`Failed to verify file existence: ${checkError.message}`);
        }
      }
    }
    
    // Open download URL in new tab
    mockWindowOpen(downloadUrl, '_blank', 'noopener,noreferrer');
    
    // Show success message with status info
    const statusMessage = contract.status === 'PARTIAL_SUCCESS' 
      ? `Downloading contract for ${provider.name} (Note: S3 storage may have failed during generation)`
      : `Downloading contract for ${provider.name}`;
    showSuccess(statusMessage);
    
  } catch (error) {
    console.error('❌ Failed to download contract:', error);
    setUserError(`Failed to download contract for ${provider.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    
    // Try to regenerate the contract if download fails
    if (mockConfirm(`Failed to download the contract. Would you like to regenerate it for ${provider.name}?`)) {
      const assignedTemplate = getAssignedTemplate(provider);
      if (assignedTemplate) {
        // await generateAndDownloadDocx(provider, assignedTemplate);
        console.log('Would regenerate contract');
      } else {
        setUserError(`No template assigned to ${provider.name}. Please assign a template first.`);
      }
    }
  }
};

const generateAndDownloadDocx = async (provider: Provider, template?: Template) => {
  const templateToUse = template || selectedTemplate;
  if (!templateToUse) return;
  
  try {
    const html = templateToUse.editedHtmlContent || templateToUse.htmlPreviewContent || "";
    const mapping = mappings[templateToUse.id]?.mappings;
    
    // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
    const enhancedMapping = mapping?.map((m: any) => {
      // Check if this mapping has a dynamic block (stored in value field with dynamic: prefix)
      if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
        return {
          ...m,
          mappingType: 'dynamic' as const,
          mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
          mappedColumn: undefined, // Clear the mappedColumn since it's a dynamic block
        };
      }
      return {
        ...m,
        mappingType: 'field' as const,
      };
    });
    
    const { content: mergedHtml } = await mockMergeTemplateWithData(templateToUse, provider, html, enhancedMapping);
    const htmlClean = mergedHtml; // normalizeSmartQuotes would be applied here
    const aptosStyle = `<style>
body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
  font-family: Aptos, Arial, sans-serif !important;
  font-size: 11pt !important;
}
h1 { font-size: 16pt !important; font-weight: bold !important; }
h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; }
b, strong { font-weight: bold !important; }
</style>`;
    const htmlWithFont = aptosStyle + htmlClean;

    if (!mockHtmlDocx || typeof mockHtmlDocx.asBlob !== 'function') {
      setUserError('Failed to generate document. DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.');
      return;
    }
    const docxBlob = mockHtmlDocx.asBlob(htmlWithFont);
    const contractYear = templateToUse.contractYear || new Date().getFullYear().toString();
    const runDate = new Date().toISOString().split('T')[0];
    const fileName = mockGetContractFileName(contractYear, provider.name, runDate);
    
    // Use Windows File Explorer "Save As" dialog approach
    const savedFilePath = await mockSaveDocxFile(docxBlob, fileName);
    if (savedFilePath) {
      showSuccess(`Contract saved: ${fileName}`);
    } else {
      showWarning('Contract generation completed but file save was cancelled by user');
    }
    
    // Store contract with immutable data and permanent URL
    let permanentUrl = '';
    let contractId = '';
    let s3UploadSuccess = false;
    try {
      contractId = provider.id + '-' + templateToUse.id + '-' + contractYear;
      
      // Convert Blob to Buffer for immutable storage
      const arrayBuffer = await docxBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Store with immutable data and permanent URL
      const immutableResult = await mockImmutableContractStorage.storeImmutableContract(
        contractId,
        fileName,
        buffer,
        provider, // Snapshot of provider data at generation time
        templateToUse // Snapshot of template data at generation time
      );
      
      permanentUrl = immutableResult.permanentUrl;
      s3UploadSuccess = true;
      
      console.log('✅ Contract stored with immutable data and permanent URL:', { 
        contractId, 
        fileName, 
        permanentUrl: permanentUrl.substring(0, 100) + '...',
        fileHash: immutableResult.fileHash
      });
    } catch (s3err) {
      console.error('Failed to store contract with immutable data:', s3err);
      setUserError(`Contract generated but failed to store permanently: ${s3err instanceof Error ? s3err.message : 'Unknown error'}. You can still download locally.`);
      s3UploadSuccess = false;
    }
    
    return {
      success: true,
      fileName,
      contractId,
      permanentUrl,
      s3UploadSuccess
    };
    
  } catch (error) {
    console.error('Error generating document:', error);
    setUserError('Failed to generate document. Please try again.');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

describe('Contract Generation Functions - Baseline Tests (Before Extraction)', () => {
  beforeEach(() => {
    // Reset all mocks and state
    vi.clearAllMocks();
    generatedContracts = [];
    templates = [];
    mappings = {};
    selectedTemplate = null;
    userError = null;
    successMessage = null;
    warningMessage = null;
    
    // Setup test data
    const testProvider: Provider = {
      id: 'provider-1',
      name: 'Dr. Smith',
      specialty: 'Cardiology'
    } as Provider;
    
    const testTemplate: Template = {
      id: 'template-1',
      name: 'Base Template',
      contractYear: '2024',
      editedHtmlContent: '<p>Hello {{ProviderName}}</p>',
      htmlPreviewContent: '<p>Hello {{ProviderName}}</p>'
    } as Template;
    
    const testGeneratedContract: GeneratedContract = {
      providerId: 'provider-1',
      templateId: 'template-1',
      status: 'SUCCESS',
      generatedAt: '2024-01-15T10:00:00Z'
    };
    
    // Setup mocks
    mockGetContractFileName.mockReturnValue('2024_Dr_Smith_2024-01-15.docx');
    mockSaveDocxFile.mockResolvedValue('/path/to/file.docx');
    mockMergeTemplateWithData.mockResolvedValue({ content: '<p>Hello Dr. Smith</p>' });
    
    // Create a proper Blob mock with arrayBuffer method
    const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    mockBlob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));
    mockHtmlDocx.asBlob.mockReturnValue(mockBlob);
    
    mockImmutableContractStorage.getPermanentDownloadUrl.mockResolvedValue('https://example.com/contract.pdf');
    mockImmutableContractStorage.storeImmutableContract.mockResolvedValue({
      permanentUrl: 'https://example.com/contract.pdf',
      fileHash: 'abc123'
    });
    
    // Setup global mocks
    global.confirm = mockConfirm;
    global.window.open = mockWindowOpen;
    
    // Setup test data
    providers = [testProvider];
    templates = [testTemplate];
    generatedContracts = [testGeneratedContract];
    mappings = {
      'template-1': {
        mappings: [
          { placeholder: '{{ProviderName}}', mappedColumn: 'name' }
        ]
      }
    };
  });

  describe('downloadContract', () => {
    it('should successfully download a contract when it exists', async () => {
      const provider = providers[0];
      const templateId = 'template-1';
      
      await downloadContract(provider, templateId);
      
      expect(mockImmutableContractStorage.getPermanentDownloadUrl).toHaveBeenCalledWith(
        'provider-1-template-1-2024',
        '2024-01-15',
        '2024_Dr_Smith_2024-01-15.docx'
      );
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/contract.pdf',
        '_blank',
        'noopener,noreferrer'
      );
      expect(showSuccess).toHaveBeenCalledWith('Downloading contract for Dr. Smith');
    });

    it('should show error when contract not found', async () => {
      const provider = providers[0];
      const templateId = 'template-1';
      
      // Remove the contract from generatedContracts
      generatedContracts = [];
      
      await downloadContract(provider, templateId);
      
      expect(setUserError).toHaveBeenCalledWith(
        'No generated contract found for Dr. Smith. Please regenerate the contract.'
      );
    });

    it('should fallback to S3 storage when immutable storage fails', async () => {
      const provider = providers[0];
      const templateId = 'template-1';
      
      // Make immutable storage fail
      mockImmutableContractStorage.getPermanentDownloadUrl.mockRejectedValue(new Error('Immutable storage failed'));
      mockS3Storage.getContractFile.mockResolvedValue({ url: 'https://s3.example.com/contract.pdf' });
      
      await downloadContract(provider, templateId);
      
      expect(mockS3Storage.getContractFile).toHaveBeenCalledWith(
        'provider-1-template-1-2024',
        '2024_Dr_Smith_2024-01-15.docx'
      );
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://s3.example.com/contract.pdf',
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('should offer to regenerate when file not found in storage', async () => {
      const provider = providers[0];
      const templateId = 'template-1';
      
      // Make both storage methods fail
      mockImmutableContractStorage.getPermanentDownloadUrl.mockRejectedValue(new Error('Immutable storage failed'));
      mockS3Storage.getContractFile.mockRejectedValue(new Error('S3 storage failed'));
      mockS3Storage.checkFileExists.mockResolvedValue(false);
      mockConfirm.mockReturnValue(true);
      getAssignedTemplate.mockReturnValue(templates[0]);
      
      await downloadContract(provider, templateId);
      
      expect(setUserError).toHaveBeenCalledWith(
        'Contract file not found in storage for Dr. Smith. The contract may have been generated but failed to upload to storage. Please regenerate the contract.'
      );
      expect(mockConfirm).toHaveBeenCalledWith(
        'The contract file for Dr. Smith was not found in storage. Would you like to regenerate it?'
      );
    });
  });

  describe('generateAndDownloadDocx', () => {
    it('should successfully generate and save a contract', async () => {
      const provider = providers[0];
      const template = templates[0];
      
      const result = await generateAndDownloadDocx(provider, template);
      
      expect(mockMergeTemplateWithData).toHaveBeenCalledWith(
        template,
        provider,
        '<p>Hello {{ProviderName}}</p>',
        [{ placeholder: '{{ProviderName}}', mappedColumn: 'name', mappingType: 'field' }]
      );
      expect(mockHtmlDocx.asBlob).toHaveBeenCalled();
      expect(mockSaveDocxFile).toHaveBeenCalled();
      expect(mockImmutableContractStorage.storeImmutableContract).toHaveBeenCalled();
      expect(showSuccess).toHaveBeenCalledWith('Contract saved: 2024_Dr_Smith_2024-01-15.docx');
      expect(result).toEqual({
        success: true,
        fileName: '2024_Dr_Smith_2024-01-15.docx',
        contractId: 'provider-1-template-1-2024',
        permanentUrl: 'https://example.com/contract.pdf',
        s3UploadSuccess: true
      });
    });

    it('should handle missing template', async () => {
      const provider = providers[0];
      
      const result = await generateAndDownloadDocx(provider);
      
      expect(result).toBeUndefined();
    });

    it('should handle DOCX generator not available', async () => {
      const provider = providers[0];
      const template = templates[0];
      
      // Mock htmlDocx as undefined
      const originalHtmlDocx = mockHtmlDocx;
      mockHtmlDocx.asBlob = undefined as any;
      
      await generateAndDownloadDocx(provider, template);
      
      expect(setUserError).toHaveBeenCalledWith(
        'Failed to generate document. DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.'
      );
      
      // Restore mock
      mockHtmlDocx.asBlob = originalHtmlDocx.asBlob;
    });

    it('should handle file save cancellation', async () => {
      const provider = providers[0];
      const template = templates[0];
      
      // Ensure htmlDocx mock is set up
      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      mockBlob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));
      mockHtmlDocx.asBlob.mockReturnValue(mockBlob);
      
      // Mock saveDocxFile to return null (cancelled)
      mockSaveDocxFile.mockResolvedValue(null);
      
      await generateAndDownloadDocx(provider, template);
      
      expect(showWarning).toHaveBeenCalledWith('Contract generation completed but file save was cancelled by user');
    });

    it('should handle storage failure gracefully', async () => {
      const provider = providers[0];
      const template = templates[0];
      
      // Ensure htmlDocx mock is set up
      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      mockBlob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));
      mockHtmlDocx.asBlob.mockReturnValue(mockBlob);
      
      // Make storage fail
      mockImmutableContractStorage.storeImmutableContract.mockRejectedValue(new Error('Storage failed'));
      
      const result = await generateAndDownloadDocx(provider, template);
      
      expect(setUserError).toHaveBeenCalledWith(
        'Contract generated but failed to store permanently: Storage failed. You can still download locally.'
      );
      expect(result).toEqual({
        success: true,
        fileName: '2024_Dr_Smith_2024-01-15.docx',
        contractId: 'provider-1-template-1-2024',
        permanentUrl: '',
        s3UploadSuccess: false
      });
    });

    it('should handle generation error', async () => {
      const provider = providers[0];
      const template = templates[0];
      
      // Ensure htmlDocx mock is set up
      const mockBlob = new Blob(['test'], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      mockBlob.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(4));
      mockHtmlDocx.asBlob.mockReturnValue(mockBlob);
      
      // Make mergeTemplateWithData fail
      mockMergeTemplateWithData.mockRejectedValue(new Error('Merge failed'));
      
      const result = await generateAndDownloadDocx(provider, template);
      
      expect(setUserError).toHaveBeenCalledWith('Failed to generate document. Please try again.');
      expect(result).toEqual({
        success: false,
        error: 'Merge failed'
      });
    });
  });
}); 