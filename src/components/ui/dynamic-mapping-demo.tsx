import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DynamicBlockService, DynamicBlockResponse } from '@/services/dynamicBlockService';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';

interface DynamicMappingDemoProps {}

// Sample template content with FTEBreakdown placeholder
const sampleTemplate = `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2>Contract Preview</h2>
  <p><strong>Provider:</strong> \{\{ProviderName\}\}</p>
  <p><strong>Start Date:</strong> \{\{StartDate\}\}</p>
  <p><strong>Base Salary:</strong> \{\{BaseSalary\}\}</p>
  
  <h3>FTE Breakdown</h3>
  \{\{FTEBreakdown\}\}
  
  <p>Total FTE: \{\{FTE\}\}</p>
</div>
`;

// Sample provider data
const sampleProvider = {
  id: 'demo-provider',
  name: 'Dr. Jane Smith',
  startDate: '2024-01-15',
  baseSalary: 275000,
  fte: 1.0,
  specialty: 'Cardiology',
  credentials: 'MD',
  dynamicFields: JSON.stringify({
    ClinicalFTE: "0.7",
    MedicalDirectorFTE: "0.1", 
    ResearchFTE: "0.1",
    TeachingFTE: "0.1",
    TotalFTE: "1.0"
  })
};

const DynamicMappingDemo: React.FC<DynamicMappingDemoProps> = () => {
  const [dynamicBlocks, setDynamicBlocks] = useState<DynamicBlockResponse[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [previewContent, setPreviewContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Load dynamic blocks on mount
  useEffect(() => {
    const loadBlocks = async () => {
      try {
        const blocks = await DynamicBlockService.listDynamicBlocks();
        setDynamicBlocks(blocks);
        console.log('📋 Loaded dynamic blocks:', blocks);
      } catch (error) {
        console.error('Error loading dynamic blocks:', error);
      }
    };
    loadBlocks();
  }, []);

  // Generate preview when block selection changes
  const generatePreview = async () => {
    setLoading(true);
    try {
      // Create enhanced field mapping
      const mapping = [
        {
          placeholder: 'ProviderName',
          mappedColumn: 'name',
          mappingType: 'field' as const
        },
        {
          placeholder: 'StartDate', 
          mappedColumn: 'startDate',
          mappingType: 'field' as const
        },
        {
          placeholder: 'BaseSalary',
          mappedColumn: 'baseSalary', 
          mappingType: 'field' as const
        },
        {
          placeholder: 'FTE',
          mappedColumn: 'fte',
          mappingType: 'field' as const
        },
        // This is the key mapping - FTEBreakdown to dynamic block
        {
          placeholder: 'FTEBreakdown',
          mappedDynamicBlock: selectedBlockId,
          mappingType: 'dynamic' as const
        }
      ];

      // Generate merged content
      const result = await mergeTemplateWithData(
        { id: 'demo-template', name: 'Demo Template' } as any,
        sampleProvider as any,
        sampleTemplate,
        mapping
      );

      setPreviewContent(result.content);
      console.log('✅ Generated preview:', result);
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewContent('Error generating preview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBlockId) {
      generatePreview();
    } else {
      // Generate preview without dynamic block
      generatePreview();
    }
  }, [selectedBlockId]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dynamic Block Mapping Demo</CardTitle>
          <p className="text-sm text-gray-600">
            This demo shows how to map the <Badge variant="outline">{'{{FTEBreakdown}}'}</Badge> placeholder to a dynamic block.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Block Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Select Dynamic Block for FTEBreakdown:
            </label>
            <Select value={selectedBlockId || 'none'} onValueChange={(value) => setSelectedBlockId(value === 'none' ? '' : value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a dynamic block or leave empty for default" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (use default FTE breakdown)</SelectItem>
                {dynamicBlocks.map((block) => (
                  <SelectItem key={block.id} value={block.id}>
                    {block.name} - {`{{${block.placeholder}}}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Mapping Status */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Current Mapping:</h4>
            <div className="space-y-1 text-sm">
              <div><Badge variant="outline">{'{{ProviderName}}'}</Badge> → Provider.name</div>
              <div><Badge variant="outline">{'{{StartDate}}'}</Badge> → Provider.startDate</div>
              <div><Badge variant="outline">{'{{BaseSalary}}'}</Badge> → Provider.baseSalary</div>
              <div><Badge variant="outline">{'{{FTE}}'}</Badge> → Provider.fte</div>
              <div className="font-medium">
                <Badge variant="outline">{'{{FTEBreakdown}}'}</Badge> → {
                  selectedBlockId 
                    ? `Dynamic Block: ${dynamicBlocks.find(b => b.id === selectedBlockId)?.name || 'Unknown'}`
                    : 'Default FTE calculation'
                }
              </div>
            </div>
          </div>

          {/* Refresh Button */}
          <Button onClick={generatePreview} disabled={loading}>
            {loading ? 'Generating...' : 'Refresh Preview'}
          </Button>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Preview</CardTitle>
          <p className="text-sm text-gray-600">
            This is how the contract would look with the current mapping:
          </p>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-white min-h-[300px]">
            {previewContent ? (
              <div dangerouslySetInnerHTML={{ __html: previewContent }} />
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select a dynamic block to see the preview
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use This in Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">Step 1: Create a Dynamic Block</h4>
            <p>Go to the Demo screen and create a dynamic block with conditional logic for FTE breakdown.</p>
          </div>
          
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Step 2: Add to Template</h4>
            <p>In your DOCX template, add the placeholder: <Badge variant="outline">{'{{FTEBreakdown}}'}</Badge></p>
          </div>
          
          <div className="p-3 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">Step 3: Map in Field Mapper</h4>
            <p>In the Field Mapper, map <Badge variant="outline">{'{{FTEBreakdown}}'}</Badge> to your dynamic block.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicMappingDemo; 