/// <reference types="react" />
import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, type ForwardedRef, type ReactElement } from 'react';
import Papa from 'papaparse';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Upload } from 'lucide-react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnPinningState,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFacetedMinMaxValues,
  ColumnFiltersState,
  VisibilityState,
} from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RootState } from '@/store';
import { updateProvider, setUploadedColumns, addProvidersFromCSV } from '@/store/slices/providerSlice';
import { Provider } from '@/types/provider';
import localforage from 'localforage';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { generateClient } from 'aws-amplify/api';
import { createProvider } from '@/graphql/mutations';
import { v4 as uuidv4 } from 'uuid';
import type { ButtonProps } from '@/components/ui/button';
import type { LucideProps } from 'lucide-react';
import { parseDynamicFields, getAllProviderFieldNames, getProviderFieldValue } from '@/utils/dynamicFields';

// JSX types are already provided by React 18+ TypeScript types

const client = generateClient();

// Extend Provider type to allow dynamic column access
interface ExtendedProvider extends Provider {
  [key: string]: any;
}

// CSV header to internal field mapping
const csvToProviderFieldMap: Record<string, string> = {
  'Provider Name': 'name',
  'Employee ID': 'employeeId',
  Credentials: 'credentials',
  'Provider Type': 'providerType',
  Specialty: 'specialty',
  Subspecialty: 'subspecialty',
  'Position Title': 'specialty',
  FTE: 'fte',
  'Administrative FTE': 'administrativeFte',
  'Administrative Role': 'administrativeRole',
  'Years of Experience': 'yearsExperience',
  'Hourly Wage': 'hourlyWage',
  'Base Salary': 'baseSalary',
  'Annual Wage': 'baseSalary',
  'Original Agreement Date': 'originalAgreementDate',
  'Organization Name': 'organizationName',
  'Start Date': 'startDate',
  'Contract Term': 'contractTerm',
  'PTO Days': 'ptoDays',
  'Holiday Days': 'holidayDays',
  'CME Days': 'cmeDays',
  'CME Amount': 'cmeAmount',
  'Signing Bonus': 'signingBonus',
  'Education Bonus': 'educationBonus',
  'Relocation Bonus': 'relocationBonus',
  'Quality Bonus': 'qualityBonus',
  'Compensation Type': 'compensationType',
  'Conversion Factor': 'conversionFactor',
  'wRVU Target': 'wRVUTarget',
  'Compensation Year': 'compensationYear',
};

export function mapCsvRowToProviderFields(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = { ...row }; // preserve all original columns

  // Always set normalized fields from the most likely CSV columns
  mapped.name = row['Provider Name'] || row['Employee Name'] || row.name || '';
  mapped.employeeId = row['Employee ID'] || row.employeeId || '';
  mapped.specialty = row['Specialty'] || row['PositionTitle'] || row.specialty || '';
  mapped.credentials = row['Credentials'] || row.credentials || '';
  mapped.startDate = row['Start Date'] || row.startDate || '';
  mapped.fte = row['FTE'] || row.fte || '';
  mapped.baseSalary = row['Base Salary'] || row['Annual Wage'] || row.baseSalary || '';
  // Add more as needed for your normalized fields

  // Existing dynamic mapping logic (case-insensitive)
  Object.entries(row).forEach(([csvKey, value]) => {
    // Case-insensitive mapping
    const lowerKey = String(csvKey).toLowerCase();
    const mappedKey =
      Object.keys(csvToProviderFieldMap).find(
        k => String(k).toLowerCase() === lowerKey
      )
        ? csvToProviderFieldMap[
            Object.keys(csvToProviderFieldMap).find(
              k => String(k).toLowerCase() === lowerKey
            )!
          ]
        : null;
    if (mappedKey) {
      mapped[mappedKey] = value;
    }
  });
  return mapped;
}

interface ProviderManagerProps {
  providers: Provider[];
  loading: boolean;
  isSticky?: boolean;
  tableScrollRef: React.RefObject<HTMLDivElement>;
}

