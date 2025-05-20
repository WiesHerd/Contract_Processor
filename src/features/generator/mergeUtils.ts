import { Provider } from '../../types/provider';
import { Template } from '../../types/template';

interface MergeResult {
  content: string;
  warnings: string[];
}

/**
 * Formats a number as currency
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Formats a date string to MM/DD/YYYY
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
};

/**
 * Generates FTE breakdown text
 */
const generateFTEBreakdown = (fte: number): string => {
  const hours = Math.round(fte * 40);
  return `${fte} FTE (${hours} hours per week)`;
};

/**
 * Merges provider data with template content
 */
export const mergeTemplateWithData = (
  template: Template,
  provider: Provider,
  templateContent: string
): MergeResult => {
  const warnings: string[] = [];
  let content = templateContent;

  // Define placeholder mappings
  const placeholderMap: Record<string, string> = {
    '{{ProviderName}}': `${provider.name}, ${provider.credentials}`,
    '{{StartDate}}': formatDate(provider.startDate),
    '{{BaseSalary}}': formatCurrency(provider.baseSalary),
    '{{FTE}}': provider.fte.toString(),
    '{{FTEBreakdown}}': generateFTEBreakdown(provider.fte),
    '{{Specialty}}': provider.specialty,
  };

  // Add optional fields if they exist
  if (provider.wRVUTarget) {
    placeholderMap['{{wRVUTarget}}'] = provider.wRVUTarget.toString();
  }
  if (provider.conversionFactor) {
    placeholderMap['{{ConversionFactor}}'] = formatCurrency(provider.conversionFactor);
  }
  if (provider.retentionBonus) {
    placeholderMap['{{RetentionBonus}}'] = formatCurrency(provider.retentionBonus);
  }

  // Replace all placeholders
  Object.entries(placeholderMap).forEach(([placeholder, value]) => {
    content = content.replace(new RegExp(placeholder, 'g'), value);
  });

  // Check for any remaining placeholders
  const remainingPlaceholders = content.match(/{{[^}]+}}/g);
  if (remainingPlaceholders) {
    warnings.push(
      `Warning: The following placeholders were not replaced: ${remainingPlaceholders.join(', ')}`
    );
  }

  return { content, warnings };
}; 