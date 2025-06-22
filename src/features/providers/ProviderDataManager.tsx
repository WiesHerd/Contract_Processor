import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch } from '@/store';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Maximize2, Minimize2, Download } from 'lucide-react';
import { clearProviders, fetchProviders, uploadProviders, clearAllProviders } from '@/store/slices/providerSlice';
import { selectProviders, selectProvidersLoading, selectProvidersError } from '@/store/slices/providerSlice';
import ProviderManager from './ProviderManager';
import Papa from 'papaparse';
import { mapCsvRowToProviderFields } from './ProviderManager';
import { PageHeader } from '@/components/PageHeader';
import { toast } from 'sonner';
import type { Provider } from '@/types/provider';
import type { CreateProviderInput } from '@/API';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import ProgressModal from '@/components/ui/ProgressModal';
import type { RootState } from '@/store';
import { extractDynamicFields, stringifyDynamicFields } from '@/utils/dynamicFields';

const REQUIRED_COLUMNS = [
  'Provider Name', 'Provider Type', 'Specialty', 'FTE', 'BaseSalary', 'StartDate', 'ContractTerm',
  'PTODays', 'HolidayDays', 'CMEDays', 'CMEAmount', 'SigningBonus', 'RelocationBonus', 'QualityBonus',
  'OrganizationName'
];

const SAMPLE_ROWS = [
  ['Heather Cuevas','Physician','Surgery','0.74','278625.98','3/1/2024','3','20','8','5','3000','10000','7500','Summit Medical Group','1/15/2024','181.02','General Surgery','14','Coverage','62.45','2258.51','0','None'],
  ['Sarah Russell','Physician','Anesthesiology','0.65','273671.84','3/1/2024','3','20','8','5','3000','10000','7500','Summit Medical Group','1/15/2024','202.42','General Anesthesiology','28','New Hire Guarantee','58.4','','0.1','None']
];

