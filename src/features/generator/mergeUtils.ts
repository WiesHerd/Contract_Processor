import { Provider } from '../../types/provider';
import { Template } from '../../types/template';
import { FieldMapping } from '../templates/mappingsSlice';

interface MergeResult {
  content: string;
  warnings: string[];
}

/**
 * Formats a number as currency
 */
const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? Number(String(amount).replace(/[^0-9.]/g, '')) : amount;
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

/**
 * Formats a number as currency with two decimals
 */
const formatCurrency2 = (amount: number | string): string => {
  const num = typeof amount === 'string' ? Number(String(amount).replace(/[^0-9.]/g, '')) : amount;
  if (isNaN(num)) return String(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

/**
 * Formats a number with commas
 */
const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return String(value);
  return num.toLocaleString('en-US');
};

/**
 * Formats a date string to MM/DD/YYYY
 */
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
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
  templateContent: string,
  mapping?: FieldMapping[]
): MergeResult => {
  const warnings: string[] = [];
  let content = templateContent;

  // If mapping is provided, use it to resolve placeholders
  if (mapping && Array.isArray(mapping)) {
    mapping.forEach(({ placeholder, mappedColumn }) => {
      if (!placeholder || !mappedColumn) return;
      let value = (provider as any)[mappedColumn];
      // Apply formatting for known fields
      const key = mappedColumn.toLowerCase();
      if ([
        'basesalary', 'signingbonus', 'relocationbonus', 'qualitybonus', 'cmeamount', 'retentionbonus'
      ].includes(key)) {
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
      content = content.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(value ?? ''));
    });
  } else {
    // Fallback to old logic if no mapping is provided
    const placeholderMap: Record<string, string> = {
      '{{ProviderName}}': provider.name ? `<b><strong>${provider.name}${provider.credentials ? ', ' + provider.credentials : ''}</strong></b>` : 'N/A',
      '{{StartDate}}': provider.startDate ? formatDate(provider.startDate) : 'N/A',
      '{{BaseSalary}}': provider.baseSalary ? `<b><strong>${formatCurrency(provider.baseSalary)}</strong></b>` : 'N/A',
      '{{FTE}}': provider.fte !== undefined && provider.fte !== null ? `<b><strong>${provider.fte}</strong></b>` : 'N/A',
      '{{FTEBreakdown}}': provider.fte !== undefined && provider.fte !== null ? generateFTEBreakdown(provider.fte) : 'N/A',
      '{{Specialty}}': provider.specialty ?? 'N/A',
    };
    if (provider.wRVUTarget) {
      placeholderMap['{{wRVUTarget}}'] = formatNumber(provider.wRVUTarget);
    }
    if (provider.conversionFactor) {
      placeholderMap['{{ConversionFactor}}'] = formatCurrency2(provider.conversionFactor);
    }
    if (provider.retentionBonus) {
      if (typeof provider.retentionBonus === 'number') {
        placeholderMap['{{RetentionBonus}}'] = formatCurrency(provider.retentionBonus);
      } else if (typeof provider.retentionBonus === 'object' && provider.retentionBonus.amount) {
        placeholderMap['{{RetentionBonus}}'] = formatCurrency(provider.retentionBonus.amount);
      }
    }
    if (provider.signingBonus) {
      placeholderMap['{{SigningBonus}}'] = formatCurrency(provider.signingBonus);
    }
    if (provider.relocationBonus) {
      placeholderMap['{{RelocationBonus}}'] = formatCurrency(provider.relocationBonus);
    }
    if (provider.qualityBonus) {
      placeholderMap['{{QualityBonus}}'] = formatCurrency(provider.qualityBonus);
    }
    if (provider.cmeAmount) {
      placeholderMap['{{CMEAmount}}'] = formatCurrency(provider.cmeAmount);
    }
    if (provider.originalAgreementDate) {
      placeholderMap['{{OriginalAgreementDate}}'] = formatDate(String(provider.originalAgreementDate));
    }
    Object.entries(placeholderMap).forEach(([placeholder, value]) => {
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });
  }

  // After all replacements, replace any remaining {{...}} with 'N/A' and log a warning
  const unresolved = content.match(/{{[^}]+}}/g);
  if (unresolved) {
    unresolved.forEach(ph => {
      content = content.replace(new RegExp(ph, 'g'), 'N/A');
    });
    warnings.push(
      `Warning: The following placeholders were not replaced and set to 'N/A': ${unresolved.join(', ')}`
    );
  }

  // Patch: Convert any dash-based lists for bonuses/incentives to <ul><li>...</li></ul>
  // Example: Find lines starting with '- ' and wrap them in <ul><li>...</li></ul>
  content = content.replace(/((?:- .+\n?)+)/g, (match) => {
    const items = match.trim().split(/\n/).map(line => line.replace(/^- /, '').trim());
    if (items.length > 1) {
      return '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
    }
    return match;
  });

  return { content, warnings };
}; 