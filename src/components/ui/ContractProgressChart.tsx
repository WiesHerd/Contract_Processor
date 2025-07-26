import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle, Clock, AlertCircle, Play } from 'lucide-react';
import { ContractProgress } from '../../features/generator/hooks/useContractProgress';

interface ContractProgressChartProps {
  progress: ContractProgress;
  className?: string;
}

const COLORS = {
  completed: '#10b981', // Green
  inProgress: '#3b82f6', // Blue
  notStarted: '#e5e7eb', // Gray
  failed: '#ef4444', // Red
};

const STATUS_CONFIG = {
  idle: {
    icon: Clock,
    color: 'text-gray-500',
    text: 'Ready to Start'
  },
  'in-progress': {
    icon: Play,
    color: 'text-blue-600',
    text: 'In Progress'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    text: 'Completed'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600',
    text: 'Errors Found'
  }
};

export const ContractProgressChart: React.FC<ContractProgressChartProps> = ({
  progress,
  className = ''
}) => {
  const { completionPercentage, total, processed, inProgress, failed, status } = progress;
  
  // Create chart data - ensure we always have data
  const chartData = [
    {
      name: 'Completed',
      value: Math.max(processed, 0),
      color: COLORS.completed
    },
    {
      name: 'In Progress',
      value: Math.max(inProgress, 0),
      color: COLORS.inProgress
    },
    {
      name: 'Failed',
      value: Math.max(failed, 0),
      color: COLORS.failed
    },
    {
      name: 'Not Started',
      value: Math.max(total - processed - inProgress - failed, 0),
      color: COLORS.notStarted
    }
  ].filter(item => item.value > 0);

  // If no data, show a default segment
  const displayData = chartData.length > 0 ? chartData : [
    {
      name: 'Not Started',
      value: 1,
      color: COLORS.notStarted
    }
  ];

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className={`${className} flex items-center gap-3 p-2`}>
      {/* Large Donut Chart */}
      <div className="relative flex-shrink-0">
        <div style={{ width: '100px', height: '100px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={displayData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={45}
                paddingAngle={3}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {displayData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Progress Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <StatusIcon className={`w-4 h-4 ${statusConfig.color}`} />
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
          <div 
            className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="text-xs text-gray-600">
          <span>{processed} completed</span>
          <span className="mx-1">•</span>
          <span>{total - processed - inProgress - failed} remaining</span>
          {failed > 0 && (
            <>
              <span className="mx-1">•</span>
              <span className="text-red-600">{failed} failed</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 