import { useMemo, useRef, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
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
      headerName: 'Template',
      field: 'assignedTemplate',
      width: 250,
      minWidth: 200,
      maxWidth: 300,
      cellRenderer: (params: any) => {
        const provider = params.data;
        const assignedTemplate = getAssignedTemplate(provider);
        
        return (
          <div className="w-full">
            <Select
              value={assignedTemplate?.id || "no-template"}
              onValueChange={(templateId) => {
                if (templateId === "no-template") {
                  updateProviderTemplate(provider.id, null);
                } else {
                  updateProviderTemplate(provider.id, templateId);
                }
              }}
            >
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue>
                  {assignedTemplate ? (
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="truncate text-xs" title={assignedTemplate.name}>
                        {assignedTemplate.name}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        (v{assignedTemplate.version || '1'})
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">No template</span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="no-template">
                  <span className="text-gray-500">No template</span>
                </SelectItem>
                {templates
                  .filter(t => t?.id && t?.name)
                  .map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-gray-500">v{template.version || '1'}</div>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        );
      },
              sortable: true,
        filter: false,
        suppressSizeToFit: false,
      suppressAutoSize: false,
      resizable: true,
      cellStyle: { 
        padding: '0',
        overflow: 'hidden'
      },
    },
  }), [templates, getAssignedTemplate, updateProviderTemplate]);

  // Generation Status column (only for Processed tab)
  const generationStatusColumn = statusTab === 'processed' ? {
    headerName: 'Generation Status',
    field: 'generationStatus',
    width: 160,
    minWidth: 140,
    cellRenderer: (params: any) => {
      const provider = params.data;
      const assignedTemplate = getAssignedTemplate(provider);
      const contract = generatedContracts.find(c => c.providerId === provider.id);
      
      // If no template assigned, show "No Template"
      if (!assignedTemplate) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            <span className="w-3 h-3 text-center">—</span> No Template
          </span>
        );
      }
      
      // If template assigned but no contract generated, show "Ready to Generate"
      if (!contract) {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <span className="w-3 h-3 text-center">⚡</span> Ready to Generate
          </span>
        );
      }
      
      // If contract exists, show appropriate status
      const status = contract.status;
      if (status === 'SUCCESS') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> Generated
          </span>
        );
      }
      if (status === 'PARTIAL_SUCCESS') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3" /> Partial Success
          </span>
        );
      }
      if (status === 'FAILED') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      }
      
      // Default case
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <span className="w-3 h-3 text-center">—</span> Unknown
        </span>
      );
    },
    sortable: true,
    filter: false,
    suppressMovableColumns: false, // Enable column dragging
    resizable: true, // Enable column resizing
    tooltipValueGetter: (params: any) => {
      const generationDate = getGenerationDate(params.data.id, selectedTemplate?.id || '');
      return generationDate ? `Last generated: ${formatDate(generationDate.toISOString())}` : 'Not generated yet';
    },
  } : null;

  // Contract Actions column (only for Processed tab) - Shows Generate button or S3 document link and preview
  const contractActionsColumn = statusTab === 'processed' ? {
    headerName: 'Contract Actions',
    field: 'actions',
    width: 160,
    minWidth: 140,
    cellRenderer: (params: any) => {
      const provider = params.data;
      const assignedTemplate = getAssignedTemplate(provider);
      const contract = generatedContracts.find(c => c.providerId === provider.id);
      
      // If no template assigned, show "Assign Template"
      if (!assignedTemplate) {
        return (
          <span className="text-gray-400 text-xs">Assign Template</span>
        );
      }
      
      // If template assigned but no contract generated, show "Generate" button
      if (!contract) {
        return (
          <div className="flex items-center gap-1">
            <button
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1 h-8 w-8 flex items-center justify-center rounded transition-colors cursor-pointer"
              style={{ 
                pointerEvents: 'auto',
                zIndex: 9999,
                position: 'relative'
              }}
              title="Generate Contract"
              onClick={() => {
                // This would trigger contract generation for this provider
                console.log('Generate contract for:', provider.name);
                // You can implement the actual generation logic here
              }}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </button>
            <span className="text-blue-600 text-xs">Generate</span>
          </div>
        );
      }
      
      // If contract exists, show download and preview actions
      const isPartialSuccess = contract.status === 'PARTIAL_SUCCESS';
      const isSuccess = contract.status === 'SUCCESS';
      const isFailed = !isSuccess && !isPartialSuccess;
      
      if (isFailed) {
        return (
          <div className="flex items-center gap-1">
            <span className="text-red-500 text-xs">Generation Failed</span>
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-1">
          {/* Document/Download Icon - Links to S3 */}
          <div
            className={`${isPartialSuccess ? 'text-orange-600 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50'} p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer`}
            style={{ 
              pointerEvents: 'auto',
              zIndex: 9999,
              position: 'relative'
            }}
            title={isPartialSuccess ? "Download Contract (S3 storage failed)" : "Download Contract from S3"}
            onMouseDown={() => downloadContract(provider, contract.templateId)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          
          {/* Eye/Preview Icon */}
          <div
            className={`${isPartialSuccess ? 'text-orange-600 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50'} p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer`}
            style={{ 
              pointerEvents: 'auto',
              zIndex: 9999,
              position: 'relative'
            }}
            title="Preview Contract"
            onMouseDown={() => handlePreviewGenerate(provider.id)}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        </div>
      );
    },
    sortable: false,
    filter: false,
    resizable: false,
    suppressMovableColumns: false, // Enable column dragging
    pinned: null, // Explicitly set to null to prevent any pinning
  } : null;

  // Comprehensive column definitions for all tabs - column manager will handle visibility
  const allPossibleColumns = useMemo(() => [
    selectColumn,
    ...Object.values(allColumnDefs),
    // Only include these columns if they exist (not null)
    ...(generationStatusColumn ? [generationStatusColumn] : []),
    ...(contractActionsColumn ? [contractActionsColumn] : [])
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
    
    // Add generation status and actions columns ONLY for processed tab
    // Also ensure these columns are completely hidden for other tabs
    if (statusTab === 'processed') {
      if (generationStatusColumn) {
        orderedColumns.push(generationStatusColumn);
      }
      if (contractActionsColumn) {
        orderedColumns.push(contractActionsColumn);
      }
    }
    // For non-processed tabs, explicitly exclude these columns
    // This prevents any rendering issues or column bleeding
    
    // Debug logging
    console.log('🔍 Column Debug:', {
      statusTab,
      generationStatusColumn: !!generationStatusColumn,
      contractActionsColumn: !!contractActionsColumn,
      totalColumns: orderedColumns.length,
      columnNames: orderedColumns.map(col => col.headerName || col.field)
    });
    
    return orderedColumns;
  }, [selectColumn, allColumnDefs, columnOrder, hiddenColumns, leftPinned, rightPinned, generationStatusColumn, contractActionsColumn]);

  // Grid options and configuration - optimized for performance
  const gridOptions = useMemo(() => ({
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
        display: 'flex', 
        alignItems: 'center', 
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