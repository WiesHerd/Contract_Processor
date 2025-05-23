import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  Object.entries(row).forEach(([csvKey, value]) => {
    // Case-insensitive mapping
    const lowerKey = csvKey.toLowerCase();
    const mappedKey =
      Object.keys(csvToProviderFieldMap).find(
        k => k.toLowerCase() === lowerKey
      )
        ? csvToProviderFieldMap[
            Object.keys(csvToProviderFieldMap).find(
              k => k.toLowerCase() === lowerKey
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
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({ left: ['name'] });
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableMinWidth] = useState(1200);
  const [fteRange, setFteRange] = useState<[number, number]>([0, 1]);
  const [credential, setCredential] = useState('__all__');
  const [specialty, setSpecialty] = useState('__all__');

  const uploadedColumns = useSelector((state: RootState) => state.providers.uploadedColumns);

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

  // No top scrollbar, so no scroll sync needed

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        // Map CSV fields to internal fields for provider data
        const mappedData = results.data.map(mapCsvRowToProviderFields);
        // Store original CSV headers (fields) for mapping UI
        const cols = results.meta.fields || [];
        dispatch(setUploadedColumns(cols));
        dispatch(addProvidersFromCSV(mappedData));
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
  const providerNameCol = uploadedColumns.find(col => col.toLowerCase().includes('providername') || col.toLowerCase() === 'name');

  // Get unique credentials and specialties from the actual column in provider data
  const credentialOptions = credentialsCol
    ? Array.from(new Set(providers.map(p => String(p[credentialsCol] ?? '').trim()).filter(v => v)))
    : [];
  const specialtyOptions = specialtyCol
    ? Array.from(new Set(providers.map(p => String(p[specialtyCol] ?? '').trim()).filter(v => v)))
    : [];

  // FTE filter (use only the normalized field)
  const filteredProviders = React.useMemo(() =>
    providers.filter((row: Provider) => {
      const fte = typeof row.fte === 'number' ? row.fte : Number(row.fte ?? 0);
      const ftePass = fte >= fteRange[0] && fte <= fteRange[1];
      // Credential filter (dynamic)
      const credPass = credential === '__all__' || (credentialsCol && String(row[credentialsCol] ?? '').trim() === credential);
      // Specialty filter (dynamic)
      const specPass = specialty === '__all__' || (specialtyCol && String(row[specialtyCol] ?? '').trim() === specialty);
      // Search filter
      const searchPass = uploadedColumns.some(col => String(row[col] || '').toLowerCase().includes(search.toLowerCase()));
      return ftePass && credPass && specPass && searchPass;
    }),
    [providers, uploadedColumns, search, fteRange, credential, specialty, credentialsCol, specialtyCol]
  );

  // TanStack Table column definitions (only uploaded columns, but override FTE to use normalized field)
  const columnDefs = React.useMemo<ColumnDef<Provider, any>[]>(
    () =>
      uploadedColumns.map(col => ({
        accessorKey: col,
        header: col,
        cell: (info: { getValue: () => any; row: any }) =>
          col.toLowerCase() === 'fte'
            ? (typeof info.row.original.fte === 'number' ? info.row.original.fte.toFixed(2) : String(info.row.original.fte))
            : String(info.getValue() || ''),
        enableSorting: true,
        size: providerNameCol && col === providerNameCol ? 220 : 120, // min width for name
        minSize: providerNameCol && col === providerNameCol ? 180 : 80,
        maxSize: 400,
        enableResizing: true,
        pin: providerNameCol && col === providerNameCol ? 'left' : false,
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
    [uploadedColumns, handleEdit, providerNameCol]
  );

  const table = useReactTable({
    data: filteredProviders,
    columns: columnDefs,
    state: { sorting, columnPinning },
    onSortingChange: setSorting,
    onColumnPinningChange: setColumnPinning,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
      <div className="bg-slate-50 p-4 rounded-md shadow-sm mb-2 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
        {/* Search Input */}
        <div className="flex flex-col w-full">
          <label className="text-sm font-medium text-gray-700 mb-1">Search Providers</label>
          <Input
            placeholder="Search providers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        {/* FTE Slider */}
        <div className="flex flex-col w-full min-w-[200px]">
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
        <div className="flex flex-col w-full">
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
        <div className="flex flex-col w-full">
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
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-gray-500">{filteredProviders.length} shown / {providers.length} total</span>
      </div>
      {/* Table with real horizontal scroll below */}
      <div className="overflow-x-auto border rounded-lg w-full max-w-none" ref={tableScrollRef} style={{ maxWidth: '100vw' }}>
        <table className="min-w-[1200px] table-auto text-sm">
          <thead className="bg-gray-100 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, colIdx) => (
                  <th
                    key={header.id}
                    className={`px-4 py-2 text-left font-semibold text-gray-700 border-b select-none cursor-pointer group sticky top-0 bg-gray-100 z-10 ${
                      providerNameCol && header.id === providerNameCol ? 'sticky left-0 bg-gray-100 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : ''
                    }`}
                    style={{
                      minWidth: header.column.getSize(),
                      maxWidth: header.column.getSize(),
                      left: providerNameCol && header.id === providerNameCol ? 0 : undefined,
                      zIndex: providerNameCol && header.id === providerNameCol ? 30 : 10,
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && (
                      <span className="ml-1 text-xs text-gray-400 group-hover:text-gray-600">
                        {header.column.getIsSorted() === 'asc' ? '▲' : header.column.getIsSorted() === 'desc' ? '▼' : ''}
                      </span>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none z-10"
                        style={{ userSelect: 'none' }}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={uploadedColumns.length + 1} className="text-center py-8 text-gray-400">No providers found.</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b transition-colors duration-150 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}
                >
                  {row.getVisibleCells().map((cell, colIdx) => (
                    <td
                      key={cell.id}
                      className={`px-4 py-2 border-r border-b ${
                        providerNameCol && cell.column.id === providerNameCol 
                          ? 'sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' 
                          : ''
                      } ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      style={{
                        minWidth: cell.column.getSize(),
                        maxWidth: cell.column.getSize(),
                        left: providerNameCol && cell.column.id === providerNameCol ? 0 : undefined,
                        zIndex: providerNameCol && cell.column.id === providerNameCol ? 20 : 1,
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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