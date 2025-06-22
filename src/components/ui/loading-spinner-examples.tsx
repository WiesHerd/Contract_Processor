import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from './loading-spinner';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

/**
 * Examples of how to use the LoadingSpinner component throughout the app.
 * This file demonstrates various use cases and can be used as a reference.
 */

// Example 1: Basic usage in a component
export const BasicLoadingExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadData = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Loading Example</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={handleLoadData} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Load Data'}
        </Button>
        
        {isLoading && (
          <div className="mt-4">
            <LoadingSpinner message="Fetching data..." />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Example 2: Different sizes
export const SizeVariantsExample: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Size Variants</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <LoadingSpinner size="sm" />
            <p className="text-sm text-gray-600 mt-2">Small</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="md" />
            <p className="text-sm text-gray-600 mt-2">Medium</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="text-sm text-gray-600 mt-2">Large</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size="xl" />
            <p className="text-sm text-gray-600 mt-2">Extra Large</p>
          </div>
          <div className="text-center">
            <LoadingSpinner size={80} />
            <p className="text-sm text-gray-600 mt-2">Custom (80px)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Example 3: Color variants
export const ColorVariantsExample: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Variants</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-8">
          <div className="text-center">
            <LoadingSpinner color="primary" />
            <p className="text-sm text-gray-600 mt-2">Primary</p>
          </div>
          <div className="text-center">
            <LoadingSpinner color="secondary" />
            <p className="text-sm text-gray-600 mt-2">Secondary</p>
          </div>
          <div className="text-center">
            <LoadingSpinner color="gray" />
            <p className="text-sm text-gray-600 mt-2">Gray</p>
          </div>
          <div className="text-center bg-gray-800 p-4 rounded">
            <LoadingSpinner color="white" />
            <p className="text-sm text-white mt-2">White</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Example 4: Inline loading (for buttons, etc.)
export const InlineLoadingExample: React.FC = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inline Loading</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" inline />
                <span className="ml-2">Submitting...</span>
              </>
            ) : (
              'Submit Form'
            )}
          </Button>

          <div className="flex items-center gap-2">
            <span>Processing:</span>
            {isSubmitting && <LoadingSpinner size="sm" inline />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Example 5: Page-level loading
export const PageLoadingExample: React.FC = () => {
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    // Simulate page load
    const timer = setTimeout(() => setIsPageLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (isPageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner 
          size="lg" 
          message="Loading your dashboard..." 
          color="primary"
        />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Page Content Loaded</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Your page content goes here...</p>
      </CardContent>
    </Card>
  );
};

// Example 6: Data table loading
export const TableLoadingExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string[]>([]);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setData(['Item 1', 'Item 2', 'Item 3']);
    setIsLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table Loading</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={loadData} disabled={isLoading}>
          Load Table Data
        </Button>

        <div className="mt-4 min-h-[200px]">
          {isLoading ? (
            <LoadingSpinner message="Loading table data..." />
          ) : data.length > 0 ? (
            <div className="space-y-2">
              {data.map((item, index) => (
                <div key={index} className="p-2 border rounded">
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data loaded</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Example 7: Modal/Overlay loading
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
        <CardTitle>Modal Loading</CardTitle>
      </CardHeader>
      <CardContent>
        <Button onClick={() => setIsModalOpen(true)}>
          Open Modal
        </Button>

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Processing...</h3>
              
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

// Example 8: Custom styling
export const CustomStylingExample: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Styling</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Custom color */}
          <div className="text-center">
            <LoadingSpinner 
              size="lg" 
              color="text-blue-600" 
              message="Custom blue color"
            />
          </div>

          {/* Custom container */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-8 rounded-lg">
            <LoadingSpinner 
              size="lg" 
              color="white" 
              message="Gradient background"
            />
          </div>

          {/* Custom size with message */}
          <div className="text-center">
            <LoadingSpinner 
              size={100} 
              color="text-green-600" 
              message="Large custom size"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Main examples component
export const LoadingSpinnerExamples: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">LoadingSpinner Examples</h1>
        <p className="text-gray-600">Comprehensive examples of how to use the LoadingSpinner component</p>
      </div>

      <BasicLoadingExample />
      <SizeVariantsExample />
      <ColorVariantsExample />
      <InlineLoadingExample />
      <PageLoadingExample />
      <TableLoadingExample />
      <ModalLoadingExample />
      <CustomStylingExample />
    </div>
  );
};

export default LoadingSpinnerExamples; 