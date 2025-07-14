import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DynamicBlockService } from '@/services/dynamicBlockService';
import { mergeTemplateWithData } from '@/features/generator/mergeUtils';
import { fetchTemplateMappingsByTemplateId } from '@/features/templates/FieldMapperPage';

interface DynamicMappingTestProps {
  templateId?: string;
}

export const DynamicMappingTest: React.FC<DynamicMappingTestProps> = ({ templateId }) => {
  const templates = useSelector((state: RootState) => state.templates?.templates || []);
  const providers = useSelector((state: RootState) => state.provider?.providers || []);
  const [mappings, setMappings] = useState<any[]>([]);
  const [dynamicBlocks, setDynamicBlocks] = useState<any[]>([]);
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const currentTemplate = templateId ? templates.find(t => t.id === templateId) : templates[0];
  const currentProvider = providers[0];
  
  useEffect(() => {
    const loadData = async () => {
      if (!currentTemplate) return;
      
      try {
        // Load template mappings
        const templateMappings = await fetchTemplateMappingsByTemplateId(currentTemplate.id);
        setMappings(templateMappings);
        
        // Load dynamic blocks
        const blocks = await DynamicBlockService.listDynamicBlocks();
        setDynamicBlocks(blocks);
        
        console.log('Template mappings:', templateMappings);
        console.log('Dynamic blocks:', blocks);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [currentTemplate]);
  
  const runTest = async () => {
    if (!currentTemplate || !currentProvider) return;
    
    setIsLoading(true);
    console.log('🧪 Running dynamic mapping test...');
    
    try {
      // Convert mappings to the expected format
      const convertedMappings = mappings.map(m => ({
        placeholder: m.field,
        mappedColumn: m.value,
        notes: m.notes || '',
      }));
      
      console.log('🔄 Converted mappings:', convertedMappings);
      
      // Convert to enhanced mappings (same logic as ContractGenerator)
      const enhancedMapping = convertedMappings?.map(m => {
        if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
          return {
            ...m,
            mappingType: 'dynamic' as const,
            mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
            mappedColumn: undefined,
          };
        }
        return {
          ...m,
          mappingType: 'field' as const,
        };
      });
      
      console.log('✨ Enhanced mappings:', enhancedMapping);
      
      const html = currentTemplate.editedHtmlContent || currentTemplate.htmlPreviewContent || '';
      const { content, warnings } = await mergeTemplateWithData(currentTemplate, currentProvider, html, enhancedMapping);
      
      setTestResult(content);
      console.log('✅ Test completed successfully');
      console.log('⚠️ Warnings:', warnings);
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!currentTemplate || !currentProvider) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-500">No template or provider available for testing</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>🧪 Dynamic Mapping Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Template:</strong> {currentTemplate.name}
            </div>
            <div>
              <strong>Provider:</strong> {currentProvider.name}
            </div>
          </div>
          
          <div>
            <strong>Template Mappings:</strong>
            <div className="space-y-2 mt-2">
              {mappings.length === 0 ? (
                <p className="text-gray-500">No mappings found</p>
              ) : (
                mappings.map((mapping, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                    <Badge variant="outline">
                      {mapping.field}
                    </Badge>
                    <span>→</span>
                    <Badge variant={mapping.value?.startsWith('dynamic:') ? 'default' : 'secondary'}>
                      {mapping.value?.startsWith('dynamic:') ? 
                        `Dynamic: ${mapping.value.replace('dynamic:', '')}` : 
                        mapping.value || 'Not mapped'
                      }
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <div>
            <strong>Available Dynamic Blocks:</strong>
            <div className="space-y-2 mt-2">
              {dynamicBlocks.length === 0 ? (
                <p className="text-gray-500">No dynamic blocks found</p>
              ) : (
                dynamicBlocks.map((block, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                    <Badge variant="default">
                      {block.name}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      ({block.placeholder})
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          
          <Button onClick={runTest} disabled={isLoading}>
            {isLoading ? 'Testing...' : 'Run Test'}
          </Button>
          
          {testResult && (
            <div>
              <strong>Test Result:</strong>
              <div className="mt-2 p-4 bg-gray-50 rounded overflow-auto max-h-96">
                <div dangerouslySetInnerHTML={{ __html: testResult }} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DynamicMappingTest; 