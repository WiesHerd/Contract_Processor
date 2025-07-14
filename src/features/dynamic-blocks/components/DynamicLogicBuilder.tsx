import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Play, Save, Eye, Info, Search, ChevronDown, ChevronRight } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from '@/components/ui/switch';

// Sample data - matches current provider schema
const availableFields = [
  'name', 'employeeId', 'providerType', 'specialty', 'subspecialty', 'positionTitle',
  'yearsExperience', 'baseSalary', 'hourlyWage', 'originalAgreementDate', 'organizationName',
  'startDate', 'contractTerm', 'ptoDays', 'holidayDays', 'cmeDays', 'cmeAmount',
  'signingBonus', 'relocationBonus', 'educationBonus', 'qualityBonus', 'compensationType',
  'conversionFactor', 'wRVUTarget', 'credentials', 'compensationModel', 'compensationYear',
  'fte', 'administrativeFte', 'administrativeRole', 'totalFTE', 'templateTag',
  // Dynamic fields that are stored in the dynamicFields JSON (exact casing from real data)
  'ClinicalFTE', 'MedicalDirectorFTE', 'DivisionChiefFTE', 'ResearchFTE', 'TeachingFTE', 'TotalFTE',
  // Alternative casings for backward compatibility  
  'clinicalFTE', 'medicalDirectorFTE', 'divisionChiefFTE', 'researchFTE', 'teachingFTE'
];

const operators = [
  { value: '>', label: '>' },
  { value: '>=', label: '>=' },
  { value: '=', label: '=' },
  { value: '!=', label: '!=' },
  { value: '<', label: '<' },
  { value: '<=', label: '<=' }
];

const outputTypes = [
  { value: 'bullets', label: 'Bullet Points' },
  { value: 'table', label: 'Table Format' },
  { value: 'table-no-borders', label: 'Table (No Borders)' },
  { value: 'paragraph', label: 'Paragraph Text' },
  { value: 'list', label: 'Simple List' }
];

interface TestProvider {
  id: number;
  name: string;
  [key: string]: any; // Allow dynamic field access
}

const testProviders: TestProvider[] = [
  {
    id: 1,
    name: 'Dr. Sarah Johnson',
    employeeId: 'EMP001',
    specialty: 'Cardiology',
    clinicalFTE: 0.8,
    administrativeFte: 0.2,
    researchFTE: 0,
    teachingFTE: 0,
    divisionChiefFTE: 0,
    medicalDirectorFTE: 0,
    baseSalary: 280000,
    compensationType: 'Salary',
    compensationYear: '2024',
    dynamicFields: JSON.stringify({
      ClinicalFTE: "0.8",
      MedicalDirectorFTE: "0.0",
      DivisionChiefFTE: "0.0",
      ResearchFTE: "0.0",
      TeachingFTE: "0.0",
      TotalFTE: "1.0"
    })
  },
  {
    id: 2,
    name: 'Dr. Michael Chen',
    employeeId: 'EMP002',
    specialty: 'Oncology',
    clinicalFTE: 0.6,
    administrativeFte: 0.1,
    researchFTE: 0.2,
    teachingFTE: 0.1,
    divisionChiefFTE: 0,
    medicalDirectorFTE: 0.1,
    baseSalary: 320000,
    compensationType: 'Salary + Productivity',
    wRVUTarget: 5000,
    conversionFactor: 45,
    compensationYear: '2024',
    dynamicFields: JSON.stringify({
      ClinicalFTE: "0.6",
      MedicalDirectorFTE: "0.1",
      DivisionChiefFTE: "0.0",
      ResearchFTE: "0.2",
      TeachingFTE: "0.1",
      TotalFTE: "1.0"
    })
  },
  {
    id: 3,
    name: 'Dr. Emily Rodriguez',
    employeeId: 'EMP003',
    specialty: 'Internal Medicine',
    clinicalFTE: 0.5,
    administrativeFte: 0.1,
    researchFTE: 0.1,
    teachingFTE: 0.2,
    divisionChiefFTE: 0.3,
    medicalDirectorFTE: 0.1,
    baseSalary: 380000,
    compensationType: 'Salary',
    signingBonus: 50000,
    compensationYear: '2024',
    dynamicFields: JSON.stringify({
      ClinicalFTE: "0.5",
      MedicalDirectorFTE: "0.1",
      DivisionChiefFTE: "0.3",
      ResearchFTE: "0.1",
      TeachingFTE: "0.2",
      TotalFTE: "1.2"
    })
  }
];

interface Condition {
  field: string;
  operator: string;
  value: string;
  label: string;
}

interface AlwaysInclude {
  label: string;
  valueField: string;
}

interface DynamicBlock {
  id: string;
  name: string;
  description: string;
  placeholder: string;
  outputType: string;
  format: string;
  conditions: Condition[];
  alwaysInclude: AlwaysInclude[];
}

interface DynamicBlockForSave {
  id?: string;
  name: string;
  description: string;
  placeholder: string;
  outputType: string;
  format: string;
  conditions: Condition[];
  alwaysInclude: AlwaysInclude[];
}

