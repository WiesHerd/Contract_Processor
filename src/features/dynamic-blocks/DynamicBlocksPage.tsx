import React, { useState, useRef, useEffect } from 'react';
import { DynamicLogicBuilder } from './components/DynamicLogicBuilder';
import { DynamicBlockService, DynamicBlockResponse } from '@/services/dynamicBlockService';
import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';

// Use a simpler interface that matches what the builder expects
interface SavedBlock {
  id: string;
  name: string;
  placeholder: string;
  description: string;
  outputType: 'bullets' | 'table' | 'paragraph';
  format: string;
  conditions: any[];
  alwaysInclude: any[];
}

const DynamicBlocksPage: React.FC = () => {
  const [savedBlocks, setSavedBlocks] = useState<DynamicBlockResponse[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const builderRef = useRef<any>(null);

  // Load saved blocks on component mount
  useEffect(() => {
    loadSavedBlocks();
  }, []);

  const loadSavedBlocks = async () => {
    try {
      setIsLoading(true);
      const blocks = await DynamicBlockService.listDynamicBlocks();
      setSavedBlocks(blocks);
    } catch (err) {
      console.error('Error loading saved blocks:', err);
      setError('Failed to load saved blocks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadBlock = async (blockId: string) => {
    if (!blockId) {
      // Clear the form for new block
      setSelectedBlockId('');
      if (builderRef.current && builderRef.current.resetForm) {
        builderRef.current.resetForm();
      }
      return;
    }

    try {
      setIsLoading(true);
      const block = await DynamicBlockService.getDynamicBlock(blockId);
      
      if (block && builderRef.current && builderRef.current.loadBlockData) {
        const blockData = {
          id: block.id,
          name: block.name,
          description: block.description || '',
          placeholder: block.placeholder,
          outputType: block.outputType as 'bullets' | 'table' | 'paragraph',
          format: block.format,
          conditions: block.conditions || [],
          alwaysInclude: block.alwaysInclude || []
        };
        
        builderRef.current.loadBlockData(blockData);
        setSelectedBlockId(blockId);
      }
    } catch (err) {
      console.error('Error loading block:', err);
      setError('Failed to load block');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBlock = async (block: any) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const blockData = {
        name: block.name,
        description: block.description || '',
        placeholder: block.placeholder,
        outputType: block.outputType,
        format: block.format,
        conditions: block.conditions || [],
        alwaysInclude: block.alwaysInclude || []
      };

      let result;
      if (block.id && block.id.trim() !== '') {
        // Update existing block - include the ID in the blockData
        const updateData = { ...blockData, id: block.id };
        result = await DynamicBlockService.updateDynamicBlock(updateData);
      } else {
        // Create new block
        result = await DynamicBlockService.createDynamicBlock(blockData);
      }

      console.log('Block saved successfully:', result);
      
      // Reload the saved blocks list
      await loadSavedBlocks();
      
      // Update selected block ID if this was a new block
      if (!block.id || block.id.trim() === '') {
        setSelectedBlockId(result.id);
      }
      
      toast.success('Block saved successfully');
    } catch (err) {
      console.error('Error saving block:', err);
      setError('Failed to save block. Please try again.');
      toast.error('Failed to save block');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveClick = () => {
    if (builderRef.current && builderRef.current.handleSave) {
      builderRef.current.handleSave();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-7xl mx-auto">
        {/* Page Header - Matching Provider Data Manager */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-800">Dynamic Blocks</h1>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    Create conditional content blocks for dynamic contract templates
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Saved Blocks Dropdown */}
              {savedBlocks.length > 0 && (
                <div className="flex items-center gap-3">
                  <label htmlFor="saved-blocks" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    Load Saved Block:
                  </label>
                  <select
                    id="saved-blocks"
                    value={selectedBlockId}
                    onChange={(e) => handleLoadBlock(e.target.value)}
                    className="min-w-[200px] px-3 py-2 text-sm border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={isLoading}
                  >
                    <option value="">New Block</option>
                    {savedBlocks.map((block) => (
                      <option key={block.id} value={block.id}>
                        {block.name} ({block.placeholder})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <Button 
                onClick={handleSaveClick} 
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2"
              >
                <Save className="h-4 w-4" />
                {isLoading ? 'Saving...' : 'Save to DynamoDB'}
              </Button>
            </div>
          </div>
          <hr className="my-3 border-gray-100" />
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Main Content - Matching Provider Data Manager */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <DynamicLogicBuilder
            onSave={handleSaveBlock}
            ref={builderRef}
          />
        </div>
      </div>
    </div>
  );
};

export default DynamicBlocksPage; 