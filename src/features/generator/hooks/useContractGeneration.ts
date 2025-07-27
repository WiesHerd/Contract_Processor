/**
 * Custom hook for contract generation logic
 * Extracted from ContractGenerator.tsx to improve maintainability and testability
 */

import { useCallback } from 'react';
import { Provider } from '@/types/provider';
import { Template } from '@/types/template';
// Define GeneratedContract type locally
interface GeneratedContract {
  providerId: string;
  templateId: string;
  status: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
  generatedAt: string;
}
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { getContractFileName } from '@/utils/filename';
import { saveDocxFile } from '@/utils/fileUtils';
import { normalizeSmartQuotes } from '@/utils/formattingUtils';

interface UseContractGenerationProps {
  templates: Template[];
  mappings: any;
  generatedContracts: GeneratedContract[];
  selectedTemplate: Template | null;
  getAssignedTemplate: (provider: Provider) => Template | null;
  setUserError: (error: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showError: (error: { message: string; severity?: string }) => void;
}

interface GenerationResult {
  success: boolean;
  fileName?: string;
  contractId?: string;
  permanentUrl?: string;
  s3UploadSuccess?: boolean;
  error?: string;
}

export const useContractGeneration = ({
  templates,
  mappings,
  generatedContracts,
  selectedTemplate,
  getAssignedTemplate,
  setUserError,
  showSuccess,
  showWarning,
  showError
}: UseContractGenerationProps) => {
  
  // Helper function to download a contract with error handling
  const downloadContract = useCallback(async (provider: Provider, templateId: string) => {
    console.log('🔍 Download contract called for:', { provider: provider.name, templateId });
    console.log('🔍 Available contracts in Redux:', generatedContracts);
    
    try {
      // Find the actual generated contract (allow both SUCCESS and PARTIAL_SUCCESS)
      const contract = generatedContracts.find(
        c => c.providerId === provider.id && c.templateId === templateId && 
        (c.status === 'SUCCESS' || c.status === 'PARTIAL_SUCCESS')
      );
      
      console.log('🔍 Found contract:', contract);
      
      if (!contract) {
        console.log('❌ No contract found for provider:', provider.name);
        setUserError(`No generated contract found for ${provider.name}. Please regenerate the contract.`);
        return;
      }
      
      // DEBUG: Log all contract data to help identify the issue
      console.log('🔍 DEBUG - Full contract data:', {
        contract,
        providerId: provider.id,
        templateId,
        status: contract.status,
        generatedAt: contract.generatedAt,
        allContracts: generatedContracts
      });
      
      // Get the template to get the contract year
      const template = templates.find(t => t.id === templateId);
      const contractYear = template?.contractYear || new Date().getFullYear().toString();
      
      const contractId = provider.id + '-' + templateId + '-' + contractYear;
      
      // Use the actual generation timestamp from the contract (full ISO string)
      const generationTimestamp = contract.generatedAt || new Date().toISOString();
      const generationDate = generationTimestamp.split('T')[0];
      const fileName = getContractFileName(contractYear, provider.name, generationDate);
      
      console.log('🔍 Download attempt for contract:', { 
        contractId, 
        fileName, 
        provider: provider.name,
        status: contract.status,
        generationTimestamp,
        generationDate,
        contractData: contract
      });
      
      // Try to get the contract file from immutable storage first
      let downloadUrl: string;
      try {
        const { immutableContractStorage } = await import('@/utils/immutableContractStorage');
        
        // Use the full contract ID for storage lookup
        // The storage uses the full contractId: providerId-templateId-contractYear
        console.log('🔍 Download Debug:', {
          fullContractId: contractId,
          generationTimestamp,
          fileName
        });
        
        downloadUrl = await immutableContractStorage.getPermanentDownloadUrl(contractId, generationTimestamp, fileName);
        console.log('✅ Successfully retrieved permanent download URL from immutable storage');
      } catch (immutableError) {
        console.log('Immutable storage failed, trying S3 storage...', immutableError);
        
        // Try to find the file with different timestamp variations
        try {
          const { checkFileExists } = await import('@/utils/s3Storage');
          const { getSignedDownloadUrl } = await import('@/utils/s3Storage');
          
          // Try different timestamp variations for older contracts
          const possibleTimestamps = [
            generationTimestamp, // Original timestamp
            generationTimestamp.replace(/\.\d{3}Z$/, 'Z'), // Remove milliseconds
            generationTimestamp.split('.')[0] + 'Z', // Remove milliseconds and add Z
            new Date(generationTimestamp).toISOString(), // Normalized timestamp
            // Add known timestamp for Elizabeth Ramirez's contract
            '2025-07-19T16:25:42.780Z', // Known timestamp from S3
          ];
          
          console.log('🔍 Trying different timestamp variations:', possibleTimestamps);
          
          let foundPath = null;
          
          // DEBUG: Check multiple possible S3 paths
          const possiblePaths = [
            `contracts/immutable/${contractId}/${fileName}`,
            `contracts/${contractId}/${fileName}`,
            `contracts/immutable/${contractId}/contract.docx`,
            `contracts/${contractId}/contract.docx`,
          ];
          
          console.log('🔍 DEBUG - Checking multiple possible S3 paths:', possiblePaths);
          
          for (const path of possiblePaths) {
            try {
              console.log(`🔍 Checking path: ${path}`);
              const fileExists = await checkFileExists(path);
              if (fileExists) {
                foundPath = path;
                console.log(`✅ Found file at path: ${path}`);
                break;
              } else {
                console.log(`❌ File not found at path: ${path}`);
              }
            } catch (checkError) {
              console.log(`❌ Error checking path: ${path}`, checkError);
            }
          }
          
          if (foundPath) {
            // File exists in immutable storage, generate presigned download URL
            downloadUrl = await getSignedDownloadUrl(foundPath);
            console.log('✅ Found file in immutable storage and generated download URL');
          } else {
            // Check regular S3 storage path as last resort
            const regularPath = `contracts/${contractId}/${fileName}`;
            const regularFileExists = await checkFileExists(regularPath);
            
            if (regularFileExists) {
              downloadUrl = await getSignedDownloadUrl(regularPath);
              console.log('✅ Found file in regular S3 storage and generated download URL');
            } else {
              setUserError(`Contract file not found in storage for ${provider.name}. The contract may have been generated but failed to upload to storage. Please regenerate the contract.`);
              
              // Offer to regenerate the contract
              if (confirm(`The contract file for ${provider.name} was not found in storage. Would you like to regenerate it?`)) {
                const assignedTemplate = getAssignedTemplate(provider);
                if (assignedTemplate) {
                  // Note: This would need to be handled by the parent component
                  console.log('Would regenerate contract');
                } else {
                  setUserError(`No template assigned to ${provider.name}. Please assign a template first.`);
                }
              }
              return;
            }
          }
        } catch (checkError) {
          console.error('❌ Failed to check file existence:', checkError);
          throw new Error(`Failed to verify file existence: ${checkError.message}`);
        }
      }
      
      // Open document in Microsoft Office Online Viewer for inline display
      const officeOnlineUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(downloadUrl)}`;
      window.open(officeOnlineUrl, '_blank', 'noopener,noreferrer');
      
      // Show success message with status info
      const statusMessage = contract.status === 'PARTIAL_SUCCESS' 
        ? `Opening contract for ${provider.name} in browser (Note: S3 storage may have failed during generation)`
        : `Opening contract for ${provider.name} in browser`;
      showSuccess(statusMessage);
      
    } catch (error) {
      console.error('❌ Failed to download contract:', error);
      setUserError(`Failed to download contract for ${provider.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Try to regenerate the contract if download fails
      if (confirm(`Failed to download the contract. Would you like to regenerate it for ${provider.name}?`)) {
        const assignedTemplate = getAssignedTemplate(provider);
        if (assignedTemplate) {
          // Note: This would need to be handled by the parent component
          console.log('Would regenerate contract');
        } else {
          setUserError(`No template assigned to ${provider.name}. Please assign a template first.`);
        }
      }
    }
  }, [generatedContracts, templates, getAssignedTemplate, setUserError, showSuccess]);

  // Helper to generate and download DOCX for a provider
  const generateAndDownloadDocx = useCallback(async (provider: Provider, template?: Template): Promise<GenerationResult | undefined> => {
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
      
      const { content: mergedHtml } = await mergeTemplateWithData(templateToUse, provider, html, enhancedMapping);
      const htmlClean = normalizeSmartQuotes(mergedHtml);
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

      // @ts-ignore
      if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
        setUserError('Failed to generate document. DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.');
        return;
      }
      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
      const contractYear = templateToUse.contractYear || new Date().getFullYear().toString();
      const runDate = new Date().toISOString().split('T')[0];
      const fileName = getContractFileName(contractYear, provider.name, runDate);
      
      // Use Windows File Explorer "Save As" dialog approach
      const savedFilePath = await saveDocxFile(docxBlob, fileName);
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
        const { immutableContractStorage } = await import('@/utils/immutableContractStorage');
        const immutableResult = await immutableContractStorage.storeImmutableContract(
          provider.id, // Use just the provider ID for storage
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
      
      // Log the generation event to DynamoDB
      try {
        const { ContractGenerationLogService } = await import('@/services/contractGenerationLogService');
        const logInput = {
          providerId: provider.id,
          contractYear: contractYear,
          templateId: templateToUse.id,
          generatedAt: new Date().toISOString(),
          generatedBy: localStorage.getItem('userEmail') || 'unknown',
          outputType: 'DOCX',
          status: s3UploadSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS',
          fileUrl: permanentUrl || fileName,
          notes: `Generated contract for ${provider.name} using template ${templateToUse.name}. S3 storage: ${s3UploadSuccess ? 'SUCCESS' : 'FAILED'}`,
          owner: localStorage.getItem('userId') || 'unknown'
        };
        
        const logEntry = await ContractGenerationLogService.createLog(logInput);
        console.log('✅ Contract generation logged to DynamoDB:', logEntry.id);
      } catch (logError) {
        console.error('❌ Failed to log contract to DynamoDB:', logError);
        // Don't fail the entire operation for logging errors
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
  }, [selectedTemplate, mappings, setUserError, showSuccess, showWarning]);

  return {
    downloadContract,
    generateAndDownloadDocx
  };
}; 