interface DynamicLogicBuilderProps {
  initialBlock?: DynamicBlock;
  onSave: (block: DynamicBlockForSave) => void;
}

// Debounce hook for performance optimization
const useDebounce = (value: any, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Contract Preview Section Component - Memoized for performance
interface ContractPreviewSectionProps {
  block: DynamicBlock;
  selectedProvider: TestProvider;
  onProviderChange: (provider: TestProvider) => void;
  previewOutput: string;
  evaluateCondition: (condition: Condition, provider: TestProvider) => boolean;
  onFormatChange: (format: string) => void;
}

const ContractPreviewSection = React.memo<ContractPreviewSectionProps>(({
  block,
  selectedProvider,
  onProviderChange,
  previewOutput,
  evaluateCondition,
  onFormatChange
}) => {
  const templates = useSelector((state: any) => state.templates?.templates || []);
  const providers = useSelector((state: any) => state.provider?.providers || []);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedRealProvider, setSelectedRealProvider] = useState<any>(null);
  const [previewMode, setPreviewMode] = useState<'block' | 'contract'>('block');

  // Use real providers if available, otherwise fall back to test providers
  const availableProviders = providers.length > 0 ? providers : testProviders;
  
  // Initialize with first real provider if available
  useEffect(() => {
    if (providers.length > 0 && !selectedRealProvider) {
      console.log('🔄 Initializing with first real provider:', providers[0]);
      setSelectedRealProvider(providers[0]);
      // Also update the main component's selected provider
      onProviderChange(providers[0]);
    }
  }, [providers, selectedRealProvider, onProviderChange]);

  // Use real provider data when available, otherwise use test data
  const currentProvider = selectedRealProvider || selectedProvider;

  const generateFullContractPreview = useCallback(async () => {
    if (!selectedTemplate || !currentProvider) {
      return '<div style="padding: 2rem; text-align: center; color: #666;">Select a template and provider to see full contract preview</div>';
    }

    console.log('📄 Generating full contract preview for:', currentProvider.name);
    console.log('📊 Using provider data:', currentProvider);

    try {
      // Import the mergeTemplateWithData function from the generator
      const { mergeTemplateWithData } = await import('@/features/generator/mergeUtils');
      
      // Get the template HTML
      const templateHtml = selectedTemplate.editedHtmlContent || selectedTemplate.htmlPreviewContent || '';
      
      // Replace the dynamic block placeholder with the actual generated content
      let updatedHtml = templateHtml;
      if (block.placeholder && previewOutput) {
        const placeholder = `{{${block.placeholder}}}`;
        // Add consistent font sizing wrapper for professional appearance
        const styledOutput = `<div style="font-size: 11pt;">${previewOutput}</div>`;
        updatedHtml = templateHtml.replace(placeholder, styledOutput);
      }

      // Use the same merging logic as the generate screen to replace all other placeholders
      const { content: mergedContent } = await mergeTemplateWithData(selectedTemplate, currentProvider as any, updatedHtml);
      
      console.log('✅ Full contract preview generated successfully');
      return mergedContent;
    } catch (error) {
      console.error('❌ Error generating full contract preview:', error);
      return '<div style="padding: 2rem; text-align: center; color: #666;">Error generating preview</div>';
    }
  }, [selectedTemplate, currentProvider, block.placeholder, previewOutput]);

  const aptosStyle = `
    <style>
      body, p, span, td, th, div, h1, h2, h3, h4, h5, h6 {
        font-family: Aptos, Arial, sans-serif !important;
        font-size: 11pt !important;
        line-height: 1.4;
      }
      h1 { font-size: 16pt !important; font-weight: bold !important; margin: 8px 0; }
      h2, h3, h4, h5, h6 { font-size: 13pt !important; font-weight: bold !important; margin: 6px 0; }
      .contract-preview {
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0.75in;
        background: white;
        min-height: 11in;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
    </style>
  `;

  const [fullPreviewHtml, setFullPreviewHtml] = useState(() => 
    aptosStyle + `<div class="contract-preview"><div style="padding: 2rem; text-align: center; color: #666;">Loading preview...</div></div>`
  );

  // Generate full contract preview asynchronously
  useEffect(() => {
    const generatePreview = async () => {
      try {
        const content = await generateFullContractPreview();
        setFullPreviewHtml(aptosStyle + `<div class="contract-preview">${content}</div>`);
      } catch (error) {
        console.error('Error generating full preview:', error);
        setFullPreviewHtml(aptosStyle + `<div class="contract-preview"><div style="padding: 2rem; text-align: center; color: #666;">Error generating preview</div></div>`);
      }
    };
    
    generatePreview();
  }, [generateFullContractPreview, aptosStyle]);

  return (
    <div className="space-y-6">
      {/* Settings Section */}
    <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5 text-blue-600" />
            Preview Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <Label className="text-sm font-semibold text-gray-800">Template</Label>
              <Select 
                value={selectedTemplate?.id || ''} 
                onValueChange={(value) => setSelectedTemplate(templates.find((t: any) => t.id === value))}
              >
                <SelectTrigger className="mt-2 h-11">
                  <SelectValue placeholder="Choose a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-800">Provider</Label>
              <div className="mt-2">
                <SearchableSelect
                  value={currentProvider?.id?.toString() || ''}
                onValueChange={(value) => {
                    console.log('🔄 Provider selection changed to:', value);
                  if (providers.length > 0) {
                      const provider = providers.find((p: any) => p.id === value || p.id.toString() === value);
                      if (provider) {
                        console.log('✅ Selected real provider:', provider);
                        setSelectedRealProvider(provider);
                        // Also update the main component's selected provider
                        onProviderChange(provider);
                      }
                  } else {
                    const provider = testProviders.find(p => p.id.toString() === value);
                      if (provider) {
                        console.log('✅ Selected test provider:', provider);
                        onProviderChange(provider);
                      }
                    }
                  }}
                  placeholder="Search and select a provider..."
                  options={availableProviders.map((provider: any) => ({
                    value: provider.id.toString(),
                    label: provider.name
                  }))}
                  className="h-11"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-semibold text-gray-800">Output Format</Label>
              <div className="flex items-center gap-3 mt-2">
                <Select value={block.outputType} onValueChange={(value) => onFormatChange(value)}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {outputTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
                <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                  ✓ Saved
                </Badge>
            </div>
          </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Section - Modern Design */}
          {block.name && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 px-3 py-1">
                  {`{{${block.placeholder}}}`}
                </Badge>
                <div className="h-4 w-px bg-gray-300" />
                <span className="text-sm font-medium text-gray-700">Preview Mode</span>
              </div>
              
              {/* Ultra-Modern Toggle */}
              <div className="relative">
                <div className="flex bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setPreviewMode('block')}
                    className={`relative px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      previewMode === 'block'
                        ? 'bg-white text-gray-900 shadow-md border border-gray-200'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Block Output
                  </button>
                  <button
                    onClick={() => setPreviewMode('contract')}
                    className={`relative px-6 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                      previewMode === 'contract'
                        ? 'bg-white text-gray-900 shadow-md border border-gray-200'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    Full Contract
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Preview Content with Better Design */}
            {previewMode === 'block' && (
              <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6 min-h-[250px]">
                {previewOutput ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Dynamic Block Output</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                          {block.conditions.filter(c => c.field && c.label && evaluateCondition(c, currentProvider)).length + block.alwaysInclude.length} items
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-600">{currentProvider.name}</span>
                        {providers.length > 0 && <Badge variant="secondary" className="bg-green-100 text-green-700">Live Data</Badge>}
                        {providers.length === 0 && <Badge variant="secondary" className="bg-orange-100 text-orange-700">Test Data</Badge>}
                      </div>
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: previewOutput }} />
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-16">
                    <div className="text-5xl mb-6">⚡</div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Ready to Preview</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Configure conditional line items or always-include items to see your dynamic content in action
                    </p>
                  </div>
                )}
            </div>
          )}

            {previewMode === 'contract' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
          <div>
                      <h3 className="font-semibold text-gray-900">Full Contract Preview</h3>
                      <p className="text-sm text-gray-600 mt-1">Complete document with merged dynamic content</p>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      Live Preview
                    </Badge>
                  </div>
                </div>
                <ScrollArea className="h-[400px]">
                  <div 
                    className="p-8 bg-white"
                dangerouslySetInnerHTML={{ __html: fullPreviewHtml }}
              />
            </ScrollArea>
          </div>
            )}
      </CardContent>
    </Card>
      )}
    </div>
  );
});

