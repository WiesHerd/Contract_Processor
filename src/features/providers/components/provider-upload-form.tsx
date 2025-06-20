import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDispatch } from 'react-redux';
import { setProviders, setError, setLoading } from '../../../store/slices/providerSlice';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { AlertCircle, Upload, CheckCircle2, XCircle } from 'lucide-react';
import { ProviderUploadService, type UploadResult } from '../services/provider-upload.service';
import { Progress } from '../../../components/ui/progress';

interface UploadStatus {
  inProgress: boolean;
  result: UploadResult | null;
  currentStep: string;
  progress: number;
}

export const ProviderUploadForm: React.FC = () => {
  const dispatch = useDispatch();
  const [status, setStatus] = useState<UploadStatus>({
    inProgress: false,
    result: null,
    currentStep: '',
    progress: 0,
  });

  const uploadService = new ProviderUploadService({
    retries: 3,
    batchSize: 25,
  });

  const updateProgress = (step: string, progress: number) => {
    setStatus(prev => ({
      ...prev,
      currentStep: step,
      progress,
    }));
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setStatus({
      inProgress: true,
      result: null,
      currentStep: 'Starting upload...',
      progress: 0,
    });

    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      updateProgress('Checking AWS connectivity...', 10);
      const result = await uploadService.uploadFromCSV(file);
      
      if (result.success) {
        dispatch(setProviders(result.providers));
        setStatus({
          inProgress: false,
          result,
          currentStep: 'Upload complete',
          progress: 100,
        });
      } else {
        dispatch(setError(result.errors.join('\n')));
        setStatus({
          inProgress: false,
          result,
          currentStep: 'Upload failed',
          progress: 100,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error during upload';
      dispatch(setError(errorMessage));
      setStatus({
        inProgress: false,
        result: {
          success: false,
          providers: [],
          errors: [errorMessage],
          uploadedCount: 0,
          failedCount: 0,
          details: {
            parsed: false,
            validated: false,
            uploaded: false,
            healthCheck: false,
          },
        },
        currentStep: 'Upload failed',
        progress: 100,
      });
    } finally {
      dispatch(setLoading(false));
    }
  }, [dispatch, uploadService]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const renderStatus = () => {
    if (!status.result) return null;

    const { result } = status;
    const StatusIcon = result.success ? CheckCircle2 : XCircle;
    const statusColor = result.success ? 'text-green-500' : 'text-red-500';

    return (
      <Alert variant={result.success ? 'default' : 'destructive'} className="mt-4">
        <StatusIcon className={`h-4 w-4 ${statusColor}`} />
        <AlertTitle>
          {result.success ? 'Upload Successful' : 'Upload Failed'}
        </AlertTitle>
        <AlertDescription>
          <div className="mt-2 space-y-2">
            {result.success ? (
              <>
                <p>Successfully uploaded {result.uploadedCount} providers.</p>
                {result.failedCount > 0 && (
                  <p className="text-yellow-600">
                    {result.failedCount} providers failed to upload.
                  </p>
                )}
              </>
            ) : (
              <div className="space-y-1">
                {result.errors.map((error, index) => (
                  <p key={index} className="text-sm text-red-600">
                    {error}
                  </p>
                ))}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
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

      {status.inProgress && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{status.currentStep}</p>
          <Progress value={status.progress} className="w-full" />
        </div>
      )}

      {renderStatus()}

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