import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

  return (
    <div className="flex items-center gap-3">
      {/* Smart Selection Dropdown */}
      <Select onValueChange={handleSelectionChange} disabled={disabled}>
        <SelectTrigger className="w-56 h-9 text-sm border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-blue-500">
          <SelectValue placeholder="Select options..." />
        </SelectTrigger>
        <SelectContent className="min-w-56">
          <SelectItem value="unprocessed" className="text-sm py-2">
            Select All Unprocessed ({unprocessedCount})
          </SelectItem>
          <SelectItem value="next-batch" className="text-sm py-2">
            Select Next 50 Unprocessed
          </SelectItem>
          <SelectItem value="current-tab" className="text-sm py-2">
            Select All in Current Tab
          </SelectItem>
          <SelectItem value="visible" className="text-sm py-2">
            Select All Visible
          </SelectItem>
          <SelectItem value="clear" className="text-sm py-2 text-red-600 hover:text-red-700">
            Clear Selection
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Quick Action Buttons */}
      {unprocessedCount > 0 && (
        <Button
          onClick={onSelectAllUnprocessed}
          disabled={disabled}
          size="sm"
          variant="outline"
          className="h-9 text-sm font-medium border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        >
          Select All Unprocessed
        </Button>
      )}

      {selectedCount > 0 && (
        <Button
          onClick={onClearSelection}
          disabled={disabled}
          size="sm"
          variant="ghost"
          className="h-9 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100"
        >
          Clear
        </Button>
      )}
    </div>
  );
}; 