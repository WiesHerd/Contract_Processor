import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DynamicFieldDetector } from './dynamic-field-detector';
import { Upload, Database, Zap, FileText } from 'lucide-react';

const DynamicFieldDemo: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState('scenario1');
  const [appliedMappings, setAppliedMappings] = useState<{ [key: string]: string }>({});

  // Different CSV scenarios for testing
  const scenarios = {
    scenario1: {
      name: 'Academic Medical Center',
      description: 'Typical physician with clinical, administrative, and research duties',
      columns: [
        'ProviderName',
        'TotalFTE',
        'ClinicalFTE',
        'AdminFTE',
        'ResearchFTE',
        'BaseSalary',
        'ClinicalSalary',
        'AdminSalary',
        'ResearchSalary',
        'StartDate',
        'Department'
      ]
    },
    scenario2: {
      name: 'Division Chief',
      description: 'Leadership role with clinical and administrative responsibilities',
      columns: [
        'ProviderName',
        'TotalFTE',
        'ClinicalFTE',
        'AdminFTE',
        'LeadershipFTE',
        'BaseSalary',
        'ClinicalSalary',
        'AdminSalary',
        'LeadershipSalary',
        'TotalHours',
        'ClinicalHours',
        'AdminHours',
        'LeadershipHours',
        'StartDate',
        'Title'
      ]
    },
    scenario3: {
      name: 'Hospitalist Group',
      description: 'Pure clinical role with shift-based scheduling',
      columns: [
        'ProviderName',
        'TotalFTE',
        'ClinicalFTE',
        'BaseSalary',
        'ClinicalSalary',
        'TotalHours',
        'ClinicalHours',
        'ShiftHours',
        'StartDate',
        'ServiceLine'
      ]
    },
    scenario4: {
      name: 'Complex Academic Role',
      description: 'Multi-faceted role with teaching, research, and clinical duties',
      columns: [
        'ProviderName',
        'TotalFTE',
        'ClinicalFTE',
        'TeachingFTE',
        'ResearchFTE',
        'AdminFTE',
        'BaseSalary',
        'ClinicalSalary',
        'TeachingSalary',
        'ResearchSalary',
        'AdminSalary',
        'TotalHours',
        'ClinicalHours',
        'TeachingHours',
        'ResearchHours',
        'AdminHours',
        'StartDate',
        'Department',
        'Division'
      ]
    }
  };

  const handleMappingApplied = (mappings: { [key: string]: string }) => {
    setAppliedMappings(prev => ({ ...prev, ...mappings }));
  };

  const clearMappings = () => {
    setAppliedMappings({});
  };

  const currentScenario = scenarios[selectedScenario as keyof typeof scenarios];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Dynamic Field Detection Demo</h1>
        <p className="text-lg text-gray-600">
          Smart pattern recognition for provider data mapping
        </p>
      </div>

      {/* Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Test Scenarios
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select different provider data scenarios to see how the system detects patterns
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedScenario} onValueChange={setSelectedScenario} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              {Object.entries(scenarios).map(([key, scenario]) => (
                <TabsTrigger key={key} value={key} className="text-xs">
                  {scenario.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {Object.entries(scenarios).map(([key, scenario]) => (
              <TabsContent key={key} value={key} className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900">{scenario.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{scenario.description}</p>
                  
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">CSV Columns:</p>
                    <div className="flex flex-wrap gap-2">
                      {scenario.columns.map((column, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {column}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Dynamic Field Detector */}
      <DynamicFieldDetector
        csvColumns={currentScenario.columns}
        onMappingApplied={handleMappingApplied}
      />

      {/* Results Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600" />
            Integration Results
          </CardTitle>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">
              How these mappings would integrate with your field mapping workflow
            </p>
            {Object.keys(appliedMappings).length > 0 && (
              <Button onClick={clearMappings} variant="outline" size="sm">
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(appliedMappings).length > 0 ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 mb-2">✅ Ready for Contract Generation</h4>
                <p className="text-sm text-green-700">
                  {Object.keys(appliedMappings).length} fields mapped and ready for template merging
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Field Mappings Applied:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(appliedMappings).map(([field, mapping]) => (
                    <div key={field} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{field}</p>
                        <p className="text-xs text-gray-500">CSV Column</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-blue-100 text-blue-800">{mapping}</Badge>
                        <p className="text-xs text-gray-500 mt-1">Template Placeholder</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">🔄 Next Steps</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• These mappings would be automatically applied to your field mapping table</li>
                  <li>• Parent-child relationships preserved for contract generation</li>
                  <li>• FTE breakdowns will render as tables in final contracts</li>
                  <li>• All unmapped fields remain available for manual mapping</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">Apply some mappings above to see integration results</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-medium">1. Pattern Detection</h3>
              <p className="text-sm text-gray-600">
                Analyzes CSV column names to identify parent-child relationships (FTE, Salary, Hours)
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-medium">2. Smart Mapping</h3>
              <p className="text-sm text-gray-600">
                Suggests template placeholders based on field names and relationships with confidence scores
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-medium">3. Integration</h3>
              <p className="text-sm text-gray-600">
                Applies mappings to your existing field mapping workflow without disrupting manual mappings
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicFieldDemo; 