import React from 'react';
import { ProviderUploadForm } from '../components/provider-upload-form';
import { ProviderList } from '../components/provider-list';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import { Button } from '../../../components/ui/button';
import { Download } from 'lucide-react';

export const ProvidersPage: React.FC = () => {
  const { providers, selectedProviders } = useSelector((state: RootState) => state.provider);

  const handleBulkDownload = async () => {
    if (selectedProviders.length === 0) return;
    // TODO: Implement bulk contract generation and download
    console.log('Bulk download for providers:', selectedProviders);
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Provider Management</h1>
        {selectedProviders.length > 0 && (
          <Button
            onClick={handleBulkDownload}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Generate Contracts ({selectedProviders.length})
          </Button>
        )}
      </div>

      <div className="grid gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Upload Providers</h2>
          <ProviderUploadForm />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Provider List</h2>
          <ProviderList />
        </section>
      </div>
    </div>
  );
}; 