/**
 * Custom hook for multi-select logic
 * Extracted from ContractGenerator.tsx to improve maintainability and testability
 */

import { useState, useCallback, useMemo, RefObject } from 'react';
import { Provider } from '@/types/provider';

interface UseMultiSelectProps {
  providers: Provider[];
  visibleRows: Provider[];
  gridRef: RefObject<any>;
}

interface UseMultiSelectReturn {
  // State
  selectedProviderIds: string[];
  
  // Computed values
  allProviderIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  
  // Functions
  toggleSelectAll: () => void;
  toggleSelectProvider: (id: string) => void;
  setSelectedProviderIds: (ids: string[] | ((prev: string[]) => string[])) => void;
}

export const useMultiSelect = ({
  providers,
  visibleRows,
  gridRef
}: UseMultiSelectProps): UseMultiSelectReturn => {
  // State
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);

  // Computed values
  const allProviderIds = useMemo(() => 
    providers.map((p: Provider) => p.id), 
    [providers]
  );

  const allSelected = useMemo(() => 
    selectedProviderIds.length === allProviderIds.length && allProviderIds.length > 0, 
    [selectedProviderIds.length, allProviderIds.length]
  );

  const someSelected = useMemo(() => 
    selectedProviderIds.length > 0, 
    [selectedProviderIds.length]
  );

  // Toggle select all functionality
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedProviderIds([]);
      gridRef.current?.api.deselectAll();
    } else {
      // Select all providers that are currently visible in the grid
      const visibleProviderIds = visibleRows.map(row => row.id);
      setSelectedProviderIds(visibleProviderIds);
      // Manually select each visible row in the grid
      visibleRows.forEach(row => {
        const rowNode = gridRef.current?.api.getRowNode(row.id);
        if (rowNode) {
          rowNode.setSelected(true);
        }
      });
    }
  }, [allSelected, visibleRows, gridRef]);

  // Toggle individual provider selection
  const toggleSelectProvider = useCallback((id: string) => {
    setSelectedProviderIds(prev => 
      prev.includes(id) 
        ? prev.filter(pid => pid !== id)
        : [...prev, id]
    );
  }, []);

  return {
    // State
    selectedProviderIds,
    
    // Computed values
    allProviderIds,
    allSelected,
    someSelected,
    
    // Functions
    toggleSelectAll,
    toggleSelectProvider,
    setSelectedProviderIds,
  };
}; 