import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setSelectedProviders } from '@/store/slices/providerSlice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils/format';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export const ProviderList: React.FC = () => {
  const dispatch = useDispatch();
  const { providers, selectedProviders, error, loading } = useSelector((state: RootState) => state.provider);

  const handleSelectAll = (checked: boolean) => {
    dispatch(setSelectedProviders(checked ? providers.map(p => p.id) : []));
  };

  const handleSelectProvider = (providerId: string, checked: boolean) => {
    dispatch(setSelectedProviders(
      checked
        ? [...selectedProviders, providerId]
        : selectedProviders.filter(id => id !== providerId)
    ));
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <pre className="whitespace-pre-wrap font-mono text-sm">{error}</pre>
        </AlertDescription>
      </Alert>
    );
  }

  // Initial loading state
  if (loading && providers.length === 0) {
    return (
      <div className="text-center py-8">
        <LoadingSpinner 
          size="md" 
          message="Loading providers..." 
          color="primary"
        />
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No providers found in DynamoDB. Please upload a CSV file to get started.
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-x-auto">
      {/* Refreshing overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <LoadingSpinner 
            size="md" 
            message="Refreshing providers..." 
            color="primary"
          />
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedProviders.length > 0 && selectedProviders.length === providers.length}
                onCheckedChange={handleSelectAll}
                aria-label="Select all providers"
              />
            </TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>FTE</TableHead>
            <TableHead>Base Salary</TableHead>
            <TableHead>Model</TableHead>
            <TableHead>Template</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((provider) => (
            <TableRow key={provider.id}>
              <TableCell>
                <Checkbox
                  checked={selectedProviders.includes(provider.id)}
                  onCheckedChange={(checked) => handleSelectProvider(provider.id, checked === true)}
                  aria-label={`Select ${provider.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">{provider.name}</TableCell>
              <TableCell>{provider.startDate ? new Date(provider.startDate).toLocaleDateString() : 'N/A'}</TableCell>
              <TableCell>{provider.fte}</TableCell>
              <TableCell>{formatCurrency(provider.baseSalary ?? 0)}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {provider.compensationModel || 'BASE'}
                </Badge>
              </TableCell>
              <TableCell>
                {provider.templateTag ? (
                  <Badge variant="secondary">
                    {provider.templateTag}
                  </Badge>
                ) : (
                  <span className="text-gray-400">Not assigned</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}; 