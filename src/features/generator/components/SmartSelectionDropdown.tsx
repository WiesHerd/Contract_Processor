import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SmartSelectionDropdownProps {
  // Selection state
  selectedCount: number;
  unprocessedCount: number;
  processedCount: number;
  totalFilteredCount: number;
  completionRate: number;
  
  // Selection functions
  onSelectAllUnprocessed: () => void;
  onSelectNextBatch: (batchSize?: number) => void;
  onSelectAllInCurrentTab: () => void;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
  
  // UI state
  disabled?: boolean;
  currentTab?: string;
}

export const SmartSelectionDropdown: React.FC<SmartSelectionDropdownProps> = ({
  selectedCount,
  unprocessedCount,
  processedCount,
  totalFilteredCount,
  completionRate,
  onSelectAllUnprocessed,
  onSelectNextBatch,
  onSelectAllInCurrentTab,
  onSelectAllVisible,
  onClearSelection,
  disabled = false,
  currentTab = 'all'
}) => {
  const handleSelectionChange = (value: string) => {
    switch (value) {
      case 'unprocessed':
        onSelectAllUnprocessed();
        break;
      case 'next-batch':
        onSelectNextBatch(50);
        break;
      case 'current-tab':
        onSelectAllInCurrentTab();
        break;
      case 'visible':
        onSelectAllVisible();
        break;
      case 'clear':
        onClearSelection();
        break;
    }
  };

  // Debug info for why unprocessed count might be 0
  const getUnprocessedTooltip = () => {
    if (unprocessedCount === 0 && totalFilteredCount > 0) {
      return `All ${totalFilteredCount} filtered providers have already been processed (${processedCount} successful, ${totalFilteredCount - processedCount} partial/failed). No unprocessed items remain.`;
    }
    return `Select all ${unprocessedCount} providers that haven't been processed yet.`;
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3">
        {/* Smart Selection Dropdown - Enhanced with prominent styling */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Select onValueChange={handleSelectionChange} disabled={disabled}>
              <SelectTrigger className="w-56 h-9 text-sm border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500 focus:ring-2 transition-all duration-200 shadow-sm">
                <SelectValue placeholder="Select options..." />
              </SelectTrigger>
              <SelectContent className="min-w-56 bg-white border border-gray-200 shadow-lg rounded-lg">
                <SelectItem value="unprocessed" className="text-sm py-2 hover:bg-blue-50">
                  Select All Unprocessed ({unprocessedCount})
                </SelectItem>
                <SelectItem value="next-batch" className="text-sm py-2 hover:bg-blue-50">
                  Select Next 50 Unprocessed
                </SelectItem>
                <SelectItem value="current-tab" className="text-sm py-2 hover:bg-blue-50">
                  Select All in Current Tab
                </SelectItem>
                <SelectItem value="visible" className="text-sm py-2 hover:bg-blue-50">
                  Select All Visible
                </SelectItem>
                <SelectItem value="clear" className="text-sm py-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                  Clear Selection
                </SelectItem>
              </SelectContent>
            </Select>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="text-xs">
              <p className="font-medium mb-1">Bulk Selection Options:</p>
              <ul className="space-y-1">
                <li><strong>Unprocessed:</strong> Items that haven't been processed yet</li>
                <li><strong>Next 50:</strong> Process items in manageable batches</li>
                <li><strong>Current Tab:</strong> All items in the current tab view</li>
                <li><strong>Visible:</strong> Only items currently shown on screen</li>
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Quick Action Buttons */}
        {unprocessedCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSelectAllUnprocessed}
                disabled={disabled}
                size="sm"
                variant="outline"
                className="h-9 text-sm font-medium border-gray-300 hover:border-gray-400 hover:bg-gray-50"
              >
                Select All Unprocessed
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{getUnprocessedTooltip()}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {unprocessedCount === 0 && totalFilteredCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-xs text-gray-500 px-3 py-1 bg-gray-50 rounded border">
                All items processed ({completionRate}% complete)
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{getUnprocessedTooltip()}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Removed redundant Clear button - functionality is now in the dropdown */}
      </div>
    </TooltipProvider>
  );
}; 