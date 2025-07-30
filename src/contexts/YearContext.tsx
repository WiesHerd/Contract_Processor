import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface YearContextType {
  selectedYear: number | null;
  setSelectedYear: (year: number | null) => void;
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
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshYears = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get providers from DynamoDB to extract available years
      const { generateClient } = await import('aws-amplify/api');
      const client = generateClient();
      
      const result: any = await client.graphql({
        query: `
          query ListProviders($limit: Int) {
            listProviders(limit: $limit) {
              items {
                compensationYear
              }
            }
          }
        `,
        variables: { limit: 1000 }
      });
      
      const providers = result.data?.listProviders?.items || [];
      const yearSet = new Set(providers.map((p: any) => parseInt(p.compensationYear)).filter((y: number) => !isNaN(y)));
      const yearsArray = Array.from(yearSet);
      const years: number[] = yearsArray.map((y: any) => y as number).sort((a: number, b: number) => b - a);
      
      console.log('YearContext: Found years from DynamoDB:', years);
      setAvailableYears(years);
      
      // Set selected year to the most recent year if available
      if (years.length > 0 && !selectedYear) {
        setSelectedYear(years[0]);
        console.log('YearContext: Set selected year to:', years[0]);
      }
      
    } catch (error) {
      console.error('Error fetching available years:', error);
      setError('Failed to load available years');
      setAvailableYears([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load available years on mount
  useEffect(() => {
    refreshYears();
  }, []);

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