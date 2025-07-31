import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addGeneratedContract, addGenerationLog } from '../generatorSlice';
import { normalizeSmartQuotes } from '@/utils/formattingUtils';
import { mergeTemplateWithData } from '../mergeUtils';
import { ContractGenerationLogService } from '@/services/contractGenerationLogService';
import type { Provider } from '@/types/provider';
import type { Template } from '@/types/template';
import type { LocalTemplateMapping } from '@/features/templates/mappingsSlice';

interface UseGeneratorEventsProps {
  providers: Provider[];
  templates: Template[];
  mappings: Record<string, LocalTemplateMapping>;
  selectedProviderIds: string[];
  filteredProviders: Provider[];
  selectedTemplate: Template | null;
  clickedProvider: Provider | null;
  getAssignedTemplate: (provider: Provider) => Template | null;
  generateAndDownloadDocx: (provider: Provider, template?: Template) => Promise<any>;
  handleBulkGenerate: () => Promise<void>;
  updateProviderTemplate: (providerId: string, templateId: string | null) => void;
  setSelectedProviderIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setPreviewModalOpen: (open: boolean) => void;
  setBottomActionMenuOpen: (open: boolean) => void;
  setUserError: (error: string | null) => void;
  showSuccess: (message: string) => void;
  showError: (error: { message: string; severity: string }) => void;
  hydrateGeneratedContracts: () => Promise<void>;
}

