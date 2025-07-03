import React, { useCallback, useState, useEffect } from 'react';
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
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const loading = false; // We'll always allow upload unless inProgress

  // Timeout fallback: if stuck loading for >10s, show error and enable upload
  useEffect(() => {
    let timeout: NodeJS.Timeout | undefined;
    if (status.inProgress) {
      timeout = setTimeout(() => {
        setLoadingTimeout(true);
        setStatus(s => ({ ...s, inProgress: false }));
        dispatch(setLoading(false));
        dispatch(setError('Upload was stuck. Please try again.'));
      }, 10000);
    } else {
      setLoadingTimeout(false);
      if (timeout) clearTimeout(timeout);
    }
    return () => { if (timeout) clearTimeout(timeout); };
  }, [status.inProgress, dispatch]);

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
    console.log('File dropped:', acceptedFiles);
    const file = acceptedFiles[0];
    if (!file) {
      console.log('No file found in acceptedFiles');
      return;
    }

    console.log('Processing file:', file.name, file.size, file.type);

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
      
      console.log('Upload result:', result);
      
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
      console.error('Upload error:', err);
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

  const { getRootProps, getInputProps, isDragActive, isDragReject, isDragAccept, open } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
    disabled: status.inProgress, // Only disable during upload
    onDropRejected: (rejectedFiles) => {
      console.log('Files rejected:', rejectedFiles);
      const errors = rejectedFiles.map(({ file, errors }) => 
        `${file.name}: ${errors.map(e => e.message).join(', ')}`
      );
      dispatch(setError(errors.join('\n')));
    },
  });

  console.log('Dropzone state:', { isDragActive, isDragReject, isDragAccept, inProgress: status.inProgress });

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

  const testUpload = () => {
    console.log('Testing upload functionality...');
    const testData = `id,name,startDate,fte,baseSalary,compensationModel,wRVUTarget,conversionFactor,retentionBonus,retentionBonusVestingPeriod,longTermIncentive,longTermIncentiveVestingPeriod,fteBreakdown,templateTag
1,Test Provider,2024-01-01,1.0,250000,BASE,,,,,,,"[{\"activity\":\"Clinical\",\"percentage\":100}]",base-template`;
    
    const blob = new Blob([testData], { type: 'text/csv' });
    const file = new File([blob], 'test-providers.csv', { type: 'text/csv' });
    
    console.log('Created test file:', file);
    onDrop([file]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-4">
      {loadingTimeout && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Upload was stuck. Please try again or check your network connection.
          </AlertDescription>
        </Alert>
      )}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${isDragReject ? 'border-red-500 bg-red-50' : ''}
          ${isDragAccept ? 'border-green-500 bg-green-50' : ''}
          ${status.inProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ pointerEvents: status.inProgress ? 'none' : 'auto' }}
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
        {isDragReject && (
          <p className="mt-2 text-xs text-red-500">
            Invalid file type. Please upload a CSV file.
          </p>
        )}
        {isDragAccept && (
          <p className="mt-2 text-xs text-green-500">
            Valid CSV file! Drop to upload.
          </p>
        )}
        {status.inProgress && (
          <p className="mt-2 text-xs text-blue-500">
            Upload in progress...
          </p>
        )}
      </div>

      {status.inProgress && (
        <div className="space-y-2">
          <p className="text-sm text-gray-600">{status.currentStep}</p>
          <Progress value={status.progress} className="w-full" />
        </div>
      )}

      {renderStatus()}

      <div className="mt-4 flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const template = `id,name,startDate,fte,baseSalary,compensationModel,wRVUTarget,conversionFactor,retentionBonus,retentionBonusVestingPeriod,longTermIncentive,longTermIncentiveVestingPeriod,fteBreakdown,templateTag\n1,John Doe,2024-01-01,1.0,250000,BASE,,,,,,,\"[{\\\"activity\\\":\\\"Clinical\\\",\\\"percentage\\\":100}]\",base-template`;
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
        <Button
          variant="secondary"
          onClick={testUpload}
          disabled={status.inProgress}
        >
          Test Upload
        </Button>
        <Button
          variant="outline"
          onClick={open}
          disabled={status.inProgress}
        >
          Browse Files
        </Button>
      </div>
    </div>
  );
}; 