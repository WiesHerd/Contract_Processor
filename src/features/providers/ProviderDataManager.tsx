import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/store';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Maximize2, Minimize2, Download, AlertCircle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { clearProviders, fetchProvidersByYearIfNeeded, uploadProviders, clearAllProviders, setProviders, forceRefresh } from '@/store/slices/providerSlice';
import { selectProviders, selectProvidersLoading, selectProvidersError } from '@/store/slices/providerSlice';
import { useYear } from '@/contexts/YearContext';
import ProviderManager from './ProviderManager';
import Papa from 'papaparse';
import { mapCsvRowToProviderFields } from './ProviderManager';
import { mapCsvHeader, parseFieldValue, isSchemaField } from '../../config/providerSchema';
import { toast } from 'sonner';
import type { Provider } from '@/types/provider';
import type { CreateProviderInput } from '@/API';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import ProgressModal from '@/components/ui/ProgressModal';
import type { RootState } from '@/store';
import { extractDynamicFields, stringifyDynamicFields } from '@/utils/dynamicFields';
import { awsProviders } from '@/utils/awsServices';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { generateClient } from 'aws-amplify/api';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { LoadingAction } from '@/types/provider';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
// Remove the complex caching for now and use simple Redux state

// Enterprise-grade field mapping configuration
const REQUIRED_FIELDS = [
  'name', 'specialty'  // Only require the truly essential fields
];

const FIELD_DISPLAY_NAMES: Record<string, string> = {
  name: 'Provider Name',
  providerType: 'Provider Type', 
  specialty: 'Specialty',
  fte: 'FTE',
  baseSalary: 'Base Salary',
  startDate: 'Start Date',
  contractTerm: 'Contract Term',
  ptoDays: 'PTO Days',
  holidayDays: 'Holiday Days',
  cmeDays: 'CME Days',
  cmeAmount: 'CME Amount',
  signingBonus: 'Signing Bonus',
  relocationBonus: 'Relocation Bonus',
  qualityBonus: 'Quality Bonus',
  organizationName: 'Organization Name',
  employeeId: 'Employee ID',
  subspecialty: 'Subspecialty',
  credentials: 'Credentials',
  administrativeRole: 'Administrative Role',
  yearsExperience: 'Years Experience',
  hourlyWage: 'Hourly Wage',
  originalAgreementDate: 'Original Agreement Date',
  educationBonus: 'Education Bonus',
  compensationType: 'Compensation Type',
  conversionFactor: 'Conversion Factor',
  wRVUTarget: 'wRVU Target',
  compensationYear: 'Compensation Year'
};

// Comprehensive field mapping for CSV headers
const FIELD_MAP: Record<string, string> = {
  // Provider identification
  'provider name': 'name',
  'name': 'name',
  'employee name': 'name',
  'employee id': 'employeeId',
  'employeeid': 'employeeId',
  'employee_id': 'employeeId',
  'credentials': 'credentials',
  
  // Provider classification
  'provider type': 'providerType',
  'providertype': 'providerType',
  'provider_type': 'providerType',
  'specialty': 'specialty',
  'subspecialty': 'subspecialty',
  'position title': 'administrativeRole',
  'positiontitle': 'administrativeRole',
  
  // FTE and administrative
  'fte': 'fte',
  // REMOVED: 'administrative fte': 'administrativeFte',
  // REMOVED: 'administrativefte': 'administrativeFte',
  'administrative role': 'administrativeRole',
  'administrativerole': 'administrativeRole',
  'years of experience': 'yearsExperience',
  'yearsofexperience': 'yearsExperience',
  'years_experience': 'yearsExperience',
  
  // Compensation
  'hourly wage': 'hourlyWage',
  'hourlywage': 'hourlyWage',
  'base salary': 'baseSalary',
  'basesalary': 'baseSalary',
  'base_salary': 'baseSalary',
  'annual wage': 'baseSalary',
  'annualwage': 'baseSalary',
  
  // Dates
  'start date': 'startDate',
  'startdate': 'startDate',
  'start_date': 'startDate',
  'original agreement date': 'originalAgreementDate',
  'originalagreementdate': 'originalAgreementDate',
  'original_agreement_date': 'originalAgreementDate',
  
  // Contract details
  'contract term': 'contractTerm',
  'contractterm': 'contractTerm',
  'contract_term': 'contractTerm',
  'organization name': 'organizationName',
  'organizationname': 'organizationName',
  'organization_name': 'organizationName',
  
  // Benefits
  'pto days': 'ptoDays',
  'ptodays': 'ptoDays',
  'pto_days': 'ptoDays',
  'holiday days': 'holidayDays',
  'holidaydays': 'holidayDays',
  'holiday_days': 'holidayDays',
  'cme days': 'cmeDays',
  'cmedays': 'cmeDays',
  'cme_days': 'cmeDays',
  'cme amount': 'cmeAmount',
  'cmeamount': 'cmeAmount',
  'cme_amount': 'cmeAmount',
  
  // Bonuses
  'signing bonus': 'signingBonus',
  'signingbonus': 'signingBonus',
  'signing_bonus': 'signingBonus',
  'relocation bonus': 'relocationBonus',
  'relocationbonus': 'relocationBonus',
  'relocation_bonus': 'relocationBonus',
  'quality bonus': 'qualityBonus',
  'qualitybonus': 'qualityBonus',
  'quality_bonus': 'qualityBonus',
  'education bonus': 'educationBonus',
  'educationbonus': 'educationBonus',
  'education_bonus': 'educationBonus',
  
  // Compensation model
  'compensation type': 'compensationType',
  'compensationtype': 'compensationType',
  'compensation_type': 'compensationType',
  'compensation year': 'compensationYear',
  'compensationyear': 'compensationYear',
  'compensation_year': 'compensationYear',
  'conversion factor': 'conversionFactor',
  'conversionfactor': 'conversionFactor',
  'conversion_factor': 'conversionFactor',
  'wrvu target': 'wRVUTarget',
  'wrvutarget': 'wRVUTarget',
  'wrvu_target': 'wRVUTarget',
};

