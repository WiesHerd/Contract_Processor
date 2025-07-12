import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Info } from 'lucide-react';

interface ColumnAnalysisResult {
  columnName: string;
  hasData: boolean;
  dataCount: number;
  totalProviders: number;
  percentage: number;
  isDynamicField: boolean;
}

interface DynamicColumnTestProps {
  providers: any[];
}

export const DynamicColumnTest: React.FC<DynamicColumnTestProps> = ({ providers }) => {
  const analyzeColumns = (): ColumnAnalysisResult[] => {
    if (!providers || providers.length === 0) return [];
    
    const columnDataMap = new Map<string, { 
      hasData: boolean; 
      count: number; 
      isDynamicField: boolean;
    }>();
    
    providers.forEach(provider => {
      // Check schema fields (non-core fields)
      Object.entries(provider).forEach(([key, value]) => {
        if (
          key !== 'id' && key !== 'createdAt' && key !== 'updatedAt' && 
          key !== '__typename' && key !== 'dynamicFields' &&
          key !== 'name' && key !== 'employeeId' && key !== 'providerType' &&
          key !== 'specialty' && key !== 'subspecialty' && key !== 'fte' &&
          key !== 'administrativeFte' && key !== 'administrativeRole' &&
          key !== 'yearsExperience' && key !== 'hourlyWage' && key !== 'baseSalary' &&
          key !== 'originalAgreementDate' && key !== 'organizationName' &&
          key !== 'startDate' && key !== 'contractTerm' && key !== 'ptoDays' &&
          key !== 'holidayDays' && key !== 'cmeDays' && key !== 'cmeAmount' &&
          key !== 'signingBonus' && key !== 'educationBonus' && key !== 'qualityBonus' &&
          key !== 'compensationType' && key !== 'conversionFactor' && key !== 'wRVUTarget' &&
          key !== 'compensationYear' && key !== 'credentials' && key !== 'compensationModel' &&
          key !== 'templateTag'
        ) {
          const hasValue = value !== undefined && value !== null && value !== '';
          if (!columnDataMap.has(key)) {
            columnDataMap.set(key, { hasData: false, count: 0, isDynamicField: false });
          }
          const columnInfo = columnDataMap.get(key)!;
          if (hasValue) {
            columnInfo.hasData = true;
            columnInfo.count++;
          }
        }
      });
      
      // Check dynamic fields
      try {
        const dynamicFields = typeof provider.dynamicFields === 'string' 
          ? JSON.parse(provider.dynamicFields || '{}')
          : provider.dynamicFields || {};
        
        Object.entries(dynamicFields).forEach(([key, value]) => {
          const hasValue = value !== undefined && value !== null && value !== '';
          if (!columnDataMap.has(key)) {
            columnDataMap.set(key, { hasData: false, count: 0, isDynamicField: true });
          }
          const columnInfo = columnDataMap.get(key)!;
          if (hasValue) {
            columnInfo.hasData = true;
            columnInfo.count++;
          }
        });
      } catch (error) {
        console.warn('Failed to parse dynamic fields:', error);
      }
    });
    
    return Array.from(columnDataMap.entries())
      .map(([columnName, info]) => ({
        columnName,
        hasData: info.hasData,
        dataCount: info.count,
        totalProviders: providers.length,
        percentage: Math.round((info.count / providers.length) * 100),
        isDynamicField: info.isDynamicField,
      }))
      .sort((a, b) => {
        // Sort by: has data first, then by percentage, then by name
        if (a.hasData !== b.hasData) return b.hasData ? 1 : -1;
        if (a.percentage !== b.percentage) return b.percentage - a.percentage;
        return a.columnName.localeCompare(b.columnName);
      });
  };

  const columnAnalysis = analyzeColumns();
  const columnsWithData = columnAnalysis.filter(col => col.hasData);
  const emptyColumns = columnAnalysis.filter(col => !col.hasData);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Enterprise-Grade Column Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Columns with Data ({columnsWithData.length})
              </h3>
              <div className="space-y-2">
                {columnsWithData.map(column => (
                  <div key={column.columnName} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{column.columnName}</span>
                      {column.isDynamicField && (
                        <Badge variant="secondary" className="text-xs">Dynamic</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {column.dataCount}/{column.totalProviders} ({column.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-red-600 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                Empty Columns (Hidden) ({emptyColumns.length})
              </h3>
              <div className="space-y-2">
                {emptyColumns.map(column => (
                  <div key={column.columnName} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-500">{column.columnName}</span>
                      {column.isDynamicField && (
                        <Badge variant="outline" className="text-xs">Dynamic</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {column.dataCount}/{column.totalProviders} ({column.percentage}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded">
            <p className="text-sm text-blue-800">
              <strong>Enterprise Feature:</strong> Only columns with actual data are displayed in the provider table. 
              This prevents empty columns from cluttering the interface and ensures a clean, professional user experience.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 