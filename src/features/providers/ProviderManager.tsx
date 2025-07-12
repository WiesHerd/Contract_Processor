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
import { RootState, AppDispatch } from '@/store';
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
import { useProviderPreferences } from '@/hooks/useUserPreferences';
import { toast } from 'sonner';
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
  const dispatch = useDispatch<AppDispatch>();
  const uploadedColumns = useSelector((state: RootState) => state.provider.uploadedColumns);
  
  // Enterprise-grade user preferences
  const {
    preferences,
    loading: preferencesLoading,
    updateColumnVisibility,
    updateColumnOrder,
    updateColumnPinning,
    createSavedView,
    setActiveView,
    deleteSavedView,
    updateDisplaySettings
  } = useProviderPreferences();

  // Local state for UI interactions
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<ExtendedProvider | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [customFields, setCustomFields] = useState<[string, string][]>([]);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResults, setGenerationResults] = useState<BulkGenerationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [yearFilter, setYearFilter] = useState<string>('all');
  const gridRef = useRef<any>(null);
  const [gridScrollWidth, setGridScrollWidth] = useState(0);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [editingProvider, setEditingProvider] = useState<ExtendedProvider | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [gridClientWidth, setGridClientWidth] = useState(0);
  const [isColumnSidebarOpen, setIsColumnSidebarOpen] = useState(false);

  // Get preferences (non-filter data)
  const hiddenColumns = new Set(Object.entries(preferences?.columnVisibility || {})
    .filter(([_, visible]) => !visible)
    .map(([col]) => col));
  const columnOrder = preferences?.columnOrder || [];
  const savedViews = preferences?.savedViews || {};
  const activeView = preferences?.activeView || 'default';

  // Update column visibility when preferences change
  useEffect(() => {
    if (preferences?.columnVisibility) {
      setColumnVisibility(preferences.columnVisibility);
    }
  }, [preferences?.columnVisibility]);

  // Update column pinning when preferences change
  useEffect(() => {
    if (preferences?.columnPinning) {
      setColumnPinning(preferences.columnPinning);
    }
  }, [preferences?.columnPinning]);

  const providers = useMemo(() => allProviders as ExtendedProvider[], [allProviders]);
  
  // Additional local state for filtering and pagination (filters are NOT saved to preferences)
  const [search, setSearch] = useState('');
  const [fteRange, setFteRange] = useState<[number, number]>([0, 1]);
  const [credential, setCredential] = useState('__all__');
  const [specialty, setSpecialty] = useState('__all__');
  const [subspecialty, setSubspecialty] = useState('__all__');
  const [adminRole, setAdminRole] = useState('__all__');
  const [agreementDateFrom, setAgreementDateFrom] = useState('');
  const [agreementDateTo, setAgreementDateTo] = useState('');
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Find provider name column
  const providerNameCol = useMemo(() => 
    uploadedColumns.find(col => col.toLowerCase().includes('provider name')),
    [uploadedColumns]
  );

  // Initialize default pinning if no preferences exist
  useEffect(() => {
    if (preferences && (!preferences.columnPinning || Object.keys(preferences.columnPinning).length === 0)) {
      // Set default pinning for Provider Name if no pinning preferences exist
      if (providerNameCol) {
        const newPinning = { left: [providerNameCol] };
        updateColumnPinning(newPinning);
      } else if (columnOrder.length > 0) {
        // Pin the first column (usually name) by default
        const firstCol = columnOrder[0];
        if (firstCol) {
          const newPinning = { left: [firstCol] };
          updateColumnPinning(newPinning);
        }
      }
    }
  }, [providerNameCol, preferences, updateColumnPinning, columnOrder]);

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
      await dispatch(updateProvider(updatePayload as Provider));
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

  // Compute unique subspecialties from provider data - CASCADE based on selected specialty
  const subspecialtyOptions = React.useMemo(() => {
    const subs = new Set<string>();
    providers.forEach((p) => {
      // Only include subspecialties for providers that match the selected specialty
      if (p.subspecialty && (specialty === '__all__' || p.specialty === specialty)) {
        subs.add(p.subspecialty);
      }
    });
    return Array.from(subs).sort();
  }, [providers, specialty]);

  // Reset subspecialty when specialty changes
  useEffect(() => {
    if (specialty !== '__all__') {
      // Check if current subspecialty is still valid for the selected specialty
      const validSubspecialties = providers
        .filter(p => p.specialty === specialty && p.subspecialty)
        .map(p => p.subspecialty as string)
        .filter(Boolean);
      
      if (subspecialty !== '__all__' && !validSubspecialties.includes(subspecialty)) {
        setSubspecialty('__all__');
      }
    }
  }, [specialty, subspecialty, providers]);

  // Update filteredProviders to include subspecialty and agreement date range
  const filteredProviders = useMemo(() => {
    return providers.filter(provider => {
      // Use dynamic column names for search/filter
      const providerNameValue = providerNameCol ? (provider[providerNameCol] || '') : (provider.name || '');

      const matchesSearch =
        String(search) === '' ||
        String(providerNameValue).toLowerCase().includes(String(search).toLowerCase()) ||
        (provider.credentials && String(provider.credentials).toLowerCase().includes(String(search).toLowerCase()));

      // Get FTE value from TotalFTE or fte field, checking both flat fields and dynamicFields
      let fteValue = 0;
      if (provider.TotalFTE !== undefined && provider.TotalFTE !== null) {
        fteValue = Number(provider.TotalFTE) || 0;
      } else if (provider.fte !== undefined && provider.fte !== null) {
        fteValue = Number(provider.fte) || 0;
      } else if (provider.dynamicFields) {
        try {
          const dynamicFields = typeof provider.dynamicFields === 'string' 
            ? JSON.parse(provider.dynamicFields) 
            : provider.dynamicFields;
          if (dynamicFields.TotalFTE !== undefined && dynamicFields.TotalFTE !== null) {
            fteValue = Number(dynamicFields.TotalFTE) || 0;
          } else if (dynamicFields.fte !== undefined && dynamicFields.fte !== null) {
            fteValue = Number(dynamicFields.fte) || 0;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
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
        matchesAgreementDate = Boolean(provider.originalAgreementDate && provider.originalAgreementDate >= agreementDateFrom);
      }
      if (matchesAgreementDate && agreementDateTo) {
        matchesAgreementDate = Boolean(provider.originalAgreementDate && provider.originalAgreementDate <= agreementDateTo);
      }

      return matchesSearch && matchesFte && matchesCredential && matchesSpecialty && matchesAdminRole && matchesSubspecialty && matchesAgreementDate;
    });
  }, [providers, search, fteRange, credential, specialty, adminRole, subspecialty, agreementDateFrom, agreementDateTo, providerNameCol]);

  // Memoize unique values for filters
  const uniqueCredentials = useMemo(() => 
    Array.from(new Set(providers.map(p => p.credentials))).filter(Boolean),
    [providers]
  );

  // Initialize column order from ALL available data (provider fields + uploaded columns)
  useEffect(() => {
    if (providers.length > 0 && (columnOrder.length === 0 || (uploadedColumns && uploadedColumns.length > 0 && !columnOrder.some(col => uploadedColumns.includes(col))))) {
      // Generate unified column order from all available data
      const allFields = new Set<string>();
      const fieldDataCount = new Map<string, number>();
      
      // Add uploadedColumns if available
      if (uploadedColumns && uploadedColumns.length > 0) {
        uploadedColumns.forEach(col => {
          allFields.add(col);
          fieldDataCount.set(col, providers.length); // Assume all providers have uploaded column data
        });
      }
      
      providers.forEach(provider => {
        // Add flat fields ONLY if they have meaningful data
        Object.keys(provider).forEach(key => {
          if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__typename' && key !== 'dynamicFields') {
            const value = provider[key];
            // Only include fields with actual data (not empty strings, null, undefined, or 0)
            if (value !== null && value !== undefined && value !== '' && String(value).trim() !== '') {
              allFields.add(key);
              fieldDataCount.set(key, (fieldDataCount.get(key) || 0) + 1);
            }
          }
        });
        
        // Add dynamicFields ONLY if they have meaningful data
        if (provider.dynamicFields) {
          try {
            const dynamicFields = typeof provider.dynamicFields === 'string' 
              ? JSON.parse(provider.dynamicFields) 
              : provider.dynamicFields;
            Object.keys(dynamicFields).forEach(key => {
              const value = dynamicFields[key];
              // Only include fields with actual data (not empty strings, null, undefined)
              if (value !== null && value !== undefined && value !== '' && String(value).trim() !== '') {
                allFields.add(key);
                fieldDataCount.set(key, (fieldDataCount.get(key) || 0) + 1);
              }
            });
          } catch (e) {
            console.warn('Failed to parse dynamicFields:', e);
          }
        }
      });
      
      // Filter out fields that have data in less than 1% of providers
      const minDataThreshold = Math.max(1, Math.floor(providers.length * 0.01));
      const fieldsWithSufficientData = Array.from(allFields).filter(field => {
        const dataCount = fieldDataCount.get(field) || 0;
        return dataCount >= minDataThreshold;
      });
      
      // Sort fields by priority
      const sortedFields = fieldsWithSufficientData.sort((a, b) => {
        const priorityOrder = ['name', 'employeeId', 'providerType', 'specialty', 'subspecialty', 'credentials', 'fte', 'baseSalary', 'startDate'];
        const aPriority = priorityOrder.indexOf(a);
        const bPriority = priorityOrder.indexOf(b);
        
        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        
        // Sort by data availability
        const aCount = fieldDataCount.get(a) || 0;
        const bCount = fieldDataCount.get(b) || 0;
        if (aCount !== bCount) return bCount - aCount;
        
        return a.localeCompare(b);
      });
      
      if (preferences && JSON.stringify(sortedFields) !== JSON.stringify(preferences.columnOrder)) {
        updateColumnOrder(sortedFields);
      }
    }
  }, [providers, uploadedColumns, columnOrder.length, preferences, updateColumnOrder]);

  // AG Grid column definitions (unified system using columnOrder)
  const agGridColumnDefs = React.useMemo(() => {
    const leftPinned = preferences?.columnPinning?.left || [];
    const rightPinned = preferences?.columnPinning?.right || [];
    
    // Use columnOrder as the single source of truth for column definitions
    const baseCols = columnOrder.map((field, idx) => {
          let valueFormatter: ((params: any) => string) | undefined;
          let headerName = field;
          
          // Format header name - handle both camelCase provider fields and uploaded column names
          if (field === 'name') headerName = 'Provider Name';
          else if (field === 'employeeId') headerName = 'Employee ID';
          else if (field === 'providerType') headerName = 'Provider Type';
          else if (field === 'baseSalary') headerName = 'Base Salary';
          else if (field === 'startDate') headerName = 'Start Date';
          else if (field === 'originalAgreementDate') headerName = 'Orig Agreement';
          else if (field === 'administrativeFte') headerName = 'Admin FTE';
          else if (field === 'administrativeRole') headerName = 'Admin Role';
          else if (field === 'yearsExperience') headerName = 'Years Exp';
          else if (field === 'hourlyWage') headerName = 'Hourly Wage';
          else if (field === 'contractTerm') headerName = 'Contract Term';
          else if (field === 'ptoDays') headerName = 'PTO Days';
          else if (field === 'cmeDays') headerName = 'CME Days';
          else if (field === 'cmeAmount') headerName = 'CME Amount';
          else if (field === 'signingBonus') headerName = 'Signing Bonus';
          else if (field === 'qualityBonus') headerName = 'Quality Bonus';
          else if (field === 'wRVUTarget') headerName = 'wRVU Target';
          else if (field === 'conversionFactor') headerName = 'CF';
          else if (field === 'compensationYear') headerName = 'Comp Year';
          else if (field === 'compensationType') headerName = 'Comp Type';
          else if (field === 'organizationName') headerName = 'Organization';
          else if (field.includes('FTE')) headerName = field; // Keep FTE fields as-is
          else if (field.includes(' ')) headerName = field; // Keep uploaded column names with spaces as-is
          else headerName = field.charAt(0).toUpperCase() + field.slice(1);
          
          // Value formatters
          if (String(field).toLowerCase().includes('salary') || String(field).toLowerCase().includes('bonus') || String(field).toLowerCase().includes('amount') || String(field).toLowerCase().includes('wage')) {
            valueFormatter = (params: any) => formatCurrency(params.value);
          } else if (String(field).toLowerCase().includes('date')) {
            valueFormatter = (params: any) => formatDate(params.value);
          } else if (field.toLowerCase().includes('fte') || field === 'fte') {
            valueFormatter = (params: any) => {
              const v = params.value;
              return typeof v === 'number' ? v.toFixed(2) : String(v ?? '');
            };
          }
          
          // Custom value getter to handle both provider fields and uploaded columns
          const valueGetter = (params: any) => {
            const provider = params.data;
            
            // First try flat field (provider properties)
            if (provider[field] !== undefined && provider[field] !== null) {
              return provider[field];
            }
            
            // Then try dynamicFields (uploaded CSV columns)
            if (provider.dynamicFields) {
              try {
                const dynamicFields = typeof provider.dynamicFields === 'string' 
                  ? JSON.parse(provider.dynamicFields) 
                  : provider.dynamicFields;
                
                // Try exact field name match first
                if (dynamicFields[field] !== undefined && dynamicFields[field] !== null) {
                  return dynamicFields[field];
                }
                
                // Try case-insensitive match for uploaded columns
                const fieldLower = field.toLowerCase();
                const matchingKey = Object.keys(dynamicFields).find(key => 
                  key.toLowerCase() === fieldLower
                );
                if (matchingKey && dynamicFields[matchingKey] !== undefined && dynamicFields[matchingKey] !== null) {
                  return dynamicFields[matchingKey];
                }
              } catch (e) {
                console.warn('Failed to parse dynamicFields:', e);
              }
            }
            
            return null;
          };
          
          // Apply pinning from preferences
          let pinned: 'left' | 'right' | undefined;
          
          if (leftPinned.includes(field)) {
            pinned = 'left';
          } else if (rightPinned.includes(field)) {
            pinned = 'right';
          }
          
          return {
            field,
            headerName,
            sortable: true,
            resizable: true,
            minWidth: 100,
            valueFormatter,
            valueGetter,
            pinned,
            hide: hiddenColumns.has(field),
          };
        });
        
    return baseCols;
  }, [uploadedColumns, providers, hiddenColumns, columnOrder, preferences?.columnPinning]);

  const totalPages = Math.ceil(filteredProviders.length / pageSize);

  // Compute pagedProviders for custom pagination
  const pagedProviders = filteredProviders.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                // Reset all filters to default values
                setSearch('');
                setFteRange([0, 1]);
                setCredential('__all__');
                setSpecialty('__all__');
                setSubspecialty('__all__');
                setAdminRole('__all__');
                setAgreementDateFrom('');
                setAgreementDateTo('');
              }}
              className="text-xs"
            >
              Clear Filters
            </Button>
            <button
              type="button"
              aria-label={filtersOpen ? 'Collapse filters' : 'Expand filters'}
              className="ml-2 p-1 rounded hover:bg-gray-200 focus:outline-none"
              onClick={e => { e.stopPropagation(); setFiltersOpen(o => !o); }}
            >
              {filtersOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
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
        
        {/* View Indicator and Column Visibility Toggle */}
        <div className="flex items-center gap-2 ml-4">
          {/* Current View Indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium cursor-help ${
                  activeView && activeView !== 'default' 
                    ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                    : 'bg-gray-50 text-gray-600 border border-gray-200'
                }`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View: {activeView === 'default' ? 'Default' : activeView}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {activeView === 'default' 
                    ? 'Currently viewing default layout' 
                    : `Currently viewing saved layout: "${activeView}"`
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsColumnSidebarOpen(!isColumnSidebarOpen)}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Columns
          </Button>
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
          defaultColDef={{ 
            menuTabs: ['generalMenuTab', 'filterMenuTab', 'columnsMenuTab'],
            resizable: true,
            sortable: true,
            filter: true
          }}
          suppressMenuHide={false}
          enableRangeSelection={true}
          enableCharts={false}
        />
      </div>
      
      {/* Modern Column Visibility Sidebar */}
      {isColumnSidebarOpen && (
        <div 
          className="fixed inset-0 z-50 flex"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsColumnSidebarOpen(false);
            }
          }}
          tabIndex={-1}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-25" 
            onClick={() => setIsColumnSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative ml-auto w-80 bg-white shadow-xl h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Column Manager</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsColumnSidebarOpen(false)}
                className="p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                {/* View Management */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Saved Views</div>
                  <div className="flex gap-2 mb-3">
                    <select 
                      value={activeView} 
                      onChange={(e) => {
                        const viewName = e.target.value;
                        setActiveView(viewName);
                        if (savedViews[viewName]) {
                          updateColumnOrder(savedViews[viewName].columnOrder);
                          updateColumnVisibility(savedViews[viewName].columnVisibility);
                        }
                      }}
                      className="flex-1 text-sm border rounded px-2 py-1"
                    >
                      <option value="default">Default View</option>
                      {Object.keys(savedViews).map(viewName => (
                        <option key={viewName} value={viewName}>{viewName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const viewName = prompt('Enter view name:');
                        if (viewName && viewName.trim()) {
                          createSavedView(
                            viewName.trim(),
                            preferences?.columnVisibility || {},
                            columnOrder,
                            preferences?.columnPinning || {}
                          );
                        }
                      }}
                      className="flex-1 text-xs"
                    >
                      Save View
                    </Button>
                    
                    {/* Smart Arrangement Dropdown */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative flex-1">
                            <select
                              onChange={(e) => {
                                const arrangement = e.target.value;
                                if (!arrangement) return;
                                
                                let newOrder: string[] = [];
                                let message = '';
                                
                                switch (arrangement) {
                                  case 'smart':
                                    // Logical grouping
                                    const identityFields = columnOrder.filter(field => 
                                      ['name', 'employeeId', 'providerType'].includes(field)
                                    );
                                    const clinicalFields = columnOrder.filter(field => 
                                      ['specialty', 'subspecialty', 'credentials'].includes(field)
                                    );
                                    const fteFields = columnOrder.filter(field => 
                                      field.toLowerCase().includes('fte') || 
                                      field.toLowerCase().includes('administrative')
                                    );
                                    const compensationFields = columnOrder.filter(field => 
                                      field.toLowerCase().includes('salary') || 
                                      field.toLowerCase().includes('bonus') || 
                                      field.toLowerCase().includes('wage') ||
                                      field.toLowerCase().includes('wrvu') ||
                                      field.toLowerCase().includes('conversion')
                                    );
                                    const dateFields = columnOrder.filter(field => 
                                      field.toLowerCase().includes('date')
                                    );
                                    const otherFields = columnOrder.filter(field => 
                                      ![...identityFields, ...clinicalFields, ...fteFields, ...compensationFields, ...dateFields].includes(field)
                                    );
                                    
                                    newOrder = [
                                      ...identityFields,
                                      ...clinicalFields, 
                                      ...fteFields,
                                      ...compensationFields,
                                      ...dateFields,
                                      ...otherFields
                                    ];
                                    message = 'Columns arranged by logical groups';
                                    break;
                                    
                                  case 'compensation':
                                    // Compensation-focused
                                    const compFields = columnOrder.filter(field => 
                                      field.toLowerCase().includes('salary') || 
                                      field.toLowerCase().includes('bonus') || 
                                      field.toLowerCase().includes('wage') ||
                                      field.toLowerCase().includes('wrvu') ||
                                      field.toLowerCase().includes('conversion') ||
                                      field.toLowerCase().includes('fte')
                                    );
                                    const nonCompFields = columnOrder.filter(field => !compFields.includes(field));
                                    newOrder = [...nonCompFields.slice(0, 3), ...compFields, ...nonCompFields.slice(3)];
                                    message = 'Compensation fields grouped together';
                                    break;
                                    
                                  case 'clinical':
                                    // Clinical-focused
                                    const clinFields = columnOrder.filter(field => 
                                      ['specialty', 'subspecialty', 'credentials', 'providerType'].includes(field)
                                    );
                                    const nonClinFields = columnOrder.filter(field => !clinFields.includes(field));
                                    newOrder = [...nonClinFields.slice(0, 2), ...clinFields, ...nonClinFields.slice(2)];
                                    message = 'Clinical fields grouped together';
                                    break;
                                    
                                  case 'alphabetical':
                                    // Alphabetical order
                                    newOrder = [...columnOrder].sort();
                                    message = 'Columns arranged alphabetically';
                                    break;
                                    
                                  case 'frequency':
                                    // Most commonly used fields first
                                    const commonFields = ['name', 'specialty', 'fte', 'baseSalary', 'startDate', 'providerType'];
                                    const remainingFields = columnOrder.filter(field => !commonFields.includes(field));
                                    newOrder = [...commonFields.filter(field => columnOrder.includes(field)), ...remainingFields];
                                    message = 'Most commonly used fields moved to front';
                                    break;
                                }
                                
                                if (newOrder.length > 0) {
                                  updateColumnOrder(newOrder);
                                  toast.success(message);
                                }
                                
                                // Reset dropdown
                                e.target.value = '';
                              }}
                              className="w-full text-xs border rounded px-2 py-1 bg-white"
                            >
                              <option value="">Arrange...</option>
                              <option value="smart">🧠 Smart Groups</option>
                              <option value="compensation">💰 Compensation Focus</option>
                              <option value="clinical">🏥 Clinical Focus</option>
                              <option value="frequency">⭐ Most Used First</option>
                              <option value="alphabetical">🔤 Alphabetical</option>
                            </select>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1 text-xs">
                            <div><strong>🧠 Smart Groups:</strong> Identity → Clinical → FTE → Compensation → Dates → Other</div>
                            <div><strong>💰 Compensation:</strong> Groups salary, bonus, wRVU, and FTE fields together</div>
                            <div><strong>🏥 Clinical:</strong> Groups specialty, subspecialty, credentials, and provider type</div>
                            <div><strong>⭐ Most Used:</strong> Puts frequently accessed fields (name, specialty, FTE, salary) first</div>
                            <div><strong>🔤 Alphabetical:</strong> Simple A-Z sorting for easy field finding</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Column Pinning */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Column Pinning</div>
                  <div className="flex gap-2 pb-3 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        updateColumnPinning({ left: [], right: [] });
                      }}
                      className="flex-1 text-xs"
                    >
                      Unpin All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Pin first 2 columns to left by default
                        const firstTwoColumns = columnOrder.slice(0, 2);
                        updateColumnPinning({ left: firstTwoColumns, right: [] });
                      }}
                      className="flex-1 text-xs"
                    >
                      Pin First 2
                    </Button>
                  </div>
                  
                  {/* Show pinned columns summary */}
                  {((preferences?.columnPinning?.left || []).length > 0 || (preferences?.columnPinning?.right || []).length > 0) && (
                    <div className="text-xs text-gray-600 mb-3">
                      {(preferences?.columnPinning?.left || []).length > 0 && (
                        <div>Left: {(preferences?.columnPinning?.left || []).join(', ')}</div>
                      )}
                      {(preferences?.columnPinning?.right || []).length > 0 && (
                        <div>Right: {(preferences?.columnPinning?.right || []).join(', ')}</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Column Visibility */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Column Visibility</div>
                  <div className="flex gap-2 pb-3 border-b">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allVisible = columnOrder.reduce((acc, field) => {
                          acc[field] = true;
                          return acc;
                        }, {} as Record<string, boolean>);
                        updateColumnVisibility(allVisible);
                      }}
                      className="flex-1 text-xs"
                    >
                      Show All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const allHidden = columnOrder.reduce((acc, field) => {
                          acc[field] = false; // Hide all columns
                          return acc;
                        }, {} as Record<string, boolean>);
                        updateColumnVisibility(allHidden);
                      }}
                      className="flex-1 text-xs"
                    >
                      Hide All
                    </Button>
                  </div>
                </div>

                {/* Column Reordering */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Column Order</div>
                  <div className="text-xs text-gray-500 mb-3">Drag to reorder columns. Click eye to show/hide.</div>
                  <div className="space-y-1">
                    {columnOrder.map((field, index) => {
                      const colDef = agGridColumnDefs.find((col: any) => col.field === field);
                      if (!colDef) return null;
                      
                      return (
                        <div
                          key={field}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', index.toString());
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                            const hoverIndex = index;
                            
                            if (dragIndex !== hoverIndex) {
                              const newOrder = [...columnOrder];
                              const draggedItem = newOrder[dragIndex];
                              newOrder.splice(dragIndex, 1);
                              newOrder.splice(hoverIndex, 0, draggedItem);
                              updateColumnOrder(newOrder);
                            }
                          }}
                        >
                          {/* Drag Handle */}
                          <svg className="w-4 h-4 text-gray-400 cursor-move" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                          </svg>
                          
                          {/* Visibility Toggle */}
                          <button
                            onClick={() => {
                              const newVisibility = { ...preferences?.columnVisibility };
                              newVisibility[field] = !newVisibility[field];
                              updateColumnVisibility(newVisibility);
                            }}
                            className="p-1 rounded text-gray-600 hover:text-blue-600"
                          >
                            {hiddenColumns.has(field) ? (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L8.464 8.464M18.364 18.364l-9.9-9.9" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                          
                          {/* Pin/Unpin Button */}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => {
                                    const currentPinning = preferences?.columnPinning || {};
                                    const leftPinned = currentPinning.left || [];
                                    const rightPinned = currentPinning.right || [];
                                    
                                    const isLeftPinned = leftPinned.includes(field);
                                    const isRightPinned = rightPinned.includes(field);
                                    
                                    let newPinning: { left?: string[]; right?: string[] };
                                    
                                    if (e.shiftKey) {
                                      // Shift+click to pin to right
                                      if (isRightPinned) {
                                        // Unpin from right
                                        newPinning = {
                                          left: leftPinned,
                                          right: rightPinned.filter(f => f !== field)
                                        };
                                      } else {
                                        // Pin to right (remove from left if needed)
                                        newPinning = {
                                          left: leftPinned.filter(f => f !== field),
                                          right: [...rightPinned, field]
                                        };
                                      }
                                    } else {
                                      // Regular click for left pinning
                                      if (isLeftPinned) {
                                        // Unpin from left
                                        newPinning = {
                                          left: leftPinned.filter(f => f !== field),
                                          right: rightPinned
                                        };
                                      } else {
                                        // Pin to left (remove from right if needed)
                                        newPinning = {
                                          left: [...leftPinned, field],
                                          right: rightPinned.filter(f => f !== field)
                                        };
                                      }
                                    }
                                    
                                    updateColumnPinning(newPinning);
                                  }}
                                  className={`p-1 rounded transition-colors ${
                                    (preferences?.columnPinning?.left || []).includes(field) || 
                                    (preferences?.columnPinning?.right || []).includes(field)
                                      ? 'text-blue-600 hover:text-blue-800 bg-blue-50' 
                                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                                  }`}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                  </svg>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {(preferences?.columnPinning?.left || []).includes(field) 
                                    ? 'Click to unpin from left' 
                                    : (preferences?.columnPinning?.right || []).includes(field)
                                    ? 'Click to unpin from right'
                                    : 'Click to pin left • Shift+click to pin right'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          {/* Column Name */}
                          <span className={`flex-1 text-sm ${field === 'name' ? 'text-gray-700' : 'text-gray-700'}`}>
                            {colDef.headerName}
                            {(preferences?.columnPinning?.left || []).includes(field) && <span className="text-xs text-blue-600 ml-1">(pinned left)</span>}
                            {(preferences?.columnPinning?.right || []).includes(field) && <span className="text-xs text-blue-600 ml-1">(pinned right)</span>}
                            {field.toLowerCase().includes('fte') && <span className="text-xs text-blue-500 ml-1">FTE</span>}
                          </span>
                          
                          {/* Move Buttons */}
                          <div className="flex gap-1">
                            <button
                              onClick={() => {
                                if (index > 0) {
                                  const newOrder = [...columnOrder];
                                  [newOrder[index], newOrder[index - 1]] = [newOrder[index - 1], newOrder[index]];
                                  updateColumnOrder(newOrder);
                                }
                              }}
                              disabled={index === 0}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                if (index < columnOrder.length - 1) {
                                  const newOrder = [...columnOrder];
                                  [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                                  updateColumnOrder(newOrder);
                                }
                              }}
                              disabled={index === columnOrder.length - 1}
                              className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  {columnOrder.length - hiddenColumns.size} of {columnOrder.length} columns visible
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => {
                          // Close the sidebar and ensure preferences are saved
                          setIsColumnSidebarOpen(false);
                          // Show success message
                          toast.success('Column preferences saved successfully!');
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium"
                      >
                        Done
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Close column manager (Esc)</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      )}
      
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