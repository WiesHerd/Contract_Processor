/// <reference types="react" />
import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, type ForwardedRef, type ReactElement } from 'react';
import Papa from 'papaparse';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Upload, Info } from 'lucide-react';
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
import { clsx } from 'clsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// JSX types are already provided by React 18+ TypeScript types

const client = generateClient();

// Extend Provider type to allow dynamic column access
interface ExtendedProvider extends Provider {
  [key: string]: any;
}

// Normalization utility: lowercase, remove spaces and underscores
function normalizeHeader(header: string): string {
  return header.replace(/\s|_/g, '').toLowerCase();
}

// Canonical provider field names and their possible CSV header variants
const providerFieldMap: Record<string, string[]> = {
  name: ['providername', 'provider name', 'employeename', 'name'],
  employeeId: ['employeeid', 'employee id'],
  providerType: ['providertype', 'provider type'],
  specialty: ['specialty'],
  subspecialty: ['subspecialty'],
  fte: ['fte'],
  administrativeFte: ['administrativefte', 'administrative fte'],
  administrativeRole: [
    'administrativerole', 'administrative role', 'positiontitle', 'position title'
  ],
  yearsExperience: ['yearsofexperience', 'years of experience'],
  hourlyWage: ['hourlywage', 'hourly wage'],
  baseSalary: ['basesalary', 'base salary', 'annualwage', 'annual wage'],
  originalAgreementDate: ['originalagreementdate', 'original agreement date'],
  organizationName: ['organizationname', 'organization name'],
  startDate: ['startdate', 'start date'],
  contractTerm: ['contractterm', 'contract term'],
  ptoDays: ['ptodays', 'pto days'],
  holidayDays: ['holidaydays', 'holiday days'],
  cmeDays: ['cmedays', 'cme days'],
  cmeAmount: ['cmeamount', 'cme amount'],
  signingBonus: ['signingbonus', 'signing bonus'],
  relocationBonus: ['relocationbonus', 'relocation bonus'],
  educationBonus: ['educationbonus', 'education bonus'],
  qualityBonus: ['qualitybonus', 'quality bonus'],
  compensationType: ['compensationtype', 'compensation type'],
  conversionFactor: ['conversionfactor', 'conversion factor'],
  wRVUTarget: ['wrvutarget', 'w rvutarget', 'w rvu target'],
  compensationYear: ['compensationyear', 'compensation year'],
  credentials: ['credentials'],
};

// Build a normalized lookup for fast header-to-field mapping
const normalizedFieldLookup: Record<string, string> = {};
Object.entries(providerFieldMap).forEach(([field, variants]) => {
  variants.forEach(variant => {
    normalizedFieldLookup[normalizeHeader(variant)] = field;
  });
});

