import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap, CheckCircle, AlertCircle } from 'lucide-react';

interface FieldPattern {
  id: string;
  pattern: string;
  type: 'parent' | 'child';
  parentId?: string;
  suggestedMapping: string;
  confidence: number;
  description: string;
}

interface DetectedGroup {
  parentField: string;
  childFields: string[];
  totalValue?: number;
  suggestedMappings: { [key: string]: string };
  confidence: number;
}

interface DynamicFieldDetectorProps {
  csvColumns?: string[];
  onMappingApplied?: (mappings: { [key: string]: string }) => void;
  className?: string;
}

export const DynamicFieldDetector: React.FC<DynamicFieldDetectorProps> = ({
  csvColumns = [],
  onMappingApplied,
  className = ''
}) => {
  const [detectedGroups, setDetectedGroups] = useState<DetectedGroup[]>([]);
  const [appliedMappings, setAppliedMappings] = useState<{ [key: string]: string }>({});

  // Sample CSV columns for demo
  const demoColumns = csvColumns.length > 0 ? csvColumns : [
    'ProviderName',
    'TotalFTE',
    'ClinicalFTE',
    'AdminFTE',
    'ResearchFTE',
    'BaseSalary',
    'ClinicalSalary',
    'AdminSalary',
    'ResearchSalary',
    'TotalHours',
    'ClinicalHours',
    'AdminHours',
    'TeachingHours',
    'StartDate',
    'Department',
    'Division'
  ];

  // Smart pattern detection logic
  const detectPatterns = (columns: string[]): DetectedGroup[] => {
    const groups: DetectedGroup[] = [];
    
    // FTE Pattern Detection
    const fteColumns = columns.filter(col => 
      col.toLowerCase().includes('fte') || col.toLowerCase().includes('fulltime')
    );
    
    if (fteColumns.length > 1) {
      const totalFTE = fteColumns.find(col => 
        col.toLowerCase().includes('total') || col.toLowerCase() === 'fte'
      );
      const childFTEs = fteColumns.filter(col => col !== totalFTE);
      
      if (totalFTE && childFTEs.length > 0) {
        const mappings: { [key: string]: string } = {};
        mappings[totalFTE] = '{{TotalFTE}}';
        
        childFTEs.forEach(field => {
          const fieldName = field.replace(/FTE/gi, '').replace(/^(Clinical|Admin|Research|Teaching).*/, '$1');
          mappings[field] = `{{${fieldName}FTE}}`;
        });

        groups.push({
          parentField: totalFTE,
          childFields: childFTEs,
          suggestedMappings: mappings,
          confidence: 0.95
        });
      }
    }

    // Salary Pattern Detection
    const salaryColumns = columns.filter(col => 
      col.toLowerCase().includes('salary') || col.toLowerCase().includes('compensation')
    );
    
    if (salaryColumns.length > 1) {
      const totalSalary = salaryColumns.find(col => 
        col.toLowerCase().includes('total') || col.toLowerCase().includes('base')
      );
      const childSalaries = salaryColumns.filter(col => col !== totalSalary);
      
      if (totalSalary && childSalaries.length > 0) {
        const mappings: { [key: string]: string } = {};
        mappings[totalSalary] = '{{BaseSalary}}';
        
        childSalaries.forEach(field => {
          const fieldName = field.replace(/Salary/gi, '').replace(/^(Clinical|Admin|Research|Teaching).*/, '$1');
          mappings[field] = `{{${fieldName}Salary}}`;
        });

        groups.push({
          parentField: totalSalary,
          childFields: childSalaries,
          suggestedMappings: mappings,
          confidence: 0.88
        });
      }
    }

    // Hours Pattern Detection
    const hoursColumns = columns.filter(col => 
      col.toLowerCase().includes('hours') || col.toLowerCase().includes('time')
    );
    
    if (hoursColumns.length > 1) {
      const totalHours = hoursColumns.find(col => 
        col.toLowerCase().includes('total') || col.toLowerCase() === 'hours'
      );
      const childHours = hoursColumns.filter(col => col !== totalHours);
      
      if (totalHours && childHours.length > 0) {
        const mappings: { [key: string]: string } = {};
        mappings[totalHours] = '{{TotalHours}}';
        
        childHours.forEach(field => {
          const fieldName = field.replace(/Hours/gi, '').replace(/^(Clinical|Admin|Research|Teaching).*/, '$1');
          mappings[field] = `{{${fieldName}Hours}}`;
        });

        groups.push({
          parentField: totalHours,
          childFields: childHours,
          suggestedMappings: mappings,
          confidence: 0.82
        });
      }
    }

    return groups;
  };

  useEffect(() => {
    const detected = detectPatterns(demoColumns);
    setDetectedGroups(detected);
  }, [demoColumns]);

  const handleApplyMapping = (group: DetectedGroup) => {
    const newMappings = { ...appliedMappings, ...group.suggestedMappings };
    setAppliedMappings(newMappings);
    
    if (onMappingApplied) {
      onMappingApplied(group.suggestedMappings);
    }
  };

  const handleApplyAllMappings = () => {
    const allMappings = detectedGroups.reduce((acc, group) => {
      return { ...acc, ...group.suggestedMappings };
    }, {});
    
    setAppliedMappings(allMappings);
    
    if (onMappingApplied) {
      onMappingApplied(allMappings);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800';
    if (confidence >= 0.8) return 'bg-blue-100 text-blue-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const getConfidenceText = (confidence: number) => {
    if (confidence >= 0.9) return 'High Confidence';
    if (confidence >= 0.8) return 'Good Confidence';
    return 'Medium Confidence';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Smart Field Detection
          </CardTitle>
          <p className="text-sm text-gray-600">
            Automatically detects parent-child relationships and suggests field mappings
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  Detected {detectedGroups.length} pattern group{detectedGroups.length !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-gray-600">
                  {Object.keys(appliedMappings).length} mappings applied
                </p>
              </div>
              {detectedGroups.length > 0 && (
                <Button 
                  onClick={handleApplyAllMappings}
                  className="bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  Apply All Mappings
                </Button>
              )}
            </div>

            {/* Detected Groups */}
            {detectedGroups.map((group, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {/* Group Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getConfidenceColor(group.confidence)}>
                          {getConfidenceText(group.confidence)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {Math.round(group.confidence * 100)}% match
                        </span>
                      </div>
                      <Button
                        onClick={() => handleApplyMapping(group)}
                        size="sm"
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        Apply Mapping
                      </Button>
                    </div>

                    {/* Parent Field */}
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-blue-900">Parent Field</p>
                          <p className="text-sm text-blue-700">{group.parentField}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4 text-blue-600" />
                          <Badge variant="outline" className="border-blue-200 text-blue-700">
                            {group.suggestedMappings[group.parentField]}
                          </Badge>
                          {appliedMappings[group.parentField] && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Child Fields */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Child Fields</p>
                      {group.childFields.map((field, fieldIndex) => (
                        <div key={fieldIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm">{field}</span>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <Badge variant="outline" className="text-xs">
                              {group.suggestedMappings[field]}
                            </Badge>
                            {appliedMappings[field] && (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* No patterns detected */}
            {detectedGroups.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm">No parent-child patterns detected in the current data</p>
                <p className="text-xs text-gray-400 mt-1">
                  Upload a CSV with FTE, Salary, or Hours breakdown fields to see suggestions
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Applied Mappings Summary */}
      {Object.keys(appliedMappings).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Applied Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(appliedMappings).map(([field, mapping]) => (
                <div key={field} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm font-medium">{field}</span>
                  <Badge className="bg-green-100 text-green-800">{mapping}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DynamicFieldDetector; 