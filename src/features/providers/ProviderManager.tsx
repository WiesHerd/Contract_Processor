/// <reference types="react" />
import React, { useRef, useState, useEffect, useCallback, useMemo, forwardRef, type ForwardedRef, type ReactElement, useLayoutEffect } from 'react';
import Papa from 'papaparse';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Upload, Info, ChevronDown, ChevronRight } from 'lucide-react';
import {
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
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { ModuleRegistry } from 'ag-grid-community';
import { ClientSideRowModelModule } from 'ag-grid-community';
import { RowSelectionModule } from 'ag-grid-community';
import { PaginationModule } from 'ag-grid-community';
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  RowSelectionModule,
  PaginationModule,
]);

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

const ProviderManager: React.FC<ProviderManagerProps> = ({
  providers: allProviders,
  loading,
  availableYears,
  selectedYear,
  onYearChange
}) => {
  // Move all hooks to the top
  const dispatch = useDispatch();
  const { uploadedColumns = [], error } = useSelector((state: RootState) => state.provider);
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
  const [customFields, setCustomFields] = useState<Array<[string, string]>>([]);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [filtersOpen, setFiltersOpen] = useState(true);
  const gridRef = useRef<any>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [gridScrollWidth, setGridScrollWidth] = useState(0);
  const [gridClientWidth, setGridClientWidth] = useState(0);
  const [adminRole, setAdminRole] = useState('__all__');
  const [subspecialty, setSubspecialty] = useState('__all__');
  const [agreementDateFrom, setAgreementDateFrom] = useState('');
  const [agreementDateTo, setAgreementDateTo] = useState('');

  // Find provider name column
  const providerNameCol = useMemo(() => 
    uploadedColumns.find(col => col.toLowerCase().includes('provider name')),
    [uploadedColumns]
  );

  // Update column pinning when sticky state changes
  useEffect(() => {
    if (providerNameCol) {
      setColumnPinning({ left: [providerNameCol] });
    } else {
      setColumnPinning({ left: [] });
    }
  }, [providerNameCol]);

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
          // Always send dynamicFields as a string
          if (key === 'dynamicFields') {
            if (typeof editRow[key] === 'string') {
              updatePayload[key] = editRow[key];
            } else if (editRow[key] && typeof editRow[key] === 'object') {
              updatePayload[key] = JSON.stringify(editRow[key]);
            } else {
              updatePayload[key] = null;
            }
          } else {
            updatePayload[key] = editRow[key];
          }
        }
      }
      await dispatch(updateProvider(updatePayload as Provider)).unwrap();
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
      const updated: [string, string][] = prev.map((f, i) => i === idx ? [key, value] : f);
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

  // Compute unique admin roles from provider data
  const adminRoleOptions = React.useMemo(() => {
    const roles = new Set<string>();
    providers.forEach((p) => {
      if (p.administrativeRole) roles.add(p.administrativeRole);
    });
    return Array.from(roles).sort();
  }, [providers]);

  // Compute unique subspecialties from provider data
  const subspecialtyOptions = React.useMemo(() => {
    const subs = new Set<string>();
    providers.forEach((p) => {
      if (p.subspecialty) subs.add(p.subspecialty);
    });
    return Array.from(subs).sort();
  }, [providers]);

  // Update filteredProviders to include subspecialty and agreement date range
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

      // Always use normalized provider.administrativeRole for filtering
      const matchesAdminRole = adminRole === '__all__' || provider.administrativeRole === adminRole;

      let matchesSubspecialty = true;
      if (subspecialty !== '__all__') {
        matchesSubspecialty = provider.subspecialty === subspecialty;
      }

      let matchesAgreementDate = true;
      if (agreementDateFrom) {
        matchesAgreementDate = provider.originalAgreementDate && provider.originalAgreementDate >= agreementDateFrom;
      }
      if (matchesAgreementDate && agreementDateTo) {
        matchesAgreementDate = provider.originalAgreementDate && provider.originalAgreementDate <= agreementDateTo;
      }

      return matchesSearch && matchesFte && matchesCredential && matchesSpecialty && matchesAdminRole && matchesSubspecialty && matchesAgreementDate;
    });
  }, [providers, search, fteRange, credential, specialty, adminRole, subspecialty, agreementDateFrom, agreementDateTo, providerNameCol]);

  // Memoize unique values for filters
  const uniqueCredentials = useMemo(() => 
    Array.from(new Set(providers.map(p => p.credentials))).filter(Boolean),
    [providers]
  );

  // AG Grid column definitions (converted from TanStack Table format)
  const agGridColumnDefs = React.useMemo(() => {
    const baseCols = (uploadedColumns && uploadedColumns.length > 0)
      ? uploadedColumns.map((col, idx) => {
          let valueFormatter: ((params: any) => string) | undefined;
            if (String(col).toLowerCase().includes('salary') || String(col).toLowerCase().includes('bonus') || String(col).toLowerCase().includes('amount') || String(col).toLowerCase().includes('wage')) {
            valueFormatter = (params: any) => formatCurrency(params.value);
          } else if (String(col).toLowerCase().includes('date')) {
            valueFormatter = (params: any) => formatDate(params.value);
          } else if (String(col).replace(/\s+/g, '').toLowerCase() === 'fte') {
            valueFormatter = (params: any) => {
              const v = params.value;
              return typeof v === 'number' ? v.toFixed(2) : String(v ?? '');
            };
          }
          // Always pin the first column (Provider Name)
          return {
            field: col,
            headerName: col,
            sortable: true,
            resizable: true,
            minWidth: 100,
            valueFormatter,
            pinned: idx === 0 ? 'left' : undefined,
          };
        })
      : [
          { field: 'name', headerName: 'Provider Name', minWidth: 180, pinned: 'left' },
          { field: 'compensationYear', headerName: 'Compensation Year', minWidth: 120, valueFormatter: (params: any) => params.value || '' },
          { field: 'createdAt', headerName: 'Uploaded At', minWidth: 120, valueFormatter: (params: any) => formatDate(params.value) },
          { field: 'employeeId', headerName: 'Employee ID' },
          { field: 'providerType', headerName: 'Provider Type' },
          { field: 'specialty', headerName: 'Specialty' },
          { field: 'subspecialty', headerName: 'Subspecialty' },
          { field: 'fte', headerName: 'FTE', valueFormatter: (params: any) => typeof params.value === 'number' ? params.value.toFixed(2) : String(params.value ?? '') },
          { field: 'baseSalary', headerName: 'Base Salary', valueFormatter: (params: any) => formatCurrency(params.value) },
          { field: 'startDate', headerName: 'Start Date', valueFormatter: (params: any) => formatDate(params.value) },
          { field: 'administrativeFte', headerName: 'Admin FTE' },
          { field: 'administrativeRole', headerName: 'Admin Role' },
          { field: 'yearsExperience', headerName: 'Years Exp' },
          { field: 'hourlyWage', headerName: 'Hourly Wage', valueFormatter: (params: any) => formatCurrency(params.value) },
          { field: 'originalAgreementDate', headerName: 'Orig Agreement', valueFormatter: (params: any) => formatDate(params.value) },
          { field: 'contractTerm', headerName: 'Contract Term' },
          { field: 'ptoDays', headerName: 'PTO Days' },
          { field: 'cmeDays', headerName: 'CME Days' },
          { field: 'cmeAmount', headerName: 'CME Amount', valueFormatter: (params: any) => formatCurrency(params.value) },
          { field: 'signingBonus', headerName: 'Signing Bonus', valueFormatter: (params: any) => formatCurrency(params.value) },
          { field: 'qualityBonus', headerName: 'Quality Bonus', valueFormatter: (params: any) => formatCurrency(params.value) },
          { field: 'wRVUTarget', headerName: 'wRVU Target' },
          { field: 'conversionFactor', headerName: 'CF' },
        ];
    baseCols.push({
      field: 'actions',
      headerName: '',
      minWidth: 60,
      cellRenderer: (params: any) => (
        <Button size="icon" variant="ghost" onClick={() => handleEdit(params.rowIndex)} aria-label="Edit Provider" tabIndex={0} title="Edit Provider">
          <Pencil width={16} height={16} />
        </Button>
      ) as any,
      sortable: false,
      filter: false,
      resizable: false,
      pinned: undefined,
    } as any);
    return baseCols;
  }, [uploadedColumns, handleEdit]);

  const totalPages = Math.ceil(filteredProviders.length / pageSize);

  // Compute pagedProviders for custom pagination
  const pagedProviders = filteredProviders.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

  // Sync top scrollbar with AG Grid (move this useEffect after pagedProviders is defined)
  useEffect(() => {
    const gridEl = document.querySelector('.ag-center-cols-viewport') as HTMLElement;
    if (!gridEl || !topScrollRef.current) return;
    const handleGridScroll = () => {
      if (topScrollRef.current) {
        topScrollRef.current.scrollLeft = gridEl.scrollLeft;
      }
    };
    const handleTopScroll = () => {
      if (gridEl && topScrollRef.current) {
        gridEl.scrollLeft = topScrollRef.current.scrollLeft;
      }
    };
    gridEl.addEventListener('scroll', handleGridScroll);
    topScrollRef.current.addEventListener('scroll', handleTopScroll);
    // Set widths
    setGridScrollWidth(gridEl.scrollWidth);
    setGridClientWidth(gridEl.clientWidth);
    // Cleanup
    return () => {
      gridEl.removeEventListener('scroll', handleGridScroll);
      topScrollRef.current?.removeEventListener('scroll', handleTopScroll);
    };
  }, [pagedProviders, agGridColumnDefs]);

  // AG Grid onRowDoubleClicked handler
  const handleRowDoubleClick = useCallback((event: any) => {
    if (event && typeof event.rowIndex === 'number') {
      handleEdit(event.rowIndex);
    }
  }, [handleEdit]);

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
      <div className="filter-container bg-white border border-gray-200 shadow-sm mb-2 pb-8">
        <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => setFiltersOpen(o => !o)}>
          <span className="mb-1 font-medium text-gray-700 flex items-center gap-1">
            {filtersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Filter Providers
          </span>
          <button
            type="button"
            aria-label={filtersOpen ? 'Collapse filters' : 'Expand filters'}
            className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none"
            onClick={e => { e.stopPropagation(); setFiltersOpen(o => !o); }}
          >
            {filtersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
        <div
          className={`transition-all duration-300 overflow-hidden ${filtersOpen ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 pointer-events-none'}`}
          style={{ willChange: 'max-height, opacity' }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4 items-end">
            {/* Row 1 */}
            <div className="flex flex-col min-w-[180px]">
              <label className="text-sm font-normal text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Search providers..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full font-normal placeholder:font-normal"
              />
            </div>
            <div className="flex flex-col min-w-[180px]">
              <label className="text-sm font-normal text-gray-700 mb-1">FTE Range</label>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={fteRange}
                onValueChange={v => setFteRange([v[0], v[1]])}
                className="w-full"
              />
              <span className="text-xs mt-1 font-normal">{fteRange[0].toFixed(2)} – {fteRange[1].toFixed(2)}</span>
            </div>
            <div className="flex flex-col min-w-[180px]">
              <label htmlFor="credential-select" className="text-sm font-normal text-gray-700 mb-1">Credentials</label>
              <Select value={credential} onValueChange={setCredential}>
                <SelectTrigger id="credential-select" className="w-full font-normal">
                  <SelectValue placeholder="All Credentials" className="font-normal" />
                </SelectTrigger>
                <SelectContent modal={false}>
                  <SelectItem value="__all__" className="font-normal">All Credentials</SelectItem>
                  {credentialOptions.map(opt => (
                    <SelectItem key={opt} value={opt} className="font-normal">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col min-w-[180px]">
              <label htmlFor="specialty-select" className="text-sm font-normal text-gray-700 mb-1">Specialty</label>
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger id="specialty-select" className="w-full font-normal">
                  <SelectValue placeholder="All Specialties" className="font-normal" />
                </SelectTrigger>
                <SelectContent modal={false}>
                  <SelectItem value="__all__" className="font-normal">All Specialties</SelectItem>
                  {specialtyOptions.map(opt => (
                    <SelectItem key={opt} value={opt} className="font-normal">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Row 2 */}
            <div className="flex flex-col min-w-[180px]">
              <label htmlFor="subspecialty-select" className="text-sm font-normal text-gray-700 mb-1">Subspecialty</label>
              <Select value={subspecialty} onValueChange={setSubspecialty}>
                <SelectTrigger id="subspecialty-select" className="w-full font-normal">
                  <SelectValue placeholder="All Subspecialties" className="font-normal" />
                </SelectTrigger>
                <SelectContent modal={false}>
                  <SelectItem value="__all__" className="font-normal">All Subspecialties</SelectItem>
                  {subspecialtyOptions.map(opt => (
                    <SelectItem key={opt} value={opt} className="font-normal">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
            <div className="flex flex-col min-w-[180px]">
              <label htmlFor="adminrole-select" className="text-sm font-normal text-gray-700 mb-1">Admin Role</label>
              <Select value={adminRole} onValueChange={setAdminRole}>
                <SelectTrigger id="adminrole-select" className="w-full font-normal">
                  <SelectValue placeholder="All Admin Roles" className="font-normal" />
                </SelectTrigger>
                <SelectContent modal={false}>
                  <SelectItem value="__all__" className="font-normal">All Admin Roles</SelectItem>
                  {adminRoleOptions.map(opt => (
                    <SelectItem key={opt} value={opt} className="font-normal">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col min-w-[180px]">
              <label className="text-sm font-normal text-gray-700 mb-1">Agreement Date From</label>
              <Input
                type="date"
                value={agreementDateFrom}
                onChange={e => setAgreementDateFrom(e.target.value)}
                className="w-full font-normal placeholder:font-normal"
              />
            </div>
            <div className="flex flex-col min-w-[180px]">
              <label className="text-sm font-normal text-gray-700 mb-1">Agreement Date To</label>
              <Input
                type="date"
                value={agreementDateTo}
                onChange={e => setAgreementDateTo(e.target.value)}
                className="w-full font-normal placeholder:font-normal"
              />
            </div>
          </div>
        </div>
      </div>
      {/* Pagination Controls above the table */}
      <div className="flex items-center mb-2">
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
          <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
          <span className="text-sm">Page {pageIndex + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={!Number.isFinite(totalPages) || pageIndex >= (totalPages - 1)} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
          <Button variant="outline" size="sm" disabled={!Number.isFinite(totalPages) || pageIndex >= (totalPages - 1)} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
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
      {/* Top horizontal scrollbar synced with AG Grid */}
        <div
        ref={topScrollRef}
          style={{
          overflowX: 'auto',
          overflowY: 'hidden',
            width: '100%',
          height: 16,
          marginBottom: 2,
          background: 'transparent',
          }}
        >
        <div style={{ width: gridScrollWidth, height: 1 }} />
        </div>
        {/* Main table with native horizontal scrollbar at the bottom */}
      <div className="ag-theme-alpine w-full">
        <AgGridReact
          rowData={pagedProviders}
          columnDefs={agGridColumnDefs as import('ag-grid-community').ColDef<ExtendedProvider, any>[]}
          domLayout="autoHeight"
          suppressRowClickSelection={false}
          rowSelection="multiple"
          pagination={false}
          enableCellTextSelection={true}
          headerHeight={40}
          rowHeight={36}
          suppressDragLeaveHidesColumns={true}
          suppressScrollOnNewData={true}
          suppressColumnVirtualisation={false}
          suppressRowVirtualisation={false}
          onRowDoubleClicked={handleRowDoubleClick}
          defaultColDef={{ tooltipValueGetter: () => 'Double-click to edit provider' }}
        />
      </div>
      {/* Pagination Controls below the table (optional, for long tables) */}
      <div className="flex gap-2 items-center mt-2">
        <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(0)}>&laquo;</Button>
        <Button variant="outline" size="sm" disabled={pageIndex === 0} onClick={() => setPageIndex(pageIndex - 1)}>&lsaquo;</Button>
        <span className="text-sm">Page {pageIndex + 1} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={!Number.isFinite(totalPages) || pageIndex >= (totalPages - 1)} onClick={() => setPageIndex(pageIndex + 1)}>&rsaquo;</Button>
        <Button variant="outline" size="sm" disabled={!Number.isFinite(totalPages) || pageIndex >= (totalPages - 1)} onClick={() => setPageIndex(totalPages - 1)}>&raquo;</Button>
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
      {/* Add a custom tooltip div that appears on row hover, using CSS and getRowClass */}
      <style>{`
        .ag-theme-alpine .ag-row:hover::after {
          content: 'Double-click to edit provider';
          position: absolute;
          left: 50%;
          top: -28px;
          transform: translateX(-50%);
          background: #222;
          color: #fff;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 13px;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
          opacity: 0.95;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        }
      `}</style>
    </div>
  );
}

ProviderManager.displayName = 'ProviderManager';

export default ProviderManager; 