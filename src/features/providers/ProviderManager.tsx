import React, { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Plus, Upload, Pencil, Trash2, AlertTriangle, FileText, Download } from 'lucide-react';
import Papa from 'papaparse';
import { RootState } from '../../store';
import { addProvidersFromCSV, selectProviderWithMatchedTemplate } from './providersSlice';
import { Provider } from '../../types/provider';
import { generateContract, generateContractBlob } from '../generator/docxUtils';
import { generateContractZip } from '../generator/zipUtils';
import { BulkGenerationSummaryModal } from './BulkGenerationSummaryModal';

// Sample template content for testing
const SAMPLE_TEMPLATE = `
SCHEDULE A
Employment Agreement

This Schedule A is made and entered into on {{StartDate}} by and between [Hospital Name] ("Hospital") and {{ProviderName}} ("Provider").

1. Position and Duties
Provider shall serve as a {{Specialty}} physician at {{FTE}} FTE.

2. Compensation
Provider shall receive an annual base salary of {{BaseSalary}}.
{{#if wRVUTarget}}
Provider shall be eligible for productivity compensation based on {{wRVUTarget}} wRVUs at a conversion factor of {{ConversionFactor}} per wRVU.
{{/if}}
{{#if RetentionBonus}}
Provider shall receive a retention bonus of {{RetentionBonus}}.
{{/if}}

3. Schedule
Provider shall work {{FTEBreakdown}}.

[Additional terms and conditions...]
`;

export function ProviderManager() {
  const dispatch = useDispatch();
  const providers = useSelector((state: RootState) => state.providers.providers);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);
  const [generationResults, setGenerationResults] = useState<{
    successful: { providerName: string; filename: string; templateName: string }[];
    skipped: { providerName: string; reason: string }[];
  }>({ successful: [], skipped: [] });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const providers = results.data.map((row: any) => ({
            name: row.ProviderName || '',
            credentials: row.Credentials || '',
            specialty: row.Specialty || '',
            startDate: row.StartDate || '',
            fte: parseFloat(row.FTE) || 0,
            baseSalary: parseFloat(row.BaseSalary) || 0,
            wRVUTarget: row.wRVUTarget ? parseFloat(row.wRVUTarget) : undefined,
            conversionFactor: row.ConversionFactor ? parseFloat(row.ConversionFactor) : undefined,
            retentionBonus: row.RetentionBonus ? parseFloat(row.RetentionBonus) : undefined,
            templateTag: row.TemplateTag,
          }));

          dispatch(addProvidersFromCSV(providers));
        } catch (err) {
          setError('Failed to parse CSV file. Please check the format.');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      },
    });
  };

  const handleGenerateContract = async (provider: Provider, template: any) => {
    try {
      setIsGenerating(provider.id);
      await generateContract(template, provider, SAMPLE_TEMPLATE);
    } catch (err) {
      setError('Failed to generate contract. Please try again.');
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSelectProvider = (providerId: string) => {
    const newSelected = new Set(selectedProviders);
    if (newSelected.has(providerId)) {
      newSelected.delete(providerId);
    } else {
      newSelected.add(providerId);
    }
    setSelectedProviders(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedProviders.size === providers.length) {
      setSelectedProviders(new Set());
    } else {
      setSelectedProviders(new Set(providers.map(p => p.id)));
    }
  };

  const handleGenerateBulk = async () => {
    try {
      setIsGeneratingBulk(true);
      setError(null);

      const files: { filename: string; blob: Blob }[] = [];
      const successful: { providerName: string; filename: string; templateName: string }[] = [];
      const skipped: { providerName: string; reason: string }[] = [];

      for (const providerId of selectedProviders) {
        const provider = providers.find(p => p.id === providerId);
        if (!provider) continue;

        const match = useSelector(selectProviderWithMatchedTemplate(providerId));
        if (!match?.template) {
          skipped.push({
            providerName: provider.name,
            reason: 'No matching template found'
          });
          continue;
        }

        try {
          const result = await generateContractBlob(match.template, provider, SAMPLE_TEMPLATE);
          files.push({ filename: result.filename, blob: result.blob });
          successful.push({
            providerName: provider.name,
            filename: result.filename,
            templateName: match.template.name
          });
        } catch (err) {
          skipped.push({
            providerName: provider.name,
            reason: 'Failed to generate contract'
          });
        }
      }

      if (files.length > 0) {
        await generateContractZip(files);
      }

      setGenerationResults({ successful, skipped });
      setShowSummary(true);
    } catch (err) {
      setError('Failed to generate contract bundle. Please try again.');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Provider Data</h1>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading ? 'Uploading...' : 'Upload CSV'}
          </button>
          {selectedProviders.size > 0 && (
            <button
              onClick={handleGenerateBulk}
              disabled={isGeneratingBulk}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              <Download className="mr-2 h-4 w-4" />
              {isGeneratingBulk ? 'Generating...' : `Generate ${selectedProviders.size} Contracts`}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectedProviders.size === providers.length}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Specialty</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">FTE</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Base Salary</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Template Tag</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Matched Template</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((provider) => {
              const match = useSelector(selectProviderWithMatchedTemplate(provider.id));
              return (
                <tr key={provider.id} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle">
                    <input
                      type="checkbox"
                      checked={selectedProviders.has(provider.id)}
                      onChange={() => handleSelectProvider(provider.id)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="p-4 align-middle">
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-muted-foreground">{provider.credentials}</div>
                    </div>
                  </td>
                  <td className="p-4 align-middle">{provider.specialty}</td>
                  <td className="p-4 align-middle">{provider.fte}</td>
                  <td className="p-4 align-middle">{formatCurrency(provider.baseSalary)}</td>
                  <td className="p-4 align-middle">
                    {provider.templateTag ? (
                      <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                        {provider.templateTag}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    {match?.template ? (
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{match.template.name}</span>
                        <span className="text-xs text-muted-foreground">v{match.template.version}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>No Match</span>
                      </div>
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    <div className="flex gap-2">
                      <button
                        onClick={() => match?.template && handleGenerateContract(provider, match.template)}
                        disabled={!match?.template || isGenerating === provider.id}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3"
                      >
                        <FileText className="h-4 w-4" />
                      </button>
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {providers.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No providers found. Upload a CSV file to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <BulkGenerationSummaryModal
        isOpen={showSummary}
        onClose={() => setShowSummary(false)}
        successful={generationResults.successful}
        skipped={generationResults.skipped}
      />
    </div>
  );
} 