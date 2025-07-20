import { useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
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
}

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
}: UseGeneratorGridProps) => {

  // Base columns that appear in all tabs
  const baseColumns = useMemo(() => {
    const leftPinned = columnPreferences?.columnPinning?.left || [];
    const rightPinned = columnPreferences?.columnPinning?.right || [];
    
    // Selection indicator column (visual only, no interaction)
    const selectColumn = {
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
      cellRenderer: (params: any) => {
        const isSelected = selectedProviderIds.includes(params.data.id);
        return (
          <div className="flex items-center justify-center h-full">
            {isSelected ? (
              <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            ) : (
              <div className="w-3 h-3 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>
        );
      },
      headerComponent: () => {
        const visibleRowIds = visibleRows.map(row => row.id);
        const allVisibleSelected = visibleRowIds.length > 0 && 
          visibleRowIds.every(id => selectedProviderIds.includes(id));
        const someVisibleSelected = visibleRowIds.some(id => selectedProviderIds.includes(id));
        
        return (
          <div 
            className="flex items-center justify-center h-full cursor-pointer hover:bg-gray-100 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              if (allVisibleSelected) {
                // Deselect all visible
                setSelectedProviderIds(prev => prev.filter(id => !visibleRowIds.includes(id)));
              } else {
                // Select all visible
                setSelectedProviderIds(prev => {
                   const newSelection = [...prev];
                   visibleRowIds.forEach(id => {
                     if (!newSelection.includes(id)) {
                       newSelection.push(id);
                     }
                   });
                   return newSelection;
                 });
              }
            }}
          >
            {allVisibleSelected ? (
              <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              </div>
            ) : someVisibleSelected ? (
              <div className="w-3 h-3 bg-blue-600 rounded-full flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full opacity-50"></div>
              </div>
            ) : (
              <div className="w-3 h-3 border-2 border-gray-300 rounded-full"></div>
            )}
          </div>
        );
      },
    };

    // Define all possible columns
    const allColumnDefs = {
      name: {
        headerName: 'Provider Name',
        field: 'name',
        width: 220,
        minWidth: 180,
        filter: 'agTextColumnFilter',
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
        filter: 'agTextColumnFilter',
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
        filter: 'agTextColumnFilter',
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
        filter: 'agTextColumnFilter',
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
        filter: 'agTextColumnFilter',
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
        filter: 'agTextColumnFilter',
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
        filter: 'agNumberColumnFilter',
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
        valueGetter: (params: any) => {
          const provider = params.data;
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
        },
        valueFormatter: (params: any) => formatNumber(params.value),
        filter: 'agNumberColumnFilter',
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
        filter: 'agDateColumnFilter',
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
        valueGetter: (params: any) => {
          const provider = params.data;
          
          // Debug logging to see what's in the provider data
          if (provider.id === 'jennifer-lopez' || provider.name?.includes('Jennifer')) {
            console.log('🔍 Compensation Model Debug for Jennifer:', {
              providerId: provider.id,
              providerName: provider.name,
              compensationModel: provider.compensationModel,
              compensationType: provider.compensationType,
              CompensationModel: provider.CompensationModel,
              dynamicFields: provider.dynamicFields,
              allKeys: Object.keys(provider)
            });
          }
          
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
          
          return model || 'Not specified';
        },
        cellRenderer: (params: any) => {
          const value = params.value;
          if (!value || value === 'Not specified') {
            return (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-400 italic">Not specified</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
              <span className="text-sm font-medium truncate" title={value}>
                {value}
              </span>
            </div>
          );
        },
        filter: 'agTextColumnFilter',
        tooltipValueGetter: (params: any) => params.value,
        cellStyle: { 
          textOverflow: 'ellipsis',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          padding: '8px 12px'
        },
      },
      assignedTemplate: {
        headerName: 'Template',
        field: 'assignedTemplate',
        width: 180,
        minWidth: 150,
        maxWidth: 220,
        valueGetter: (params: any) => {
          const provider = params.data;
          const assignedTemplate = getAssignedTemplate(provider);
          return assignedTemplate ? assignedTemplate.name : 'No template';
        },
        cellRenderer: (params: any) => {
          const provider = params.data;
          
          // For Processed tab: Show the template that was actually used
          if (statusTab === 'processed') {
            const contract = generatedContracts.find(
              c => c.providerId === provider.id && c.status === 'SUCCESS'
            );
            
            if (contract) {
              const usedTemplate = templates.find(t => t.id === contract.templateId);
              return (
                <div className="w-full h-full flex items-center px-2" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div className="flex items-center gap-2 w-full">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 truncate" title={usedTemplate?.name || 'Unknown template'}>
                      {usedTemplate?.name || 'Unknown template'}
                    </span>
                  </div>
                </div>
              );
            } else {
              return (
                <div className="w-full h-full flex items-center px-2" style={{ position: 'relative', overflow: 'hidden' }}>
                  <span className="text-sm text-gray-400 italic">No contract found</span>
                </div>
              );
            }
          }
          
          // For Not Generated and All tabs: Show template selection dropdown
          const assignedTemplate = getAssignedTemplate(provider);
          
          return (
            <div className="w-full h-full flex items-center justify-center px-1" style={{ position: 'relative', overflow: 'hidden' }}>
              <div className="w-full">
                <Select
                  value={assignedTemplate?.id || 'no-template'}
                  onValueChange={(templateId) => {
                    if (templateId === 'no-template') {
                      updateProviderTemplate(provider.id, null);
                    } else {
                      updateProviderTemplate(provider.id, templateId);
                    }
                  }}
                >
                  <SelectTrigger 
                    className="h-6 px-2 text-xs bg-white hover:bg-gray-50 border border-gray-300 rounded transition-colors" 
                    style={{ position: 'relative', zIndex: 1, maxWidth: '140px' }}
                    title={assignedTemplate ? `${assignedTemplate.name} v${assignedTemplate.version || '1.0.0'}` : 'Select Template'}
                  >
                    <SelectValue>
                      {assignedTemplate ? (
                        <span className="truncate text-gray-700 font-medium">
                          {assignedTemplate.name}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">Select</span>
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
            </div>
          );
        },
        sortable: true,
        filter: 'agTextColumnFilter',
        suppressSizeToFit: false,
        suppressAutoSize: false,
        resizable: true,
        cellStyle: { 
          padding: '0',
          overflow: 'hidden'
        },
      },
    };

    // Build columns based on columnOrder
    const orderedColumns = columnOrder.map(field => {
      const colDef = allColumnDefs[field as keyof typeof allColumnDefs];
      if (!colDef) return null;

      // Apply pinning from preferences
      let pinned: 'left' | 'right' | undefined;
      if (leftPinned.includes(field)) {
        pinned = 'left';
      } else if (rightPinned.includes(field)) {
        pinned = 'right';
      }

      return {
        ...colDef,
        pinned,
        hide: hiddenColumns.has(field),
      };
    }).filter(Boolean);

    return [selectColumn, ...orderedColumns];
  }, [columnOrder, hiddenColumns, columnPreferences?.columnPinning, selectedProviderIds, templates, getAssignedTemplate, updateProviderTemplate, statusTab, generatedContracts]);

  // Generation Status column (only for All tab)
  const generationStatusColumn = {
    headerName: 'Generation Status',
    field: 'generationStatus',
    width: 160,
    minWidth: 140,
    cellRenderer: (params: any) => {
      const status = params.value;
      if (status === 'Success') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" /> Generated
          </span>
        );
      }
      if (status === 'Partial Success') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertTriangle className="w-3 h-3" /> Partial
          </span>
        );
      }
      if (status === 'Failed') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" /> Failed
          </span>
        );
      }
      if (status === 'Needs Review') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <AlertTriangle className="w-3 h-3" /> Review
          </span>
        );
      }
      if (status === 'Not Generated') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <span className="w-3 h-3 text-center">—</span> Ready
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing
        </span>
      );
    },
    sortable: true,
    filter: 'agTextColumnFilter',
    tooltipValueGetter: (params: any) => {
      const generationDate = getGenerationDate(params.data.id, selectedTemplate?.id || '');
      return generationDate ? `Last generated: ${formatDate(generationDate.toISOString())}` : 'Not generated yet';
    },
  };

  // Contract Actions column (only for Processed tab) - Using simple HTML instead of AG Grid cell renderer
  const contractActionsColumn = {
    headerName: 'Contract Actions',
    field: 'actions',
    width: 160,
    minWidth: 140,
    cellRenderer: (params: any) => {
      const provider = params.data;
      // Find any contract for this provider (including partial success ones)
      const contract = generatedContracts.find(
        c => c.providerId === provider.id
      );
      
      if (contract) {
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
            <div
              className={`${isPartialSuccess ? 'text-orange-600 hover:bg-orange-50' : 'text-blue-600 hover:bg-blue-50'} p-1 h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors cursor-pointer`}
              style={{ 
                pointerEvents: 'auto',
                zIndex: 9999,
                position: 'relative'
              }}
              title={isPartialSuccess ? "Download Contract (S3 storage failed)" : "Download Contract"}
              onMouseDown={() => downloadContract(provider, contract.templateId)}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
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
      }
      
      return (
        <span className="text-gray-400 text-sm">Not Generated</span>
      );
    },
    sortable: false,
    filter: false,
    resizable: false,
    pinned: null, // Explicitly set to null to prevent any pinning
  };

  // Comprehensive column definitions for all tabs - column manager will handle visibility
  const allPossibleColumns = useMemo(() => [
    ...baseColumns,
    generationStatusColumn,
    contractActionsColumn
  ], [baseColumns, generationStatusColumn, contractActionsColumn]);

  // Contextual column definitions based on current tab
  const agGridColumnDefs = useMemo(() => {
    // Always return all possible columns - let the column manager handle visibility
    // This ensures the column manager sees all columns regardless of tab
    return allPossibleColumns;
  }, [allPossibleColumns]);

  // Grid options and configuration
  const gridOptions = useMemo(() => ({
    domLayout: "normal" as const,
    suppressRowClickSelection: true, // Disable row click selection to prevent interference
    pagination: false,
    enableCellTextSelection: true,
    headerHeight: 44,
    rowHeight: 40,
    suppressDragLeaveHidesColumns: true,
    suppressScrollOnNewData: true,
    suppressColumnVirtualisation: true,
    suppressRowVirtualisation: false,
    suppressHorizontalScroll: false,
    maintainColumnOrder: true,
    suppressLoadingOverlay: false,
    suppressNoRowsOverlay: false,
    skipHeaderOnAutoSize: true,
    suppressColumnMoveAnimation: false,
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
    defaultColDef: { 
      tooltipValueGetter: (params: any) => params.value, 
      resizable: true, 
      sortable: true, 
      filter: true,
      menuTabs: ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'] as any,
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
  }), []);

  // Grid event handlers
  const onGridReady = (params: any) => {
    // Auto-size columns to fit content but respect max widths
    params.api.sizeColumnsToFit();
    
    // Force columns to fill the entire width
    setTimeout(() => {
      params.api.sizeColumnsToFit();
      // Force a second resize to ensure proper layout
      setTimeout(() => {
        params.api.sizeColumnsToFit();
      }, 50);
    }, 100);
  };

  const onRowDataUpdated = (params: any) => {
    setTimeout(() => {
      params.api.sizeColumnsToFit();
    }, 50);
  };

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