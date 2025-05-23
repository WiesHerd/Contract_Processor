import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Trash2, Upload, Maximize2, Minimize2 } from 'lucide-react';
import { clearProviders, addProvidersFromCSV, setUploadedColumns } from './providersSlice';
import ProviderManager from './ProviderManager';
import Papa from 'papaparse';
import { mapCsvRowToProviderFields } from './ProviderManager';

export default function ProviderDataManager() {
  const dispatch = useDispatch();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSticky, setIsSticky] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const providers = useSelector((state: any) => state.providers.providers);
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

  // CSV upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, string>>) => {
        const mappedData = results.data.map(mapCsvRowToProviderFields);
        const cols = results.meta.fields || [];
        dispatch(setUploadedColumns(cols));
        dispatch(addProvidersFromCSV(mappedData));
      },
      error: (error) => {
        alert('Failed to parse file. Please upload a valid CSV.');
      },
    });
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-6 ${fullscreen ? 'fixed inset-0 z-50 bg-white p-8 overflow-auto' : ''}`}>
      {/* Action bar with title, description, and controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-4 bg-white px-4 pt-6 rounded-lg shadow-sm">
        {/* Title and description on the left */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Provider Data Manager</h1>
          <p className="text-gray-600 text-sm max-w-2xl">
            Upload, map, and manage provider contract data. Easily import CSVs, configure field mapping, and generate contracts in bulk or individually. Use the controls on the right to upload data, clear the table, or adjust table display options.
          </p>
        </div>
        {/* Controls on the right */}
        <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload CSV
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
            disabled={providers.length === 0}
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
      </div>
      {/* Table card only: no duplicate title, no upload button */}
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-0">
        {/* Remove title and description here, only keep stats and table */}
        <div className="flex justify-between items-center mb-2 px-4 pt-4">
          <span className="text-sm text-gray-500">
            {providers.length > 0
              ? `${providers.length} shown / ${providers.length} total`
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
    </div>
  );
} 