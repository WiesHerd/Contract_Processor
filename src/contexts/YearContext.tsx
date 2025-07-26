import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { generateClient } from 'aws-amplify/api';
import { listFiles } from '../utils/s3Storage';
import config from '../amplifyconfiguration.json';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// Get AWS configuration from Amplify config with fallbacks
const getAWSConfig = () => {
  // Try environment variables first (for local development)
  const region = import.meta.env.VITE_AWS_REGION || config.aws_project_region || 'us-east-2';
  const accessKeyId = import.meta.env.VITE_AWS_ACCESS_KEY_ID;
  const secretAccessKey = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY;
  
  return { region, accessKeyId, secretAccessKey };
};

const awsConfig = getAWSConfig();

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
      
      const years = (result as any)?.data?.listProviderYears || [];
      const validYears = years.map((year: string) => parseInt(year)).filter(validateYear);
      
      return validYears;
    } catch (error) {
      console.error('Error fetching provider years:', error);
      return [];
    }
  };

  // Fetch years from S3 (contracts)
  const fetchContractYears = async (): Promise<number[]> => {
    try {
      // List all contract files in S3
      const contractFiles = await listFiles('contracts/');
      
      // Extract years from contract file paths
      // Contract paths are: contracts/{contractId}/{fileName}
      // Contract IDs contain year: {providerId}-{templateId}-{year}
      const years = new Set<number>();
      
      contractFiles.forEach(file => {
        // Extract year from contract ID in the path
        const pathParts = file.split('/');
        if (pathParts.length >= 2) {
          const contractId = pathParts[1]; // contracts/contractId/fileName
          const contractParts = contractId.split('-');
          if (contractParts.length >= 3) {
            const yearStr = contractParts[contractParts.length - 1]; // Last part is year
            const year = parseInt(yearStr);
            if (validateYear(year)) {
              years.add(year);
            }
          }
        }
      });
      
      const result = Array.from(years).sort((a, b) => b - a); // Sort descending
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
      
      // If no years found from GraphQL/S3, try fallback from Redux store
      if (sortedYears.length === 0) {
        const fallbackYears = extractYearsFromProviders();
        sortedYears = fallbackYears;
      }
      
      setAvailableYears(sortedYears);
      
      // Set the most recent year as selected if we have years
      if (sortedYears.length > 0) {
        const mostRecentYear = sortedYears[0];
        setSelectedYear(mostRecentYear);
      } else {
        // Fallback to current year if no data found
        const currentYear = new Date().getFullYear();
        setSelectedYear(currentYear);
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