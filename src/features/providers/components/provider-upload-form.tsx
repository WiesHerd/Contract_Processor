import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDispatch } from 'react-redux';
import Papa from 'papaparse';
import { ProviderSchema, ProviderUploadSchema } from '../../../types/provider';
import { setProviders, setError, setLoading } from '../../../store/slices/providerSlice';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertCircle, Upload } from 'lucide-react';

export const ProviderUploadForm: React.FC = () => {
  const dispatch = useDispatch();
  const [error, setLocalError] = React.useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    dispatch(setLoading(true));
    setLocalError(null);

    try {
      const text = await file.text();
      Papa.parse(text as any, {
        header: true,
        complete: (results) => {
          try {
            // Transform CSV data to match our schema
            const providers = results.data.map((row: any) => ({
              id: row.id || crypto.randomUUID(),
              name: row.name,
              startDate: row.startDate,
              fte: parseFloat(row.fte) || 1.0,
              baseSalary: parseFloat(row.baseSalary),
              compensationModel: row.compensationModel || 'BASE',
              wRVUTarget: row.wRVUTarget ? parseFloat(row.wRVUTarget) : undefined,
              conversionFactor: row.conversionFactor ? parseFloat(row.conversionFactor) : undefined,
              retentionBonus: row.retentionBonus ? {
                amount: parseFloat(row.retentionBonus),
                vestingPeriod: parseInt(row.retentionBonusVestingPeriod) || 12,
              } : undefined,
              longTermIncentive: row.longTermIncentive ? {
                amount: parseFloat(row.longTermIncentive),
                vestingPeriod: parseInt(row.longTermIncentiveVestingPeriod) || 36,
              } : undefined,
              fteBreakdown: row.fteBreakdown ? JSON.parse(row.fteBreakdown) : [{
                activity: 'Clinical',
                percentage: 100,
              }],
              templateTag: row.templateTag,
            }));

            // Validate the data
            const validationResult = ProviderUploadSchema.safeParse({ providers });
            if (!validationResult.success) {
              throw new Error('Invalid provider data: ' + validationResult.error.message);
            }

            dispatch(setProviders(providers));
          } catch (err) {
            setLocalError(err instanceof Error ? err.message : 'Failed to parse provider data');
            dispatch(setError(err instanceof Error ? err.message : 'Failed to parse provider data'));
          }
        },
        error: (error: Papa.ParseError) => {
          console.error('Error parsing CSV:', error);
          setLocalError('Error parsing CSV file. Please check the format and try again.');
          dispatch(setError('Error parsing CSV file. Please check the format and try again.'));
        }
      } as Papa.ParseConfig);
    } catch (err) {
      setLocalError('Failed to read file');
      dispatch(setError('Failed to read file'));
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm text-gray-600">
          {isDragActive
            ? 'Drop the CSV file here'
            : 'Drag and drop a CSV file here, or click to select'}
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Only CSV files are supported
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4">
        <Button
          variant="outline"
          onClick={() => {
            const template = `id,name,startDate,fte,baseSalary,compensationModel,wRVUTarget,conversionFactor,retentionBonus,retentionBonusVestingPeriod,longTermIncentive,longTermIncentiveVestingPeriod,fteBreakdown,templateTag
1,John Doe,2024-01-01,1.0,250000,BASE,,,,,,,"[{\"activity\":\"Clinical\",\"percentage\":100}]",base-template`;
            const blob = new Blob([template], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'provider-template.csv';
            a.click();
            window.URL.revokeObjectURL(url);
          }}
        >
          Download Template
        </Button>
      </div>
    </div>
  );
}; 