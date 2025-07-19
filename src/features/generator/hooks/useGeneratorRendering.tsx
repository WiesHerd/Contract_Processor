/**
 * Custom hook for component rendering logic
 * Extracted from ContractGenerator.tsx to improve maintainability and testability
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ProgressModal from '@/components/ui/ProgressModal';
import { AgGridReact } from 'ag-grid-react';
import { 
  Info, 
  ChevronUp, 
  ChevronDown, 
  RotateCcw, 
  AlertTriangle, 
  Trash2,
  FileText,
  Download,
  Upload,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Settings,
  FolderOpen
} from 'lucide-react';
import type { Provider } from '@/types/provider';
import type { Template } from '@/types/template';

interface ExtendedProvider extends Provider {
  [key: string]: any;
}

interface UseGeneratorRenderingProps {
  // State
  providers: Provider[];
  templates: Template[];
  selectedProviderIds: string[];
  selectedTemplate: Template | null;
  statusTab: 'notGenerated' | 'processed' | 'all';
  pageIndex: number;
  pageSize: number;
  search: string;
  bulkOpen: boolean;
  isBulkGenerating: boolean;
  progressModalOpen: boolean;
  progressData: any;
  instructionsModalOpen: boolean;
  showClearConfirm: boolean;
  isClearing: boolean;
  clearingProgress: number;
  contractsToClear: any[];
  isColumnSidebarOpen: boolean;
  editorModalOpen: boolean;
  editorContent: string;
  previewModalOpen: boolean;
  bulkAssignmentModalOpen: boolean;
  sameTemplateModalOpen: boolean;
  templateErrorModalOpen: boolean;
  bottomActionMenuOpen: boolean;
  showDetailedView: boolean;
  clickedProvider: Provider | null;
  showAssignmentHint: boolean;
  
  // Filter state
  selectedSpecialty: string;
  selectedSubspecialty: string;
  selectedProviderType: string;
  specialtyOptions: string[];
  subspecialtyOptions: string[];
  providerTypeOptions: string[];
  
  // Computed values
  filteredProviders: Provider[];
  visibleRows: Provider[];
  tabFilteredRows: Provider[];
  totalPages: number;
  allFilteredProvidersWithStatus: any[];
  tabCounts: any;
  
  // Grid props
  tempGridRef: React.RefObject<any>;
  agGridColumnDefs: any[];
  gridOptions: any;
  gridStyle: React.CSSProperties;
  onGridReady: (params: any) => void;
  onRowDataUpdated: (params: any) => void;
  
  // Functions
  setSelectedProviderIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  setBulkOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setPageIndex: (index: number) => void;
  setSelectedSpecialty: (specialty: string) => void;
  setSelectedSubspecialty: (subspecialty: string) => void;
  setSelectedProviderType: (type: string) => void;
  setInstructionsModalOpen: (open: boolean) => void;
  setShowClearConfirm: (show: boolean) => void;
  clearTemplateAssignments: () => void;
  handleRowClick: (event: any) => void;
  handleBulkGenerate: () => void;
  handleModalBulkGenerate: () => void;
  confirmClearContracts: () => void;
  showSuccess: (message: string) => void;
  showError: (error: any) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

export const useGeneratorRendering = ({
  // State
  providers,
  templates,
  selectedProviderIds,
  selectedTemplate,
  statusTab,
  pageIndex,
  pageSize,
  search,
  bulkOpen,
  isBulkGenerating,
  progressModalOpen,
  progressData,
  instructionsModalOpen,
  showClearConfirm,
  isClearing,
  clearingProgress,
  contractsToClear,
  isColumnSidebarOpen,
  editorModalOpen,
  editorContent,
  previewModalOpen,
  bulkAssignmentModalOpen,
  sameTemplateModalOpen,
  templateErrorModalOpen,
  bottomActionMenuOpen,
  showDetailedView,
  clickedProvider,
  showAssignmentHint,
  
  // Filter state
  selectedSpecialty,
  selectedSubspecialty,
  selectedProviderType,
  specialtyOptions,
  subspecialtyOptions,
  providerTypeOptions,
  
  // Computed values
  filteredProviders,
  visibleRows,
  tabFilteredRows,
  totalPages,
  allFilteredProvidersWithStatus,
  tabCounts,
  
  // Grid props
  tempGridRef,
  agGridColumnDefs,
  gridOptions,
  gridStyle,
  onGridReady,
  onRowDataUpdated,
  
  // Functions
  setSelectedProviderIds,
  setBulkOpen,
  setPageIndex,
  setSelectedSpecialty,
  setSelectedSubspecialty,
  setSelectedProviderType,
  setInstructionsModalOpen,
  setShowClearConfirm,
  clearTemplateAssignments,
  handleRowClick,
  handleBulkGenerate,
  handleModalBulkGenerate,
  confirmClearContracts,
  showSuccess,
  showError,
  showWarning,
  showInfo,
}: UseGeneratorRenderingProps) => {

  const renderHeader = () => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-lg font-bold text-gray-800">Contract Generation</h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-pointer">
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors" aria-label="Info" />
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white px-3 py-2 text-sm rounded-md shadow-lg">
                Generate contracts for selected providers using your templates
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div className="flex-1" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setInstructionsModalOpen(true)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title="View detailed instructions"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-gray-900 text-white px-3 py-2 text-sm rounded-md shadow-lg">
                View detailed instructions and help
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <hr className="my-3 border-gray-100" />
    </div>
  );

  const renderBulkProcessingSection = () => (
    <div className="rounded-xl border border-blue-100 bg-gray-50 shadow-sm p-0 transition-all duration-300 ${bulkOpen ? 'pb-6' : 'pb-0'} relative">
      <div className="flex items-center gap-3 px-6 pt-6 pb-2 cursor-pointer select-none" onClick={() => setBulkOpen(v => !v)}>
        <span className="text-blue-600 text-2xl">⚡</span>
        <span className="font-bold text-lg text-blue-900 tracking-wide">Bulk Processing</span>
      </div>
      <button
        className="absolute top-4 right-4 p-1 rounded hover:bg-blue-100 transition-colors"
        aria-label={bulkOpen ? 'Collapse' : 'Expand'}
        tabIndex={0}
        onClick={e => { e.stopPropagation(); setBulkOpen(v => !v); }}
        type="button"
      >
        {bulkOpen ? <ChevronUp className="w-5 h-5 text-blue-600" /> : <ChevronDown className="w-5 h-5 text-blue-600" />}
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${bulkOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}> 
        
        {/* Primary Actions */}
        <div className="px-6 pt-4 pb-4 border-b border-gray-200">
          <div className="space-y-4">
            {/* Bulk Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allFilteredIds = filteredProviders.map((p: Provider) => p.id);
                  setSelectedProviderIds(allFilteredIds);
                }}
                disabled={filteredProviders.length === 0 || isBulkGenerating}
                className="font-medium"
                title="Select all providers across all tabs and pages"
              >
                All Filtered ({filteredProviders.length})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const visibleIds = visibleRows.map((p: Provider) => p.id);
                  setSelectedProviderIds(visibleIds);
                }}
                disabled={providers.length === 0 || isBulkGenerating}
                className="font-medium"
                title="Select all providers currently visible on this page"
              >
                Visible
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedProviderIds([]);
                }}
                disabled={selectedProviderIds.length === 0 || isBulkGenerating}
                className="font-medium"
                title="Clear all selected providers"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="px-6 pt-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">Filters & Advanced Options</div>
          
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 gap-2 mb-4 justify-between">
            {/* Filter Dropdowns - Left Side */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:gap-4 gap-2">
              <div className="flex flex-col min-w-[160px]">
                <span className="mb-1 font-semibold text-blue-700 text-sm tracking-wide">Specialty</span>
                <Select
                  value={selectedSpecialty}
                  onValueChange={val => {
                    setSelectedSpecialty(val);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Specialties</SelectItem>
                    {specialtyOptions.filter(s => s && s.trim() !== '').map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col min-w-[160px]">
                <span className="mb-1 font-semibold text-blue-700 text-sm tracking-wide">Subspecialty</span>
                <Select
                  value={selectedSubspecialty}
                  onValueChange={val => {
                    setSelectedSubspecialty(val);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Subspecialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Subspecialties</SelectItem>
                    {subspecialtyOptions.filter(s => s && s.trim() !== '').map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col min-w-[160px]">
                <span className="mb-1 font-semibold text-blue-700 text-sm tracking-wide">Provider Type</span>
                <Select
                  value={selectedProviderType}
                  onValueChange={val => {
                    setSelectedProviderType(val);
                    setPageIndex(0);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All Types</SelectItem>
                    {providerTypeOptions.filter(s => s && s.trim() !== '').map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Reset Actions - Right Side */}
            <div className="flex flex-col min-w-[400px] mt-4 sm:mt-0">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-center mb-3">
                  <span className="font-semibold text-blue-700 text-sm tracking-wide">Reset Filters</span>
                </div>
                <div className="flex items-center gap-1">
                  {/* Microsoft/Google-style compact button group */}
                  <div className="flex items-center border border-gray-300 rounded-md overflow-hidden">
                    {/* Clear Filters - Primary Action */}
                    <button
                      onClick={() => {
                        setSelectedSpecialty("__ALL__");
                        setSelectedSubspecialty("__ALL__");
                        setSelectedProviderType("__ALL__");
                        setPageIndex(0);
                      }}
                      className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 border-r border-gray-300 flex items-center gap-1.5"
                      title="Clear all filters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear
                    </button>
                    
                    {/* Template Assignments - Secondary Action */}
                    <button
                      onClick={clearTemplateAssignments}
                      disabled={isBulkGenerating}
                      className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 border-r border-gray-300 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Clear template assignments"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Templates
                    </button>
                    
                    {/* Complete Reset - Tertiary Action */}
                    <button
                      onClick={() => {
                        showSuccess('Complete reset: All assignments and selections cleared');
                      }}
                      disabled={isBulkGenerating}
                      className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Complete system reset"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Reset
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMainContent = () => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      {/* Modern Filter Sections */}
      <div className="flex flex-col gap-4 mb-6">
        {renderBulkProcessingSection()}
      </div>

      {/* Tabs */}
      <Tabs value={statusTab} onValueChange={(value: any) => {}} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="notGenerated" className="flex items-center gap-2">
              Not Generated
              <Badge variant="secondary" className="ml-1">
                {tabCounts.notGenerated}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="processed" className="flex items-center gap-2">
              Processed
              <Badge variant="secondary" className="ml-1">
                {tabCounts.processed}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              All
              <Badge variant="secondary" className="ml-1">
                {tabCounts.all}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={statusTab} className="mt-0">
          {/* AG Grid */}
          <div className="ag-theme-alpine w-full border border-gray-200 rounded-lg overflow-visible" style={gridStyle}>
            <AgGridReact
              ref={tempGridRef}
              rowData={visibleRows}
              columnDefs={agGridColumnDefs as import('ag-grid-community').ColDef<ExtendedProvider, any>[]}
              onRowClicked={handleRowClick}
              onGridReady={onGridReady}
              onRowDataUpdated={onRowDataUpdated}
              {...gridOptions}
            />
          </div>

          {/* Pagination */}
          <div className="flex gap-2 items-center mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={pageIndex === 0}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {pageIndex + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(Math.min(totalPages - 1, pageIndex + 1))}
              disabled={pageIndex === totalPages - 1}
            >
              Next
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderModals = () => (
    <>
      {/* Instructions Modal */}
      {instructionsModalOpen && (
        <Dialog open={instructionsModalOpen} onOpenChange={setInstructionsModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                Contract Generation Instructions
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Overview */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  Quick Start Guide
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                    <li><strong>Upload Providers:</strong> Go to Providers page and upload your CSV file</li>
                    <li><strong>Create Templates:</strong> Go to Templates page and create your contract templates</li>
                    <li><strong>Assign Templates:</strong> Select providers and assign templates (individual or bulk)</li>
                    <li><strong>Generate Contracts:</strong> Use "Generate" buttons to create contracts</li>
                    <li><strong>Download:</strong> Download individual files or ZIP archives for bulk operations</li>
                  </ol>
                </div>
              </div>

              {/* Template Assignment */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Template Assignment Methods
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Individual Assignment</h4>
                    <p className="text-sm text-gray-600 mb-3">Assign different templates to each provider</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Use dropdown in each provider row</p>
                      <p>• Perfect for custom assignments</p>
                      <p>• Changes saved automatically</p>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Bulk Assignment</h4>
                    <p className="text-sm text-gray-600 mb-3">Assign templates to multiple providers at once</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• Select providers → "Same Template (All)"</p>
                      <p>• Or "Different Templates" for individual control</p>
                      <p>• Use bulk assignment modal for complex scenarios</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Options */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Workflow Options
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Single Contract</h4>
                    <p className="text-sm text-gray-600">Generate one contract at a time</p>
                    <div className="text-xs text-gray-500 mt-2">
                      <p>• Right-click provider → "Generate"</p>
                      <p>• Immediate download</p>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Bulk Generation</h4>
                    <p className="text-sm text-gray-600">Generate multiple contracts</p>
                    <div className="text-xs text-gray-500 mt-2">
                      <p>• Select multiple providers</p>
                      <p>• Download as ZIP archive</p>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Session Management</h4>
                    <p className="text-sm text-gray-600">Temporary template assignments</p>
                    <div className="text-xs text-gray-500 mt-2">
                      <p>• Persists during tab navigation</p>
                      <p>• Clear with "Complete Reset"</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Keyboard Shortcuts
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Reset Operations</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Complete Reset:</span>
                          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl+R</kbd>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Session Only:</span>
                          <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs">Ctrl+Shift+R</kbd>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Navigation</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tab Navigation:</span>
                          <span className="text-gray-500 text-xs">Click tabs</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Row Selection:</span>
                          <span className="text-gray-500 text-xs">Click rows</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips & Best Practices */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Tips & Best Practices
                </h3>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <ul className="text-sm text-amber-800 space-y-2">
                    <li>• <strong>Filter first:</strong> Use specialty/subspecialty filters to narrow down providers</li>
                    <li>• <strong>Bulk assign:</strong> Use "Same Template (All)" for efficiency when possible</li>
                    <li>• <strong>Session persistence:</strong> Template assignments are saved during tab navigation</li>
                    <li>• <strong>Check status:</strong> Use the "Processed" tab to see generated contracts</li>
                    <li>• <strong>Bulk download:</strong> Use ZIP archives for multiple contracts</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-200">
              <Button onClick={() => setInstructionsModalOpen(false)}>
                Got it, thanks!
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Clear All Processed Contracts
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 mb-4">
            Are you sure you want to permanently delete ALL {contractsToClear.length} processed contracts (including Success, Partial Success, and Failed) from the database? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowClearConfirm(false)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmClearContracts}
              disabled={isClearing}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? 'Clearing...' : `Clear All ${contractsToClear.length} Contracts`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress Modal for Clearing Contracts */}
      <ProgressModal
        isOpen={isClearing}
        title="Clearing Processed Contracts"
        progress={clearingProgress}
        message={
          clearingProgress < 30 
            ? 'Fetching all contracts from database...' 
            : clearingProgress < 100 
              ? 'Deleting contracts from database...' 
              : 'Finishing up...'
        }
      />

      {/* Progress Modal for Bulk Generation */}
      <ProgressModal
        isOpen={progressModalOpen}
        title="Bulk Contract Generation"
        progress={progressData.progress}
        message={progressData.currentOperation}
      />
    </>
  );

  const renderMainLayout = () => (
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        {renderHeader()}
        {renderMainContent()}
        {renderModals()}
      </div>
    </div>
  );

  return {
    renderMainLayout,
    renderHeader,
    renderMainContent,
    renderBulkProcessingSection,
    renderModals,
  };
}; 