interface BulkGenerationResult {
  providerId: string;
  providerName: string;
  success: boolean;
  error?: string;
  fileName?: string;
}

// Custom component for dual synced scrollbars
function DualHorizontalScrollbar({ scrollRef, minWidth }: { scrollRef: React.RefObject<HTMLDivElement>, minWidth: number }) {
  const topScrollbarRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const top = topScrollbarRef.current;
    const real = scrollRef.current;
    if (!top || !real) return;
    let isSyncing = false;
    const handleTopScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      real.scrollLeft = top.scrollLeft;
      isSyncing = false;
    };
    const handleRealScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      top.scrollLeft = real.scrollLeft;
      isSyncing = false;
    };
    top.addEventListener('scroll', handleTopScroll);
    real.addEventListener('scroll', handleRealScroll);
    return () => {
      top.removeEventListener('scroll', handleTopScroll);
      real.removeEventListener('scroll', handleRealScroll);
    };
  }, [scrollRef]);
  return (
    <div className="overflow-x-auto w-full" ref={topScrollbarRef} style={{ maxWidth: '100vw' }}>
      <div style={{ minWidth, height: 1 }} />
    </div>
  );
}

// Utility functions for formatting
function formatCurrency(value: any) {
  const num = Number(String(value).replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
function formatNumber(value: any) {
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US');
}
function formatDate(value: any) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US');
}

// Helper function to format as USD
function formatUSD(value: string | number) {
  const num = Number(value);
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

const defaultColumns: ColumnDef<ExtendedProvider>[] = [
  { accessorKey: 'name', header: 'Provider Name' },
  { accessorKey: 'employeeId', header: 'Employee ID' },
  { accessorKey: 'providerType', header: 'Provider Type' },
  { accessorKey: 'specialty', header: 'Specialty' },
  { accessorKey: 'subspecialty', header: 'Subspecialty' },
  { accessorKey: 'fte', header: 'FTE' },
  { accessorKey: 'baseSalary', header: 'Base Salary', cell: info => formatCurrency(info.getValue()) },
  { accessorKey: 'startDate', header: 'Start Date', cell: info => formatDate(info.getValue()) },
  { accessorKey: 'administrativeFte', header: 'Admin FTE' },
  { accessorKey: 'administrativeRole', header: 'Admin Role' },
  { accessorKey: 'yearsExperience', header: 'Years Exp' },
  { accessorKey: 'hourlyWage', header: 'Hourly Wage', cell: info => formatCurrency(info.getValue()) },
  { accessorKey: 'originalAgreementDate', header: 'Orig Agreement', cell: info => formatDate(info.getValue()) },
  { accessorKey: 'contractTerm', header: 'Contract Term' },
  { accessorKey: 'ptoDays', header: 'PTO Days' },
  { accessorKey: 'cmeDays', header: 'CME Days' },
  { accessorKey: 'cmeAmount', header: 'CME Amount', cell: info => formatCurrency(info.getValue()) },
  { accessorKey: 'signingBonus', header: 'Signing Bonus', cell: info => formatCurrency(info.getValue()) },
  { accessorKey: 'qualityBonus', header: 'Quality Bonus', cell: info => formatCurrency(info.getValue()) },
  { accessorKey: 'wRVUTarget', header: 'wRVU Target' },
  { accessorKey: 'conversionFactor', header: 'CF' },
];

// Generate dynamic columns based on available data
function generateDynamicColumns(providers: ExtendedProvider[]): ColumnDef<ExtendedProvider>[] {
  if (providers.length === 0) return [];

  // Get all unique field names from all providers
  const allFieldNames = new Set<string>();
  
  providers.forEach(provider => {
    const fieldNames = getAllProviderFieldNames(provider);
    fieldNames.forEach(field => allFieldNames.add(field));
  });

  // Filter out schema fields that are already defined
  const schemaFields = [
    'id', 'name', 'employeeId', 'providerType', 'specialty', 'subspecialty', 
    'fte', 'baseSalary', 'startDate', 'administrativeFte', 'administrativeRole',
    'yearsExperience', 'hourlyWage', 'originalAgreementDate', 'organizationName',
    'contractTerm', 'ptoDays', 'holidayDays', 'cmeDays', 'cmeAmount', 'signingBonus',
    'educationBonus', 'qualityBonus', 'compensationType', 'conversionFactor',
    'wRVUTarget', 'compensationYear', 'credentials', 'compensationModel',
    'fteBreakdown', 'templateTag', 'dynamicFields', 'createdAt', 'updatedAt'
  ];

  const dynamicFieldNames = Array.from(allFieldNames).filter(field => !schemaFields.includes(field));

  // Create column definitions for dynamic fields
  return dynamicFieldNames.map(fieldName => ({
    accessorKey: fieldName,
    header: fieldName,
    cell: info => {
      const value = getProviderFieldValue(info.row.original, fieldName);
      if (value === null || value === undefined) return '';
      
      // Format based on value type
      if (typeof value === 'number') {
        if (fieldName.toLowerCase().includes('salary') || fieldName.toLowerCase().includes('bonus') || fieldName.toLowerCase().includes('amount')) {
          return formatCurrency(value);
        }
        return formatNumber(value);
      }
      
      if (fieldName.toLowerCase().includes('date')) {
        return formatDate(value);
      }
      
      return String(value);
    }
  }));
}

const ProviderManager = forwardRef<HTMLDivElement, ProviderManagerProps>(
  function ProviderManager({ 
    providers: allProviders, 
    loading, 
    isSticky = true, 
    tableScrollRef 
  }, ref): ReactElement {
    const dispatch = useDispatch();
    const { 
      uploadedColumns = [], 
      error 
    } = useSelector((state: RootState) => state.provider);
    
    const providers = useMemo(() => allProviders as ExtendedProvider[], [allProviders]);

    const [search, setSearch] = useState('');
    const [editIndex, setEditIndex] = useState<number | null>(null);
    const [editRow, setEditRow] = useState<ExtendedProvider | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [globalFilter, setGlobalFilter] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showBulkGenerationModal, setShowBulkGenerationModal] = useState(false);
    const [bulkGenerationResults, setBulkGenerationResults] = useState<BulkGenerationResult[]>([]);
    const [fteRange, setFteRange] = useState<[number, number]>([0, 1]);
    const [credential, setCredential] = useState('__all__');
    const [specialty, setSpecialty] = useState('__all__');
    const [pageSize, setPageSize] = useState(25);
    const [pageIndex, setPageIndex] = useState(0);
    const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: [] });
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [rowSelection, setRowSelection] = useState({});

    // Find provider name column
    const providerNameCol = useMemo(() => 
      uploadedColumns.find(col => col.toLowerCase().includes('provider name')),
      [uploadedColumns]
    );

    // Update column pinning when sticky state changes
    useEffect(() => {
      if (isSticky && providerNameCol) {
        setColumnPinning({ left: [providerNameCol] });
      } else {
        setColumnPinning({ left: [] });
      }
    }, [isSticky, providerNameCol]);

    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results: Papa.ParseResult<Record<string, string>>) => {
          // Map CSV fields to internal fields for provider data
          const mappedData = results.data.map(mapCsvRowToProviderFields);
          // Store original CSV headers (fields) for mapping UI
          const cols = results.meta.fields || [];
          dispatch(setUploadedColumns(cols));
          dispatch(addProvidersFromCSV(mappedData as any[]));

          // Save each provider to AppSync (DynamoDB)
          for (const provider of mappedData) {
            try {
              // Only send required fields for the mutation
              const input = {
                name: provider.name || '',
                specialty: provider.specialty || '',
                fte: provider.fte ? parseFloat(provider.fte) : undefined,
                baseSalary: provider.baseSalary ? parseFloat(provider.baseSalary) : undefined,
                startDate: provider.startDate || '',
                contractTerm: provider.contractTerm || '',
              };
              await client.graphql({ query: createProvider, variables: { input } });
            } catch (err) {
              console.error('Failed to save provider to AppSync:', err);
            }
          }
        },
        error: (error) => {
          console.error('Failed to parse file:', error);
          alert('Failed to parse file. Please upload a valid CSV.');
        },
      });
    }, [dispatch]);

    const handleEdit = useCallback((idx: number) => {
      setEditIndex(idx);
      setEditRow({ ...providers[idx] });
      setEditModalOpen(true);
    }, [providers]);

    const handleEditChange = useCallback((key: string, value: string) => {
      if (!editRow) return;
      setEditRow({ ...editRow, [key]: value });
    }, [editRow]);

    const handleEditSave = useCallback(() => {
      if (editIndex === null || !editRow) return;
      dispatch(updateProvider(editRow));
      setEditIndex(null);
      setEditRow(null);
      setEditModalOpen(false);
    }, [editIndex, editRow, dispatch]);

    // Dynamically find the credentials and specialty column names from uploadedColumns
    const credentialsCol = uploadedColumns.find(col => col.toLowerCase().includes('credential'));
    const specialtyCol = uploadedColumns.find(col => col.toLowerCase().includes('specialty') || col.toLowerCase().includes('positiontitle'));

    // Get unique credentials and specialties from the actual column in provider data
    const credentialOptions = credentialsCol
      ? Array.from(new Set(providers.map(p => String(p[credentialsCol] ?? '').trim()).filter(v => v)))
      : [];
    const specialtyOptions = specialtyCol
      ? Array.from(new Set(providers.map(p => String(p[specialtyCol] ?? '').trim()).filter(v => v)))
      : [];

    // Memoize filtered providers to prevent unnecessary recalculations
    const filteredProviders = useMemo(() => {
      return providers.filter(provider => {
        // Use dynamic column names for search/filter
        const providerNameValue = providerNameCol ? (provider[providerNameCol] || '') : (provider.name || '');
        const credentialsValue = credentialsCol ? (provider[credentialsCol] || '') : (provider.credentials || '');
        const specialtyValue = specialtyCol ? (provider[specialtyCol] || '') : (provider.specialty || '');

        const matchesSearch =
          String(search) === '' ||
          String(providerNameValue).toLowerCase().includes(String(search).toLowerCase()) ||
          (credentialsValue && String(credentialsValue).toLowerCase().includes(String(search).toLowerCase()));

        const fteValue = provider.fte ?? 0;
        const matchesFte = fteValue >= fteRange[0] && fteValue <= fteRange[1];

        const matchesCredential =
          credential === '__all__' || String(credentialsValue) === credential;

        const matchesSpecialty =
          specialty === '__all__' || String(specialtyValue) === specialty;

        return matchesSearch && matchesFte && matchesCredential && matchesSpecialty;
      });
    }, [providers, search, fteRange, credential, specialty, providerNameCol, credentialsCol, specialtyCol]);

    // Memoize unique values for filters
    const uniqueCredentials = useMemo(() => 
      Array.from(new Set(providers.map(p => p.credentials))).filter(Boolean),
      [providers]
    );

    const uniqueSpecialties = useMemo(() => 
      Array.from(new Set(providers.map(p => p.specialty))).filter(Boolean),
      [providers]
    );

    // TanStack Table column definitions
    const columnDefs = React.useMemo<ColumnDef<ExtendedProvider, any>[]>(() => {
      const baseColumns: ColumnDef<ExtendedProvider>[] = (uploadedColumns && uploadedColumns.length > 0) 
        ? uploadedColumns.map((col: string) => ({ accessorKey: col, header: col })) 
        : defaultColumns;

      const dynamicColumns = baseColumns.map((colDef) => {
        const key = (colDef as any).accessorKey as string;
        const header = (colDef as any).header as string;

        return {
          ...colDef,
          accessorKey: key,
          header: header,
          cell: (info: { getValue: () => any; row: any }) => {
            if ((colDef as any).cell) {
              return ((colDef as any).cell as Function)(info);
            }

            const val = info.getValue();
            const normalized = String(key).replace(/\s+/g, '').toLowerCase();

            if (['hourlywage', 'annualwage', 'cmeamount', 'baseSalary'].includes(normalized)) {
              return formatCurrency(val);
            }
            if (['startdate', 'originalagreementdate'].includes(normalized)) {
              return formatDate(val);
            }
            if (normalized === 'fte') {
              const fteValue = info.row.original.fte;
              return typeof fteValue === 'number' ? fteValue.toFixed(2) : String(fteValue ?? '');
            }
            return String(val || '');
          },
          enableSorting: true,
          size: providerNameCol && key === providerNameCol ? 220 : 120,
          minSize: providerNameCol && key === providerNameCol ? 180 : 80,
          maxSize: 400,
          enableResizing: true,
          pin: isSticky && providerNameCol && key === providerNameCol ? 'left' : false,
        };
      });

      // Add dynamic fields from JSON data
      const dynamicFieldColumns = generateDynamicColumns(providers);

      return [...dynamicColumns, ...dynamicFieldColumns, {
        id: 'actions',
        header: '',
        cell: ({ row }: { row: any }) => (
          <Button size="icon" variant="ghost" onClick={() => handleEdit(row.index)}>
            <Pencil className="h-4 w-4" />
          </Button>
        ),
        enableSorting: false,
        size: 60,
      } as any];
    }, [uploadedColumns, handleEdit, providerNameCol, isSticky, providers]);

    const table = useReactTable({
      data: filteredProviders,
      columns: columnDefs,
      state: { 
        sorting, 
        columnPinning,
        pagination: {
          pageIndex,
          pageSize,
        },
      },
      onSortingChange: setSorting,
      onColumnPinningChange: setColumnPinning,
      onPaginationChange: (updater) => {
        if (typeof updater === 'function') {
          const newState = updater({ pageIndex, pageSize });
          setPageIndex(newState.pageIndex);
          setPageSize(newState.pageSize);
        }
      },
      getCoreRowModel: getCoreRowModel(),
      getSortedRowModel: getSortedRowModel(),
      getFilteredRowModel: getFilteredRowModel(),
      getPaginationRowModel: getPaginationRowModel(),
      debugTable: false,
      enableColumnResizing: true,
      columnResizeMode: 'onChange',
    });

    // Handler to ensure thumbs never cross
    const handleFteRangeChange = (v: number[]) => {
      if (v.length === 1) {
        setFteRange([v[0], v[0]]);
      } else if (v.length === 2) {
        // Prevent thumbs from crossing
        const min = Math.min(v[0], v[1]);
        const max = Math.max(v[0], v[1]);
        setFteRange([min, max]);
      }
    };

    // Calculate total pages for pagination
    const totalPages = Math.ceil(filteredProviders.length / pageSize);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400 text-lg">Loading provider data...</div>
      );
    }

    if (providers.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-lg">
          No provider data found.<br />
          Please upload a CSV to get started.
        </div>
      );
    }

    return (
      <div className="space-y-4 px-4 pt-4 pb-2">
        {/* Filters header and controls in a single card-style container */}
        <div className="bg-slate-50 p-4 rounded-md shadow-sm mb-2">
          <span className="mb-1 font-medium text-gray-700">Filter Providers</span>
          <div className="flex flex-nowrap gap-4 items-end mt-2">
            {/* Search Input */}
            <div className="flex flex-col basis-1/4 min-w-[180px]">
              <label className="text-sm font-medium text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Search providers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            {/* FTE Slider */}
            <div className="flex flex-col basis-1/4 min-w-[180px]">
              <label className="text-sm font-medium text-gray-700 mb-1">FTE Range</label>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={fteRange}
                onValueChange={handleFteRangeChange}
                className="w-full"
              />
              <span className="text-xs mt-1">{fteRange[0].toFixed(2)} – {fteRange[1].toFixed(2)}</span>
            </div>
            {/* Credentials dropdown */}
            <div className="flex flex-col basis-1/4 min-w-[180px]">
              <label htmlFor="credential-select" className="text-sm font-medium text-gray-700 mb-1">Credentials</label>
              <Select value={credential} onValueChange={setCredential}>
                <SelectTrigger id="credential-select" className="w-full">
                  <SelectValue placeholder="All Credentials" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Credentials</SelectItem>
                  {credentialOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Specialty dropdown */}
            <div className="flex flex-col basis-1/4 min-w-[180px]">
              <label htmlFor="specialty-select" className="text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger id="specialty-select" className="w-full">
                  <SelectValue placeholder="All Specialties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Specialties</SelectItem>
                  {specialtyOptions.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {/* Pagination Controls above the table */}
        <div className="flex gap-2 items-center mb-2">
          <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
          <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
          <span className="text-sm">Page {pageIndex + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
          <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
          <select
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
        {/* Top horizontal scrollbar synced with table */}
        <DualHorizontalScrollbar scrollRef={tableScrollRef} minWidth={uploadedColumns.length * 120} />
        {/* Virtualized table body */}
        <div ref={tableScrollRef} className="overflow-x-auto border rounded-b-lg w-full max-w-none min-h-[60vh]">
          <table className="w-full border-collapse relative">
            <thead className="sticky top-0 bg-white z-20">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th
                      key={header.id}
                      className={`border-b p-2 text-left font-semibold bg-gray-50 ${
                        isSticky && header.column.id === providerNameCol ? 'sticky left-0' : ''
                      }`}
                      style={
                        isSticky && header.column.id === providerNameCol
                          ? {
                              position: 'sticky',
                              left: 0,
                              zIndex: 30,
                              background: 'white',
                              boxShadow: '2px 0 4px -2px rgba(0,0,0,0.15)'
                            }
                          : {}
                      }
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={`border-b p-2 ${
                        isSticky && cell.column.id === providerNameCol ? 'sticky left-0' : ''
                      }`}
                      style={
                        isSticky && cell.column.id === providerNameCol
                          ? {
                              position: 'sticky',
                              left: 0,
                              zIndex: 20,
                              background: 'white',
                              boxShadow: '2px 0 4px -2px rgba(0,0,0,0.15)'
                            }
                          : {}
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Controls below the table (optional, for long tables) */}
        <div className="flex gap-2 items-center mt-2">
          <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
          <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
          <span className="text-sm">Page {pageIndex + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
          <Button variant="outline" size="sm" disabled={pageIndex >= totalPages - 1} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
          <select
            className="ml-2 border rounded px-2 py-1 text-sm"
            value={pageSize}
            onChange={e => {
              setPageSize(Number(e.target.value));
              setPageIndex(0);
            }}
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>{size} / page</option>
            ))}
          </select>
        </div>
        {/* Pagination info below table */}
        <div className="text-sm text-gray-600 mt-2">
          Showing {pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, filteredProviders.length)} of {filteredProviders.length} providers
        </div>
        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Provider</DialogTitle>
            </DialogHeader>
            {editRow && (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleEditSave();
                }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {uploadedColumns.map(col => (
                  <div key={col} className="space-y-1">
                    <label className="block text-sm font-medium text-gray-700">{col}</label>
                    <Input
                      value={String(editRow[col] || '')}
                      onChange={e => handleEditChange(col, e.target.value)}
                    />
                  </div>
                ))}
                <DialogFooter className="col-span-full flex justify-end gap-2 pt-2">
                  <Button variant="outline" type="button" onClick={() => setEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }
);

ProviderManager.displayName = 'ProviderManager';

export default ProviderManager; 