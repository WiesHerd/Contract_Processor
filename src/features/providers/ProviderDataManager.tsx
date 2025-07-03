import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/store';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Maximize2, Minimize2, Download, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { clearProviders, fetchProviders, uploadProviders, clearAllProviders, setProviders } from '@/store/slices/providerSlice';
import { selectProviders, selectProvidersLoading, selectProvidersError } from '@/store/slices/providerSlice';
import ProviderManager from './ProviderManager';
import Papa from 'papaparse';
import { mapCsvRowToProviderFields } from './ProviderManager';
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

// Enterprise-grade field mapping configuration
const REQUIRED_FIELDS = [
  'name', 'providerType', 'specialty', 'fte', 'baseSalary', 'startDate', 'contractTerm',
  'ptoDays', 'holidayDays', 'cmeDays', 'cmeAmount', 'signingBonus', 'relocationBonus', 'qualityBonus',
  'organizationName'
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
  administrativeFte: 'Administrative FTE',
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
  'administrative fte': 'administrativeFte',
  'administrativefte': 'administrativeFte',
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
  'fte', 'administrativeFte', 'administrativeRole', 'yearsExperience', 'hourlyWage',
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
    'fte', 'administrativeFte', 'hourlyWage', 'baseSalary', 'cmeAmount', 
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
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSticky, setIsSticky] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [pendingUploadSummary, setPendingUploadSummary] = useState<{ uploaded: number; skipped: number; errors: ValidationError[] } | null>(null);
  const [showFinalUploadSummary, setShowFinalUploadSummary] = useState(false);
  const [csvRowCount, setCsvRowCount] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  
  const providers = useSelector(selectProviders);
  const loading = useSelector(selectProvidersLoading);
  const error = useSelector(selectProvidersError);
  const lastSync = useSelector((state: RootState) => state.provider.lastSync);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    clearProgress, 
    clearTotal, 
    loadingAction,
    uploadProgress,
    uploadTotal
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
    if (loadingAction && loadingAction === 'clearing') {
      setShowClearingModal(true);
    } else if (showClearingModal && (!loadingAction || loadingAction !== 'clearing')) {
      setShowClearingModal(false);
      setShowConfirm(false); // Ensure confirmation modal is closed after delete
    }
  }, [loadingAction, showClearingModal]);

  // Load providers from DynamoDB on component mount if they are stale or not present
  useEffect(() => {
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    
    // Fetch if:
    // 1. No lastSync (first time loading)
    // 2. The data is stale (older than 5 minutes)
    if (!lastSync || (now - lastSyncTime > CACHE_DURATION_MS)) {
      dispatch(fetchProviders());
    }
  }, [dispatch, lastSync]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  useEffect(() => {
    const fetchYears = async () => {
      const client = generateClient();
      const result = await client.graphql({
        query: /* GraphQL */ `
          query ListProviderYears {
            listProviderYears
          }
        `
      });
      const years = (result as any)?.data?.listProviderYears || [];
      setAvailableYears(years);
      if (years.length > 0) {
        setSelectedYear(years[0]);
      }
    };
    fetchYears();
  }, []);

  useEffect(() => {
    if (selectedYear) {
      const fetchProvidersByYear = async () => {
        const client = generateClient();
        const result = await client.graphql({
          query: /* GraphQL */ `
            query ProvidersByCompensationYear($compensationYear: String!) {
              providersByCompensationYear(compensationYear: $compensationYear) {
                items {
                  id
                  name
                  employeeId
                  providerType
                  specialty
                  subspecialty
                  fte
                  administrativeFte
                  administrativeRole
                  yearsExperience
                  hourlyWage
                  baseSalary
                  originalAgreementDate
                  organizationName
                  startDate
                  contractTerm
                  ptoDays
                  holidayDays
                  cmeDays
                  cmeAmount
                  signingBonus
                  educationBonus
                  qualityBonus
                  compensationType
                  conversionFactor
                  wRVUTarget
                  compensationYear
                  credentials
                  compensationModel
                  fteBreakdown
                  templateTag
                  dynamicFields
                  createdAt
                  updatedAt
                }
              }
            }
          `,
          variables: { compensationYear: selectedYear }
        });
        const providers = (result as any)?.data?.providersByCompensationYear?.items || [];
        dispatch(setProviders(providers));
      };
      fetchProvidersByYear();
    }
  }, [selectedYear, dispatch]);

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
          // Add any additional unmapped columns as dynamic fields
          const mappedKeys = Object.keys(provider);
          const unmappedColumns = headers.filter(header => !mappedKeys.includes(header));
          if (unmappedColumns.length > 0) {
            const dynamicFieldsObj: Record<string, any> = {};
            unmappedColumns.forEach(column => {
              const value = data[i][column];
              if (value !== undefined && value !== '') {
                dynamicFieldsObj[column] = value;
              }
            });
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
          if (errors.some(e => e.row === rowNumber)) continue;
          const filteredProvider: any = {};
          Object.keys(provider).forEach(key => {
            if (ALLOWED_FIELDS.includes(key) && provider[key] !== undefined) {
              filteredProvider[key] = provider[key];
            }
          });
          providersToCreate.push(filteredProvider as CreateProviderInput);
        }
        // Store summary, but do not show modal yet
        setPendingUploadSummary({ uploaded: providersToCreate.length, skipped: errors.length, errors });
        if (providersToCreate.length === 0) {
          toast.error('No valid rows to upload. Please check your CSV and try again.');
          return;
        }
        try {
          await dispatch(uploadProviders(providersToCreate)).unwrap();
          toast.success(`Successfully uploaded ${providersToCreate.length} providers`);
          await dispatch(fetchProviders());
          // Now show the summary modal after upload is complete
          setShowFinalUploadSummary(true);
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
  }, [dispatch]);

  // Handle clear table with DynamoDB sync
  const handleClearTable = useCallback(() => {
    dispatch(fetchProviders()).then(() => {
      dispatch(clearAllProviders());
    });
  }, [dispatch]);

  // Download template with current required fields
  const downloadTemplate = () => {
    const templateHeaders = REQUIRED_FIELDS.map(field => FIELD_DISPLAY_NAMES[field]);
    const template = templateHeaders.join(',') + '\n';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'provider-template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={`min-h-screen bg-gray-50/50 ${fullscreen ? 'fixed inset-0 z-50 p-8 overflow-auto' : 'pt-0 pb-4 px-2 sm:px-4'}`}>
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
            {/* Optional: Year Selector */}
            {availableYears.length > 0 && (
              <div className="flex items-center ml-6">
                <label htmlFor="year-select" className="font-medium mr-2">Contract Year:</label>
                <select
                  id="year-select"
                  value={selectedYear ?? ''}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="border rounded px-2 py-1"
                >
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}
          </div>
          <hr className="my-3 border-gray-100" />
          <div className="flex flex-wrap items-center gap-3 justify-end">
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
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
            <Button
              variant="outline"
              className="bg-white"
              onClick={downloadTemplate}
              disabled={loading}
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={loading || providers.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Table
            </Button>
            <div className="flex items-center gap-2">
              <Checkbox id="sticky-name" checked={isSticky} onCheckedChange={() => setIsSticky(!isSticky)} />
              <Label htmlFor="sticky-name" className="text-sm font-medium">Sticky Name Column</Label>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullscreen(!fullscreen)}
              disabled={loading}
            >
              {fullscreen ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <ProviderManager
            providers={providers}
            loading={loading}
            isSticky={isSticky}
            tableScrollRef={tableScrollRef}
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

        {/* Modern, minimal upload summary (audit) modal with CSV total */}
        {showFinalUploadSummary && pendingUploadSummary && (
          <Dialog open={showFinalUploadSummary} onOpenChange={setShowFinalUploadSummary}>
            <DialogContent className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-gray-900">Upload Summary</DialogTitle>
              </DialogHeader>
              <div className="py-2 text-center">
                <div className="text-base text-gray-800 mb-2">Upload Complete</div>
                <div className="flex flex-col items-center gap-2 mb-2">
                  <span className="text-gray-900">Total rows in CSV: {csvRowCount ?? '-'}</span>
                  <span className="text-gray-900">Rows uploaded: {pendingUploadSummary.uploaded}</span>
                  <span className="text-gray-500">Rows skipped: {pendingUploadSummary.skipped}</span>
                </div>
                {csvRowCount !== null && pendingUploadSummary.uploaded !== csvRowCount && (
                  <div className="mb-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2">
                    Warning: The number of uploaded rows does not match the number of rows in your CSV. Please review the skipped rows below.
                  </div>
                )}
                {pendingUploadSummary.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-700 mb-1">Some rows were skipped due to errors:</p>
                    <ul className="text-xs text-gray-600 max-h-32 overflow-y-auto border rounded bg-gray-50 p-2">
                      {pendingUploadSummary.errors.slice(0, 10).map((err, idx) => (
                        <li key={idx}>Row {err.row}: {err.field} - {err.message}</li>
                      ))}
                    </ul>
                    {pendingUploadSummary.errors.length > 10 && <p className="text-xs text-gray-400">...and {pendingUploadSummary.errors.length - 10} more</p>}
                    <Button className="mt-2" variant="outline" onClick={() => {
                      // Download error log as CSV
                      const csv = [
                        'Row,Field,Message,Type',
                        ...pendingUploadSummary.errors.map(e => `${e.row},${e.field},${e.message},${e.type}`)
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'upload_errors.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}>Download Error Log</Button>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => setShowFinalUploadSummary(false)} variant="secondary">Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
} 