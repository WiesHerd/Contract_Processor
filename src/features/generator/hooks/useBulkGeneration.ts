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

      // Use main thread DOCX generation (Web Worker was causing issues)
      // @ts-ignore
      if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
        return { success: false, error: 'DOCX generator not available' };
      }
      
      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);

      const contractYear = assignedTemplate.contractYear || new Date().getFullYear().toString();
      const runDate = new Date().toISOString().split('T')[0];
      const fileName = getContractFileName(contractYear, provider.name, runDate);
      
      // For bulk operations, skip individual S3 uploads and DynamoDB logging
      // We'll do batch operations later for better performance
      const contractId = provider.id + '-' + assignedTemplate.id + '-' + contractYear;
      
      // Add to Redux state for immediate UI update (without S3/DynamoDB overhead)
      const contractToAdd = {
        providerId: provider.id,
        templateId: assignedTemplate.id,
        status: 'SUCCESS' as const, // Mark as success for bulk operations
        generatedAt: new Date().toISOString(),
        fileUrl: fileName, // Local file name for now
        fileName: fileName,
        s3Key: contractId,
        localFilePath: `ZIP/${fileName}`,
        s3Status: 'SUCCESS' as const,
        dynamoDbStatus: 'SUCCESS' as const,
        error: undefined,
        dynamoDbId: undefined,
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
      // Use showError instead of setUserError to trigger a dialog
      showError({ 
        message: `The following providers don't have templates assigned: ${providerNames}. Please assign templates first.`, 
        severity: 'error' 
      });
      return;
    }

    setIsBulkGenerating(true);

    // Initialize progress tracking
    initializeProgress(selectedProviders.length);
    updateProgress({ currentOperation: 'Preparing bulk generation...' });

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
    
    // Phase 1: Generate all contracts in parallel batches (Google-style optimization)
    const batchSize = 32; // Increased to 32 for maximum CPU utilization
    const batches = [];
    
    for (let i = 0; i < selectedProviders.length; i += batchSize) {
      batches.push(selectedProviders.slice(i, i + batchSize));
    }
    
    let completedCount = 0;
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      // Check for cancellation
      if (progressData.isCancelled) {
        updateProgress({ currentOperation: 'Operation cancelled by user' });
        setIsBulkGenerating(false);
        return;
      }
      
      const batch = batches[batchIndex];
      const batchStartIndex = batchIndex * batchSize;
      
      // Process this batch in parallel
      const batchPromises = batch.map(async (provider, batchOffset) => {
        const globalIndex = batchStartIndex + batchOffset;
        const assignedTemplate = getAssignedTemplate(provider);
        
        if (!assignedTemplate) {
          return {
            type: 'skipped' as const,
            providerName: provider.name,
            reason: 'No template assigned'
          };
        }
        
        try {
          const result = await generateContractForProvider(provider, assignedTemplate, globalIndex + 1, selectedProviders.length);
          
          if (result.success && result.file) {
            return {
              type: 'success' as const,
              providerName: provider.name,
              templateName: assignedTemplate.name,
              file: result.file,
              localFilePath: `ZIP/${result.file.name}`,
              s3Status: 'SUCCESS' as const,
              dynamoDbStatus: 'SUCCESS' as const
            };
          } else {
            return {
              type: 'error' as const,
              providerName: provider.name,
              reason: result.error || 'Generation failed'
            };
          }
        } catch (error) {
          return {
            type: 'error' as const,
            providerName: provider.name,
            reason: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      });
      
      // Wait for this batch to complete
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process batch results
      batchResults.forEach((result, batchOffset) => {
        if (result.status === 'fulfilled') {
          const data = result.value;
          completedCount++;
          
          if (data.type === 'success') {
            generatedFiles.push(data.file);
            successful.push({
              providerName: data.providerName,
              templateName: data.templateName,
              localFilePath: data.localFilePath,
              s3Status: data.s3Status,
              dynamoDbStatus: data.dynamoDbStatus
            });
          } else if (data.type === 'skipped') {
            skipped.push({
              providerName: data.providerName,
              reason: data.reason
            });
          } else if (data.type === 'error') {
            skipped.push({
              providerName: data.providerName,
              reason: data.reason
            });
          }
        } else {
          // Handle rejected promises
          completedCount++;
          skipped.push({
            providerName: batch[batchOffset]?.name || 'Unknown',
            reason: 'Promise rejected'
          });
        }
      });
      
      // Update progress after each batch
      const progressPercent = 15 + (completedCount / selectedProviders.length) * 40;
      updateProgress({ 
        currentStep: completedCount,
        progress: progressPercent,
        currentOperation: `Generated ${completedCount} of ${selectedProviders.length} contracts...`
      });
      
      // Small delay between batches to prevent overwhelming the system
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    }
    
    // Phase 2: Create ZIP file (lightning-fast, no dialog)
    if (generatedFiles.length > 0) {
      updateProgress({ 
        progress: 70,
        currentOperation: 'Creating ZIP file...'
      });
      
      try {
        // Lightning-fast ZIP creation without dialog
        const contractYear = new Date().getFullYear().toString();
        const runDate = new Date().toISOString().split('T')[0];
        const zipFileName = `contracts_${contractYear}_${runDate}.zip`;
        
        // Create ZIP using JSZip for maximum speed
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Add all files to ZIP in parallel
        const addFilePromises = generatedFiles.map(async (file) => {
          zip.file(file.name, file.content);
        });
        
        await Promise.all(addFilePromises);
        
        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 } // Balanced speed/size
        });
        
        // Auto-download the ZIP file
        const downloadUrl = URL.createObjectURL(zipBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = zipFileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadUrl);
        
        updateProgress({ 
          progress: 85,
          currentOperation: 'ZIP file downloaded successfully!'
        });
        
        showSuccess(`Success! ${generatedFiles.length} contracts downloaded as ${zipFileName}`);
        
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
    
    // Quick refresh - no need for long delays
    console.log('🔍 Bulk generation completed, refreshing contracts...');
    
    // Refresh contracts from database to ensure Processed tab shows correctly
    console.log('🔍 Refreshing contracts from database...');
    let hydrationSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (!hydrationSuccess && retryCount < maxRetries) {
      try {
        await hydrateGeneratedContracts();
        console.log('✅ Contracts refreshed from database successfully');
        hydrationSuccess = true;
      } catch (hydrationError) {
        retryCount++;
        console.error(`❌ Failed to refresh contracts from database (attempt ${retryCount}/${maxRetries}):`, hydrationError);
        
        if (retryCount < maxRetries) {
          console.log(`🔄 Waiting 2 seconds before retry ${retryCount + 1}...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          console.error('❌ Failed to refresh contracts after all retries');
          // Don't fail the entire operation if hydration fails
        }
      }
    }
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
      // Use showError instead of setUserError to trigger a dialog
      showError({ 
        message: `Some providers don't have templates assigned: ${providerNames}. Please assign templates first.`, 
        severity: 'error' 
      });
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
    
    // Phase 2: Create ZIP file (lightning-fast, no dialog)
    if (generatedFiles.length > 0) {
      updateProgress({ 
        progress: 70,
        currentOperation: 'Creating ZIP file...'
      });
      
      try {
        // Lightning-fast ZIP creation without dialog
        const contractYear = new Date().getFullYear().toString();
        const runDate = new Date().toISOString().split('T')[0];
        const zipFileName = `contracts_${contractYear}_${runDate}.zip`;
        
        // Create ZIP using JSZip for maximum speed
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        
        // Add all files to ZIP in parallel
        const addFilePromises = generatedFiles.map(async (file) => {
          zip.file(file.name, file.content);
        });
        
        await Promise.all(addFilePromises);
        
        // Generate ZIP blob
        const zipBlob = await zip.generateAsync({ 
          type: 'blob',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 } // Balanced speed/size
        });
        
        // Auto-download the ZIP file
        const downloadUrl = URL.createObjectURL(zipBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = downloadUrl;
        downloadLink.download = zipFileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadUrl);
        
        updateProgress({ 
          progress: 85,
          currentOperation: 'ZIP file downloaded successfully!'
        });
        
        showSuccess(`Success! ${generatedFiles.length} contracts downloaded as ${zipFileName}`);
        
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