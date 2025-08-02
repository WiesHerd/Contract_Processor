import React, { useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setSelectedProviders, selectProviders, selectProvidersLoading, selectProvidersError } from '@/store/slices/providerSlice';
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

// Define all possible columns with their display names
const COLUMN_CONFIG = [
  { key: 'name', label: 'Provider Name', sticky: true },
  { key: 'employeeId', label: 'Employee ID' },
  { key: 'startDate', label: 'Start Date' },
  { key: 'fte', label: 'FTE' },
  { key: 'baseSalary', label: 'Base Salary' },
  { key: 'hourlyWage', label: 'Hourly Wage' },
  { key: 'providerType', label: 'Provider Type' },
  { key: 'specialty', label: 'Specialty' },
  { key: 'subspecialty', label: 'Subspecialty' },
  { key: 'credentials', label: 'Credentials' },
  { key: 'yearsExperience', label: 'Years Experience' },
  { key: 'compensationType', label: 'Compensation Type' },
  { key: 'compensationYear', label: 'Compensation Year' },
  { key: 'compensationModel', label: 'Compensation Model' },
  { key: 'conversionFactor', label: 'Conversion Factor' },
  { key: 'wRVUTarget', label: 'wRVU Target' },
  { key: 'cmeAmount', label: 'CME Amount' },
  { key: 'cmeDays', label: 'CME Days' },
  { key: 'ptoDays', label: 'PTO Days' },
  { key: 'holidayDays', label: 'Holiday Days' },
  { key: 'signingBonus', label: 'Signing Bonus' },
  { key: 'qualityBonus', label: 'Quality Bonus' },
  { key: 'educationBonus', label: 'Education Bonus' },
  { key: 'originalAgreementDate', label: 'Original Agreement Date' },
  { key: 'contractTerm', label: 'Contract Term' },
  { key: 'organizationName', label: 'Organization Name' },
  { key: 'administrativeRole', label: 'Administrative Role' },
  { key: 'templateTag', label: 'Template Tag' },
];

export const ProviderList: React.FC = () => {
  const dispatch = useDispatch();
  const providers = useSelector(selectProviders);
  const selectedProviders = useSelector((state: RootState) => state.provider.selectedProviders);
  const error = useSelector(selectProvidersError);
  const loading = useSelector(selectProvidersLoading);

  // Get all unique keys from providers to ensure we show all available columns
  const allProviderKeys = useMemo(() => {
    const keys = new Set<string>();
    providers.forEach(provider => {
      Object.keys(provider).forEach(key => keys.add(key));
      
      // Also include dynamic fields
      if (provider.dynamicFields && typeof provider.dynamicFields === 'object') {
        Object.keys(provider.dynamicFields).forEach(key => keys.add(key));
      }
    });
    return Array.from(keys).sort();
  }, [providers]);

  // Create final column config including any additional fields not in our predefined list
  const finalColumnConfig = useMemo(() => {
    const configMap = new Map(COLUMN_CONFIG.map(col => [col.key, col]));
    
    // Add any additional columns found in the data
    allProviderKeys.forEach(key => {
      if (!configMap.has(key)) {
        configMap.set(key, { key, label: key.charAt(0).toUpperCase() + key.slice(1) });
      }
    });
    
    return Array.from(configMap.values());
  }, [allProviderKeys]);

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

  const formatCellValue = (value: any, key: string) => {
    if (value === null || value === undefined || value === '') {
      return 'N/A';
    }

    // Format dates
    if (key.includes('Date') || key.includes('date')) {
      if (typeof value === 'string') {
        if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
          // Convert YYYY-MM-DD to MM/DD/YYYY
          const [year, month, day] = value.split('-');
          return `${month}/${day}/${year}`;
        }
        return value;
      }
    }

    // Format currency fields
    if (key.includes('Salary') || key.includes('Bonus') || key.includes('Amount') || key.includes('Wage')) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return formatCurrency(num);
      }
    }

    // Format percentages and ratios
    if (key.includes('Factor') || key === 'fte' || key === 'administrativeFte' || key === 'Administrative FTE') {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return num.toFixed(2);
      }
    }

    // Format integers
    if (key.includes('Days') || key.includes('Experience') || key.includes('Term') || key.includes('Year')) {
      const num = parseInt(value);
      if (!isNaN(num)) {
        return num.toString();
      }
    }

    return value.toString();
  };

  const getProviderValue = (provider: any, key: string) => {
    // First try to get from main provider fields
    let value = provider[key];
    
    // If not found, check dynamic fields
    if (value === null || value === undefined) {
      if (provider.dynamicFields && typeof provider.dynamicFields === 'object') {
        value = provider.dynamicFields[key];
      }
    }
    
    return value;
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
    <div className="relative w-full">
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
      
      {/* Horizontal scroll container */}
      <div className="overflow-x-auto border rounded-lg">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] sticky left-0 bg-gray-50 z-20 font-semibold text-sm text-gray-900" style={{ color: 'red', fontWeight: 400 }}>
                <Checkbox
                  checked={selectedProviders.length > 0 && selectedProviders.length === providers.length}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all providers"
                />
              </TableHead>
              {finalColumnConfig.map((column) => (
                <TableHead
                  key={column.key}
                  className={
                    column.sticky
                      ? 'sticky left-[50px] bg-gray-50 z-10 font-semibold text-sm text-gray-900'
                      : 'font-semibold text-sm text-gray-900 bg-gray-50'
                  }
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {providers.map((provider, rowIdx) => (
              <TableRow key={provider.id} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <TableCell className="sticky left-0 bg-white z-20">
                  <Checkbox
                    checked={selectedProviders.includes(provider.id)}
                    onCheckedChange={(checked) => handleSelectProvider(provider.id, checked === true)}
                    aria-label={`Select ${provider.name}`}
                  />
                </TableCell>
                {finalColumnConfig.map((column, colIdx) => {
                  const isNumeric = [
                    'fte', 'administrativeFte', 'Administrative FTE', 'baseSalary', 'hourlyWage', 'yearsExperience',
                    'cmeAmount', 'cmeDays', 'ptoDays', 'holidayDays', 'signingBonus', 'qualityBonus',
                    'educationBonus', 'contractTerm', 'conversionFactor', 'wRVUTarget'
                  ].includes(column.key);
                  // Enterprise-grade: Only Provider Name is bold and dark
                  if (column.key === 'name') {
                    return (
                      <TableCell
                        key={column.key}
                        className={
                          (column.sticky ? 'sticky left-[50px] bg-white z-10 ' : '') +
                          ' font-semibold text-gray-900 text-left'
                        }
                      >
                        {formatCellValue(getProviderValue(provider, column.key), column.key)}
                      </TableCell>
                    );
                  }
                  return (
                    <TableCell
                      key={column.key}
                      className={
                        (column.sticky ? 'sticky left-[50px] bg-white z-10 ' : '') +
                        ' font-normal text-sm ' +
                        (isNumeric ? 'text-right text-gray-700' : 'text-left text-gray-700')
                      }
                    >
                      {formatCellValue(getProviderValue(provider, column.key), column.key)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}; 