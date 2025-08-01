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
  allFilteredProvidersWithStatus?: any[]; // Add this for smart selection
  notGeneratedRows?: any[]; // Add this for unprocessed selection
}

interface UseMultiSelectReturn {
  // State
  selectedProviderIds: string[];
  
  // Computed values
  allProviderIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  
  // Smart selection metrics
  unprocessedCount: number;
  processedCount: number;
  totalFilteredCount: number;
  completionRate: number;
  
  // Functions
  toggleSelectAll: () => void;
  toggleSelectProvider: (id: string) => void;
  setSelectedProviderIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  
  // Enterprise-grade selection functions
  selectAllUnprocessed: () => void;
  selectNextBatch: (batchSize?: number) => void;
  selectAllInCurrentTab: () => void;
  selectAllVisible: () => void;
  clearSelection: () => void;
}

export const useMultiSelect = ({
  providers,
  visibleRows,
  gridRef,
  allFilteredProvidersWithStatus = [],
  notGeneratedRows = []
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

  // Smart selection metrics
  const unprocessedCount = useMemo(() => 
    notGeneratedRows.length, 
    [notGeneratedRows]
  );

  const processedCount = useMemo(() => 
    allFilteredProvidersWithStatus.filter(row => 
      row.generationStatus === 'Success' || row.generationStatus === 'Partial Success'
    ).length, 
    [allFilteredProvidersWithStatus]
  );

  const totalFilteredCount = useMemo(() => 
    allFilteredProvidersWithStatus.length, 
    [allFilteredProvidersWithStatus]
  );

  const completionRate = useMemo(() => 
    totalFilteredCount > 0 ? Math.round((processedCount / totalFilteredCount) * 100) : 0, 
    [processedCount, totalFilteredCount]
  );

  // Enterprise-grade selection functions
  const selectAllUnprocessed = useCallback(() => {
    const unprocessedIds = notGeneratedRows.map(row => row.id);
    setSelectedProviderIds(unprocessedIds);
    
    // Update grid selection
    gridRef.current?.api.deselectAll();
    notGeneratedRows.forEach(row => {
      const rowNode = gridRef.current?.api.getRowNode(row.id);
      if (rowNode) {
        rowNode.setSelected(true);
      }
    });
  }, [notGeneratedRows, gridRef]);

  const selectNextBatch = useCallback((batchSize = 50) => {
    const unprocessedIds = notGeneratedRows
      .slice(0, batchSize)
      .map(row => row.id);
    setSelectedProviderIds(unprocessedIds);
    
    // Update grid selection
    gridRef.current?.api.deselectAll();
    notGeneratedRows.slice(0, batchSize).forEach(row => {
      const rowNode = gridRef.current?.api.getRowNode(row.id);
      if (rowNode) {
        rowNode.setSelected(true);
      }
    });
  }, [notGeneratedRows, gridRef]);

  const selectAllInCurrentTab = useCallback(() => {
    const currentTabIds = visibleRows.map(row => row.id);
    setSelectedProviderIds(currentTabIds);
    
    // Update grid selection
    gridRef.current?.api.deselectAll();
    visibleRows.forEach(row => {
      const rowNode = gridRef.current?.api.getRowNode(row.id);
      if (rowNode) {
        rowNode.setSelected(true);
      }
    });
  }, [visibleRows, gridRef]);

  const selectAllVisible = useCallback(() => {
    const visibleIds = visibleRows.map(row => row.id);
    setSelectedProviderIds(visibleIds);
    
    // Update grid selection
    gridRef.current?.api.deselectAll();
    visibleRows.forEach(row => {
      const rowNode = gridRef.current?.api.getRowNode(row.id);
      if (rowNode) {
        rowNode.setSelected(true);
      }
    });
  }, [visibleRows, gridRef]);

  const clearSelection = useCallback(() => {
    setSelectedProviderIds([]);
    gridRef.current?.api.deselectAll();
  }, [gridRef]);

  // Toggle select all functionality (legacy - now uses selectAllVisible)
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAllVisible();
    }
  }, [allSelected, selectAllVisible, clearSelection]);

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
    
    // Smart selection metrics
    unprocessedCount,
    processedCount,
    totalFilteredCount,
    completionRate,
    
    // Functions
    toggleSelectAll,
    toggleSelectProvider,
    setSelectedProviderIds,
    
    // Enterprise-grade selection functions
    selectAllUnprocessed,
    selectNextBatch,
    selectAllInCurrentTab,
    selectAllVisible,
    clearSelection,
  };
}; 