export const useGeneratorEvents = ({
  providers,
  templates,
  mappings,
  selectedProviderIds,
  filteredProviders,
  selectedTemplate,
  clickedProvider,
  getAssignedTemplate,
  generateAndDownloadDocx,
  handleBulkGenerate,
  updateProviderTemplate,
  setSelectedProviderIds,
  setPreviewModalOpen,
  setBottomActionMenuOpen,
  setUserError,
  showSuccess,
  showError,
  hydrateGeneratedContracts,
}: UseGeneratorEventsProps) => {
  const dispatch = useDispatch();

  // Single contract generation handler
  const handleGenerate = useCallback(async () => {
    if (selectedProviderIds.length !== 1) return;
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) return;
    
    // Use assigned template or fallback to selected template
    const assignedTemplate = getAssignedTemplate(provider);
    if (!assignedTemplate) {
      setUserError("No template assigned to this provider. Please assign a template first.");
      return;
    }
    
    try {
      await generateAndDownloadDocx(provider, assignedTemplate);
      // Add a small delay to ensure DynamoDB write has propagated
      await new Promise(resolve => setTimeout(resolve, 500));
      await hydrateGeneratedContracts();
    } catch (e) {
      setUserError("Failed to generate contract. Please try again.");
    }
  }, [selectedProviderIds, providers, getAssignedTemplate, generateAndDownloadDocx, hydrateGeneratedContracts, setUserError]);

  // Contract preview handler
  const handlePreview = useCallback(() => {
    if (selectedProviderIds.length === 0) {
      setUserError("Please select at least one provider to preview.");
      return;
    }
    
    // Check if all selected providers have templates assigned
    const providersWithoutTemplates = selectedProviderIds
      .map(id => providers.find(p => p.id === id))
      .filter(provider => provider && !getAssignedTemplate(provider));
    
    if (providersWithoutTemplates.length > 0) {
      const providerNames = providersWithoutTemplates.map(p => p?.name).filter(Boolean).join(', ');
      setUserError(`Some selected providers don't have templates assigned: ${providerNames}. Please assign templates first.`);
      return;
    }
    
    setPreviewModalOpen(true);
  }, [selectedProviderIds, providers, getAssignedTemplate, setUserError, setPreviewModalOpen]);

  // Preview generation for specific provider
  const handlePreviewGenerate = useCallback((providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      // Set the provider for preview and open the preview modal
      setSelectedProviderIds([providerId]);
      setPreviewModalOpen(true);
    } else {
      console.error('❌ Provider not found for ID:', providerId);
    }
  }, [providers, setSelectedProviderIds, setPreviewModalOpen]);

  // Row click handler for selection toggle
  const handleRowClick = useCallback((event: any) => {
    const provider = event.data;
    if (provider) {
      // Toggle selection of this provider
      setSelectedProviderIds(prev => 
        prev.includes(provider.id) 
          ? prev.filter(id => id !== provider.id)
          : [...prev, provider.id]
      );
    }
  }, [setSelectedProviderIds]);

  // Quick action: Generate one contract
  const handleGenerateOne = useCallback(async () => {
    if (clickedProvider) {
      const assignedTemplate = getAssignedTemplate(clickedProvider);
      if (assignedTemplate) {
        await generateAndDownloadDocx(clickedProvider, assignedTemplate);
        showSuccess(`Generated contract for ${clickedProvider.name}`);
      } else {
        showError({ message: `No template assigned to ${clickedProvider.name}`, severity: 'error' });
      }
    }
    setBottomActionMenuOpen(false);
  }, [clickedProvider, getAssignedTemplate, generateAndDownloadDocx, showSuccess, showError, setBottomActionMenuOpen]);

  // Quick action: Generate all contracts
  const handleGenerateAll = useCallback(async () => {
    if (clickedProvider) {
      // Select this provider and all others, then generate all
      const allProviderIds = filteredProviders.map(p => p.id);
      setSelectedProviderIds(allProviderIds);
      await handleBulkGenerate();
    }
    setBottomActionMenuOpen(false);
  }, [clickedProvider, filteredProviders, setSelectedProviderIds, handleBulkGenerate, setBottomActionMenuOpen]);

  // Quick action: Clear template assignments
  const handleClearAssignments = useCallback(() => {
    if (clickedProvider) {
      updateProviderTemplate(clickedProvider.id, null);
      showSuccess(`Cleared template assignment for ${clickedProvider.name}`);
    }
    setBottomActionMenuOpen(false);
  }, [clickedProvider, updateProviderTemplate, showSuccess, setBottomActionMenuOpen]);

  // Quick action: Assign template
  const handleAssignTemplate = useCallback((templateId: string) => {
    if (clickedProvider) {
      updateProviderTemplate(clickedProvider.id, templateId);
    }
    setBottomActionMenuOpen(false);
  }, [clickedProvider, updateProviderTemplate, setBottomActionMenuOpen]);

  // Legacy DOCX generation handler
  const handleGenerateDOCX = useCallback(async () => {
    setUserError(null);
    if (!selectedTemplate) {
      setUserError("No template selected. Please select a template before generating.");
      return;
    }
    if (selectedProviderIds.length !== 1) {
      setUserError("Please select exactly one provider before generating.");
      return;
    }
    const provider = providers.find(p => p.id === selectedProviderIds[0]);
    if (!provider) {
      setUserError("Selected provider not found. Please check your provider selection.");
      return;
    }
    const html = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || "";
    if (!html) {
      setUserError("Template content is missing or not loaded. Please check your template.");
      return;
    }
    const mapping = mappings[selectedTemplate.id]?.mappings;
    
    // Convert FieldMapping to EnhancedFieldMapping for dynamic block support
    const enhancedMapping = mapping?.map(m => {
      // Check if this mapping has a dynamic block (stored in value field with dynamic: prefix)
      if (m.mappedColumn && m.mappedColumn.startsWith('dynamic:')) {
        return {
          ...m,
          mappingType: 'dynamic' as const,
          mappedDynamicBlock: m.mappedColumn.replace('dynamic:', ''),
          mappedColumn: undefined, // Clear the mappedColumn since it's a dynamic block
        };
      }
      return {
        ...m,
        mappingType: 'field' as const,
      };
    });
    
    const { content: mergedHtml } = await mergeTemplateWithData(selectedTemplate, provider, html, enhancedMapping);
    if (!mergedHtml || typeof mergedHtml !== 'string' || mergedHtml.trim().length === 0) {
      setUserError("No contract content available to export after merging. Please check your template and provider data.");
      return;
    }
    try {
      // Normalize mergedHtml
      const htmlClean = normalizeSmartQuotes(mergedHtml);
      // Prepend Aptos font style
      const aptosStyle = `<style>
body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
  font-family: Aptos, Arial, sans-serif !important;
  font-size: 11pt !important;
}
h1 { font-size: 16pt !important; font-weight: bold !important; }
h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; }
b, strong { font-weight: bold !important; }
</style>`;
      const htmlWithFont = aptosStyle + htmlClean;
      // @ts-ignore
      if (!window.htmlDocx || typeof window.htmlDocx.asBlob !== 'function') {
        setUserError('Failed to generate document. DOCX generator not available. Please ensure html-docx-js is loaded via CDN and try refreshing the page.');
        return;
      }
      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
      const fileName = `ScheduleA_${String(provider.name).replace(/\s+/g, '')}.docx`;
      const url = URL.createObjectURL(docxBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the generation event
      const contractYear = selectedTemplate.contractYear || new Date().getFullYear().toString();
      const logInput = {
        providerId: provider.id,
        contractYear: contractYear,
        templateId: selectedTemplate.id,
        organizationId: provider.organizationId || 'default-org-id',
        generatedAt: new Date().toISOString(),
        generatedBy: localStorage.getItem('userEmail') || 'unknown',
        outputType: 'DOCX',
        status: 'SUCCESS',
        fileUrl: fileName,
        notes: `Generated contract for ${provider.name} using template ${selectedTemplate.name}`,
        owner: localStorage.getItem('userId') || 'unknown'
      };

      try {
        const logEntry = await ContractGenerationLogService.createLog(logInput);
        // Add a small delay to ensure DynamoDB write has propagated
        await new Promise(resolve => setTimeout(resolve, 500));
        // Refresh contracts from database to ensure consistency
        await hydrateGeneratedContracts();
      } catch (logError) {
        console.error('Failed to log contract generation:', logError);
        // Don't fail the generation if logging fails
      }
    } catch (error) {
      setUserError("Failed to generate DOCX. Please ensure the template is properly initialized and html-docx-js is loaded.");
      console.error("DOCX Generation Error:", error);
      // Don't add failed contracts to Redux - they weren't logged to DynamoDB
    }
  }, [
    selectedTemplate,
    selectedProviderIds,
    providers,
    mappings,
    setUserError,
    dispatch
  ]);

  return {
    handleGenerate,
    handlePreview,
    handlePreviewGenerate,
    handleRowClick,
    handleGenerateOne,
    handleGenerateAll,
    handleClearAssignments,
    handleAssignTemplate,
    handleGenerateDOCX,
  };
}; 