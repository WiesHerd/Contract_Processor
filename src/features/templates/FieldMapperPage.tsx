import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, AlertTriangle, Sparkles, ArrowLeft } from 'lucide-react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { CommandDialog } from '@/components/ui/command';
import localforage from 'localforage';
import { setUploadedColumns } from '@/features/providers/providersSlice';
import { updateMapping, setMapping, FieldMapping, TemplateMapping } from './mappingsSlice';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Mapping {
  placeholder: string;
  mappedColumn?: string;
  notes?: string;
}

// Replace CommandSelect with Select-based dropdown
function FieldSelect({
  value,
  options,
  onChange,
  placeholder = 'Select field',
}: {
  value: string | undefined;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
}) {
  return (
    <Select
      value={typeof value === 'string' ? value : 'none'}
      onValueChange={val => onChange(val === 'none' ? '' : val)}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">-- Select --</SelectItem>
        {options.map(opt => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function FieldMapperPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const template = useSelector((state: RootState) => state.templates.templates.find(t => t.id === templateId));
  const columns = useSelector((state: RootState) => state.providers.uploadedColumns) || [];
  const provider = useSelector((state: RootState) => state.providers.providers[0]);
  const existingMapping = useSelector((state: RootState) => state.mappings.mappings[templateId || '']);

  // Hydrate columns from localforage if empty
  useEffect(() => {
    if (columns.length === 0) {
      localforage.getItem<string[]>('uploadedColumns').then(cols => {
        if (Array.isArray(cols) && cols.length > 0) {
          dispatch(setUploadedColumns(cols));
        }
      });
    }
  }, [columns, dispatch]);

  if (!template || !templateId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Template Not Found</h2>
        <p className="text-gray-600 mb-4">The template you are trying to map does not exist. Please return to the Templates page and try again.</p>
        <Button onClick={() => navigate('/templates')}>Back to Templates</Button>
      </div>
    );
  }

  // Initialize mapping state from Redux or create new
  const [mapping, setMappingState] = useState<FieldMapping[]>(() => {
    if (existingMapping) {
      return existingMapping.mappings;
    }
    return template.placeholders.map((ph: string) => ({ placeholder: ph }));
  });

  const [search, setSearch] = useState('');
  const [autoMapActive, setAutoMapActive] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');

  const mappedCount = mapping.filter(m => m.mappedColumn).length;
  const totalCount = mapping.length;
  const percent = Math.round((mappedCount / totalCount) * 100);

  // Filtered mapping and placeholders
  const filteredMapping = mapping.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'mapped') return !!m.mappedColumn;
    if (filter === 'unmapped') return !m.mappedColumn;
    return true;
  });
  const filteredPlaceholders = template.placeholders.filter((ph: string) => {
    const m = mapping.find(m => m.placeholder === ph);
    if (search && !ph.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'all') return true;
    if (filter === 'mapped') return m && !!m.mappedColumn;
    if (filter === 'unmapped') return m && !m.mappedColumn;
    return true;
  });

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const handlePlaceholderClick = (ph: string) => {
    rowRefs.current[ph]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAutoMap = () => {
    setMappingState((prev: FieldMapping[]) =>
      prev.map((m: FieldMapping) => {
        if (m.mappedColumn) return m;
        const cleanPh = m.placeholder.replace(/[{}]/g, '').toLowerCase();
        const found = columns.find(col =>
          col.toLowerCase() === cleanPh || col.toLowerCase().includes(cleanPh)
        );
        return found ? { ...m, mappedColumn: found } : m;
      })
    );
    setAutoMapActive(true);
    setTimeout(() => setAutoMapActive(false), 1200);
  };

  const handleSave = () => {
    const mappingData: TemplateMapping = {
      templateId: templateId as string,
      mappings: mapping,
      lastModified: new Date().toISOString(),
    };
    
    dispatch(setMapping({
      templateId: templateId as string,
      mapping: mappingData,
    }));
    
    navigate('/templates');
  };

  // Update mapping in Redux when it changes
  useEffect(() => {
    dispatch(updateMapping({
      templateId: templateId as string,
      mappings: mapping,
    }));
  }, [mapping, templateId, dispatch]);

  const hasUnmapped = mapping.some(m => !m.mappedColumn);

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      <div className="flex items-center justify-between border-b pb-4 mb-4 bg-white px-4 pt-6 rounded-lg shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Button variant="ghost" size="sm" onClick={() => navigate('/templates')} className="gap-1">
              <ArrowLeft className="h-4 w-4" />
              Back to Templates
            </Button>
            <span>/</span>
            <span className="font-semibold text-gray-700">{template.name}</span>
          </div>
          <h1 className="text-2xl font-bold">Map Placeholders to Provider Fields</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={handleAutoMap}
            className={`gap-2 ${autoMapActive ? 'bg-blue-50 text-blue-700' : ''}`}
          >
            <Sparkles className="h-4 w-4" /> 
            Auto-Map
          </Button>
          <Button
            variant="default"
            disabled={hasUnmapped}
            onClick={handleSave}
            className="gap-2"
          >
            Save & Continue
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Placeholders */}
        <Card className="col-span-3 p-4">
          <div className="space-y-4">
            <Input
              placeholder="Search placeholders..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full"
            />
            <div className="flex gap-2 mb-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
              <Button variant={filter === 'mapped' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('mapped')}>Mapped</Button>
              <Button variant={filter === 'unmapped' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('unmapped')}>Unmapped</Button>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-1">
                {filteredPlaceholders.map((ph: string) => {
                  const isMapped = mapping.find(m => m.placeholder === ph)?.mappedColumn;
                  return (
                    <button
                      key={ph}
                      onClick={() => handlePlaceholderClick(ph)}
                      className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors ${
                        isMapped 
                          ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      <span className="font-mono truncate">{ph}</span>
                      {isMapped ? <CheckCircle className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </Card>

        {/* Right: Mapping Table */}
        <Card className="col-span-9 p-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Mapping Progress</h2>
                <p className="text-sm text-gray-500">
                  {mappedCount} of {totalCount} fields mapped ({percent}%)
                </p>
              </div>
              {hasUnmapped && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Some fields are unmapped</span>
                </div>
              )}
            </div>
            <div className="flex gap-2 mb-2">
              <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}>All</Button>
              <Button variant={filter === 'mapped' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('mapped')}>Mapped</Button>
              <Button variant={filter === 'unmapped' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('unmapped')}>Unmapped</Button>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  percent === 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <ScrollArea className="h-[calc(100vh-400px)]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Placeholder</TableHead>
                    <TableHead>Mapped Column</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMapping.map((m, idx) => {
                    const col = m.mappedColumn && provider ? provider[m.mappedColumn] : undefined;
                    const isMapped = !!m.mappedColumn;
                    return (
                      <TableRow
                        key={m.placeholder}
                        ref={el => (rowRefs.current[m.placeholder] = el)}
                        className={isMapped ? 'bg-green-50/50' : 'bg-red-50/50'}
                      >
                        <TableCell className="font-mono text-sm">{m.placeholder}</TableCell>
                        <TableCell>
                          <FieldSelect
                            value={m.mappedColumn}
                            options={columns}
                            onChange={val =>
                              setMappingState((prev: FieldMapping[]) =>
                                prev.map((mm: FieldMapping, i: number) =>
                                  i === idx ? { ...mm, mappedColumn: val } : mm
                                )
                              )
                            }
                            placeholder="Select field"
                          />
                        </TableCell>
                        <TableCell>
                          {col !== undefined ? (
                            <span className="text-sm text-gray-700">{String(col)}</span>
                          ) : (
                            <span className="text-sm text-gray-400">--</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={m.notes || ''}
                            onChange={e =>
                              setMappingState((prev: FieldMapping[]) =>
                                prev.map((mm: FieldMapping, i: number) =>
                                  i === idx ? { ...mm, notes: e.target.value } : mm
                                )
                              )
                            }
                            placeholder="Notes or logic (optional)"
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          {isMapped ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </Card>
      </div>
    </div>
  );
} 