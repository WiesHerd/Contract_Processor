import React from 'react';
import { Provider } from '@/types/provider';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, DollarSign, Calendar, Percent, Hash, CheckCircle, XCircle } from 'lucide-react';
// import { formatDynamicFieldValue, type DynamicFieldMetadata } from '@/utils/dynamicFields';

interface DynamicFieldsDisplayProps {
  dynamicFields: Record<string, any>;
  metadata: Record<string, any>;
  className?: string;
}

const FieldTypeIcon: React.FC<{ type: any }> = ({ type }) => {
  switch (type) {
    case 'currency':
      return <DollarSign className="w-3 h-3" />;
    case 'date':
      return <Calendar className="w-3 h-3" />;
    case 'percentage':
      return <Percent className="w-3 h-3" />;
    case 'number':
      return <Hash className="w-3 h-3" />;
    case 'boolean':
      return <CheckCircle className="w-3 h-3" />;
    default:
      return <Info className="w-3 h-3" />;
  }
};

const FieldTypeBadge: React.FC<{ type: any }> = ({ type }) => {
  const getBadgeVariant = (type: any) => {
    switch (type) {
      case 'currency':
        return 'default';
      case 'date':
        return 'secondary';
      case 'percentage':
        return 'outline';
      case 'number':
        return 'secondary';
      case 'boolean':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <Badge variant={getBadgeVariant(type)} className="text-xs">
      <FieldTypeIcon type={type} />
      <span className="ml-1">{type}</span>
    </Badge>
  );
};

export const DynamicFieldsDisplay: React.FC<DynamicFieldsDisplayProps> = ({
  dynamicFields,
  metadata,
  className = ''
}) => {
  if (!dynamicFields || Object.keys(dynamicFields).length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">
        Additional Fields
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(dynamicFields).map(([fieldName, value]) => {
          const fieldMetadata = metadata[fieldName];
          const displayName = fieldMetadata?.displayName || fieldName;
          const type = fieldMetadata?.type || 'string';
          const formattedValue = String(value);

          return (
            <TooltipProvider key={fieldName}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors cursor-help">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {displayName}
                      </span>
                      <FieldTypeBadge type={type} />
                    </div>
                    <div className="text-sm text-gray-600 truncate">
                      {formattedValue || (
                        <span className="text-gray-400 italic">No value</span>
                      )}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-xs">
                    <div className="font-medium">{displayName}</div>
                    <div className="text-sm text-gray-500">Type: {type}</div>
                    {fieldMetadata?.isRequired && (
                      <div className="text-sm text-red-500">Required field</div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
};

export default DynamicFieldsDisplay; 