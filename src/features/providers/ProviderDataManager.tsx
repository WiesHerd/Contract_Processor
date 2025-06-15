import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Maximize2, Minimize2, Download } from 'lucide-react';
import { clearProviders, addProvidersFromCSV, setUploadedColumns, selectProviders, selectProvidersLoading } from './providersSlice';
import ProviderManager from './ProviderManager';
import Papa from 'papaparse';
import { mapCsvRowToProviderFields } from './ProviderManager';
import { PageHeader } from '@/components/PageHeader';

const REQUIRED_COLUMNS = [
  'Provider Name', 'Provider Type', 'Specialty', 'FTE', 'BaseSalary', 'StartDate', 'ContractTerm',
  'PTODays', 'HolidayDays', 'CMEDays', 'CMEAmount', 'SigningBonus', 'RelocationBonus', 'QualityBonus',
  'OrganizationName', 'OriginalAgreementDate', 'Hourly Wage', 'Subspecialty', 'Years of Experience', 'Compensation Type', 'ConversionFactor', 'Administrative FTE', 'Administrative Role'
];

const SAMPLE_ROWS = [
  ['Heather Cuevas','Physician','Surgery','0.74','278625.98','3/1/2024','3','20','8','5','3000','10000','7500','Summit Medical Group','1/15/2024','181.02','General Surgery','14','Coverage','62.45','2258.51','0','None'],
  ['Sarah Russell','Physician','Anesthesiology','0.65','273671.84','3/1/2024','3','20','8','5','3000','10000','7500','Summit Medical Group','1/15/2024','202.42','General Anesthesiology','28','New Hire Guarantee','58.4','','0.1','None']
];

function downloadTemplate() {
  const csvContent = [REQUIRED_COLUMNS, ...SAMPLE_ROWS]
    .map(row => row.map(val => (val === undefined ? '' : val)).join(','))
    .join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'provider-template.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ProviderDataManager() {
  const dispatch = useDispatch();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSticky, setIsSticky] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const providers = useSelector(selectProviders);
  const loading = useSelector(selectProvidersLoading);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync scroll positions between top and bottom scrollbars
  useEffect(() => {
    const top = topScrollRef.current;
    const table = tableScrollRef.current;
    if (!top || !table) return;
    const handleTopScroll = () => {
      table.scrollLeft = top.scrollLeft;
    };
    const handleTableScroll = () => {
      top.scrollLeft = table.scrollLeft;
    };
    top.addEventListener('scroll', handleTopScroll);
    table.addEventListener('scroll', handleTableScroll);
    return () => {
      top.removeEventListener('scroll', handleTopScroll);
      table.removeEventListener('scroll', handleTableScroll);
    };
  }, []);

  // CSV upload handler with validation
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    dispatch(setUploadedColumns([]));

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const cols = results.meta.fields || [];
        dispatch(setUploadedColumns(cols));
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
          dispatch(addProvidersFromCSV(mappedData));
        }
      },
      error: (error) => {
        console.error('Failed to parse file:', error);
        alert('Failed to parse file. Please upload a valid CSV.');
      },
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [dispatch]);

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 space-y-6 ${fullscreen ? 'fixed inset-0 z-50 bg-white p-8 overflow-auto' : ''}`}>
      <PageHeader
        title="Provider Data Manager"
        description="Upload, map, and manage provider contract data. Easily import CSVs, configure field mapping, and generate contracts in bulk or individually. Use the controls on the right to upload data, clear the table, or adjust table display options."
        rightContent={
          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              className="flex items-center"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Processing...' : 'Upload CSV'}
            </Button>
            <Button variant="secondary" className="flex items-center" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
            <input
              ref={fileInputRef}
              id="provider-csv-upload"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <Button
              variant="destructive"
              className="flex items-center"
              onClick={() => setShowConfirm(true)}
              disabled={providers.length === 0 || loading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Table
            </Button>
            <label className="flex items-center gap-2 ml-4 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={isSticky}
                onChange={e => setIsSticky(e.target.checked)}
                className="accent-blue-600"
              />
              Sticky Name Column
            </label>
            <Button
              variant="ghost"
              className="ml-2"
              onClick={() => setFullscreen(f => !f)}
              title={fullscreen ? 'Exit Fullscreen' : 'Fullscreen Table'}
            >
              {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </Button>
          </div>
        }
      />
      {/* Table card only: no duplicate title, no upload button */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-0">
        {/* Remove title and description here, only keep stats and table */}
        <div className="flex justify-between items-center mb-2 px-4 pt-4">
          <span className="text-sm text-gray-500">
            {providers.length > 0
              ? `${providers.length} providers loaded`
              : 'No provider data loaded'}
          </span>
        </div>
        {/* Top horizontal scrollbar synced with table */}
        <div
          ref={topScrollRef}
          className="overflow-x-auto border-t border-l border-r rounded-t-lg mb-0"
          style={{ maxWidth: '100vw' }}
        >
          <div style={{ minWidth: 1200, height: 1 }} />
        </div>
        {/* Table section with border and synced scroll */}
        <div
          ref={tableScrollRef}
          className="overflow-x-auto border rounded-b-lg w-full max-w-none min-h-[60vh]"
          style={{ maxWidth: '100vw' }}
        >
          <ProviderManager isSticky={isSticky} />
        </div>
      </div>
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center">
            <p className="mb-4 text-lg font-semibold text-red-600">
              Are you sure you want to clear all provider data?
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  dispatch(clearProviders());
                  setShowConfirm(false);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Yes, Clear All
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-8 flex flex-col items-center max-w-2xl w-full">
            <p className="mb-4 text-lg font-semibold text-red-600">
              Provider Data Validation Errors
            </p>
            <div className="overflow-auto max-h-96 w-full">
              <table className="min-w-full text-xs border">
                <thead>
                  <tr>
                    <th className="border px-2 py-1">Row</th>
                    <th className="border px-2 py-1">Field</th>
                    <th className="border px-2 py-1">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {validationErrors.map((err, idx) => (
                    <tr key={idx}>
                      <td className="border px-2 py-1">{err.row}</td>
                      <td className="border px-2 py-1">{err.field}</td>
                      <td className="border px-2 py-1 text-red-600">{err.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-4 mt-6">
              <Button variant="outline" onClick={() => setShowValidationModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 