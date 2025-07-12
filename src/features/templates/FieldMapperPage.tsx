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
import { CheckCircle, XCircle, AlertTriangle, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { CommandDialog } from '@/components/ui/command';
import localforage from 'localforage';
import { updateMapping, setMapping, FieldMapping, LocalTemplateMapping } from './mappingsSlice';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { awsMappings } from '@/utils/awsServices';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import type { AppDispatch } from '@/store';
import { v4 as uuidv4 } from 'uuid';
import { Mapping as AWSMapping } from '@/API';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { fetchProviders } from '@/store/slices/providerSlice';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { generateClient } from 'aws-amplify/api';
import { createTemplateMapping, updateTemplateMapping } from '@/graphql/mutations';
import { getTemplateMapping, listTemplateMappings } from '@/graphql/queries';
import { CreateTemplateMappingInput, UpdateTemplateMappingInput } from '@/API';

interface LocalMapping {
  placeholder: string;
  mappedColumn?: string;
  notes?: string;
}

// Enhanced Field Select with search and categorization
function FieldSelect({
  value,
  options,
  onChange,
  placeholder = 'Select field',
  fieldDataCount,
}: {
  value: string | undefined;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  fieldDataCount?: Map<string, number>;
}) {
  const NONE_VALUE = '--NONE--';
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useClickOutside(containerRef, () => setOpen(false));

  // Filter fields based on search query
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      
      if (e.key === 'Escape') {
        setOpen(false);
        setSearchQuery('');
      } else if (e.key === 'Enter' && filteredOptions.length > 0) {
        // Select first filtered option
        onChange(filteredOptions[0]);
        setOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, filteredOptions, onChange]);

  // Categorize fields for better organization
  const categorizeFields = (fields: string[]) => {
    const categories = {
      'Basic Info': [] as string[],
      'FTE & Scheduling': [] as string[],
      'Compensation': [] as string[],
      'Dates & Time': [] as string[],
      'Medical & Clinical': [] as string[],
      'Administrative': [] as string[],
      'Other': [] as string[]
    };

    fields.forEach(field => {
      const fieldLower = field.toLowerCase();
      
      if (fieldLower.includes('name') || fieldLower.includes('id') || fieldLower.includes('email') || 
          fieldLower.includes('phone') || fieldLower.includes('address') || fieldLower.includes('title')) {
        categories['Basic Info'].push(field);
      } else if (fieldLower.includes('fte') || fieldLower.includes('schedule') || fieldLower.includes('hours') ||
                 fieldLower.includes('shift') || fieldLower.includes('call') || fieldLower.includes('clinic')) {
        categories['FTE & Scheduling'].push(field);
      } else if (fieldLower.includes('salary') || fieldLower.includes('wage') || fieldLower.includes('pay') ||
                 fieldLower.includes('compensation') || fieldLower.includes('bonus') || fieldLower.includes('incentive') ||
                 fieldLower.includes('wrvu') || fieldLower.includes('conversion') || fieldLower.includes('rate')) {
        categories['Compensation'].push(field);
      } else if (fieldLower.includes('date') || fieldLower.includes('year') || fieldLower.includes('month') ||
                 fieldLower.includes('day') || fieldLower.includes('time') || fieldLower.includes('start') ||
                 fieldLower.includes('end') || fieldLower.includes('expire')) {
        categories['Dates & Time'].push(field);
      } else if (fieldLower.includes('medical') || fieldLower.includes('clinical') || fieldLower.includes('specialty') ||
                 fieldLower.includes('subspecialty') || fieldLower.includes('department') || fieldLower.includes('division') ||
                 fieldLower.includes('provider') || fieldLower.includes('physician') || fieldLower.includes('doctor')) {
        categories['Medical & Clinical'].push(field);
      } else if (fieldLower.includes('admin') || fieldLower.includes('management') || fieldLower.includes('director') ||
                 fieldLower.includes('chief') || fieldLower.includes('head') || fieldLower.includes('leader') ||
                 fieldLower.includes('organization') || fieldLower.includes('contract') || fieldLower.includes('agreement')) {
        categories['Administrative'].push(field);
      } else {
        categories['Other'].push(field);
      }
    });

    // Sort fields within each category
    Object.keys(categories).forEach(cat => {
      categories[cat as keyof typeof categories].sort((a, b) => {
        // Sort by data availability first, then alphabetically
        const aCount = fieldDataCount?.get(a) || 0;
        const bCount = fieldDataCount?.get(b) || 0;
        if (aCount !== bCount) return bCount - aCount;
        return a.localeCompare(b);
      });
    });

    return categories;
  };

  const categorizedFields = categorizeFields(filteredOptions);

  // Get data availability indicator
  const getDataIndicator = (field: string) => {
    const count = fieldDataCount?.get(field) || 0;
    const total = fieldDataCount ? Array.from(fieldDataCount.values()).reduce((max, val) => Math.max(max, val), 0) : 0;
    
    if (count === 0) return { color: 'text-gray-400', text: 'No data' };
    if (count === total) return { color: 'text-green-600', text: 'All records' };
    if (count > total * 0.8) return { color: 'text-blue-600', text: 'Most records' };
    if (count > total * 0.5) return { color: 'text-yellow-600', text: 'Some records' };
    return { color: 'text-orange-600', text: 'Few records' };
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        className="w-[280px] justify-between"
        onClick={() => setOpen(!open)}
      >
        {value && value !== NONE_VALUE ? (
          <span className="flex items-center">
            <span className="truncate">{value}</span>
            {fieldDataCount && (
              <span className={`ml-2 text-xs ${getDataIndicator(value).color}`}>
                •
              </span>
            )}
          </span>
        ) : (
          placeholder
        )}
        <span className="ml-2 h-4 w-4 shrink-0 opacity-50">⌄</span>
      </Button>
      
      {open && (
        <div className="absolute z-50 w-[400px] mt-1 bg-white border rounded-md shadow-lg">
          <div className="p-3 border-b">
            <Input
              placeholder="Search fields..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
              autoFocus
            />
            <div className="text-xs text-gray-500 mt-1">
              {filteredOptions.length} of {options.length} fields
            </div>
          </div>
          
          <ScrollArea className="max-h-96">
            <div className="p-2">
              {/* None option */}
              <div
                className="flex items-center px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  onChange('');
                  setOpen(false);
                  setSearchQuery('');
                }}
              >
                <span className="text-gray-500">-- None --</span>
              </div>
              
              {/* Categorized fields */}
              {Object.entries(categorizedFields).map(([category, fields]) => {
                if (fields.length === 0) return null;
                
                return (
                  <div key={category} className="mt-3">
                    <div className="px-2 py-1 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {category} ({fields.length})
                    </div>
                    {fields.map((field) => {
                      const indicator = getDataIndicator(field);
                      return (
                        <div
                          key={field}
                          className="flex items-center justify-between px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            onChange(field);
                            setOpen(false);
                            setSearchQuery('');
                          }}
                        >
                          <span className="truncate flex-1">{field}</span>
                          {fieldDataCount && (
                            <span className={`ml-2 text-xs ${indicator.color} flex items-center`}>
                              <span className="w-2 h-2 rounded-full bg-current mr-1"></span>
                              <span className="hidden sm:inline">{indicator.text}</span>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              
              {filteredOptions.length === 0 && (
                <div className="px-2 py-4 text-sm text-gray-500 text-center">
                  No fields found matching "{searchQuery}"
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

// Click outside to close
function useClickOutside(ref: React.RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, handler]);
}

// NOTE: Amplify is configured in main.tsx to use VITE_AWS_APPSYNC_GRAPHQL_ENDPOINT if present.
const client = generateClient();

// Fetch all TemplateMapping records for a templateId
async function fetchTemplateMappingsByTemplateId(templateId: string) {
  const result = await client.graphql({
    query: listTemplateMappings,
    variables: { filter: { templateID: { eq: templateId } }, limit: 1000 },
  });
  return result.data?.listTemplateMappings?.items || [];
}

// Upsert (create or update) TemplateMapping records for each placeholder
async function saveTemplateMappings(mapping: FieldMapping[], templateId: string) {
  const results = [];
  
  // First, fetch existing mappings to see what exists
  const existingMappings = await fetchTemplateMappingsByTemplateId(templateId);
  
  for (const m of mapping) {
    if (!m.placeholder) continue;
    
    const input = {
      templateID: templateId,
      field: m.placeholder,
      value: m.mappedColumn || '',
      notes: m.notes || '',
    };
    
    console.log('Saving mapping:', input);
    
    // Check if mapping already exists
    const existingMapping = existingMappings.find((existing: any) => 
      existing.templateID === templateId && existing.field === m.placeholder
    );
    
    try {
      if (existingMapping) {
        // Update existing mapping
        const updateInput = {
          id: existingMapping.id,
          ...input
        };
        
      const updateResult = await client.graphql({
        query: updateTemplateMapping,
          variables: { input: updateInput },
      });
      console.log('Update result:', updateResult);
        results.push(input);
      } else {
        // Create new mapping (let DynamoDB auto-generate the ID)
      const createResult = await client.graphql({
        query: createTemplateMapping,
          variables: { input },
      });
      console.log('Create result:', createResult);
        results.push(input);
      }
    } catch (err) {
      console.error('Failed to save mapping:', input, err);
      throw new Error(`Failed to save mapping for ${m.placeholder}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }
  
  return results;
}

export default function FieldMapperPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const template = useSelector((state: RootState) => state.templates.templates.find(t => t.id === templateId));
  
  // Get providers and derive columns directly from live data, not localforage
  const providers = useSelector((state: RootState) => state.provider.providers);
  const providerLoading = useSelector((state: RootState) => state.provider.loading);
  const [columns, setColumns] = useState<string[]>([]);
  const [fieldDataCount, setFieldDataCount] = useState<Map<string, number>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasTriedFetch, setHasTriedFetch] = useState(false);

  // Fetch providers if missing on mount
  useEffect(() => {
    console.log('FieldMapperPage - Provider state check:', {
      providersCount: providers?.length || 0,
      providerLoading,
      hasTriedFetch,
      firstProvider: providers?.[0] ? Object.keys(providers[0]) : 'No providers'
    });
    
    if ((!providers || providers.length === 0) && !providerLoading && !hasTriedFetch) {
      console.log('FieldMapperPage - Fetching providers...');
      dispatch(fetchProviders());
      setHasTriedFetch(true);
    }
  }, [providers, providerLoading, hasTriedFetch, dispatch]);

  useEffect(() => {
    console.log('FieldMapperPage - Column detection triggered:', {
      providersCount: providers?.length || 0,
      firstProviderKeys: providers?.[0] ? Object.keys(providers[0]) : 'No providers',
      firstProviderDynamicFields: providers?.[0]?.dynamicFields ? Object.keys(providers[0].dynamicFields) : 'No dynamic fields'
    });
    
    if (providers && providers.length > 0) {
      // Collect all fields from all providers (both flat fields and dynamicFields)
      const allFields = new Set<string>();
      const dataCount = new Map<string, number>();
      
      providers.forEach((provider, index) => {
        // Add flat fields (excluding system fields)
        Object.keys(provider).forEach(key => {
          if (key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && key !== '__typename' && key !== 'dynamicFields') {
            allFields.add(key);
            const value = (provider as any)[key];
            // Count data availability
            if (value !== null && value !== undefined && value !== '') {
              dataCount.set(key, (dataCount.get(key) || 0) + 1);
            }
          }
        });
        
        // Add dynamicFields (handle both string and object formats)
        if (provider.dynamicFields) {
          try {
            // Parse dynamicFields if it's a JSON string, otherwise use as-is
            const dynamicFieldsObj = typeof provider.dynamicFields === 'string' 
              ? JSON.parse(provider.dynamicFields) 
              : provider.dynamicFields;
            
            if (dynamicFieldsObj && typeof dynamicFieldsObj === 'object') {
              const dynamicKeys = Object.keys(dynamicFieldsObj);
              if (index < 3) {
                console.log(`Provider ${index} dynamicFields keys:`, dynamicKeys.slice(0, 10), '... (showing first 10)');
              }
              
              dynamicKeys.forEach(key => {
                allFields.add(key);
                const value = dynamicFieldsObj[key];
                // Count data availability
                if (value !== null && value !== undefined && value !== '') {
                  dataCount.set(key, (dataCount.get(key) || 0) + 1);
                }
              });
            }
          } catch (e) {
            if (index < 3) {
              console.warn(`Provider ${index} dynamicFields parsing failed:`, e);
            }
          }
        }
      });
      
      // Convert to sorted array for consistent ordering
      const sortedFields = Array.from(allFields).sort((a, b) => {
        // Priority order for important fields
        const priorityOrder = ['name', 'employeeId', 'providerType', 'specialty', 'subspecialty', 'fte', 'baseSalary', 'startDate'];
        const aPriority = priorityOrder.indexOf(a);
        const bPriority = priorityOrder.indexOf(b);
        
        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;
        
        // Sort by data availability (fields with more data first)
        const aCount = dataCount.get(a) || 0;
        const bCount = dataCount.get(b) || 0;
        if (aCount !== bCount) return bCount - aCount;
        
        // Alphabetical as fallback
        return a.localeCompare(b);
      });
      
      setColumns(sortedFields);
      setFieldDataCount(dataCount);
      console.log('Available columns for mapping:', sortedFields);
      console.log('Total columns detected:', sortedFields.length);
      console.log('All fields before sorting:', Array.from(allFields));
      console.log('FTE fields found:', Array.from(allFields).filter(f => f.toLowerCase().includes('fte')));
      console.log('Columns with data counts:', Object.fromEntries(Array.from(dataCount.entries()).sort((a, b) => b[1] - a[1])));
    }
  }, [providers]);

  const provider = providers[0] as { [key: string]: any } | undefined;
  const existingMapping = useSelector((state: RootState) => state.mappings.mappings[templateId || '']);

  // Initialize mapping state from Redux or create new
  const [mapping, setMappingState] = useState<FieldMapping[]>(() => {
    return template?.placeholders.map((ph: string) => ({ placeholder: ph })) || [];
  });

  const [search, setSearch] = useState('');
  const [autoMapActive, setAutoMapActive] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // Load existing mappings from AWS when component mounts
  useEffect(() => {
    const loadTemplateMappings = async () => {
      if (!templateId) return;
      setIsLoading(true);
      setError(null);
      try {
        console.log('Loading mappings for template:', templateId);
        const mappingRecords = await fetchTemplateMappingsByTemplateId(templateId);
        console.log('Loaded mapping records:', mappingRecords);
        if (mappingRecords && mappingRecords.length > 0) {
          const hydrated = template?.placeholders.map((ph: string) => {
            const found = mappingRecords.find((rec: any) => rec.field === ph);
            return found
              ? { placeholder: ph, mappedColumn: found.value ?? undefined, notes: found.notes ?? undefined }
              : { placeholder: ph };
          }) || [];
          console.log('Hydrated mappings:', hydrated);
          setMappingState(hydrated);
          dispatch(setMapping({
            templateId,
            mapping: {
              templateId,
              mappings: hydrated,
              lastModified: new Date().toISOString(),
            },
          }));
        } else {
          console.log('No existing mappings found');
          setMappingState(template?.placeholders.map((ph: string) => ({ placeholder: ph })) || []);
        }
      } catch (err) {
        console.error('Error loading template mappings:', err);
        setError(`Failed to load template mappings: ${err instanceof Error ? err.message : 'Unknown error'}`);
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplateMappings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, template, dispatch]);

  // Hydrate columns from localforage if empty
  /*
  useEffect(() => {
    localforage.getItem<string[]>('uploadedColumns').then(cols => {
      if (Array.isArray(cols) && cols.length > 0) {
        setColumns(cols);
      }
    });
  }, []);
  */

  const mappedCount = mapping.filter(m => m.mappedColumn).length;
  const totalCount = mapping.length;
  const percent = totalCount > 0 ? Math.round((mappedCount / totalCount) * 100) : 0;

  // Filtered mapping and placeholders
  // Unified filter for both sides
  const filteredMapping = mapping.filter(m => {
    const matchesSearch = !search || m.placeholder.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'all') return true;
    if (filter === 'mapped') return !!m.mappedColumn;
    if (filter === 'unmapped') return !m.mappedColumn;
    return true;
  });
  const filteredPlaceholders = filteredMapping.map(m => m.placeholder);

  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const handlePlaceholderClick = (ph: string) => {
    rowRefs.current[ph]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleAutoMap = () => {
    setMappingState((prev) =>
      prev.map((m) => {
        if (m.mappedColumn) return m;

        const normalize = (str: string) => str.replace(/[\s_{}-]/g, '').toLowerCase();
        
        // An alias map to handle common, predictable discrepancies.
        const aliasMap: { [key: string]: string } = {
          providername: 'name',
          // future aliases can be added here
        };

        const cleanPh = normalize(m.placeholder);
        const targetColumnName = aliasMap[cleanPh] || cleanPh;

        // Pass 1: Find an exact match using the (potentially aliased) target name.
        let found = columns.find((col) => normalize(col) === targetColumnName);

        // Pass 2: If no exact match, try a partial match.
        // This helps with cases like placeholder `wRVU` and column `wRVUTarget`.
        if (!found) {
          found = columns.find((col) => normalize(col).includes(targetColumnName));
        }

        return found ? { ...m, mappedColumn: found } : m;
      })
    );
    setAutoMapActive(true);
    setTimeout(() => setAutoMapActive(false), 1200);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      console.log('Saving mappings for template:', templateId);
      console.log('Mappings to save:', mapping);
      await saveTemplateMappings(mapping, templateId!);
      toast.success('Mappings saved successfully');
    } catch (err) {
      console.error('Error saving mappings:', err);
      setError(`Failed to save mappings: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to save mappings');
    } finally {
      setIsSaving(false);
    }
  };

  // Update mapping in Redux when it changes
  useEffect(() => {
    dispatch(updateMapping({
      templateId: templateId as string,
      mappings: mapping,
    }));
  }, [mapping, templateId, dispatch]);

  const hasUnmapped = mapping.some(m => !m.mappedColumn);

  if (!template || !templateId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Template Not Found</h2>
        <p className="text-gray-600 mb-4">The template you are trying to map does not exist. Please return to the Templates page and try again.</p>
        <Button onClick={() => navigate('/templates')}>Back to Templates</Button>
      </div>
    );
  }

  if (providerLoading || (!hasTriedFetch && (!providers || providers.length === 0))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner 
          size="md" 
          message="Loading provider data..." 
          color="primary"
        />
      </div>
    );
  }

  if (!providers || providers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold text-amber-600 mb-4">No Provider Data</h2>
        <p className="text-gray-600 mb-4">Provider data must be loaded to map template fields. Please upload a provider CSV first.</p>
        <Button onClick={() => navigate('/providers')}>Go to Provider Data</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <LoadingSpinner 
          size="md" 
          message="Loading existing field mappings from AWS..." 
          color="primary"
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 space-y-6">
      {/* Consistent Page Header */}
      <PageHeader
        title="Map Placeholders to Provider Fields"
        description={template.name}
        rightContent={
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={handleAutoMap}
              className={`gap-2 ${autoMapActive ? 'bg-blue-50 text-blue-700' : ''}`}
              disabled={isSaving}
            >
              <Sparkles className="h-4 w-4" /> 
              Auto-Map
            </Button>
            <Button
              variant="default"
              onClick={handleSave}
              className="gap-2"
              disabled={isSaving || hasUnmapped}
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" inline />
                  <span>Saving...</span>
                </>
              ) : (
                'Save & Continue'
              )}
            </Button>
          </div>
        }
      />
      <div className="grid grid-cols-12 gap-6 min-h-[600px] items-stretch">
        {/* Left: Placeholders */}
        <Card className="col-span-3 p-4 bg-white flex flex-col h-full min-w-[220px]">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-1">Template Placeholders</h2>
            <p className="text-xs text-gray-500">{filteredPlaceholders.length} of {template.placeholders.length} placeholders</p>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-1">
              {filteredPlaceholders.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  No placeholders match your search.<br />
                  <span className="text-xs">Try a different keyword or filter.</span>
                </div>
              ) : (
                filteredPlaceholders.map((ph: string) => {
                  const isMapped = mapping.find(m => m.placeholder === ph)?.mappedColumn;
                  return (
                    <button
                      key={ph}
                      onClick={() => handlePlaceholderClick(ph)}
                      className={`w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm transition-colors bg-white hover:bg-blue-50 ${isMapped ? 'text-green-700' : 'text-red-700'}`}
                    >
                      <span className="font-mono truncate">{ph}</span>
                      {isMapped ? <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" /> : <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>
        {/* Right: Mapping Table */}
        <Card className="col-span-9 p-4 h-full min-h-0 flex flex-col">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Mapping Progress</h2>
                <p className="text-sm text-gray-600">
                  {mappedCount} of {totalCount} template fields mapped ({percent}%) • {columns.length} database fields available
                </p>
              </div>
              {hasUnmapped && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">Some fields are unmapped</span>
                </div>
              )}
            </div>
            {/* Filter tabs and search on the same row */}
            <div className="flex items-center justify-between mb-2">
              <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'mapped' | 'unmapped')} className="">
                <TabsList className="flex gap-2 border-b border-blue-200 bg-transparent justify-start">
                  <TabsTrigger value="all" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                    data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                    data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                    All <span className="ml-1 text-xs">({totalCount})</span>
                  </TabsTrigger>
                  <TabsTrigger value="mapped" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                    data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                    data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                    Mapped <span className="ml-1 text-xs">({mappedCount})</span>
                  </TabsTrigger>
                  <TabsTrigger value="unmapped" className="px-5 py-2 font-semibold text-sm border border-b-0 rounded-t-md transition-colors focus:outline-none focus:ring-0
                    data-[state=active]:bg-white data-[state=active]:text-blue-900 data-[state=active]:border-blue-300
                    data-[state=inactive]:bg-blue-100 data-[state=inactive]:text-blue-700 data-[state=inactive]:border-blue-200">
                    Unmapped <span className="ml-1 text-xs">({totalCount - mappedCount})</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search placeholders..."
                className="max-w-xs ml-4"
                aria-label="Search placeholders"
              />
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  percent === 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
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
                              onChange={val => {
                                setMappingState(current =>
                                  current.map(item =>
                                    item.placeholder === m.placeholder ? { ...item, mappedColumn: val } : item
                                  )
                                );
                              }}
                              fieldDataCount={fieldDataCount}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-gray-500 truncate max-w-xs">
                            {m.mappedColumn && provider ? (() => {
                              // First try flat field
                              let value = (provider as any)[m.mappedColumn];
                              
                              // If not found, try dynamicFields
                              if (value === null || value === undefined) {
                                if (provider.dynamicFields) {
                                  try {
                                    const dynamicFieldsObj = typeof provider.dynamicFields === 'string' 
                                      ? JSON.parse(provider.dynamicFields) 
                                      : provider.dynamicFields;
                                    if (dynamicFieldsObj && typeof dynamicFieldsObj === 'object') {
                                      value = dynamicFieldsObj[m.mappedColumn];
                                    }
                                  } catch (e) {
                                    // Ignore parsing errors for preview
                                  }
                                }
                              }
                              
                              return value !== null && value !== undefined ? String(value) : <i className="text-gray-400">No preview</i>;
                            })() : <i className="text-gray-400">No preview</i>}
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
              </div>
            </ScrollArea>
          </div>
        </Card>
      </div>
    </div>
  );
} 