ContractPreviewSection.displayName = 'ContractPreviewSection';

// Searchable Select Component using standard Select with filter - Memoized
const SearchableSelect = React.memo(({ value, onValueChange, placeholder, options, className = "" }: {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  options: string[] | Array<{value: string; label: string}>;
  className?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const filteredOptions = useMemo(() => {
    if (options.length === 0) return [];
    
    if (typeof options[0] === 'string') {
      return (options as string[]).filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } else {
      return (options as Array<{value: string; label: string}>).filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }, [options, searchTerm]);

  return (
    <div className={className}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2"
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-2 text-sm text-gray-500">No results found</div>
            ) : (
              filteredOptions.map((option) => {
                if (typeof option === 'string') {
                  return (
                    <SelectItem key={option} value={option}>
                  {option}
                    </SelectItem>
                  );
                } else {
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  );
                }
              })
            )}
          </div>
        </SelectContent>
      </Select>
    </div>
  );
});

SearchableSelect.displayName = 'SearchableSelect';

export const DynamicLogicBuilder = React.forwardRef<any, DynamicLogicBuilderProps>(({
  initialBlock,
  onSave
}, ref) => {
  const [block, setBlock] = useState<DynamicBlock>(
    initialBlock || {
      id: '',
      name: '',
      description: '',
      placeholder: '',
      outputType: 'bullets',
      format: '• {{label}}: {{{{{{value}}}}}}',
      conditions: [],
      alwaysInclude: []
    }
  );

  const [selectedProvider, setSelectedProvider] = useState(testProviders[0]);
  const [previewOutput, setPreviewOutput] = useState('');
  const [blockInfoOpen, setBlockInfoOpen] = useState(true);
  const [showPreviewConfig, setShowPreviewConfig] = useState(false);
  
  // Preview configuration state
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedRealProvider, setSelectedRealProvider] = useState<any>(null);
  
  // Get templates and providers from Redux
  const templates = useSelector((state: any) => state.templates?.templates || []);
  const providers = useSelector((state: any) => state.provider?.providers || []);
  
  // Available providers for preview (real + test)
  const availableProviders = useMemo(() => {
    if (providers.length > 0) {
      return providers;
    } else {
      return testProviders;
    }
  }, [providers]);
  
  // Provider change handler
  const onProviderChange = useCallback((provider: any) => {
    console.log('🔄 Provider changed to:', provider);
    setSelectedProvider(provider);
  }, []);
  
  // Initialize with real provider if available
  useEffect(() => {
    if (providers.length > 0) {
      console.log('🔄 Initializing DynamicLogicBuilder with real provider:', providers[0]);
      console.log('📋 Available fields in real provider data:');
      console.log('  - Field names:', Object.keys(providers[0]));
      console.log('  - Field values:', Object.entries(providers[0]).map(([key, value]) => `${key}: ${value}`));
      setSelectedProvider(providers[0]);
    }
  }, [providers]);
  
  // Determine current provider (real data if available, otherwise test data)
  const currentProvider = useMemo(() => {
    if (providers.length > 0) {
      // Use real provider data if available
      const realProvider = providers.find((p: any) => p.id === selectedProvider.id || p.id.toString() === selectedProvider.id?.toString()) || providers[0];
      console.log('📊 Using real provider data:', realProvider);
      return realProvider;
    } else {
      // Fall back to test data
      console.log('📊 Using test provider data:', selectedProvider);
      return selectedProvider;
    }
  }, [providers, selectedProvider]);

  // Debounce the block state to prevent excessive re-renders
  const debouncedBlock = useDebounce(block, 300); // 300ms delay

  // Memoize the evaluation function for performance
  const evaluateCondition = useCallback((condition: Condition, provider: TestProvider): boolean => {
    let fieldValue = provider[condition.field];
    
    // Handle undefined fields - check dynamicFields first
    if (fieldValue === undefined || fieldValue === null) {
      console.log(`⚠️ Field "${condition.field}" is undefined/null for provider ${provider.name}`);
      
      // Try to parse dynamicFields if it exists
      if (provider.dynamicFields) {
        try {
          const dynamicData = typeof provider.dynamicFields === 'string' 
            ? JSON.parse(provider.dynamicFields) 
            : provider.dynamicFields;
          
          console.log(`🔍 Checking dynamicFields:`, dynamicData);
          
          // Try direct field name and common variations
          const fieldVariations = [
            condition.field, // exact match
            condition.field.charAt(0).toUpperCase() + condition.field.slice(1), // capitalize first letter
            condition.field.replace(/FTE$/, 'FTE'), // ensure FTE is uppercase
            condition.field.replace(/Fte$/, 'FTE'), // convert Fte to FTE
          ];
          
          for (const variation of fieldVariations) {
            if (dynamicData[variation] !== undefined) {
              fieldValue = dynamicData[variation];
              console.log(`✅ Found field value in dynamicFields using variation "${variation}": ${fieldValue}`);
              break;
            }
          }
        } catch (error) {
          console.error('❌ Error parsing dynamicFields:', error);
        }
      }
      
      // If still not found, try direct field variations
      if (fieldValue === undefined || fieldValue === null) {
        const fieldVariations = [
          condition.field.toLowerCase(),
          condition.field.replace(/FTE$/, 'Fte'), // divisionChiefFTE -> divisionChiefFte
          condition.field.replace(/^(.*)FTE$/, '$1'), // Remove FTE suffix
          condition.field.replace(/^(.*)Fte$/, '$1'), // Remove Fte suffix
        ];
        
        for (const variation of fieldVariations) {
          if (provider[variation] !== undefined) {
            fieldValue = provider[variation];
            console.log(`✅ Found field value using direct variation "${variation}": ${fieldValue}`);
            break;
          }
        }
      }
      
      // If still not found, log available fields
      if (fieldValue === undefined || fieldValue === null) {
        console.log(`📋 Available direct fields:`, Object.keys(provider));
        if (provider.dynamicFields) {
          try {
            const dynamicData = typeof provider.dynamicFields === 'string' 
              ? JSON.parse(provider.dynamicFields) 
              : provider.dynamicFields;
            console.log(`📋 Available dynamicFields:`, Object.keys(dynamicData));
          } catch (error) {
            console.log(`📋 dynamicFields (raw):`, provider.dynamicFields);
          }
        }
        return false;
      }
    }
    
    const compareValue = parseFloat(condition.value);
    
    // Handle non-numeric values
    if (isNaN(compareValue)) {
      console.log(`⚠️ Compare value "${condition.value}" is not a number`);
      return false;
    }
    
    // Convert fieldValue to number if it's a string
    const numericFieldValue = typeof fieldValue === 'string' ? parseFloat(fieldValue) : fieldValue;
    
    if (isNaN(numericFieldValue)) {
      console.log(`⚠️ Field value "${fieldValue}" is not a number`);
      return false;
    }
    
    const result = (() => {
      switch (condition.operator) {
        case '>': return numericFieldValue > compareValue;
        case '>=': return numericFieldValue >= compareValue;
        case '=': return numericFieldValue === compareValue;
        case '!=': return numericFieldValue !== compareValue;
        case '<': return numericFieldValue < compareValue;
        case '<=': return numericFieldValue <= compareValue;
      default: return false;
    }
    })();
    
    console.log(`🔍 Condition evaluation: ${numericFieldValue} ${condition.operator} ${compareValue} = ${result}`);
    return result;
  }, []);

  // Memoize the preview generation for performance
  const generatePreview = useCallback((providerData: any) => {
    if (!providerData) return '';
    
    console.log('🎯 Generating preview for:', providerData.name);
    console.log('📊 Provider data:', providerData);
    console.log('📋 Data source:', providers.length > 0 ? 'Real Database' : 'Test Data');
    
    // If there are no conditions or always include items, return empty string
    if (debouncedBlock.conditions.length === 0 && debouncedBlock.alwaysInclude.length === 0) {
      console.log('⚠️ No conditions or always include items configured');
      return '';
    }
    
    const items: Array<{label: string, value: string}> = [];
    
    // Add conditional items (only show if condition is met)
    console.log('🔍 Evaluating', debouncedBlock.conditions.length, 'conditional items:');
    debouncedBlock.conditions.forEach((condition: Condition, index: number) => {
      // Use the same field lookup logic as evaluateCondition
      let fieldValue = providerData[condition.field];
      
      // Handle undefined fields - check dynamicFields first (same as evaluateCondition)
      if (fieldValue === undefined || fieldValue === null) {
        if (providerData.dynamicFields) {
          try {
            const dynamicData = typeof providerData.dynamicFields === 'string' 
              ? JSON.parse(providerData.dynamicFields) 
              : providerData.dynamicFields;
            
            // Try field name variations in dynamicFields
            const fieldVariations = [
              condition.field, // exact match
              condition.field.charAt(0).toUpperCase() + condition.field.slice(1), // capitalize first letter
              condition.field.replace(/FTE$/, 'FTE'), // ensure FTE is uppercase
              condition.field.replace(/Fte$/, 'FTE'), // convert Fte to FTE
            ];
            
            for (const variation of fieldVariations) {
              if (dynamicData[variation] !== undefined) {
                fieldValue = dynamicData[variation];
                console.log(`  ✅ Found field value in dynamicFields using variation "${variation}": ${fieldValue}`);
                break;
              }
            }
          } catch (error) {
            console.error('❌ Error parsing dynamicFields:', error);
          }
        }
      }
      
      const conditionMet = evaluateCondition(condition, providerData);
      
      console.log(`  ${index + 1}. "${condition.label}" (${condition.field} ${condition.operator} ${condition.value})`);
      console.log(`     Field value: ${fieldValue}, Condition met: ${conditionMet}`);
      
      if (condition.field && condition.label && conditionMet) {
        if (fieldValue !== undefined && fieldValue !== null) {
          const displayValue = typeof fieldValue === 'number' ? fieldValue.toLocaleString() : fieldValue.toString();
          items.push({ label: condition.label, value: displayValue });
          console.log(`     ✅ Added: ${condition.label}: ${displayValue}`);
        } else {
          console.log(`     ❌ Field value is null/undefined after all lookups`);
        }
      } else {
        console.log(`     ❌ Condition not met or missing data`);
      }
    });
    
    // Add always include items (always show regardless of value)
    console.log('🔍 Evaluating', debouncedBlock.alwaysInclude.length, 'always include items:');
    debouncedBlock.alwaysInclude.forEach((item: AlwaysInclude, index: number) => {
      if (item.label && item.valueField) {
        let value = providerData[item.valueField];
        
        // If value not found directly, check dynamicFields
        if (value === undefined || value === null) {
          if (providerData.dynamicFields) {
            try {
              const dynamicData = typeof providerData.dynamicFields === 'string' 
                ? JSON.parse(providerData.dynamicFields) 
                : providerData.dynamicFields;
              
              // Try field name variations in dynamicFields
              const fieldVariations = [
                item.valueField, // exact match
                item.valueField.charAt(0).toUpperCase() + item.valueField.slice(1), // capitalize first letter
                item.valueField.replace(/FTE$/, 'FTE'), // ensure FTE is uppercase
                item.valueField.replace(/Fte$/, 'FTE'), // convert Fte to FTE
              ];
              
              for (const variation of fieldVariations) {
                if (dynamicData[variation] !== undefined) {
                  value = dynamicData[variation];
                  console.log(`  Found "${item.valueField}" in dynamicFields as "${variation}": ${value}`);
                  break;
                }
              }
            } catch (error) {
              console.error('Error parsing dynamicFields for always include item:', error);
            }
          }
        }
        
        console.log(`  ${index + 1}. "${item.label}" (${item.valueField}): ${value}`);
        if (value !== undefined && value !== null) {
          const displayValue = typeof value === 'number' ? value.toLocaleString() : value.toString();
          items.push({ label: item.label, value: displayValue });
          console.log(`     ✅ Added: ${item.label}: ${displayValue}`);
        } else {
          console.log(`     ❌ Field value is null/undefined`);
        }
      }
    });
    
    console.log('📋 Total items to display:', items.length);
    
    // Return empty if no items
    if (items.length === 0) {
      console.log('⚠️ No items to display');
      return '';
    }
    
    // Format based on output type
    switch (debouncedBlock.outputType) {
      case 'bullets':
        const bulletItems = items.map(item => 
          `<li style="margin: 2px 0; font-size: 11pt; line-height: 1.4;"><strong>${item.label}</strong>: ${item.value}</li>`
        ).join('');
        return `<ul style="margin: 10px 0; padding-left: 20px; font-size: 11pt; list-style-type: disc;">${bulletItems}</ul>`;
        
      case 'table':
        const tableRows = items.map(item => 
          `<tr><td style="border: 1px solid #ddd; padding: 6px 8px; font-weight: bold; width: 60%; font-size: 11pt;">${item.label}</td><td style="border: 1px solid #ddd; padding: 6px 8px; width: 40%; font-size: 11pt;">${item.value}</td></tr>`
        ).join('');
        return `<table style="width: 100%; max-width: 400px; border-collapse: collapse; margin: 10px 0; font-size: 11pt;">
          <thead><tr><th style="border: 1px solid #ddd; padding: 6px 8px; background: #f5f5f5; width: 60%; font-size: 11pt; text-align: left;">FTE Activity</th><th style="border: 1px solid #ddd; padding: 6px 8px; background: #f5f5f5; width: 40%; font-size: 11pt; text-align: left;">FTE</th></tr></thead>
          <tbody>${tableRows}</tbody>
        </table>`;
        
      case 'table-no-borders':
        const noBorderRows = items.map(item => 
          `<tr><td style="padding: 1px 4px; font-weight: bold; width: 60%; font-size: 11pt; line-height: 1.0;">${item.label}</td><td style="padding: 1px 4px; width: 40%; font-size: 11pt; line-height: 1.0;">${item.value}</td></tr>`
        ).join('');
        return `<div style="margin: 6px 0;"><table style="width: 100%; max-width: 400px; margin: 0; font-size: 11pt; line-height: 1.0; border-spacing: 0;">
          <thead><tr><th style="padding: 4px 8px; background: #f5f5f5; width: 60%; font-size: 11pt; text-align: left; line-height: 1.2;">FTE Activity</th><th style="padding: 4px 8px; background: #f5f5f5; width: 40%; font-size: 11pt; text-align: left; line-height: 1.2;">FTE</th></tr></thead>
          <tbody>${noBorderRows}</tbody>
        </table></div>`;
        
      case 'paragraph':
        const paragraphText = items.map(item => `<strong>${item.label}</strong>: ${item.value}`).join(', ');
        return `<p style="margin: 10px 0; line-height: 1.4; font-size: 11pt;">${paragraphText}</p>`;
        
      case 'list':
        const listItems = items.map(item => `<li style="margin: 2px 0; font-size: 11pt;"><strong>${item.label}</strong>: ${item.value}</li>`).join('');
        return `<ul style="margin: 10px 0; padding-left: 20px; font-size: 11pt;">${listItems}</ul>`;
        
      default:
        const defaultItems = items.map(item => 
          `<li style="margin: 2px 0; font-size: 11pt; line-height: 1.4;"><strong>${item.label}</strong>: ${item.value}</li>`
        ).join('');
        return `<ul style="margin: 10px 0; padding-left: 20px; font-size: 11pt; list-style-type: disc;">${defaultItems}</ul>`;
    }
  }, [debouncedBlock, evaluateCondition, providers]);

  // Update preview output only when debounced block changes
  useEffect(() => {
    const preview = generatePreview(currentProvider);
    setPreviewOutput(preview);
  }, [debouncedBlock, currentProvider, generatePreview]);

  // Debug: Log what's being evaluated
  useEffect(() => {
    if (debouncedBlock.conditions.length > 0) {
      console.log('🔍 Evaluating conditions for:', currentProvider.name);
      debouncedBlock.conditions.forEach((condition: Condition, index: number) => {
        const fieldValue = currentProvider[condition.field];
        const conditionMet = evaluateCondition(condition, currentProvider);
        console.log(`  Condition ${index + 1}: ${condition.label} (${condition.field} ${condition.operator} ${condition.value})`);
        console.log(`    Field value: ${fieldValue}, Condition met: ${conditionMet}`);
      });
    }
  }, [debouncedBlock.conditions, currentProvider, evaluateCondition]);

  const handleSave = useCallback(() => {
    if (!block.name || !block.placeholder) {
      alert('Please provide a name and placeholder for the block');
      return;
    }
    
    // Create a clean block object without ID for new blocks
    const savedBlock: DynamicBlockForSave = {
      name: block.name,
      description: block.description,
      placeholder: block.placeholder,
      outputType: block.outputType,
      format: block.format,
      conditions: block.conditions,
      alwaysInclude: block.alwaysInclude,
      // Only include ID if this is an existing block (has a real ID, not empty string)
      ...(block.id && block.id.trim() !== '' && { id: block.id })
    };
    
    console.log('💾 Saving block:', savedBlock);
    console.log('🔍 Is new block:', !block.id || block.id.trim() === '');
    
    onSave(savedBlock);
  }, [block, onSave]);

  // Expose functions to parent component
  React.useImperativeHandle(ref, () => ({
    generatePreview: () => generatePreview(currentProvider),
    handleSave,
    loadBlockData: (blockData: DynamicBlock) => {
      console.log('📥 Loading block data:', blockData);
      setBlock({
        id: blockData.id,
        name: blockData.name,
        description: blockData.description || '',
        placeholder: blockData.placeholder,
        outputType: blockData.outputType,
        format: blockData.format,
        conditions: blockData.conditions || [],
        alwaysInclude: blockData.alwaysInclude || []
      });
    },
    resetForm: () => {
      console.log('🔄 Resetting form');
      setBlock({
        id: '',
        name: '',
        description: '',
        placeholder: '',
        outputType: 'bullets',
        format: '• {{label}}: {{{{{{value}}}}}}',
        conditions: [],
        alwaysInclude: []
      });
    }
  }), [currentProvider, generatePreview, handleSave]);

  // Memoize update functions to prevent unnecessary re-renders
  const addCondition = useCallback(() => {
    setBlock(prev => ({
      ...prev,
      conditions: [...prev.conditions, { field: '', operator: '>', value: '0', label: '' }]
    }));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setBlock(prev => ({
      ...prev,
      conditions: prev.conditions.filter((_, i) => i !== index)
    }));
  }, []);

  const updateCondition = useCallback((index: number, field: keyof Condition, value: string) => {
    setBlock(prev => ({
      ...prev,
      conditions: prev.conditions.map((condition, i) => 
        i === index ? { ...condition, [field]: value } : condition
      )
    }));
  }, []);

  const addAlwaysInclude = useCallback(() => {
    setBlock(prev => ({
      ...prev,
      alwaysInclude: [...prev.alwaysInclude, { label: '', valueField: '' }]
    }));
  }, []);

  const removeAlwaysInclude = useCallback((index: number) => {
    setBlock(prev => ({
      ...prev,
      alwaysInclude: prev.alwaysInclude.filter((_, i) => i !== index)
    }));
  }, []);

  const updateAlwaysInclude = useCallback((index: number, field: keyof AlwaysInclude, value: string) => {
    setBlock(prev => ({
      ...prev,
      alwaysInclude: prev.alwaysInclude.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  }, []);

  // Memoize input change handlers to prevent unnecessary re-renders
  const handleBasicFieldChange = useCallback((field: keyof DynamicBlock, value: string) => {
    setBlock(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleFormatChange = useCallback((format: string) => {
    handleBasicFieldChange('outputType', format);
  }, [handleBasicFieldChange]);

  // Operator dropdown: only show symbols
  const operatorSymbols = ['>', '<', '=', '!=', '>=', '<='];

  return (
    <div className="p-6 space-y-8">

      {/* Collapsible Block Info Card */}
<Card className="border-l-4 border-l-blue-500">
  <div className="flex items-center justify-between cursor-pointer select-none px-6 py-4" onClick={() => setBlockInfoOpen((open) => !open)}>
    <div className="flex items-center gap-2">
      {blockInfoOpen ? <ChevronDown className="w-5 h-5 text-blue-500" /> : <ChevronRight className="w-5 h-5 text-blue-500" />}
      <span className="font-semibold text-gray-800">Block Info</span>
    </div>
    {!blockInfoOpen && (
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-700 font-medium">{block.name}</span>
        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{`{{${block.placeholder}}}`}</span>
      </div>
    )}
  </div>
  {blockInfoOpen && (
    <CardContent className="pt-0 pb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Block Name */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Block Name
          </Label>
          <Input
            id="name"
            value={block.name}
            onChange={(e) => handleBasicFieldChange('name', e.target.value)}
            placeholder="e.g., FTE Breakdown"
            className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">A human-friendly label for this logic block.</p>
        </div>
        {/* Placeholder Tag */}
        <div className="space-y-2">
          <Label htmlFor="placeholder" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Placeholder Tag
          </Label>
          <div className="relative flex items-center">
            <span className="absolute left-3 text-gray-400 text-sm font-mono">{'{{'}</span>
            <Input
              id="placeholder"
              value={block.placeholder}
              onChange={(e) => handleBasicFieldChange('placeholder', e.target.value)}
              placeholder="e.g., FTEBreakdown"
              className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500 pl-10 pr-16 font-mono"
              aria-label="Placeholder Tag"
            />
            <span className="absolute right-12 text-gray-400 text-sm font-mono">{'}}'}</span>
            {/* Copy to clipboard button */}
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 focus:outline-none"
              onClick={() => navigator.clipboard.writeText(`{{${block.placeholder}}}`)}
              title="Copy placeholder tag"
              tabIndex={0}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16h8a2 2 0 002-2V8a2 2 0 00-2-2H8a2 2 0 00-2 2v6a2 2 0 002 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8V6a2 2 0 00-2-2H8a2 2 0 00-2 2v2" /></svg>
            </button>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
              {`{{${block.placeholder}}}`}
            </span>
            will be replaced in templates
          </p>
          <p className="text-xs text-gray-400">Use a unique tag. Example: FTEBreakdown</p>
        </div>
      </div>
      {/* Description Field - Editable, full width */}
      <div className="mt-6">
        <Label htmlFor="description" className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          Description <span className="text-xs text-gray-400">(optional)</span>
        </Label>
        <textarea
          id="description"
          value={block.description}
          onChange={(e) => handleBasicFieldChange('description', e.target.value)}
          placeholder="Describe what this block does..."
          className="mt-2 w-full h-16 border border-gray-300 rounded-lg p-2 focus:border-blue-500 focus:ring-blue-500 text-sm resize-vertical"
          rows={2}
        />
        <p className="text-xs text-gray-500 mt-1">This description helps others understand the purpose of this block.</p>
      </div>
    </CardContent>
  )}
</Card>

      {/* Modern Toggle Design */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Switch checked={showPreviewConfig} onCheckedChange={setShowPreviewConfig} id="preview-config-toggle" />
          <div>
            <Label htmlFor="preview-config-toggle" className="text-sm font-medium text-gray-700">Preview Mode</Label>
            <p className="text-xs text-gray-500">
              {showPreviewConfig ? 'Configure preview settings and see live output' : 'Build conditional logic and always-include items'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={showPreviewConfig ? "default" : "secondary"} className={showPreviewConfig ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"}>
            {showPreviewConfig ? "Preview Mode" : "Logic Builder"}
          </Badge>
        </div>
      </div>


      {/* Conditional Logic Builder (shown when toggle is OFF) */}
      {!showPreviewConfig && (
        <div className="space-y-6">
          {/* Conditional Line Items Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conditional Line Items</CardTitle>
                <Button onClick={addCondition} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {block.conditions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No conditional line items yet. Add a line item to get started.</p>
                </div>
              ) : (
              <div className="space-y-4">
                {block.conditions.map((condition, index) => (
                  <Card key={index} className="p-4 bg-blue-50 border-blue-200">
                  <TooltipProvider>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="text-sm font-medium cursor-help">Display Label</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>What text should appear in the contract</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input
                          value={condition.label}
                          onChange={(e) => updateCondition(index, 'label', e.target.value)}
                          placeholder="e.g., Clinical FTE"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="text-sm font-medium cursor-help">Source Field</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Which database column to get the value from</p>
                          </TooltipContent>
                        </Tooltip>
                        <div className="mt-1">
                          <SearchableSelect
                            value={condition.field}
                            onValueChange={(value) => {
                              updateCondition(index, 'field', value);
                            }}
                            placeholder="Select database field"
                            options={availableFields}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="text-sm font-medium cursor-help">Operator</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Comparison operator</p>
                          </TooltipContent>
                        </Tooltip>
                        <Select 
                          value={condition.operator} 
                          onValueChange={(value) => updateCondition(index, 'operator', value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map(op => (
                              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Label className="text-sm font-medium cursor-help">Value</Label>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Value to compare against</p>
                          </TooltipContent>
                        </Tooltip>
                        <Input
                          value={condition.value}
                          onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          placeholder="e.g., 0"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          onClick={() => removeCondition(index)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TooltipProvider>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

          {/* Always Include Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Always Include (Optional)</CardTitle>
                <Button onClick={addAlwaysInclude} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line Item
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {block.alwaysInclude.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No always-include line items. These are optional - only add if you want certain lines to always appear.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {block.alwaysInclude.map((item, index) => (
                    <Card key={index} className="p-4 bg-green-50 border-green-200">
                      <TooltipProvider>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label className="text-sm font-medium cursor-help">Display Label</Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>What text should appear in the contract</p>
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              value={item.label}
                              onChange={(e) => updateAlwaysInclude(index, 'label', e.target.value)}
                              placeholder="e.g., Total FTE"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label className="text-sm font-medium cursor-help">Source Field</Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Which database column to get the value from</p>
                              </TooltipContent>
                            </Tooltip>
                            <div className="mt-1">
                              <SearchableSelect
                                value={item.valueField}
                                onValueChange={(value) => updateAlwaysInclude(index, 'valueField', value)}
                                placeholder="Select database field"
                                options={availableFields}
                                className="w-full"
                              />
                            </div>
                          </div>
                          <div className="flex items-end">
                            <Button
                              onClick={() => removeAlwaysInclude(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </TooltipProvider>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Section - Only shown when preview mode is ON */}
      {showPreviewConfig && (
        <ContractPreviewSection 
          block={debouncedBlock}
          selectedProvider={selectedProvider}
          onProviderChange={(provider) => {
            console.log('🔄 Main component provider changed to:', provider);
            setSelectedProvider(provider);
          }}
          previewOutput={previewOutput}
          evaluateCondition={evaluateCondition}
          onFormatChange={handleFormatChange}
        />
      )}
    </div>
  );
});

DynamicLogicBuilder.displayName = 'DynamicLogicBuilder';

export default DynamicLogicBuilder; 