/**
 * Dynamic Provider Grid Component
 * 
 * This component dynamically generates AG Grid columns based on the actual data
 * uploaded, eliminating the need for hardcoded column definitions and supporting
 * flexible schema evolution.
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, GridReadyEvent, CellClickedEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Pencil, Download, Filter, Eye, EyeOff } from 'lucide-react';
import { 
  PROVIDER_SCHEMA, 
  SYSTEM_FIELDS, 
  formatFieldValue, 
  getFieldConfig,
  type ProviderSchemaField 
} from '../config/providerSchema';
import type { ProviderData } from '../services/csvUploadService';

export interface DynamicProviderGridProps {
  providers: ProviderData[];
  selectedProviders: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onEditProvider?: (provider: ProviderData) => void;
  onExportData?: () => void;
  loading?: boolean;
  height?: string;
  enableSelection?: boolean;
  enableEdit?: boolean;
  enableExport?: boolean;
  pageSize?: number;
}

interface ColumnInfo {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  format?: string;
  hasData: boolean;
  dataCount: number;
  isSchemaField: boolean;
  config?: ProviderSchemaField;
}

/**
 * Core columns that should always be visible and pinned
 */
const CORE_COLUMNS = ['name', 'employeeId', 'compensationYear', 'specialty'];

/**
 * Columns that should be hidden by default
 */
const HIDDEN_COLUMNS = [...SYSTEM_FIELDS, '__typename'];

