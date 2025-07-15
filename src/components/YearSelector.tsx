import React from 'react';
import { useYear } from '../contexts/YearContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
// If you use an icon library, import the spinner icon. Otherwise, use a fallback.
// import { RefreshCw } from 'lucide-react';

export function YearSelector() {
  const { selectedYear, setSelectedYear, availableYears, isLoading, error } = useYear();

  const handleYearChange = (value: string) => {
    console.log('YearSelector: Year changed to:', value);
    setSelectedYear(Number(value));
  };

  // Debug logging
  console.log('YearSelector Debug:', {
    selectedYear,
    availableYears,
    isLoading,
    error,
    availableYearsLength: availableYears.length
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700">Year:</span>
      {isLoading ? (
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-gray-200 animate-pulse rounded"></div>
          {/* Replace with your spinner icon if available */}
          <svg className="h-4 w-4 animate-spin text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><path d="M22 12a10 10 0 0 1-10 10"/></svg>
        </div>
      ) : (
        <Select value={selectedYear?.toString() || 'no-years'} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[100px] h-8">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.length === 0 ? (
              <SelectItem value={selectedYear?.toString() || 'no-years'} disabled>
                No years
              </SelectItem>
            ) : (
              availableYears.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
      {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
    </div>
  );
} 