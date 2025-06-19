import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
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
} from '@tanstack/react-table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RootState } from '@/store';
import { addProvidersFromCSV, updateProvider, setUploadedColumns } from './providersSlice';
import { Provider } from '@/types/provider';
import localforage from 'localforage';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { generateClient } from 'aws-amplify/api';
import { createProvider } from '@/graphql/mutations';

const client = generateClient();

// CSV header to internal field mapping
const csvToProviderFieldMap: Record<string, string> = {
  ProviderName: 'name',
  Credentials: 'credentials',
  PositionTitle: 'specialty',
  FTE: 'fte',
  BaseSalary: 'baseSalary',
  StartDate: 'startDate',
  ContractTerm: 'contractTerm',
  PTODays: 'ptoDays',
  HolidayDays: 'holidayDays',
  CMEDays: 'cmeDays',
  CMEAmount: 'cmeAmount',
  SigningBonus: 'signingBonus',
  RelocationBonus: 'relocationBonus',
  QualityBonus: 'qualityBonus',
  OrganizationName: 'organizationName',
  OriginalAgreementDate: 'originalAgreementDate',
  ConversionFactor: 'conversionFactor',
  wRVUTarget: 'wRVUTarget',
  // Add more as needed
};

export function mapCsvRowToProviderFields(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = { ...row }; // preserve all original columns

  // Always set normalized fields from the most likely CSV columns
  mapped.name = row["Provider Name"] || row["Employee Name"] || row.name || "";
  mapped.specialty = row["Specialty"] || row["PositionTitle"] || row.specialty || "";
  mapped.credentials = row["Credentials"] || row.credentials || "";
  mapped.startDate = row["StartDate"] || row.startDate || "";
  mapped.fte = row["FTE"] || row.fte || "";
  mapped.baseSalary = row["BaseSalary"] || row["Annual Wage"] || row.baseSalary || "";
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
  isSticky?: boolean;
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

export default function ProviderManager({ isSticky = true }: ProviderManagerProps) {
  const dispatch = useDispatch();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const providers = useSelector((state: RootState) => state.providers.providers);
  const [search, setSearch] = useState('');
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editRow, setEditRow] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const uploadedColumns = useSelector((state: RootState) => state.providers.uploadedColumns);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [fteRange, setFteRange] = useState<[number, number]>([0, 1]);
  const [credential, setCredential] = useState('__all__');
  const [specialty, setSpecialty] = useState('__all__');
  const [pageSize, setPageSize] = useState(25);
  const [pageIndex, setPageIndex] = useState(0);
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(() => {
    const providerNameCol = uploadedColumns.find(col => col.toLowerCase().includes('provider name'));
    return providerNameCol ? { left: [providerNameCol] } : {};
  });

  // Hydrate providers and uploadedColumns from localforage on mount
  useEffect(() => {
    Promise.all([
      localforage.getItem<Record<string, any>[]>('providers'),
      localforage.getItem<string[]>('uploadedColumns'),
    ]).then(([savedProviders, savedColumns]) => {
      if (Array.isArray(savedProviders) && savedProviders.length > 0) {
        dispatch(addProvidersFromCSV(savedProviders));
      }
      if (Array.isArray(savedColumns) && savedColumns.length > 0) {
        dispatch(setUploadedColumns(savedColumns));
      }
      setLoading(false);
    });
  }, [dispatch]);

  // Persist providers to localforage whenever they change
  useEffect(() => {
    if (providers.length > 0) {
      localforage.setItem('providers', providers);
    } else {
      localforage.removeItem('providers');
    }
  }, [providers]);

  // Persist uploadedColumns to localforage whenever they change
  useEffect(() => {
    if (uploadedColumns.length > 0) {
      localforage.setItem('uploadedColumns', uploadedColumns);
    } else {
      localforage.removeItem('uploadedColumns');
    }
  }, [uploadedColumns]);

  // Watch isSticky and update columnPinning accordingly
  useEffect(() => {
    const providerNameCol = uploadedColumns.find(col => col.toLowerCase().includes('provider name'));
    if (isSticky && providerNameCol) {
      setColumnPinning({ left: [providerNameCol] });
    } else {
      setColumnPinning({ left: [] });
    }
  }, [isSticky, uploadedColumns]);

  // No top scrollbar, so no scroll sync needed

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
        dispatch(addProvidersFromCSV(mappedData));

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
  // Dynamically find the provider name column (case-insensitive)
  const providerNameCol = uploadedColumns.find(col => col.toLowerCase().includes('provider name'));

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
        String(credentialsValue).toLowerCase().includes(String(search).toLowerCase());

      const matchesFte =
        provider.fte >= fteRange[0] && provider.fte <= fteRange[1];

      const matchesCredential =
        credential === '__all__' || credentialsValue === credential;

      const matchesSpecialty =
        specialty === '__all__' || specialtyValue === specialty;

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

  // TanStack Table column definitions (only uploaded columns, but override FTE to use normalized field)
  const columnDefs = React.useMemo<ColumnDef<Provider, any>[]>(
    () =>
      uploadedColumns.map(col => ({
        accessorKey: col,
        header: col,
        cell: (info: { getValue: () => any; row: any }) => {
          const val = info.getValue();
          const normalized = col.replace(/\s+/g, '').toLowerCase();
          if ([
            'hourlywage', 'annualwage', 'cmeamount'
          ].includes(normalized)) {
            return formatUSD(val);
          }
          if ([
            'basesalary', 'conversionfactor', 'signingbonus', 'relocationbonus', 'qualitybonus'
          ].includes(normalized)) {
            return formatCurrency(val);
          }
          if ([
            'wrvutarget'
          ].includes(normalized)) {
            return formatNumber(val);
          }
          if ([
            'startdate', 'originalagreementdate'
          ].includes(normalized)) {
            return formatDate(val);
          }
          if (normalized === 'fte') {
            return (typeof info.row.original.fte === 'number' ? info.row.original.fte.toFixed(2) : String(info.row.original.fte));
          }
          return String(val || '');
        },
        enableSorting: true,
        size: providerNameCol && col === providerNameCol ? 220 : 120, // min width for name
        minSize: providerNameCol && col === providerNameCol ? 180 : 80,
        maxSize: 400,
        enableResizing: true,
        pin: isSticky && providerNameCol && col === providerNameCol ? 'left' : false,
      })).concat([
        {
          id: 'actions',
          header: '',
          cell: ({ row }: { row: any }) => (
            <Button size="icon" variant="ghost" onClick={() => handleEdit(row.index)}>
              <Pencil className="h-4 w-4" />
            </Button>
          ),
          enableSorting: false,
          meta: { type: 'display' },
          size: 60,
          minSize: 40,
          maxSize: 80,
          enableResizing: false,
        } as any,
      ]),
    [uploadedColumns, handleEdit, providerNameCol, isSticky]
  );

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
        <table className="w-full border-collapse">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={`border-b p-2 text-left font-semibold bg-gray-50 ${isSticky && header.column.id === providerNameCol ? 'sticky-provider-name' : ''}`}
                    style={isSticky && header.column.id === providerNameCol ? { position: 'sticky', left: 0, zIndex: 2, background: 'white', boxShadow: '2px 0 2px -1px rgba(0,0,0,0.04)' } : {}}
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
                    className={`border-b p-2 ${isSticky && cell.column.id === providerNameCol ? 'sticky-provider-name' : ''}`}
                    style={isSticky && cell.column.id === providerNameCol ? { position: 'sticky', left: 0, zIndex: 1, background: 'white', boxShadow: '2px 0 2px -1px rgba(0,0,0,0.04)' } : {}}
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