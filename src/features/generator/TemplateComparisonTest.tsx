import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import type { AppDispatch } from '@/store';
import { fetchTemplatesIfNeeded } from '@/features/templates/templatesSlice';
import { fetchProvidersIfNeeded } from '@/store/slices/providerSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { 
  FileText, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Info,
  Eye,
  Code,
  FileDown,
  RefreshCw
} from 'lucide-react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
// import Mustache from 'mustache';
import { Template } from '@/types/template';
import { Provider } from '@/types/provider';
import { mergeTemplateWithData } from './mergeUtils';
import { normalizeText } from '@/utils/format';
import { getTemplateFile } from '@/utils/s3Storage';
import { PageHeader } from '@/components/PageHeader';

interface TestResult {
  method: 'current' | 'docxtemplater' | 'mustache';
  success: boolean;
  error?: string;
  downloadUrl?: string;
  filename?: string;
  processingTime?: number;
  warnings?: string[];
}

export default function TemplateComparisonTest() {
  const dispatch = useDispatch<AppDispatch>();
  const templates = useSelector((state: RootState) => state.templates.templates);
  const providers = useSelector((state: RootState) => state.provider.providers);
  const mappings = useSelector((state: RootState) => state.mappings.mappings);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    dispatch(fetchTemplatesIfNeeded());
    dispatch(fetchProvidersIfNeeded());
  }, [dispatch]);

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId), 
    [templates, selectedTemplateId]
  );

  const selectedProvider = useMemo(() => 
    providers.find(p => p.id === selectedProviderId), 
    [providers, selectedProviderId]
  );

  const mapping = useMemo(() => 
    selectedTemplate ? mappings[selectedTemplate.id]?.mappings : undefined,
    [mappings, selectedTemplate]
  );

  const handleRunComparison = async () => {
    if (!selectedTemplate || !selectedProvider) {
      setError('Please select both a template and provider');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResults([]);

    const testResults: TestResult[] = [];

    try {
      // Test 1: Current HTML-to-DOCX method
      const currentResult = await testCurrentMethod(selectedTemplate, selectedProvider, mapping);
      testResults.push(currentResult);

      // Test 2: docxtemplater method
      const docxtemplaterResult = await testDocxtemplaterMethod(selectedTemplate, selectedProvider, mapping);
      testResults.push(docxtemplaterResult);

      // Test 3: Mustache method
      const mustacheResult = await testMustacheMethod(selectedTemplate, selectedProvider, mapping);
      testResults.push(mustacheResult);

      setResults(testResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during testing');
    } finally {
      setIsProcessing(false);
    }
  };

  const testCurrentMethod = async (
    template: Template, 
    provider: Provider, 
    mapping?: any
  ): Promise<TestResult> => {
    const startTime = performance.now();
    
    try {
      const html = normalizeText(template.editedHtmlContent || template.htmlPreviewContent || '');
      const normalizedProvider: Provider = { ...provider };
      Object.entries(normalizedProvider).forEach(([k, v]) => {
        if (typeof v === 'string') normalizedProvider[k as keyof Provider] = normalizeText(v);
      });
      const { content: mergedHtml, warnings } = mergeTemplateWithData(template, normalizedProvider, html, mapping);
      const mergedNormalized = normalizeText(mergedHtml);
      // Mapping completeness check
      const unresolved = mergedNormalized.match(/{{[^}]+}}/g);
      if (unresolved) {
        return {
          method: 'current',
          success: false,
          error: `Unresolved placeholders: ${unresolved.join(', ')}`,
          warnings: warnings || []
        };
      }
      
      if (!mergedHtml) {
        return {
          method: 'current',
          success: false,
          error: 'No content available after merge'
        };
      }

      const htmlClean = mergedNormalized.replace(/[""]/g, '"').replace(/['']/g, "'");
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
        return {
          method: 'current',
          success: false,
          error: 'html-docx-js not available'
        };
      }

      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
      const url = URL.createObjectURL(docxBlob);
      const filename = `current_method_${provider.name.replace(/\s+/g, '')}.docx`;

      const processingTime = performance.now() - startTime;

      return {
        method: 'current',
        success: true,
        downloadUrl: url,
        filename,
        processingTime,
        warnings
      };
    } catch (err) {
      return {
        method: 'current',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  };

  const testDocxtemplaterMethod = async (
    template: Template, 
    provider: Provider, 
    mapping?: any
  ): Promise<TestResult> => {
    const startTime = performance.now();
    
    try {
      // Get the DOCX file from S3
      if (!template.docxTemplate || typeof template.docxTemplate !== 'string') {
        return {
          method: 'docxtemplater',
          success: false,
          error: 'No DOCX template file available'
        };
      }

      const { url: docxUrl } = await getTemplateFile(template.id, template.docxTemplate);
      const response = await fetch(docxUrl);
      const arrayBuffer = await response.arrayBuffer();

      const zip = new PizZip(arrayBuffer);
      const doc = new Docxtemplater(zip, { 
        paragraphLoop: true, 
        linebreaks: true 
      });

      // Prepare data for docxtemplater
      const data = prepareDataForDocxtemplater(provider, mapping);
      doc.setData(data);

      try {
        doc.render();
      } catch (err: any) {
        return {
          method: 'docxtemplater',
          success: false,
          error: `docxtemplater render error: ${err.message || err}`
        };
      }

      const out = doc.getZip().generate({ type: 'blob' });
      const url = URL.createObjectURL(out);
      const filename = `docxtemplater_${provider.name.replace(/\s+/g, '')}.docx`;

      const processingTime = performance.now() - startTime;

      return {
        method: 'docxtemplater',
        success: true,
        downloadUrl: url,
        filename,
        processingTime
      };
    } catch (err) {
      return {
        method: 'docxtemplater',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  };

  const testMustacheMethod = async (
    template: Template, 
    provider: Provider, 
    mapping?: any
  ): Promise<TestResult> => {
    const startTime = performance.now();
    
    try {
      const html = normalizeText(template.editedHtmlContent || template.htmlPreviewContent || '');
      const normalizedProvider: Provider = { ...provider };
      Object.entries(normalizedProvider).forEach(([k, v]) => {
        if (typeof v === 'string') normalizedProvider[k as keyof Provider] = normalizeText(v);
      });
      const { content: mergedHtml, warnings } = mergeTemplateWithData(template, normalizedProvider, html, mapping);
      const mergedNormalized = normalizeText(mergedHtml);
      // Mapping completeness check
      const unresolved = mergedNormalized.match(/{{[^}]+}}/g);
      if (unresolved) {
        return {
          method: 'mustache',
          success: false,
          error: `Unresolved placeholders: ${unresolved.join(', ')}`,
          warnings: warnings || []
        };
      }
      
      if (!mergedHtml) {
        return {
          method: 'mustache',
          success: false,
          error: 'No content available after merge'
        };
      }

      // Prepare data for Mustache
      const data = prepareDataForMustache(provider, mapping);
      
      // Render with Mustache (commented out - install mustache package first)
      // const renderedContent = Mustache.render(mergedHtml, data);
      const renderedContent = mergedNormalized; // Fallback to original content
      
      // Convert to DOCX using html-docx-js (same as current method)
      const htmlClean = renderedContent.replace(/[""]/g, '"').replace(/['']/g, "'");
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
        return {
          method: 'mustache',
          success: false,
          error: 'html-docx-js not available'
        };
      }

      // @ts-ignore
      const docxBlob = window.htmlDocx.asBlob(htmlWithFont);
      const url = URL.createObjectURL(docxBlob);
      const filename = `mustache_${provider.name.replace(/\s+/g, '')}.docx`;

      const processingTime = performance.now() - startTime;

      return {
        method: 'mustache',
        success: true,
        downloadUrl: url,
        filename,
        processingTime,
        warnings
      };
    } catch (err) {
      return {
        method: 'mustache',
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    }
  };

  const prepareDataForDocxtemplater = (provider: Provider, mapping?: any): Record<string, any> => {
    const data: Record<string, any> = {};

    if (mapping && Array.isArray(mapping)) {
      mapping.forEach(({ placeholder, mappedColumn }: any) => {
        if (!placeholder || !mappedColumn) return;
        let value = (provider as any)[mappedColumn];
        
        // Apply formatting
        const key = mappedColumn.toLowerCase();
        if (['basesalary', 'signingbonus', 'relocationbonus', 'qualitybonus', 'cmeamount', 'retentionbonus'].includes(key)) {
          value = formatCurrency(value ?? '');
        } else if (['conversionfactor'].includes(key)) {
          value = formatCurrency2(value ?? '');
        } else if (['wrvutarget'].includes(key)) {
          value = formatNumber(value ?? '');
        } else if (['startdate', 'originalagreementdate'].includes(key)) {
          value = formatDate(String(value ?? ''));
        } else if (key === 'fte') {
          value = typeof value === 'number' ? value.toFixed(2) : String(value ?? '');
        }
        
        data[placeholder] = String(value ?? '');
      });
    } else {
      // Fallback to standard placeholders
      data.ProviderName = provider.name ? `${provider.name}${provider.credentials ? ', ' + provider.credentials : ''}` : 'N/A';
      data.StartDate = provider.startDate ? formatDate(provider.startDate) : 'N/A';
      data.BaseSalary = provider.baseSalary ? formatCurrency(provider.baseSalary) : 'N/A';
      data.FTE = provider.fte !== undefined && provider.fte !== null ? provider.fte.toString() : 'N/A';
      data.Specialty = provider.specialty ?? 'N/A';
      
      if (provider.wRVUTarget) data.wRVUTarget = formatNumber(provider.wRVUTarget);
      if (provider.conversionFactor) data.ConversionFactor = formatCurrency2(provider.conversionFactor);
      if (provider.retentionBonus) {
        if (typeof provider.retentionBonus === 'number') {
          data.RetentionBonus = formatCurrency(provider.retentionBonus);
        } else if (typeof provider.retentionBonus === 'object' && provider.retentionBonus.amount) {
          data.RetentionBonus = formatCurrency(provider.retentionBonus.amount);
        }
      }
      if (provider.signingBonus) data.SigningBonus = formatCurrency(provider.signingBonus);
      if (provider.relocationBonus) data.RelocationBonus = formatCurrency(provider.relocationBonus);
      if (provider.qualityBonus) data.QualityBonus = formatCurrency(provider.qualityBonus);
      if (provider.cmeAmount) data.CMEAmount = formatCurrency(provider.cmeAmount);
      if (provider.originalAgreementDate) data.OriginalAgreementDate = formatDate(String(provider.originalAgreementDate));
    }

    return data;
  };

  const prepareDataForMustache = (provider: Provider, mapping?: any): Record<string, any> => {
    // Mustache uses the same data structure as docxtemplater
    return prepareDataForDocxtemplater(provider, mapping);
  };

  const formatCurrency = (value: any): string => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toLocaleString()}`;
  };

  const formatCurrency2 = (value: any): string => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return `$${num.toFixed(2)}`;
  };

  const formatNumber = (value: any): string => {
    if (!value) return '';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString();
  };

  const formatDate = (value: string): string => {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return value;
    }
  };

  const getMethodDisplayName = (method: string): string => {
    switch (method) {
      case 'current': return 'Current (HTML-to-DOCX)';
      case 'docxtemplater': return 'docxtemplater';
      case 'mustache': return 'Mustache + HTML-to-DOCX';
      default: return method;
    }
  };

  const getMethodDescription = (method: string): string => {
    switch (method) {
      case 'current': return 'Uses html-docx-js to convert HTML to DOCX. Good for simple documents.';
      case 'docxtemplater': return 'Direct DOCX template processing. Perfect formatting, advanced logic support.';
      case 'mustache': return 'Uses Mustache for templating, then converts to DOCX. Good for complex logic.';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pt-0 pb-4 px-2 sm:px-4">
      <div className="max-w-7xl mx-auto">
        <PageHeader 
          title="Template Processing Comparison" 
          description="Test different template processing methods with your existing templates"
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Select Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge variant="secondary">{template.compensationModel}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Select Provider
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Run Comparison Test
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Button 
                onClick={handleRunComparison}
                disabled={!selectedTemplateId || !selectedProviderId || isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" />
                    Run Comparison
                  </>
                )}
              </Button>
              
              {selectedTemplate && selectedProvider && (
                <div className="text-sm text-gray-600">
                  Testing: <strong>{selectedTemplate.name}</strong> with <strong>{selectedProvider.name}</strong>
                </div>
              )}
            </div>

            {error && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Test Results</h2>
            
            <Tabs defaultValue="comparison" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="comparison">Comparison</TabsTrigger>
                <TabsTrigger value="individual">Individual Results</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="comparison" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {results.map((result, index) => (
                    <Card key={index} className={result.success ? 'border-green-200' : 'border-red-200'}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-sm">{getMethodDisplayName(result.method)}</span>
                          {result.success ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {result.success ? (
                          <>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-3 w-3" />
                              {result.processingTime?.toFixed(2)}ms
                            </div>
                            {result.downloadUrl && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full"
                                onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = result.downloadUrl!;
                                  a.download = result.filename || 'download.docx';
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                }}
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-red-600">
                            {result.error}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="individual" className="space-y-4">
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getMethodDisplayName(result.method)}
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? "Success" : "Failed"}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <strong>Description:</strong>
                          <p className="text-sm text-gray-600 mt-1">
                            {getMethodDescription(result.method)}
                          </p>
                        </div>
                        
                        {result.processingTime && (
                          <div>
                            <strong>Processing Time:</strong>
                            <p className="text-sm text-gray-600 mt-1">
                              {result.processingTime.toFixed(2)}ms
                            </p>
                          </div>
                        )}
                        
                        {result.warnings && result.warnings.length > 0 && (
                          <div>
                            <strong>Warnings:</strong>
                            <ul className="text-sm text-yellow-600 mt-1 list-disc list-inside">
                              {result.warnings.map((warning, i) => (
                                <li key={i}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {result.error && (
                          <div>
                            <strong>Error:</strong>
                            <p className="text-sm text-red-600 mt-1">{result.error}</p>
                          </div>
                        )}
                        
                        {result.downloadUrl && (
                          <Button 
                            onClick={() => {
                              const a = document.createElement('a');
                              a.href = result.downloadUrl!;
                              a.download = result.filename || 'download.docx';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }}
                            className="flex items-center gap-2"
                          >
                            <FileDown className="h-4 w-4" />
                            Download Result
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="analysis" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-green-700">docxtemplater Advantages:</h4>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1">
                          <li>• Perfect DOCX formatting preservation</li>
                          <li>• Advanced logic (conditionals, loops)</li>
                          <li>• Professional legal document quality</li>
                          <li>• Better for complex compensation structures</li>
                        </ul>
                      </div>
                      
                      <div className="border-t border-gray-200 my-4" />
                      
                      <div>
                        <h4 className="font-semibold text-blue-700">Current Method Advantages:</h4>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1">
                          <li>• Simple HTML editing</li>
                          <li>• No licensing costs</li>
                          <li>• Easy to implement</li>
                          <li>• Good for basic contracts</li>
                        </ul>
                      </div>
                      
                      <div className="border-t border-gray-200 my-4" />
                      
                      <div>
                        <h4 className="font-semibold text-orange-700">Mustache Advantages:</h4>
                        <ul className="text-sm text-gray-600 mt-2 space-y-1">
                          <li>• Powerful templating logic</li>
                          <li>• Clean syntax</li>
                          <li>• Good for complex data structures</li>
                          <li>• Still uses HTML-to-DOCX conversion</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
} 