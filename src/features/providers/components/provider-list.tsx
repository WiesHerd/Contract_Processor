import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../store';
import { setProviders, setSelectedProviders, setError, setLoading } from '../../../store/slices/providerSlice';
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
import { generateClient } from 'aws-amplify/api';
import { listProviders } from '../../../graphql/queries';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { AlertCircle } from 'lucide-react';
import type { Provider } from '../../../types/provider';
import type { ListProvidersQuery, ModelProviderConnection } from '../../../API';
import type { GraphQLResult } from '@aws-amplify/api-graphql';

export const ProviderList: React.FC = () => {
  const dispatch = useDispatch();
  const { providers, selectedProviders, error, loading } = useSelector((state: RootState) => state.providers);
  const client = generateClient();

  useEffect(() => {
    const fetchProviders = async () => {
      dispatch(setLoading(true));
      dispatch(setError(null));

      try {
        console.log('Fetching providers...');
        const result = await client.graphql<ListProvidersQuery>({
          query: listProviders,
          authMode: 'apiKey'
        }) as GraphQLResult<ListProvidersQuery>;

        console.log('Raw provider data:', JSON.stringify(result, null, 2));

        const listProvidersData = result.data?.listProviders as ModelProviderConnection | null | undefined;
        const items = listProvidersData?.items ?? [];

        if (items.length > 0) {
          // Transform the data to match our Provider type
          const transformedProviders = items
            .filter((item): item is NonNullable<typeof item> => item !== null)
            .map((item) => {
              console.log('Processing provider:', JSON.stringify(item, null, 2));
              
              // Ensure required fields have default values
              const provider: Provider = {
                id: item.id,
                name: item.name ?? '',
                fte: item.fte ?? 1.0,
                baseSalary: item.baseSalary ?? 0,
                startDate: item.startDate ?? new Date().toISOString().split('T')[0],
                compensationModel: item.compensationType === 'BASE' ? 'BASE' :
                                 item.compensationType === 'PRODUCTIVITY' ? 'PRODUCTIVITY' :
                                 item.compensationType === 'HYBRID' ? 'HYBRID' :
                                 item.compensationType === 'HOSPITALIST' ? 'HOSPITALIST' :
                                 item.compensationType === 'LEADERSHIP' ? 'LEADERSHIP' : 'BASE',
                employeeId: item.employeeId ?? undefined,
                providerType: item.providerType ?? undefined,
                specialty: item.specialty ?? undefined,
                subspecialty: item.subspecialty ?? undefined,
                administrativeFte: item.administrativeFte ?? undefined,
                administrativeRole: item.administrativeRole ?? undefined,
                yearsExperience: item.yearsExperience ?? undefined,
                hourlyWage: item.hourlyWage ?? undefined,
                originalAgreementDate: item.originalAgreementDate ?? undefined,
                organizationName: item.organizationName ?? undefined,
                contractTerm: item.contractTerm ?? undefined,
                ptoDays: item.ptoDays ?? undefined,
                holidayDays: item.holidayDays ?? undefined,
                cmeDays: item.cmeDays ?? undefined,
                cmeAmount: item.cmeAmount ?? undefined,
                signingBonus: item.signingBonus ?? undefined,
                educationBonus: item.educationBonus ?? undefined,
                qualityBonus: item.qualityBonus ?? undefined,
                conversionFactor: item.conversionFactor ?? undefined,
                wRVUTarget: item.wRVUTarget ?? undefined,
                compensationYear: item.compensationYear ?? undefined,
                credentials: item.credentials ?? undefined,
                fteBreakdown: [{
                  activity: 'Clinical',
                  percentage: 100,
                }],
                createdAt: item.createdAt ?? undefined,
                updatedAt: item.updatedAt ?? undefined,
              };

              console.log('Transformed provider:', JSON.stringify(provider, null, 2));
              return provider;
            });

          console.log('All transformed providers:', JSON.stringify(transformedProviders, null, 2));
          dispatch(setProviders(transformedProviders));
        } else {
          console.log('No providers found in response');
          dispatch(setProviders([]));
        }
      } catch (err) {
        console.error('Error fetching providers:', err);
        let errorMessage = 'Failed to fetch providers';
        
        if (err instanceof Error) {
          errorMessage = `${err.name}: ${err.message}`;
          if (err.message?.includes('API key')) {
            errorMessage = 'API key authentication failed. Please check your AWS configuration.';
          }
          if ('cause' in err) {
            errorMessage += `\nCause: ${JSON.stringify(err.cause)}`;
          }
        }
        
        dispatch(setError(errorMessage));
      } finally {
        dispatch(setLoading(false));
      }
    };

    fetchProviders();
  }, [dispatch]);

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

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading providers...</p>
      </div>
    );
  }

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

  if (providers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No providers found in DynamoDB. Please upload a CSV file to get started.
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
                  onCheckedChange={(checked) => handleSelectProvider(provider.id, checked === true)}
                  aria-label={`Select ${provider.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">{provider.name}</TableCell>
              <TableCell>{new Date(provider.startDate).toLocaleDateString()}</TableCell>
              <TableCell>{provider.fte}</TableCell>
              <TableCell>{formatCurrency(provider.baseSalary)}</TableCell>
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