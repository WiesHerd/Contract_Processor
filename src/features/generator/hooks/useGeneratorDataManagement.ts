import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { clearGeneratedContracts } from '../generatorSlice';
import { ContractGenerationLogService, ContractGenerationLog } from '@/services/contractGenerationLogService';
import { saveAs } from 'file-saver';
import { getContractFileName } from '@/utils/filename';
import { getContractFile } from '@/utils/s3Storage';
import { mergeTemplateWithData } from '../mergeUtils';
import type { Provider } from '@/types/provider';
import type { Template } from '@/types/template';

interface UseGeneratorDataManagementProps {
  selectedProviderIds: string[];
  setSelectedProviderIds: (ids: string[]) => void;
  generatedContracts: any[];
  filteredProviders: Provider[];
  templates: Template[];
  templateAssignments: Record<string, string>;
  mappings: any;
  agGridColumnDefs: any[];
  hiddenColumns: Set<string>;
  setUserError: (error: string) => void;
  showSuccess: (message: string) => void;
  showWarning: (message: string) => void;
  showError: (error: { message: string; severity?: string }) => void;
  showInfo: (message: string) => void;
  setIsClearing: (clearing: boolean) => void;
  setClearingProgress: (progress: number) => void;
  setShowClearConfirm: (show: boolean) => void;
  setContractsToClear: (contracts: ContractGenerationLog[]) => void;
  hydrateGeneratedContracts: () => void;
  getAssignedTemplate: (provider: Provider) => Template | null;
}