const ALLOWED_FIELDS = [
  'id', 'employeeId', 'name', 'providerType', 'specialty', 'subspecialty',
  'fte', 'administrativeRole', 'yearsExperience', 'hourlyWage',
  'baseSalary', 'originalAgreementDate', 'organizationName', 'startDate', 'contractTerm',
  'ptoDays', 'holidayDays', 'cmeDays', 'cmeAmount', 'signingBonus', 'educationBonus',
  'qualityBonus', 'compensationType', 'conversionFactor', 'wRVUTarget', 'compensationYear',
  'credentials', 'compensationModel', 'fteBreakdown', 'templateTag', 'dynamicFields',
  'createdAt', 'updatedAt'
];

// Interface for column mapping
interface ColumnMapping {
  requiredField: string;
  csvColumn: string;
  isMapped: boolean;
}

// Interface for validation errors
interface ValidationError {
  row: number | string;
  field: string;
  message: string;
  type: 'missing_column' | 'missing_value' | 'invalid_format' | 'unmapped_required';
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[\s_]+/g, ' ');
}

function parsePlainDate(value: string): string | undefined {
  if (!value || value.trim() === '') return undefined;
  
  // Accept MM/DD/YYYY, M/D/YYYY, or YYYY-MM-DD
  const mmddyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/;
  let match;
  
  if ((match = value.match(mmddyyyy))) {
    const [_, m, d, y] = match;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  if ((match = value.match(yyyymmdd))) {
    return value;
  }
  
  // If not recognized, return as-is (no timezone conversion)
  return value.trim();
}

function parseValue(field: string, value: any) {
  if (value === '' || value === null || value === undefined) return undefined;
  
  // Handle numeric fields
  if ([
    'fte', 'hourlyWage', 'baseSalary', 'cmeAmount', 
    'signingBonus', 'qualityBonus', 'conversionFactor', 'wRVUTarget', 'educationBonus',
    'relocationBonus'
  ].includes(field)) {
    const num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? undefined : num;
  }
  
  // Handle integer fields
  if ([
    'yearsExperience', 'ptoDays', 'holidayDays', 'cmeDays', 'contractTerm'
  ].includes(field)) {
    const num = parseInt(String(value).replace(/[^0-9]/g, ''));
    return isNaN(num) ? undefined : num;
  }
  
  // Handle date fields as plain strings, normalized to YYYY-MM-DD
  if ([
    'originalAgreementDate', 'startDate'
  ].includes(field)) {
    return parsePlainDate(String(value));
  }
  
  return String(value).trim();
}

export default function ProviderDataManager() {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedYear, setSelectedYear } = useYear();
  const { isAuthenticated, user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSticky, setIsSticky] = useState(true);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [csvRowCount, setCsvRowCount] = useState<number | null>(null);
  
  // Simple Redux state management
  const providers = useSelector(selectProviders) || [];
  const loading = useSelector(selectProvidersLoading);
  const error = useSelector(selectProvidersError);
  const lastSync = useSelector((state: RootState) => state.provider.lastSync);
  
  console.log('ProviderDataManager: Redux state - providers:', providers?.length || 0, 'loading:', loading, 'error:', error);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    clearProgress, 
    clearTotal, 
    loadingAction,
    uploadProgress,
    uploadTotal
  }: {
    clearProgress: number | undefined;
    clearTotal: number | undefined;
    loadingAction: LoadingAction;
    uploadProgress: number | undefined;
    uploadTotal: number | undefined;
  } = useSelector((state: RootState) => ({
    clearProgress: state.provider.clearProgress,
    clearTotal: state.provider.clearTotal,
    loadingAction: state.provider.loadingAction,
    uploadProgress: state.provider.uploadProgress,
    uploadTotal: state.provider.uploadTotal,
  }));

  // Track when clearing is complete to close the progress modal
  const [showClearingModal, setShowClearingModal] = useState(false);
  useEffect(() => {
    if (loadingAction && loadingAction === ('clearing' as LoadingAction)) {
      setShowClearingModal(true);
    } else if (showClearingModal && (!loadingAction || loadingAction !== 'clearing')) {
      setShowClearingModal(false);
      setShowConfirm(false); // Ensure confirmation modal is closed after delete
    }
  }, [loadingAction, showClearingModal]);

  // Load providers from DynamoDB on component mount
  useEffect(() => {
    console.log('ProviderDataManager: selectedYear changed to:', selectedYear);
    console.log('ProviderDataManager: Authentication status - isAuthenticated:', isAuthenticated, 'user:', user?.username);
    
    if (selectedYear && isAuthenticated) {
      console.log('ProviderDataManager: Dispatching fetchProvidersByYearIfNeeded with year:', selectedYear);
      dispatch(fetchProvidersByYearIfNeeded(selectedYear));
    } else if (!isAuthenticated) {
      console.log('ProviderDataManager: User not authenticated, skipping fetch');
      // Clear any existing providers if user is not authenticated
      if (providers.length > 0) {
        dispatch(clearProviders());
      }
    } else if (!selectedYear) {
      console.log('ProviderDataManager: No selected year, skipping fetch');
    }
  }, [dispatch, selectedYear, isAuthenticated, user, providers.length]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Simplified CSV upload handler that works with your existing CSV format
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<Record<string, string>>) => {
        
        const headers = results.meta.fields || [];
        const data = results.data;
        
        setCsvRowCount(data.length);
        
        const mappedData = data.map(mapCsvRowToProviderFields);
        const providersToCreate: CreateProviderInput[] = [];
        const errors: ValidationError[] = [];
        
        for (let i = 0; i < mappedData.length; i++) {
          const row = mappedData[i];
          const rowNumber = i + 2;
          
          const provider: any = { id: crypto.randomUUID() };
          Object.entries(row).forEach(([key, value]) => {
            if (value !== undefined && value !== '') {
              // For date fields, always store as plain string (no Date object)
              if (["originalAgreementDate", "startDate"].includes(key)) {
                provider[key] = String(value).trim();
              } else {
                provider[key] = parseValue(key, value);
              }
            }
          });
          
          // Auto-populate compensationYear with selected year if not provided in CSV
          if (!provider.compensationYear && selectedYear) {
            provider.compensationYear = selectedYear;
          }
          
          // Add any additional unmapped columns as dynamic fields (only truly unknown columns)
          const dynamicFieldsObj: Record<string, any> = {};
          headers.forEach(header => {
            const schemaField = mapCsvHeader(header);
            if (!schemaField) {
              // This is a truly unknown column, store in dynamicFields
              const value = data[i][header];
              if (value !== undefined && value !== '') {
                dynamicFieldsObj[header] = value;
              }
            }
          });
          
          if (Object.keys(dynamicFieldsObj).length > 0) {
            provider.dynamicFields = JSON.stringify(dynamicFieldsObj);
          }
          
          // Robust validation: check all required fields
          for (const req of REQUIRED_FIELDS) {
            if (!provider[req] || provider[req].toString().trim() === '') {
              errors.push({
                row: rowNumber,
                field: FIELD_DISPLAY_NAMES[req] || req,
                message: 'Missing value',
                type: 'missing_value',
              });
            }
          }
          
          if (errors.some(e => e.row === rowNumber)) {
            continue;
          }
          
          const filteredProvider: any = {};
          Object.keys(provider).forEach(key => {
            if (ALLOWED_FIELDS.includes(key) && provider[key] !== undefined) {
              filteredProvider[key] = provider[key];
            }
          });
          
          providersToCreate.push(filteredProvider as CreateProviderInput);
        }
        
        if (providersToCreate.length === 0) {
          toast.error('No valid rows to upload. Please check your CSV and try again.');
          return;
        }
        
        try {
          // Upload providers
          await dispatch(uploadProviders(providersToCreate)).unwrap();
          
          // Show success toast with upload summary
          const successMessage = `Successfully uploaded ${providersToCreate.length} providers`;
          if (errors.length > 0) {
            toast.success(`${successMessage} (${errors.length} rows skipped due to errors)`);
          } else {
            toast.success(successMessage);
          }
          
          // Force refresh the data to ensure UI updates
          await dispatch(fetchProvidersByYearIfNeeded(selectedYear)).unwrap();
          
        } catch (error: unknown) {
          console.error('Provider upload error:', error);
          toast.error('Provider upload failed');
        }
      },
      error: (error) => {
        console.error('Failed to parse file:', error);
        toast.error('Failed to parse file. Please upload a valid CSV.');
      },
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [dispatch, selectedYear]);

  // Handle clear table with DynamoDB sync
  const handleClearTable = useCallback(() => {
    console.log('handleClearTable: Starting clear operation...');
    setShowConfirm(false); // Close the confirmation modal immediately
    // Directly dispatch clearAllProviders - no need to fetch first
    dispatch(clearAllProviders());
    console.log('handleClearTable: clearAllProviders dispatched');
  }, [dispatch]);

  const downloadTemplate = () => {
    const headers = [
      'Provider Name',
      'Employee ID',
      'Provider Type',
      'Specialty',
      'Subspecialty',
      'FTE',
      'Administrative Role',
      'Years of Experience',
      'Hourly Wage',
      'Base Salary',
      'Original Agreement Date',
      'Organization Name',
      'Start Date',
      'Contract Term',
      'PTO Days',
      'Holiday Days',
      'CME Days',
      'CME Amount',
      'Signing Bonus',
      'Relocation Bonus',
      'Education Bonus',
      'Quality Bonus',
      'Compensation Type',
      'Conversion Factor',
      'wRVU Target',
      'Compensation Year',
      'Credentials'
    ];
    
    const csv = Papa.unparse([headers]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'provider_template.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadFullCSV = () => {
    if (!providers || providers.length === 0) {
      toast.error('No provider data to export');
      return;
    }

    // Get only field names that have actual data in at least one provider
    const allFieldNames = new Set<string>();
    const fieldDataCount = new Map<string, number>();
    
    providers.forEach(provider => {
      Object.keys(provider).forEach(key => {
        if (key !== '__typename' && key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'dynamicFields') {
          const value = provider[key as keyof typeof provider];
          // Only include fields with actual data (not empty strings, null, undefined)
          if (value !== null && value !== undefined && value !== '' && typeof value === 'string' ? value.trim() !== '' : true) {
            allFieldNames.add(key);
            fieldDataCount.set(key, (fieldDataCount.get(key) || 0) + 1);
          }
        }
      });
      
      // Also include dynamic fields that have data
      if (provider.dynamicFields) {
        try {
          const dynamicData = JSON.parse(String(provider.dynamicFields));
          Object.keys(dynamicData).forEach(key => {
            const value = dynamicData[key];
            // Only include fields with actual data (not empty strings, null, undefined)
            if (value !== null && value !== undefined && value !== '' && String(value).trim() !== '') {
              allFieldNames.add(key);
              fieldDataCount.set(key, (fieldDataCount.get(key) || 0) + 1);
            }
          });
        } catch (e) {
          // Ignore parsing errors
        }
      }
    });

    // Filter out fields that have data in less than 1% of providers (to remove truly orphaned fields)
    const minDataThreshold = Math.max(1, Math.floor((providers?.length || 0) * 0.01));
    const fieldsWithSufficientData = Array.from(allFieldNames).filter(field => {
      const dataCount = fieldDataCount.get(field) || 0;
      return dataCount >= minDataThreshold;
    });

    const sortedFieldNames = fieldsWithSufficientData.sort();
    
    // Convert providers to CSV format
    const csvData = providers.map(provider => {
      const row: Record<string, any> = {};
      
      sortedFieldNames.forEach(fieldName => {
        if (fieldName === 'dynamicFields') {
          // Skip the dynamicFields JSON field itself
          return;
        }
        
        let value = provider[fieldName as keyof typeof provider];
        
        // If field not found in main provider object, check dynamic fields
        if (value === undefined && provider.dynamicFields) {
          try {
            const dynamicData = JSON.parse(String(provider.dynamicFields));
            value = dynamicData[fieldName];
          } catch (e) {
            // Ignore parsing errors
          }
        }
        
        // Format the value
        if (value === null || value === undefined) {
          row[fieldName] = '';
        } else if (typeof value === 'object') {
          row[fieldName] = JSON.stringify(value);
        } else {
          row[fieldName] = String(value);
        }
      });
      
      return row;
    });

    // Generate CSV
    const csv = Papa.unparse(csvData, { header: true });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `provider_data_full_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${providers?.length || 0} providers to CSV`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">Provider Data Manager</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    Upload, map, and manage provider contract data. Easily import CSVs, configure field mapping, and generate contracts in bulk or individually.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {/* Simple provider count and cache status */}
            <div className="flex items-center gap-2">
              {providers && providers.length > 0 && (
                <>
                  <Badge variant="outline" className="text-xs">
                    {providers?.length || 0} providers loaded
                  </Badge>
                  {lastSync && (
                    <Badge variant="secondary" className="text-xs">
                      {new Date(lastSync).toLocaleTimeString()} cached
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          <hr className="my-3 border-gray-100" />
          <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
            {/* Left group: Upload/Download */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                ref={fileInputRef}
                disabled={loading}
              />
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                Upload CSV
              </Button>
              <Button
                variant="outline"
                className="bg-white"
                onClick={downloadTemplate}
                disabled={loading}
              >
                Download Template
              </Button>
              <Button
                variant="outline"
                className="bg-white"
                onClick={downloadFullCSV}
                disabled={loading || !providers || providers.length === 0}
              >
                Export All Data
              </Button>
            </div>
            {/* Right group: Clear Table */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="bg-white"
                onClick={() => {
                  dispatch(forceRefresh());
                  if (selectedYear && isAuthenticated) {
                    dispatch(fetchProvidersByYearIfNeeded(selectedYear));
                  }
                }}
                disabled={loading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={loading || !providers || providers.length === 0}
              >
                Clear Table
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <ProviderManager
            providers={providers}
            loading={loading}
          />
        </div>



        {/* Validation Errors Modal */}
        <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                Validation Errors
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  The uploaded CSV contains validation errors. Please correct these issues and try again.
                </AlertDescription>
              </Alert>
              
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Row</th>
                      <th className="text-left p-2 font-medium">Field</th>
                      <th className="text-left p-2 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationErrors.map((error, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-mono">{error.row}</td>
                        <td className="p-2">{error.field}</td>
                        <td className="p-2 text-red-600">{error.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="text-sm text-gray-600">
                <p><strong>Tips:</strong></p>
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>Ensure all required fields have values in every row</li>
                  <li>Check that numeric fields contain valid numbers</li>
                  <li>Verify date formats (MM/DD/YYYY or YYYY-MM-DD)</li>
                  <li>Make sure CSV column names match the expected field names</li>
                </ul>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Clear Confirmation Modal */}
        <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Clear All Providers</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to clear all providers? This action cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleClearTable}>
                Clear All
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Progress Modal for Uploading */}
        <ProgressModal
          isOpen={loadingAction === 'uploading'}
          title="Uploading Providers"
          progress={uploadTotal && uploadProgress ? Math.round((uploadProgress / uploadTotal) * 100) : 0}
          message={`Uploading ${uploadProgress || 0} of ${uploadTotal || 0} providers...`}
        />

        {/* Progress Modal for Clearing (Delete All) */}
        <ProgressModal
          isOpen={showClearingModal}
          title="Clearing Providers"
          progress={clearTotal && clearProgress ? Math.round((clearProgress / clearTotal) * 100) : 0}
          message={`Deleting ${clearProgress || 0} of ${clearTotal || 0} providers...`}
        />
      </div>
    </div>
  );
} 