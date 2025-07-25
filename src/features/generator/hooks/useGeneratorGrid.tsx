import { useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';


import { formatCurrency, formatNumber, formatDate } from '@/utils/formattingUtils';
import type { Provider } from '@/types/provider';
import type { Template } from '@/types/template';

interface ExtendedProvider extends Provider {
  [key: string]: any;
}

interface UseGeneratorGridProps {
  selectedProviderIds: string[];
  setSelectedProviderIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  visibleRows: Provider[];
  columnOrder: string[];
  hiddenColumns: Set<string>;
  columnPreferences: any;
  templates: Template[];
  generatedContracts: any[];
  statusTab: 'notGenerated' | 'processed' | 'all';
  selectedTemplate: Template | null;
  updateProviderTemplate: (providerId: string, templateId: string | null) => void;
  getAssignedTemplate: (provider: Provider) => Template | null;
  downloadContract: (provider: Provider, templateId: string) => void;
  handlePreviewGenerate: (providerId: string) => void;
  handleRowClick: (event: any) => void;
  getGenerationDate: (providerId: string, templateId: string) => Date | null;
  gridRef: React.RefObject<AgGridReact>;
  updateColumnOrder?: (newOrder: string[]) => void;
  updateColumnPinning?: (pinning: { left: string[], right: string[] }) => void;
  updateColumnVisibility?: (visibility: Record<string, boolean>) => void;
}

// Memoized utility functions to avoid recreating on every render
const getFTEValue = (provider: any): number => {
  // Check for totalFTE first (new field), then fallback to fte (old field)
  if (provider.totalFTE !== undefined && provider.totalFTE !== null) {
    return Number(provider.totalFTE);
  }
  if (provider.TotalFTE !== undefined && provider.TotalFTE !== null) {
    return Number(provider.TotalFTE);
  }
  if (provider.fte !== undefined && provider.fte !== null) {
    return Number(provider.fte);
  }
  // Check dynamicFields as fallback
  if (provider.dynamicFields) {
    try {
      const dynamicFields = typeof provider.dynamicFields === 'string' 
        ? JSON.parse(provider.dynamicFields) 
        : provider.dynamicFields;
      if (dynamicFields.totalFTE !== undefined && dynamicFields.totalFTE !== null) {
        return Number(dynamicFields.totalFTE);
      }
      if (dynamicFields.TotalFTE !== undefined && dynamicFields.TotalFTE !== null) {
        return Number(dynamicFields.TotalFTE);
      }
      if (dynamicFields.fte !== undefined && dynamicFields.fte !== null) {
        return Number(dynamicFields.fte);
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }
  return 0;
};

const getCompensationModel = (provider: any): string => {
  // Check multiple possible field names and locations
  let model = provider.compensationModel || provider.compensationType || provider.CompensationModel;
  
  // Check in dynamicFields if not found in root
  if (!model && provider.dynamicFields) {
    try {
      const dynamicFields = typeof provider.dynamicFields === 'string' 
        ? JSON.parse(provider.dynamicFields) 
        : provider.dynamicFields;
      model = dynamicFields.compensationModel || dynamicFields.compensationType || dynamicFields.CompensationModel;
    } catch (e) {
      // Ignore parsing errors
    }
  }
  
  return model || 'Not Specified';
};

// Utility function to create professional template display names
const createTemplateDisplayName = (templateName: string, version: string = '1'): { short: string; full: string } => {
  const fullName = `${templateName} (v${version})`;
  
  // If name is short enough, use as-is
  if (templateName.length <= 18) {
    return { short: fullName, full: fullName };
  }
  
  // Create a professional short name
  // Extract key parts: "Schedule_A_Template_With_CF_and_FTE_Breakdown" -> "Schedule A (v1)"
  const words = templateName.split('_');
  let shortName = '';
  
  if (words.length >= 2) {
    // Use first two meaningful words
    const firstWord = words[0];
    const secondWord = words[1];
    
    if (firstWord.toLowerCase() === 'schedule' && secondWord) {
      shortName = `Schedule ${secondWord}`;
    } else {
      shortName = `${firstWord} ${secondWord}`;
    }
  } else {
    // Fallback to first 15 characters
    shortName = templateName.substring(0, 15);
  }
  
  return { 
    short: `${shortName}... (v${version})`, 
    full: fullName 
  };
};

// Memoized cell renderers to prevent recreation
const createSelectionCellRenderer = (selectedProviderIds: string[], setSelectedProviderIds: any) => {
  return (params: any) => {
    const isSelected = selectedProviderIds.includes(params.data.id);
    
    const handleCellClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      const providerId = params.data.id;
      if (!providerId) return;
      
      if (isSelected) {
        setSelectedProviderIds(prev => prev.filter(id => id !== providerId));
      } else {
        setSelectedProviderIds(prev => [...prev, providerId]);
      }
    };
    
    return (
      <div 
        className="flex items-center justify-center h-full cursor-pointer select-none"
        onClick={handleCellClick}
        onMouseDown={(e) => e.preventDefault()}
        style={{ 
          pointerEvents: 'auto', 
          zIndex: 9999,
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
        title={isSelected ? "Deselect row" : "Select row"}
      >
        {isSelected ? (
          <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-white rounded-full"></div>
          </div>
        ) : (
          <div className="w-4 h-4 border-2 border-gray-300 rounded-full hover:border-blue-400"></div>
        )}
      </div>
    );
  };
};



export const useGeneratorGrid = ({
  selectedProviderIds,
  setSelectedProviderIds,
  visibleRows,
  columnOrder,
  hiddenColumns,
  columnPreferences,
  templates,
  generatedContracts,
  statusTab,
  selectedTemplate,
  updateProviderTemplate,
  getAssignedTemplate,
  downloadContract,
  handlePreviewGenerate,
  handleRowClick,
  getGenerationDate,
  gridRef,
  updateColumnOrder,
  updateColumnPinning,
  updateColumnVisibility,
}: UseGeneratorGridProps) => {

  // Memoize expensive operations
  const templatesMap = useMemo(() => {
    return templates.reduce((acc, template) => {
      acc[template.id] = template;
      return acc;
    }, {} as Record<string, Template>);
  }, [templates]);

  const generatedContractsMap = useMemo(() => {
    return generatedContracts.reduce((acc, contract) => {
      if (!acc[contract.providerId]) {
        acc[contract.providerId] = [];
      }
      acc[contract.providerId].push(contract);
      return acc;
    }, {} as Record<string, any[]>);
  }, [generatedContracts]);

  // Memoized cell renderers
  const selectionCellRenderer = useMemo(() => 
    createSelectionCellRenderer(selectedProviderIds, setSelectedProviderIds), 
    [selectedProviderIds, setSelectedProviderIds]
  );



  // Selection indicator column (visual only, no interaction)
  const selectColumn = useMemo(() => ({
    headerName: '',
    field: 'selected',
    width: 40,
    minWidth: 40,
    maxWidth: 40,
    pinned: 'left',
    suppressMenu: true,
    sortable: false,
    filter: false,
    resizable: false,
    suppressSizeToFit: true,
    suppressRowClickSelection: true,
    cellRenderer: selectionCellRenderer,
  }), [selectionCellRenderer]);

  // Define all possible columns with optimized valueGetters
  const allColumnDefs = useMemo(() => ({
          name: {
        headerName: 'Provider Name',
        field: 'name',
        width: 220,
        minWidth: 180,
        filter: false,
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
          employeeId: {
        headerName: 'Employee ID',
        field: 'employeeId',
        width: 130,
        minWidth: 100,
        filter: false,
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
          specialty: {
        headerName: 'Specialty',
        field: 'specialty',
        width: 180,
        minWidth: 140,
        filter: false,
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
          subspecialty: {
        headerName: 'Subspecialty',
        field: 'subspecialty',
        width: 180,
        minWidth: 140,
        filter: false,
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
          providerType: {
        headerName: 'Provider Type',
        field: 'providerType',
        width: 140,
        minWidth: 120,
        filter: false,
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
          administrativeRole: {
        headerName: 'Administrative Role',
        field: 'administrativeRole',
        width: 180,
        minWidth: 150,
        filter: false,
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap'
        },
      },
          baseSalary: {
        headerName: 'Base Salary',
        field: 'baseSalary',
        width: 140,
        minWidth: 120,
        valueFormatter: (params: any) => formatCurrency(params.value),
        filter: false,
        tooltipValueGetter: (params: any) => formatCurrency(params.value),
        cellStyle: { 
          textAlign: 'right',
          fontFamily: 'monospace'
        },
      },
          fte: {
        headerName: 'FTE',
        field: 'fte',
        width: 100,
        minWidth: 80,
        valueGetter: (params: any) => getFTEValue(params.data),
        valueFormatter: (params: any) => formatNumber(params.value),
        filter: false,
        tooltipValueGetter: (params: any) => formatNumber(params.value),
        cellStyle: { 
          textAlign: 'right',
          fontFamily: 'monospace'
        },
      },
          startDate: {
        headerName: 'Start Date',
        field: 'startDate',
        width: 140,
        minWidth: 120,
        valueFormatter: (params: any) => formatDate(params.value),
        filter: false,
        tooltipValueGetter: (params: any) => formatDate(params.value),
        cellStyle: { 
          textAlign: 'center',
          fontFamily: 'monospace'
        },
      },
    compensationModel: {
      field: 'compensationModel',
      headerName: 'Compensation Model',
      width: 200,
      minWidth: 150,
      maxWidth: 250,
      valueGetter: (params: any) => getCompensationModel(params.data),
              sortable: true,
        filter: false,
        tooltipValueGetter: (params: any) => params.value,
      cellStyle: { 
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
      },
    },

    assignedTemplate: {
      field: 'assignedTemplate',
      headerName: 'Template',
      width: 160,
      minWidth: 140,
      maxWidth: 180,
      valueGetter: (params: any) => {
        const provider = params.data;
        const assignedTemplate = getAssignedTemplate(provider);
        
        if (!assignedTemplate) {
          return 'No template';
        }
        
        // Create a shortened version for display
        const { short, full } = createTemplateDisplayName(assignedTemplate.name, assignedTemplate.version || '1');
        
        // Store full name in data for tooltip
        params.data._fullTemplateName = full;
        params.data._isTemplateTruncated = short !== full;
        
        return short;
      },
      sortable: true,
      filter: false,
      tooltipValueGetter: (params: any) => {
        // Return full template name for tooltip
        return params.data._fullTemplateName || params.value;
      },
      cellRenderer: (params: any) => {
        const value = params.value;
        const isTruncated = params.data._isTemplateTruncated;
        
        if (!value || value === 'No template') {
          return `<span class="text-gray-400">${value}</span>`;
        }
        
        // Add visual indicator for truncated names
        const truncatedIndicator = isTruncated ? '<span class="text-blue-500 ml-1">⋯</span>' : '';
        
        return `<div class="flex items-center justify-between w-full">
          <span class="truncate">${value}</span>
          ${truncatedIndicator}
        </div>`;
      },
      cellStyle: { 
        textOverflow: 'ellipsis',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        cursor: 'help'
      },
    },

    }), [templates, getAssignedTemplate, updateProviderTemplate]);

  // Generation Status column - Always show
  const generationStatusColumn = {
    headerName: 'Generation Status',
    field: 'generationStatus',
    width: 140,
    minWidth: 140,
    maxWidth: 140,
    headerClass: 'whitespace-nowrap',
    valueGetter: (params: any) => {
      const provider = params.data;
      const assignedTemplate = getAssignedTemplate(provider);
      const contract = generatedContracts.find(c => c.providerId === provider.id);
      
      // Debug logging
      console.log('Generation Status Debug:', {
        providerId: provider?.id,
        providerName: provider?.name,
        assignedTemplate: assignedTemplate?.name,
        contractFound: !!contract,
        contractStatus: contract?.status,
        generatedContractsLength: generatedContracts?.length
      });
      
      if (!assignedTemplate) {
        return '⬜ Not Processed';
      }
      
      if (!contract) {
        return '⚡ Ready to Generate';
      }
      
      const status = contract.status;
      if (status === 'SUCCESS') {
        return '✅ Generated';
      }
      if (status === 'PARTIAL_SUCCESS') {
        return '⚠️ Partial Success';
      }
      if (status === 'FAILED') {
        return '❌ Failed';
      }
      
      return '— Unknown';
    },
    sortable: true,
    filter: false,
    suppressMovableColumns: false,
    resizable: true,
  };

  // Contract Actions column - Always show, with different content based on status
  const contractActionsColumn = {
    headerName: 'Contract Actions',
    field: 'actions',
    width: 120,
    minWidth: 120,
    maxWidth: 120,
    headerClass: 'whitespace-nowrap',
    valueGetter: (params: any) => {
      const provider = params.data;
      const assignedTemplate = getAssignedTemplate(provider);
      const contract = generatedContracts.find(c => c.providerId === provider.id);
      
      // Debug logging
      console.log('Contract Actions Debug:', {
        providerId: provider?.id,
        providerName: provider?.name,
        assignedTemplate: assignedTemplate?.name,
        contractFound: !!contract,
        contractStatus: contract?.status,
        generatedContractsLength: generatedContracts?.length
      });
      
      // If no template assigned, show "Assign Template"
      if (!assignedTemplate) {
        return 'Assign Template';
      }
      
      // If template assigned but no contract generated, show "Generate"
      if (!contract) {
        return '⚡ Generate';
      }
      
      // If contract exists, show download and preview actions
      const isPartialSuccess = contract.status === 'PARTIAL_SUCCESS';
      const isSuccess = contract.status === 'SUCCESS';
      const isFailed = !isSuccess && !isPartialSuccess;
      
      if (isFailed) {
        return '❌ Failed';
      }
      
      // For successful contracts, return a special value to trigger cell renderer
      return 'ACTIONS_BUTTONS';
    },
    cellRenderer: (params: any) => {
      const provider = params.data;
      const assignedTemplate = getAssignedTemplate(provider);
      const contract = generatedContracts.find(c => c.providerId === provider.id);
      
      // Only render buttons for successful contracts
      if (!contract || (contract.status !== 'SUCCESS' && contract.status !== 'PARTIAL_SUCCESS')) {
        return null; // Let valueGetter handle the display
      }
      
      const isPartialSuccess = contract.status === 'PARTIAL_SUCCESS';
      
      return (
        <div className="flex items-center justify-center gap-1 h-full">
          {/* Document/Download Icon */}
          <button
            className={`${isPartialSuccess ? 'text-orange-600 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50'} p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent`}
            title={isPartialSuccess ? "Download Contract (S3 storage failed)" : "Download Contract from S3"}
            onClick={(e) => {
              e.stopPropagation();
              downloadContract(provider, contract.templateId);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          
          {/* Eye/Preview Icon */}
          <button
            className={`${isPartialSuccess ? 'text-orange-600 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50'} p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer border-0 bg-transparent`}
            title="Preview Contract"
            onClick={(e) => {
              e.stopPropagation();
              handlePreviewGenerate(provider.id);
            }}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      );
    },
    sortable: false,
    filter: false,
    suppressMovableColumns: false,
    resizable: true,
  };

  // Comprehensive column definitions for all tabs - column manager will handle visibility
  const allPossibleColumns = useMemo(() => [
    selectColumn,
    ...Object.values(allColumnDefs),
    // Always include these columns
    generationStatusColumn,
    contractActionsColumn
  ], [selectColumn, allColumnDefs, generationStatusColumn, contractActionsColumn]);

  // Extract pinning from columnPreferences to avoid circular dependency
  const { leftPinned, rightPinned } = useMemo(() => ({
    leftPinned: columnPreferences?.columnPinning?.left || [],
    rightPinned: columnPreferences?.columnPinning?.right || []
  }), [columnPreferences?.columnPinning?.left, columnPreferences?.columnPinning?.right]);

  // Contextual column definitions based on current tab
  const agGridColumnDefs = useMemo(() => {
    // Return columns in the correct order based on columnOrder
    // This ensures the grid respects the column manager's order
    const orderedColumns: any[] = [];
    
    // Add selection column first
    orderedColumns.push(selectColumn);
    
    // Add columns in the order specified by columnOrder
    columnOrder.forEach(field => {
      // Skip template column for processed tab
      if (statusTab === 'processed' && field === 'assignedTemplate') {
        return;
      }
      
      // Skip template column for all tab
      if (statusTab === 'all' && field === 'assignedTemplate') {
        return;
      }
      
      // Skip template, generation status, and actions columns for notGenerated tab
      if (statusTab === 'notGenerated' && (field === 'assignedTemplate' || field === 'generationStatus' || field === 'actions')) {
        return;
      }
      
      const colDef = allColumnDefs[field as keyof typeof allColumnDefs];
      if (colDef) {
        // Apply pinning from preferences
        let pinned: 'left' | 'right' | undefined;
        if (leftPinned.includes(field)) {
          pinned = 'left';
        } else if (rightPinned.includes(field)) {
          pinned = 'right';
        }

        const finalColDef = {
          ...colDef,
          pinned,
          hide: hiddenColumns.has(field),
          suppressMovableColumns: true, // Disable AG Grid column dragging - use Column Manager instead
          resizable: true, // Enable column resizing
          sortable: true, // Enable column sorting
          filter: false, // Disable column filtering
        };
        
        orderedColumns.push(finalColDef);
      }
    });
    
    // Add generation status and actions columns for all tabs except notGenerated
    if (statusTab !== 'notGenerated') {
      orderedColumns.push(generationStatusColumn);
      orderedColumns.push(contractActionsColumn);
    }
    
    // Debug logging
    console.log('🔍 Column Debug:', {
      statusTab,
      totalColumns: orderedColumns.length,
      columnNames: orderedColumns.map(col => col.headerName || col.field)
    });
    
    return orderedColumns;
  }, [selectColumn, allColumnDefs, columnOrder, hiddenColumns, leftPinned, rightPinned, generationStatusColumn, contractActionsColumn, statusTab]);

  // Grid options and configuration - optimized for performance
  const gridOptions = useMemo(() => ({
    // Add CSS to ensure contract actions are clickable
    getRowClass: (params: any) => {
      return 'contract-actions-row';
    },
    domLayout: "normal" as const,
    suppressRowClickSelection: true, // Disable row click selection to prevent interference
    pagination: false,
    enableCellTextSelection: true,
    headerHeight: 44,
    rowHeight: 40,
    suppressDragLeaveHidesColumns: true,
    suppressScrollOnNewData: true,
    suppressColumnVirtualisation: false, // Enable column virtualization for better performance
    suppressRowVirtualisation: false,
    suppressHorizontalScroll: false,
    maintainColumnOrder: false, // Disable to allow external column order control
    suppressLoadingOverlay: false,
    suppressNoRowsOverlay: false,
    skipHeaderOnAutoSize: true,
    suppressColumnMoveAnimation: false, // Enable column move animations for better UX
    suppressRowHoverHighlight: false,
    suppressCellFocus: false,
    suppressFieldDotNotation: true,
    suppressMenuHide: false,
    enableBrowserTooltips: true,
    enableRangeSelection: true,
    singleClickEdit: false,
    suppressClipboardPaste: false,
    suppressCopyRowsToClipboard: false,
    allowContextMenuWithControlKey: true,
    // Column management properties
    suppressMovableColumns: true, // Disable AG Grid column dragging - use Column Manager instead
    enableColumnResize: true, // Enable column resizing
    // Performance optimizations
    suppressAnimationFrame: false,
    suppressBrowserResizeObserver: false,
    // Batch updates for better performance
    batchUpdateWaitTime: 50,
    // Optimize rendering
    suppressRowTransform: false,
    suppressColumnTransform: false,
    defaultColDef: { 
      tooltipValueGetter: (params: any) => params.value, 
      resizable: true, 
      sortable: true, 
      filter: false,
      suppressMenu: true,
      cellStyle: { 
        fontSize: '14px', 
        fontFamily: 'var(--font-sans, sans-serif)', 
        fontWeight: 400, 
        color: '#111827', 
        height: '100%',
        paddingLeft: '12px',
        paddingRight: '12px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      },
      suppressSizeToFit: false,
      suppressAutoSize: false
    },
    isRowSelectable: (rowNode: any) => {
      return Boolean(rowNode.data && rowNode.data.id);
    },
    getRowId: (params: any) => params.data.id,

  }), [updateColumnOrder, updateColumnPinning, updateColumnVisibility]);

  // Optimized grid event handlers
  const onGridReady = useCallback((params: any) => {
    // Single sizeColumnsToFit call with debouncing
    const resizeColumns = () => {
      params.api.sizeColumnsToFit();
    };
    
    // Use requestAnimationFrame for better performance
    requestAnimationFrame(resizeColumns);
  }, []);

  const onRowDataUpdated = useCallback((params: any) => {
    // Only resize if needed and debounce the operation
    if (params.api) {
      requestAnimationFrame(() => {
        params.api.sizeColumnsToFit();
      });
    }
  }, []);

  // Grid styling
  const gridStyle = {
    width: '100%',
    height: '600px', // Fixed height instead of 100%
    minHeight: '400px',
    minWidth: '100%',
    maxWidth: '100%',
    '--ag-header-background-color': '#f8fafc',
    '--ag-header-foreground-color': '#374151',
    '--ag-border-color': '#e5e7eb',
    '--ag-row-hover-color': '#f8fafc',
    '--ag-selected-row-background-color': '#f1f5f9',
    '--ag-font-family': 'var(--font-sans, sans-serif)',
    '--ag-font-size': '14px',
    '--ag-header-height': '44px',
    '--ag-row-height': '40px'
  } as React.CSSProperties;

  return {
    agGridColumnDefs,
    gridOptions,
    gridStyle,
    onGridReady,
    onRowDataUpdated,
  };
}; 