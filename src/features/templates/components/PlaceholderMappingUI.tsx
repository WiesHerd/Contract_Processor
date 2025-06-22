import React, { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { RootState } from '@/store';
import { useAwsUpload } from '@/hooks/useAwsUpload';
import { awsMappings } from '@/utils/awsServices';
import { addAuditLog } from '@/store/slices/auditSlice';
import { v4 as uuidv4 } from 'uuid';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

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
  const dispatch = useDispatch();
  const { uploadState, uploadMapping, resetUploadState } = useAwsUpload();
  
  const [mappings, setMappings] = useState<MappingField[]>([]);
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        dispatch(addAuditLog({
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          user: 'system',
          providers: [provider.id],
          template: template.name,
          outputType: 'mapping_saved',
          status: 'success',
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
      dispatch(addAuditLog({
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        user: 'system',
        providers: [provider.id],
        template: template.name,
        outputType: 'mapping_saved',
        status: 'failed',
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Template Mapping</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{template.name}</Badge>
              <Badge variant="secondary">{provider.name}</Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Map template placeholders to provider data. Unmapped placeholders will prevent contract generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Auto-mapping controls */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={autoMapPlaceholders}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Auto-Map
              </Button>
              <Button 
                variant="outline" 
                onClick={loadExistingMappings}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Saved
              </Button>
            </div>

            {/* Mapping status */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Mapped: {mappings.filter(m => m.status === 'mapped').length}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Unmapped: {mappings.filter(m => m.status === 'unmapped').length}</span>
              </div>
            </div>

            {/* Mapping fields */}
            <div className="space-y-3">
              {mappings.map((mapping) => (
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
                      {mapping.status === 'mapped' && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      {mapping.status === 'unmapped' && (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <Input
                      value={mapping.mappedValue}
                      onChange={(e) => updateMapping(mapping.placeholder, e.target.value)}
                      placeholder={`Enter value for ${mapping.placeholder}`}
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ))}
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
              className="w-full"
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