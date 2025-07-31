import React from 'react';
import { ContractProgress } from '../../features/generator/hooks/useContractProgress';

interface ContractProgressChartProps {
  progress: ContractProgress;
  className?: string;
}

const COLORS = {
  completed: '#10b981', // Green
  inProgress: '#3b82f6', // Blue
  notStarted: '#e5e7eb', // Light gray
  failed: '#ef4444', // Red
};

export const ContractProgressChart: React.FC<ContractProgressChartProps> = ({
  progress,
  className = ''
}) => {
  const { completionPercentage, total, processed, inProgress, failed } = progress;
  
  // Determine the color based on status
  let progressColor = COLORS.completed;
  if (failed > 0 && processed === 0) {
    progressColor = COLORS.failed;
  } else if (inProgress > 0) {
    progressColor = COLORS.inProgress;
  }

  return (
    <div className={`${className} flex flex-col items-center`}>
      {/* Progress Bar */}
      <div className="w-full max-w-xs mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-semibold text-gray-900">{completionPercentage}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ 
              width: `${completionPercentage}%`,
              backgroundColor: progressColor
            }}
          />
        </div>
      </div>
      
      {/* Description */}
      <div className="text-center">
        <div className="text-sm text-gray-600">
          {processed} of {total} contracts
        </div>
      </div>
    </div>
  );
}; 