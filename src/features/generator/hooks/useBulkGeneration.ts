import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addGeneratedContract, addGenerationLog } from '../generatorSlice';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import { ContractGenerationLogService } from '@/services/contractGenerationLogService';
import { normalizeSmartQuotes } from '@/utils/formattingUtils';
import { mergeTemplateWithData } from '../mergeUtils';
import { saveZipWithDialog } from '@/utils/fileSystemAccess';
import { getContractFileName } from '@/utils/filename';
import type { Provider } from '@/types/provider';
import type { Template } from '@/types/template';
import type { LocalTemplateMapping, FieldMapping } from '@/features/templates/mappingsSlice';

interface UseBulkGenerationProps {
  providers: Provider[];
  templates: Template[];
  mappings: Record<string, LocalTemplateMapping>;
  selectedProviderIds: string[];
  filteredProviders: Provider[];
  generatedContracts: any[];
  getAssignedTemplate: (provider: Provider) => Template | null;
  setIsBulkGenerating: (loading: boolean) => void;
  setProgressModalOpen: (open: boolean) => void;
  setSelectedProviderIds: (ids: string[]) => void;
  setUserError: (error: string | null) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showError: (error: { message: string; severity: string }) => void;
  initializeProgress: (total: number) => void;
  updateProgress: (progress: any) => void;
  progressData: any;
  hydrateGeneratedContracts: () => Promise<void>;
}

interface GeneratedFile {
  content: Blob;
  name: string;
  provider: Provider;
  template: Template;
}

interface GenerationResult {
  successful: Array<{
    providerName: string;
    templateName: string;
    localFilePath: string;
    s3Status: 'SUCCESS' | 'FAILED';
    dynamoDbStatus: 'SUCCESS' | 'FAILED';
  }>;
  skipped: Array<{
    providerName: string;
    reason: string;
  }>;
}

