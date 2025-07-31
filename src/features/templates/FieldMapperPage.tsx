import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, AlertTriangle, Sparkles, ArrowLeft, Loader2, ChevronDown, Database, Zap } from 'lucide-react';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { CommandDialog } from '@/components/ui/command';
import localforage from 'localforage';
import { updateMapping, setMapping, FieldMapping, LocalTemplateMapping, fetchMappingsIfNeeded, clearMappings } from './mappingsSlice';
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
// Add dynamic block import and types
import { DynamicBlockService, DynamicBlockResponse } from '@/services/dynamicBlockService';

interface LocalMapping {
  placeholder: string;
  mappedColumn?: string;
  mappedDynamicBlock?: string; // New field for dynamic block mapping
  mappingType?: 'field' | 'dynamic'; // New field to indicate mapping type
  notes?: string;
}

// Enhanced Field Select with search and categorization
function FieldSelect({
  value,
  options,
  onChange,
  placeholder = 'Select field',
  fieldDataCount,
  mappingType = 'field',
  dynamicBlocks,
  onMappingTypeChange,
  onDynamicBlockChange,
  selectedDynamicBlock,
}: {
  value: string | undefined;
  options: string[];
  onChange: (val: string) => void;
  placeholder?: string;
  fieldDataCount?: Map<string, number>;
  mappingType?: 'field' | 'dynamic';
  dynamicBlocks?: DynamicBlockResponse[];
  onMappingTypeChange?: (type: 'field' | 'dynamic') => void;
  onDynamicBlockChange?: (blockId: string) => void;
  selectedDynamicBlock?: string;
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

  // Filter dynamic blocks based on search query
  const filteredDynamicBlocks = dynamicBlocks?.filter(block =>
    block.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    block.placeholder.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

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
    <div ref={containerRef} className="space-y-2">
      {/* Modern Toggle Switch */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Field</span>
        </div>
        <Switch
          checked={mappingType === 'dynamic'}
          onCheckedChange={(checked) => onMappingTypeChange?.(checked ? 'dynamic' : 'field')}
        />
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-500" />
          <span className="text-sm text-gray-600">Dynamic</span>
        </div>
      </div>

      {/* Field or Dynamic Block Selector */}
      {mappingType === 'field' ? (
        <div className="relative">
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            onClick={() => setOpen(!open)}
          >
            {value ? value : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          
          {open && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search fields..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                />
              </div>
              
              <div className="p-1">
                <div
                  className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded"
                  onClick={() => {
                    onChange(NONE_VALUE);
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  -- None --
                </div>
                
                {filteredOptions.map((option) => (
                  <div
                    key={option}
                    className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded flex items-center justify-between"
                    onClick={() => {
                      onChange(option);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <span>{option}</span>
                    {fieldDataCount && (
                      <span className="text-xs text-gray-500">
                        {fieldDataCount.get(option) || 0} records
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            onClick={() => setOpen(!open)}
          >
            {selectedDynamicBlock ? 
              dynamicBlocks?.find(b => b.id === selectedDynamicBlock)?.name || 'Select dynamic block...' : 
              'Select dynamic block...'
            }
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
          
          {open && (
            <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="p-2 border-b">
                <Input
                  placeholder="Search dynamic blocks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                />
              </div>
              
              <div className="p-1">
                <div
                  className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded"
                  onClick={() => {
                    onDynamicBlockChange?.('');
                    setOpen(false);
                    setSearchQuery('');
                  }}
                >
                  -- None --
                </div>
                
                {filteredDynamicBlocks.map((block) => (
                  <div
                    key={block.id}
                    className="px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded"
                    onClick={() => {
                      onDynamicBlockChange?.(block.id);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="h-3 w-3 text-blue-500" />
                      <div className="font-medium">{block.name}</div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {`{{${block.placeholder}}}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
export async function fetchTemplateMappingsByTemplateId(templateId: string) {
  const result = await client.graphql({
    query: listTemplateMappings,
    variables: { filter: { templateID: { eq: templateId } }, limit: 1000 },
  });
  return result.data?.listTemplateMappings?.items || [];
}

// Upsert (create or update) TemplateMapping records for each placeholder
async function saveTemplateMappings(mapping: LocalMapping[], templateId: string) {
  const results = [];
  
  // First, fetch existing mappings to see what exists
  const existingMappings = await fetchTemplateMappingsByTemplateId(templateId);
  
  for (const m of mapping) {
    if (!m.placeholder) continue;
    
    // Determine the value to save based on mapping type
    let value = '';
    if (m.mappingType === 'dynamic' && m.mappedDynamicBlock) {
      value = `dynamic:${m.mappedDynamicBlock}`;
    } else if (m.mappingType === 'field' && m.mappedColumn) {
      value = m.mappedColumn;
    }
    
    console.log('🔍 Processing mapping:', {
      placeholder: m.placeholder,
      mappingType: m.mappingType,
      mappedColumn: m.mappedColumn,
      mappedDynamicBlock: m.mappedDynamicBlock,
      value,
      hasValue: !!value,
      templateId,
      organizationId: 'default-org-id'
    });
    
    // Skip mappings with empty values (unmapped fields)
    if (!value) {
      console.log('⏭️ Skipping unmapped field:', m.placeholder);
      continue;
    }
    
    // Validate required fields
    if (!m.placeholder || !templateId) {
      console.warn('⚠️ Skipping mapping with missing required fields:', {
        placeholder: m.placeholder,
        templateId,
        mapping: m
      });
      continue;
    }

    const input = {
      templateID: templateId,
      organizationId: 'default-org-id', // Required field - using consistent default
      field: m.placeholder,
      value: value || '', // Ensure value is never null
      notes: m.notes || '',
    };
    
    // Check if mapping already exists
    const existingMapping = existingMappings.find((existing: any) => 
      existing.templateID === templateId && existing.field === m.placeholder
    );
    
    try {
      console.log('🔍 Attempting to save mapping:', {
        placeholder: m.placeholder,
        mappingType: m.mappingType,
        mappedColumn: m.mappedColumn,
        mappedDynamicBlock: m.mappedDynamicBlock,
        value,
        input
      });

      if (existingMapping) {
        // Update existing mapping
        const updateInput = {
          id: existingMapping.id,
          ...input
        };
        
        console.log('🔄 Updating existing mapping:', updateInput);
        const updateResult = await client.graphql({
          query: updateTemplateMapping,
          variables: { input: updateInput },
        });
        console.log('✅ Update result:', updateResult);
        results.push(input);
      } else {
        // Create new mapping (let DynamoDB auto-generate the ID)
        console.log('🆕 Creating new mapping:', input);
        const createResult = await client.graphql({
          query: createTemplateMapping,
          variables: { input },
        });
        console.log('✅ Create result:', createResult);
        results.push(input);
      }
    } catch (err) {
      console.error('❌ Failed to save mapping:', {
        input,
        error: err,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : undefined
      });
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

  // Add dynamic blocks state
  const [dynamicBlocks, setDynamicBlocks] = useState<DynamicBlockResponse[]>([]);
  const [loadingDynamicBlocks, setLoadingDynamicBlocks] = useState(false);

  // Load dynamic blocks
  useEffect(() => {
    const loadDynamicBlocks = async () => {
      setLoadingDynamicBlocks(true);
      try {
        const blocks = await DynamicBlockService.listDynamicBlocks();
        setDynamicBlocks(blocks);
      } catch (error) {
        console.error('Error loading dynamic blocks:', error);
      } finally {
        setLoadingDynamicBlocks(false);
      }
    };
    loadDynamicBlocks();
  }, []);

  // Fetch providers if missing on mount
  useEffect(() => {
    if ((!providers || providers.length === 0) && !providerLoading && !hasTriedFetch) {
      // TODO: Fix provider fetching
      // dispatch(fetchProviders());
      setHasTriedFetch(true);
    }
  }, [providers, providerLoading, hasTriedFetch, dispatch]);

  useEffect(() => {
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
            // Ignore parsing errors for preview
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
    }
  }, [providers]);

  const provider = providers[0] as { [key: string]: any } | undefined;
  const existingMapping = useSelector((state: RootState) => state.mappings.mappings[templateId || '']);

  // Update mapping state type
  const [mapping, setMappingState] = useState<LocalMapping[]>(() => {
    return template?.placeholders.map((ph: string) => ({ 
      placeholder: ph, 
      mappingType: 'field' as const 
    })) || [];
  });

  const [search, setSearch] = useState('');
  const [autoMapActive, setAutoMapActive] = useState(false);
  const [filter, setFilter] = useState<'all' | 'mapped' | 'unmapped'>('all');

  // Smart caching for template mappings - Enterprise-grade
  useEffect(() => {
    const loadTemplateMappings = async () => {
      if (!templateId) return;
      setIsLoading(true);
      setError(null);
      
      try {
        // Use smart caching instead of direct database calls
        console.log('🔄 Loading template mappings with smart caching');
        await dispatch(fetchMappingsIfNeeded());
      } catch (error) {
        console.error('Error loading template mappings:', error);
        setError('Failed to load template mappings. Please try again.');
      } finally {
        setIsLoading(false);
        setHasTriedFetch(true);
      }
    };

    if (template && template.placeholders && template.placeholders.length > 0) {
      loadTemplateMappings();
    }
  }, [template, templateId, dispatch]);

  // Update mapping state when existingMapping changes (after cache loads)
  useEffect(() => {
    if (template?.placeholders) {
      if (existingMapping?.mappings && existingMapping.mappings.length > 0) {
        console.log('🔄 Updating mapping state from cached data');
        const hydrated = template.placeholders.map((ph: string) => {
          const found = existingMapping.mappings.find((rec: any) => rec.placeholder === ph);
          if (found) {
            // Parse the value to determine if it's a field or dynamic block
            let mappedColumn = found.mappedColumn ?? undefined;
            let mappedDynamicBlock = undefined;
            let mappingType: 'field' | 'dynamic' = 'field';
            
            // Check if the value is a dynamic block ID (starts with 'dynamic:')
            if (found.mappedColumn?.startsWith('dynamic:')) {
              mappedDynamicBlock = found.mappedColumn.substring(8); // Remove 'dynamic:' prefix
              mappedColumn = undefined;
              mappingType = 'dynamic';
            } else {
              // Validate that the mapped column still exists in the current dataset
              if (mappedColumn && columns.length > 0 && !columns.includes(mappedColumn)) {
                console.warn(`Column "${mappedColumn}" no longer exists in current dataset for placeholder "${ph}"`);
                // Clear the invalid mapping
                mappedColumn = undefined;
              }
            }
            
            return {
              placeholder: ph,
              mappedColumn,
              mappedDynamicBlock,
              mappingType,
              notes: found.notes ?? undefined
            };
          }
          return { placeholder: ph, mappingType: 'field' as const };
        });
        setMappingState(hydrated);
      } else {
        console.log('📝 No existing mappings found, initializing empty mappings');
        // No existing mappings, initialize with empty mappings
        const emptyMappings = template.placeholders.map((ph: string) => ({
          placeholder: ph,
          mappingType: 'field' as const,
        }));
        setMappingState(emptyMappings);
      }
    }
  }, [existingMapping, template, columns]);

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

  const mappedCount = mapping.filter(m => m.mappedColumn || m.mappedDynamicBlock).length;
  const totalCount = mapping.length;
  const percent = totalCount > 0 ? Math.round((mappedCount / totalCount) * 100) : 0;
  
  // Check for invalid mappings (mapped to columns that no longer exist)
  const invalidMappings = mapping.filter(m => 
    m.mappedColumn && columns.length > 0 && !columns.includes(m.mappedColumn)
  );
  const hasInvalidMappings = invalidMappings.length > 0;

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
        // Skip if already mapped to either field or dynamic block
        if (m.mappedColumn || m.mappedDynamicBlock) return m;

        const normalize = (str: string) => str.replace(/[\s_{}-]/g, '').toLowerCase();
        
        // An alias map to handle common, predictable discrepancies.
        const aliasMap: { [key: string]: string } = {
          providername: 'name',
          // future aliases can be added here
        };

        const cleanPh = normalize(m.placeholder);
        const targetColumnName = aliasMap[cleanPh] || cleanPh;

        // First, try to match with dynamic blocks for certain placeholders
        const dynamicBlockMatch = dynamicBlocks.find(block => 
          normalize(block.placeholder) === cleanPh || 
          normalize(block.name) === cleanPh ||
          (cleanPh.includes('breakdown') && normalize(block.placeholder).includes('breakdown')) ||
          (cleanPh.includes('fte') && normalize(block.placeholder).includes('fte'))
        );

        if (dynamicBlockMatch) {
          return { 
            ...m, 
            mappingType: 'dynamic' as const, 
            mappedDynamicBlock: dynamicBlockMatch.id 
          };
        }

        // Pass 1: Find an exact match using the (potentially aliased) target name.
        let found = columns.find((col) => normalize(col) === targetColumnName);

        // Pass 2: If no exact match, try a partial match.
        // This helps with cases like placeholder `wRVU` and column `wRVUTarget`.
        if (!found) {
          found = columns.find((col) => normalize(col).includes(targetColumnName));
        }

        return found ? { ...m, mappingType: 'field' as const, mappedColumn: found } : m;
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
      
      // Invalidate cache to force fresh fetch on next load
      console.log('🔄 Invalidating mappings cache after save');
      dispatch(clearMappings());
      
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
    // Convert LocalMapping to FieldMapping for Redux store
    const fieldMappings = mapping.map(m => ({
      placeholder: m.placeholder,
      mappedColumn: m.mappingType === 'field' ? m.mappedColumn : undefined,
      notes: m.notes
    }));
    
    dispatch(updateMapping({
      templateId: templateId as string,
      mappings: fieldMappings,
    }));
  }, [mapping, templateId, dispatch]);

  const hasUnmapped = mapping.some(m => !m.mappedColumn && !m.mappedDynamicBlock);

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
                  const mappingItem = mapping.find(m => m.placeholder === ph);
                  const isMapped = !!(mappingItem?.mappedColumn || mappingItem?.mappedDynamicBlock);
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
              {hasInvalidMappings && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{invalidMappings.length} mapping{invalidMappings.length === 1 ? '' : 's'} point{invalidMappings.length === 1 ? 's' : ''} to columns that no longer exist</span>
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
                      <TableHead className="w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMapping.map((m, idx) => {
                      const col = m.mappedColumn && provider ? provider[m.mappedColumn] : undefined;
                      const isMapped = !!(m.mappedColumn || m.mappedDynamicBlock);
                      const dynamicBlock = m.mappedDynamicBlock ? dynamicBlocks.find(b => b.id === m.mappedDynamicBlock) : undefined;
                      
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
                                    item.placeholder === m.placeholder ? { 
                                      ...item, 
                                      mappedColumn: val === 'none' ? undefined : val,
                                      mappedDynamicBlock: undefined // Clear dynamic block when selecting field
                                    } : item
                                  )
                                );
                              }}
                              fieldDataCount={fieldDataCount}
                              mappingType={m.mappingType || 'field'}
                              dynamicBlocks={dynamicBlocks}
                              selectedDynamicBlock={m.mappedDynamicBlock}
                              onMappingTypeChange={(type) => {
                                setMappingState(current =>
                                  current.map(item =>
                                    item.placeholder === m.placeholder ? { 
                                      ...item, 
                                      mappingType: type,
                                      mappedColumn: type === 'dynamic' ? undefined : item.mappedColumn,
                                      mappedDynamicBlock: type === 'field' ? undefined : item.mappedDynamicBlock
                                    } : item
                                  )
                                );
                              }}
                              onDynamicBlockChange={(blockId) => {
                                setMappingState(current =>
                                  current.map(item =>
                                    item.placeholder === m.placeholder ? { 
                                      ...item, 
                                      mappedDynamicBlock: blockId || undefined
                                    } : item
                                  )
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-gray-500 truncate max-w-xs">
                            {m.mappingType === 'dynamic' && dynamicBlock ? (
                              <div className="text-blue-600 flex items-center gap-2">
                                <Zap className="h-4 w-4" />
                                <div>
                                  <div className="font-medium">{dynamicBlock.name}</div>
                                  <div className="text-xs">Dynamic Block</div>
                                </div>
                              </div>
                            ) : (
                              m.mappedColumn && provider ? (() => {
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
                                
                                return value !== null && value !== undefined ? (
                                  <div className="flex items-center gap-2 text-gray-700">
                                    <Database className="h-3 w-3 text-gray-500" />
                                    <span>{String(value)}</span>
                                  </div>
                                ) : <i className="text-gray-400">No preview</i>;
                              })() : <i className="text-gray-400">No preview</i>
                            )}
                          </TableCell>
                          <TableCell>
                            {isMapped ? (
                              m.mappedColumn && !columns.includes(m.mappedColumn) ? (
                                <div className="flex items-center gap-2 text-amber-600">
                                  <AlertTriangle className="h-5 w-5" />
                                  <span className="text-xs">Invalid</span>
                                </div>
                              ) : (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              )
                            ) : (
                              <XCircle className="h-5 w-5 text-red-400" />
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