// Utility to normalize date to YYYY-MM-DD
function parseDateToISO(value: string): string | undefined {
  if (!value || typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  // MM/DD/YYYY or M/D/YYYY
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  // YYYY-MM-DD
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  let match;
  if ((match = trimmed.match(mmddyyyy))) {
    const [, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if ((match = trimmed.match(yyyymmdd))) {
    return trimmed;
  }
  // If not recognized, return undefined
  return undefined;
}

export function mapCsvRowToProviderFields(row: Record<string, string>): Record<string, string | undefined> {
  const mapped: Record<string, string | undefined> = {};
  const dynamicFields: Record<string, string> = {};

  Object.entries(row).forEach(([csvKey, value]) => {
    const normKey = normalizeHeader(csvKey);
    const mappedField = normalizedFieldLookup[normKey];
    if (mappedField) {
      // For date fields, normalize to YYYY-MM-DD
      if (mappedField === 'originalAgreementDate' || mappedField === 'startDate') {
        mapped[mappedField] = parseDateToISO(value);
      } else {
        mapped[mappedField] = value;
      }
    } else {
      // Not a canonical field, treat as dynamic
      dynamicFields[csvKey] = value;
    }
  });

  // Attach dynamicFields if any
  if (Object.keys(dynamicFields).length > 0) {
    mapped.dynamicFields = JSON.stringify(dynamicFields);
  }

  return mapped;
}

interface ProviderManagerProps {
  providers: Provider[];
  loading: boolean;
  isSticky?: boolean;
  tableScrollRef: React.RefObject<HTMLDivElement>;
  availableYears?: number[];
  selectedYear?: number | null;
  onYearChange?: (year: number) => void;
}

interface BulkGenerationResult {
  providerId: string;
  providerName: string;
  success: boolean;
  error?: string;
  fileName?: string;
}

// Custom component for dual synced scrollbars
function DualHorizontalScrollbar({ scrollRef }: { scrollRef: React.RefObject<HTMLDivElement> }) {
  const topScrollbarRef = useRef<HTMLDivElement>(null);
  const [minWidth, setMinWidth] = React.useState(0);

  // Dynamically set minWidth to match the table's scrollWidth
  React.useEffect(() => {
    const updateWidth = () => {
      if (scrollRef.current) {
        setMinWidth(scrollRef.current.scrollWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [scrollRef]);

  // Sync scroll positions
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
    <div
      ref={topScrollbarRef}
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        height: 16,
        width: '100%',
      }}
    >
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
// Only format YYYY-MM-DD to MM/DD/YYYY, otherwise return as-is
function formatDate(value: any) {
  if (!value || typeof value !== 'string') return '';
  // Match YYYY-MM-DD
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return `${m}/${d}/${y}`;
  }
  return value;
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

function toFriendlyLabel(field: string) {
  return field
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase to words
    .replace(/_/g, ' ')
    .replace(/\bid\b/i, 'ID')
    .replace(/^./, s => s.toUpperCase());
}

const ProviderManager = forwardRef<HTMLDivElement, ProviderManagerProps>(
  function ProviderManager({ 
    providers: allProviders, 
    loading, 
    isSticky = true, 
    tableScrollRef,
    availableYears,
    selectedYear,
    onYearChange
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
    
    // Add hooks for edit modal that were previously inside the render function
    const [customFields, setCustomFields] = useState<Array<[string, string]>>([]);
    const [editErrors, setEditErrors] = useState<Record<string, string>>({});

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
      
      // Initialize custom fields from the provider's dynamicFields
      let dyn = providers[idx].dynamicFields;
      if (typeof dyn === 'string') {
        try { dyn = JSON.parse(dyn); } catch { dyn = {}; }
      }
      const coreFields = (uploadedColumns.length > 0 ? uploadedColumns : Object.keys(providers[idx])).filter(f => !['id', 'createdAt', 'updatedAt', '__typename', 'dynamicFields', 'templateTag'].includes(f));
      const customFieldsFromProvider = Object.entries(dyn || {}).filter(([key]) => !coreFields.map(f => f.toLowerCase()).includes(key.toLowerCase()));
      setCustomFields(customFieldsFromProvider);
      setEditErrors({});
      
      setEditModalOpen(true);
    }, [providers, uploadedColumns]);

    const handleEditChange = useCallback((key: string, value: string) => {
      if (!editRow) return;
      setEditRow({ ...editRow, [key]: value });
    }, [editRow]);

    const allowedFields = [
      'id', 'employeeId', 'name', 'providerType', 'specialty', 'subspecialty', 'fte', 'administrativeFte', 'administrativeRole', 'yearsExperience', 'hourlyWage', 'baseSalary', 'originalAgreementDate', 'organizationName', 'startDate', 'contractTerm', 'ptoDays', 'holidayDays', 'cmeDays', 'cmeAmount', 'signingBonus', 'educationBonus', 'qualityBonus', 'compensationType', 'conversionFactor', 'wRVUTarget', 'compensationYear', 'credentials', 'compensationModel', 'fteBreakdown', 'templateTag', 'dynamicFields', 'createdAt', 'updatedAt'
    ];

    const handleEditSave = useCallback(async () => {
      if (editIndex === null || !editRow) return;
      try {
        // Only send allowed fields
        const updatePayload: Record<string, any> = {};
        for (const key of allowedFields) {
          if (editRow[key] !== undefined) {
            // Always send dynamicFields as an object
            if (key === 'dynamicFields' && typeof editRow[key] === 'string') {
              try {
                updatePayload[key] = JSON.parse(editRow[key]);
              } catch {
                updatePayload[key] = {};
              }
            } else {
              updatePayload[key] = editRow[key];
            }
          }
        }
        await dispatch(updateProvider(updatePayload)).unwrap();
        setEditIndex(null);
        setEditRow(null);
        setEditModalOpen(false);
        setCustomFields([]);
        setEditErrors({});
      } catch (error) {
        // Error toast is already shown by the thunk
      }
    }, [editIndex, editRow, dispatch]);

    // Helper functions for edit modal
    const addCustomField = useCallback(() => {
      setCustomFields(prev => [...prev, ['', '']]);
    }, []);

    const removeCustomField = useCallback((idx: number) => {
      setCustomFields(prev => prev.filter((_, i) => i !== idx));
    }, []);

    const updateCustomField = useCallback((idx: number, key: string, value: string) => {
      setCustomFields(prev => {
        const updated = prev.map((f, i) => i === idx ? [key, value] : f);
        // Update editRow.dynamicFields as JSON string
        const obj = Object.fromEntries(updated.filter(([k]) => k));
        if (editRow) {
          setEditRow({ ...editRow, dynamicFields: obj });
        }
        return updated;
      });
    }, [editRow]);

    const updateCoreField = useCallback((col: string, value: string) => {
      handleEditChange(col, value);
    }, [handleEditChange]);

    const validateEditForm = useCallback(() => {
      if (!editRow) return false;
      const errs: Record<string, string> = {};
      const coreFields = (uploadedColumns.length > 0 ? uploadedColumns : Object.keys(editRow)).filter(f => !['id', 'createdAt', 'updatedAt', '__typename', 'dynamicFields', 'templateTag'].includes(f));
      coreFields.forEach(col => {
        if (!editRow[col] && col !== 'templateTag') errs[col] = 'Required';
      });
      setEditErrors(errs);
      return Object.keys(errs).length === 0;
    }, [editRow, uploadedColumns]);

    const handleEditSubmit = useCallback((e: React.FormEvent) => {
      e.preventDefault();
      if (!validateEditForm()) return;
      handleEditSave();
    }, [validateEditForm, handleEditSave]);

    // Dynamically find the credentials and specialty column names from uploadedColumns
    const credentialsCol = uploadedColumns.find(col => col.toLowerCase().includes('credential'));
    const specialtyCol = uploadedColumns.find(col => col.toLowerCase().includes('specialty') || col.toLowerCase().includes('positiontitle'));

    // Get unique credentials and specialties from the actual column in provider data
    const credentialOptions = React.useMemo(() => {
      const credentials = new Set<string>();
      providers.forEach((p) => {
        if (p.credentials) credentials.add(p.credentials);
      });
      return Array.from(credentials).sort();
    }, [providers]);

    const specialtyOptions = React.useMemo(() => {
      const specialties = new Set<string>();
      providers.forEach((p) => {
        if (p.specialty) specialties.add(p.specialty);
      });
      return Array.from(specialties).sort();
    }, [providers]);

    // Memoize filtered providers to prevent unnecessary recalculations
    const filteredProviders = useMemo(() => {
      return providers.filter(provider => {
        // Use dynamic column names for search/filter
        const providerNameValue = providerNameCol ? (provider[providerNameCol] || '') : (provider.name || '');

        const matchesSearch =
          String(search) === '' ||
          String(providerNameValue).toLowerCase().includes(String(search).toLowerCase()) ||
          (provider.credentials && String(provider.credentials).toLowerCase().includes(String(search).toLowerCase()));

        const fteValue = provider.fte ?? 0;
        const matchesFte = fteValue >= fteRange[0] && fteValue <= fteRange[1];

        // Always use normalized provider.credentials for filtering
        const matchesCredential =
          credential === '__all__' || provider.credentials === credential;

        // Always use normalized provider.specialty for filtering
        const matchesSpecialty =
          specialty === '__all__' || provider.specialty === specialty;

        return matchesSearch && matchesFte && matchesCredential && matchesSpecialty;
      });
    }, [providers, search, fteRange, credential, specialty, providerNameCol]);

    // Memoize unique values for filters
    const uniqueCredentials = useMemo(() => 
      Array.from(new Set(providers.map(p => p.credentials))).filter(Boolean),
      [providers]
    );

    // Only use uploadedColumns for table columns
    const columnDefs = React.useMemo<ColumnDef<ExtendedProvider, any>[]>(() => {
      // If uploadedColumns are present, use them as the only columns
      const baseColumns: ColumnDef<ExtendedProvider>[] = (uploadedColumns && uploadedColumns.length > 0) 
        ? uploadedColumns.map((col: string) => ({
            accessorKey: col,
            header: col,
            cell: (info: { getValue: () => any; row: any }) => {
              const val = info.getValue();
              // Format currency fields
              if (String(col).toLowerCase().includes('salary') || String(col).toLowerCase().includes('bonus') || String(col).toLowerCase().includes('amount') || String(col).toLowerCase().includes('wage')) {
                return formatCurrency(val);
              }
              // Format date fields
              if (String(col).toLowerCase().includes('date')) {
                return formatDate(val);
              }
              // Format FTE
              if (String(col).replace(/\s+/g, '').toLowerCase() === 'fte') {
                const fteValue = info.row.original.fte;
                return typeof fteValue === 'number' ? fteValue.toFixed(2) : String(fteValue ?? '');
              }
              return String(val || '');
            },
            enableSorting: true,
            size: 120,
            minSize: 80,
            maxSize: 400,
            enableResizing: true,
            pin: isSticky && col === uploadedColumns[0] ? 'left' : false,
          }))
        : defaultColumns;

      // Remove dynamic column generation and dynamic fields
      return [
        ...baseColumns,
        {
          id: 'actions',
          header: '',
          cell: ({ row }: { row: any }) => (
            <Button size="icon" variant="ghost" onClick={() => handleEdit(row.index)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ),
          enableSorting: false,
          size: 60,
        } as any
      ];
    }, [uploadedColumns, handleEdit, isSticky]);

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
                <SelectContent modal={false}>
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
                <SelectContent modal={false}>
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
        <div className="flex items-center mb-2">
          <div className="flex gap-2 items-center">
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
          {/* Year dropdown on the far right */}
          {availableYears && availableYears.length > 0 && (
            <div className="flex items-center gap-1 ml-auto">
              <label htmlFor="year-select" className="text-sm font-medium text-gray-700">Year:</label>
              <select
                id="year-select"
                value={selectedYear ?? ''}
                onChange={e => onYearChange && onYearChange(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm bg-white"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
        </div>
        {/* Top horizontal scrollbar synced with table */}
        <DualHorizontalScrollbar scrollRef={tableScrollRef} />
        {/* Virtualized table body */}
        <div ref={tableScrollRef} className="overflow-x-auto border rounded-b-lg w-full max-w-none min-h-[60vh]">
          <table className="w-full border-collapse relative">
            <thead className="sticky top-0 bg-white z-20">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <th
                      key={header.id}
                      className={clsx(
                        'p-2 border-b text-gray-700 font-semibold',
                        // Only apply sticky to first column (Name)
                        index === 0 && isSticky ? 'sticky left-0 z-30 bg-white shadow-md' : 'bg-gray-50'
                      )}
                      style={
                        index === 0 && isSticky
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
                  {row.getVisibleCells().map((cell, index) => (
                    <td
                      key={cell.id}
                      className={clsx(
                        'p-2 border-b font-medium text-gray-900',
                        // Only apply sticky to first column (Name)
                        index === 0 && isSticky ? 'sticky left-0 z-20 bg-white shadow-md' : ''
                      )}
                      style={
                        index === 0 && isSticky
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
          <DialogContent className="max-w-3xl w-full max-h-[90vh] p-0 animate-fade-in overflow-hidden">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-5 border-b bg-white">
              <DialogTitle className="text-2xl font-bold text-gray-900">Edit Provider</DialogTitle>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setEditModalOpen(false)}>
                <span className="sr-only">Close</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </Button>
            </div>
            {/* Modal Body */}
            {editRow && (
              <form onSubmit={handleEditSubmit} className="flex flex-col h-[90vh]">
                <div className="flex-1 overflow-y-auto px-8 pt-6 pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {/* Provider Info Section */}
                  <div className="text-xl font-semibold text-gray-800 mb-6">Provider Info</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                    {(() => {
                      const SYSTEM_FIELDS = ['id', 'createdAt', 'updatedAt', '__typename', 'dynamicFields', 'templateTag'];
                      const coreFields = (uploadedColumns.length > 0 ? uploadedColumns : Object.keys(editRow)).filter(f => !SYSTEM_FIELDS.includes(f));
                      return coreFields.map(col => (
                        <div key={col} className="space-y-1">
                          <label className="block text-base font-medium text-gray-700">{toFriendlyLabel(col)}</label>
                          <Input
                            type={col.toLowerCase().includes('date') ? 'date' : (col.toLowerCase().includes('fte') || col.toLowerCase().includes('salary') || col.toLowerCase().includes('bonus') || col.toLowerCase().includes('amount') || col.toLowerCase().includes('wage') ? 'number' : 'text')}
                            value={String(editRow[col] || '')}
                            onChange={e => updateCoreField(col, e.target.value)}
                            aria-label={toFriendlyLabel(col)}
                            required={col !== 'templateTag'}
                            className="w-full px-3 py-2 border rounded-md text-base focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
                          />
                          {editErrors[col] && <span className="text-xs text-red-500">{editErrors[col]}</span>}
                        </div>
                      ));
                    })()}
                  </div>
                  {/* Divider */}
                  <div className="my-8 border-t" />
                  {/* Custom Fields Section */}
                  <div className="text-lg font-semibold text-gray-800 mb-4 flex items-center">Custom Fields
                    <span className="ml-2 text-xs font-normal text-gray-500">(Add, remove, or rename extra fields as needed)</span>
                  </div>
                  <div className="space-y-2">
                    {customFields.map(([key, value], idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Input
                          className="w-1/3 px-3 py-2 text-base"
                          placeholder="Field Name"
                          value={key}
                          onChange={e => updateCustomField(idx, e.target.value, value)}
                          aria-label="Custom Field Name"
                        />
                        <Input
                          className="w-2/3 px-3 py-2 text-base"
                          placeholder="Value"
                          value={value}
                          onChange={e => updateCustomField(idx, key, e.target.value)}
                          aria-label="Custom Field Value"
                        />
                        <Button type="button" variant="destructive" size="sm" onClick={() => removeCustomField(idx)} aria-label="Remove Field">Remove</Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addCustomField} className="mt-2">Add Field</Button>
                  </div>
                </div>
                {/* Sticky Footer */}
                <div className="sticky bottom-0 left-0 right-0 bg-white pt-6 pb-4 px-8 min-h-[60px] flex justify-end gap-3 border-t z-10 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
                  <Button variant="outline" type="button" size="lg" className="px-6 py-2 text-base" onClick={() => setEditModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="lg" className="px-8 py-2 text-base font-semibold">
                    Save
                  </Button>
                </div>
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