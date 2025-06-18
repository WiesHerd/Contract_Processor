import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { setSelectedProviders } from '../../../store/slices/providerSlice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Checkbox } from '../../../components/ui/checkbox';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency } from '../../../utils/format';

export const ProviderList: React.FC = () => {
  const dispatch = useDispatch();
  const { providers, selectedProviders } = useSelector((state: RootState) => state.providers);

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

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No providers uploaded yet. Please upload a CSV file to get started.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox
                checked={selectedProviders.length === providers.length}
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
                  onCheckedChange={(checked) => handleSelectProvider(provider.id, checked as boolean)}
                  aria-label={`Select ${provider.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">{provider.name}</TableCell>
              <TableCell>{new Date(provider.startDate).toLocaleDateString()}</TableCell>
              <TableCell>{provider.fte}</TableCell>
              <TableCell>{formatCurrency(provider.baseSalary)}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {provider.compensationModel}
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