import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, RefreshCw, CheckCircle, XCircle, Info } from 'lucide-react';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { RootState } from '@/store';
import { useAwsUpload } from '@/hooks/useAwsUpload';
import { awsMappings } from '@/utils/awsServices';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import type { AppDispatch } from '@/store';
import { v4 as uuidv4 } from 'uuid';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PlaceholderMappingUIProps {
  template: Template;
  provider: Provider;
  onMappingComplete?: (mappings: Record<string, string>) => void;
}

interface MappingField {
  placeholder: string;
  mappedValue: string;
  source: 'provider' | 'manual' | 'calculated';
  status: 'mapped' | 'unmapped' | 'error';
}

export function PlaceholderMappingUI({ 
  template, 
  provider, 
  onMappingComplete 
}: PlaceholderMappingUIProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { uploadState, uploadMapping, resetUploadState } = useAwsUpload();
  
  const [mappings, setMappings] = useState<MappingField[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [search, setSearch] = useState('');

  // Auto-map placeholders to provider fields
  const autoMapPlaceholders = useCallback(() => {
    const newMappings: MappingField[] = template.placeholders.map(placeholder => {
      // Try to find matching provider field
      const providerKey = findProviderField(placeholder);
      let mappedValue = '';
      let source: 'provider' | 'manual' | 'calculated' = 'manual';
      let status: 'mapped' | 'unmapped' | 'error' = 'unmapped';

      if (providerKey && provider[providerKey as keyof Provider] !== undefined) {
        mappedValue = String(provider[providerKey as keyof Provider]);
        source = 'provider';
        status = 'mapped';
      } else if (placeholder.includes('Date') && !mappedValue) {
        // Auto-calculate dates
        mappedValue = calculateDate(placeholder);
        source = 'calculated';
        status = 'mapped';
      }

      return {
        placeholder,
        mappedValue,
        source,
        status,
      };
    });

    setMappings(newMappings);
  }, [template.placeholders, provider]);

  // Find provider field that matches placeholder
  const findProviderField = (placeholder: string): string | null => {
    const placeholderLower = placeholder.toLowerCase();
    const providerFields = Object.keys(provider);
    
    // Direct matches
    const directMatch = providerFields.find(field => 
      field.toLowerCase() === placeholderLower
    );
    if (directMatch) return directMatch;

    // Common mappings
    const commonMappings: Record<string, string> = {
      'providername': 'name',
      'provider_name': 'name',
      'doctorname': 'name',
      'physicianname': 'name',
      'specialty': 'specialty',
      'position': 'specialty',
      'title': 'specialty',
      'startdate': 'startDate',
      'start_date': 'startDate',
      'employmentdate': 'startDate',
      'fte': 'fte',
      'fulltimeequivalent': 'fte',
      'basesalary': 'baseSalary',
      'base_salary': 'baseSalary',
      'annualsalary': 'baseSalary',
      'salary': 'baseSalary',
      'contractterm': 'contractTerm',
      'term': 'contractTerm',
    };

    const mappedField = commonMappings[placeholderLower];
    if (mappedField && provider[mappedField as keyof Provider] !== undefined) {
      return mappedField;
    }

    return null;
  };

  // Calculate date values
  const calculateDate = (placeholder: string): string => {
    const now = new Date();
    
    if (placeholder.includes('StartDate') || placeholder.includes('Start_Date')) {
      return provider.startDate || now.toISOString().split('T')[0];
    }
    
    if (placeholder.includes('CurrentDate') || placeholder.includes('Today')) {
      return now.toISOString().split('T')[0];
    }
    
    if (placeholder.includes('Year')) {
      return now.getFullYear().toString();
    }
    
    return '';
  };

  // Update mapping value
  const updateMapping = (placeholder: string, value: string) => {
    setMappings(prev => prev.map(mapping => 
      mapping.placeholder === placeholder 
        ? { ...mapping, mappedValue: value, source: 'manual', status: value ? 'mapped' : 'unmapped' }
        : mapping
    ));
  };

  // Save mappings to AWS
  const saveMappings = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Validate mappings
      const unmappedPlaceholders = mappings.filter(m => !m.mappedValue);
      if (unmappedPlaceholders.length > 0) {
        throw new Error(`Please map all placeholders: ${unmappedPlaceholders.map(m => m.placeholder).join(', ')}`);
      }

      // Convert to record format
      const mappingRecord: Record<string, string> = {};
      mappings.forEach(mapping => {
        mappingRecord[mapping.placeholder] = mapping.mappedValue;
      });

      // Save to AWS
      const success = await uploadMapping(template.id, provider.id, mappingRecord);
      
      if (success) {
        setSavedMappings(mappingRecord);
        setSuccess(true);
        
        // Log audit entry
        dispatch(logSecurityEvent({
          action: 'PLACEHOLDER_MAPPING',
          details: 'Placeholder mapping updated',
          severity: 'LOW',
          // Add other fields as needed
        }));

        // Call completion callback
        onMappingComplete?.(mappingRecord);
      } else {
        throw new Error('Failed to save mappings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save mappings';
      setError(errorMessage);
      
      // Log audit entry for failure
      dispatch(logSecurityEvent({
        action: 'PLACEHOLDER_MAPPING',
        details: `Failed to save mappings. Error: ${errorMessage}`,
        severity: 'HIGH',
        // Add other fields as needed
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Load existing mappings
  const loadExistingMappings = async () => {
    try {
      const existingMappings = await awsMappings.getMappingsByTemplateAndProvider(
        template.id, 
        provider.id
      );
      
      if (existingMappings.length > 0) {
        const mappingRecord: Record<string, string> = {};
        existingMappings.forEach(mapping => {
          if (mapping.field && mapping.value) {
            mappingRecord[mapping.field] = mapping.value;
          }
        });
        
        setSavedMappings(mappingRecord);
        
        // Update current mappings
        setMappings(prev => prev.map(mapping => ({
          ...mapping,
          mappedValue: mappingRecord[mapping.placeholder] || mapping.mappedValue,
          status: mappingRecord[mapping.placeholder] ? 'mapped' : mapping.status,
        })));
      }
    } catch (error) {
      console.error('Failed to load existing mappings:', error);
    }
  };

  // Initialize mappings on mount
  useEffect(() => {
    autoMapPlaceholders();
    loadExistingMappings();
  }, [template, provider, autoMapPlaceholders]);

  // Reset upload state when component unmounts
  useEffect(() => {
    return () => {
      resetUploadState();
    };
  }, [resetUploadState]);

  // Filtered mappings based on search
  const filteredMappings = mappings.filter(m => m.placeholder.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Template Mapping</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{template.name}</Badge>
              <Badge variant="secondary">{provider.name}</Badge>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-2 cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Help" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    Search and map template placeholders to provider data. All required placeholders must be mapped before contract generation.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardTitle>
          <CardDescription>
            Map template placeholders to provider data. Unmapped placeholders will prevent contract generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search field */}
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search placeholders..."
                className="max-w-xs"
                aria-label="Search placeholders"
              />
              <span className="text-xs text-gray-500">{filteredMappings.length} of {mappings.length} placeholders</span>
            </div>
            {/* Auto-mapping controls */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={autoMapPlaceholders}
                disabled={isLoading}
                aria-label="Auto-Map Placeholders"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto-Map
              </Button>
              <Button 
                variant="outline" 
                onClick={loadExistingMappings}
                disabled={isLoading}
                aria-label="Load Saved Mappings"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Saved
              </Button>
            </div>
            {/* Mapping progress */}
            <div className="flex items-center gap-4 text-sm font-medium bg-blue-50 rounded px-3 py-2">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" aria-label="Mapped" />
                <span>Mapped: {mappings.filter(m => m.status === 'mapped').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" aria-label="Unmapped" />
                <span>Unmapped: {mappings.filter(m => m.status === 'unmapped').length}</span>
              </div>
            </div>
            {/* Mapping fields */}
            <div className="space-y-3">
              {filteredMappings.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No placeholders match your search.<br />
                  <span className="text-xs">Try a different keyword.</span>
                </div>
              ) : (
                filteredMappings.map((mapping) => (
                  <div key={mapping.placeholder} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="flex-1">
                      <Label className="text-sm font-medium">
                        {mapping.placeholder}
                      </Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={mapping.source === 'provider' ? 'default' : mapping.source === 'calculated' ? 'secondary' : 'outline'}
                          className="text-xs"
                        >
                          {mapping.source}
                        </Badge>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {mapping.status === 'mapped' ? (
                                <CheckCircle className="h-4 w-4 text-green-500" aria-label="Mapped" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" aria-label="Unmapped" />
                              )}
                            </TooltipTrigger>
                            <TooltipContent>
                              {mapping.status === 'mapped' ? 'Mapped' : 'Unmapped'}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <div className="flex-1">
                      <Input
                        value={mapping.mappedValue}
                        onChange={(e) => updateMapping(mapping.placeholder, e.target.value)}
                        placeholder={`Enter value for ${mapping.placeholder}`}
                        disabled={isLoading}
                        aria-label={`Value for ${mapping.placeholder}`}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {/* Success display */}
            {success && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>Mappings saved successfully!</AlertDescription>
              </Alert>
            )}
            {/* Upload state display */}
            {uploadState.isUploading && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" inline />
                  <span>Saving mappings...</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress.percentage}%` }}
                  />
                </div>
              </div>
            )}
            {/* Save button */}
            <Button 
              onClick={saveMappings}
              disabled={isLoading || mappings.some(m => !m.mappedValue)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              aria-label="Save Mappings"
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Mappings'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 