export const useGeneratorDataManagement = ({
  selectedProviderIds,
  setSelectedProviderIds,
  generatedContracts,
  filteredProviders,
  templates,
  templateAssignments,
  mappings,
  agGridColumnDefs,
  hiddenColumns,
  setUserError,
  showSuccess,
  showWarning,
  showError,
  showInfo,
  setIsClearing,
  setClearingProgress,
  setShowClearConfirm,
  setContractsToClear,
  hydrateGeneratedContracts,
  getAssignedTemplate,
}: UseGeneratorDataManagementProps) => {
  const dispatch = useDispatch();

  // Function to clear generated contracts for selected providers
  const handleClearGenerated = useCallback(async () => {
    if (selectedProviderIds.length === 0) {
      showWarning('Please select providers to clear generated contracts.');
      return;
    }

    try {
      // Clear generated contracts from state for selected providers
      // We need to clear the generatedContracts array, not generatedFiles
      dispatch(clearGeneratedContracts());

      // Clear the selection
      setSelectedProviderIds([]);
      
      // Show success message
      showSuccess('Generated contracts cleared successfully.');
      
    } catch (error) {
      console.error('Error clearing generated contracts:', error);
      showError({ message: 'Failed to clear generated contracts. Please try again.', severity: 'error' });
    }
  }, [selectedProviderIds.length, dispatch, setSelectedProviderIds, showSuccess, showWarning, showError]);

  // Function to clear all processed contracts from database
  const handleClearAllProcessed = useCallback(async () => {
    try {
      setIsClearing(true);
      setClearingProgress(0);
      showInfo(`Fetching all processed contracts from database...`);
      
      // Fetch ALL processed contracts from the database, not just the ones in state
      let allLogs: ContractGenerationLog[] = [];
      let nextToken = undefined;
      let fetchCount = 0;
      
      do {
        const result = await ContractGenerationLogService.listLogs(undefined, 1000, nextToken);
        if (result && result.items) {
          allLogs = allLogs.concat(result.items);
          fetchCount += result.items.length;
          setClearingProgress(Math.round((fetchCount / Math.max(fetchCount + 100, 1000)) * 30)); // First 30% for fetching
        }
        nextToken = result?.nextToken;
      } while (nextToken);
      
      // Filter for ALL processed contracts (SUCCESS, PARTIAL_SUCCESS, FAILED)
      const processedLogs = allLogs.filter(log => 
        log.status === 'SUCCESS' || 
        log.status === 'PARTIAL_SUCCESS' || 
        log.status === 'FAILED'
      );
      
      console.log('All contracts in database:', allLogs.length);
      console.log('Processed contracts to clear:', processedLogs.length);
      
      if (processedLogs.length === 0) {
        showWarning('No processed contracts found to clear.');
        setIsClearing(false);
        return;
      }

      // Show confirmation dialog instead of browser confirm
      setShowClearConfirm(true);
      setContractsToClear(processedLogs);
      setIsClearing(false);
      return;
    } catch (error) {
      console.error('Error fetching contracts for clearing:', error);
      showError({ message: `Failed to fetch contracts: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
      setIsClearing(false);
    }
  }, [setIsClearing, setClearingProgress, showInfo, showWarning, setShowClearConfirm, setContractsToClear, showError]);

  // Function to actually clear the contracts (called after confirmation)
  const confirmClearContracts = useCallback(async (contractsToClear: ContractGenerationLog[]) => {
    try {
      setIsClearing(true);
      setClearingProgress(30); // Start clearing phase
      showInfo(`Clearing ${contractsToClear.length} processed contracts from database and S3...`);
      
      // Get the actual DynamoDB IDs from the database logs
      const contractIds = contractsToClear.map(log => log.id);
      
      console.log('Found DynamoDB IDs to clear:', contractIds);
      
      // OPTIMIZATION: Batch parallel deletion for much faster performance
      const BATCH_SIZE = 25; // Process 25 contracts at a time
      const batches = [];
      
      for (let i = 0; i < contractIds.length; i += BATCH_SIZE) {
        batches.push(contractsToClear.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`🚀 Processing ${contractIds.length} contracts in ${batches.length} batches of ${BATCH_SIZE}`);
      
      let deletedCount = 0;
      const totalContracts = contractIds.length;
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const startIndex = batchIndex * BATCH_SIZE;
        
        // Process batch in parallel
        const batchPromises = batch.map(async (contractLog, batchItemIndex) => {
          try {
            const contractId = contractIds[startIndex + batchItemIndex];
            
            // Delete from DynamoDB
            await ContractGenerationLogService.deleteLog(contractId);
            
            // Delete from S3 if we can construct the S3 key
            if (contractLog.providerId && contractLog.templateId && contractLog.contractYear) {
              try {
                const { deleteFile } = await import('@/utils/s3Storage');
                // Construct S3 key based on the standardized pattern
                const s3ContractId = `${contractLog.providerId}-${contractLog.templateId}-${contractLog.contractYear}`;
                const s3Key = `contracts/immutable/${s3ContractId}/${contractLog.fileUrl || 'contract.docx'}`;
                await deleteFile(s3Key);
                console.log(`✅ Deleted S3 file: ${s3Key}`);
              } catch (s3Error) {
                console.warn(`⚠️ Failed to delete S3 file for contract ${contractLog.id}:`, s3Error);
                // Continue even if S3 deletion fails
              }
            }
            
            return { success: true, id: contractId };
          } catch (deleteError) {
            console.error(`Failed to delete contract ${contractIds[startIndex + batchItemIndex]}:`, deleteError);
            return { success: false, id: contractIds[startIndex + batchItemIndex], error: deleteError };
          }
        });
        
        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        deletedCount += batchResults.filter(r => r.success).length;
        
        // Update progress (30% to 90% for deletion phase)
        const deletionProgress = 30 + Math.round(((batchIndex + 1) / batches.length) * 60);
        setClearingProgress(deletionProgress);
        
        console.log(`✅ Batch ${batchIndex + 1}/${batches.length} completed: ${batchResults.filter(r => r.success).length}/${batch.length} deleted`);
      }
      
      setClearingProgress(90); // Almost done
      
      // Clear from local state
      dispatch(clearGeneratedContracts());
      setSelectedProviderIds([]);
      
      setClearingProgress(100); // Complete
      
      showSuccess(`Successfully cleared ${deletedCount} processed contracts (Success, Partial Success, and Failed)! All contracts are now marked as "Not Generated".`);
      
      // Close confirmation dialog
      setShowClearConfirm(false);
      setContractsToClear([]);
      
      // Refresh the contracts data to show updated status
      setTimeout(() => {
        hydrateGeneratedContracts();
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing all processed contracts:', error);
      showError({ message: `Failed to clear processed contracts: ${error instanceof Error ? error.message : 'Unknown error'}`, severity: 'error' });
    } finally {
      setIsClearing(false);
      setClearingProgress(100);
    }
  }, [setIsClearing, setClearingProgress, showInfo, dispatch, setSelectedProviderIds, showSuccess, setShowClearConfirm, setContractsToClear, hydrateGeneratedContracts, showError]);

    // Function to export CSV - Exports ALL providers with complete data regardless of current tab filter
  const handleExportCSV = useCallback(async () => {
    try {
      // Use AG Grid's native export to get ALL columns exactly as they appear
      const gridElement = document.querySelector('.ag-root-wrapper');
      if (gridElement && (gridElement as any).gridApi) {
        const api = (gridElement as any).gridApi;
        
        // Get ALL column definitions including hidden ones to ensure we export everything
        const allColumns = agGridColumnDefs.filter(col => 
          col.field && 
          col.field !== 'checkbox' && 
          col.field !== 'selected'
        );
        
        // Create enhanced data with processing status
        const enhancedData = filteredProviders.map(provider => {
          // Find latest contract for this provider
          const latestContract = generatedContracts
            .filter(c => c.providerId === provider.id)
            .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
          
          // Get assigned template
          const assignedTemplate = getAssignedTemplate(provider);
          
          // Determine processing status (no emojis to avoid encoding issues)
          let processingStatus = 'Not Generated';
          let processingDate = '';
          
          if (latestContract) {
            switch (latestContract.status) {
              case 'SUCCESS':
                processingStatus = 'Generated';
                processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
                break;
              case 'PARTIAL_SUCCESS':
                processingStatus = 'Partial Success';
                processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
                break;
              case 'FAILED':
                processingStatus = 'Failed';
                processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
                break;
              default:
                processingStatus = 'Pending';
                processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
            }
          }
          
          // Create enhanced provider object with all original fields plus processing info
          const enhancedProvider = {
            ...provider,
            // Add processing columns
            assignedTemplate: assignedTemplate ? assignedTemplate.name : 'Unassigned',
            processingStatus,
            processingDate,
          };
          
          return enhancedProvider;
        });
        
        // Temporarily set the grid data to our enhanced data
        const originalData = api.getRenderedNodes().map((node: any) => node.data);
        api.setRowData(enhancedData);
        
        // Export with all columns including processing status
        api.exportDataAsCsv({
          fileName: `contract-generation-data-${new Date().toISOString().split('T')[0]}.csv`,
          onlySelected: false,
          suppressQuotes: false,
          columnSeparator: ',',
          // Include all visible columns plus our processing columns
          columnKeys: [
            ...allColumns.map(col => col.field),
            'assignedTemplate',
            'processingStatus', 
            'processingDate'
          ].filter(Boolean)
        });
        
        // Restore original data
        api.setRowData(originalData);
        
        showSuccess(`Exported ${enhancedData.length} providers with complete data`);
        return;
      }
      
      // Fallback: Manual CSV generation if grid API not available
      const allProvidersWithStatus = filteredProviders.map(provider => {
        const latestContract = generatedContracts
          .filter(c => c.providerId === provider.id)
          .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())[0];
        
        const assignedTemplate = getAssignedTemplate(provider);
        
        let processingStatus = 'Not Generated';
        let processingDate = '';
        
        if (latestContract) {
          switch (latestContract.status) {
            case 'SUCCESS':
              processingStatus = 'Generated';
              processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
              break;
            case 'PARTIAL_SUCCESS':
              processingStatus = 'Partial Success';
              processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
              break;
            case 'FAILED':
              processingStatus = 'Failed';
              processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
              break;
            default:
              processingStatus = 'Pending';
              processingDate = new Date(latestContract.generatedAt).toLocaleDateString();
          }
        }
        
        return {
          ...provider,
          assignedTemplate: assignedTemplate ? assignedTemplate.name : 'Unassigned',
          processingStatus,
          processingDate,
        };
      });
      
      // Get ALL column headers from the grid (including hidden ones)
      const columnHeaders = agGridColumnDefs
        .filter(col => col.field && col.field !== 'checkbox' && col.field !== 'selected')
        .map(col => col.headerName || col.field);
      
      // Add processing columns
      const allHeaders = [...columnHeaders, 'Assigned Template', 'Processing Status', 'Processing Date'];
      
      // Build rows with all data
      const rows = allProvidersWithStatus.map(provider => {
        const row = [];
        
        // Add ALL column data (including hidden ones)
        for (const col of agGridColumnDefs) {
          if (col.field && col.field !== 'checkbox' && col.field !== 'selected') {
            row.push(provider[col.field] || '');
          }
        }
        
        // Add processing columns
        row.push(provider.assignedTemplate || '');
        row.push(provider.processingStatus || '');
        row.push(provider.processingDate || '');
        
        return row;
      });
      
      // Generate CSV with proper encoding
      const csv = [allHeaders, ...rows]
        .map(row => row.map(val => `"${String(val || '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, `contract-generation-data-${new Date().toISOString().split('T')[0]}.csv`);
      
      showSuccess(`Exported ${allProvidersWithStatus.length} providers with complete data`);
      
    } catch (err) {
      setUserError('Failed to export CSV. Please try again.');
      console.error('CSV Export Error:', err);
    }
  }, [filteredProviders, generatedContracts, agGridColumnDefs, hiddenColumns, getAssignedTemplate, setUserError, showSuccess]);

  // Function to get real tab counts from database contracts
  const getRealTabCounts = useCallback(() => {
    // Count providers by their generation status, not just contract counts
    let processedCount = 0;
    let notGeneratedCount = 0;
    
    // For each provider, check if they have any generated contracts
    filteredProviders.forEach(provider => {
      const providerContracts = generatedContracts.filter(c => c.providerId === provider.id);
      
      if (providerContracts.length > 0) {
        // Provider has at least one contract - count as processed
        processedCount++;
      } else {
        // Provider has no contracts - count as not generated
        notGeneratedCount++;
      }
    });
    
    return {
      notGenerated: notGeneratedCount,
      processed: processedCount,
      all: filteredProviders.length,
    };
  }, [generatedContracts, filteredProviders]);

  return {
    handleClearGenerated,
    handleClearAllProcessed,
    confirmClearContracts,
    handleExportCSV,
    getRealTabCounts,
  };
}; 