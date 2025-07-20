import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { FileText, Eye, Download, ExternalLink, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { Provider } from '@/types/provider';
import type { Template } from '@/types/template';
import { formatDate } from '@/utils/formattingUtils';

interface ContractActionsPanelProps {
  selectedProviderIds: string[];
  providers: Provider[];
  generatedContracts: any[];
  templates: Template[];
  statusTab: 'notGenerated' | 'processed' | 'all';
  onDownloadContract: (provider: Provider, templateId: string) => void;
  onPreviewContract: (provider: Provider, templateId: string) => void;
  onViewInS3: (provider: Provider, templateId: string) => void;
}

export const ContractActionsPanel: React.FC<ContractActionsPanelProps> = ({
  selectedProviderIds,
  providers,
  generatedContracts,
  templates,
  statusTab,
  onDownloadContract,
  onPreviewContract,
  onViewInS3,
}) => {
  // Only show for processed tab and when providers are selected
  if (statusTab !== 'processed' || selectedProviderIds.length === 0) {
    return null;
  }

  // Get selected providers with their contract information
  const selectedProvidersWithContracts = selectedProviderIds
    .map(providerId => {
      const provider = providers.find(p => p.id === providerId);
      if (!provider) return null;

      const contract = generatedContracts.find(c => c.providerId === providerId);
      if (!contract) return null;

      const template = templates.find(t => t.id === contract.templateId);
      
      return {
        provider,
        contract,
        template,
      };
    })
    .filter(Boolean);

  if (selectedProvidersWithContracts.length === 0) {
    return null;
  }

  const successContracts = selectedProvidersWithContracts.filter(item => 
    item?.contract.status === 'SUCCESS'
  );
  const partialContracts = selectedProvidersWithContracts.filter(item => 
    item?.contract.status === 'PARTIAL_SUCCESS'
  );
  const failedContracts = selectedProvidersWithContracts.filter(item => 
    item?.contract.status === 'FAILED'
  );

  return (
    <Card className="mb-4 border-blue-200 bg-blue-50/50">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Contract Actions</h3>
            <Badge variant="secondary" className="ml-2">
              {selectedProvidersWithContracts.length} selected
            </Badge>
          </div>
          
          {/* Summary Stats */}
          <div className="flex items-center gap-3 text-sm">
            {successContracts.length > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-green-700">{successContracts.length} success</span>
              </div>
            )}
            {partialContracts.length > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-orange-700">{partialContracts.length} partial</span>
              </div>
            )}
            {failedContracts.length > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-700">{failedContracts.length} failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {/* Bulk Download */}
          {successContracts.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      successContracts.forEach(item => {
                        if (item?.provider && item?.contract.templateId) {
                          onDownloadContract(item.provider, item.contract.templateId);
                        }
                      });
                    }}
                    className="bg-white hover:bg-gray-50 border-blue-300 text-blue-700 hover:text-blue-800"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download All ({successContracts.length})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Download all successfully generated contracts
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Bulk Preview */}
          {successContracts.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Preview the first successful contract
                      const firstSuccess = successContracts[0];
                      if (firstSuccess?.provider && firstSuccess?.contract.templateId) {
                        onPreviewContract(firstSuccess.provider, firstSuccess.contract.templateId);
                      }
                    }}
                    className="bg-white hover:bg-gray-50 border-green-300 text-green-700 hover:text-green-800"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview First
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Preview the first successfully generated contract
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* View in S3 */}
          {successContracts.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // View the first successful contract in S3
                      const firstSuccess = successContracts[0];
                      if (firstSuccess?.provider && firstSuccess?.contract.templateId) {
                        onViewInS3(firstSuccess.provider, firstSuccess.contract.templateId);
                      }
                    }}
                    className="bg-white hover:bg-gray-50 border-purple-300 text-purple-700 hover:text-purple-800"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View in S3
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Open the first contract file in S3 storage
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Individual Provider Actions */}
        {selectedProvidersWithContracts.length <= 5 && (
          <div className="mt-3 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Individual Actions:</h4>
            {selectedProvidersWithContracts.map((item, index) => {
              if (!item) return null;
              const { provider, contract, template } = item;
              const isSuccess = contract.status === 'SUCCESS';
              const isPartial = contract.status === 'PARTIAL_SUCCESS';
              const isFailed = contract.status === 'FAILED';

              return (
                <div key={provider.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isSuccess && <CheckCircle className="w-4 h-4 text-green-600" />}
                      {isPartial && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                      {isFailed && <XCircle className="w-4 h-4 text-red-600" />}
                      <span className="font-medium text-sm">{provider.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {template?.name || 'Unknown template'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(contract.generatedAt)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {isSuccess && (
                      <>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDownloadContract(provider, contract.templateId)}
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                              >
                                <Download className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Download contract</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onPreviewContract(provider, contract.templateId)}
                                className="h-7 w-7 p-0 text-green-600 hover:text-green-800 hover:bg-green-50"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Preview contract</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onViewInS3(provider, contract.templateId)}
                                className="h-7 w-7 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View in S3</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                    
                    {isPartial && (
                      <span className="text-xs text-orange-600">Partial success</span>
                    )}
                    
                    {isFailed && (
                      <span className="text-xs text-red-600">Generation failed</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Show message if too many selected */}
        {selectedProvidersWithContracts.length > 5 && (
          <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              {selectedProvidersWithContracts.length} contracts selected. Use bulk actions above or select fewer contracts for individual actions.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}; 