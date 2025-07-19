/**
 * Tests for the extracted useMultiSelect hook
 * These tests verify that the hook works exactly the same as the original functions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiSelect } from '../useMultiSelect';
import type { Provider } from '@/types/provider';

// Mock grid ref
const createMockGridRef = () => ({
  current: {
    api: {
      deselectAll: vi.fn(),
      getRowNode: vi.fn((id: string) => ({
        setSelected: vi.fn()
      }))
    }
  }
});

// Test data
const testProviders: Provider[] = [
  {
    id: 'provider-1',
    name: 'Dr. Smith',
    specialty: 'Cardiology'
  } as Provider,
  {
    id: 'provider-2',
    name: 'Dr. Johnson',
    specialty: 'Primary Care'
  } as Provider,
  {
    id: 'provider-3',
    name: 'Dr. Williams',
    specialty: 'Hospitalist'
  } as Provider,
  {
    id: 'provider-4',
    name: 'Dr. Brown',
    specialty: 'Neurology'
  } as Provider
];

describe('useMultiSelect Hook', () => {
  let mockGridRef: ReturnType<typeof createMockGridRef>;

  beforeEach(() => {
    mockGridRef = createMockGridRef();
    vi.clearAllMocks();
  });

  const renderHookWithProps = (visibleRows: Provider[] = testProviders.slice(0, 3)) => {
    return renderHook(() => useMultiSelect({
      providers: testProviders,
      visibleRows,
      gridRef: mockGridRef
    }));
  };

  describe('initial state', () => {
    it('should initialize with empty selection', () => {
      const { result } = renderHookWithProps();

      expect(result.current.selectedProviderIds).toEqual([]);
      expect(result.current.allSelected).toBe(false);
      expect(result.current.someSelected).toBe(false);
      expect(result.current.allProviderIds).toEqual(['provider-1', 'provider-2', 'provider-3', 'provider-4']);
    });
  });

  describe('toggleSelectAll', () => {
    it('should deselect all when all are selected', () => {
      const { result } = renderHookWithProps();

      // Setup: select all providers
      act(() => {
        result.current.setSelectedProviderIds(['provider-1', 'provider-2', 'provider-3', 'provider-4']);
      });

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedProviderIds).toEqual([]);
      expect(mockGridRef.current.api.deselectAll).toHaveBeenCalled();
    });

    it('should select all visible providers when none are selected', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedProviderIds).toEqual(['provider-1', 'provider-2', 'provider-3']);
      expect(mockGridRef.current.api.getRowNode).toHaveBeenCalledTimes(3);
      expect(mockGridRef.current.api.getRowNode).toHaveBeenCalledWith('provider-1');
      expect(mockGridRef.current.api.getRowNode).toHaveBeenCalledWith('provider-2');
      expect(mockGridRef.current.api.getRowNode).toHaveBeenCalledWith('provider-3');
    });

    it('should select all visible providers when some are selected', () => {
      const { result } = renderHookWithProps();

      // Setup: select some providers
      act(() => {
        result.current.setSelectedProviderIds(['provider-1']);
      });

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedProviderIds).toEqual(['provider-1', 'provider-2', 'provider-3']);
      expect(mockGridRef.current.api.getRowNode).toHaveBeenCalledTimes(3);
    });

    it('should handle empty visible rows', () => {
      const { result } = renderHookWithProps([]);

      act(() => {
        result.current.toggleSelectAll();
      });

      expect(result.current.selectedProviderIds).toEqual([]);
    });
  });

  describe('toggleSelectProvider', () => {
    it('should add provider to selection when not selected', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.setSelectedProviderIds(['provider-1']);
        result.current.toggleSelectProvider('provider-2');
      });

      expect(result.current.selectedProviderIds).toEqual(['provider-1', 'provider-2']);
    });

    it('should remove provider from selection when already selected', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.setSelectedProviderIds(['provider-1', 'provider-2']);
        result.current.toggleSelectProvider('provider-1');
      });

      expect(result.current.selectedProviderIds).toEqual(['provider-2']);
    });

    it('should handle empty selection', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.toggleSelectProvider('provider-1');
      });

      expect(result.current.selectedProviderIds).toEqual(['provider-1']);
    });

    it('should handle single provider selection', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.setSelectedProviderIds(['provider-1']);
        result.current.toggleSelectProvider('provider-1');
      });

      expect(result.current.selectedProviderIds).toEqual([]);
    });
  });

  describe('computed values', () => {
    it('should correctly compute allSelected when all providers are selected', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.setSelectedProviderIds(['provider-1', 'provider-2', 'provider-3', 'provider-4']);
      });

      expect(result.current.allSelected).toBe(true);
      expect(result.current.someSelected).toBe(true);
    });

    it('should correctly compute allSelected when some providers are selected', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.setSelectedProviderIds(['provider-1', 'provider-2']);
      });

      expect(result.current.allSelected).toBe(false);
      expect(result.current.someSelected).toBe(true);
    });

    it('should correctly compute allSelected when no providers are selected', () => {
      const { result } = renderHookWithProps();

      expect(result.current.allSelected).toBe(false);
      expect(result.current.someSelected).toBe(false);
    });

    it('should handle empty providers list', () => {
      const { result } = renderHook(() => useMultiSelect({
        providers: [],
        visibleRows: [],
        gridRef: mockGridRef
      }));

      expect(result.current.allSelected).toBe(false);
      expect(result.current.someSelected).toBe(false);
      expect(result.current.allProviderIds).toEqual([]);
    });
  });

  describe('setSelectedProviderIds', () => {
    it('should accept array of IDs', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.setSelectedProviderIds(['provider-1', 'provider-2']);
      });

      expect(result.current.selectedProviderIds).toEqual(['provider-1', 'provider-2']);
    });

    it('should accept function updater', () => {
      const { result } = renderHookWithProps();

      act(() => {
        result.current.setSelectedProviderIds(['provider-1']);
        result.current.setSelectedProviderIds(prev => [...prev, 'provider-2']);
      });

      expect(result.current.selectedProviderIds).toEqual(['provider-1', 'provider-2']);
    });
  });
}); 