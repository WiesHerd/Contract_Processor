import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Info } from 'lucide-react';
import { RootState } from '@/store';
import { validateTemplateMappings, getTemplateMappingSummary } from '../mappingsSlice';
import { awsTemplateMappings } from '@/utils/awsServices';
import type { AppDispatch } from '@/store';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface MappingValidationPanelProps {
  templateId: string;
  templateName: string;
  onValidationComplete?: (isValid: boolean) => void;
}

export function MappingValidationPanel({ 
  templateId, 
  templateName, 
  onValidationComplete 
}: MappingValidationPanelProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [isValidating, setIsValidating] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  
  const validationResults = useSelector((state: RootState) => 
    state.mappings.validationResults[templateId]
  );

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      await dispatch(validateTemplateMappings(templateId)).unwrap();
      
      // Also get summary for additional insights
      const summaryResult = await awsTemplateMappings.getTemplateMappingSummary(templateId);
      setSummary(summaryResult);
      
      onValidationComplete?.(validationResults?.isValid || false);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-validate on mount
  useEffect(() => {
    handleValidate();
  }, [templateId]);

  const getStatusIcon = () => {
    if (!validationResults) return <Info className="h-5 w-5 text-gray-400" />;
    if (validationResults.isValid) return <CheckCircle className="h-5 w-5 text-green-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  const getStatusBadge = () => {
    if (!validationResults) return <Badge variant="secondary">Not Validated</Badge>;
    if (validationResults.isValid) return <Badge variant="default" className="bg-green-100 text-green-800">Valid</Badge>;
    return <Badge variant="destructive">Issues Found</Badge>;
  };

  const getProgressPercentage = () => {
    if (!summary) return 0;
    return summary.mappingPercentage || 0;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Mapping Validation</CardTitle>
            <CardDescription>
              Template: {templateName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {getStatusBadge()}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {summary && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Mapping Progress</span>
              <span>{getProgressPercentage()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  getProgressPercentage() === 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">{summary.totalPlaceholders}</div>
                <div className="text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{summary.mappedPlaceholders}</div>
                <div className="text-gray-500">Mapped</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-red-600">{summary.unmappedPlaceholders}</div>
                <div className="text-gray-500">Unmapped</div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Results */}
        {validationResults && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Validation Results</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={isValidating}
                className="gap-2"
              >
                {isValidating ? (
                  <LoadingSpinner size="sm" inline />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Revalidate
              </Button>
            </div>

            {validationResults.issues.length > 0 ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Found {validationResults.issues.length} issue(s):</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {validationResults.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All mappings are valid and complete. No issues found.
                </AlertDescription>
              </Alert>
            )}

            {/* Integrity Issues */}
            {summary?.integrityIssues && summary.integrityIssues.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">Integrity Issues:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {summary.integrityIssues.map((issue: string, index: number) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Last Modified */}
        {summary?.lastModified && (
          <div className="text-xs text-gray-500">
            Last modified: {new Date(summary.lastModified).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 