const downloadTemplate = () => {
  const template = REQUIRED_COLUMNS.join(',') + '\n';
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

export default function ProviderDataManager() {
  const dispatch = useDispatch<AppDispatch>();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSticky, setIsSticky] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
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

  // Load providers from DynamoDB on component mount if they are stale or not present
  useEffect(() => {
    const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes
    const now = new Date().getTime();
    const lastSyncTime = lastSync ? new Date(lastSync).getTime() : 0;
    
    // Fetch if:
    // 1. There are no providers loaded.
    // 2. The data is stale (older than 5 minutes).
    if (providers.length === 0 || (now - lastSyncTime > CACHE_DURATION_MS)) {
      dispatch(fetchProviders());
    }
  }, [dispatch, providers.length, lastSync]);

  // Show error toast if there's an error
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // CSV upload handler with validation and AWS persistence
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<Record<string, string>>) => {
        const cols = results.meta.fields || [];
        const errors: any[] = [];
        
        // 1. Check for missing required columns
        const missingColumns = REQUIRED_COLUMNS.filter(col => !cols.includes(col));
        if (missingColumns.length > 0) {
          missingColumns.forEach(col => {
            errors.push({ row: '-', field: col, message: `Missing required column: ${col}` });
          });
          setValidationErrors(errors);
          setShowValidationModal(true);
          return;
        }

        // 2. Proceed to row validation if all columns present
        const mappedData = results.data.map(mapCsvRowToProviderFields);
        mappedData.forEach((row, i) => {
          REQUIRED_COLUMNS.forEach(field => {
            if (!row[field] || row[field].toString().trim() === '') {
              errors.push({ row: i + 2, field, message: 'Missing value' });
            }
          });
          // Numeric checks
          ['FTE', 'BaseSalary', 'Hourly Wage', 'CMEDays', 'CMEAmount', 'SigningBonus', 'RelocationBonus', 'QualityBonus', 'ConversionFactor', 'Administrative FTE', 'Years of Experience'].forEach(numField => {
            if (row[numField] && isNaN(Number(row[numField]))) {
              errors.push({ row: i + 2, field: numField, message: 'Not a number' });
            }
          });
          // Date checks
          ['StartDate', 'OriginalAgreementDate'].forEach(dateField => {
            if (row[dateField] && isNaN(Date.parse(row[dateField]))) {
              errors.push({ row: i + 2, field: dateField, message: 'Invalid date' });
            }
          });
        });

        if (errors.length > 0) {
          setValidationErrors(errors);
          setShowValidationModal(true);
        } else {
          try {
            // Convert to CreateProviderInput format with dynamic fields support
            const providersToCreate: CreateProviderInput[] = mappedData.map(row => {
              // Define schema fields that we handle explicitly
              const schemaFields = [
                'Provider Name', 'Specialty', 'FTE', 'BaseSalary', 'StartDate', 'ContractTerm',
                'Provider Type', 'Subspecialty', 'Administrative FTE', 'Administrative Role',
                'Years of Experience', 'Hourly Wage', 'OriginalAgreementDate', 'OrganizationName',
                'PTODays', 'HolidayDays', 'CMEDays', 'CMEAmount', 'SigningBonus', 'EducationBonus',
                'QualityBonus', 'CompensationType', 'ConversionFactor', 'wRVUTarget'
              ];

              // Extract dynamic fields (columns not in schema)
              const dynamicFields = extractDynamicFields(row, schemaFields);
              const dynamicFieldsJson = stringifyDynamicFields(dynamicFields);

              return {
                id: crypto.randomUUID(),
                name: row['Provider Name'],
                specialty: row['Specialty'],
                fte: parseFloat(row['FTE']),
                baseSalary: parseFloat(row['BaseSalary']),
                startDate: row['StartDate'],
                contractTerm: row['ContractTerm'],
                providerType: row['Provider Type'],
                subspecialty: row['Subspecialty'],
                administrativeFte: row['Administrative FTE'] ? parseFloat(row['Administrative FTE']) : undefined,
                administrativeRole: row['Administrative Role'],
                yearsExperience: row['Years of Experience'] ? parseInt(row['Years of Experience']) : undefined,
                hourlyWage: row['Hourly Wage'] ? parseFloat(row['Hourly Wage']) : undefined,
                originalAgreementDate: row['OriginalAgreementDate'],
                organizationName: row['OrganizationName'],
                ptoDays: row['PTODays'] ? parseInt(row['PTODays']) : undefined,
                holidayDays: row['HolidayDays'] ? parseInt(row['HolidayDays']) : undefined,
                cmeDays: row['CMEDays'] ? parseInt(row['CMEDays']) : undefined,
                cmeAmount: row['CMEAmount'] ? parseFloat(row['CMEAmount']) : undefined,
                signingBonus: row['SigningBonus'] ? parseFloat(row['SigningBonus']) : undefined,
                educationBonus: row['EducationBonus'] ? parseFloat(row['EducationBonus']) : undefined,
                qualityBonus: row['QualityBonus'] ? parseFloat(row['QualityBonus']) : undefined,
                compensationType: row['CompensationType'],
                conversionFactor: row['ConversionFactor'] ? parseFloat(row['ConversionFactor']) : undefined,
                wRVUTarget: row['wRVUTarget'] ? parseFloat(row['wRVUTarget']) : undefined,
                dynamicFields: dynamicFieldsJson
              };
            });

            // Save to DynamoDB using Redux thunk
            await dispatch(uploadProviders(providersToCreate)).unwrap();
            toast.success('Providers uploaded successfully');
            dispatch(fetchProviders());
          } catch (error) {
            console.error('Failed to save providers:', error);
            toast.error('Failed to save providers to database');
          }
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
  const handleClearTable = () => {
    setShowConfirm(false);
    dispatch(clearAllProviders());
  };

  return (
    <div className={`min-h-screen bg-gray-50/50 ${fullscreen ? 'fixed inset-0 z-50 p-8 overflow-auto' : 'p-4 sm:p-6 lg:p-8'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Provider Data Manager</h1>
            <p className="text-sm text-gray-600">
              Upload, map, and manage provider contract data. Easily import CSVs, configure field mapping, and generate contracts in
              bulk or individually.
            </p>
          </div>
          <div className="flex-shrink-0">
            <div className="flex items-center justify-end gap-2">
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
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">{providers.length} providers loaded</p>
            <div className="flex items-center gap-4">
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
      </div>

      {showValidationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white rounded-lg p-6 shadow-xl max-w-2xl w-full">
                  <h3 className="text-lg font-bold text-red-600">Validation Errors</h3>
                  <p className="mt-2 text-sm text-gray-600">
                      The uploaded CSV has the following errors. Please correct them and try again.
                  </p>
                  <div className="mt-4 max-h-60 overflow-y-auto">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-4 py-2">Row</th>
                                  <th className="px-4 py-2">Field</th>
                                  <th className="px-4 py-2">Message</th>
                              </tr>
                          </thead>
                          <tbody>
                              {validationErrors.map((err, i) => (
                                  <tr key={i} className="border-b">
                                      <td className="px-4 py-2">{err.row}</td>
                                      <td className="px-4 py-2 font-mono">{err.field}</td>
                                      <td className="px-4 py-2">{err.message}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <div className="mt-4 flex justify-end">
                      <Button variant="outline" onClick={() => setShowValidationModal(false)}>Close</Button>
                  </div>
              </div>
          </div>
      )}

      {loadingAction === 'clearing' && (
        <ProgressModal
          isOpen={true}
          title="Clearing Provider Table"
          message={
            clearTotal && clearTotal > 0
              ? `Deleting ${clearProgress || 0} of ${clearTotal} providers...`
              : 'Preparing to delete providers...'
          }
          progress={clearTotal ? ((clearProgress || 0) / clearTotal) * 100 : 0}
        />
      )}

      {loadingAction === 'uploading' && (
        <ProgressModal
          isOpen={true}
          title="Uploading Providers"
          message={
            uploadTotal && uploadTotal > 0
              ? `Uploading ${uploadProgress || 0} of ${uploadTotal} providers...`
              : 'Preparing to upload providers...'
          }
          progress={uploadTotal ? ((uploadProgress || 0) / uploadTotal) * 100 : 0}
        />
      )}

      {showConfirm && !loadingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 shadow-xl w-full max-w-md flex flex-col items-center">
            <h3 className="text-lg font-bold">Are you sure?</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete all provider data. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleClearTable}>Confirm</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 