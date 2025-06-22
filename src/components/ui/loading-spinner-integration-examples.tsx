import React, { useState } from 'react';
import { LoadingSpinner } from './loading-spinner';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

/**
 * Practical integration examples showing how to use LoadingSpinner 
 * in your existing app components and features.
 */

// Example 1: Provider Data Manager Integration
export const ProviderDataManagerExample: React.FC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const handleUpload = async () => {
    setIsUploading(true);
    // Simulate CSV upload
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsUploading(false);
  };

  const handleFetchProviders = async () => {
    setIsFetching(true);
    // Simulate fetching providers
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsFetching(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Provider Data Manager Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Upload Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">CSV Upload</h3>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" inline />
                  <span className="ml-2">Uploading...</span>
                </>
              ) : (
                'Upload CSV'
              )}
            </Button>
            
            {isUploading && (
              <div className="mt-4">
                <LoadingSpinner 
                  message="Processing CSV file..." 
                  size="md"
                />
              </div>
            )}
          </div>

          {/* Fetch Section */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Provider Data</h3>
            <Button onClick={handleFetchProviders} disabled={isFetching}>
              {isFetching ? (
                <>
                  <LoadingSpinner size="sm" inline />
                  <span className="ml-2">Loading...</span>
                </>
              ) : (
                'Refresh Providers'
              )}
            </Button>
            
            {isFetching && (
              <div className="mt-4">
                <LoadingSpinner 
                  message="Fetching provider data..." 
                  size="md"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Example 2: Template Management Integration
export const TemplateManagementExample: React.FC = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  const handleGenerateContract = async () => {
    setIsGenerating(true);
    // Simulate contract generation
    await new Promise(resolve => setTimeout(resolve, 4000));
    setIsGenerating(false);
  };

  const handleUploadTemplate = async () => {
    setIsUploadingTemplate(true);
    // Simulate template upload
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsUploadingTemplate(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Management Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Template Upload */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Template Upload</h3>
            <Button onClick={handleUploadTemplate} disabled={isUploadingTemplate}>
              {isUploadingTemplate ? (
                <>
                  <LoadingSpinner size="sm" inline />
                  <span className="ml-2">Uploading Template...</span>
                </>
              ) : (
                'Upload Template'
              )}
            </Button>
            
            {isUploadingTemplate && (
              <div className="mt-4">
                <LoadingSpinner 
                  message="Processing template file..." 
                  size="md"
                />
              </div>
            )}
          </div>

          {/* Contract Generation */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Contract Generation</h3>
            <Button onClick={handleGenerateContract} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" inline />
                  <span className="ml-2">Generating...</span>
                </>
              ) : (
                'Generate Contract'
              )}
            </Button>
            
            {isGenerating && (
              <div className="mt-4">
                <LoadingSpinner 
                  message="Generating contract document..." 
                  size="lg"
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Example 3: Bulk Operations Integration
export const BulkOperationsExample: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBulkGenerate = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    // Simulate bulk processing with progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setProgress(i);
    }
    
    setIsProcessing(false);
    setProgress(0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bulk Operations Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleBulkGenerate} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <LoadingSpinner size="sm" inline />
                <span className="ml-2">Processing...</span>
              </>
            ) : (
              'Bulk Generate Contracts'
            )}
          </Button>
          
          {isProcessing && (
            <div className="mt-4 space-y-4">
              <LoadingSpinner 
                message={`Processing contracts... ${progress}%`}
                size="lg"
              />
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Example 4: Page Loading States
export const PageLoadingStatesExample: React.FC = () => {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const simulatePageLoad = async () => {
    setIsPageLoading(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsPageLoading(false);
  };

  const simulateDataLoad = async () => {
    setIsDataLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsDataLoading(false);
  };

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <LoadingSpinner 
          size="xl" 
          message="Loading your dashboard..." 
          color="primary"
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Loading States</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={simulatePageLoad}>
            Simulate Page Load
          </Button>
          
          <Button onClick={simulateDataLoad} disabled={isDataLoading}>
            {isDataLoading ? (
              <>
                <LoadingSpinner size="sm" inline />
                <span className="ml-2">Loading Data...</span>
              </>
            ) : (
              'Load Data'
            )}
          </Button>
          
          {isDataLoading && (
            <div className="mt-4">
              <LoadingSpinner 
                message="Fetching data from server..." 
                size="md"
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Example 5: Modal/Overlay Loading
export const ModalLoadingExample: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setIsProcessing(false);
    setIsModalOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modal Loading Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setIsModalOpen(true)}>
          Open Processing Modal
        </Button>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Processing Request</h3>
              
              {isProcessing ? (
                <LoadingSpinner 
                  message="Please wait while we process your request..." 
                  size="lg"
                />
              ) : (
                <div className="space-y-4">
                  <p>Ready to process?</p>
                  <div className="flex gap-2">
                    <Button onClick={handleProcess}>Start Processing</Button>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Example 6: Table Loading States
export const TableLoadingExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string[]>([]);

  const loadTableData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setData(['Provider 1', 'Provider 2', 'Provider 3', 'Provider 4']);
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table Loading Integration</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={loadTableData} disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" inline />
                <span className="ml-2">Loading...</span>
              </>
            ) : (
              'Load Provider Data'
            )}
          </Button>

          <div className="border rounded-lg min-h-[200px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-48">
                <LoadingSpinner message="Loading provider data..." />
              </div>
            ) : data.length > 0 ? (
              <div className="p-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Provider Name</th>
                      <th className="text-left p-2">Specialty</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{item}</td>
                        <td className="p-2">Cardiology</td>
                        <td className="p-2">Active</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                No data loaded
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main integration examples component
export const LoadingSpinnerIntegrationExamples: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">LoadingSpinner Integration Examples</h1>
        <p className="text-gray-600">Practical examples of how to integrate LoadingSpinner into your existing app components</p>
      </div>

      <ProviderDataManagerExample />
      <TemplateManagementExample />
      <BulkOperationsExample />
      <PageLoadingStatesExample />
      <ModalLoadingExample />
      <TableLoadingExample />
    </div>
  );
};

export default LoadingSpinnerIntegrationExamples; 