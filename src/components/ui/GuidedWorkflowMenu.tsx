import React from 'react';
import { Button } from './button';
import { Badge } from './badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { 
  FileText, 
  Users, 
  Download, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight,
  Play,
  Settings,
  FolderOpen
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'completed' | 'disabled';
  action?: () => void;
  required?: boolean;
  count?: number;
}

interface GuidedWorkflowMenuProps {
  steps: WorkflowStep[];
  currentStep: number;
  onStepClick: (stepId: string) => void;
  className?: string;
}

const GuidedWorkflowMenu: React.FC<GuidedWorkflowMenuProps> = ({
  steps,
  currentStep,
  onStepClick,
  className = ''
}) => {
  const getStepStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'disabled':
        return 'bg-gray-100 text-gray-400 border-gray-200';
      default:
        return 'bg-white text-gray-700 border-gray-300 hover:border-gray-400';
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    if (step.status === 'completed') {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    if (step.status === 'active') {
      return <Play className="w-4 h-4 text-blue-600" />;
    }
    return step.icon;
  };

  return (
    <TooltipProvider>
      <div className={`bg-white border-t border-gray-200 shadow-lg ${className}`}>
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Workflow Steps */}
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => step.status !== 'disabled' && onStepClick(step.id)}
                        disabled={step.status === 'disabled'}
                        className={`
                          flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200
                          ${getStepStatusColor(step.status)}
                          ${step.status !== 'disabled' ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed'}
                        `}
                      >
                        {getStepIcon(step)}
                        <span className="font-medium text-sm">{step.title}</span>
                        {step.count !== undefined && (
                          <Badge variant="secondary" className="ml-1">
                            {step.count}
                          </Badge>
                        )}
                        {step.required && step.status === 'pending' && (
                          <AlertCircle className="w-3 h-3 text-amber-500" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-gray-600">{step.description}</p>
                        {step.status === 'disabled' && (
                          <p className="text-xs text-amber-600 mt-1">
                            Complete previous steps first
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                  
                  {index < steps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Progress Indicator */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Step {currentStep} of {steps.length}</span>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default GuidedWorkflowMenu; 