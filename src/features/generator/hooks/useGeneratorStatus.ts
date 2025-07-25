import { useCallback } from 'react';

interface UseGeneratorStatusProps {
  generatedContracts: any[];
}

export const useGeneratorStatus = ({
  generatedContracts,
}: UseGeneratorStatusProps) => {
  // Get contract status for a specific provider and template
  const getContractStatus = useCallback((providerId: string, templateId: string) => {
    return generatedContracts.find(
      c => c.providerId === providerId && c.templateId === templateId
    )?.status;
  }, [generatedContracts]);

  // Get the most recent generated contract for a provider
  const getLatestGeneratedContract = useCallback((providerId: string) => {
    const contracts = generatedContracts.filter(c => c.providerId === providerId);
    if (contracts.length === 0) return null;
    return contracts.reduce((latest, curr) =>
      new Date(curr.generatedAt) > new Date(latest.generatedAt) ? curr : latest
    );
  }, [generatedContracts]);

  // Compute generation status for each provider
  const getGenerationStatus = useCallback((providerId: string, templateId: string) => {
    // First try to find exact match
    let contract = generatedContracts.find(
      c => c.providerId === providerId && c.templateId === templateId
    );
    
    // If no exact match, check if any contract exists for this provider (for backward compatibility)
    if (!contract) {
      contract = generatedContracts.find(c => c.providerId === providerId);
    }
    

    
    if (!contract) return 'Not Generated';
    if (contract.status === 'SUCCESS') return 'Success';
    if (contract.status === 'PARTIAL_SUCCESS') return 'Partial Success';
    if (contract.status === 'FAILED') return 'Failed';
    return 'Needs Review';
  }, [generatedContracts]);

  // Get generation date for display
  const getGenerationDate = useCallback((providerId: string, templateId: string) => {
    const contract = generatedContracts.find(
      c => c.providerId === providerId && c.templateId === templateId
    );
    return contract?.generatedAt ? new Date(contract.generatedAt) : null;
  }, [generatedContracts]);

  // Scan template for placeholders
  const scanPlaceholders = useCallback((templateContent: string): string[] => {
    const matches = templateContent.match(/{{(.*?)}}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/{{|}}/g, ''))));
  }, []);

  return {
    getContractStatus,
    getLatestGeneratedContract,
    getGenerationStatus,
    getGenerationDate,
    scanPlaceholders,
  };
}; 