import React, { useState, useRef, useEffect } from 'react';
import { DynamicLogicBuilder } from './components/DynamicLogicBuilder';
import { DynamicBlockService, DynamicBlockResponse } from '@/services/dynamicBlockService';
import { Info, Trash2, AlertTriangle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useDispatch } from 'react-redux';
import { logSecurityEvent } from '@/store/slices/auditSlice';
import { AppDispatch } from '@/store';

// Use a simpler interface that matches what the builder expects
interface SavedBlock {
  id: string;
  name: string;
  placeholder: string;
  description: string;
  outputType: 'bullets' | 'table' | 'table-no-borders' | 'paragraph' | 'list' | 'compensation-summary' | 'call-schedule' | 'performance-metrics' | 'department-summary' | 'compliance-checklist' | 'timeline-tracker' | 'comparative-analysis';
  format: string;
  conditions: any[];
  alwaysInclude: any[];
}

const DynamicBlocksPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const [savedBlocks, setSavedBlocks] = useState<DynamicBlockResponse[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deletingBlockId, setDeletingBlockId] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
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
          outputType: block.outputType as 'bullets' | 'table' | 'table-no-borders' | 'paragraph' | 'list' | 'compensation-summary' | 'call-schedule' | 'performance-metrics' | 'department-summary' | 'compliance-checklist' | 'timeline-tracker' | 'comparative-analysis',
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

  const handleDeleteBlock = async (blockId: string) => {
    setDeletingBlockId(blockId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteBlock = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      // Get block info before deletion for audit logging
      const blockToDelete = savedBlocks.find(block => block.id === deletingBlockId);
      
      await DynamicBlockService.deleteDynamicBlock(deletingBlockId);
      
      // Log the deletion to audit trail
      try {
        const auditDetails = JSON.stringify({
          action: 'DYNAMIC_BLOCK_DELETED',
          blockId: deletingBlockId,
          blockName: blockToDelete?.name,
          blockPlaceholder: blockToDelete?.placeholder,
          timestamp: new Date().toISOString(),
          metadata: {
            blockId: deletingBlockId,
            blockName: blockToDelete?.name,
            blockPlaceholder: blockToDelete?.placeholder,
            operation: 'individual_delete',
            success: true
          }
        });
        
        await dispatch(logSecurityEvent({
          action: 'DYNAMIC_BLOCK_DELETED',
          details: auditDetails,
          severity: 'MEDIUM',
          category: 'DATA',
          resourceType: 'DYNAMIC_BLOCK',
          resourceId: deletingBlockId,
          metadata: {
            blockId: deletingBlockId,
            blockName: blockToDelete?.name,
            blockPlaceholder: blockToDelete?.placeholder,
            operation: 'individual_delete',
            success: true
          },
        }));
      } catch (auditError) {
        console.error('Failed to log dynamic block deletion:', auditError);
      }
      
      // Clear the form if we're deleting the currently selected block
      if (selectedBlockId === deletingBlockId) {
        setSelectedBlockId('');
        if (builderRef.current && builderRef.current.resetForm) {
          builderRef.current.resetForm();
        }
      }
      
      // Reload the saved blocks list
      await loadSavedBlocks();
      
      toast.success('Dynamic block deleted successfully');
    } catch (err) {
      console.error('Error deleting block:', err);
      setError('Failed to delete block. Please try again.');
      toast.error('Failed to delete block');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeletingBlockId('');
    }
  };

  const handleBulkDelete = () => {
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      
      let deletedCount = 0;
      const totalBlocks = savedBlocks.length;
      const deletedBlocks = [];
      
      for (const block of savedBlocks) {
        try {
          await DynamicBlockService.deleteDynamicBlock(block.id);
          deletedCount++;
          deletedBlocks.push({
            id: block.id,
            name: block.name,
            placeholder: block.placeholder
          });
        } catch (err) {
          console.error(`Failed to delete block ${block.id}:`, err);
        }
      }
      
      // Log the bulk deletion to audit trail
      try {
        const auditDetails = JSON.stringify({
          action: 'BULK_DYNAMIC_BLOCKS_DELETED',
          deletedCount: deletedCount,
          totalBlocks: totalBlocks,
          deletedBlocks: deletedBlocks,
          timestamp: new Date().toISOString(),
          metadata: {
            deletedCount: deletedCount,
            totalBlocks: totalBlocks,
            deletedBlocks: deletedBlocks,
            operation: 'bulk_delete',
            success: true
          }
        });
        
        await dispatch(logSecurityEvent({
          action: 'BULK_DYNAMIC_BLOCKS_DELETED',
          details: auditDetails,
          severity: 'HIGH',
          category: 'DATA',
          resourceType: 'DYNAMIC_BLOCKS',
          resourceId: 'bulk_delete',
          metadata: {
            deletedCount: deletedCount,
            totalBlocks: totalBlocks,
            deletedBlocks: deletedBlocks,
            operation: 'bulk_delete',
            success: true
          },
        }));
      } catch (auditError) {
        console.error('Failed to log bulk dynamic blocks deletion:', auditError);
      }
      
      // Clear the form since all blocks are deleted
      setSelectedBlockId('');
      if (builderRef.current && builderRef.current.resetForm) {
        builderRef.current.resetForm();
      }
      
      // Reload the saved blocks list
      await loadSavedBlocks();
      
      if (deletedCount === totalBlocks) {
        toast.success(`All ${deletedCount} dynamic blocks deleted successfully`);
      } else {
        toast.success(`${deletedCount} of ${totalBlocks} dynamic blocks deleted successfully`);
      }
    } catch (err) {
      console.error('Error during bulk delete:', err);
      setError('Failed to delete some blocks. Please try again.');
      toast.error('Failed to delete some blocks');
    } finally {
      setIsDeleting(false);
      setShowBulkDeleteConfirm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[95vw] mx-auto">
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
            
            <div className="flex items-center gap-4">
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

              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSaveClick} 
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? 'Saving...' : 'Save to DynamoDB'}
                </Button>

                {/* Individual Delete Button */}
                {selectedBlockId && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteBlock(selectedBlockId)}
                          disabled={isLoading || isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Delete this dynamic block
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Bulk Delete Button */}
                {savedBlocks.length > 1 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkDelete}
                          disabled={isLoading || isDeleting}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Delete all dynamic blocks
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
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

      {/* Individual Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Delete Dynamic Block
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dynamic block? This action cannot be undone and will permanently remove the block from DynamoDB.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDeleteBlock}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Delete All Dynamic Blocks
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all {savedBlocks.length} dynamic blocks? This action cannot be undone and will permanently remove all blocks from DynamoDB. This is useful for starting fresh.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : `Delete All ${savedBlocks.length} Blocks`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DynamicBlocksPage; 