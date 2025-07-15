import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listFiles } from '@/utils/s3Storage';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
  setAvailableYears: (years: number[]) => void;
  isLoading: boolean;
  error: string | null;
  refreshYears: () => Promise<void>;
}

const YearContext = createContext<YearContextType | undefined>(undefined);

interface YearProviderProps {
  children: ReactNode;
}

export function YearProvider({ children }: YearProviderProps) {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get providers from Redux store as fallback
  const providers = useSelector((state: RootState) => state.provider.providers);

  // Industry-standard year validation
  const validateYear = (year: number): boolean => {
    const currentYear = new Date().getFullYear();
    // Allow years from 2020 to current year + 2 (for planning)
    return year >= 2020 && year <= currentYear + 2;
  };

  // Fallback: Extract years from providers in Redux store
  const extractYearsFromProviders = (): number[] => {
    console.log('Extracting years from providers in Redux store...');
    console.log('Providers count:', providers.length);
    
    const years = new Set<number>();
    providers.forEach(provider => {
      if (provider.compensationYear) {
        const year = parseInt(provider.compensationYear.toString());
        console.log('Provider year:', year, 'from provider:', provider.name);
        if (validateYear(year)) {
          years.add(year);
        }
      }
    });
    
    const result = Array.from(years).sort((a, b) => b - a);
    console.log('Years extracted from Redux providers:', result);
    return result;
  };

  // Fetch years from DynamoDB (providers)
  const fetchProviderYears = async (): Promise<number[]> => {
    try {
      const client = generateClient();
      console.log('Fetching provider years from GraphQL...');
      
      const result = await client.graphql({
        query: /* GraphQL */ `
          query ListProviderYears {
            listProviderYears
          }
        `
      });
      
      console.log('GraphQL result:', result);
      
      const years = (result as any)?.data?.listProviderYears || [];
      console.log('Raw years from GraphQL:', years);
      
      const validYears = years.map((year: string) => parseInt(year)).filter(validateYear);
      console.log('Valid years after filtering:', validYears);
      
      return validYears;
    } catch (error) {
      console.error('Error fetching provider years:', error);
      return [];
    }
  };

  // Fetch years from S3 (contracts)
  const fetchContractYears = async (): Promise<number[]> => {
    try {
      console.log('Fetching contract years from S3...');
      
      // List all contract files in S3
      const contractFiles = await listFiles('contracts/');
      console.log('Contract files found:', contractFiles);
      
      // Extract years from contract file paths
      // Contract paths are: contracts/{contractId}/{fileName}
      // Contract IDs contain year: {providerId}-{templateId}-{year}
      const years = new Set<number>();
      
      contractFiles.forEach(file => {
        console.log('Processing contract file:', file);
        // Extract year from contract ID in the path
        const pathParts = file.split('/');
        if (pathParts.length >= 2) {
          const contractId = pathParts[1]; // contracts/contractId/fileName
          console.log('Contract ID:', contractId);
          const contractParts = contractId.split('-');
          if (contractParts.length >= 3) {
            const yearStr = contractParts[contractParts.length - 1]; // Last part is year
            const year = parseInt(yearStr);
            console.log('Extracted year:', year, 'from', yearStr);
            if (validateYear(year)) {
              years.add(year);
            }
          }
        }
      });
      
      const result = Array.from(years).sort((a, b) => b - a); // Sort descending
      console.log('Years extracted from S3:', result);
      return result;
    } catch (error) {
      console.error('Error fetching contract years from S3:', error);
      return [];
    }
  };

  // Main function to fetch all available years
  const fetchAvailableYears = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch years from both sources in parallel
      const [providerYears, contractYears] = await Promise.all([
        fetchProviderYears(),
        fetchContractYears()
      ]);
      
      // Combine and deduplicate years
      const allYears = new Set([...providerYears, ...contractYears]);
      let sortedYears = Array.from(allYears).sort((a, b) => b - a); // Sort descending
      
      console.log('Available years found:', {
        providerYears,
        contractYears,
        combined: sortedYears
      });
      
      // If no years found from GraphQL/S3, try fallback from Redux store
      if (sortedYears.length === 0) {
        console.log('No years found from GraphQL/S3, trying Redux fallback...');
        const fallbackYears = extractYearsFromProviders();
        sortedYears = fallbackYears;
        console.log('Fallback years from Redux:', sortedYears);
      }
      
      setAvailableYears(sortedYears);
      
      // Set the most recent year as selected if we have years
      if (sortedYears.length > 0) {
        const mostRecentYear = sortedYears[0];
        setSelectedYear(mostRecentYear);
        console.log(`Set selected year to most recent: ${mostRecentYear}`);
      } else {
        // Fallback to current year if no data found
        const currentYear = new Date().getFullYear();
        setSelectedYear(currentYear);
        console.log(`No data found, using current year: ${currentYear}`);
      }
    } catch (error) {
      console.error('Error fetching available years:', error);
      setError('Failed to load available years. Please refresh the page.');
      
      // Fallback to current year
      const currentYear = new Date().getFullYear();
      setSelectedYear(currentYear);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh function for manual updates
  const refreshYears = async (): Promise<void> => {
    await fetchAvailableYears();
  };

  // Initial fetch on mount and when providers change
  useEffect(() => {
    fetchAvailableYears();
  }, []);

  // Also refresh years when providers are loaded in Redux
  useEffect(() => {
    if (providers.length > 0 && availableYears.length === 0) {
      console.log('Providers loaded in Redux, refreshing years...');
      fetchAvailableYears();
    }
  }, [providers.length, availableYears.length]);

  // Test function to manually test the GraphQL query
  const testGraphQLQuery = async () => {
    try {
      console.log('Testing GraphQL query manually...');
      const client = generateClient();
      
      // Test the listProviderYears query
      const result = await client.graphql({
        query: /* GraphQL */ `
          query ListProviderYears {
            listProviderYears
          }
        `
      });
      
      console.log('Manual GraphQL test result:', result);
      
    } catch (error) {
      console.error('Manual GraphQL test error:', error);
    }
  };

  // Debug logging
  useEffect(() => {
    console.log('YearContext Debug:', {
      selectedYear,
      availableYears,
      isLoading,
      error,
      providersCount: providers.length,
      providersWithYears: providers.filter(p => p.compensationYear).length
    });
    
    // Run the test function after a delay
    setTimeout(() => {
      if (availableYears.length === 0) {
        console.log('No years found, running manual test...');
        testGraphQLQuery();
      }
    }, 2000);
  }, [selectedYear, availableYears, isLoading, error, providers.length]);

  const value: YearContextType = {
    selectedYear,
    setSelectedYear,
    availableYears,
    setAvailableYears,
    isLoading,
    error,
    refreshYears,
  };

  return (
    <YearContext.Provider value={value}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (context === undefined) {
    throw new Error('useYear must be used within a YearProvider');
  }
  return context;
} 