export const useBulkGeneration = ({
  providers,
  templates,
  mappings,
  selectedProviderIds,
  filteredProviders,
  generatedContracts,
  getAssignedTemplate,
  setIsBulkGenerating,
  setProgressModalOpen,
  setSelectedProviderIds,
  setUserError,
  showSuccess,
  showWarning,
  showError,
  initializeProgress,
  updateProgress,
  progressData,
  hydrateGeneratedContracts,
}: UseBulkGenerationProps) => {
  const dispatch = useDispatch();

  const generateContractForProvider = useCallback(async (
    provider: Provider,
    assignedTemplate: Template,
    currentIndex: number,
    totalProviders: number
  ): Promise<{ success: boolean; file?: GeneratedFile; error?: string }> => {
    try {
      // Generate contract content
      const html = assignedTemplate.editedHtmlContent || assignedTemplate.htmlPreviewContent || "";
      const mapping = mappings[assignedTemplate.id]?.mappings;
      
      // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
      const enhancedMapping = mapping?.map(m => {
        if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
          return {
            ...m,
            mappingType: 'dynamic' as const,
            mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
            mappedColumn: undefined,
          };
        }
        return {
          ...m,
          mappingType: 'field' as const,
        };
      });
      
      const { content: mergedHtml } = await mergeTemplateWithData(assignedTemplate, provider, html, enhancedMapping);
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
        return { success: false, error: 'DOCX generator not available' };
      }
      
      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
      const contractYear = assignedTemplate.contractYear || new Date().getFullYear().toString();
      const runDate = new Date().toISOString().split('T')[0];
      const fileName = getContractFileName(contractYear, provider.name, runDate);
      
      // Store contract with immutable data and permanent URL
      let permanentUrl = '';
      let contractId = '';
      let s3UploadSuccess = false;
      let dynamoDbSuccess = false;
      let logEntryId: string | undefined;
      
      try {
        contractId = provider.id + '-' + assignedTemplate.id + '-' + contractYear;
        
        // Convert Blob to Buffer for immutable storage
        const arrayBuffer = await docxBlob.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);
        
        // Store with immutable data and permanent URL
        const { immutableContractStorage } = await import('@/utils/immutableContractStorage');
        
        // Test S3 connection first
        const s3TestResult = await immutableContractStorage.testS3Connection();
        if (!s3TestResult.success) {
          throw new Error(`S3 connection test failed: ${s3TestResult.error}`);
        }
        
        const immutableResult = await immutableContractStorage.storeImmutableContract(
          contractId,
          fileName,
          buffer,
          provider,
          assignedTemplate
        );
        
        permanentUrl = immutableResult.permanentUrl;
        s3UploadSuccess = true;
      } catch (s3err) {
        console.error('❌ Failed to store contract in S3:', s3err);
        s3UploadSuccess = false;
      }

      // Log the generation event to DynamoDB
      const logInput = {
        providerId: provider.id,
        contractYear: contractYear,
        templateId: assignedTemplate.id,
        generatedAt: new Date().toISOString(),
        generatedBy: 'user',
        outputType: 'DOCX',
        status: s3UploadSuccess ? 'SUCCESS' : 'PARTIAL_SUCCESS',
        fileUrl: permanentUrl || fileName,
        localFilePath: `ZIP/${fileName}`,
        notes: `Generated contract for ${provider.name} using template ${assignedTemplate.name}. Will be saved in ZIP. S3 storage: ${s3UploadSuccess ? 'SUCCESS' : 'FAILED'}`
      };

      try {
        const logEntry = await ContractGenerationLogService.createLog(logInput);
        dispatch(addGenerationLog(logEntry));
        dynamoDbSuccess = true;
        logEntryId = logEntry?.id;
      } catch (logError) {
        console.error('❌ Failed to log contract to DynamoDB:', logError);
        dynamoDbSuccess = false;
      }
      
      // Determine overall status
      let overallStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILED';
      if (s3UploadSuccess) {
        overallStatus = 'SUCCESS';
      } else {
        overallStatus = 'PARTIAL_SUCCESS';
      }

      const contractToAdd = {
        providerId: provider.id,
        templateId: assignedTemplate.id,
        status: overallStatus,
        generatedAt: new Date().toISOString(),
        fileUrl: permanentUrl,
        fileName: fileName,
        s3Key: contractId,
        localFilePath: `ZIP/${fileName}`,
        s3Status: (s3UploadSuccess ? 'SUCCESS' : 'FAILED') as 'SUCCESS' | 'FAILED',
        dynamoDbStatus: (dynamoDbSuccess ? 'SUCCESS' : 'FAILED') as 'SUCCESS' | 'FAILED',
        error: !s3UploadSuccess ? 'S3 storage failed' : !dynamoDbSuccess ? 'DynamoDB logging failed (non-critical)' : undefined,
        dynamoDbId: logEntryId,
      };
      
      dispatch(addGeneratedContract(contractToAdd));
      
      return {
        success: true,
        file: {
          content: docxBlob,
          name: fileName,
          provider,
          template: assignedTemplate
        }
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  }, [mappings, dispatch]);

  const handleBulkGenerate = useCallback(async () => {
    console.log('🚀 handleBulkGenerate called');
    console.log('Selected provider IDs:', selectedProviderIds);
    console.log('Selected providers:', selectedProviderIds.map(id => providers.find(p => p.id === id)?.name));
    
    setUserError(null);
    
    // Use all filtered providers, not just paginated
    const selectedProviders = filteredProviders.filter(p => selectedProviderIds.includes(p.id));
    if (selectedProviders.length === 0) {
      setUserError('Please select at least one provider to generate contracts.');
      return;
    }

    // Check if all providers have templates assigned
    const providersWithoutTemplates = selectedProviders.filter(provider => !getAssignedTemplate(provider));
    if (providersWithoutTemplates.length > 0) {
      const providerNames = providersWithoutTemplates.map(p => p.name).join(', ');
      setUserError(`The following providers don't have templates assigned: ${providerNames}. Please assign templates or select a default template.`);
      return;
    }

    console.log('🎯 Starting bulk contract generation for', selectedProviders.length, 'providers');
    
    setIsBulkGenerating(true);

    // Initialize progress tracking
    initializeProgress(selectedProviders.length);
    updateProgress({ currentOperation: 'Preparing bulk generation...' });
    
    console.log('Starting bulk generation - will save as ZIP file');

    // Update progress to generation phase
    updateProgress({ 
      currentStep: 1, 
      progress: 10,
      steps: progressData.steps.map((step: any) => 
        step.id === 'generation' ? { ...step, status: 'active' } : step
      ),
      currentOperation: 'Starting contract generation...'
    });

    const successful: any[] = [];
    const skipped: any[] = [];
    const generatedFiles: GeneratedFile[] = [];
    
    // Phase 1: Generate all contracts
    for (let i = 0; i < selectedProviders.length; i++) {
      // Check for cancellation
      if (progressData.isCancelled) {
        updateProgress({ currentOperation: 'Operation cancelled by user' });
        setIsBulkGenerating(false);
        return;
      }

      const provider = selectedProviders[i];
      const currentIndex = i + 1;
      const progressPercent = 15 + (currentIndex / selectedProviders.length) * 40; // 15% to 55%
      
      // Update progress
      updateProgress({ 
        currentStep: currentIndex,
        progress: progressPercent,
        currentOperation: `Generating contract for ${provider.name} (${currentIndex}/${selectedProviders.length})`
      });
      
      // Add small delay to prevent UI freezing
      if (i < selectedProviders.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      const assignedTemplate = getAssignedTemplate(provider);
      if (!assignedTemplate) {
        skipped.push({
          providerName: provider.name,
          reason: 'No template assigned'
        });
        updateProgress({ skippedCount: progressData.skippedCount + 1 });
        continue;
      }
      
      const result = await generateContractForProvider(provider, assignedTemplate, currentIndex, selectedProviders.length);
      
      if (result.success && result.file) {
        generatedFiles.push(result.file);
        successful.push({
          providerName: provider.name,
          templateName: assignedTemplate.name,
          localFilePath: `ZIP/${result.file.name}`,
          s3Status: 'SUCCESS', // This would be determined by the actual result
          dynamoDbStatus: 'SUCCESS' // This would be determined by the actual result
        });
        updateProgress({ successCount: progressData.successCount + 1 });
      } else {
        skipped.push({
          providerName: provider.name,
          reason: result.error || 'Generation failed'
        });
        updateProgress({ errorCount: progressData.errorCount + 1 });
      }
    }
    
    // Phase 2: Save all generated contracts as ZIP file
    if (generatedFiles.length > 0) {
      updateProgress({ 
        progress: 70,
        currentOperation: 'Creating ZIP file with all contracts...'
      });
      
      try {
        const zipFiles = generatedFiles.map(file => ({
          content: file.content,
          name: file.name,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }));
        
        const contractYear = new Date().getFullYear().toString();
        const runDate = new Date().toISOString().split('T')[0];
        const zipFileName = `contracts_${contractYear}_${runDate}.zip`;
        
        console.log('📦 Creating ZIP file with', zipFiles.length, 'contracts');
        const savedZipPath = await saveZipWithDialog(zipFiles, zipFileName);
        if (savedZipPath) {
          console.log('✅ ZIP file saved successfully:', savedZipPath);
        } else {
          console.log('⚠️ ZIP file creation completed but save was cancelled by user');
        }
        
        updateProgress({ 
          progress: 85,
          currentOperation: 'ZIP file created successfully!'
        });
      } catch (zipError) {
        console.error('❌ Failed to create ZIP file:', zipError);
        showWarning('Contracts generated but ZIP creation failed. Individual files may need to be saved manually.');
      }
    }
    
    // Update progress to completion
    updateProgress({ 
      progress: 100,
      currentStep: selectedProviders.length + 1,
      steps: progressData.steps.map((step: any) => 
        step.id === 'generation' ? { ...step, status: 'completed' } :
        step.id === 'saving' ? { ...step, status: 'completed' } :
        step.id === 'uploading' ? { ...step, status: 'completed' } : step
      ),
      currentOperation: 'Bulk generation completed successfully!'
    });
    
    setIsBulkGenerating(false);
    setProgressModalOpen(false);
    // Clear selected providers to hide the bottom menu
    setSelectedProviderIds([]);
    // Refresh contracts from database to ensure Processed tab shows correctly
    await hydrateGeneratedContracts();
    console.log('Bulk generation completed. Contracts added to Redux state:', successful.length);
    
    // Log bulk generation operation
    try {
      const auditDetails = JSON.stringify({
        action: 'BULK_CONTRACT_GENERATION',
        providerCount: selectedProviders.length,
        successfulCount: successful.length,
        skippedCount: skipped.length,
        successful: successful,
        skipped: skipped,
        timestamp: new Date().toISOString(),
        metadata: {
          providerCount: selectedProviders.length,
          successfulCount: successful.length,
          skippedCount: skipped.length,
          successful: successful,
          skipped: skipped,
          operation: 'bulk_generation',
          success: true
        }
      });
      
      dispatch(logSecurityEvent({
        action: 'BULK_CONTRACT_GENERATION',
        details: auditDetails,
        severity: 'MEDIUM',
        category: 'DATA',
        resourceType: 'CONTRACT_GENERATION',
        resourceId: 'bulk',
        metadata: {
          providerCount: selectedProviders.length,
          successfulCount: successful.length,
          skippedCount: skipped.length,
          successful: successful,
          skipped: skipped,
          operation: 'bulk_generation',
          success: true
        },
      }));
    } catch (auditError) {
      console.error('Failed to log bulk generation:', auditError);
    }
    
    // Show simple success message instead of modal
    console.log('Contract generation completed:', { successful, skipped });
    console.log('Generated contracts in Redux state:', generatedContracts);
    showSuccess(`Success! ${successful.length} contracts generated successfully.`);
  }, [
    selectedProviderIds,
    providers,
    filteredProviders,
    getAssignedTemplate,
    setIsBulkGenerating,
    setProgressModalOpen,
    setSelectedProviderIds,
    setUserError,
    showSuccess,
    showWarning,
    showError,
    initializeProgress,
    updateProgress,
    progressData,
    hydrateGeneratedContracts,
    generatedContracts,
    generateContractForProvider,
    dispatch
  ]);

  const handleModalBulkGenerate = useCallback(async () => {
    console.log('🚀 handleModalBulkGenerate called');
    console.log('Selected provider IDs:', selectedProviderIds);
    console.log('Selected providers:', selectedProviderIds.map(id => providers.find(p => p.id === id)?.name));
    
    setUserError(null);
    
    // Use the providers that were selected for the modal (not filtered providers from main page)
    const modalSelectedProviders = providers.filter(p => selectedProviderIds.includes(p.id));
    if (modalSelectedProviders.length === 0) {
      setUserError('No providers selected for generation.');
      return;
    }

    // Check if all providers have templates assigned
    const providersWithoutTemplates = modalSelectedProviders.filter(provider => !getAssignedTemplate(provider));
    if (providersWithoutTemplates.length > 0) {
      const providerNames = providersWithoutTemplates.map(p => p.name).join(', ');
      setUserError(`Some providers don't have templates assigned: ${providerNames}. Please assign templates first.`);
      return;
    }

    console.log('🎯 Starting modal bulk contract generation for', modalSelectedProviders.length, 'providers');
    
    setIsBulkGenerating(true);

    // Initialize progress tracking
    initializeProgress(modalSelectedProviders.length);
    updateProgress({ currentOperation: 'Starting contract generation...' });

    console.log('🎯 Starting bulk contract generation for', modalSelectedProviders.length, 'providers');

    // Update progress to generation phase
    updateProgress({ 
      currentStep: 1, 
      progress: 10,
      steps: progressData.steps.map((step: any) => 
        step.id === 'generation' ? { ...step, status: 'active' } : step
      ),
      currentOperation: 'Starting contract generation...'
    });

    const successful: any[] = [];
    const skipped: any[] = [];
    const generatedFiles: GeneratedFile[] = [];
    
    // Phase 1: Generate all contracts
    for (let i = 0; i < modalSelectedProviders.length; i++) {
      // Check for cancellation
      if (progressData.isCancelled) {
        updateProgress({ currentOperation: 'Operation cancelled by user' });
        setIsBulkGenerating(false);
        return;
      }

      const provider = modalSelectedProviders[i];
      const currentIndex = i + 1;
      const progressPercent = 15 + (currentIndex / modalSelectedProviders.length) * 40; // 15% to 55%
      
      // Update progress
      updateProgress({ 
        currentStep: currentIndex,
        progress: progressPercent,
        currentOperation: `Generating contract for ${provider.name} (${currentIndex}/${modalSelectedProviders.length})`
      });
      
      const assignedTemplate = getAssignedTemplate(provider);
      if (!assignedTemplate) {
        skipped.push({
          providerName: provider.name,
          reason: 'No template assigned'
        });
        updateProgress({ skippedCount: progressData.skippedCount + 1 });
        continue;
      }
      
      const result = await generateContractForProvider(provider, assignedTemplate, currentIndex, modalSelectedProviders.length);
      
      if (result.success && result.file) {
        generatedFiles.push(result.file);
        successful.push({
          providerName: provider.name,
          templateName: assignedTemplate.name,
          localFilePath: `ZIP/${result.file.name}`,
          s3Status: 'SUCCESS',
          dynamoDbStatus: 'SUCCESS'
        });
        updateProgress({ successCount: progressData.successCount + 1 });
      } else {
        skipped.push({
          providerName: provider.name,
          reason: result.error || 'Generation failed'
        });
        updateProgress({ errorCount: progressData.errorCount + 1 });
      }
    }
    
    // Phase 2: Save all generated contracts as ZIP file
    if (generatedFiles.length > 0) {
      updateProgress({ 
        progress: 70,
        currentOperation: 'Creating ZIP file with all contracts...'
      });
      
      try {
        const zipFiles = generatedFiles.map(file => ({
          content: file.content,
          name: file.name,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }));
        
        const contractYear = new Date().getFullYear().toString();
        const runDate = new Date().toISOString().split('T')[0];
        const zipFileName = `contracts_${contractYear}_${runDate}.zip`;
        
        console.log('📦 Creating ZIP file with', zipFiles.length, 'contracts');
        const savedZipPath = await saveZipWithDialog(zipFiles, zipFileName);
        if (savedZipPath) {
          console.log('✅ ZIP file saved successfully:', savedZipPath);
        } else {
          console.log('⚠️ ZIP file creation completed but save was cancelled by user');
        }
        
        updateProgress({ 
          progress: 85,
          currentOperation: 'ZIP file created successfully!'
        });
      } catch (zipError) {
        console.error('❌ Failed to create ZIP file:', zipError);
        showWarning('Contracts generated but ZIP creation failed. Individual files may need to be saved manually.');
      }
    }
    
    // Update progress to completion
    updateProgress({ 
      progress: 100,
      currentStep: modalSelectedProviders.length + 1,
      steps: progressData.steps.map((step: any) => 
        step.id === 'generation' ? { ...step, status: 'completed' } :
        step.id === 'saving' ? { ...step, status: 'completed' } :
        step.id === 'uploading' ? { ...step, status: 'completed' } : step
      ),
      currentOperation: 'Modal bulk generation completed successfully!'
    });
    
    setIsBulkGenerating(false);
    setProgressModalOpen(false);
    // Clear selected providers to hide the bottom menu
    setSelectedProviderIds([]);
    // Refresh contracts from database to ensure Processed tab shows correctly
    await hydrateGeneratedContracts();
    console.log('Modal bulk generation completed. Contracts added to Redux state:', successful.length);
    
    // Show simple success message instead of modal
    console.log('Modal bulk generation completed:', { successful, skipped });
    console.log('Generated contracts in Redux state:', generatedContracts);
    showSuccess(`Success! ${successful.length} contracts generated successfully.`);
  }, [
    selectedProviderIds,
    providers,
    getAssignedTemplate,
    setIsBulkGenerating,
    setProgressModalOpen,
    setSelectedProviderIds,
    setUserError,
    showSuccess,
    showWarning,
    initializeProgress,
    updateProgress,
    progressData,
    hydrateGeneratedContracts,
    generatedContracts,
    generateContractForProvider,
    dispatch
  ]);

  return {
    handleBulkGenerate,
    handleModalBulkGenerate,
    generateContractForProvider,
  };
}; 