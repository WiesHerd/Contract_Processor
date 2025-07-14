import React, { useState, useCallback } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Trash2, Plus, GripVertical, Calculator, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ParentChildItem {
  id: string;
  label: string;
  value: number;
  description?: string;
}

export interface ParentChildData {
  parentLabel: string;
  parentValue: number;
  parentUnit: string;
  children: ParentChildItem[];
  allowOverallocation?: boolean;
  precision?: number;
}

interface ParentChildBuilderProps {
  data: ParentChildData;
  onChange: (data: ParentChildData) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export function ParentChildBuilder({
  data,
  onChange,
  className,
  placeholder = "Enter item name...",
  disabled = false,
  variant = 'default'
}: ParentChildBuilderProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemValue, setNewItemValue] = useState('');

  const precision = data.precision ?? 2;
  const totalChildren = data.children.reduce((sum, item) => sum + item.value, 0);
  const isOverAllocated = totalChildren > data.parentValue;
  const isUnderAllocated = totalChildren < data.parentValue;
  const allocationStatus = isOverAllocated ? 'over' : isUnderAllocated ? 'under' : 'perfect';

  // Add new child item
  const addItem = useCallback(() => {
    if (!newItemLabel.trim()) return;
    
    const newItem: ParentChildItem = {
      id: `item-${Date.now()}`,
      label: newItemLabel.trim(),
      value: Number(newItemValue) || 0,
    };

    onChange({
      ...data,
      children: [...data.children, newItem]
    });

    setNewItemLabel('');
    setNewItemValue('');
  }, [newItemLabel, newItemValue, data, onChange]);

  // Update child item
  const updateItem = useCallback((id: string, updates: Partial<ParentChildItem>) => {
    onChange({
      ...data,
      children: data.children.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    });
  }, [data, onChange]);

  // Remove child item
  const removeItem = useCallback((id: string) => {
    onChange({
      ...data,
      children: data.children.filter(item => item.id !== id)
    });
  }, [data, onChange]);

  // Auto-balance children to match parent
  const autoBalance = useCallback(() => {
    if (data.children.length === 0) return;

    const balancedValue = data.parentValue / data.children.length;
    onChange({
      ...data,
      children: data.children.map(item => ({
        ...item,
        value: Number(balancedValue.toFixed(precision))
      }))
    });
  }, [data, onChange, precision]);

  // Handle drag and drop
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;

    const newChildren = [...data.children];
    const draggedItem = newChildren[draggedIndex];
    newChildren.splice(draggedIndex, 1);
    newChildren.splice(dropIndex, 0, draggedItem);

    onChange({
      ...data,
      children: newChildren
    });

    setDraggedIndex(null);
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {data.parentLabel}
          </CardTitle>
          <Badge 
            variant={allocationStatus === 'perfect' ? 'default' : 'secondary'}
            className={cn(
              "font-mono",
              allocationStatus === 'over' && "bg-red-100 text-red-700 border-red-200",
              allocationStatus === 'under' && "bg-amber-100 text-amber-700 border-amber-200",
              allocationStatus === 'perfect' && "bg-green-100 text-green-700 border-green-200"
            )}
          >
            {totalChildren.toFixed(precision)} / {data.parentValue.toFixed(precision)} {data.parentUnit}
          </Badge>
        </div>
        
        {/* Allocation Status */}
        {allocationStatus !== 'perfect' && (
          <div className="flex items-center gap-2 text-sm">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-600">
              {allocationStatus === 'over' 
                ? `Over-allocated by ${(totalChildren - data.parentValue).toFixed(precision)} ${data.parentUnit}`
                : `Under-allocated by ${(data.parentValue - totalChildren).toFixed(precision)} ${data.parentUnit}`
              }
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={autoBalance}
              disabled={disabled}
              className="ml-auto"
            >
              <Calculator className="h-3 w-3 mr-1" />
              Auto Balance
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Children List */}
        <div className="space-y-2">
          {data.children.map((item, index) => (
            <div
              key={item.id}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={cn(
                "flex items-center gap-3 p-3 border rounded-lg transition-colors",
                "hover:bg-gray-50 cursor-move",
                draggedIndex === index && "opacity-50",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
              
              <div className="flex-1 grid grid-cols-2 gap-3">
                <Input
                  value={item.label}
                  onChange={(e) => updateItem(item.id, { label: e.target.value })}
                  placeholder="Item name"
                  disabled={disabled}
                  className="text-sm"
                />
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={item.value}
                    onChange={(e) => updateItem(item.id, { value: Number(e.target.value) || 0 })}
                    placeholder="0.00"
                    disabled={disabled}
                    className="text-sm text-right"
                    step={1 / Math.pow(10, precision)}
                  />
                  <span className="text-sm text-gray-500 min-w-fit">
                    {data.parentUnit}
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeItem(item.id)}
                disabled={disabled}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add New Item */}
        <div className="flex items-center gap-3 p-3 border-2 border-dashed border-gray-200 rounded-lg">
          <Plus className="h-4 w-4 text-gray-400" />
          
          <div className="flex-1 grid grid-cols-2 gap-3">
            <Input
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="text-sm"
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
            />
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                placeholder="0.00"
                disabled={disabled}
                className="text-sm text-right"
                step={1 / Math.pow(10, precision)}
                onKeyPress={(e) => e.key === 'Enter' && addItem()}
              />
              <span className="text-sm text-gray-500 min-w-fit">
                {data.parentUnit}
              </span>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={addItem}
            disabled={disabled || !newItemLabel.trim()}
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        {data.children.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-500">
              {data.children.length} item{data.children.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onChange({ ...data, children: [] })}
                disabled={disabled}
                className="text-red-600 hover:text-red-700"
              >
                Clear All
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to create FTE breakdown data
export function createFTEBreakdownData(
  totalFTE: number = 1.0,
  existingBreakdown?: ParentChildItem[]
): ParentChildData {
  return {
    parentLabel: "FTE Breakdown",
    parentValue: totalFTE,
    parentUnit: "FTE",
    children: existingBreakdown || [
      { id: "clinical", label: "Clinical", value: totalFTE * 0.8 },
      { id: "administrative", label: "Administrative", value: totalFTE * 0.2 }
    ],
    precision: 2
  };
}

// Helper function to create compensation breakdown data
export function createCompensationBreakdownData(
  totalCompensation: number,
  existingBreakdown?: ParentChildItem[]
): ParentChildData {
  return {
    parentLabel: "Compensation Breakdown",
    parentValue: totalCompensation,
    parentUnit: "$",
    children: existingBreakdown || [
      { id: "base", label: "Base Salary", value: totalCompensation * 0.8 },
      { id: "productivity", label: "Productivity Bonus", value: totalCompensation * 0.2 }
    ],
    precision: 0
  };
}

// Helper function to create time allocation data
export function createTimeAllocationData(
  totalHours: number = 40,
  existingBreakdown?: ParentChildItem[]
): ParentChildData {
  return {
    parentLabel: "Time Allocation",
    parentValue: totalHours,
    parentUnit: "hours/week",
    children: existingBreakdown || [
      { id: "clinical", label: "Clinical Time", value: totalHours * 0.75 },
      { id: "administrative", label: "Administrative Time", value: totalHours * 0.25 }
    ],
    precision: 1
  };
} 