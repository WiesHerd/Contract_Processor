import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';

export interface ContractProgress {
  total: number;
  processed: number;
  notGenerated: number;
  inProgress: number;
  failed: number;
  completionPercentage: number;
  progressPercentage: number;
  status: 'idle' | 'in-progress' | 'completed' | 'error';
}

export const useContractProgress = (): ContractProgress => {
  const providers = useSelector((state: RootState) => state.provider.providers);
  const isGenerating = useSelector((state: RootState) => state.generator.isGenerating);
  const generatedContracts = useSelector((state: RootState) => state.generator.generatedContracts);

  const progress = useMemo((): ContractProgress => {
    console.log('🔧 Progress Hook Debug:', {
      providersCount: providers?.length || 0,
      isGenerating,
      generatedContractsCount: generatedContracts?.length || 0,
      generatedContracts: generatedContracts
    });

    if (!providers || providers.length === 0) {
      return {
        total: 0,
        processed: 0,
        notGenerated: 0,
        inProgress: 0,
        failed: 0,
        completionPercentage: 0,
        progressPercentage: 0,
        status: 'idle'
      };
    }

    const total = providers.length;
    
    // Count processed contracts based on generated contracts
    const processed = generatedContracts.filter(c => c.status === 'SUCCESS').length;
    
    // Count failed contracts
    const failed = generatedContracts.filter(c => c.status === 'FAILED').length;
    
    // Count not generated (total - processed - failed)
    const notGenerated = total - processed - failed;
    
    // Count in progress (simplified - just check if generation is happening)
    const inProgress = isGenerating ? Math.min(1, notGenerated) : 0;

    const completionPercentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    const progressPercentage = total > 0 ? Math.round(((processed + inProgress) / total) * 100) : 0;

    // Determine overall status
    let status: ContractProgress['status'] = 'idle';
    if (inProgress > 0) {
      status = 'in-progress';
    } else if (failed > 0 && processed === 0) {
      status = 'error';
    } else if (processed === total) {
      status = 'completed';
    }

    const result = {
      total,
      processed,
      notGenerated,
      inProgress,
      failed,
      completionPercentage,
      progressPercentage,
      status
    };

    console.log('🔧 Progress Result:', result);
    return result;
  }, [providers, isGenerating, generatedContracts]);

  return progress;
}; 