export const DynamicProviderGrid: React.FC<DynamicProviderGridProps> = ({
  providers,
  selectedProviders,
  onSelectionChange,
  onEditProvider,
  onExportData,
  loading = false,
  height = '600px',
  enableSelection = true,
  enableEdit = true,
  enableExport = true,
  pageSize = 50
}) => {
  const gridRef = useRef<AgGridReact>(null);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  
  /**
   * Analyze all providers to determine which columns have data
   */
  const columnAnalysis = useMemo((): ColumnInfo[] => {
    if (!providers || providers.length === 0) return [];
    
    const columnMap = new Map<string, ColumnInfo>();
    
    // Analyze each provider
    providers.forEach(provider => {
      Object.entries(provider).forEach(([key, value]) => {
        // Skip hidden columns
        if (HIDDEN_COLUMNS.includes(key)) return;
        
        if (!columnMap.has(key)) {
          const config = getFieldConfig(key);
          columnMap.set(key, {
            key,
            label: config?.label || formatColumnLabel(key),
            type: config?.type || inferType(value),
            format: config?.format,
            hasData: false,
            dataCount: 0,
            isSchemaField: !!config,
            config
          });
        }
        
        const columnInfo = columnMap.get(key)!;
        const hasValue = value !== null && value !== undefined && value !== '';
        
        if (hasValue) {
          columnInfo.hasData = true;
          columnInfo.dataCount++;
        }
      });
    });
    
    // Filter to only include columns with data and sort by importance
    return Array.from(columnMap.values())
      .filter(col => col.hasData)
      .sort((a, b) => {
        // Core columns first
        const aIsCore = CORE_COLUMNS.includes(a.key);
        const bIsCore = CORE_COLUMNS.includes(b.key);
        if (aIsCore && !bIsCore) return -1;
        if (!aIsCore && bIsCore) return 1;
        
        // Schema fields before dynamic fields
        if (a.isSchemaField && !b.isSchemaField) return -1;
        if (!a.isSchemaField && b.isSchemaField) return 1;
        
        // Sort by data density (percentage of providers with data)
        const aPercentage = a.dataCount / providers.length;
        const bPercentage = b.dataCount / providers.length;
        if (aPercentage !== bPercentage) return bPercentage - aPercentage;
        
        // Finally, alphabetical
        return a.label.localeCompare(b.label);
      });
  }, [providers]);
  
  /**
   * Generate AG Grid column definitions
   */
  const columnDefs = useMemo((): ColDef[] => {
    const columns: ColDef[] = [];
    
    // Selection column
    if (enableSelection) {
             columns.push({
         headerName: '',
         field: 'selection',
         width: 50,
         pinned: 'left',
         resizable: false,
         sortable: false,
         filter: false,
         checkboxSelection: true,
         headerCheckboxSelection: true,
         headerCheckboxSelectionFilteredOnly: true
       });
    }
    
    // Data columns
    columnAnalysis.forEach((columnInfo, index) => {
      const isCore = CORE_COLUMNS.includes(columnInfo.key);
      const isVisible = columnVisibility[columnInfo.key] !== false;
      
      const colDef: ColDef = {
        field: columnInfo.key,
        headerName: columnInfo.label,
        sortable: true,
        filter: true,
        resizable: true,
        minWidth: isCore ? 150 : 120,
        pinned: isCore && index < 2 ? 'left' : undefined,
        hide: !isVisible,
        
                 // Custom value formatter based on field type and format
         valueFormatter: (params: any) => {
           if (params.value === null || params.value === undefined || params.value === '') {
             return '';
           }
           
           if (columnInfo.config) {
             return formatFieldValue(columnInfo.key, params.value);
           }
           
           // Default formatting for dynamic fields
           return formatDynamicValue(params.value, columnInfo.type);
         },
         
         // Custom cell renderer for special cases
         cellRenderer: (params: any) => {
          const value = params.value;
          
          if (value === null || value === undefined || value === '') {
            return '<span class="text-gray-400">—</span>';
          }
          
          // Render badges for certain field types
          if (columnInfo.key === 'compensationYear') {
            return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">${value}</span>`;
          }
          
          if (columnInfo.key === 'providerType') {
            return `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">${value}</span>`;
          }
          
          return params.valueFormatted || value;
        },
        
                 // Add tooltip
         tooltipField: columnInfo.key,
         
         // Add column metadata for context menu
         headerComponentParams: {
           columnInfo
         }
      };
      
      columns.push(colDef);
    });
    
         // Actions column
     if (enableEdit && onEditProvider) {
       columns.push({
         headerName: '',
         field: 'actions',
         width: 80,
         pinned: 'right',
         resizable: false,
         sortable: false,
         filter: false,
         cellRenderer: (params: any) => {
           return `<button class="ag-button-edit" data-provider-id="${params.data.id}" title="Edit Provider">
             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
               <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
             </svg>
           </button>`;
         }
       });
     }
    
    return columns;
  }, [columnAnalysis, columnVisibility, enableSelection, enableEdit, onEditProvider]);
  
  /**
   * Handle cell click events
   */
  const onCellClicked = useCallback((event: CellClickedEvent) => {
    // Handle edit button clicks
    if (event.event?.target && (event.event.target as HTMLElement).closest('.ag-button-edit')) {
      const providerId = (event.event.target as HTMLElement).closest('.ag-button-edit')?.getAttribute('data-provider-id');
      if (providerId && onEditProvider) {
        const provider = providers.find(p => p.id === providerId);
        if (provider) {
          onEditProvider(provider);
        }
      }
    }
  }, [providers, onEditProvider]);
  
  /**
   * Handle selection changes
   */
  const onSelectionChanged = useCallback(() => {
    if (!gridRef.current) return;
    
    const selectedNodes = gridRef.current.api.getSelectedNodes();
    const selectedIds = selectedNodes.map(node => node.data.id);
    onSelectionChange(selectedIds);
  }, [onSelectionChange]);
  
  /**
   * Toggle column visibility
   */
  const toggleColumnVisibility = useCallback((columnKey: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [columnKey]: !(prev[columnKey] !== false)
    }));
  }, []);
  
  /**
   * Export data to CSV
   */
  const handleExport = useCallback(() => {
    if (gridRef.current && onExportData) {
      gridRef.current.api.exportDataAsCsv({
        fileName: `providers-${new Date().toISOString().split('T')[0]}.csv`,
        columnSeparator: ',',
        suppressQuotes: false
      });
    }
  }, [onExportData]);
  
  /**
   * Auto-size all columns
   */
  const autoSizeColumns = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.api.autoSizeAllColumns();
    }
  }, []);
  
  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {providers.length} providers
          </Badge>
          <Badge variant="outline">
            {columnAnalysis.length} columns
          </Badge>
          {selectedProviders.length > 0 && (
            <Badge variant="default">
              {selectedProviders.length} selected
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={autoSizeColumns}
            title="Auto-size columns"
          >
            <Filter className="h-4 w-4" />
          </Button>
          
          {enableExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              title="Export to CSV"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Column visibility controls */}
      <div className="flex flex-wrap gap-2">
        {columnAnalysis.slice(0, 10).map(column => (
          <Button
            key={column.key}
            variant={columnVisibility[column.key] !== false ? "default" : "outline"}
            size="sm"
            onClick={() => toggleColumnVisibility(column.key)}
            className="text-xs"
          >
            {columnVisibility[column.key] !== false ? (
              <Eye className="h-3 w-3 mr-1" />
            ) : (
              <EyeOff className="h-3 w-3 mr-1" />
            )}
            {column.label}
          </Button>
        ))}
      </div>
      
      {/* Grid */}
      <div className="ag-theme-alpine" style={{ height, width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={providers}
          columnDefs={columnDefs}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
            cellStyle: { 
              fontSize: '14px', 
              fontFamily: 'var(--font-sans, sans-serif)',
              display: 'flex',
              alignItems: 'center'
            }
          }}
          rowSelection={enableSelection ? 'multiple' : undefined}
          suppressRowClickSelection={true}
          pagination={true}
          paginationPageSize={pageSize}
          enableCellTextSelection={true}
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
          onCellClicked={onCellClicked}
          onSelectionChanged={onSelectionChanged}
          loadingOverlayComponent="Loading..."
          noRowsOverlayComponent="No providers to display"
          animateRows={true}
          enableRangeSelection={true}
          suppressMovableColumns={false}
          suppressDragLeaveHidesColumns={true}
          headerHeight={40}
          rowHeight={36}
        />
      </div>
      
      {/* Summary */}
      <div className="text-sm text-gray-600">
        Showing {Math.min(pageSize, providers.length)} of {providers.length} providers
        {selectedProviders.length > 0 && ` • ${selectedProviders.length} selected`}
      </div>
    </div>
  );
};

/**
 * Utility functions
 */

function formatColumnLabel(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to words
    .replace(/_/g, ' ')
    .replace(/\bid\b/i, 'ID')
    .replace(/\bfte\b/i, 'FTE')
    .replace(/\bcme\b/i, 'CME')
    .replace(/\bpto\b/i, 'PTO')
    .replace(/^./, s => s.toUpperCase());
}

function inferType(value: any): 'string' | 'number' | 'boolean' | 'date' {
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    // Check if it looks like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
    // Check if it's a number string
    if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
  }
  return 'string';
}

function formatDynamicValue(value: any, type: string): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  
  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? String(value) : num.toLocaleString();
    
    case 'date':
      const date = new Date(value);
      return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
    
    case 'boolean':
      return value ? 'Yes' : 'No';
    
    default:
      return String(value);
  }
} 