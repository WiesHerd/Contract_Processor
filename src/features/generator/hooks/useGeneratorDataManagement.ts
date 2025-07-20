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
  showError: (error: any) => void;
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
      showInfo(`Clearing ${contractsToClear.length} processed contracts...`);
      
      // Get the actual DynamoDB IDs from the database logs
      const contractIds = contractsToClear.map(log => log.id);
      
      console.log('Found DynamoDB IDs to clear:', contractIds);
      
      // Delete contracts from DynamoDB with progress tracking
      let deletedCount = 0;
      const totalContracts = contractIds.length;
      
      for (let i = 0; i < contractIds.length; i++) {
        try {
          await ContractGenerationLogService.deleteLog(contractIds[i]);
          deletedCount++;
          
          // Update progress (30% to 90% for deletion phase)
          const deletionProgress = 30 + Math.round((deletedCount / totalContracts) * 60);
          setClearingProgress(deletionProgress);
          
          // Small delay to show progress
          if (i < contractIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (deleteError) {
          console.error(`Failed to delete contract ${contractIds[i]}:`, deleteError);
          // Continue with other deletions even if one fails
        }
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

  // Function to export CSV
  const handleExportCSV = useCallback(async () => {
    try {
      // Use all filtered providers, not just paginated
      const allRows = await Promise.all(filteredProviders.map(async (provider: Provider) => {
        // Find the latest generated contract for this provider (prioritize SUCCESS over PARTIAL_SUCCESS)
        const latestContract = generatedContracts
          .filter(c => c.providerId === provider.id && (c.status === 'SUCCESS' || c.status === 'PARTIAL_SUCCESS'))
          .sort((a, b) => {
            // First sort by status (SUCCESS first, then PARTIAL_SUCCESS)
            if (a.status === 'SUCCESS' && b.status !== 'SUCCESS') return -1;
            if (a.status !== 'SUCCESS' && b.status === 'SUCCESS') return 1;
            // Then sort by date (newest first)
            return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
          })[0];
        
        // Find assigned template
        const assignedTemplateId = templateAssignments[provider.id];
        const assignedTemplate = assignedTemplateId
          ? templates.find(t => t.id === assignedTemplateId)
          : null;
        
        let generationStatus = 'Outstanding';
        let generationDate = '';
        let downloadLink = '';
        if (latestContract && assignedTemplate) {
          if (latestContract.status === 'SUCCESS') {
            generationStatus = 'Generated';
          } else if (latestContract.status === 'PARTIAL_SUCCESS') {
            generationStatus = 'Generated (S3 Failed)';
          } else {
            generationStatus = 'Failed';
          }
          generationDate = latestContract.generatedAt;
          // Try to use fileUrl if present and looks like a URL
          if (latestContract.fileUrl && latestContract.fileUrl.startsWith('http')) {
            downloadLink = latestContract.fileUrl;
          } else {
            // Reconstruct contractId and fileName
            const contractYear = assignedTemplate.contractYear || new Date().getFullYear().toString();
            const contractId = provider.id + '-' + assignedTemplate.id + '-' + contractYear;
            const fileName = getContractFileName(contractYear, provider.name, generationDate ? generationDate.split('T')[0] : new Date().toISOString().split('T')[0]);
            try {
              const result = await getContractFile(contractId, fileName);
              downloadLink = result.url;
            } catch (e) {
              downloadLink = '';
            }
          }
        }
        
        return {
          ...provider,
          assignedTemplate: assignedTemplate ? assignedTemplate.name : 'Unassigned',
          generationStatus,
          generationDate,
          downloadLink,
        };
      }));
      
      // Build headers based on visible columns + extra fields
      const visibleFields = agGridColumnDefs
        .filter(col => col.field && col.field !== 'checkbox' && !hiddenColumns.has(col.field))
        .map(col => col.field);
      const headers = [
        ...visibleFields.map(field => {
          const col = agGridColumnDefs.find(c => c.field === field);
          return col?.headerName || field;
        }),
        'Assigned Template',
        'Generation Status',
        'Generation Date',
        'Download Link',
      ];
      
      // Build rows
      const rows = allRows.map(row => [
        ...visibleFields.map(field => (row as any)[field] ?? ''),
        row.assignedTemplate,
        row.generationStatus,
        row.generationDate,
        row.downloadLink,
      ]);
      
      // CSV encode
      const csv = [headers, ...rows].map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'contract-generation-providers.csv');
    } catch (err) {
      setUserError('Failed to export CSV. Please try again.');
      console.error('CSV Export Error:', err);
    }
  }, [filteredProviders, generatedContracts, templateAssignments, templates, agGridColumnDefs, hiddenColumns, setUserError]);

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