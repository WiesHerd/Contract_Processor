import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent } from './card';
import { Badge } from './badge';
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
  background: '#f8fafc' // Light gray background
};

const STATUS_CONFIG = {
  idle: {
    icon: Clock,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    text: 'Ready to Start'
  },
  'in-progress': {
    icon: Play,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    text: 'In Progress'
  },
  completed: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    text: 'Completed'
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    text: 'Errors Found'
  }
};

export const ContractProgressChart: React.FC<ContractProgressChartProps> = ({
  progress,
  className = ''
}) => {
  const { completionPercentage, total, processed, inProgress, failed, status } = progress;
  
  // Prepare data for the donut chart
  const chartData = [
    {
      name: 'Completed',
      value: processed,
      color: COLORS.completed,
      percentage: total > 0 ? Math.round((processed / total) * 100) : 0
    },
    {
      name: 'In Progress',
      value: inProgress,
      color: COLORS.inProgress,
      percentage: total > 0 ? Math.round((inProgress / total) * 100) : 0
    },
    {
      name: 'Not Started',
      value: total - processed - inProgress - failed,
      color: COLORS.notStarted,
      percentage: total > 0 ? Math.round(((total - processed - inProgress - failed) / total) * 100) : 0
    },
    {
      name: 'Failed',
      value: failed,
      color: COLORS.failed,
      percentage: total > 0 ? Math.round((failed / total) * 100) : 0
    }
  ].filter(item => item.value > 0); // Only show segments with data

  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-2 rounded-lg shadow-lg border border-gray-200 text-xs">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-gray-600">
            {data.value} contracts ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${className} p-2`}>
      <div className="flex items-center gap-2">
        {/* Compact Donut Chart */}
        <div className="relative">
          <ResponsiveContainer width={65} height={65}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={20}
                outerRadius={28}
                paddingAngle={1}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Center Content */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-sm font-bold text-gray-900">
                {completionPercentage}%
              </div>
            </div>
          </div>
        </div>

        {/* Compact Progress Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700">Progress</span>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1 mb-1">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-1 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          
          {/* Compact Stats */}
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
    </div>
  );
}; 