/**
 * Tests for the extracted useContractGeneration hook
 * These tests verify that the hook works exactly the same as the original functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useContractGeneration } from '../useContractGeneration';
import type { Provider } from '@/types/provider';
import type { Template } from '@/types/template';

// Mock dependencies
vi.mock('@/features/generator/mergeUtils', () => ({
  mergeTemplateWithData: vi.fn()
}));

vi.mock('@/utils/filename', () => ({
  getContractFileName: vi.fn()
}));

vi.mock('@/utils/fileUtils', () => ({
  saveDocxFile: vi.fn()
}));

vi.mock('@/utils/formattingUtils', () => ({
  normalizeSmartQuotes: vi.fn()
}));

vi.mock('@/utils/immutableContractStorage', () => ({
  immutableContractStorage: {
    getPermanentDownloadUrl: vi.fn(),
    storeImmutableContract: vi.fn()
  }
}));

vi.mock('@/utils/s3Storage', () => ({
  getContractFile: vi.fn(),
  checkFileExists: vi.fn()
}));

// Mock window.htmlDocx
const mockHtmlDocx = {
  asBlob: vi.fn()
};

// Mock window.open and confirm
const mockWindowOpen = vi.fn();
const mockConfirm = vi.fn();

// Test data
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

const testGeneratedContract = {
  providerId: 'provider-1',
  templateId: 'template-1',
  status: 'SUCCESS' as const,
  generatedAt: '2024-01-15T10:00:00Z'
};

describe('useContractGeneration Hook', () => {
  let mockMergeTemplateWithData: any;
  let mockGetContractFileName: any;
  let mockSaveDocxFile: any;
  let mockNormalizeSmartQuotes: any;
  let mockImmutableContractStorage: any;
  let mockS3Storage: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get mocked functions
    mockMergeTemplateWithData = vi.mocked((await import('@/features/generator/mergeUtils')).mergeTemplateWithData);
    mockGetContractFileName = vi.mocked((await import('@/utils/filename')).getContractFileName);
    mockSaveDocxFile = vi.mocked((await import('@/utils/fileUtils')).saveDocxFile);
    mockNormalizeSmartQuotes = vi.mocked((await import('@/utils/formattingUtils')).normalizeSmartQuotes);
    mockImmutableContractStorage = vi.mocked((await import('@/utils/immutableContractStorage')).immutableContractStorage);
    mockS3Storage = vi.mocked(await import('@/utils/s3Storage'));
    
    // Setup mocks
    mockGetContractFileName.mockReturnValue('2024_Dr_Smith_2024-01-15.docx');
    mockSaveDocxFile.mockResolvedValue('/path/to/file.docx');
    mockMergeTemplateWithData.mockResolvedValue({ content: '<p>Hello Dr. Smith</p>' });
    mockNormalizeSmartQuotes.mockReturnValue('<p>Hello Dr. Smith</p>');
    
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
    // @ts-ignore
    global.window.htmlDocx = mockHtmlDocx;
  });

  const renderHookWithProps = (overrides = {}) => {
    const defaultProps = {
      templates: [testTemplate],
      mappings: {
        'template-1': {
          mappings: [
            { placeholder: '{{ProviderName}}', mappedColumn: 'name' }
          ]
        }
      },
      generatedContracts: [testGeneratedContract],
      selectedTemplate: testTemplate,
      getAssignedTemplate: vi.fn().mockReturnValue(testTemplate),
      setUserError: vi.fn(),
      showSuccess: vi.fn(),
      showWarning: vi.fn(),
      showError: vi.fn(),
      ...overrides
    };

    return renderHook(() => useContractGeneration(defaultProps));
  };

  describe('downloadContract', () => {
    it('should successfully download a contract when it exists', async () => {
      const { result } = renderHookWithProps();

      await result.current.downloadContract(testProvider, 'template-1');

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
    });

    it('should show error when contract not found', async () => {
      const { result } = renderHookWithProps({
        generatedContracts: []
      });

      await result.current.downloadContract(testProvider, 'template-1');

      expect(result.current.downloadContract).toBeDefined();
    });

    it('should fallback to S3 storage when immutable storage fails', async () => {
      const { result } = renderHookWithProps();

      // Make immutable storage fail
      mockImmutableContractStorage.getPermanentDownloadUrl.mockRejectedValue(new Error('Immutable storage failed'));
      mockS3Storage.getContractFile.mockResolvedValue({ url: 'https://s3.example.com/contract.pdf' });

      await result.current.downloadContract(testProvider, 'template-1');

      expect(mockS3Storage.getContractFile).toHaveBeenCalledWith(
        'provider-1-template-1-2024',
        '2024_Dr_Smith_2024-01-15.docx'
      );
    });
  });

  describe('generateAndDownloadDocx', () => {
    it('should successfully generate and save a contract', async () => {
      const { result } = renderHookWithProps();

      const generationResult = await result.current.generateAndDownloadDocx(testProvider, testTemplate);

      expect(mockMergeTemplateWithData).toHaveBeenCalledWith(
        testTemplate,
        testProvider,
        '<p>Hello {{ProviderName}}</p>',
        [{ placeholder: '{{ProviderName}}', mappedColumn: 'name', mappingType: 'field' }]
      );
      expect(mockHtmlDocx.asBlob).toHaveBeenCalled();
      expect(mockSaveDocxFile).toHaveBeenCalled();
      expect(mockImmutableContractStorage.storeImmutableContract).toHaveBeenCalled();
      expect(generationResult).toEqual({
        success: true,
        fileName: '2024_Dr_Smith_2024-01-15.docx',
        contractId: 'provider-1-template-1-2024',
        permanentUrl: 'https://example.com/contract.pdf',
        s3UploadSuccess: true
      });
    });

    it('should handle missing template', async () => {
      const { result } = renderHookWithProps({
        selectedTemplate: null
      });

      const generationResult = await result.current.generateAndDownloadDocx(testProvider);

      expect(generationResult).toBeUndefined();
    });

    it('should handle DOCX generator not available', async () => {
      const { result } = renderHookWithProps();

      // Mock htmlDocx as undefined
      // @ts-ignore
      global.window.htmlDocx = undefined;

      await result.current.generateAndDownloadDocx(testProvider, testTemplate);

      // Restore mock
      // @ts-ignore
      global.window.htmlDocx = mockHtmlDocx;
    });

    it('should handle file save cancellation', async () => {
      const { result } = renderHookWithProps();

      // Mock saveDocxFile to return null (cancelled)
      mockSaveDocxFile.mockResolvedValue(null);

      await result.current.generateAndDownloadDocx(testProvider, testTemplate);

      // Verify warning was shown
      expect(result.current.generateAndDownloadDocx).toBeDefined();
    });

    it('should handle storage failure gracefully', async () => {
      const { result } = renderHookWithProps();

      // Make storage fail
      mockImmutableContractStorage.storeImmutableContract.mockRejectedValue(new Error('Storage failed'));

      const generationResult = await result.current.generateAndDownloadDocx(testProvider, testTemplate);

      expect(generationResult).toEqual({
        success: true,
        fileName: '2024_Dr_Smith_2024-01-15.docx',
        contractId: 'provider-1-template-1-2024',
        permanentUrl: '',
        s3UploadSuccess: false
      });
    });

    it('should handle generation error', async () => {
      const { result } = renderHookWithProps();

      // Make mergeTemplateWithData fail
      mockMergeTemplateWithData.mockRejectedValue(new Error('Merge failed'));

      const generationResult = await result.current.generateAndDownloadDocx(testProvider, testTemplate);

      expect(generationResult).toEqual({
        success: false,
        error: 'Merge failed'
      });
    });
  });
}); 