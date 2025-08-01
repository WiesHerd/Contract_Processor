import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Users, CheckSquare, Square, RotateCcw, Eye, Database } from 'lucide-react';

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
    <div className="flex items-center gap-2">
      {/* Smart Selection Dropdown */}
      <Select onValueChange={handleSelectionChange} disabled={disabled}>
        <SelectTrigger className="w-48 h-8 text-xs">
          <SelectValue placeholder="Select Options" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unprocessed" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Select All Unprocessed ({unprocessedCount})</span>
          </SelectItem>
          <SelectItem value="next-batch" className="flex items-center gap-2">
            <Database className="w-4 h-4" />
            <span>Select Next 50 Unprocessed</span>
          </SelectItem>
          <SelectItem value="current-tab" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            <span>Select All in Current Tab</span>
          </SelectItem>
          <SelectItem value="visible" className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4" />
            <span>Select All Visible</span>
          </SelectItem>
          <SelectItem value="clear" className="flex items-center gap-2 text-red-600">
            <RotateCcw className="w-4 h-4" />
            <span>Clear Selection</span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Progress Metrics */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs text-gray-600">
              <Badge variant="outline" className="text-xs">
                {selectedCount} selected
              </Badge>
              <span>•</span>
              <Badge variant="secondary" className="text-xs">
                {unprocessedCount} unprocessed
              </Badge>
              <span>•</span>
              <Badge variant="default" className="text-xs">
                {completionRate}% complete
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>Total: {totalFilteredCount}</div>
              <div>Processed: {processedCount}</div>
              <div>Unprocessed: {unprocessedCount}</div>
              <div>Selected: {selectedCount}</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Quick Action Buttons */}
      {unprocessedCount > 0 && (
        <Button
          onClick={onSelectAllUnprocessed}
          disabled={disabled}
          size="sm"
          variant="outline"
          className="h-8 text-xs"
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
          className="h-8 text-xs text-red-600 hover:text-red-700"
        >
          Clear
        </Button>
      )}
    </div>
  );
}; 